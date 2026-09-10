/**
 * JMT TRAVELS — Production Internationalization (i18n), RTL & Multi-Currency Engine
 * 
 * Features:
 * 1. Whitelisted Locale Engine (en, ar) with Fallback and Priority Resolution.
 * 2. RTL Directional Metadata & Mixed Content Preservation Helpers.
 * 3. Centralized Translation Catalogue (Global, Visa, Tourism, Payments, Support, Errors) with XSS Escaping.
 * 4. Multi-Currency Formatting Engine (OMR, AED, SAR, INR, USD) Preserving Integer Minor Units.
 * 5. FX Provider Abstraction Interface (PREPARED ONLY — Non-Production Mock Rates for Display Estimates).
 */

// Helper to escape interpolated variables in dynamic translation strings to prevent HTML XSS Injection
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// 1. LOCALE & RTL CONFIGURATION
// -------------------------------------------------------------
const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';

const LOCALE_METADATA = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    isRTL: false,
    defaultCurrency: 'OMR'
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    isRTL: true,
    defaultCurrency: 'OMR'
  }
};

// -------------------------------------------------------------
// 2. CURRENCY ARCHITECTURE CONFIGURATION
// -------------------------------------------------------------
const SUPPORTED_CURRENCIES = ['OMR', 'AED', 'SAR', 'INR', 'USD'];
const DEFAULT_CURRENCY = 'OMR';

const CURRENCY_CONFIG = {
  OMR: {
    code: 'OMR',
    name: 'Omani Rial',
    symbol: 'OMR',
    symbolArabic: 'ر.ع.',
    decimals: 3,
    minorUnitDivisor: 1000,
    minorUnitName: 'Baisa',
    numberFormatLocaleEn: 'en-OM',
    numberFormatLocaleAr: 'ar-OM'
  },
  AED: {
    code: 'AED',
    name: 'United Arab Emirates Dirham',
    symbol: 'AED',
    symbolArabic: 'د.إ.',
    decimals: 2,
    minorUnitDivisor: 100,
    minorUnitName: 'Fils',
    numberFormatLocaleEn: 'en-AE',
    numberFormatLocaleAr: 'ar-AE'
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'SAR',
    symbolArabic: 'ر.س.',
    decimals: 2,
    minorUnitDivisor: 100,
    minorUnitName: 'Halala',
    numberFormatLocaleEn: 'en-SA',
    numberFormatLocaleAr: 'ar-SA'
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    symbolArabic: '₹',
    decimals: 2,
    minorUnitDivisor: 100,
    minorUnitName: 'Paise',
    numberFormatLocaleEn: 'en-IN',
    numberFormatLocaleAr: 'ar-IN'
  },
  USD: {
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    symbolArabic: '$',
    decimals: 2,
    minorUnitDivisor: 100,
    minorUnitName: 'Cents',
    numberFormatLocaleEn: 'en-US',
    numberFormatLocaleAr: 'ar-US'
  }
};

