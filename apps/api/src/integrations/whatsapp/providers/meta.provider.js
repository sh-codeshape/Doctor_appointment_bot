/**
 * meta.provider.js — Meta WhatsApp Cloud API Provider
 *
 * Implements IMessagingProvider for Meta's WhatsApp Cloud API.
 *
 * OUTGOING MESSAGE FLOW:
 *   sendTextMessage()     → enqueueMetaMessage() → meta.queue.js → Meta API
 *   sendLocationMessage() → enqueueMetaMessage() → meta.queue.js → Meta API
 *   markAsRead()          → direct fetch()       → Meta API   (bypasses queue intentionally)
 *
 * ⚠️  See meta.queue.js for rate limit configuration and critical design notes.
 */

import { IMessagingProvider } from "../messaging-provider.interface.js";
import logger from "../../../utils/logger.js";
import env from "../../../config/env.js";
import { enqueueMetaMessage } from "./meta.queue.js";

/**
 * Meta WhatsApp Cloud API provider.
 */
export class MetaProvider extends IMessagingProvider {
  constructor() {
    super();
    if (!env.meta.phoneNumberId || !env.meta.accessToken) {
      logger.warn(
        "Meta credentials not fully set — messages will only be logged",
      );
    } else {
      logger.info("Meta WhatsApp provider initialized");
    }
  }

  async sendTextMessage(to, body) {
    if (!env.meta.phoneNumberId || !env.meta.accessToken) {
      logger.debug(`[META-DRY] To: ${to}\n${body}`);
      return;
    }

    // Ensure body is a valid string
    const stringBody = typeof body === "string" ? body : String(body || "");
    if (!stringBody.trim()) {
      logger.error(`Meta send error: body is empty or non-string (received type: ${typeof body})`);
      return;
    }

    await enqueueMetaMessage({ to, body: stringBody, type: 'text' });
  }

  async sendLocationMessage(to, body) {
    if (!env.meta.phoneNumberId || !env.meta.accessToken) {
      logger.debug(`[META-DRY] Location to: ${to}\n${JSON.stringify(body)}`);
      return;
    }

    await enqueueMetaMessage({ to, location: body, type: 'location' });
  }

  parseIncomingMessage(req) {
    const body = req.body;

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const msg = messages[0];

        // Plain text messages
        if (msg.type === "text") {
          return {
            phone: msg.from,
            type: "text",
            body: msg.text?.body || "",
            messageId: msg.id,
          };
        }

        // Image messages (prescription upload)
        if (msg.type === "image") {
          return {
            phone: msg.from,
            type: "image",
            imageId: msg.image?.id,
            mimeType: msg.image?.mime_type,
          };
        }

        // Location messages (e.g. sharing location pin during address/pincode step)
        if (msg.type === "location") {
          const loc = msg.location || {};
          const locText = loc.address || loc.name || `${loc.latitude}, ${loc.longitude}`;
          return {
            phone: msg.from,
            type: "text",
            body: locText,
          };
        }

        // Interactive / button reply messages
        if (msg.type === "interactive") {
          const reply = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.id || "";
          return {
            phone: msg.from,
            type: "text",
            body: reply,
            messageId: msg.id,
          };
        }

        if (msg.type === "button") {
          return {
            phone: msg.from,
            type: "text",
            body: msg.button?.text || "",
            messageId: msg.id,
          };
        }
      }
    }
    return null;
  }

  async downloadMedia(mediaId) {
    if (!env.meta.accessToken) throw new Error("Missing Meta access token");

    // 1. Get media URL
    const res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${env.meta.accessToken}` },
    });
    if (!res.ok) throw new Error("Failed to fetch media metadata");
    const { url, mime_type } = await res.json();

    // 2. Download binary data
    const mediaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${env.meta.accessToken}` },
    });
    if (!mediaRes.ok) throw new Error("Failed to download media binary");

    const buffer = await mediaRes.arrayBuffer();
    return { buffer: Buffer.from(buffer), mimeType: mime_type };
  }

  // ⚠️  CRITICAL — markAsRead MUST stay as a direct fetch(), NOT enqueueMetaMessage().
  //
  //  WHY: Read receipts (marking a message as 'read') bypass the rate-limited queue
  //  intentionally. Routing them through the queue wastes job slots that are meant
  //  for actual patient-facing messages and can cause real messages to be delayed.
  //
  //  Read receipts are fire-and-forget — Meta does not retry them and patients
  //  are not affected if one occasionally fails. They are low-priority.
  //
  //  If you are tempted to change this to: await enqueueMetaMessage({ type: 'read', ... })
  //  → DON’T. That was a bug we fixed. See git history for context.
  async markAsRead(messageId) {
    if (!env.meta.phoneNumberId || !env.meta.accessToken) return;
    // markAsRead is fire-and-forget — bypass the rate-limited queue
    // so it doesn't consume slots meant for actual patient messages
    fetch(
      `https://graph.facebook.com/v18.0/${env.meta.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.meta.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      }
    ).catch((err) => logger.warn(`markAsRead failed (non-critical): ${err.message}`));
    // intentionally NOT awaited — we never want this to block a message
  }

  handleVerification(req, res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === env.meta.verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  }
}
