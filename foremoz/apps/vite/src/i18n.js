import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'foremoz.language';
const DEFAULT_LANGUAGE = 'id';
const SUPPORTED_LANGUAGES = ['id', 'en'];

const translations = {
  id: {
    'common.language': 'Bahasa',
    'common.language.id': 'ID',
    'common.language.en': 'EN',
    'common.email': 'Email',
    'common.password': 'Password',
    'common.fullName': 'Nama lengkap',
    'common.phone': 'Nomor telepon',
    'common.industry': 'Industri',
    'common.forgotPassword': 'Lupa password',
    'common.createAccount': 'Buat akun',
    'common.signIn': 'Masuk',
    'common.signInLoading': 'Sedang masuk...',
    'common.signUp': 'Daftar',
    'common.createLoading': 'Sedang membuat akun...',
    'common.ownerSignIn': 'Masuk Owner',
    'common.events': 'Event',
    'web.nav.ownerSignIn': 'Masuk Owner',
    'web.hero.eyebrow': 'Home',
    'web.hero.title': 'Semua event, class, dan komunitas kamu dalam satu tempat.',
    'web.hero.description': 'Tempat creator dan member ketemu, join, check in, dan tumbuh bareng.',
    'web.hero.browse': 'Lihat Event',
    'web.hero.startFree': 'Mulai Gratis',
    'web.quickStart.eyebrow': 'Mulai Cepat',
    'web.quickStart.joinEvent': 'Ikut Event',
    'web.quickStart.joinClass': 'Ikut Class',
    'web.quickStart.buildCommunity': 'Bangun Komunitas',
    'web.quickStart.showProgress': 'Tunjukkan Progress',
    'web.explore.eyebrow': 'Explore',
    'web.explore.title': 'Pilih dunia yang kamu suka',
    'web.explore.enter': 'Masuk',
    'web.cta.eyebrow': 'Siap',
    'web.cta.title': 'Temukan event berikutnya dan mulai sekarang.',
    'web.cta.browse': 'Browse Event',
    'auth.owner.title': 'Masuk Owner',
    'auth.owner.subtitle': 'Masuk sebagai owner untuk operasional tenant. Untuk participant event gunakan login Passport.',
    'auth.owner.alternate': 'Butuh akun owner? Buat akun',
    'auth.tenant.title': 'Masuk Tenant - {account}',
    'auth.tenant.subtitle': 'Masuk sebagai user tenant (admin, CS, sales, PT). Halaman ini bukan untuk event passport.',
    'auth.activationNotice': 'Akun sudah aktif. Silakan masuk.',
    'auth.resetNotice': 'Password berhasil direset. Silakan masuk dengan password baru.',
    'auth.differentLogin': 'Butuh login lain?',
    'auth.passportLogin': 'Login Passport/Event',
    'auth.memberPortalLogin': 'Login Portal Member',
    'auth.ownerSignup.title': 'Buat akun owner',
    'auth.ownerSignup.subtitle': 'Siapkan workspace tenant dan operasional cabang.',
    'auth.ownerSignup.alternate': 'Sudah punya akun owner? Masuk',
    'auth.memberSignIn.title': 'Masuk Member',
    'auth.memberSignIn.subtitle': 'Masuk ke portal member{accountSuffix} untuk booking, payment, dan status membership.',
    'auth.memberSignIn.alternate': 'Member baru? Daftar',
    'auth.memberSignIn.afterTitle': 'Setelah Masuk',
    'auth.memberSignIn.afterDescription': 'Portal member menampilkan event yang sudah kamu join, status subscription, PT balance, booking class, dan aktivitas payment.',
    'auth.memberSignIn.submit': 'Masuk sebagai member',
    'auth.memberSignIn.staffSignIn': 'Masuk Staff',
    'auth.memberSignIn.backToAccount': 'Kembali ke akun publik',
    'auth.memberSignup.title': 'Daftar Member',
    'auth.memberSignup.subtitle': 'Gabung sebagai member{accountSuffix} untuk akses membership, booking, dan payment flow.',
    'auth.memberSignup.alternate': 'Sudah member? Masuk',
    'auth.memberSignup.unlockTitle': 'Yang Kamu Dapatkan',
    'auth.memberSignup.unlockDescription': 'Setelah daftar, kamu langsung masuk ke portal member untuk lihat event yang diikuti, status membership, PT package, booking class, dan riwayat payment.',
    'auth.memberSignup.submit': 'Buat akun member',
    'passport.signIn.eyebrow': 'Masuk Passport',
    'passport.signIn.title': 'Masuk ke Foremoz Passport',
    'passport.signIn.subtitle': 'Akses identity layer kamu untuk profile publik, event history, achievement, dan dashboard passport.',
    'passport.signIn.whatYouGet': 'Yang Kamu Dapat',
    'passport.signIn.whatYouGetDescription': 'Public profile, event timeline, activity feed dasar, dan visibility controls untuk profile publik.',
    'passport.signIn.bridgeReady': 'Bridge Siap',
    'passport.signIn.bridgeReadyDescription': 'Kalau akun kamu baru ada di member tenant, login ini tetap mencoba bridge ke Passport secara otomatis.',
    'passport.signIn.nextStep': 'Langkah berikutnya setelah masuk: lengkapi onboarding lalu atur public visibility profile kamu.',
    'passport.signIn.createAccount': 'Buat akun',
    'passport.signUp.eyebrow': 'Daftar Passport',
    'passport.signUp.title': 'Buat Akun Passport',
    'passport.signUp.subtitle': 'Bangun identity publik kamu sejak awal supaya event history, capability, dan profile publik terkumpul di satu tempat.',
    'passport.signUp.identityLayer': 'Identity Layer',
    'passport.signUp.identityLayerDescription': 'Passport dipakai untuk public profile, event participation record, dan social proof dasar lintas account.',
    'passport.signUp.afterTitle': 'Setelah Daftar',
    'passport.signUp.afterDescription': 'Kamu akan lanjut ke onboarding untuk pilih goal, interest, dan privacy preset sebelum masuk dashboard.',
    'passport.signUp.submit': 'Buat passport',
    'passport.signUp.loading': 'Sedang membuat...',
    'passport.signUp.alternate': 'Sudah punya akun',
    'passport.signUp.note': 'Cocok dipakai oleh creator maupun participant yang ingin punya profile publik di Foremoz.'
  },
  en: {
    'common.language': 'Language',
    'common.language.id': 'ID',
    'common.language.en': 'EN',
    'common.email': 'Email',
    'common.password': 'Password',
    'common.fullName': 'Full name',
    'common.phone': 'Phone number',
    'common.industry': 'Industry',
    'common.forgotPassword': 'Forgot password',
    'common.createAccount': 'Create account',
    'common.signIn': 'Sign in',
    'common.signInLoading': 'Signing in...',
    'common.signUp': 'Sign up',
    'common.createLoading': 'Creating account...',
    'common.ownerSignIn': 'Owner Sign In',
    'common.events': 'Events',
    'web.nav.ownerSignIn': 'Owner Sign In',
    'web.hero.eyebrow': 'Home',
    'web.hero.title': 'All your events, classes, and communities in one place.',
    'web.hero.description': 'A place where creators and members meet, join, check in, and grow together.',
    'web.hero.browse': 'Browse Events',
    'web.hero.startFree': 'Start Free',
    'web.quickStart.eyebrow': 'Quick Start',
    'web.quickStart.joinEvent': 'Join Event',
    'web.quickStart.joinClass': 'Join Class',
    'web.quickStart.buildCommunity': 'Build Community',
    'web.quickStart.showProgress': 'Show Progress',
    'web.explore.eyebrow': 'Explore',
    'web.explore.title': 'Choose the world you care about',
    'web.explore.enter': 'Enter',
    'web.cta.eyebrow': 'Ready',
    'web.cta.title': 'Find your next event and start now.',
    'web.cta.browse': 'Browse Events',
    'auth.owner.title': 'Owner Sign In',
    'auth.owner.subtitle': 'Sign in as an owner for tenant operations. Event participants should use Passport login.',
    'auth.owner.alternate': 'Need an owner account? Create one',
    'auth.tenant.title': 'Tenant Sign In - {account}',
    'auth.tenant.subtitle': 'Sign in as a tenant user (admin, CS, sales, PT). This page is not for Passport event access.',
    'auth.activationNotice': 'Account activated. You can sign in now.',
    'auth.resetNotice': 'Password reset completed. Please sign in with your new password.',
    'auth.differentLogin': 'Need a different login?',
    'auth.passportLogin': 'Passport/Event Login',
    'auth.memberPortalLogin': 'Member Portal Login',
    'auth.ownerSignup.title': 'Create owner account',
    'auth.ownerSignup.subtitle': 'Set up your tenant workspace and branch operations.',
    'auth.ownerSignup.alternate': 'Already have an owner account? Sign in',
    'auth.memberSignIn.title': 'Member Sign In',
    'auth.memberSignIn.subtitle': 'Sign in to the member portal{accountSuffix} for bookings, payments, and membership status.',
    'auth.memberSignIn.alternate': 'New member? Sign up',
    'auth.memberSignIn.afterTitle': 'After Sign In',
    'auth.memberSignIn.afterDescription': 'The member portal shows joined events, subscription status, PT balance, class bookings, and payment activity.',
    'auth.memberSignIn.submit': 'Sign in as member',
    'auth.memberSignIn.staffSignIn': 'Staff Sign In',
    'auth.memberSignIn.backToAccount': 'Back to public account',
    'auth.memberSignup.title': 'Member Sign Up',
    'auth.memberSignup.subtitle': 'Join as a member{accountSuffix} to access membership, booking, and payment flows.',
    'auth.memberSignup.alternate': 'Already a member? Sign in',
    'auth.memberSignup.unlockTitle': 'What You Unlock',
    'auth.memberSignup.unlockDescription': 'After signing up, you go straight into the member portal to view joined events, membership status, PT packages, class bookings, and payment history.',
    'auth.memberSignup.submit': 'Create member account',
    'passport.signIn.eyebrow': 'Passport Sign In',
    'passport.signIn.title': 'Sign in to Foremoz Passport',
    'passport.signIn.subtitle': 'Access your identity layer for public profile, event history, achievements, and the passport dashboard.',
    'passport.signIn.whatYouGet': 'What You Get',
    'passport.signIn.whatYouGetDescription': 'Public profile, event timeline, basic activity feed, and visibility controls for your public profile.',
    'passport.signIn.bridgeReady': 'Bridge Ready',
    'passport.signIn.bridgeReadyDescription': 'If your account only exists as a tenant member, this sign-in still attempts to bridge it into Passport automatically.',
    'passport.signIn.nextStep': 'Next step after sign in: finish onboarding, then configure your public profile visibility.',
    'passport.signIn.createAccount': 'Create account',
    'passport.signUp.eyebrow': 'Passport Sign Up',
    'passport.signUp.title': 'Create Passport Account',
    'passport.signUp.subtitle': 'Build your public identity from the start so event history, capabilities, and your public profile stay in one place.',
    'passport.signUp.identityLayer': 'Identity Layer',
    'passport.signUp.identityLayerDescription': 'Passport powers your public profile, event participation record, and lightweight cross-account social proof.',
    'passport.signUp.afterTitle': 'After Sign Up',
    'passport.signUp.afterDescription': 'You will continue to onboarding to pick goals, interests, and a privacy preset before entering the dashboard.',
    'passport.signUp.submit': 'Create passport',
    'passport.signUp.loading': 'Creating...',
    'passport.signUp.alternate': 'Already have an account',
    'passport.signUp.note': 'Useful for both creators and participants who want a public profile in Foremoz.'
  }
};

function normalizeLanguage(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('id')) return 'id';
  if (raw.startsWith('en')) return 'en';
  return '';
}

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

function resolveInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const params = new URLSearchParams(window.location.search || '');
  const fromQuery = normalizeLanguage(params.get('lang'));
  if (fromQuery) return fromQuery;
  const stored = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  if (stored) return stored;
  return DEFAULT_LANGUAGE;
}

const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: SUPPORTED_LANGUAGES
});

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(resolveInitialLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.setAttribute('data-language', language);
  }, [language]);

  const value = useMemo(() => {
    function setLanguage(nextLanguage) {
      const normalized = normalizeLanguage(nextLanguage) || DEFAULT_LANGUAGE;
      setLanguageState(normalized);
    }

    function t(key, vars = {}) {
      const table = translations[language] || translations[DEFAULT_LANGUAGE];
      const fallbackTable = translations[DEFAULT_LANGUAGE];
      const template = table?.[key] ?? fallbackTable?.[key] ?? key;
      return interpolate(template, vars);
    }

    return {
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES
    };
  }, [language]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}
