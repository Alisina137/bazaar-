import type { NotificationRecord } from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  CommunicationApiError,
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
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [actionError, setActionError] = useState<TranslationKey | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const loadEpoch = useRef(0);

  const errorKey = (cause: unknown): TranslationKey =>
    cause instanceof CommunicationApiError &&
      (cause.code === "invalid_session" || cause.code === "account_unavailable")
      ? "notification.error.sessionExpired"
      : "notification.error.serviceUnavailable";

  const load = useCallback(async () => {
    const requestId = ++loadEpoch.current;
    if (authStatus !== "signedIn" || !sessionToken) {
      setItems([]);
      setUnread(0);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      const result = await notifications(sessionToken);
      if (requestId !== loadEpoch.current) return;
      setItems(result.notifications);
      setUnread(result.unreadCount);
    } catch (cause) {
      // Loading can fail without taking down Expo Go (unhandled Promise).
      if (requestId === loadEpoch.current) setLoadError(errorKey(cause));
    } finally {
      if (requestId === loadEpoch.current) setLoading(false);
    }
  }, [authStatus, sessionToken]);

  useEffect(() => {
    void load();
    return () => { loadEpoch.current += 1; };
  }, [load]);

  const markAll = async () => {
    if (!sessionToken || markingAll) return;
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllNotificationsRead(sessionToken);
      await load();
    } catch (cause) {
      setActionError(errorKey(cause));
    } finally {
      setMarkingAll(false);
    }
  };

  const open = async (item: NotificationRecord) => {
    if (!sessionToken) return;
    setActionError(null);
    if (!item.readAt) {
      try {
        await markNotificationRead(sessionToken, item.id);
        setItems(current => current.map(notification =>
          notification.id === item.id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        ));
        setUnread(current => Math.max(0, current - 1));
      } catch (cause) {
        // Still allow opening the linked order/support screen.
        setActionError(errorKey(cause));
      }
    }
    if (item.deepLink.startsWith("/") && !item.deepLink.startsWith("//")) {
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
          loadingVariant="list"
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

      {actionError ? (
        <Card>
          <AppText tone="danger" accessibilityRole="alert">{t(actionError)}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            loading={markingAll}
            disabled={markingAll || !sessionToken || unread === 0}
            onPress={() => { void markAll(); }}
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

      {loadError ? (
        <StateView
          kind="error"
          title={t("notification.title")}
          message={t(loadError)}
          actionLabel={t("notification.retry")}
          onAction={() => { void load(); }}
        />
      ) : items.length === 0 ? (
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
