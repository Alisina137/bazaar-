import { FoundationScreen } from "@/components/foundation/FoundationScreen";

export default function CartScreen() {
  return (
    <FoundationScreen
      title="Cart"
      description="The cart shell is present without implementing checkout ahead of schedule."
      statusTitle="Your cart is empty"
      statusMessage="Cart and merchant grouping logic will be added in the approved cart and pricing phase."
    />
  );
}
