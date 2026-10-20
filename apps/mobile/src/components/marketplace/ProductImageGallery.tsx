import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, HorizontalLocaleScroll } from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

interface GalleryImage {
  id: string;
  url: string;
  altText: string;
}

export function ProductImageGallery({
  images,
  productName
}: {
  images: readonly GalleryImage[];
  productName: string;
}) {
  const theme = useAppTheme();
  const { isRTL, formatNumber, t } = useLocalization();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const active = images.find(image => image.id === currentId) ?? images[0] ?? null;
  const activeIndex = active ? images.findIndex(image => image.id === active.id) : -1;
  const failed = active?.url === failedUrl;
  const loading = Boolean(active) && active?.url !== loadedUrl && !failed;
  useEffect(() => {
    setFailedUrl(null);
    setLoadedUrl(null);
  }, [active?.url]);

  const placeholder = (
    <View style={{
      flex: 1, gap: theme.spacing.sm,
      alignItems: "center", justifyContent: "center"
    }}>
      <Ionicons name="image-outline" size={42} color={theme.colors.textMuted} />
      <AppText tone="muted" align="center">
        {t("marketplace.imageUnavailable")}
      </AppText>
    </View>
  );

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        disabled={!active || failed}
        accessibilityRole="button"
        accessibilityLabel={t("marketplace.product.enlargePhoto")}
        onPress={() => setExpanded(true)}
        style={({ pressed }) => ({
          width: "100%",
          aspectRatio: 1,
          maxHeight: 430,
          position: "relative",
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.xl,
          backgroundColor: theme.colors.surfaceMuted,
          opacity: pressed ? theme.opacity.pressed : 1
        })}
      >
        {active && !failed ? (
          <Image
            key={active.url}
            source={{ uri: active.url }}
            accessibilityLabel={active.altText}
            resizeMode="contain"
            style={{ width: "100%", height: "100%" }}
            onLoad={() => setLoadedUrl(active.url)}
            onError={() => setFailedUrl(active.url)}
          />
        ) : placeholder}
        {loading ? (
          <View pointerEvents="none" style={{
            position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
            justifyContent: "center", alignItems: "center"
          }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}
        {images.length > 1 ? (
          <View style={{
            position: "absolute",
            bottom: theme.spacing.md,
            ...(isRTL ? { left: theme.spacing.md } : { right: theme.spacing.md }),
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radii.full,
            borderWidth: 1, borderColor: theme.colors.border
          }}>
            <AppText variant="caption">
              {formatNumber(activeIndex + 1)} / {formatNumber(images.length)}
            </AppText>
          </View>
        ) : null}
      </Pressable>
      {images.length > 1 ? (
        <HorizontalLocaleScroll
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
        >
          {images.map(image => (
            <Pressable
              key={image.id}
              accessibilityRole="button"
              accessibilityLabel={image.altText}
              accessibilityState={{ selected: active?.id === image.id }}
              onPress={() => setCurrentId(image.id)}
              style={({ pressed }) => ({
                width: 68, height: 68,
                borderRadius: theme.radii.md,
                borderWidth: active?.id === image.id ? 2 : 1,
                borderColor: active?.id === image.id
                  ? theme.colors.primary : theme.colors.border,
                backgroundColor: theme.colors.surfaceMuted,
                overflow: "hidden",
                opacity: pressed ? theme.opacity.pressed : 1
              })}
            >
              <Image
                source={{ uri: image.url }}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
            </Pressable>
          ))}
        </HorizontalLocaleScroll>
      ) : null}
      <Modal
        visible={expanded}
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <SafeAreaView style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.lg,
          gap: theme.spacing.md
        }}>
          <View style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", justifyContent: "space-between"
          }}>
            <AppText variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {productName}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("marketplace.product.closePhoto")}
              onPress={() => setExpanded(false)}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" color={theme.colors.text} size={26} />
            </Pressable>
          </View>
          {active && !failed ? (
            <Image
              source={{ uri: active.url }}
              accessibilityLabel={active.altText}
              resizeMode="contain"
              style={{ width: "100%", flex: 1 }}
            />
          ) : <View style={{ flex: 1 }}>{placeholder}</View>}
          {images.length > 1 ? (
            <View style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between", alignItems: "center",
              gap: theme.spacing.md
            }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("marketplace.product.previousPhoto")}
                onPress={() => setCurrentId(images[(activeIndex + images.length - 1) % images.length]!.id)}
                style={{ padding: theme.spacing.md }}
              >
                <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"}
                  size={26} color={theme.colors.primary} />
              </Pressable>
              <AppText>{formatNumber(activeIndex + 1)} / {formatNumber(images.length)}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("marketplace.product.nextPhoto")}
                onPress={() => setCurrentId(images[(activeIndex + 1) % images.length]!.id)}
                style={{ padding: theme.spacing.md }}
              >
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={26} color={theme.colors.primary} />
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
