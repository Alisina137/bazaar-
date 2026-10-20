import { Linking, View } from "react-native";
import { AppText, Button, TextField } from "@/components/ui";
import { useState } from "react";
import { useLocalization } from "@/localization/provider";
import { useAppTheme } from "@/design/theme";
import { googleMapsPlaceUrl, validMapPin } from "./map-utils";
import type { StoreCoordinates } from "./StoreMapPicker";

export function StoreMapPicker({
  value, onChange
}: {
  province: string;
  value: StoreCoordinates | null;
  onChange: (point: StoreCoordinates | null) => void;
}) {
  const { t } = useLocalization();
  const theme = useAppTheme();
  const [lat, setLat] = useState(value ? String(value.latitude) : "");
  const [lon, setLon] = useState(value ? String(value.longitude) : "");
  const point = { latitude: Number(lat), longitude: Number(lon) };
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label">{t("seller.onboarding.mapLocation")}</AppText>
      <AppText tone="muted">{t("seller.onboarding.webMapHint")}</AppText>
      <TextField label={t("seller.onboarding.latitude")} value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
      <TextField label={t("seller.onboarding.longitude")} value={lon} onChangeText={setLon} keyboardType="decimal-pad" />
      <Button
        disabled={!lat.trim() || !lon.trim() || !validMapPin(point)}
        onPress={() => onChange(point)}
      >
        {t("seller.onboarding.confirmMapPin")}
      </Button>
      {value ? (
        <Button variant="secondary" onPress={() => onChange(null)}>{t("seller.onboarding.removeMapPin")}</Button>
      ) : null}
    </View>
  );
}

export function StoreMapPreview({ coordinates }: { coordinates: StoreCoordinates }) {
  const { t } = useLocalization();
  return (
    <Button variant="secondary" onPress={() => {
      const url = googleMapsPlaceUrl(coordinates.latitude, coordinates.longitude);
      if (url) void Linking.openURL(url).catch(() => undefined);
    }}>
      {t("seller.onboarding.openGoogleMaps")}
    </Button>
  );
}
