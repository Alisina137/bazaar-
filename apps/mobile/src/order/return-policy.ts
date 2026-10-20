import type { OrderState, SupportTicketRecord } from "@bazaarlink/contracts";

// A request is a support case, not an approved return or a refund operation.
export const RETURN_REVIEW_PREFIX = "Return/refund review: ";

export function canOpenReturnReview(state: OrderState): boolean {
  return state === "delivered" || state === "picked_up" || state === "delivery_failed";
}

export function relatedReturnCases(
  tickets: SupportTicketRecord[],
  orderId: string
): SupportTicketRecord[] {
  return tickets
    .filter(ticket => ticket.orderId === orderId &&
      ticket.subject.startsWith(RETURN_REVIEW_PREFIX))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function openReturnCase(
  tickets: SupportTicketRecord[],
  orderId: string
): SupportTicketRecord | undefined {
  return relatedReturnCases(tickets, orderId)
    .find(ticket => ticket.status !== "closed");
}
