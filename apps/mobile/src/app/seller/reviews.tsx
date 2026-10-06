import type { ProductReviewRecord } from "@bazaarlink/contracts";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  AppText,
  Badge,
  Card,
  Screen,
  StateView
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import { sellerReviews, TrustApiError } from "@/trust/api";
import { trustErrorKey } from "@/trust/messages";
import { useStores } from "@/store/provider";

export default function SellerReviewsScreen() {
  const theme = useAppTheme();
  const { sessionToken } = useAuth();
  const { currentStore } = useStores();
  const { t } = useLocalization();
  const [reviews, setReviews] = useState<ProductReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReturnType<typeof trustErrorKey> | null>(null);

  useEffect(() => {
    if (!sessionToken || !currentStore) {
      setLoading(false);
      return;
    }
    let active = true;
    void sellerReviews(sessionToken, currentStore.id)
      .then((result) => {
        if (active) setReviews(result.reviews);
      })
      .catch((requestError) => {
        if (!active) return;
        const safe =
          requestError instanceof TrustApiError
            ? requestError
            : new TrustApiError("service_unavailable");
        setError(trustErrorKey(safe.code));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentStore, sessionToken]);

  if (loading) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("review.sellerTitle")}
          message={t("review.summary")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">{t("review.sellerTitle")}</AppText>
      {error ? <AppText tone="danger">{t(error)}</AppText> : null}
      {reviews.length === 0 ? (
        <StateView
          kind="empty"
          title={t("review.sellerTitle")}
          message={t("review.noReviews")}
        />
      ) : (
        reviews.map((review) => (
          <Card key={review.id}>
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
                <Badge label={"★ " + review.rating} tone="primary" />
                <Badge label={t("trust.verifiedPurchase")} tone="success" />
              </View>
              {review.customerDisplayName ? (
                <AppText variant="bodyStrong">{review.customerDisplayName}</AppText>
              ) : null}
              {review.text ? <AppText>{review.text}</AppText> : null}
              {review.imageUrls.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{ width: "100%", height: 180, borderRadius: theme.radii.md }}
                  resizeMode="cover"
                />
              ))}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
