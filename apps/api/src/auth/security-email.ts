export interface SecurityEmailSender {
  configured(): boolean;
  send(address: string, purpose: "verify_email" | "password_reset", token: string): Promise<void>;
}

/** Only sends through explicitly configured transactional email. Never logs tokens. */
export class ResendSecurityEmailSender implements SecurityEmailSender {
  constructor(
    private readonly key = process.env.RESEND_API_KEY,
    private readonly from = process.env.AUTH_EMAIL_FROM
  ) {}

  configured(): boolean {
    return Boolean(this.key?.trim() && this.from?.trim());
  }

  async send(
    address: string,
    purpose: "verify_email" | "password_reset",
    token: string
  ): Promise<void> {
    if (!this.configured()) throw new Error("email_not_configured");
    const isReset = purpose === "password_reset";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: "Bearer " + this.key,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          from: this.from,
          to: [address],
          subject: isReset ? "BazaarLink password reset" : "Verify your BazaarLink email",
          text: [
            isReset ? "A password reset was requested." : "Verify your BazaarLink email address.",
            "Open BazaarLink and paste the following one-time code:",
            token,
            "This code expires in 15 minutes. If you did not request this, ignore the email.",
            "Never share this code with anyone."
          ].join("\n\n")
        })
      });
      if (!response.ok) throw new Error("email_delivery_failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
