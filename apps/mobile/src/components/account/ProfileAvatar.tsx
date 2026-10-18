import Ionicons from "@expo/vector-icons/Ionicons";
import type { AuthUser } from "@bazaarlink/contracts";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

export type AvatarColor = NonNullable<AuthUser["avatarColor"]>;
export const avatarColors: readonly AvatarColor[] = ["teal", "blue", "purple", "orange"];

export function ProfileAvatar({
  name, color = "teal", size = 60
}: { name: string | null; color?: AvatarColor; size?: number }) {
  const theme = useAppTheme();
  const { locale } = useLocalization();
  const initial = name?.trim().slice(0, 1).toLocaleUpperCase(locale);
  const tones = {
    teal: [theme.colors.primarySoft, theme.colors.primary],
    blue: [theme.colors.surfaceMuted, theme.colors.focus],
    purple: [theme.colors.surfaceMuted, theme.colors.text],
    orange: [theme.colors.warningSoft, theme.colors.warning]
  } as const;
  const [backgroundColor, foreground] = tones[color];

  return (
    <View
      accessible={false}
      style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 1, borderColor: theme.colors.borderStrong,
        backgroundColor, justifyContent: "center", alignItems: "center"
      }}
    >
      {initial ? (
        <AppText variant={size < 48 ? "bodyStrong" : "title"}
          align="center" style={{ color: foreground }}>
          {initial}
        </AppText>
      ) : (
        <Ionicons name="person-outline" color={foreground} size={size * 0.45} />
      )}
    </View>
  );
}
