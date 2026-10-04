import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/auth/provider";
import { Screen, StateView } from "@/components/ui";
import { useLocalization } from "@/localization/provider";

export default function SellerLayout() {
  const { status } = useAuth();
  const { t } = useLocalization();

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("auth.restoringTitle")}
          message={t("auth.restoringMessage")}
        />
      </Screen>
    );
  }

  if (status !== "signedIn") {
    return <Redirect href="/(tabs)/account" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    />
  );
}
