export interface MessagePayload {
  to: string; // Indian phone number
  text: string;
  recipientName?: string;
  variables?: Record<string, string | number | null | undefined>;
}

export interface SendResult {
  success: boolean;
  channel: "WHATSAPP_LINK" | "WHATSAPP_API" | "SMS_MSG91";
  externalId?: string;
  whatsAppUrl?: string;
  error?: string;
}

export interface IMessagingProvider {
  name: string;
  channel: "WHATSAPP_LINK" | "WHATSAPP_API" | "SMS_MSG91";
  isConfigured(): boolean;
  send(payload: MessagePayload): Promise<SendResult>;
}
