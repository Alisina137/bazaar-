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
    "Sign in or create an account to keep your BazaarLink activity connected securely.",

  "auth.restoringTitle": "Restoring your session",
  "auth.restoringMessage": "Checking your saved secure session.",
  "auth.signInTitle": "Welcome back",
  "auth.signInDescription": "Sign in with your email and password.",
  "auth.registerTitle": "Create your account",
  "auth.registerDescription":
    "Create a secure BazaarLink account to begin shopping and later access seller tools.",
  "auth.displayName": "Name (optional)",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.passwordHint": "Use at least 8 characters.",
  "auth.signInAction": "Sign in",
  "auth.registerAction": "Create account",
  "auth.needAccount": "Need an account? Create one",
  "auth.haveAccount": "Already have an account? Sign in",
  "auth.activeSession": "Secure session active",
  "auth.signedInTitle": "Signed in",
  "auth.signedInMessage": "Your account is connected to this device.",
  "auth.rolesLabel": "Account roles",
  "auth.authorizedModesLabel": "Authorized modes",
  "auth.rolesManagedByServer":
    "Roles are assigned by BazaarLink on the server. They cannot be changed from this device.",
  "auth.mode.shopping": "Shopping",
  "auth.mode.seller": "Seller access",
  "auth.mode.platform": "Platform access",
  "role.customer": "Customer",
  "role.merchantOwner": "Merchant owner",
  "role.merchantStaff": "Merchant staff",
  "role.platformSupport": "Platform support",
  "role.platformAdmin": "Platform admin",
  "role.superAdmin": "Super admin",
  "auth.sessionProtected":
    "Your session token is stored in the device's secure storage and can be revoked by signing out.",
  "auth.signOut": "Sign out",
  "auth.error.invalidRequest":
    "Please check the information you entered and try again.",
  "auth.error.emailInUse": "An account already uses this email.",
  "auth.error.invalidCredentials": "Email or password is incorrect.",
  "auth.error.sessionExpired": "Your session is no longer valid. Please sign in again.",
  "auth.error.accountUnavailable":
    "This account is currently unavailable. Please contact support if you need help.",
  "auth.error.forbidden":
    "Your account does not have permission to use this area.",
  "auth.error.rateLimited":
    "Too many attempts. Please wait a few minutes and try again.",
  "auth.error.serviceUnavailable":
    "BazaarLink could not reach the authentication service. Check your connection and try again.",

  "notFound.title": "Page not found",
  "notFound.message": "The requested screen does not exist in the current application.",
  "notFound.returnHome": "Return home"
} as const;

export type TranslationKey = keyof typeof enMessages;
