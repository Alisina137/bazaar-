import type {
  NotificationRecord,
  NotificationType
} from "@bazaarlink/contracts";
import {
  translate,
  type SupportedLocale,
  type TranslationKey
} from "@bazaarlink/localization";

import type { PushTokenRecord } from "./repository.js";

const copy: Record<
  NotificationType,
  { title: TranslationKey; body: TranslationKey }
> = {
  order_placed: {
    title: "notification.orderPlaced.title",
    body: "notification.orderPlaced.body"
  },
  payment_successful: {
    title: "notification.paymentSuccessful.title",
    body: "notification.paymentSuccessful.body"
  },
  payment_failed: {
    title: "notification.paymentFailed.title",
    body: "notification.paymentFailed.body"
  },
  order_confirmed: {
    title: "notification.orderConfirmed.title",
    body: "notification.orderConfirmed.body"
  },
  order_cancelled: {
    title: "notification.orderCancelled.title",
    body: "notification.orderCancelled.body"
  },
  order_preparing: {
    title: "notification.orderPreparing.title",
    body: "notification.orderPreparing.body"
  },
  out_for_delivery: {
    title: "notification.outForDelivery.title",
    body: "notification.outForDelivery.body"
  },
  delivered: {
    title: "notification.delivered.title",
    body: "notification.delivered.body"
  },
  review_available: {
    title: "notification.reviewAvailable.title",
    body: "notification.reviewAvailable.body"
  },
  low_stock: {
    title: "notification.lowStock.title",
    body: "notification.lowStock.body"
  },
  new_review: {
    title: "notification.newReview.title",
    body: "notification.newReview.body"
  },
  subscription_issue: {
    title: "notification.subscriptionIssue.title",
    body: "notification.subscriptionIssue.body"
  },
  support_reply: {
    title: "notification.supportReply.title",
    body: "notification.supportReply.body"
  },
  delivery_failed: {
    title: "notification.deliveryFailed.title",
    body: "notification.deliveryFailed.body"
  }
};

export interface PushResult {
  tokenId: string;
  success: boolean;
  providerTicketId: string | null;
  error: string | null;
}

export interface PushGateway {
  send(
    locale: SupportedLocale,
    notification: NotificationRecord,
    tokens: PushTokenRecord[]
  ): Promise<PushResult[]>;
}

export class ExpoPushGateway implements PushGateway {
  async send(
    locale: SupportedLocale,
    notification: NotificationRecord,
    tokens: PushTokenRecord[]
  ): Promise<PushResult[]> {
    if (tokens.length === 0) return [];

    const strings = copy[notification.type];
    try {
      const response = await fetch(
        "https://exp.host/--/api/v2/push/send",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json"
          },
          body: JSON.stringify(
            tokens.map((token) => ({
              to: token.token,
              sound: "default",
              title: translate(locale, strings.title),
              body: translate(locale, strings.body),
              data: {
                deepLink: notification.deepLink,
                notificationId: notification.id,
                type: notification.type
              }
            }))
          )
        }
      );

      if (!response.ok) {
        return tokens.map((token) => ({
          tokenId: token.id,
          success: false,
          providerTicketId: null,
          error: "expo_push_http_" + response.status
        }));
      }

      const payload = (await response.json()) as {
        data?: Array<{
          status?: string;
          id?: string;
          message?: string;
        }>;
      };

      return tokens.map((token, index) => {
        const result = payload.data?.[index];
        return {
          tokenId: token.id,
          success: result?.status === "ok",
          providerTicketId: result?.id ?? null,
          error:
            result?.status === "ok"
              ? null
              : result?.message ?? "expo_push_failed"
        };
      });
    } catch {
      return tokens.map((token) => ({
        tokenId: token.id,
        success: false,
        providerTicketId: null,
        error: "expo_push_unavailable"
      }));
    }
  }
}
