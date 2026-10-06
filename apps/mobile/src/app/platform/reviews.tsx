import type {
  ModerateReviewInput,
  ReviewModerationItem
} from "@bazaarlink/contracts";
import { useCallback, useEffect, useState } from "react";
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
  moderateReview,
  moderationQueue
} from "@/trust/api";

export default function PlatformReviewModerationScreen() {
  const theme = useAppTheme();
  const { sessionToken } = useAuth();
  const { t } = useLocalization();
  const [items, setItems] = useState<ReviewModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItems((await moderationQueue(sessionToken)).items);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (
    reviewId: string,
    action: ModerateReviewInput["action"]
  ) => {
    if (!sessionToken) return;
    setBusyId(reviewId);
    try {
      await moderateReview(sessionToken, reviewId, {
        action,
        reason: reason.trim() || null
      });
      setReason("");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Screen scrollable={false}>
        <StateView
          kind="loading"
          title={t("review.moderationTitle")}
          message={t("review.summary")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="display">{t("review.moderationTitle")}</AppText>
      {items.length === 0 ? (
        <StateView
          kind="empty"
          title={t("review.moderationTitle")}
          message={t("review.moderationEmpty")}
        />
      ) : (
        items.map((item) => (
          <Card key={item.report.id}>
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
                <Badge label={"★ " + item.review.rating} tone="primary" />
                <Badge label={t("trust.verifiedPurchase")} tone="success" />
                <Badge
                  label={t(
                    ("review.reason." + item.report.reason) as
                      | "review.reason.spam"
                      | "review.reason.abuse"
                      | "review.reason.misleading"
                      | "review.reason.inappropriate"
                      | "review.reason.other"
                  )}
                  tone="warning"
                />
              </View>
              {item.review.text ? <AppText>{item.review.text}</AppText> : null}
              {item.report.details ? (
                <AppText tone="muted">{item.report.details}</AppText>
              ) : null}
              <TextField
                label={t("review.reportDetails")}
                value={reason}
                onChangeText={setReason}
                multiline
              />
              {(
                [
                  ["dismiss_reports", "review.action.dismiss"],
                  ["publish", "review.action.publish"],
                  ["hide", "review.action.hide"],
                  ["remove", "review.action.remove"]
                ] as const
              ).map(([action, key]) => (
                <Button
                  key={action}
                  variant={action === "remove" ? "danger" : "secondary"}
                  loading={busyId === item.review.id}
                  disabled={busyId !== null}
                  onPress={() => void act(item.review.id, action)}
                >
                  {t(key)}
                </Button>
              ))}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
