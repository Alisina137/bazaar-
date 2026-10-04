import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  defaultLocale,
  formatAfn as formatAfnValue,
  formatNumber as formatNumberValue,
  getDirection,
  isSupportedLocale,
  normalizeLocale,
  translate,
  type SupportedLocale,
  type TranslationKey
} from "@bazaarlink/localization";
import { getLocales } from "expo-localization";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect
} from "react";

const STORAGE_KEY = "bazaarlink.locale";

interface LocalizationContextValue {
  locale: SupportedLocale;
  direction: "rtl" | "ltr";
  isRTL: boolean;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: (key: TranslationKey) => string;
  formatNumber: (value: number) => string;
  formatAfn: (value: number) => string;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

function getDeviceLocale(): SupportedLocale {
  const deviceLocale = getLocales()[0]?.languageTag;
  return normalizeLocale(deviceLocale ?? defaultLocale);
}

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getDeviceLocale);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isSupportedLocale(stored)) {
          setLocaleState(stored);
        }
      })
      .catch(() => {
        // Keep the device/fallback locale if persistence is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      // The selected locale remains active for the current session.
    }
  }, []);

  const value = useMemo<LocalizationContextValue>(() => {
    const direction = getDirection(locale);

    return {
      locale,
      direction,
      isRTL: direction === "rtl",
      setLocale,
      t: (key) => translate(locale, key),
      formatNumber: (valueToFormat) => formatNumberValue(valueToFormat, locale),
      formatAfn: (valueToFormat) => formatAfnValue(valueToFormat, locale)
    };
  }, [locale, setLocale]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const value = useContext(LocalizationContext);

  if (!value) {
    throw new Error("useLocalization must be used inside LocalizationProvider");
  }

  return value;
}
