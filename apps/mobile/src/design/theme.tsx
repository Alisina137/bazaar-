import { themes, type AppTheme } from "@bazaarlink/design-tokens";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo
} from "react";
import { useColorScheme } from "react-native";

const ThemeContext = createContext<AppTheme>(themes.light);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();

  const theme = useMemo<AppTheme>(
    () => (colorScheme === "dark" ? themes.dark : themes.light),
    [colorScheme]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
