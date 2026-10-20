import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { useAppTheme } from "@/design/theme";
import { useLocalization } from "@/localization/provider";

const CLOCK_TIMES = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2).toString().padStart(2, "0");
  const minute = index % 2 ? "30" : "00";
  return hour + ":" + minute;
});
const timeOptions = CLOCK_TIMES.map(value => ({ value, label: value }));
const timeRangePattern = /^([01]\d|2[0-3]):(?:00|30) - ([01]\d|2[0-3]):(?:00|30)$/;

export function isValidBusinessHours(value: string): boolean {
  return value === "" || timeRangePattern.test(value);
}

export function BusinessHoursRange({
  value, onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useAppTheme();
  const { t, isRTL } = useLocalization();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  useEffect(() => {
    const match = timeRangePattern.exec(value);
    setStart(match ? value.slice(0, 5) : "");
    setEnd(match ? value.slice(8, 13) : "");
  }, [value]);

  const update = (nextStart: string, nextEnd: string) => {
    setStart(nextStart);
    setEnd(nextEnd);
    onChange(nextStart && nextEnd ? nextStart + " - " + nextEnd : "");
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="label">{t("seller.onboarding.businessHours")}</AppText>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label={t("seller.onboarding.openAt")}
            value={start}
            placeholder={t("seller.onboarding.selectTime")}
            options={timeOptions}
            onChange={time => update(time, end)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField
            label={t("seller.onboarding.closeAt")}
            value={end}
            placeholder={t("seller.onboarding.selectTime")}
            options={timeOptions}
            onChange={time => update(start, time)}
          />
        </View>
      </View>
      <AppText variant="caption" tone="muted">
        {t("seller.onboarding.hoursHint")}
      </AppText>
      {value && !timeRangePattern.test(value) ? (
        <AppText variant="caption" tone="muted">{value}</AppText>
      ) : null}
      <Button variant="ghost" onPress={() => update("", "")}>
        {t("seller.onboarding.clearHours")}
      </Button>
    </View>
  );
}
