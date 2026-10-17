import { cleanIndianPhone, getWhatsAppUrl, interpolateTemplate } from "@/lib/utils";
import { IMessagingProvider, MessagePayload, SendResult } from "./types";

/**
 * 1. Default: WhatsApp Click-to-Chat Link Provider (Zero-cost, works instantly for any user)
 */
export class WhatsAppLinkProvider implements IMessagingProvider {
  name = "WhatsApp Click-to-Chat Link";
  channel = "WHATSAPP_LINK" as const;

  isConfigured(): boolean {
    return true; // Always available
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    const cleanPhone = cleanIndianPhone(payload.to);
    const finalMessage = payload.variables
      ? interpolateTemplate(payload.text, payload.variables)
      : payload.text;

    const url = getWhatsAppUrl(cleanPhone, finalMessage);

    return {
      success: true,
      channel: this.channel,
      whatsAppUrl: url,
    };
  }
}

/**
 * 2. Pluggable: WhatsApp Cloud API Provider (Meta Graph API)
 */
export class WhatsAppCloudApiProvider implements IMessagingProvider {
  name = "WhatsApp Cloud API";
  channel = "WHATSAPP_API" as const;

  private token = process.env.WHATSAPP_API_TOKEN;
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  isConfigured(): boolean {
    return Boolean(this.token && this.phoneNumberId);
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        channel: this.channel,
        error: "WhatsApp Cloud API is not configured. Falling back to WhatsApp Link.",
      };
    }

    const cleanPhone = cleanIndianPhone(payload.to);
    const finalMessage = payload.variables
      ? interpolateTemplate(payload.text, payload.variables)
      : payload.text;

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "text",
            text: { body: finalMessage },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          channel: this.channel,
          error: data.error?.message || "WhatsApp API error",
        };
      }

      return {
        success: true,
        channel: this.channel,
        externalId: data.messages?.[0]?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        channel: this.channel,
        error: err.message || "Failed to call WhatsApp Cloud API",
      };
    }
  }
}

/**
 * 3. Pluggable: MSG91 SMS Provider
 */
export class MSG91Provider implements IMessagingProvider {
  name = "MSG91 SMS Gateway";
  channel = "SMS_MSG91" as const;

  private authKey = process.env.MSG91_AUTH_KEY;
  private senderId = process.env.MSG91_SENDER_ID || "DIRSEL";

  isConfigured(): boolean {
    return Boolean(this.authKey);
  }

  async send(payload: MessagePayload): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        channel: this.channel,
        error: "MSG91 is not configured in environment.",
      };
    }

    const cleanPhone = cleanIndianPhone(payload.to);
    const finalMessage = payload.variables
      ? interpolateTemplate(payload.text, payload.variables)
      : payload.text;

    try {
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: this.authKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: this.senderId,
          recipients: [{ mobiles: cleanPhone, message: finalMessage }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          channel: this.channel,
          error: data.message || "MSG91 error",
        };
      }

      return {
        success: true,
        channel: this.channel,
        externalId: data.request_id,
      };
    } catch (err: any) {
      return {
        success: false,
        channel: this.channel,
        error: err.message || "Failed to dispatch MSG91 SMS",
      };
    }
  }
}

// Registry
const linkProvider = new WhatsAppLinkProvider();
const cloudApiProvider = new WhatsAppCloudApiProvider();
const msg91Provider = new MSG91Provider();

export function getMessagingProvider(channel?: string): IMessagingProvider {
  if (channel === "WHATSAPP_API" && cloudApiProvider.isConfigured()) {
    return cloudApiProvider;
  }
  if (channel === "SMS_MSG91" && msg91Provider.isConfigured()) {
    return msg91Provider;
  }
  return linkProvider;
}
