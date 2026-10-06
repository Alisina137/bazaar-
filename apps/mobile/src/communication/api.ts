import type {
  CommunicationErrorCode,
  CommunicationErrorResponse,
  CreateSupportTicketInput,
  NotificationListResponse,
  RegisterPushTokenInput,
  SupportTicketListResponse,
  SupportTicketRecord,
  SupportTicketStatus
} from "@bazaarlink/contracts";

const REQUEST_TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    ""
  );
}

export class CommunicationApiError extends Error {
  constructor(public readonly code: CommunicationErrorCode) {
    super(code);
    this.name = "CommunicationApiError";
  }
}

async function requestJson<T>(
  path: string,
  token: string,
  init: RequestInit = { method: "GET" }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiBaseUrl() + path, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + token,
        ...init.headers
      }
    });

    if (!response.ok) {
      let code: CommunicationErrorCode = "service_unavailable";
      try {
        const payload =
          (await response.json()) as Partial<CommunicationErrorResponse>;
        if (payload.error?.code) code = payload.error.code;
      } catch {
        // Keep generic error.
      }
      throw new CommunicationApiError(code);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CommunicationApiError) throw error;
    throw new CommunicationApiError("service_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function notifications(token: string): Promise<NotificationListResponse> {
  return requestJson("/notifications", token);
}

export function markNotificationRead(token: string, id: string): Promise<void> {
  return requestJson(
    "/notifications/" + encodeURIComponent(id) + "/read",
    token,
    { method: "POST" }
  );
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return requestJson("/notifications/read-all", token, { method: "POST" });
}

export function registerPushToken(
  token: string,
  input: RegisterPushTokenInput
): Promise<void> {
  return requestJson(
    "/notifications/push-token",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function createSupportTicket(
  token: string,
  input: CreateSupportTicketInput
): Promise<SupportTicketRecord> {
  return requestJson(
    "/support/tickets",
    token,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function supportTickets(
  token: string
): Promise<SupportTicketListResponse> {
  return requestJson("/support/tickets", token);
}

export function supportTicket(
  token: string,
  ticketId: string
): Promise<SupportTicketRecord> {
  return requestJson(
    "/support/tickets/" + encodeURIComponent(ticketId),
    token
  );
}

export function replySupportTicket(
  token: string,
  ticketId: string,
  message: string
): Promise<SupportTicketRecord> {
  return requestJson(
    "/support/tickets/" + encodeURIComponent(ticketId) + "/messages",
    token,
    { method: "POST", body: JSON.stringify({ message }) }
  );
}

export function closeSupportTicket(
  token: string,
  ticketId: string
): Promise<SupportTicketRecord> {
  return requestJson(
    "/support/tickets/" + encodeURIComponent(ticketId) + "/close",
    token,
    { method: "POST" }
  );
}

export function platformSupportTickets(
  token: string,
  status?: SupportTicketStatus
): Promise<SupportTicketListResponse> {
  return requestJson(
    "/platform/support/tickets" +
      (status ? "?status=" + encodeURIComponent(status) : ""),
    token
  );
}

export function platformSupportTicket(
  token: string,
  ticketId: string
): Promise<SupportTicketRecord> {
  return requestJson(
    "/platform/support/tickets/" + encodeURIComponent(ticketId),
    token
  );
}

export function replyPlatformSupportTicket(
  token: string,
  ticketId: string,
  message: string
): Promise<SupportTicketRecord> {
  return requestJson(
    "/platform/support/tickets/" +
      encodeURIComponent(ticketId) +
      "/messages",
    token,
    { method: "POST", body: JSON.stringify({ message }) }
  );
}

export function updatePlatformSupportStatus(
  token: string,
  ticketId: string,
  status: SupportTicketStatus
): Promise<SupportTicketRecord> {
  return requestJson(
    "/platform/support/tickets/" +
      encodeURIComponent(ticketId) +
      "/status",
    token,
    { method: "PUT", body: JSON.stringify({ status }) }
  );
}
