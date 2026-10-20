import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, View } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { googleMapsPlaceUrl, initialMapCenter, validMapPin } from "./map-utils";

export interface StoreCoordinates {
  latitude: number;
  longitude: number;
}

export function StoreMapPicker({
  province, value, onChange
}: {
  province: string;
  value: StoreCoordinates | null;
  onChange: (coordinates: StoreCoordinates | null) => void;
}) {
  const { t, isRTL, formatNumber } = useLocalization();
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<StoreCoordinates | null>(null);
  useEffect(() => {
    if (!visible) setDraft(value);
  }, [value, visible]);
  const center = value ?? initialMapCenter(province);
  const choose = (event: MapPressEvent) => {
    const next = event.nativeEvent.coordinate;
    if (validMapPin(next)) setDraft(next);
  };
  const display = (position: StoreCoordinates) =>
    formatNumber(Number(position.latitude.toFixed(5))) + ", " +
    formatNumber(Number(position.longitude.toFixed(5)));
  const openMap = async (point: StoreCoordinates) => {
    const url = googleMapsPlaceUrl(point.latitude, point.longitude);
    if (url) await Linking.openURL(url).catch(() => undefined);
  };
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label">{t("seller.onboarding.mapLocation")}</AppText>
      <AppText variant="caption" tone="muted">{t("seller.onboarding.mapHint")}</AppText>
      {value ? (
        <View style={{ height: 170, borderRadius: theme.radii.md, overflow: "hidden" }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: value.latitude, longitude: value.longitude,
              latitudeDelta: 0.01, longitudeDelta: 0.01
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            accessibilityLabel={t("seller.onboarding.mapLocation")}
          >
            <Marker coordinate={value} />
          </MapView>
        </View>
      ) : null}
      <Button variant="secondary" onPress={() => { setDraft(value); setVisible(true); }}>
        {t(value ? "seller.onboarding.changeMapPin" : "seller.onboarding.selectMapPin")}
      </Button>
      {value ? (
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="caption">{display(value)}</AppText>
          <Button variant="ghost" onPress={() => { void openMap(value); }}>
            {t("seller.onboarding.openGoogleMaps")}
          </Button>
          <Button variant="ghost" onPress={() => onChange(null)}>
            {t("seller.onboarding.removeMapPin")}
          </Button>
        </View>
      ) : null}
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: theme.spacing.sm
          }}>
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <AppText variant="heading">{t("seller.onboarding.mapLocation")}</AppText>
              <AppText variant="caption" tone="muted">{t("seller.onboarding.tapToPin")}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("seller.onboarding.selectClose")}
              onPress={() => setVisible(false)}
              style={{ padding: theme.spacing.md, minWidth: 48, minHeight: 48 }}
            >
              <Ionicons name="close" size={23} color={theme.colors.text} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <MapView
              key={province}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: center.latitude,
                longitude: center.longitude,
                latitudeDelta: 0.10,
                longitudeDelta: 0.10
              }}
              onPress={choose}
              showsCompass
              toolbarEnabled={false}
            >
              {draft ? <Marker coordinate={draft} draggable onDragEnd={event => { const point = event.nativeEvent.coordinate; if (validMapPin(point)) setDraft(point); }} /> : null}
            </MapView>
          </View>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <AppText variant="caption" tone="muted">
              {draft ? display(draft) : t("seller.onboarding.noPinYet")}
            </AppText>
            <Button
              fullWidth
              disabled={!draft || !validMapPin(draft)}
              onPress={() => {
                if (draft && validMapPin(draft)) {
                  onChange(draft);
                  setVisible(false);
                }
              }}
            >
              {t("seller.onboarding.confirmMapPin")}
            </Button>
            <Button variant="secondary" onPress={() => setVisible(false)}>
              {t("support.hub.cancel")}
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export function StoreMapPreview({ coordinates }: { coordinates: StoreCoordinates }) {
  const theme = useAppTheme();
  const { t } = useLocalization();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="heading">{t("seller.onboarding.mapLocation")}</AppText>
      <View style={{ height: 190, overflow: "hidden", borderRadius: theme.radii.md }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            ...coordinates, latitudeDelta: 0.012, longitudeDelta: 0.012
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker coordinate={coordinates} />
        </MapView>
      </View>
      <Button
        variant="secondary"
        onPress={() => {
          const url = googleMapsPlaceUrl(coordinates.latitude, coordinates.longitude);
          if (url) void Linking.openURL(url).catch(() => undefined);
        }}
      >
        {t("seller.onboarding.openGoogleMaps")}
      </Button>
    </View>
  );
}
