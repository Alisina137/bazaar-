export const notificationTypes = [
  "order_placed",
  "payment_successful",
  "payment_failed",
  "order_confirmed",
  "order_cancelled",
  "order_preparing",
  "out_for_delivery",
  "delivered",
  "review_available",
  "low_stock",
  "new_review",
  "subscription_issue",
  "support_reply",
  "delivery_failed"
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export const pushPlatforms = ["android", "ios"] as const;
export type PushPlatform = (typeof pushPlatforms)[number];

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  data: Record<string, unknown>;
  deepLink: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationRecord[];
  unreadCount: number;
}

export interface RegisterPushTokenInput {
  token: string;
  platform: PushPlatform;
  deviceId?: string | null | undefined;
}

export const supportTicketStatuses = [
  "open",
  "waiting_support",
  "waiting_customer",
  "closed"
] as const;
export type SupportTicketStatus =
  (typeof supportTicketStatuses)[number];

export const supportTicketCategories = [
  "order",
  "payment",
  "delivery",
  "product",
  "account",
  "merchant",
  "other"
] as const;
export type SupportTicketCategory =
  (typeof supportTicketCategories)[number];

export interface SupportMessageRecord {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorKind: "user" | "platform";
  body: string;
  createdAt: string;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  storeId: string | null;
  orderId: string | null;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: SupportMessageRecord[];
}

export interface SupportTicketListResponse {
  tickets: SupportTicketRecord[];
}

export interface CreateSupportTicketInput {
  category: SupportTicketCategory;
  subject: string;
  message: string;
  orderId?: string | null | undefined;
  storeId?: string | null | undefined;
}

export interface ReplySupportTicketInput {
  message: string;
}

export interface UpdateSupportTicketStatusInput {
  status: SupportTicketStatus;
}

export const communicationErrorCodes = [
  "invalid_request",
  "invalid_session",
  "account_unavailable",
  "forbidden",
  "notification_not_found",
  "support_ticket_not_found",
  "support_ticket_closed",
  "support_context_invalid",
  "push_registration_failed",
  "rate_limited",
  "service_unavailable"
] as const;

export type CommunicationErrorCode =
  (typeof communicationErrorCodes)[number];

export interface CommunicationErrorResponse {
  error: {
    code: CommunicationErrorCode;
  };
}
