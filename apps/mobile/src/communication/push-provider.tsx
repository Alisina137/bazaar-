import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { deactivatePushToken, registerPushToken } from "./api";

type PushStatus = "idle" | "enabled" | "disabled" | "unavailable";

interface PushContextValue {
  status: PushStatus;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
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
  const { status: authStatus, sessionToken, user } = useAuth();
  const [status, setStatus] = useState<PushStatus>(
    remotePushSupported ? "idle" : "unavailable"
  );

  // Preference is specific to the signed-in account on this device.
  useEffect(() => {
    if (!remotePushSupported) return;
    let mounted = true;
    setStatus("idle");
    if (authStatus !== "signedIn" || !user) return;
    void AsyncStorage.getItem("bazaarlink.push.v1." + user.id).then(saved => {
      if (mounted && (saved === "enabled" || saved === "disabled")) setStatus(saved);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [authStatus, user?.id]);

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
      if (user) {
        await AsyncStorage.setItem("bazaarlink.push.v1." + user.id, "enabled").catch(() => undefined);
      }
      return true;
    } catch {
      setStatus("unavailable");
      return false;
    }
  }, [authStatus, sessionToken, user?.id]);

  const disable = useCallback(async () => {
    if (!remotePushSupported || !sessionToken || !user) return false;
    try {
      const notifications = await loadNotifications();
      if (!notifications) return false;
      const permission = await notifications.getPermissionsAsync();
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      // When notifications were never permitted, no Expo token could have been registered.
      if (permission.status === "granted") {
        if (!projectId) return false;
        const pushToken = (await notifications.getExpoPushTokenAsync({ projectId })).data;
        await deactivatePushToken(sessionToken, pushToken);
      }
      await AsyncStorage.setItem("bazaarlink.push.v1." + user.id, "disabled");
      setStatus("disabled");
      return true;
    } catch {
      return false;
    }
  }, [sessionToken, user?.id]);

  const value = useMemo(() => ({ status, enable, disable }), [disable, enable, status]);

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
