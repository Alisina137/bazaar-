import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Platform } from "react-native";

import { useAuth } from "@/auth/provider";
import { registerPushToken } from "./api";

type PushStatus = "idle" | "enabled" | "unavailable";

interface PushContextValue {
  status: PushStatus;
  enable: () => Promise<boolean>;
}

const PushContext = createContext<PushContextValue | null>(null);

// Android Expo Go no longer supports remote push (SDK 53+). Importing the
// native notifications module at file scope can crash the entire app before
// users reach the in-app notification center. A development build remains
// eligible, even though its executionEnvironment can also be "storeClient".
const remotePushSupported =
  Platform.OS !== "web" &&
  Constants.appOwnership !== "expo" &&
  Constants.expoGoConfig == null;

type NotificationsModule = typeof import("expo-notifications");

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

function loadNotifications(): Promise<NotificationsModule | null> {
  if (!remotePushSupported) return Promise.resolve(null);

  if (!notificationsPromise) {
    // Only evaluate expo-notifications in a native build which supports push.
    notificationsPromise = import("expo-notifications")
      .then((notifications) => {
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true
          })
        });
        return notifications;
      })
      .catch(() => null);
  }

  return notificationsPromise;
}

function internalDeepLink(value: unknown): string | null {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : null;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { status: authStatus, sessionToken } = useAuth();
  const [status, setStatus] = useState<PushStatus>(
    remotePushSupported ? "idle" : "unavailable"
  );

  useEffect(() => {
    if (!remotePushSupported) return;

    let mounted = true;
    let subscription: { remove: () => void } | undefined;

    void loadNotifications().then((notifications) => {
      if (!mounted) return;
      if (!notifications) {
        setStatus("unavailable");
        return;
      }
      subscription = notifications.addNotificationResponseReceivedListener(
        (response) => {
          const deepLink = internalDeepLink(
            response.notification.request.content.data?.deepLink
          );
          if (deepLink) router.push(deepLink as never);
        }
      );
    }).catch(() => {
      if (mounted) setStatus("unavailable");
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [router]);

  const enable = useCallback(async () => {
    if (!remotePushSupported ||
        authStatus !== "signedIn" ||
        !sessionToken) {
      setStatus("unavailable");
      return false;
    }

    try {
      const notifications = await loadNotifications();
      if (!notifications) {
        setStatus("unavailable");
        return false;
      }

      if (Platform.OS === "android") {
        await notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: notifications.AndroidImportance.DEFAULT
        });
      }

      const existing = await notifications.getPermissionsAsync();
      const permission =
        existing.status === "granted"
          ? existing
          : await notifications.requestPermissionsAsync();

      if (permission.status !== "granted") {
        setStatus("unavailable");
        return false;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        setStatus("unavailable");
        return false;
      }

      const token = (
        await notifications.getExpoPushTokenAsync({ projectId })
      ).data;

      await registerPushToken(sessionToken, {
        token,
        platform: Platform.OS === "ios" ? "ios" : "android"
      });

      setStatus("enabled");
      return true;
    } catch {
      setStatus("unavailable");
      return false;
    }
  }, [authStatus, sessionToken]);

  const value = useMemo(() => ({ status, enable }), [enable, status]);

  return (
    <PushContext.Provider value={value}>
      {children}
    </PushContext.Provider>
  );
}

export function usePushNotifications(): PushContextValue {
  const value = useContext(PushContext);
  if (!value) {
    throw new Error("usePushNotifications must be used inside NotificationProvider");
  }
  return value;
}