// -------------------------------------------------------------
// 3. TRANSLATION CATALOGUE DICTIONARIES
// -------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    // Global Navigation & Common
    'global.home': 'Home',
    'global.about': 'About Us',
    'global.contact': 'Contact Us',
    'global.login': 'Login',
    'global.register': 'Register',
    'global.logout': 'Logout',
    'global.profile': 'Profile',
    'global.dashboard': 'Dashboard',
    'global.settings': 'Settings',
    'global.help': 'Help',
    'global.support': 'Support',
    'global.search': 'Search',
    'global.save': 'Save',
    'global.cancel': 'Cancel',
    'global.back': 'Back',
    'global.submit': 'Submit',

    // Visa Services Section
    'visa.services': 'Visa Services',
    'visa.application': 'Visa Application',
    'visa.application_status': 'Application Status',
    'visa.documents': 'Documents',
    'visa.upload_document': 'Upload Document',
    'visa.additional_documents_required': 'Additional Documents Required',
    'visa.under_review': 'Under Review',
    'visa.approved': 'Approved',
    'visa.rejected': 'Rejected',
    'visa.submit_application': 'Submit Application',
    'visa.express_processing': 'Express Processing (24h)',
    'visa.reference_number': 'Visa Reference',

    // Tourism Services Section
    'tourism.destinations': 'Destinations',
    'tourism.tour_packages': 'Tour Packages',
    'tourism.package_details': 'Package Details',
    'tourism.itinerary': 'Itinerary',
    'tourism.price': 'Price',
    'tourism.availability': 'Availability',
    'tourism.book_now': 'Book Now',
    'tourism.traveller_information': 'Traveller Information',
    'tourism.booking': 'Booking',
    'tourism.booking_status': 'Booking Status',
    'tourism.duration_days': '{count} Days',
    'tourism.seats_remaining': '{count} seats remaining',

    // Payment Section
    'payments.payment': 'Payment',
    'payments.pay_now': 'Pay Now',
    'payments.payment_pending': 'Payment Pending',
    'payments.payment_successful': 'Payment Successful',
    'payments.payment_failed': 'Payment Failed',
    'payments.refund': 'Refund',
    'payments.refund_status': 'Refund Status',
    'payments.amount': 'Amount',
    'payments.currency': 'Currency',
    'payments.authoritative_notice': 'All payments are settled in base currency ({currency}).',
    'payments.estimate_notice': 'Converted display values are estimated for reference only.',

    // Support Section
    'support.support': 'Customer Support',
    'support.ticket': 'Support Ticket',
    'support.message': 'Message',
    'support.reply': 'Reply',
    'support.contact_us': 'Contact Us',

    // Validation & Error Messages
    'error.required_field': 'This field is required.',
    'error.invalid_email': 'Please enter a valid email address.',
    'error.invalid_phone': 'Please enter a valid phone number.',
    'error.unauthorized': 'Unauthorized access. Please log in.',
    'error.forbidden': 'Access forbidden.',
    'error.not_found': 'Requested resource not found.',
    'error.payment_failed': 'Payment processing failed. Please try again.',
    'error.server_error': 'An internal server error occurred. Please try again later.',
    'error.invalid_locale': 'Unsupported locale requested.',
    'error.invalid_currency': 'Unsupported currency requested.'
  },
  ar: {
    // Global Navigation & Common
    'global.home': 'الرئيسية',
    'global.about': 'من نحن',
    'global.contact': 'اتصل بنا',
    'global.login': 'تسجيل الدخول',
    'global.register': 'إنشاء حساب',
    'global.logout': 'تسجيل الخروج',
    'global.profile': 'الملف الشخصي',
    'global.dashboard': 'لوحة التحكم',
    'global.settings': 'الإعدادات',
    'global.help': 'المساعدة',
    'global.support': 'الدعم الفني',
    'global.search': 'بحث',
    'global.save': 'حفظ',
    'global.cancel': 'إلغاء',
    'global.back': 'رجوع',
    'global.submit': 'إرسال',

    // Visa Services Section
    'visa.services': 'خدمات التأشيرات',
    'visa.application': 'طلب التأشيرة',
    'visa.application_status': 'حالة الطلب',
    'visa.documents': 'المستندات',
    'visa.upload_document': 'رفع مستند',
    'visa.additional_documents_required': 'مستندات إضافية مطلوبة',
    'visa.under_review': 'قيد المراجعة',
    'visa.approved': 'مقبول',
    'visa.rejected': 'مرفوض',
    'visa.submit_application': 'تقديم الطلب',
    'visa.express_processing': 'معالجة سريعة (24 ساعة)',
    'visa.reference_number': 'رقم مرجع التأشيرة',

    // Tourism Services Section
    'tourism.destinations': 'الوجهات السياحية',
    'tourism.tour_packages': 'الباقات السياحية',
    'tourism.package_details': 'تفاصيل الباقة',
    'tourism.itinerary': 'برنامج الرحلة',
    'tourism.price': 'السعر',
    'tourism.availability': 'التوفر',
    'tourism.book_now': 'احجز الآن',
    'tourism.traveller_information': 'بيانات المسافرين',
    'tourism.booking': 'الحجز',
    'tourism.booking_status': 'حالة الحجز',
    'tourism.duration_days': '{count} أيام',
    'tourism.seats_remaining': 'متبقي {count} مقاعد',

    // Payment Section
    'payments.payment': 'الدفع',
    'payments.pay_now': 'ادفع الآن',
    'payments.payment_pending': 'الدفع قيد الانتظار',
    'payments.payment_successful': 'تم الدفع بنجاح',
    'payments.payment_failed': 'فشلت عملية الدفع',
    'payments.refund': 'استرداد الأموال',
    'payments.refund_status': 'حالة الاسترداد',
    'payments.amount': 'المبلغ',
    'payments.currency': 'العملة',
    'payments.authoritative_notice': 'يتم تحصيل جميع المدفوعات بالعملة الأساسية ({currency}).',
    'payments.estimate_notice': 'الأسعار المحولة هي أسعار تقديرية للاسترشاد فقط.',

    // Support Section
    'support.support': 'دعم العملاء',
    'support.ticket': 'تذكرة دعم',
    'support.message': 'الرسالة',
    'support.reply': 'الرد',
    'support.contact_us': 'تواصل معنا',

    // Validation & Error Messages
    'error.required_field': 'هذا الحقل مطلوب.',
    'error.invalid_email': 'يرجى إدخال بريد إلكتروني صحيح.',
    'error.invalid_phone': 'يرجى إدخال رقم هاتف صحيح.',
    'error.unauthorized': 'غير مصرح بالدخول. يرجى تسجيل الدخول.',
    'error.forbidden': 'الوصول محظور.',
    'error.not_found': 'المورد المطلوب غير موجود.',
    'error.payment_failed': 'فشلت عملية معالجة الدفع. يرجى المحاولة مرة أخرى.',
    'error.server_error': 'حدث خطأ في الخادم الداخلي. يرجى المحاولة لاحقاً.',
    'error.invalid_locale': 'اللغة المطلوبة غير مدعومة.',
    'error.invalid_currency': 'العملة المطلوبة غير مدعومة.'
  }
};

