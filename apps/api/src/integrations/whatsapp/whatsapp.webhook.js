import { Router } from "express";
import conversationService from "../../modules/conversation/conversation.service.js";
import logger from "../../utils/logger.js";

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
      const message = provider.parseIncomingMessage(req);

      if (!message) {
        console.log(`Payload ignored by parser (likely a status update or unsupported type).`)
        return res.status(200).send("OK"); // Acknowledge but ignore (status updates, etc.)
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
