import type { TranslationKey } from "./en";

export const faAfMessages = {
  "nav.home": "خانه",
  "nav.marketplace": "بازار",
  "nav.cart": "سبد خرید",
  "nav.orders": "سفارش‌ها",
  "nav.account": "حساب",

  "common.brandName": "BazaarLink",
  "common.foundation": "زیربنا",

  "language.label": "زبان",
  "language.description": "زبان مورد استفاده در سراسر بازارلینک را انتخاب کنید.",
  "language.dari": "دری",
  "language.pashto": "پشتو",
  "language.english": "انگلیسی",

  "home.title": "تجارت برای کسب‌وکارهای محلی.",
  "home.description":
    "ساختار ابتدایی اپ موبایل و سیستم طراحی مشترک برای قابلیت‌های بعدی آماده است.",
  "home.statusTitle": "وضعیت زیربنا",
  "home.statusMessage":
    "تایپوگرافی، سطح‌ها، کنترل‌های فورم، حالت‌ها، فضای امن صفحه، مدیریت کیبورد، حالت تاریک و ناوبری پایین اکنون از یک سیستم طراحی مشترک استفاده می‌کنند.",
  "home.mobileFirst": "اولویت با موبایل",
  "home.accessibleTargets": "کنترل‌های قابل دسترس",
  "home.rtlReady": "آماده برای راست‌به‌چپ",

  "marketplace.title": "بازار",
  "marketplace.description":
    "ساختار ابتدایی بازار برای مرحله تأییدشده بازار محفوظ است.",
  "marketplace.statusTitle": "زیربنای بازار آماده است",
  "marketplace.statusMessage":
    "کشف محصول، دسته‌بندی‌ها، جستجو و فیلترها در مرحله مربوط به بازار پیاده‌سازی می‌شوند.",

  "cart.title": "سبد خرید",
  "cart.description":
    "ساختار سبد خرید آماده است، بدون این‌که پرداخت زودتر از مرحله تعیین‌شده پیاده‌سازی شود.",
  "cart.statusTitle": "سبد خرید شما خالی است",
  "cart.statusMessage":
    "منطق سبد خرید و گروه‌بندی فروشنده‌ها در مرحله تأییدشده سبد و قیمت‌گذاری اضافه می‌شود.",

  "orders.title": "سفارش‌ها",
  "orders.description":
    "ساختار سفارش‌ها ناوبری را آماده می‌کند، بدون این‌که منطق سفارش زودتر از زمان آن اضافه شود.",
  "orders.statusTitle": "هنوز سفارشی ندارید",
  "orders.statusMessage":
    "ایجاد سفارش، آماده‌سازی و پیگیری در مرحله‌های تأییدشده سفارش اضافه می‌شوند.",

  "account.title": "حساب",
  "account.description":
    "برای اتصال امن فعالیت‌های بازارلینک وارد شوید یا یک حساب بسازید.",

  "auth.restoringTitle": "بازیابی نشست شما",
  "auth.restoringMessage": "نشست امن ذخیره‌شده شما بررسی می‌شود.",
  "auth.signInTitle": "خوش آمدید",
  "auth.signInDescription": "با ایمیل و رمز عبور خود وارد شوید.",
  "auth.registerTitle": "حساب خود را بسازید",
  "auth.registerDescription":
    "یک حساب امن بازارلینک بسازید تا خرید را آغاز کنید و بعداً به ابزارهای فروشنده دسترسی داشته باشید.",
  "auth.displayName": "نام (اختیاری)",
  "auth.email": "ایمیل",
  "auth.password": "رمز عبور",
  "auth.passwordHint": "حداقل ۸ کاراکتر استفاده کنید.",
  "auth.signInAction": "ورود",
  "auth.registerAction": "ساخت حساب",
  "auth.needAccount": "حساب ندارید؟ یک حساب بسازید",
  "auth.haveAccount": "از قبل حساب دارید؟ وارد شوید",
  "auth.activeSession": "نشست امن فعال است",
  "auth.signedInTitle": "وارد شده‌اید",
  "auth.signedInMessage": "حساب شما به‌صورت امن به این دستگاه متصل است.",
  "auth.sessionProtected":
    "توکن نشست شما در ذخیره‌سازی امن دستگاه نگهداری می‌شود و با خروج می‌توانید آن را باطل کنید.",
  "auth.signOut": "خروج",
  "auth.error.invalidRequest":
    "لطفاً معلومات واردشده را بررسی کرده و دوباره تلاش کنید.",
  "auth.error.emailInUse": "این ایمیل قبلاً برای یک حساب استفاده شده است.",
  "auth.error.invalidCredentials": "ایمیل یا رمز عبور نادرست است.",
  "auth.error.sessionExpired": "نشست شما دیگر معتبر نیست. لطفاً دوباره وارد شوید.",
  "auth.error.accountUnavailable":
    "این حساب فعلاً در دسترس نیست. اگر کمک نیاز دارید با پشتیبانی تماس بگیرید.",
  "auth.error.rateLimited":
    "تلاش‌های بیش از حد انجام شده است. چند دقیقه بعد دوباره کوشش کنید.",
  "auth.error.serviceUnavailable":
    "بازارلینک نتوانست به سرویس ورود وصل شود. اتصال خود را بررسی کرده و دوباره تلاش کنید.",

  "notFound.title": "صفحه پیدا نشد",
  "notFound.message": "صفحه درخواستی در نسخه فعلی برنامه وجود ندارد.",
  "notFound.returnHome": "بازگشت به خانه"
} satisfies Record<TranslationKey, string>;
