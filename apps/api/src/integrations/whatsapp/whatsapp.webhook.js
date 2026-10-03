/**
 * whatsapp.webhook.js — Incoming WhatsApp Webhook Router
 *
 * RULES (do not break these):
 *   1. Always respond 200 OK to Meta — even on errors.
 *      If Meta gets anything other than 200, it retries the webhook endlessly
 *      and eventually disables your webhook entirely.
 *
 *   2. Status updates (delivered, read, failed) are handled BEFORE message parsing.
 *      They return 200 immediately. Meta sends a LOT of these — they must be fast.
 *
 *   3. The 130429 async rate limit handler requeues the failed message via BullMQ
 *      with a 15s delay and tracks retryCount to prevent infinite loops (max 4 retries).
 *
 *   4. Conversation processing runs asynchronously (fire-and-forget) so the 200
 *      is sent to Meta before any DB or AI work begins.
 */

import { Router } from "express";
import conversationService from "../../modules/conversation/conversation.service.js";
import logger from "../../utils/logger.js";
import { cache } from "../../config/redis.js";
import { enqueueMetaMessage } from "./providers/meta.queue.js";

/**
 * Creates the WhatsApp webhook router.
 * @param {IMessagingProvider} provider
 */
export function createWebhookRouter(provider) {
  const router = Router();

  // GET — webhook verification for Meta
  router.get("/", (req, res) => {
    provider.handleVerification(req, res);
  });

  // POST — incoming messages
  router.post("/", async (req, res) => {
    try {
      console.log(`\n--- INCOMING WEBHOOK PAYLOAD ---`)
      console.log(JSON.stringify(req.body, null, 2))
      console.log(`--------------------------------\n`)
      // Handle status updates (e.g. rate limit failures)
      const isStatusUpdate = req.body?.entry?.[0]?.changes?.[0]?.value?.statuses;
      if (isStatusUpdate) {
        const statusObj = req.body.entry[0].changes[0].value.statuses[0];
        
        // If it's a 130429 rate limit failure, requeue it
        if (statusObj.status === "failed" && statusObj.errors?.[0]?.code === 130429) {
          const failedMessageId = statusObj.id;
          logger.warn(`Asynchronous Rate Limit hit for message ${failedMessageId}. Attempting to requeue...`);
          
          const payload = await cache.get(`msg_payload:${failedMessageId}`);
          if (payload) {
            payload.retryCount = (payload.retryCount || 0) + 1;
            
            if (payload.retryCount <= 4) {
              // Requeue with a 30-second delay to give Meta's rate limit window time to reset.
              await enqueueMetaMessage(payload, 30000);
              logger.info(`Message ${failedMessageId} successfully requeued for retry (attempt ${payload.retryCount}).`);
            } else {
              logger.error(`Message ${failedMessageId} failed asynchronously 5 times. Dropping.`);
            }
            
            // Delete from cache so we don't requeue it indefinitely if something goes wrong
            await cache.del(`msg_payload:${failedMessageId}`);
          } else {
            logger.error(`Could not requeue message ${failedMessageId}: Payload not found in Redis cache.`);
          }
        }
        
        return res.status(200).send("OK");
      }

      const message = provider.parseIncomingMessage(req);

      if (!message) {
        console.log(`Payload ignored by parser (likely a status update or unsupported type).`);
        return res.status(200).send("OK");
      }

      logger.info(`WhatsApp from ${message.phone}: Type ${message.type}`);

      // Acknowledge read receipt if supported by provider
      if (message.messageId && typeof provider.markAsRead === "function") {
        provider.markAsRead(message.messageId).catch((err) => {
          logger.error("Failed to mark message as read:", err.message);
        });
      }

      // Process asynchronously — respond 200 immediately
      conversationService.handleMessage(message.phone, message).catch((err) => {
        logger.error("Conversation handler error:", err.message);
      });

      res.status(200).send("OK");
    } catch (err) {
      logger.error("Webhook error:", err.message);
      res.status(200).send("OK"); // Always 200 to prevent retries
    }
  });

  return router;
}
