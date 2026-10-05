import type {
  DeliveryDistanceRuleType,
  DeliverySpeedKind,
  DeliverySurchargeType,
  StoreDeliveryConfigurationResponse
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  createDeliveryDistanceRule,
  createDeliverySpeed,
  createDeliveryZone,
  deleteDeliveryDistanceRule,
  deleteDeliverySpeed,
  deleteDeliveryZone,
  DeliveryApiError,
  getDeliveryConfiguration,
  updateDeliverySettings,
  updateDeliverySpeed,
  updateDeliveryZone
} from "@/delivery/api";
import { deliveryErrorKey } from "@/delivery/messages";
import {
  AppText,
  Badge,
  Button,
  Card,
  Screen,
  StateView,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { useStores } from "@/store/provider";

const weekdayKeys: TranslationKey[] = [
  "delivery.weekday.sun",
  "delivery.weekday.mon",
  "delivery.weekday.tue",
  "delivery.weekday.wed",
  "delivery.weekday.thu",
  "delivery.weekday.fri",
  "delivery.weekday.sat"
];

function optionalNumber(value: string): number | null | undefined {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function requiredNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function integerValue(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function toggleDay(days: number[], day: number) {
  return days.includes(day)
    ? days.filter((value) => value !== day)
    : [...days, day].sort((a, b) => a - b);
}

export default function SellerDeliveryScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status: authStatus, sessionToken } = useAuth();
  const { currentStore } = useStores();
  const { formatAfn, formatNumber, t } = useLocalization();

  const [config, setConfig] =
    useState<StoreDeliveryConfigurationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [originAddress, setOriginAddress] = useState("");
  const [originProvince, setOriginProvince] = useState("");
  const [originDistrict, setOriginDistrict] = useState("");
  const [originArea, setOriginArea] = useState("");
  const [originLatitude, setOriginLatitude] = useState("");
  const [originLongitude, setOriginLongitude] = useState("");
  const [defaultFee, setDefaultFee] = useState("");
  const [freeThreshold, setFreeThreshold] = useState("");
  const [minimumOrder, setMinimumOrder] = useState("");
  const [operatingWeekdays, setOperatingWeekdays] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6
  ]);
  const [cutoffTime, setCutoffTime] = useState("");
  const [pickupMin, setPickupMin] = useState("30");
  const [pickupMax, setPickupMax] = useState("120");

  const [zoneName, setZoneName] = useState("");
  const [zoneProvince, setZoneProvince] = useState("");
  const [zoneDistrict, setZoneDistrict] = useState("");
  const [zoneArea, setZoneArea] = useState("");
  const [zoneFee, setZoneFee] = useState("");
  const [zonePriority, setZonePriority] = useState("0");

  const [distanceName, setDistanceName] = useState("");
  const [distanceType, setDistanceType] =
    useState<DeliveryDistanceRuleType>("tier");
  const [distanceMin, setDistanceMin] = useState("0");
  const [distanceMax, setDistanceMax] = useState("");
  const [distanceFee, setDistanceFee] = useState("");
  const [distanceBaseFee, setDistanceBaseFee] = useState("");
  const [distancePerKm, setDistancePerKm] = useState("");
  const [distancePriority, setDistancePriority] = useState("0");

  const [speedName, setSpeedName] = useState("");
  const [speedKind, setSpeedKind] =
    useState<DeliverySpeedKind>("standard");
  const [surchargeType, setSurchargeType] =
    useState<DeliverySurchargeType>("fixed");
  const [surchargeValue, setSurchargeValue] = useState("0");
  const [speedMinEta, setSpeedMinEta] = useState("1440");
  const [speedMaxEta, setSpeedMaxEta] = useState("2880");
  const [speedMinimumOrder, setSpeedMinimumOrder] = useState("");
  const [speedMaxRange, setSpeedMaxRange] = useState("");
  const [speedCutoff, setSpeedCutoff] = useState("");
  const [speedWeekdays, setSpeedWeekdays] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6
  ]);
  const [speedMaxWeight, setSpeedMaxWeight] = useState("");
  const [speedSort, setSpeedSort] = useState("0");

  const advanced = config?.entitlements.advancedDelivery ?? false;

  const load = async () => {
    if (
      authStatus !== "signedIn" ||
      !sessionToken ||
      !currentStore
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorKey(null);

    try {
      const response = await getDeliveryConfiguration(
        sessionToken,
        currentStore.id
      );
      setConfig(response);
      setDeliveryEnabled(response.settings.deliveryEnabled);
      setPickupEnabled(response.settings.pickupEnabled);
      setOriginAddress(response.settings.originAddress ?? "");
      setOriginProvince(response.settings.originProvince ?? "");
      setOriginDistrict(response.settings.originDistrict ?? "");
      setOriginArea(response.settings.originArea ?? "");
      setOriginLatitude(
        response.settings.originLatitude === null
          ? ""
          : String(response.settings.originLatitude)
      );
      setOriginLongitude(
        response.settings.originLongitude === null
          ? ""
          : String(response.settings.originLongitude)
      );
      setDefaultFee(
        response.settings.defaultDeliveryFee === null
          ? ""
          : String(response.settings.defaultDeliveryFee)
      );
      setFreeThreshold(
        response.settings.freeDeliveryThreshold === null
          ? ""
          : String(response.settings.freeDeliveryThreshold)
      );
      setMinimumOrder(
        response.settings.minimumOrderAmount === null
          ? ""
          : String(response.settings.minimumOrderAmount)
      );
      setOperatingWeekdays(response.settings.operatingWeekdays);
      setCutoffTime(response.settings.cutoffTime ?? "");
      setPickupMin(String(response.settings.pickupMinMinutes));
      setPickupMax(String(response.settings.pickupMaxMinutes));
    } catch (error) {
      const safe =
        error instanceof DeliveryApiError
          ? error
          : new DeliveryApiError("service_unavailable");
      setErrorKey(deliveryErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [authStatus, sessionToken, currentStore?.id]);

  const updateConfig = (next: StoreDeliveryConfigurationResponse) => {
    setConfig(next);
  };

  const run = async (
    key: string,
    action: () => Promise<StoreDeliveryConfigurationResponse>
  ) => {
    setBusy(key);
    setErrorKey(null);

    try {
      updateConfig(await action());
    } catch (error) {
      const safe =
        error instanceof DeliveryApiError
          ? error
          : new DeliveryApiError("service_unavailable");
      setErrorKey(deliveryErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async () => {
    if (!sessionToken || !currentStore) return;

    const lat = optionalNumber(originLatitude);
    const lon = optionalNumber(originLongitude);
    const fee = optionalNumber(defaultFee);
    const threshold = optionalNumber(freeThreshold);
    const minOrder = optionalNumber(minimumOrder);
    const pickupMinimum = integerValue(pickupMin);
    const pickupMaximum = integerValue(pickupMax);

    if (
      lat === undefined ||
      lon === undefined ||
      fee === undefined ||
      threshold === undefined ||
      minOrder === undefined ||
      pickupMinimum === undefined ||
      pickupMaximum === undefined ||
      pickupMaximum < pickupMinimum ||
      operatingWeekdays.length === 0 ||
      ((lat === null) !== (lon === null))
    ) {
      setErrorKey("delivery.error.invalidRequest");
      return;
    }

    await run("settings", () =>
      updateDeliverySettings(sessionToken, currentStore.id, {
        deliveryEnabled,
        pickupEnabled,
        originAddress: originAddress.trim() || null,
        originProvince: originProvince.trim() || null,
        originDistrict: originDistrict.trim() || null,
        originArea: originArea.trim() || null,
        originLatitude: lat,
        originLongitude: lon,
        defaultDeliveryFee: fee,
        freeDeliveryThreshold: threshold,
        minimumOrderAmount: minOrder,
        operatingWeekdays,
        cutoffTime: cutoffTime.trim() || null,
        pickupMinMinutes: pickupMinimum,
        pickupMaxMinutes: pickupMaximum
      })
    );
  };

  const addZone = async () => {
    if (!sessionToken || !currentStore) return;
    const fee = requiredNumber(zoneFee);
    const priority = Number(zonePriority);

    if (
      !zoneName.trim() ||
      fee === undefined ||
      !Number.isInteger(priority) ||
      !(
        zoneProvince.trim() ||
        zoneDistrict.trim() ||
        zoneArea.trim()
      )
    ) {
      setErrorKey("delivery.error.invalidRequest");
      return;
    }

    await run("zone-create", () =>
      createDeliveryZone(sessionToken, currentStore.id, {
        name: zoneName.trim(),
        province: zoneProvince.trim() || null,
        districtCity: zoneDistrict.trim() || null,
        areaNeighborhood: zoneArea.trim() || null,
        fee,
        priority
      })
    );

    setZoneName("");
    setZoneProvince("");
    setZoneDistrict("");
    setZoneArea("");
    setZoneFee("");
    setZonePriority("0");
  };

  const addDistanceRule = async () => {
    if (!sessionToken || !currentStore) return;

    const min = requiredNumber(distanceMin);
    const max = optionalNumber(distanceMax);
    const fee = optionalNumber(distanceFee);
    const baseFee = optionalNumber(distanceBaseFee);
    const perKm = optionalNumber(distancePerKm);
    const priority = Number(distancePriority);

    if (
      !distanceName.trim() ||
      min === undefined ||
      max === undefined ||
      fee === undefined ||
      baseFee === undefined ||
      perKm === undefined ||
      !Number.isInteger(priority) ||
      (max !== null && max <= min) ||
      (distanceType === "tier" && fee === null) ||
      (distanceType === "base_per_km" &&
        (baseFee === null || perKm === null))
    ) {
      setErrorKey("delivery.error.invalidRequest");
      return;
    }

    await run("distance-create", () =>
      createDeliveryDistanceRule(sessionToken, currentStore.id, {
        name: distanceName.trim(),
        type: distanceType,
        minDistanceKm: min,
        maxDistanceKm: max,
        fee: distanceType === "tier" ? fee : null,
        baseFee: distanceType === "base_per_km" ? baseFee : null,
        perKmFee: distanceType === "base_per_km" ? perKm : null,
        priority
      })
    );

    setDistanceName("");
    setDistanceMin("0");
    setDistanceMax("");
    setDistanceFee("");
    setDistanceBaseFee("");
    setDistancePerKm("");
    setDistancePriority("0");
  };

  const addSpeed = async () => {
    if (!sessionToken || !currentStore) return;

    const surcharge = requiredNumber(surchargeValue);
    const minEta = integerValue(speedMinEta);
    const maxEta = integerValue(speedMaxEta);
    const minOrder = optionalNumber(speedMinimumOrder);
    const maxRange = optionalNumber(speedMaxRange);
    const maxWeight = optionalNumber(speedMaxWeight);
    const sortOrder = Number(speedSort);

    if (
      !speedName.trim() ||
      surcharge === undefined ||
      minEta === undefined ||
      maxEta === undefined ||
      maxEta < minEta ||
      minOrder === undefined ||
      maxRange === undefined ||
      maxWeight === undefined ||
      !Number.isInteger(sortOrder) ||
      speedWeekdays.length === 0 ||
      (surchargeType === "multiplier" && surcharge < 1)
    ) {
      setErrorKey("delivery.error.invalidRequest");
      return;
    }

    await run("speed-create", () =>
      createDeliverySpeed(sessionToken, currentStore.id, {
        name: speedName.trim(),
        kind: speedKind,
        surchargeType,
        surchargeValue: surcharge,
        minEtaMinutes: minEta,
        maxEtaMinutes: maxEta,
        minimumOrderAmount: minOrder,
        maxRangeKm: advanced ? maxRange : null,
        cutoffTime: speedCutoff.trim() || null,
        supportedWeekdays: speedWeekdays,
        maxWeightGrams:
          advanced && maxWeight !== null
            ? Math.round(maxWeight)
            : null,
        sortOrder
      })
    );

    setSpeedName("");
    setSurchargeValue(surchargeType === "multiplier" ? "1" : "0");
    setSpeedMinimumOrder("");
    setSpeedMaxRange("");
    setSpeedMaxWeight("");
    setSpeedSort("0");
  };

  const currentFulfillmentCount = useMemo(() => {
    if (!config) return 0;
    return (
      (config.settings.deliveryEnabled ? 1 : 0) +
      (config.settings.pickupEnabled ? 1 : 0)
    );
  }, [config]);

  if (loading && !config) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("delivery.seller.loadingTitle")}
          message={t("delivery.seller.loadingMessage")}
        />
      </Screen>
    );
  }

  if (!currentStore || !sessionToken) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("delivery.seller.errorTitle")}
          message={t("delivery.error.storeNotFound")}
        />
      </Screen>
    );
  }

  if (!config) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="error"
          title={t("delivery.seller.errorTitle")}
          message={
            errorKey
              ? t(errorKey)
              : t("delivery.error.serviceUnavailable")
          }
          actionLabel={t("delivery.retry")}
          onAction={() => {
            void load();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>

      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("delivery.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("delivery.seller.title")}</AppText>
        <AppText tone="muted">{t("delivery.seller.description")}</AppText>
        <AppText variant="caption" tone="muted">
          {t("delivery.seller.fulfillmentCount")}:{" "}
          {formatNumber(currentFulfillmentCount)}
        </AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="title">{t("delivery.settings.title")}</AppText>
          <Button
            variant={deliveryEnabled ? "primary" : "secondary"}
            onPress={() => setDeliveryEnabled((value) => !value)}
          >
            {deliveryEnabled
              ? t("delivery.settings.deliveryOn")
              : t("delivery.settings.deliveryOff")}
          </Button>
          <Button
            variant={pickupEnabled ? "primary" : "secondary"}
            onPress={() => setPickupEnabled((value) => !value)}
          >
            {pickupEnabled
              ? t("delivery.settings.pickupOn")
              : t("delivery.settings.pickupOff")}
          </Button>

          <TextField
            label={t("delivery.settings.originAddress")}
            value={originAddress}
            onChangeText={setOriginAddress}
            multiline
          />
          <TextField
            label={t("delivery.settings.originProvince")}
            value={originProvince}
            onChangeText={setOriginProvince}
          />
          <TextField
            label={t("delivery.settings.originDistrict")}
            value={originDistrict}
            onChangeText={setOriginDistrict}
          />
          <TextField
            label={t("delivery.settings.originArea")}
            value={originArea}
            onChangeText={setOriginArea}
          />
          <TextField
            label={t("delivery.settings.originLatitude")}
            value={originLatitude}
            onChangeText={setOriginLatitude}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("delivery.settings.originLongitude")}
            value={originLongitude}
            onChangeText={setOriginLongitude}
            keyboardType="decimal-pad"
          />

          <TextField
            label={t("delivery.settings.defaultFee")}
            helperText={t("delivery.settings.defaultFeeHint")}
            value={defaultFee}
            onChangeText={setDefaultFee}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("delivery.settings.freeThreshold")}
            value={freeThreshold}
            onChangeText={setFreeThreshold}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("delivery.settings.minimumOrder")}
            value={minimumOrder}
            onChangeText={setMinimumOrder}
            keyboardType="decimal-pad"
          />

          <WeekdayPicker
            days={operatingWeekdays}
            onToggle={(day) =>
              setOperatingWeekdays((days) => toggleDay(days, day))
            }
          />

          <TextField
            label={t("delivery.settings.cutoff")}
            helperText={t("delivery.timeHint")}
            value={cutoffTime}
            onChangeText={setCutoffTime}
            autoCapitalize="none"
          />
          <TextField
            label={t("delivery.settings.pickupMin")}
            value={pickupMin}
            onChangeText={setPickupMin}
            keyboardType="number-pad"
          />
          <TextField
            label={t("delivery.settings.pickupMax")}
            value={pickupMax}
            onChangeText={setPickupMax}
            keyboardType="number-pad"
          />

          <Button
            fullWidth
            loading={busy === "settings"}
            disabled={busy !== null}
            onPress={() => {
              void saveSettings();
            }}
          >
            {t("delivery.settings.save")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="title">{t("delivery.zones.title")}</AppText>
          <AppText tone="muted">{t("delivery.zones.description")}</AppText>

          {config.zones.map((zone) => (
            <View
              key={zone.id}
              style={{
                gap: theme.spacing.sm,
                paddingBottom: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.sm
                }}
              >
                <AppText variant="heading">{zone.name}</AppText>
                <Badge
                  label={
                    zone.active
                      ? t("delivery.active")
                      : t("delivery.inactive")
                  }
                  tone={zone.active ? "success" : "warning"}
                />
              </View>
              <AppText tone="muted">
                {[zone.province, zone.districtCity, zone.areaNeighborhood]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
              <AppText>
                {t("delivery.zones.fee")}: {formatAfn(zone.fee)}
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.sm
                }}
              >
                <Button
                  variant="secondary"
                  disabled={busy !== null}
                  onPress={() => {
                    void run("zone:" + zone.id, () =>
                      updateDeliveryZone(
                        sessionToken,
                        currentStore.id,
                        zone.id,
                        { active: !zone.active }
                      )
                    );
                  }}
                >
                  {zone.active
                    ? t("delivery.deactivate")
                    : t("delivery.activate")}
                </Button>
                <Button
                  variant="danger"
                  disabled={busy !== null}
                  loading={busy === "zone:" + zone.id}
                  onPress={() => {
                    void run("zone:" + zone.id, () =>
                      deleteDeliveryZone(
                        sessionToken,
                        currentStore.id,
                        zone.id
                      )
                    );
                  }}
                >
                  {t("address.delete")}
                </Button>
              </View>
            </View>
          ))}

          <AppText variant="heading">{t("delivery.zones.add")}</AppText>
          <TextField
            label={t("delivery.zones.name")}
            value={zoneName}
            onChangeText={setZoneName}
          />
          <TextField
            label={t("address.province")}
            value={zoneProvince}
            onChangeText={setZoneProvince}
          />
          <TextField
            label={t("address.districtCity")}
            value={zoneDistrict}
            onChangeText={setZoneDistrict}
          />
          <TextField
            label={t("address.area")}
            value={zoneArea}
            onChangeText={setZoneArea}
          />
          <TextField
            label={t("delivery.zones.fee")}
            value={zoneFee}
            onChangeText={setZoneFee}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("delivery.priority")}
            helperText={t("delivery.priorityHint")}
            value={zonePriority}
            onChangeText={setZonePriority}
            keyboardType="numbers-and-punctuation"
          />
          <Button
            variant="secondary"
            loading={busy === "zone-create"}
            disabled={busy !== null}
            onPress={() => {
              void addZone();
            }}
          >
            {t("delivery.zones.add")}
          </Button>
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="title">
            {t("delivery.distance.title")}
          </AppText>
          <AppText tone="muted">
            {advanced
              ? t("delivery.distance.description")
              : t("delivery.distance.upgradeHint")}
          </AppText>

          {config.distanceRules.map((rule) => (
            <View
              key={rule.id}
              style={{
                gap: theme.spacing.sm,
                paddingBottom: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border
              }}
            >
              <AppText variant="heading">{rule.name}</AppText>
              <AppText tone="muted">
                {t(
                  rule.type === "tier"
                    ? "delivery.distance.tier"
                    : "delivery.distance.basePerKm"
                )}
                {" · "}
                {formatNumber(rule.minDistanceKm)} km
                {rule.maxDistanceKm === null
                  ? "+"
                  : " – " + formatNumber(rule.maxDistanceKm) + " km"}
              </AppText>
              <AppText>
                {rule.type === "tier"
                  ? formatAfn(rule.fee ?? 0)
                  : formatAfn(rule.baseFee ?? 0) +
                    " + " +
                    formatAfn(rule.perKmFee ?? 0) +
                    "/km"}
              </AppText>
              <Button
                variant="danger"
                disabled={busy !== null}
                loading={busy === "distance:" + rule.id}
                onPress={() => {
                  void run("distance:" + rule.id, () =>
                    deleteDeliveryDistanceRule(
                      sessionToken,
                      currentStore.id,
                      rule.id
                    )
                  );
                }}
              >
                {t("address.delete")}
              </Button>
            </View>
          ))}

          {advanced ? (
            <>
              <AppText variant="heading">
                {t("delivery.distance.add")}
              </AppText>
              <TextField
                label={t("delivery.distance.name")}
                value={distanceName}
                onChangeText={setDistanceName}
              />
              <Button
                variant={distanceType === "tier" ? "primary" : "secondary"}
                onPress={() => setDistanceType("tier")}
              >
                {t("delivery.distance.tier")}
              </Button>
              <Button
                variant={
                  distanceType === "base_per_km" ? "primary" : "secondary"
                }
                onPress={() => setDistanceType("base_per_km")}
              >
                {t("delivery.distance.basePerKm")}
              </Button>
              <TextField
                label={t("delivery.distance.min")}
                value={distanceMin}
                onChangeText={setDistanceMin}
                keyboardType="decimal-pad"
              />
              <TextField
                label={t("delivery.distance.max")}
                value={distanceMax}
                onChangeText={setDistanceMax}
                keyboardType="decimal-pad"
              />
              {distanceType === "tier" ? (
                <TextField
                  label={t("delivery.distance.fee")}
                  value={distanceFee}
                  onChangeText={setDistanceFee}
                  keyboardType="decimal-pad"
                />
              ) : (
                <>
                  <TextField
                    label={t("delivery.distance.baseFee")}
                    value={distanceBaseFee}
                    onChangeText={setDistanceBaseFee}
                    keyboardType="decimal-pad"
                  />
                  <TextField
                    label={t("delivery.distance.perKm")}
                    value={distancePerKm}
                    onChangeText={setDistancePerKm}
                    keyboardType="decimal-pad"
                  />
                </>
              )}
              <TextField
                label={t("delivery.priority")}
                value={distancePriority}
                onChangeText={setDistancePriority}
                keyboardType="numbers-and-punctuation"
              />
              <Button
                variant="secondary"
                loading={busy === "distance-create"}
                disabled={busy !== null}
                onPress={() => {
                  void addDistanceRule();
                }}
              >
                {t("delivery.distance.add")}
              </Button>
            </>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: theme.spacing.lg }}>
          <AppText variant="title">{t("delivery.speeds.title")}</AppText>
          <AppText tone="muted">{t("delivery.speeds.description")}</AppText>

          {config.speeds.map((speed) => (
            <View
              key={speed.id}
              style={{
                gap: theme.spacing.sm,
                paddingBottom: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.sm
                }}
              >
                <AppText variant="heading">{speed.name}</AppText>
                <Badge
                  label={
                    speed.active
                      ? t("delivery.active")
                      : t("delivery.inactive")
                  }
                  tone={speed.active ? "success" : "warning"}
                />
              </View>
              <AppText tone="muted">
                {t(("delivery.speed.kind." + speed.kind) as never)}
                {" · "}
                {formatNumber(speed.minEtaMinutes)}–
                {formatNumber(speed.maxEtaMinutes)} min
              </AppText>
              <AppText>
                {speed.surchargeType === "fixed"
                  ? formatAfn(speed.surchargeValue)
                  : "×" + formatNumber(speed.surchargeValue)}
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.sm
                }}
              >
                <Button
                  variant="secondary"
                  disabled={busy !== null}
                  onPress={() => {
                    void run("speed:" + speed.id, () =>
                      updateDeliverySpeed(
                        sessionToken,
                        currentStore.id,
                        speed.id,
                        { active: !speed.active }
                      )
                    );
                  }}
                >
                  {speed.active
                    ? t("delivery.deactivate")
                    : t("delivery.activate")}
                </Button>
                <Button
                  variant="danger"
                  disabled={busy !== null}
                  loading={busy === "speed:" + speed.id}
                  onPress={() => {
                    void run("speed:" + speed.id, () =>
                      deleteDeliverySpeed(
                        sessionToken,
                        currentStore.id,
                        speed.id
                      )
                    );
                  }}
                >
                  {t("address.delete")}
                </Button>
              </View>
            </View>
          ))}

          <AppText variant="heading">{t("delivery.speeds.add")}</AppText>
          <TextField
            label={t("delivery.speeds.name")}
            value={speedName}
            onChangeText={setSpeedName}
          />
          <View style={{ gap: theme.spacing.sm }}>
            {(
              [
                "economy",
                "standard",
                "same_day",
                "express",
                "custom"
              ] as DeliverySpeedKind[]
            ).map((kind) => (
              <Button
                key={kind}
                variant={speedKind === kind ? "primary" : "secondary"}
                onPress={() => setSpeedKind(kind)}
              >
                {t(("delivery.speed.kind." + kind) as never)}
              </Button>
            ))}
          </View>

          {advanced ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                variant={
                  surchargeType === "fixed" ? "primary" : "secondary"
                }
                onPress={() => {
                  setSurchargeType("fixed");
                  setSurchargeValue("0");
                }}
              >
                {t("delivery.surcharge.fixed")}
              </Button>
              <Button
                variant={
                  surchargeType === "multiplier" ? "primary" : "secondary"
                }
                onPress={() => {
                  setSurchargeType("multiplier");
                  setSurchargeValue("1");
                }}
              >
                {t("delivery.surcharge.multiplier")}
              </Button>
            </View>
          ) : null}

          <TextField
            label={
              surchargeType === "fixed"
                ? t("delivery.speeds.surcharge")
                : t("delivery.speeds.multiplier")
            }
            value={surchargeValue}
            onChangeText={setSurchargeValue}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t("delivery.speeds.minEta")}
            value={speedMinEta}
            onChangeText={setSpeedMinEta}
            keyboardType="number-pad"
          />
          <TextField
            label={t("delivery.speeds.maxEta")}
            value={speedMaxEta}
            onChangeText={setSpeedMaxEta}
            keyboardType="number-pad"
          />
          <TextField
            label={t("delivery.speeds.minimumOrder")}
            value={speedMinimumOrder}
            onChangeText={setSpeedMinimumOrder}
            keyboardType="decimal-pad"
          />
          {advanced ? (
            <>
              <TextField
                label={t("delivery.speeds.maxRange")}
                value={speedMaxRange}
                onChangeText={setSpeedMaxRange}
                keyboardType="decimal-pad"
              />
              <TextField
                label={t("delivery.speeds.maxWeight")}
                value={speedMaxWeight}
                onChangeText={setSpeedMaxWeight}
                keyboardType="number-pad"
              />
            </>
          ) : null}
          <TextField
            label={t("delivery.speeds.cutoff")}
            helperText={t("delivery.timeHint")}
            value={speedCutoff}
            onChangeText={setSpeedCutoff}
          />
          <WeekdayPicker
            days={speedWeekdays}
            onToggle={(day) =>
              setSpeedWeekdays((days) => toggleDay(days, day))
            }
          />
          <TextField
            label={t("delivery.speeds.sort")}
            value={speedSort}
            onChangeText={setSpeedSort}
            keyboardType="numbers-and-punctuation"
          />
          <Button
            variant="secondary"
            loading={busy === "speed-create"}
            disabled={busy !== null}
            onPress={() => {
              void addSpeed();
            }}
          >
            {t("delivery.speeds.add")}
          </Button>
        </View>
      </Card>

      <Card muted>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">{t("delivery.rulePriority.title")}</AppText>
          <AppText tone="muted">
            {t("delivery.rulePriority.description")}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t("delivery.distanceFallback")}
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

function WeekdayPicker({
  days,
  onToggle
}: {
  days: number[];
  onToggle: (day: number) => void;
}) {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="label">{t("delivery.weekdays")}</AppText>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.sm
        }}
      >
        {weekdayKeys.map((key, day) => (
          <Button
            key={key}
            variant={days.includes(day) ? "primary" : "secondary"}
            onPress={() => onToggle(day)}
          >
            {t(key)}
          </Button>
        ))}
      </View>
    </View>
  );
}
