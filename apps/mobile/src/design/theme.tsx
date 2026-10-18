import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, type AppTheme } from "@bazaarlink/design-tokens";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useColorScheme } from "react-native";

export type AppearancePreference = "system" | "light" | "dark";
export const appearanceOptions: readonly AppearancePreference[] = ["system", "light", "dark"];
const STORAGE_KEY = "bazaarlink.appearance.v1";

export function validAppearance(value: unknown): value is AppearancePreference {
  return value === "system" || value === "light" || value === "dark";
}

interface ThemeContextValue {
  theme: AppTheme;
  appearance: AppearancePreference;
  setAppearance: (value: AppearancePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.light,
  appearance: "system",
  setAppearance: async () => undefined
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>("system");
  const touched = useRef(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (active && !touched.current && validAppearance(value)) {
          setAppearanceState(value);
        }
      }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const setAppearance = useCallback(async (next: AppearancePreference) => {
    touched.current = true;
    setAppearanceState(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); }
    catch { /* Keep this-session selection if storage is unavailable. */ }
  }, []);

  const theme = useMemo<AppTheme>(() => {
    const scheme = appearance === "system" ? deviceScheme : appearance;
    return scheme === "dark" ? themes.dark : themes.light;
  }, [appearance, deviceScheme]);

  const value = useMemo(() => ({
    theme, appearance, setAppearance
  }), [theme, appearance, setAppearance]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext).theme;
}

export function useAppearancePreference() {
  const { appearance, setAppearance } = useContext(ThemeContext);
  return { appearance, setAppearance };
}
