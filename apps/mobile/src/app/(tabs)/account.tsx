import { FoundationScreen } from "@/components/foundation/FoundationScreen";

export default function AccountScreen() {
  return (
    <FoundationScreen
      title="Account"
      description="Authentication and role-aware account behavior are intentionally deferred to their Phase 1 tasks."
      statusTitle="Account foundation ready"
      statusMessage="Registration, sessions, merchant mode, and role boundaries will be connected after the database and authentication foundations."
    />
  );
}
