import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_TOKEN_KEY = "bazaarlink.session-token";
let webSessionToken: string | null = null;

export async function getStoredSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webSessionToken;
  }

  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function setStoredSessionToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    webSessionToken = token;
    return;
  }

  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED
  });
}

export async function clearStoredSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    webSessionToken = null;
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
