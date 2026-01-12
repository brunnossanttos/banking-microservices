import { NotificationType, NotificationPriority, NotificationTemplate } from './events.types';

export { NotificationType, NotificationPriority, NotificationTemplate };

export type NotificationStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
}

export interface NotificationContent {
  subject?: string;
  title?: string;
  body: string;
  html?: string;
  data?: Record<string, unknown>;
}

export interface SendNotificationInput {
  recipient: NotificationRecipient;
  type: NotificationType;
  template: NotificationTemplate;
  priority?: NotificationPriority;
  data: Record<string, unknown>;
  scheduledAt?: Date;
}

export interface NotificationResult {
  notificationId: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
}

export interface NotificationChannelPreference {
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ExtendedNotificationPreferences {
  userId: string;
  email: NotificationChannelPreference;
  sms: NotificationChannelPreference;
  push: NotificationChannelPreference;
  inApp: NotificationChannelPreference;
  templatePreferences: Partial<Record<NotificationTemplate, boolean>>;
}

export interface INotificationService {
  send(input: SendNotificationInput): Promise<NotificationResult>;

  sendBulk(inputs: SendNotificationInput[]): Promise<NotificationResult[]>;

  getStatus(notificationId: string): Promise<NotificationResult>;

  cancel(notificationId: string): Promise<boolean>;

  getPreferences(userId: string): Promise<ExtendedNotificationPreferences>;

  updatePreferences(
    userId: string,
    preferences: Partial<ExtendedNotificationPreferences>,
  ): Promise<ExtendedNotificationPreferences>;

  getHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: NotificationType;
      status?: NotificationStatus;
    },
  ): Promise<NotificationResult[]>;
}

export interface INotificationEventHandlers {
  handleWelcome(userId: string, data: { name: string; email: string }): Promise<void>;

  handleTransactionCreated(
    userId: string,
    data: {
      transactionId: string;
      amount: number;
      type: string;
      recipientName?: string;
    },
  ): Promise<void>;

  handleTransactionCompleted(
    userId: string,
    data: {
      transactionId: string;
      amount: number;
      status: string;
    },
  ): Promise<void>;

  handleTransactionReceived(
    userId: string,
    data: {
      transactionId: string;
      amount: number;
      senderName?: string;
    },
  ): Promise<void>;

  handleTransactionFailed(
    userId: string,
    data: {
      transactionId: string;
      amount: number;
      errorMessage?: string;
    },
  ): Promise<void>;

  handleBankingDetailsUpdated(
    userId: string,
    data: {
      agency?: string;
      account?: string;
    },
  ): Promise<void>;
}

export interface ITemplateRenderer {
  render(template: NotificationTemplate, data: Record<string, unknown>): NotificationContent;

  listTemplates(): NotificationTemplate[];

  validateData(template: NotificationTemplate, data: Record<string, unknown>): boolean;
}

export interface IEmailProvider {
  send(to: string, subject: string, body: string, html?: string): Promise<{ messageId: string }>;
}

export interface ISmsProvider {
  send(to: string, body: string): Promise<{ messageId: string }>;
}

export interface IPushProvider {
  send(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ successCount: number; failureCount: number }>;
}
