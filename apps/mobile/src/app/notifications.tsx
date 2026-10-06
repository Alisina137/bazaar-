import type { NotificationRecord } from "@bazaarlink/contracts";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notifications
} from "@/communication/api";
import {
  notificationBodyKey,
  notificationTitleKey
} from "@/communication/messages";
import { usePushNotifications } from "@/communication/push-provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status: authStatus, sessionToken } = useAuth();
  const { t } = useLocalization();
  const push = usePushNotifications();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (authStatus !== "signedIn" || !sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await notifications(sessionToken);
      setItems(result.notifications);
      setUnread(result.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [authStatus, sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (item: NotificationRecord) => {
    if (!sessionToken) return;
    if (!item.readAt) {
      await markNotificationRead(sessionToken, item.id);
    }
    if (
      item.deepLink.startsWith("/") &&
      !item.deepLink.startsWith("//")
    ) {
      router.push(item.deepLink as never);
    } else {
      await load();
    }
  };

  if (loading) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("notification.title")}
          message={t("notification.unread")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="display">{t("notification.title")}</AppText>
        <Badge
          label={t("notification.unread") + ": " + unread}
          tone={unread > 0 ? "primary" : "neutral"}
        />
      </View>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            onPress={() => {
              if (!sessionToken) return;
              void markAllNotificationsRead(sessionToken).then(load);
            }}
          >
            {t("notification.markAllRead")}
          </Button>
          <Button
            variant="secondary"
            onPress={() => void push.enable()}
          >
            {t("notification.enablePush")}
          </Button>
          {push.status !== "idle" ? (
            <AppText tone="muted">
              {t(
                push.status === "enabled"
                  ? "notification.pushEnabled"
                  : "notification.pushUnavailable"
              )}
            </AppText>
          ) : null}
        </View>
      </Card>

      {items.length === 0 ? (
        <StateView
          kind="empty"
          title={t("notification.title")}
          message={t("notification.empty")}
        />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => void open(item)}
            style={({ pressed }) => ({
              opacity: pressed ? theme.opacity.pressed : 1
            })}
          >
            <Card muted={!item.readAt}>
              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="bodyStrong">
                  {t(notificationTitleKey(item.type))}
                </AppText>
                <AppText tone="muted">
                  {t(notificationBodyKey(item.type))}
                </AppText>
                {!item.readAt ? (
                  <Badge label={t("notification.unread")} tone="primary" />
                ) : null}
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
