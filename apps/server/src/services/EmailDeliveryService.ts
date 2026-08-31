import { Resend } from 'resend'

export class EmailDeliveryService {
  private resend: Resend | null = null
  private fromEmail: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    // Ensure we fall back to a reasonable default if not set,
    // though Resend will reject unauthorized sender domains.
    this.fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@midnightcreative.com'

    if (apiKey) {
      this.resend = new Resend(apiKey)
    }
  }

  /**
   * Batches recipients into chunks of 50 (Resend's limit per API call)
   * and sends the email payload to all.
   */
  async publishBatch(
    subject: string,
    body: string,
    recipients: string[],
  ): Promise<{ success: boolean; sentCount: number; errors: any[] }> {
    if (!this.resend) {
      console.warn('[EmailDeliveryService] RESEND_API_KEY not set. Skipping actual delivery.')
      return { success: true, sentCount: recipients.length, errors: [] }
    }

    const BATCH_SIZE = 50
    let sentCount = 0
    const errors: any[] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE)

      try {
        const payload = chunk.map((to) => ({
          from: this.fromEmail,
          to,
          subject,
          html: body,
        }))

        const result = await this.resend.batch.send(payload)

        if (result.error) {
          errors.push(result.error)
        } else {
          sentCount += chunk.length
        }
      } catch (err) {
        errors.push(err)
      }
    }

    return {
      success: errors.length === 0,
      sentCount,
      errors,
    }
  }
}