// -------------------------------------------------------------
// 4. FX PROVIDER ABSTRACTION INTERFACE (PREPARED ONLY)
// -------------------------------------------------------------
class FXProvider {
  constructor() {
    this.name = 'MOCK_STATIC_FX_PROVIDER';
    this.status = 'PREPARED_ONLY';
    this.isLiveProvider = false;
    // Static estimated exchange rates relative to 1 OMR base
    this.staticRatesFromOMR = {
      OMR: 1.0,
      AED: 9.54,
      SAR: 9.74,
      INR: 216.50,
      USD: 2.60
    };
  }

  getSupportedCurrencies() {
    return [...SUPPORTED_CURRENCIES];
  }

  getRateTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Returns estimated FX exchange rate from baseCurrency to quoteCurrency.
   */
  getRate(baseCurrency, quoteCurrency) {
    const base = String(baseCurrency || 'OMR').toUpperCase();
    const quote = String(quoteCurrency || 'OMR').toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(base) || !SUPPORTED_CURRENCIES.includes(quote)) {
      throw new Error(`Unsupported currency code for FX rate lookup: ${base}/${quote}`);
    }

    if (base === quote) return 1.0;

    const rateBaseToOMR = 1 / (this.staticRatesFromOMR[base] || 1.0);
    const rateOMRToQuote = this.staticRatesFromOMR[quote] || 1.0;
    
    // Deterministic rounding to 6 decimal places for exchange rate
    return Math.round((rateBaseToOMR * rateOMRToQuote) * 1000000) / 1000000;
  }

  /**
   * Converts monetary amount in minor units for DISPLAY ESTIMATES ONLY.
   * NEVER use this for authoritative payment calculations!
   */
  convert(amountMinor, baseCurrency, quoteCurrency) {
    const baseConfig = CURRENCY_CONFIG[baseCurrency] || CURRENCY_CONFIG.OMR;
    const quoteConfig = CURRENCY_CONFIG[quoteCurrency] || CURRENCY_CONFIG.OMR;
    const rate = this.getRate(baseCurrency, quoteCurrency);

    // Convert minor units to major units
    const baseMajor = amountMinor / baseConfig.minorUnitDivisor;
    const quoteMajor = baseMajor * rate;

    // Convert back to target minor units using deterministic Math.round
    const targetMinor = Math.round(quoteMajor * quoteConfig.minorUnitDivisor);

    return {
      authoritativeBaseAmountMinor: amountMinor,
      authoritativeBaseCurrency: baseCurrency,
      estimatedConvertedAmountMinor: targetMinor,
      quoteCurrency: quoteCurrency,
      exchangeRate: rate,
      isEstimateOnly: true,
      timestamp: this.getRateTimestamp()
    };
  }
}

// -------------------------------------------------------------
// 5. I18N SERVICE CLASS
// -------------------------------------------------------------
class I18nService {
  constructor() {
    this.fxProvider = new FXProvider();
  }

  // Locale Validation
  isSupportedLocale(locale) {
    if (!locale || typeof locale !== 'string') return false;
    return SUPPORTED_LOCALES.includes(locale.toLowerCase().trim());
  }

