import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import env from '../../../config/env.js';
import logger from '../../../utils/logger.js';
import { cache } from '../../../config/redis.js';

// Dedicated connection for BullMQ (needs maxRetriesPerRequest: null)
const connection = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

export const metaQueue = new Queue('meta-whatsapp-queue', { connection });

// Configure max Messages Per Second
const META_MAX_MPS = parseInt(process.env.META_MAX_MPS, 10) || 20;

// Rate limiter applies globally to all workers connected to this queue
const worker = new Worker('meta-whatsapp-queue', async (job) => {
  const { to, body, type, location } = job.data;

  // We perform the actual fetch here
  let payload = {};
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
  } else if (type === 'read') {
    payload = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: job.data.messageId,
    };
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
    // If it's a rate limit error (synchronous), throw error so BullMQ retries with backoff
    if (result?.error?.code === 130429) {
      throw new Error(`RATE_LIMIT_130429`);
    }
    // Other errors
    throw new Error(`Failed to send WhatsApp message via Meta: ${JSON.stringify(result)}`);
  }

  // Success! We get a messageId back for texts/locations (read receipts don't return messages array)
  if (type !== 'read') {
    const messageId = result.messages?.[0]?.id;
    if (messageId) {
      // Map messageId -> original payload in cache for 24 hours
      // If webhook later gets a 130429, we can pull the payload and retry it
      await cache.set(`msg_payload:${messageId}`, job.data, 86400);
    }
    logger.debug(`Meta queue message sent to ${to}`);
  }

  return result;
}, { 
  connection,
  limiter: {
    max: META_MAX_MPS,
    duration: 1000 // Per 1 second
  }
});

worker.on('failed', (job, err) => {
  logger.error(`Queue Job ${job?.id} failed: ${err.message}`);
});

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
