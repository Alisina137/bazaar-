import type { MarketplaceCategoryRecord } from "@bazaarlink/contracts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useState, type ComponentProps } from "react";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

type IconName = ComponentProps<typeof Ionicons>["name"];

function categoryIcon(category: MarketplaceCategoryRecord): IconName {
  const label = (category.slug + " " + category.nameEn).toLowerCase();
  if (/phone|mobile|smartphone/.test(label)) return "phone-portrait-outline";
  if (/computer|laptop|pc|tech|electronic/.test(label)) return "laptop-outline";
  if (/fashion|cloth|apparel|wear/.test(label)) return "shirt-outline";
  if (/shoe|footwear/.test(label)) return "footsteps-outline";
  if (/home|house|furniture|decor/.test(label)) return "home-outline";
  if (/beauty|cosmetic|skin/.test(label)) return "sparkles-outline";
  if (/book|education|stationery/.test(label)) return "book-outline";
  if (/sport|fitness|gym/.test(label)) return "football-outline";
  if (/baby|kid|child|toy/.test(label)) return "happy-outline";
  if (/food|grocery|kitchen/.test(label)) return "basket-outline";
  if (/car|auto|vehicle/.test(label)) return "car-outline";
  if (/watch|jewel|accessory/.test(label)) return "watch-outline";
  return "grid-outline";
}

function MarketplaceCategoryTileInner({
  category, onPress, grid = false
}: {
  category: MarketplaceCategoryRecord;
  onPress: () => void;
  grid?: boolean;
}) {
  const theme = useAppTheme();
  const { locale } = useLocalization();
  const [brokenImage, setBrokenImage] = useState(false);
  const name = locale === "en" ? category.nameEn :
    locale === "ps-AF" ? category.namePs : category.nameFa;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => ({
        width: grid ? "31%" : 110,
        minHeight: 124,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        opacity: pressed ? theme.opacity.pressed : 1
      })}
    >
      <View style={{
        height: 58, width: 58, overflow: "hidden",
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.primarySoft,
        alignItems: "center", justifyContent: "center"
      }}>
        {category.imageUrl && !brokenImage ? (
          <Image
            source={{ uri: category.imageUrl }}
            accessibilityLabel={name}
            onError={() => setBrokenImage(true)}
            resizeMode="cover"
            style={{ width: 58, height: 58 }}
          />
        ) : (
          <Ionicons
            name={categoryIcon(category)}
            color={theme.colors.primary}
            size={27}
          />
        )}
      </View>
      <AppText variant="caption" align="center" numberOfLines={2}>
        {name}
      </AppText>
    </Pressable>
  );
}

export const MarketplaceCategoryTile = memo(MarketplaceCategoryTileInner);
