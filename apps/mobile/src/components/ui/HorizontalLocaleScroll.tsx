import { useEffect, useRef, type PropsWithChildren } from "react";
import {
  ScrollView,
  type ScrollViewProps
} from "react-native";

import { useLocalization } from "@/localization/provider";

/**
 * Starts a horizontal rail at the leading edge of the active language.
 * A row-reverse style alone would leave an overflowing RTL rail scrolled
 * to its last item on Android; scrollToEnd places item one at the right.
 * This avoids the device-wide forceRTL/restart required by I18nManager.
 */
export function HorizontalLocaleScroll({
  children,
  contentContainerStyle,
  onContentSizeChange,
  onLayout,
  ...props
}: PropsWithChildren<Omit<ScrollViewProps, "horizontal">>) {
  const { isRTL } = useLocalization();
  const scrollRef = useRef<ScrollView>(null);
  const positioned = useRef(false);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);

  useEffect(() => {
    positioned.current = false;
    viewportWidth.current = 0;
    contentWidth.current = 0;
  }, [isRTL]);

  const positionAtStart = () => {
    if (!isRTL || positioned.current ||
        viewportWidth.current <= 0 || contentWidth.current <= 0) return;
    positioned.current = true;
    scrollRef.current?.scrollToEnd({ animated: false });
  };

  return (
    <ScrollView
      key={isRTL ? "rtl" : "ltr"}
      {...props}
      ref={scrollRef}
      horizontal
      onLayout={(event) => {
        viewportWidth.current = event.nativeEvent.layout.width;
        positionAtStart();
        onLayout?.(event);
      }}
      onContentSizeChange={(width, height) => {
        contentWidth.current = width;
        positionAtStart();
        onContentSizeChange?.(width, height);
      }}
      contentContainerStyle={[
        { flexGrow: 1, flexDirection: isRTL ? "row-reverse" : "row" },
        contentContainerStyle
      ]}
    >
      {children}
    </ScrollView>
  );
}
