import { useRef, type PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView as ScrollViewType,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/design/theme";

const savedScrollOffsets = new Map<string, number>();

export interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  /** Preserve a scroll position when a screen with the same key is revisited. */
  scrollKey?: string;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: (() => void) | undefined;
}

export function Screen({
  children,
  scrollable = true,
  scrollKey,
  contentStyle,
  refreshing = false,
  onRefresh
}: ScreenProps) {
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollViewType>(null);
  const restoredKey = useRef<string | null>(null);

  const restoreScrollPosition = () => {
    if (!scrollKey || restoredKey.current === scrollKey) return;
    restoredKey.current = scrollKey;
    const offset = savedScrollOffsets.get(scrollKey) ?? 0;
    if (offset > 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: offset, animated: false }));
    }
  };

  const rememberScrollPosition = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollKey) savedScrollOffsets.set(scrollKey, event.nativeEvent.contentOffset.y);
  };

  const content = scrollable ? (
    <ScrollView
      ref={scrollRef}
      onScroll={rememberScrollPosition}
      scrollEventThrottle={100}
      onContentSizeChange={restoreScrollPosition}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      ) : undefined}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        {
          gap: theme.spacing.xl,
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing["2xl"],
          maxWidth: theme.sizes.contentMaxWidth
        },
        contentStyle
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        styles.flex,
        {
          gap: theme.spacing.xl,
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing["2xl"],
          maxWidth: theme.sizes.contentMaxWidth
        },
        contentStyle
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        styles.flex,
        {
          backgroundColor: theme.colors.background
        }
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    direction: "ltr"
  },
  content: {
    // Layout rows are explicitly mirrored for the active locale. Avoid
    // device-level RTL reversing them again (language changes are live).
    direction: "ltr",
    width: "100%",
    alignSelf: "center"
  }
});
