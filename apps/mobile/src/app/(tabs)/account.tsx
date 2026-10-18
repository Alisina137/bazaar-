import {
  getAvailableAppModes,
  type AppMode,
  type AppRole,
  type OrderRecord
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "@/auth/provider";
import { LanguageSwitcher } from "@/components/localization/LanguageSwitcher";
import { AccountMenuRow, AccountSection } from "@/components/account/AccountMenu";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { GuestAccountContent } from "@/components/account/GuestAccountContent";
import { sellerAccountEntry } from "@/account/navigation";
import {
  AppText,
  Badge,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";
import { listCustomerOrders } from "@/order/api";
import { orderStateKey } from "@/order/messages";

function roleKey(role: AppRole): TranslationKey {
  const keys: Record<AppRole, TranslationKey> = {
    customer: "role.customer",
    merchant_owner: "role.merchantOwner",
    merchant_staff: "role.merchantStaff",
    platform_support: "role.platformSupport",
    platform_admin: "role.platformAdmin",
    super_admin: "role.superAdmin"
  };

  return keys[role];
}

function modeKey(mode: AppMode): TranslationKey {
  const keys: Record<AppMode, TranslationKey> = {
    shopping: "auth.mode.shopping",
    seller: "auth.mode.seller",
    platform: "auth.mode.platform"
  };

  return keys[mode];
}

export default function AccountScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  const { status, user, sessionToken, logout } = useAuth();
  const { status: storeStatus, currentStore, refresh: refreshStores } = useStores();
  const [showAccess, setShowAccess] = useState(false);

  const [busy, setBusy] = useState(false);
  const [latestOrder, setLatestOrder] = useState<OrderRecord | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (status !== "signedIn" || !sessionToken) {
      setLatestOrder(null);
      return () => { active = false; };
    }
    void listCustomerOrders(sessionToken).then(response => {
      if (active) {
        const ordered = [...response.orders].sort((a, b) =>
          Date.parse(b.placedAt) - Date.parse(a.placedAt)
        );
        setLatestOrder(ordered[0] ?? null);
      }
    }).catch(() => {
      if (active) setLatestOrder(null);
    });
    return () => { active = false; };
  }, [sessionToken, status]));

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

  if (status === "signedIn" && user) {
    const availableModes = getAvailableAppModes(user.roles);
    const displayName = user.displayName?.trim() || t("auth.signedInTitle");
    const mainRole: AppRole =
      user.roles.find((role) => role !== "customer") ?? "customer";
    const isStaff = user.roles.includes("merchant_staff");
    const isOwner = user.roles.includes("merchant_owner");
    const hasPlatformRole = availableModes.includes("platform");
    const sellerEntry = sellerAccountEntry(
      user.roles, storeStatus, currentStore !== null
    );

    const openSeller = () => {
      if (sellerEntry === "workspace") {
        router.push("/seller/(tabs)");
      } else if (sellerEntry === "onboarding") {
        router.push("/seller/onboarding");
      } else if (sellerEntry === "retry") {
        void refreshStores();
      }
    };

    return (
      <Screen contentStyle={{ gap: theme.spacing.lg }}>
        <AppText variant="heading">{t("account.title")}</AppText>

        <Card style={{
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.borderStrong,
          padding: theme.spacing.lg
        }}>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              gap: theme.spacing.md
            }}>
              <ProfileAvatar name={user.displayName} color={user.avatarColor ?? "teal"} size={60} />
              <View style={{ flex: 1, gap: theme.spacing.xs, minWidth: 0 }}>
                <AppText variant="heading" numberOfLines={2}>{displayName}</AppText>
                {user.email ? (
                  <AppText variant="caption" tone="muted"
                    align={isRTL ? "right" : "left"}
                    style={{ writingDirection: "ltr" }}
                    numberOfLines={1}>{user.email}</AppText>
                ) : null}
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center", gap: theme.spacing.sm,
                  flexWrap: "wrap"
                }}>
                  <Badge label={t(roleKey(mainRole))} tone="primary" />
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("account.profile.edit")}
                onPress={() => router.push("/account/profile")}
                style={({ pressed }) => ({
                  minWidth: 44, minHeight: 44,
                  alignItems: "center", justifyContent: "center",
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? theme.opacity.pressed : 1
                })}
              >
                <Ionicons name="create-outline" size={21} color={theme.colors.primary} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("account.accessDetails")}
              accessibilityState={{ expanded: showAccess }}
              onPress={() => setShowAccess((current) => !current)}
              style={({ pressed }) => ({
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                minHeight: 44,
                paddingHorizontal: theme.spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.colors.borderStrong,
                opacity: pressed ? theme.opacity.pressed : 1
              })}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="caption" tone="primary">
                  {t("account.accessDetails")}
                </AppText>
              </View>
              <Ionicons
                name={showAccess ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.primary}
              />
            </Pressable>
            {showAccess ? (
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="label">{t("auth.rolesLabel")}</AppText>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  flexWrap: "wrap", gap: theme.spacing.xs
                }}>
                  {user.roles.map((role) => (
                    <Badge key={role} label={t(roleKey(role))} tone="primary" />
                  ))}
                </View>
                <AppText variant="label">{t("auth.authorizedModesLabel")}</AppText>
                <View style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  flexWrap: "wrap", gap: theme.spacing.xs
                }}>
                  {availableModes.map((appMode) => (
                    <Badge key={appMode} label={t(modeKey(appMode))} />
                  ))}
                </View>
                <AppText variant="caption" tone="muted">
                  {t("auth.rolesManagedByServer")}
                </AppText>
              </View>
            ) : null}
          </View>
        </Card>

        <AccountSection title={t("account.section.shopping")}>
          {latestOrder ? (
            <AccountMenuRow
              icon="cube-outline"
              title={t("account.shopping.recentOrder") + " #" + latestOrder.orderNumber}
              subtitle={t(orderStateKey(latestOrder.state))}
              onPress={() => router.push({
                pathname: "/orders/[orderId]",
                params: { orderId: latestOrder.id }
              })}
            />
          ) : null}
          <AccountMenuRow
            icon="receipt-outline"
            title={t("account.myOrders")}
            subtitle={t("account.ordersHint")}
            onPress={() => router.push("/(tabs)/orders")}
          />
          <AccountMenuRow
            icon="heart-outline"
            title={t("account.shopping.wishlist")}
            subtitle={t("account.shopping.wishlistHint")}
            onPress={() => router.push("/account/wishlist")}
          />
          <AccountMenuRow
            icon="time-outline"
            title={t("account.shopping.recent")}
            subtitle={t("account.shopping.recentHint")}
            onPress={() => router.push("/account/recently-viewed")}
          />
          <AccountMenuRow
            icon="cart-outline"
            title={t("nav.cart")}
            subtitle={t("account.cartHint")}
            onPress={() => router.push("/(tabs)/cart")}
            last
          />
        </AccountSection>

        <AccountSection title={t("account.section.account")}>
          <AccountMenuRow
            icon="person-outline"
            title={t("account.profile.title")}
            subtitle={t("account.profile.menuHint")}
            onPress={() => router.push("/account/profile")}
          />
          <AccountMenuRow
            icon="shield-checkmark-outline"
            title={t("account.security.title")}
            subtitle={t("account.security.menuHint")}
            onPress={() => router.push("/account/security")}
          />
          <AccountMenuRow
            icon="location-outline"
            title={t("address.manage")}
            subtitle={t("account.addressesHint")}
            onPress={() => router.push("/checkout/addresses")}
            last
          />
        </AccountSection>

        <AccountSection title={t("account.section.preferences")}>
          <AccountMenuRow
            icon="notifications-outline"
            title={t("account.notifications")}
            subtitle={t("account.notificationsHint")}
            onPress={() => router.push("/notifications")}
          />
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center", gap: theme.spacing.sm
            }}>
              <Ionicons name="language-outline" size={20} color={theme.colors.primary} />
              <AppText variant="label">{t("language.label")}</AppText>
            </View>
            <LanguageSwitcher compact />
          </View>
        </AccountSection>

        <AccountSection title={t("account.section.business")}>
          <AccountMenuRow
            icon="storefront-outline"
            title={
              sellerEntry === "workspace"
                ? (isStaff && !isOwner
                  ? t("account.sellerStaffWorkspace")
                  : t("account.openSellerDashboard"))
                : sellerEntry === "retry"
                  ? t("account.storeAccessRetry")
                  : sellerEntry === "loading"
                    ? t("account.storeAccessLoading")
                    : sellerEntry === "unassigned"
                      ? t("account.sellerStaffWorkspace")
                      : t("account.sellOnBazaarLink")
            }
            subtitle={
              sellerEntry === "unassigned" ? t("account.noAssignedStore")
                : sellerEntry === "retry" ? t("account.storeAccessError")
                : undefined
            }
            onPress={
              sellerEntry === "onboarding" || sellerEntry === "workspace" ||
              sellerEntry === "retry" ? openSeller : undefined
            }
            last={!hasPlatformRole}
          />
          {hasPlatformRole ? (
            <>
              <AccountMenuRow
                icon="shield-checkmark-outline"
                title={t("review.moderationTitle")}
                onPress={() => router.push("/platform/reviews")}
              />
              <AccountMenuRow
                icon="headset-outline"
                title={t("support.platformTitle")}
                onPress={() => router.push("/platform/support")}
                last
              />
            </>
          ) : null}
        </AccountSection>

        <AccountSection title={t("account.section.help")}>
          <AccountMenuRow
            icon="help-circle-outline"
            title={t("account.support")}
            subtitle={t("account.supportHint")}
            onPress={() => router.push("/support")}
            last
          />
        </AccountSection>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <AccountMenuRow
            icon="log-out-outline"
            title={t("auth.signOut")}
            destructive
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void logout()
                .catch(() => undefined)
                .finally(() => setBusy(false));
            }}
            last
          />
        </Card>
      </Screen>
    );
  }

  return <GuestAccountContent />;
}
