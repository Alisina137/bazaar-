import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { Button } from "@/components/ui";
import CartScreen from "./cart";
import OrdersScreen from "./orders";

export default function ShoppingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const selected = params.section === "orders" ? "orders" : "cart";
  const theme = useAppTheme();
  const { isRTL, t } = useLocalization();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{
        flexDirection: isRTL ? "row-reverse" : "row",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.surface
      }}>
        <View style={{ flex: 1 }}>
          <Button
            fullWidth
            variant={selected === "cart" ? "primary" : "secondary"}
            onPress={() => router.setParams({ section: "cart" })}
          >
            {t("nav.cart")}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            fullWidth
            variant={selected === "orders" ? "primary" : "secondary"}
            onPress={() => router.setParams({ section: "orders" })}
          >
            {t("nav.orders")}
          </Button>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {selected === "cart" ? <CartScreen /> : <OrdersScreen />}
      </View>
    </View>
  );
}
