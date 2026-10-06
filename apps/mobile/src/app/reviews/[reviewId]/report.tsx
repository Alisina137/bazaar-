import type {
  ReviewReportReason
} from "@bazaarlink/contracts";
import type { TranslationKey } from "@bazaarlink/localization";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useAuth } from "@/auth/provider";
import {
  AppText,
  Button,
  Card,
  Screen,
  TextField
} from "@/components/ui";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";
import {
  reportReview,
  TrustApiError
} from "@/trust/api";
import { trustErrorKey } from "@/trust/messages";

const reasons: Array<[ReviewReportReason, TranslationKey]> = [
  ["spam", "review.reason.spam"],
  ["abuse", "review.reason.abuse"],
  ["misleading", "review.reason.misleading"],
  ["inappropriate", "review.reason.inappropriate"],
  ["other", "review.reason.other"]
];

export default function ReportReviewScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { sessionToken } = useAuth();
  const { t } = useLocalization();

  const [reason, setReason] = useState<ReviewReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const submit = async () => {
    if (!sessionToken || !reviewId) return;
    setBusy(true);
    setError(null);
    try {
      await reportReview(sessionToken, reviewId, {
        reason,
        details: details.trim() || null
      });
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

  return (
    <Screen>
      <Button variant="ghost" onPress={() => router.back()}>
        {t("marketplace.back")}
      </Button>
      <AppText variant="display">{t("review.reportTitle")}</AppText>

      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="label">{t("review.reportReason")}</AppText>
          {reasons.map(([value, key]) => (
            <Button
              key={value}
              variant={reason === value ? "primary" : "secondary"}
              onPress={() => setReason(value)}
            >
              {t(key)}
            </Button>
          ))}

          <TextField
            label={t("review.reportDetails")}
            value={details}
            onChangeText={setDetails}
            multiline
          />
          {error ? <AppText tone="danger">{t(error)}</AppText> : null}
          <Button
            fullWidth
            loading={busy}
            disabled={busy}
            onPress={() => void submit()}
          >
            {t("review.reportSubmit")}
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
