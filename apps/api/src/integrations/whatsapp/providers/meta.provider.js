import { IMessagingProvider } from "../messaging-provider.interface.js";
import logger from "../../../utils/logger.js";
import env from "../../../config/env.js";

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

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${env.meta.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.meta.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: stringBody },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        logger.error(`Meta send error: ${JSON.stringify(errorData)}`);
        throw new Error("Failed to send WhatsApp message via Meta");
      }

      logger.debug(`Meta message sent to ${to}`);
    } catch (err) {
      logger.error("Meta send exception:", err.message);
    }
  }

  async sendLocationMessage(to, body) {
    if (!env.meta.phoneNumberId || !env.meta.accessToken) {
      logger.debug(`[META-DRY] Location to: ${to}\n${JSON.stringify(body)}`);
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${env.meta.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.meta.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "location",
            location: {
              latitude: body.latitude,
              longitude: body.longitude,
              name: body.name,
              address: body.address,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        logger.error(`Meta location send error: ${JSON.stringify(errorData)}`);
        throw new Error("Failed to send WhatsApp location via Meta");
      }

      logger.debug(`Meta location sent to ${to}`);
    } catch (err) {
      logger.error("Meta location send exception:", err.message);
    }
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
          };
        }

        if (msg.type === "button") {
          return {
            phone: msg.from,
            type: "text",
            body: msg.button?.text || "",
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
