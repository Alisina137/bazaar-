import { useEffect, useRef, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, View, type ViewStyle } from "react-native";

import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export type SkeletonVariant =
  | "list"
  | "cart"
  | "orders"
  | "product"
  | "store"
  | "grid"
  | "form"
  | "dashboard";

/**
 * One opacity animation per group (not per rectangle); the animation is
 * automatically disabled when the device requests reduced motion.
 */
export function SkeletonPulse({ children }: PropsWithChildren) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (!active || reduced) return;
        loop = Animated.loop(Animated.sequence([
          Animated.timing(opacity, { toValue: 0.52, duration: 950, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 950, useNativeDriver: true })
        ]));
        loop.start();
      })
      .catch(() => undefined);
    return () => { active = false; loop?.stop(); };
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export function SkeletonBlock({
  width = "100%",
  height = 15,
  radius,
  style
}: {
  width?: ViewStyle["width"];
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  return (
    <View
      accessible={false}
      style={[{
        width, height,
        borderRadius: radius ?? theme.radii.sm,
        backgroundColor: theme.colors.surfaceMuted
      }, style]}
    />
  );
}

function SkeletonCard({ type }: { type: "row" | "product" | "merchant" | "summary" }) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();
  const panel: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    overflow: "hidden"
  };

  if (type === "summary") return (
    <View style={panel}>
      <SkeletonBlock width="36%" height={19} />
      <SkeletonBlock width="100%" height={12} />
      <SkeletonBlock width="76%" height={12} />
      <View style={{ height: 1, backgroundColor: theme.colors.border }} />
      <SkeletonBlock width="62%" height={20} />
    </View>
  );

  if (type === "product") return (
    <View style={panel}>
      <SkeletonBlock height={125} radius={theme.radii.md} />
      <SkeletonBlock width="92%" height={15} />
      <SkeletonBlock width="61%" height={12} />
      <SkeletonBlock width="48%" height={20} />
    </View>
  );

  return (
    <View style={panel}>
      {type === "merchant" ? (
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.sm }}>
          <SkeletonBlock width={26} height={26} radius={theme.radii.md} />
          <SkeletonBlock width="40%" height={16} />
        </View>
      ) : null}
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "flex-start", gap: theme.spacing.md
      }}>
        <SkeletonBlock width={type === "merchant" ? 72 : 56}
          height={type === "merchant" ? 72 : 56} radius={theme.radii.md} />
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <SkeletonBlock width="88%" height={16} />
          <SkeletonBlock width="62%" height={12} />
          <SkeletonBlock width="44%" height={15} />
        </View>
      </View>
      {type === "merchant" ? (
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm }}>
          <SkeletonBlock width="43%" height={34} radius={theme.radii.md} />
          <View style={{ flex: 1 }} />
          <SkeletonBlock width="24%" height={34} radius={theme.radii.md} />
        </View>
      ) : null}
    </View>
  );
}

/** Placeholder geometry mirrors the page so it does not jump after loading. */
export function LoadingSkeleton({
  variant = "list",
  label
}: {
  variant?: SkeletonVariant;
  label: string;
}) {
  const theme = useAppTheme();
  const { isRTL } = useLocalization();

  let body;
  switch (variant) {
    case "product":
      body = <>
        <SkeletonBlock height={220} radius={theme.radii.lg} />
        <SkeletonBlock width="72%" height={22} />
        <SkeletonBlock width="38%" height={16} />
        <SkeletonBlock width="54%" height={23} />
        <SkeletonBlock width="100%" height={48} radius={theme.radii.md} />
      </>;
      break;
    case "cart":
      body = <>
        <SkeletonBlock width="40%" height={22} />
        <SkeletonCard type="merchant" />
        <SkeletonCard type="summary" />
        <SkeletonBlock height={45} radius={theme.radii.md} />
      </>;
      break;
    case "orders":
      body = <>
        <SkeletonBlock width="42%" height={22} />
        <SkeletonBlock height={44} radius={theme.radii.md} />
        <SkeletonCard type="row" />
        <SkeletonCard type="row" />
      </>;
      break;
    case "store":
      body = <>
        <SkeletonBlock height={122} radius={theme.radii.lg} />
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: theme.spacing.md }}>
          <SkeletonBlock width={60} height={60} radius={theme.radii.lg} />
          <View style={{ flex: 1, gap: theme.spacing.sm }}>
            <SkeletonBlock width="75%" height={19} />
            <SkeletonBlock width="48%" height={13} />
          </View>
        </View>
        <SkeletonCard type="row" />
      </>;
      break;
    case "grid":
      body = <>
        <SkeletonBlock width="45%" height={20} />
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}><SkeletonCard type="product" /></View>
          <View style={{ flex: 1 }}><SkeletonCard type="product" /></View>
        </View>
      </>;
      break;
    case "dashboard":
      body = <>
        <SkeletonBlock width="55%" height={22} />
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ flex: 1 }}><SkeletonBlock height={74} radius={theme.radii.md} /></View>
          ))}
        </View>
        <SkeletonCard type="summary" />
        <SkeletonCard type="row" />
      </>;
      break;
    case "form":
      body = <>
        <SkeletonBlock width="66%" height={21} />
        {[0, 1, 2].map(i => (
          <View key={i} style={{ gap: theme.spacing.xs }}>
            <SkeletonBlock width="35%" height={12} />
            <SkeletonBlock height={44} radius={theme.radii.md} />
          </View>
        ))}
        <SkeletonBlock height={44} radius={theme.radii.md} />
      </>;
      break;
    default:
      body = <>
        <SkeletonBlock width="50%" height={22} />
        <SkeletonCard type="row" />
        <SkeletonCard type="row" />
        <SkeletonCard type="row" />
      </>;
  }

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ width: "100%", gap: theme.spacing.md }}
    >
      <SkeletonPulse>{/* Pulse the group once, not each individual item. */}
        <View style={{ gap: theme.spacing.md }}>{body}</View>
      </SkeletonPulse>
    </View>
  );
}
