import { FoundationScreen } from "@/components/foundation/FoundationScreen";

export default function OrdersScreen() {
  return (
    <FoundationScreen
      title="Orders"
      description="The orders shell establishes navigation without introducing order behavior early."
      statusTitle="No orders yet"
      statusMessage="Order creation, fulfillment, and tracking will arrive in the approved order phases."
    />
  );
}
