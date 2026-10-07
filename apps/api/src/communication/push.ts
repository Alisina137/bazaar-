import type {
  NotificationRecord,
  NotificationType
} from "@bazaarlink/contracts";

import type { PushTokenRecord } from "./repository.js";

type PushLocale = "fa-AF" | "ps-AF" | "en";

const pushCopy: Record<
  PushLocale,
  Record<NotificationType, { title: string; body: string }>
> = {
  en: {
    order_placed: {
      title: "Order placed",
      body: "Your order was placed successfully."
    },
    payment_successful: {
      title: "Payment successful",
      body: "BazaarLink confirmed your payment."
    },
    payment_failed: {
      title: "Payment failed",
      body: "The payment was not confirmed. Choose another method or try again."
    },
    order_confirmed: {
      title: "Order confirmed",
      body: "The seller confirmed your order."
    },
    order_cancelled: {
      title: "Order cancelled",
      body: "An order was cancelled."
    },
    order_preparing: {
      title: "Order preparing",
      body: "The seller is preparing your order."
    },
    out_for_delivery: {
      title: "Out for delivery",
      body: "Your order is on the way."
    },
    delivered: {
      title: "Order completed",
      body: "Your order was delivered or picked up."
    },
    review_available: {
      title: "Review available",
      body: "You can now review your completed purchase."
    },
    low_stock: {
      title: "Low stock",
      body: "A product has reached its low-stock threshold."
    },
    new_review: {
      title: "New review",
      body: "A customer reviewed a product from your store."
    },
    subscription_issue: {
      title: "Subscription issue",
      body: "Your store subscription needs attention."
    },
    support_reply: {
      title: "Support replied",
      body: "BazaarLink support replied to your ticket."
    },
    delivery_failed: {
      title: "Delivery issue",
      body: "The seller reported a delivery problem."
    }
  },
  "fa-AF": {
    order_placed: {
      title: "سفارش ثبت شد",
      body: "سفارش شما با موفقیت ثبت شد."
    },
    payment_successful: {
      title: "پرداخت موفق",
      body: "بازارلینک پرداخت شما را تأیید کرد."
    },
    payment_failed: {
      title: "پرداخت ناموفق",
      body: "پرداخت تأیید نشد. روش دیگری انتخاب کنید یا دوباره تلاش کنید."
    },
    order_confirmed: {
      title: "سفارش تأیید شد",
      body: "فروشنده سفارش شما را تأیید کرد."
    },
    order_cancelled: {
      title: "سفارش لغو شد",
      body: "یک سفارش لغو شد."
    },
    order_preparing: {
      title: "آماده‌سازی سفارش",
      body: "فروشنده در حال آماده‌سازی سفارش شما است."
    },
    out_for_delivery: {
      title: "در مسیر تحویل",
      body: "سفارش شما در راه است."
    },
    delivered: {
      title: "سفارش تکمیل شد",
      body: "سفارش شما تحویل یا دریافت شد."
    },
    review_available: {
      title: "امکان ثبت دیدگاه",
      body: "اکنون می‌توانید خرید تکمیل‌شده را ارزیابی کنید."
    },
    low_stock: {
      title: "موجودی کم",
      body: "موجودی یک محصول به حد هشدار رسیده است."
    },
    new_review: {
      title: "دیدگاه جدید",
      body: "یک مشتری برای محصول فروشگاه شما دیدگاه ثبت کرد."
    },
    subscription_issue: {
      title: "مشکل اشتراک",
      body: "اشتراک فروشگاه شما نیاز به توجه دارد."
    },
    support_reply: {
      title: "پاسخ پشتیبانی",
      body: "پشتیبانی بازارلینک به درخواست شما پاسخ داد."
    },
    delivery_failed: {
      title: "مشکل تحویل",
      body: "فروشنده یک مشکل تحویل را گزارش کرده است."
    }
  },
  "ps-AF": {
    order_placed: {
      title: "سفارش ثبت شو",
      body: "ستاسو سفارش په بریالیتوب ثبت شو."
    },
    payment_successful: {
      title: "تادیه بریالۍ",
      body: "بازارلینک ستاسو تادیه تایید کړه."
    },
    payment_failed: {
      title: "تادیه ناکامه",
      body: "تادیه تایید نه شوه. بله لاره وټاکئ یا بیا هڅه وکړئ."
    },
    order_confirmed: {
      title: "سفارش تایید شو",
      body: "پلورونکي ستاسو سفارش تایید کړ."
    },
    order_cancelled: {
      title: "سفارش لغوه شو",
      body: "یو سفارش لغوه شو."
    },
    order_preparing: {
      title: "سفارش چمتو کېږي",
      body: "پلورونکی ستاسو سفارش چمتو کوي."
    },
    out_for_delivery: {
      title: "د سپارلو په لاره",
      body: "ستاسو سفارش په لاره دی."
    },
    delivered: {
      title: "سفارش بشپړ شو",
      body: "ستاسو سفارش وسپارل شو یا واخیستل شو."
    },
    review_available: {
      title: "کتنه موجوده ده",
      body: "اوس خپل بشپړ شوی پېرود کتلی شئ."
    },
    low_stock: {
      title: "موجودي کمه ده",
      body: "د یوه محصول موجودي د خبرداري کچې ته رسېدلې."
    },
    new_review: {
      title: "نوې کتنه",
      body: "پیرودونکي ستاسو د پلورنځي محصول وکوت."
    },
    subscription_issue: {
      title: "د ګډون ستونزه",
      body: "ستاسو د پلورنځي ګډون پام ته اړتیا لري."
    },
    support_reply: {
      title: "د ملاتړ ځواب",
      body: "د بازارلینک ملاتړ ستاسو غوښتنې ته ځواب ورکړ."
    },
    delivery_failed: {
      title: "د سپارلو ستونزه",
      body: "پلورونکي د سپارلو ستونزه راپور کړې."
    }
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
    locale: PushLocale,
    notification: NotificationRecord,
    tokens: PushTokenRecord[]
  ): Promise<PushResult[]>;
}

export class ExpoPushGateway implements PushGateway {
  async send(
    locale: PushLocale,
    notification: NotificationRecord,
    tokens: PushTokenRecord[]
  ): Promise<PushResult[]> {
    if (tokens.length === 0) return [];

    const strings = pushCopy[locale][notification.type];

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
              title: strings.title,
              body: strings.body,
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
