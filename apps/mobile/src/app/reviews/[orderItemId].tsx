import type { TranslationKey } from "@bazaarlink/localization";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
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
import {
  createReview,
  reviewEditor,
  TrustApiError,
  updateReview
} from "@/trust/api";
import { trustErrorKey } from "@/trust/messages";

function imageUrls(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export default function ReviewEditorScreen() {
  const { orderItemId } = useLocalSearchParams<{ orderItemId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { status, sessionToken } = useAuth();
  const { t } = useLocalization();

  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [images, setImages] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    if (status !== "signedIn" || !sessionToken || !orderItemId) {
      setLoading(false);
      return;
    }

    let active = true;
    void reviewEditor(sessionToken, orderItemId)
      .then((result) => {
        if (!active) return;
        setEligible(result.eligibility.eligible);
        setProductName(result.eligibility.productName);
        if (result.review) {
          setReviewId(result.review.id);
          setRating(result.review.rating);
          setText(result.review.text ?? "");
          setImages(result.review.imageUrls.join("\n"));
        }
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
  }, [orderItemId, sessionToken, status]);

  const submit = async () => {
    if (!sessionToken || !orderItemId || !eligible) return;
    setBusy(true);
    setError(null);

    try {
      const payload = {
        rating,
        text: text.trim() || null,
        imageUrls: imageUrls(images)
      };

      if (reviewId) {
        await updateReview(sessionToken, reviewId, payload);
      } else {
        const created = await createReview(sessionToken, {
          orderItemId,
          ...payload
        });
        setReviewId(created.id);
      }
      router.back();
    } catch (requestError) {
      const safe =
        requestError instanceof TrustApiError
          ? requestError
          : new TrustApiError("service_unavailable");
      setError(trustErrorKey(safe.code));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("review.title")}
          message={t("review.completedOnly")}
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
        <Badge
          label={t("trust.verifiedPurchase")}
          tone={eligible ? "success" : "neutral"}
        />
        <AppText variant="display">
          {reviewId ? t("review.edit") : t("review.title")}
        </AppText>
        {productName ? <AppText tone="muted">{productName}</AppText> : null}
      </View>

      {!eligible ? (
        <StateView
          kind="empty"
          title={t("review.title")}
          message={t("review.completedOnly")}
        />
      ) : (
        <Card>
          <View style={{ gap: theme.spacing.md }}>
            <AppText variant="label">{t("review.rating")}</AppText>
            <View
              style={{
                flexDirection: "row",
                gap: theme.spacing.sm,
                flexWrap: "wrap"
              }}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={rating === value ? "primary" : "secondary"}
                  onPress={() => setRating(value)}
                >
                  {"★".repeat(value)}
                </Button>
              ))}
            </View>

            <TextField
              label={t("review.text")}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TextField
              label={t("review.images")}
              value={images}
              onChangeText={setImages}
              multiline
            />
            <AppText variant="caption" tone="muted">
              {t("review.imagesHint")}
            </AppText>

            {error ? <AppText tone="danger">{t(error)}</AppText> : null}

            <Button
              fullWidth
              loading={busy}
              disabled={busy}
              onPress={() => void submit()}
            >
              {reviewId ? t("review.save") : t("review.submit")}
            </Button>
          </View>
        </Card>
      )}
    </Screen>
  );
}
