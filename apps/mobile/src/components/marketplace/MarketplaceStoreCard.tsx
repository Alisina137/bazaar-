import type { MarketplaceFeaturedStore } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export function MarketplaceStoreCard({
  featured, grid = false
}: {
  featured: MarketplaceFeaturedStore;
  grid?: boolean;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { isRTL, t, formatNumber } = useLocalization();
  const { store, activeProductCount } = featured;
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={store.name + ", " + store.province}
      onPress={() => router.push({
        pathname: "/marketplace/store/[handle]",
        params: { handle: store.handle }
      })}
      style={({ pressed }) => ({
        width: grid ? "48%" : 210,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.surface,
        ...(theme.scheme === "light" ? theme.elevation.card : {}),
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      {store.coverImageUrl && !coverFailed ? (
        <Image
          source={{ uri: store.coverImageUrl }}
          accessibilityLabel={store.name}
          onError={() => setCoverFailed(true)}
          resizeMode="cover"
          style={{
            width: "100%", height: 104,
            backgroundColor: theme.colors.surfaceMuted
          }}
        />
      ) : (
        <View style={{
          height: 104,
          alignItems: "center", justifyContent: "center",
          backgroundColor: theme.colors.primarySoft
        }}>
          <Ionicons name="storefront-outline" size={30} color={theme.colors.primary} />
        </View>
      )}
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.sm
        }}>
          <View style={{
            height: 44, width: 44,
            borderRadius: theme.radii.md,
            overflow: "hidden", alignItems: "center", justifyContent: "center",
            backgroundColor: theme.colors.surfaceMuted
          }}>
            {store.logoUrl && !logoFailed ? (
              <Image
                source={{ uri: store.logoUrl }}
                resizeMode="cover"
                accessibilityLabel={store.name}
                onError={() => setLogoFailed(true)}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Ionicons name="storefront" size={21} color={theme.colors.primary} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="label" numberOfLines={2}>{store.name}</AppText>
          </View>
        </View>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.xs
        }}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {store.province}
            </AppText>
          </View>
        </View>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", gap: theme.spacing.xs
        }}>
          <Ionicons name="cube-outline" size={14} color={theme.colors.textMuted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="caption" tone="muted">
              {formatNumber(activeProductCount) + " " + t("marketplace.productCount")}
            </AppText>
          </View>
          {store.trust.phoneVerified ? (
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={theme.colors.success}
              accessibilityLabel={t("trust.phoneVerified")}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
