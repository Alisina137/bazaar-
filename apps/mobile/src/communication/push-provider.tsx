import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

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
  const [status, setStatus] = useState<PushStatus>("idle");

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const deepLink = internalDeepLink(
          response.notification.request.content.data.deepLink
        );
        if (deepLink) router.push(deepLink as never);
      });

    return () => subscription.remove();
  }, [router]);

  const enable = useCallback(async () => {
    if (
      Platform.OS === "web" ||
      authStatus !== "signedIn" ||
      !sessionToken
    ) {
      setStatus("unavailable");
      return false;
    }

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      const permission =
        existing.status === "granted"
          ? existing
          : await Notifications.requestPermissionsAsync();

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
        await Notifications.getExpoPushTokenAsync({ projectId })
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
