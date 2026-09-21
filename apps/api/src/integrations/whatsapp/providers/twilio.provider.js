import twilio from 'twilio'
import { IMessagingProvider } from '../messaging-provider.interface.js'
import env from '../../../config/env.js'
import logger from '../../../utils/logger.js'

export class TwilioProvider extends IMessagingProvider {
  constructor() {
    super()
    if (env.twilio.accountSid && env.twilio.authToken) {
      this.client = twilio(env.twilio.accountSid, env.twilio.authToken)
      this.fromNumber = env.twilio.whatsappNumber
      logger.info('Twilio WhatsApp provider initialized')
    } else {
      this.client = null
      logger.warn('Twilio credentials not set — messages will be logged only')
    }
  }

  async sendTextMessage(to, body) {
    // Normalize phone: ensure it has whatsapp: prefix
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    if (!this.client) {
      logger.debug(`[TWILIO-DRY] To: ${toNumber}\n${body}`)
      return
    }

    try {
      const msg = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to: toNumber,
      })
      logger.debug(`Twilio message sent: ${msg.sid}`)
    } catch (err) {
      logger.error('Twilio send error:', err.message)
      throw err
    }
  }

  parseIncomingMessage(req) {
    // Twilio sends form-urlencoded body
    const { Body, From } = req.body
    if (!Body || !From) return null

    // From format: "whatsapp:+919876543210" → extract just the number
    const phone = From.replace('whatsapp:', '')

    return { phone, body: Body }
  }

  handleVerification(req, res) {
    // Twilio doesn't use GET verification — just respond 200
    res.status(200).send('OK')
  }
}
