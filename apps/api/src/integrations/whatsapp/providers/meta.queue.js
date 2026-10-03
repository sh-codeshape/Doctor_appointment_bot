/**
 * meta.queue.js — Outgoing WhatsApp Message Queue
 *
 * PURPOSE:
 *   All outgoing messages to Meta's WhatsApp API are sent through this
 *   BullMQ queue to prevent rate limit errors (Error 130429).
 *   The queue enforces a global MPS (Messages Per Second) limit.
 *
 * RATE LIMIT CONTROL:
 *   Set META_MAX_MPS in your .env file.
 *   Default: 20 MPS. Meta's warm-up period may require as low as 1-2 MPS.
 *   Once your phone number quality rating is High, you can increase this.
 *
 * ⚠️  CRITICAL — DO NOT ADD 'read' TYPE HERE:
 *   markAsRead (read receipts) must NOT go through this queue.
 *   They are handled directly in meta.provider.js via a fire-and-forget fetch().
 *   Reason: read receipts do NOT consume your MPS quota the same way messages do,
 *   and routing them through the queue wastes slots needed for real patient messages.
 *   This queue only handles: 'text' and 'location' types.
 *
 * REDIS:
 *   Uses a separate ioredis connection from the main cache connection.
 *   BullMQ requires maxRetriesPerRequest: null on its connection.
 */

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import env from '../../../config/env.js';
import logger from '../../../utils/logger.js';
import { cache } from '../../../config/redis.js';

// Dedicated Redis connection for BullMQ.
// ⚠️  DO NOT reuse the main redis connection from config/redis.js here.
// BullMQ requires maxRetriesPerRequest: null or it will throw on blocking commands.
const connection = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

export const metaQueue = new Queue('meta-whatsapp-queue', { connection });

// Configure max Messages Per Second
const META_MAX_MPS = parseInt(process.env.META_MAX_MPS, 10) || 20;

// Rate limiter applies globally to all workers connected to this queue
const worker = new Worker('meta-whatsapp-queue', async (job) => {
  const { to, body, type, location } = job.data;

  // ⚠️  CRITICAL: Only 'text' and 'location' are valid job types.
  // 'read' (markAsRead) is intentionally NOT handled here — see file-level comment above.
  // If you add a new type here, also update enqueueMetaMessage() callers.
  if (type === 'text') {
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    };
  } else if (type === 'location') {
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location,
    };
  } else {
    // Unknown type received — this should never happen in normal flow.
    // If you're seeing this warning, check the caller is only passing 'text' or 'location'.
    logger.warn(`meta.queue: Unknown job type "${type}", skipping.`);
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${env.meta.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.meta.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    logger.error(`Meta queue send error: ${JSON.stringify(result)}`);
    // If it's a synchronous rate limit, throw so BullMQ retries with backoff
    if (result?.error?.code === 130429) {
      throw new Error(`RATE_LIMIT_130429`);
    }
    throw new Error(`Failed to send WhatsApp message: ${JSON.stringify(result)}`);
  }

  // Cache messageId -> original payload for 24h so webhook can requeue on async 130429
  const messageId = result.messages?.[0]?.id;
  if (messageId) {
    await cache.set(`msg_payload:${messageId}`, job.data, 86400);
  }
  logger.debug(`Meta queue message sent to ${to}`);

  return result;
}, {
  connection,
  concurrency: 1, // ⚠️  DO NOT increase — concurrency > 1 allows burst firing which triggers Meta 130429
  limiter: {
    max: META_MAX_MPS, // Change via META_MAX_MPS env var. Do NOT hardcode.
    duration: 1000,   // Per second window
  },
});

worker.on('failed', (job, err) => {
  logger.error(`Queue Job ${job?.id} failed after all retries: ${err.message}`);
});

// Worker-level error (not job failure, but the worker itself crashing)
worker.on('error', (err) => {
  logger.error(`BullMQ Worker error: ${err.message}`);
});

// Graceful shutdown — lets the current in-flight job finish before the process exits.
// Without this, a job being processed mid-send gets orphaned and can be sent twice on restart.
const shutdown = async (signal) => {
  logger.warn(`${signal} received — closing BullMQ worker and queue gracefully...`);

  // Hard timeout: if shutdown takes longer than 10s, force exit.
  // docker-compose stop_grace_period is 15s, so this always wins cleanly.
  const forceExit = setTimeout(() => {
    logger.warn('Shutdown timeout reached — forcing exit.');
    process.exit(0);
  }, 10_000);
  forceExit.unref(); // Don't let this timer keep the process alive on its own

  await worker.close();    // Wait for current job to finish, then stop
  await metaQueue.close(); // Close queue connection
  clearTimeout(forceExit);
  logger.info('BullMQ shut down cleanly.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

/**
 * Pushes a message to the outgoing queue with exponential backoff configuration.
 */
export async function enqueueMetaMessage(data, delayMs = 0) {
  // data is { to, body, type, location, messageId }
  return metaQueue.add('send-message', data, {
    attempts: 5, // Total attempts (1 initial + 4 retries)
    backoff: {
      type: 'exponential',
      delay: 5000 // 5s, 10s, 20s, 40s
    },
    delay: delayMs, // Allows us to manually delay asynchronous retries
    removeOnComplete: true,
    removeOnFail: 100 // keep last 100 failed jobs for debugging
  });
}
