export const enMessages = {
  "nav.home": "Home",
  "nav.marketplace": "Marketplace",
  "nav.cart": "Cart",
  "nav.orders": "Orders",
  "nav.account": "Account",

  "common.brandName": "BazaarLink",
  "common.foundation": "Foundation",

  "language.label": "Language",
  "language.description": "Choose the language used across BazaarLink.",
  "language.dari": "Dari",
  "language.pashto": "Pashto",
  "language.english": "English",

  "home.title": "Commerce built for local businesses.",
  "home.description":
    "The mobile application shell and shared design system are ready for the product features that follow.",
  "home.statusTitle": "Foundation status",
  "home.statusMessage":
    "Reusable typography, surfaces, form controls, state views, safe areas, keyboard handling, dark mode, and bottom navigation now share one token system.",
  "home.mobileFirst": "Mobile first",
  "home.accessibleTargets": "Accessible targets",
  "home.rtlReady": "RTL ready",

  "marketplace.title": "Marketplace",
  "marketplace.description":
    "The marketplace shell is reserved for the approved marketplace phase.",
  "marketplace.statusTitle": "Marketplace foundation ready",
  "marketplace.statusMessage":
    "Product discovery, categories, search, and filtering will be implemented in their product phase.",

  "cart.title": "Cart",
  "cart.description":
    "The cart shell is present without implementing checkout ahead of schedule.",
  "cart.statusTitle": "Your cart is empty",
  "cart.statusMessage":
    "Cart and merchant grouping logic will be added in the approved cart and pricing phase.",

  "orders.title": "Orders",
  "orders.description":
    "The orders shell establishes navigation without introducing order behavior early.",
  "orders.statusTitle": "No orders yet",
  "orders.statusMessage":
    "Order creation, fulfillment, and tracking will arrive in the approved order phases.",

  "account.title": "Account",
  "account.description":
    "Authentication and role-aware account behavior are intentionally deferred to their Phase 1 tasks.",
  "account.statusTitle": "Account foundation ready",
  "account.statusMessage":
    "Registration, sessions, merchant mode, and role boundaries will be connected after the database and authentication foundations.",

  "notFound.title": "Page not found",
  "notFound.message": "The requested screen does not exist in the current application.",
  "notFound.returnHome": "Return home"
} as const;

export type TranslationKey = keyof typeof enMessages;
