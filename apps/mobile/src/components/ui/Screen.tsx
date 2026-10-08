import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/design/theme";

export interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scrollable = true,
  contentStyle
}: ScreenProps) {
  const theme = useAppTheme();

  const content = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
    flex: 1
  },
  content: {
    width: "100%",
    alignSelf: "center"
  }
});
