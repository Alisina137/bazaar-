import type {
  CreateCustomerAddressInput,
  CustomerAddressRecord
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import {
  useFocusEffect,
  useRouter
} from "expo-router";
import {
  useCallback,
  useState
} from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  CartPricingApiError,
  createCustomerAddress,
  deleteCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress
} from "@/cart-pricing/api";
import { cartPricingErrorKey } from "@/cart-pricing/messages";
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

interface AddressFormState {
  label: string;
  recipientName: string;
  country: string;
  province: string;
  districtCity: string;
  areaNeighborhood: string;
  addressDescription: string;
  nearestLandmark: string;
  phone: string;
  mapLatitude: string;
  mapLongitude: string;
  deliveryInstructions: string;
  isDefault: boolean;
}

const emptyForm: AddressFormState = {
  label: "",
  recipientName: "",
  country: "Afghanistan",
  province: "",
  districtCity: "",
  areaNeighborhood: "",
  addressDescription: "",
  nearestLandmark: "",
  phone: "",
  mapLatitude: "",
  mapLongitude: "",
  deliveryInstructions: "",
  isDefault: false
};

function fromAddress(address: CustomerAddressRecord): AddressFormState {
  return {
    label: address.label ?? "",
    recipientName: address.recipientName,
    country: address.country,
    province: address.province,
    districtCity: address.districtCity,
    areaNeighborhood: address.areaNeighborhood ?? "",
    addressDescription: address.addressDescription,
    nearestLandmark: address.nearestLandmark ?? "",
    phone: address.phone,
    mapLatitude:
      address.mapLatitude === null ? "" : String(address.mapLatitude),
    mapLongitude:
      address.mapLongitude === null ? "" : String(address.mapLongitude),
    deliveryInstructions: address.deliveryInstructions ?? "",
    isDefault: address.isDefault
  };
}