  normalizeLocale(locale) {
    if (this.isSupportedLocale(locale)) {
      return locale.toLowerCase().trim();
    }
    return DEFAULT_LOCALE;
  }

  // Currency Validation
  isSupportedCurrency(currency) {
    if (!currency || typeof currency !== 'string') return false;
    return SUPPORTED_CURRENCIES.includes(currency.toUpperCase().trim());
  }

  normalizeCurrency(currency) {
    if (this.isSupportedCurrency(currency)) {
      return currency.toUpperCase().trim();
    }
    return DEFAULT_CURRENCY;
  }

  // RTL & Metadata
  getLocaleMetadata(locale) {
    const norm = this.normalizeLocale(locale);
    return { ...LOCALE_METADATA[norm] };
  }

  isRTL(locale) {
    const norm = this.normalizeLocale(locale);
    return LOCALE_METADATA[norm].isRTL;
  }

  getDirection(locale) {
    const norm = this.normalizeLocale(locale);
    return LOCALE_METADATA[norm].direction;
  }

  /**
   * Preserves logical ordering of mixed RTL/LTR identifiers (JMT-V-XXXX, JMT-B-XXXX, emails, phone, URLs).
   */
  wrapDirectionalIsolation(text, dir = 'ltr') {
    if (!text) return '';
    const safeText = escapeHTML(text);
    return `<span dir="${dir}" class="ltr-isolate" style="unicode-bidi: isolate; display: inline-block;">${safeText}</span>`;
  }

  /**
   * Translation Key Lookup with Parameter Interpolation & English Fallback
   */
  t(key, locale = 'en', params = {}) {
    const normLocale = this.normalizeLocale(locale);
    
    let template = TRANSLATIONS[normLocale]?.[key];
    if (!template && normLocale !== DEFAULT_LOCALE) {
      // Fallback to English dictionary
      template = TRANSLATIONS[DEFAULT_LOCALE]?.[key];
    }

    if (!template) {
      // Return key itself if not found in dictionary
      return key;
    }

    // Replace dynamic placeholders {param} with escaped values
    let translated = template;
    for (const [pKey, pVal] of Object.entries(params)) {
      const escapedVal = escapeHTML(pVal);
      translated = translated.replace(new RegExp(`\\{${pKey}\\}`, 'g'), escapedVal);
    }

    return translated;
  }

  /**
   * Returns full translation dictionary catalogue for requested locale
   */
  getTranslations(locale = 'en') {
    const normLocale = this.normalizeLocale(locale);
    return {
      locale: normLocale,
      metadata: this.getLocaleMetadata(normLocale),
      translations: { ...TRANSLATIONS[normLocale] }
    };
  }

  /**
   * Multi-Currency Formatter Engine
   * Formats integer minor units into human-readable currency strings.
   * e.g. 189000 OMR -> "189.000 OMR" (en) / "189.000 ر.ع." (ar)
   *      125000 USD -> "$1,250.00"
   *      12500000 INR -> "₹1,25,000.00"
   */
  formatCurrency(amountMinor, currencyCode = 'OMR', locale = 'en') {
    if (typeof amountMinor !== 'number' || isNaN(amountMinor)) {
      amountMinor = 0;
    }

    const normCurrency = this.normalizeCurrency(currencyCode);
    const normLocale = this.normalizeLocale(locale);
    const config = CURRENCY_CONFIG[normCurrency];

    const majorValue = amountMinor / config.minorUnitDivisor;

    // Determine number formatting locale
    const numberLocale = normLocale === 'ar' ? config.numberFormatLocaleAr : config.numberFormatLocaleEn;

    // Use Intl.NumberFormat for locale-aware formatting
    const formattedNumber = new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
      useGrouping: true
    }).format(majorValue);

    const symbol = normLocale === 'ar' ? config.symbolArabic : config.symbol;

    if (normLocale === 'ar') {
      return `${formattedNumber} ${symbol}`;
    } else {
      if (normCurrency === 'USD') return `$${formattedNumber}`;
      if (normCurrency === 'INR') return `₹${formattedNumber}`;
      return `${normCurrency} ${formattedNumber}`;
    }
  }

  // Returns all supported currency configurations
  getCurrencyConfigs() {
    return JSON.parse(JSON.stringify(CURRENCY_CONFIG));
  }
}

module.exports = new I18nService();
