import {
  merchantStaffPermissions,
  type MerchantStaffInviteRecord,
  type MerchantStaffPermission,
  type MerchantStaffResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import {
  acceptStaffInvite,
  createStaffInvite,
  GrowthApiError,
  removeStaff,
  revokeStaffInvite,
  staff as loadStaff,
  updateStaff
} from "@/growth/api";
import { growthErrorKey } from "@/growth/messages";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

function permissionKey(permission: MerchantStaffPermission): TranslationKey {
  return ("growth.staff.permission." + permission) as TranslationKey;
}

export default function SellerStaffScreen() {
  const theme = useAppTheme();
  const { formatNumber, t } = useLocalization();
  const { sessionToken, user } = useAuth();
  const { currentStore } = useStores();

  const [data, setData] = useState<MerchantStaffResponse | null>(null);
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<MerchantStaffPermission[]>([
    "products",
    "inventory",
    "orders"
  ]);
  const [latestInvite, setLatestInvite] =
    useState<MerchantStaffInviteRecord | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GrowthApiError | null>(null);

  const isOwner = Boolean(
    currentStore && user && currentStore.ownerUserId === user.id
  );

  const refresh = async () => {
    if (!sessionToken || !currentStore || !isOwner) return;
    setError(null);
    try {
      setData(await loadStaff(sessionToken, currentStore.id));
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    }
  };

  useEffect(() => {
    void refresh();
  }, [sessionToken, currentStore?.id, isOwner]);

  const togglePermission = (permission: MerchantStaffPermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  const sendInvite = async () => {
    if (!sessionToken || !currentStore) return;
    setBusy(true);
    setError(null);
    try {
      const invite = await createStaffInvite(
        sessionToken,
        currentStore.id,
        { email, permissions }
      );
      setLatestInvite(invite);
      setEmail("");
      await refresh();
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    } finally {
      setBusy(false);
    }
  };

  const acceptInvite = async () => {
    if (!sessionToken || !inviteCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await acceptStaffInvite(sessionToken, {
        inviteCode: inviteCode.trim()
      });
      setInviteCode("");
    } catch (requestError) {
      setError(
        requestError instanceof GrowthApiError
          ? requestError
          : new GrowthApiError("service_unavailable")
      );
    } finally {
      setBusy(false);
    }
  };

  if (!currentStore) {
    return (
      <Screen>
        <AppText variant="title">{t("growth.staff.title")}</AppText>
        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <AppText variant="heading">{t("growth.staff.acceptTitle")}</AppText>
            <TextField
              label={t("growth.staff.inviteCode")}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
            />
            <Button
              loading={busy}
              disabled={!inviteCode.trim()}
              onPress={() => void acceptInvite()}
            >
              {t("growth.staff.accept")}
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">{t("growth.staff.title")}</AppText>

      {error ? (
        <Card muted>
          <AppText tone="danger">{t(growthErrorKey(error.code))}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="heading">{t("growth.staff.acceptTitle")}</AppText>
          <TextField
            label={t("growth.staff.inviteCode")}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="none"
          />
          <Button
            loading={busy}
            disabled={!inviteCode.trim()}
            onPress={() => void acceptInvite()}
          >
            {t("growth.staff.accept")}
          </Button>
        </View>
      </Card>

      {!isOwner ? (
        <Card muted>
          <AppText tone="muted">{t("growth.error.forbidden")}</AppText>
        </Card>
      ) : currentStore.subscription.entitlements.staffLimit === 0 ? (
        <Card muted>
          <AppText tone="muted">{t("growth.staff.ownerOnly")}</AppText>
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ gap: theme.spacing.lg }}>
              <AppText variant="heading">{t("growth.staff.invite")}</AppText>
              <AppText tone="muted">
                {t("growth.staff.limit")}: {formatNumber(data?.activeStaffCount ?? 0)} / {formatNumber(data?.staffLimit ?? currentStore.subscription.entitlements.staffLimit)}
              </AppText>
              <TextField
                label={t("growth.staff.email")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppText variant="label">{t("growth.staff.permissions")}</AppText>
              <View style={{ gap: theme.spacing.sm }}>
                {merchantStaffPermissions.map((permission) => {
                  const selected = permissions.includes(permission);
                  return (
                    <Pressable
                      key={permission}
                      onPress={() => togglePermission(permission)}
                      style={{
                        padding: theme.spacing.md,
                        borderWidth: 1,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.borderStrong,
                        borderRadius: theme.radii.md,
                        backgroundColor: selected
                          ? theme.colors.surfaceMuted
                          : theme.colors.surface
                      }}
                    >
                      <AppText variant="bodyStrong">
                        {t(permissionKey(permission))}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
              <Button
                loading={busy}
                disabled={!email.trim() || permissions.length === 0}
                onPress={() => void sendInvite()}
              >
                {t("growth.staff.sendInvite")}
              </Button>
            </View>
          </Card>

          {latestInvite?.inviteCode ? (
            <Card>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="heading">{t("growth.staff.inviteCode")}</AppText>
                <AppText selectable>{latestInvite.inviteCode}</AppText>
                <AppText tone="muted">{t("growth.staff.copyHint")}</AppText>
              </View>
            </Card>
          ) : null}

          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="heading">{t("growth.staff.active")}</AppText>
              {(data?.staff ?? []).length === 0 ? (
                <AppText tone="muted">—</AppText>
              ) : (
                data?.staff.map((member) => (
                  <View key={member.id} style={{ gap: theme.spacing.sm }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: theme.spacing.md
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong">
                          {member.displayName ?? member.email ?? member.userId}
                        </AppText>
                        <AppText tone="muted">
                          {member.permissions
                            .map((permission) => t(permissionKey(permission)))
                            .join(" · ")}
                        </AppText>
                      </View>
                      <Badge
                        label={
                          member.status === "active"
                            ? t("growth.staff.active")
                            : t("growth.staff.suspended")
                        }
                        tone={member.status === "active" ? "success" : "warning"}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                      <Button
                        variant="secondary"
                        onPress={() => {
                          if (!sessionToken) return;
                          void (async () => {
                            await updateStaff(
                              sessionToken,
                              currentStore.id,
                              member.id,
                              {
                                status:
                                  member.status === "active"
                                    ? "suspended"
                                    : "active"
                              }
                            );
                            await refresh();
                          })();
                        }}
                      >
                        {member.status === "active"
                          ? t("growth.staff.suspend")
                          : t("growth.staff.activate")}
                      </Button>
                      <Button
                        variant="danger"
                        onPress={() => {
                          if (!sessionToken) return;
                          void (async () => {
                            await removeStaff(
                              sessionToken,
                              currentStore.id,
                              member.id
                            );
                            await refresh();
                          })();
                        }}
                      >
                        {t("growth.staff.remove")}
                      </Button>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Card>

          <Card>
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="heading">{t("growth.staff.pending")}</AppText>
              {(data?.invites ?? []).filter((invite) => invite.status === "pending").length === 0 ? (
                <AppText tone="muted">—</AppText>
              ) : (
                data?.invites
                  .filter((invite) => invite.status === "pending")
                  .map((invite) => (
                    <View key={invite.id} style={{ gap: theme.spacing.sm }}>
                      <AppText variant="bodyStrong">{invite.email}</AppText>
                      <AppText tone="muted">{invite.expiresAt}</AppText>
                      <Button
                        variant="danger"
                        onPress={() => {
                          if (!sessionToken) return;
                          void (async () => {
                            await revokeStaffInvite(
                              sessionToken,
                              currentStore.id,
                              invite.id
                            );
                            await refresh();
                          })();
                        }}
                      >
                        {t("growth.staff.revoke")}
                      </Button>
                    </View>
                  ))
              )}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