function parseCoordinate(
  value: string
): number | null | undefined {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AddressesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { t } = useLocalization();

  const [addresses, setAddresses] = useState<CustomerAddressRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AddressFormState>(emptyForm);

  const load = useCallback(async () => {
    if (status !== "signedIn" || !sessionToken) return;

    setLoading(true);
    setErrorKey(null);

    try {
      setAddresses((await listCustomerAddresses(sessionToken)).addresses);
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, status]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (status === "loading") {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("address.loadingTitle")}
          message={t("address.loadingMessage")}
        />
      </Screen>
    );
  }

  if (status !== "signedIn" || !sessionToken) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="empty"
          title={t("address.signInTitle")}
          message={t("address.signInMessage")}
          actionLabel={t("cart.signInAction")}
          onAction={() => router.push("/(tabs)/account")}
        />
      </Screen>
    );
  }

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setErrorKey(null);
  };

  const startEdit = (address: CustomerAddressRecord) => {
    setEditingId(address.id);
    setForm(fromAddress(address));
    setFormOpen(true);
    setErrorKey(null);
  };

  const save = async () => {
    const latitude = parseCoordinate(form.mapLatitude);
    const longitude = parseCoordinate(form.mapLongitude);

    if (
      !form.recipientName.trim() ||
      !form.country.trim() ||
      !form.province.trim() ||
      !form.districtCity.trim() ||
      !form.addressDescription.trim() ||
      !form.phone.trim() ||
      latitude === undefined ||
      longitude === undefined ||
      ((latitude === null) !== (longitude === null))
    ) {
      setErrorKey("cart.error.invalidRequest");
      return;
    }

    const input: CreateCustomerAddressInput = {
      label: form.label.trim() || null,
      recipientName: form.recipientName.trim(),
      country: form.country.trim(),
      province: form.province.trim(),
      districtCity: form.districtCity.trim(),
      areaNeighborhood: form.areaNeighborhood.trim() || null,
      addressDescription: form.addressDescription.trim(),
      nearestLandmark: form.nearestLandmark.trim() || null,
      phone: form.phone.trim(),
      mapLatitude: latitude,
      mapLongitude: longitude,
      deliveryInstructions: form.deliveryInstructions.trim() || null,
      isDefault: form.isDefault
    };

    setBusy("save");
    setErrorKey(null);

    try {
      if (editingId) {
        await updateCustomerAddress(sessionToken, editingId, input);
      } else {
        await createCustomerAddress(sessionToken, input);
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  const makeDefault = async (addressId: string) => {
    setBusy(addressId);
    setErrorKey(null);

    try {
      await updateCustomerAddress(sessionToken, addressId, {
        isDefault: true
      });
      await load();
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (addressId: string) => {
    setBusy(addressId);
    setErrorKey(null);

    try {
      await deleteCustomerAddress(sessionToken, addressId);
      await load();
    } catch (error) {
      const safe =
        error instanceof CartPricingApiError
          ? error
          : new CartPricingApiError("service_unavailable");
      setErrorKey(cartPricingErrorKey(safe.code));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: theme.spacing.sm
        }}
      >
        <Button variant="ghost" onPress={() => router.back()}>
          {t("marketplace.back")}
        </Button>
        <Button variant="secondary" onPress={startCreate}>
          {t("address.add")}
        </Button>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Badge label={t("address.phaseBadge")} tone="primary" />
        <AppText variant="display">{t("address.title")}</AppText>
        <AppText tone="muted">{t("address.description")}</AppText>
      </View>

      {errorKey ? (
        <Card>
          <AppText tone="danger">{t(errorKey)}</AppText>
        </Card>
      ) : null}

      {formOpen ? (
        <Card>
          <View style={{ gap: theme.spacing.lg }}>
            <AppText variant="title">
              {editingId ? t("address.edit") : t("address.add")}
            </AppText>
            <TextField
              label={t("address.label")}
              value={form.label}
              onChangeText={(label) => setForm((value) => ({ ...value, label }))}
            />
            <TextField
              label={t("address.recipient")}
              value={form.recipientName}
              onChangeText={(recipientName) =>
                setForm((value) => ({ ...value, recipientName }))
              }
            />
            <TextField
              label={t("address.country")}
              value={form.country}
              onChangeText={(country) =>
                setForm((value) => ({ ...value, country }))
              }
            />
            <TextField
              label={t("address.province")}
              value={form.province}
              onChangeText={(province) =>
                setForm((value) => ({ ...value, province }))
              }
            />
            <TextField
              label={t("address.districtCity")}
              value={form.districtCity}
              onChangeText={(districtCity) =>
                setForm((value) => ({ ...value, districtCity }))
              }
            />
            <TextField
              label={t("address.area")}
              value={form.areaNeighborhood}
              onChangeText={(areaNeighborhood) =>
                setForm((value) => ({ ...value, areaNeighborhood }))
              }
            />
            <TextField
              label={t("address.descriptionField")}
              value={form.addressDescription}
              onChangeText={(addressDescription) =>
                setForm((value) => ({ ...value, addressDescription }))
              }
              multiline
            />
            <TextField
              label={t("address.landmark")}
              value={form.nearestLandmark}
              onChangeText={(nearestLandmark) =>
                setForm((value) => ({ ...value, nearestLandmark }))
              }
            />
            <TextField
              label={t("address.phone")}
              value={form.phone}
              onChangeText={(phone) =>
                setForm((value) => ({ ...value, phone }))
              }
              keyboardType="phone-pad"
            />
            <TextField
              label={t("address.latitude")}
              helperText={t("address.mapHint")}
              value={form.mapLatitude}
              onChangeText={(mapLatitude) =>
                setForm((value) => ({ ...value, mapLatitude }))
              }
              keyboardType="decimal-pad"
            />
            <TextField
              label={t("address.longitude")}
              value={form.mapLongitude}
              onChangeText={(mapLongitude) =>
                setForm((value) => ({ ...value, mapLongitude }))
              }
              keyboardType="decimal-pad"
            />
            <TextField
              label={t("address.instructions")}
              value={form.deliveryInstructions}
              onChangeText={(deliveryInstructions) =>
                setForm((value) => ({ ...value, deliveryInstructions }))
              }
              multiline
            />
            <Button
              variant={form.isDefault ? "primary" : "secondary"}
              onPress={() =>
                setForm((value) => ({
                  ...value,
                  isDefault: !value.isDefault
                }))
              }
            >
              {t("address.default")}
            </Button>
            <Button
              fullWidth
              loading={busy === "save"}
              onPress={() => {
                void save();
              }}
            >
              {t("address.save")}
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                setFormOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              {t("catalog.action.cancel")}
            </Button>
          </View>
        </Card>
      ) : null}

      {loading && addresses.length === 0 ? (
        <StateView
          kind="loading"
          title={t("address.loadingTitle")}
          message={t("address.loadingMessage")}
        />
      ) : addresses.length === 0 && !formOpen ? (
        <StateView
          kind="empty"
          title={t("address.emptyTitle")}
          message={t("address.emptyMessage")}
          actionLabel={t("address.add")}
          onAction={startCreate}
        />
      ) : (
        addresses.map((address) => (
          <Card key={address.id}>
            <View style={{ gap: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.sm
                }}
              >
                <AppText variant="title">
                  {address.label ?? address.recipientName}
                </AppText>
                {address.isDefault ? (
                  <Badge label={t("address.defaultBadge")} tone="success" />
                ) : null}
              </View>
              <AppText>
                {address.recipientName} · {address.phone}
              </AppText>
              <AppText tone="muted">
                {address.province} · {address.districtCity}
                {address.areaNeighborhood
                  ? " · " + address.areaNeighborhood
                  : ""}
              </AppText>
              <AppText tone="muted">
                {address.addressDescription}
              </AppText>
              {address.nearestLandmark ? (
                <AppText variant="caption" tone="muted">
                  {t("address.landmark")}: {address.nearestLandmark}
                </AppText>
              ) : null}
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
                  onPress={() => startEdit(address)}
                >
                  {t("address.edit")}
                </Button>
                {!address.isDefault ? (
                  <Button
                    variant="ghost"
                    loading={busy === address.id}
                    disabled={busy !== null}
                    onPress={() => {
                      void makeDefault(address.id);
                    }}
                  >
                    {t("address.makeDefault")}
                  </Button>
                ) : null}
                <Button
                  variant="danger"
                  loading={busy === address.id}
                  disabled={busy !== null}
                  onPress={() => {
                    void remove(address.id);
                  }}
                >
                  {t("address.delete")}
                </Button>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
