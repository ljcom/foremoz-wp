import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountPath, apiJson, clearSession, getAccountSlug, getEnvironmentLabel, getSession, getAdminTabsByPlan, getAllowedEnvironments, getSessionPackagePlan } from '../lib.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';
import WorkspaceHeader from '../components/WorkspaceHeader.jsx';
import { useI18n } from '../i18n.js';
import {
  getAdminClassTemplateConfig,
  getAdminClassTemplatesConfig,
  getAdminDefaultPackageForm,
  getAdminEventStatusLabel,
  getAdminEventTemplateConfig,
  getAdminEventTemplatesConfig,
  getAdminEventWorkflowValue,
  getAdminFixture,
  getAdminLocalizedCopy,
  getAdminPageCopy,
  getAdminPageObject,
  getAdminPackageTypeConfig,
  getAdminPackageTypesConfig,
  getAdminPageOptions,
  getAdminPlanLabel,
  getAdminTabsConfig,
  getMappedWorkspacePath,
  getWorkspaceAccessConfigList,
  isConfiguredAdminEventPublishedStatus
} from '../config/app-config.js';
import {
  formatAppDate,
  formatAppDateTime,
  getAppDateInputValue,
  getAppDateTimeInputValue,
  toAppIsoFromDateInput,
  toAppIsoFromDateTimeInput
} from '../time.js';

const ADMIN_TABS = getAdminTabsConfig();
const DEFAULT_CLASSES = getAdminFixture('classes');
const DEFAULT_EVENTS = getAdminFixture('events');

const EVENT_DURATION_UNITS = getAdminPageOptions('eventDurationUnits');
const CLASS_WEEKDAYS = getAdminPageOptions('classWeekdays');
const ACTIVITY_VALIDITY_UNIT_OPTIONS = getAdminPageOptions('activityValidityUnitOptions');
const ACTIVITY_LIMITED_DURATION_UNIT_OPTIONS = getAdminPageOptions('activityLimitedDurationUnitOptions');
const ACTIVITY_VALIDITY_ANCHOR_OPTIONS = getAdminPageOptions('activityValidityAnchorOptions');
const ACTIVITY_USAGE_PERIOD_OPTIONS = getAdminPageOptions('activityUsagePeriodOptions');
const DURATION_MODE_OPTIONS = getAdminPageOptions('durationModeOptions');
const USAGE_MODE_OPTIONS = getAdminPageOptions('usageModeOptions');
const EVENT_TEMPLATE_OPTIONS = getAdminEventTemplatesConfig();
const CLASS_TEMPLATE_OPTIONS = getAdminClassTemplatesConfig();
const PACKAGE_TYPE_OPTIONS = getAdminPackageTypesConfig();
const USER_ROLE_OPTIONS = getAdminPageOptions('userRoles');
const REGISTRATION_FIELD_TYPE_OPTIONS = getAdminPageOptions('registrationFieldTypes');
const PRODUCT_CATEGORY_OPTIONS = getAdminPageOptions('productCategories');
const PRODUCT_TABLE_COLUMNS = getAdminPageOptions('productTableColumns');
const PACKAGE_TABLE_COLUMNS = getAdminPageOptions('packageTableColumns');
const TRAINER_PACKAGE_TABLE_COLUMNS = getAdminPageOptions('trainerPackageTableColumns');
const SALES_MEMBER_TABLE_COLUMNS = getAdminPageOptions('salesMemberTableColumns');
const PT_USER_TABLE_COLUMNS = getAdminPageOptions('ptUserTableColumns');
const SALES_USER_TABLE_COLUMNS = getAdminPageOptions('salesUserTableColumns');
const MEMBER_TABLE_COLUMNS = getAdminPageOptions('memberTableColumns');
const TRANSACTION_STATUS_FILTER_OPTIONS = getAdminPageOptions('transactionStatusFilters');
const TRANSACTION_LINK_FILTER_OPTIONS = getAdminPageOptions('transactionLinkFilters');
const TRANSACTION_CURRENCY_OPTIONS = getAdminPageOptions('transactionCurrencies');
const TRANSACTION_METHOD_OPTIONS = getAdminPageOptions('transactionMethods');
const TRANSACTION_TABLE_COLUMNS = getAdminPageOptions('transactionTableColumns');
const TRANSACTION_ACTIONS = getAdminPageOptions('transactionActions');
const SAAS_EXTENSION_MONTH_OPTIONS = getAdminPageOptions('saasExtensionMonths');
const WORKSPACE_SWITCHER_ENVIRONMENTS = getWorkspaceAccessConfigList('workspaceSwitcherEnvironments');
const TITLE_SUGGESTION_CONFIG = getAdminPageObject('titleSuggestion');
const MEMBER_UPLOAD_CONFIG = getAdminPageObject('memberUpload');

const IDR_FORMATTER = new Intl.NumberFormat('id-ID');

function createEmptyClassManualSession() {
  return { start_at: '', end_at: '' };
}

function createEmptyPackageForm() {
  return getAdminDefaultPackageForm();
}

function getPackageTypeMeta(packageType) {
  return getAdminPackageTypeConfig(packageType);
}

function isAdminActionVisible(action, item) {
  const status = String(item?.status || '').toLowerCase();
  const condition = String(action?.visibleWhenStatus || 'any').toLowerCase();
  return condition === 'any' || condition === status;
}

function toDurationMinutes(durationValue, durationUnit) {
  const value = Number(durationValue);
  const unit = EVENT_DURATION_UNITS.find((item) => item.value === durationUnit) || EVENT_DURATION_UNITS[0];
  if (!Number.isFinite(value) || value <= 0) return NaN;
  return Math.floor(value * unit.minutes);
}

function fromDurationMinutes(durationMinutes) {
  const total = Number(durationMinutes);
  if (!Number.isFinite(total) || total <= 0) {
    return { duration_value: '60', duration_unit: 'minutes' };
  }
  for (const unit of [...EVENT_DURATION_UNITS].reverse()) {
    if (total % unit.minutes === 0) {
      return {
        duration_value: String(Math.max(1, Math.floor(total / unit.minutes))),
        duration_unit: unit.value
      };
    }
  }
  return { duration_value: String(Math.max(1, Math.floor(total))), duration_unit: 'minutes' };
}

function formatDurationLabelFromMinutes(durationMinutes) {
  const parsed = fromDurationMinutes(durationMinutes);
  const value = Number(parsed.duration_value || 0);
  const unit = EVENT_DURATION_UNITS.find((item) => item.value === parsed.duration_unit);
  if (!unit) return `${durationMinutes || 0} minutes`;
  const label = value === 1 ? unit.label.replace(/s\b/, '') : unit.label;
  return `${value} ${label}`;
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function suggestCategoriesFromText(text) {
  const source = String(text || '').toLowerCase();
  const categories = new Set();
  if (/art|arts|lukis|lukisan|pameran|gallery|galeri|exhibition|museum/.test(source)) categories.add('Arts Exhibition');
  if (/run|marathon|trail|race/.test(source)) categories.add('Running');
  if (/bike|cycling|ride/.test(source)) categories.add('Cycling');
  if (/yoga|pilates|mobility/.test(source)) categories.add('Mind & Body');
  if (/strength|hyrox|bootcamp|hiit|crossfit/.test(source)) categories.add('Strength & Conditioning');
  if (/boxing|muay|mma|martial/.test(source)) categories.add('Combat');
  if (/swim|aquatic/.test(source)) categories.add('Aquatic');
  if (categories.size === 0) categories.add('General Event');
  return [...categories];
}

function suggestRegistrationFieldsFromText(text) {
  const source = String(text || '').toLowerCase();
  const fields = [];
  const usedLabels = new Set();
  const addFree = (label, required = true) => {
    const normalizedLabel = String(label || '').trim();
    if (!normalizedLabel) return;
    const key = normalizedLabel.toLowerCase();
    if (usedLabels.has(key)) return;
    usedLabels.add(key);
    const field = createRegistrationField('free_type');
    field.label = normalizedLabel;
    field.required = required;
    fields.push(field);
  };
  const addLookup = (label, optionsText, required = true) => {
    const normalizedLabel = String(label || '').trim();
    if (!normalizedLabel) return;
    const key = normalizedLabel.toLowerCase();
    if (usedLabels.has(key)) return;
    usedLabels.add(key);
    const field = createRegistrationField('lookup');
    field.label = normalizedLabel;
    field.options_text = String(optionsText || '').trim();
    field.required = required;
    fields.push(field);
  };

  const isArt = /art|arts|lukis|lukisan|pameran|gallery|galeri|exhibition|museum|curator|karya/.test(source);
  const isRace = /run|race|marathon|trail|timed|competition|duathlon|triathlon/.test(source);
  const isTour = /tour|trip|wisata|itinerary|hiking|outdoor|mountain/.test(source);
  const isLearning = /workshop|kelas|course|seminar|bootcamp|training|mentoring/.test(source);
  const isCorporate = /company|corporate|instansi|kantor|komunitas|school|kampus/.test(source);

  addFree('Emergency Contact');
  addFree('No. WhatsApp');

  if (isArt) {
    addLookup('Kategori Pengunjung', 'Umum, Pelajar, Kolektor, Komunitas');
    addFree('Asal Komunitas/Institusi', false);
    addFree('Preferensi Karya', false);
  }
  if (isLearning) {
    addLookup('Level Peserta', 'Beginner, Intermediate, Advanced');
    addFree('Tujuan Ikut Event', false);
  }
  if (isRace) {
    addLookup('T-Shirt Size', 'S, M, L, XL');
    addLookup('Race Category', '5K, 10K, Half Marathon, Full Marathon');
    addFree('Medical Notes', false);
  }
  if (isTour) {
    addFree('Nomor Identitas (KTP/Paspor)');
    addFree('Meeting Point');
    addFree('Kondisi Kesehatan Khusus', false);
  }
  if (isCorporate) {
    addFree('Nama Perusahaan/Komunitas', false);
  }

  if (fields.length < 2) {
    addLookup('Kategori Peserta', 'Umum, Pelajar, Profesional');
  }
  return fields;
}

function formatHourMinute(minutes) {
  const normalized = ((Math.floor(minutes) % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hour = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minute = String(normalized % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function parseTimeRangeMinutesFromText(text) {
  const source = String(text || '').toLowerCase();
  if (!source) return null;

  const rangeHourOnly = source.match(/(?:jam\s*)?(\d{1,2})\s*(?:pagi|siang|sore|malam)?\s*[-–]\s*(\d{1,2})\s*(?:pagi|siang|sore|malam)?/i);
  if (rangeHourOnly) {
    const startHour = Number(rangeHourOnly[1]);
    const endHour = Number(rangeHourOnly[2]);
    if (Number.isFinite(startHour) && Number.isFinite(endHour)) {
      return { start: Math.max(0, Math.min(23, startHour)) * 60, end: Math.max(0, Math.min(23, endHour)) * 60 };
    }
  }

  const rangeWithMinute = source.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (rangeWithMinute) {
    const startHour = Number(rangeWithMinute[1]);
    const startMinute = Number(rangeWithMinute[2]);
    const endHour = Number(rangeWithMinute[3]);
    const endMinute = Number(rangeWithMinute[4]);
    if ([startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
      return {
        start: Math.max(0, Math.min(23, startHour)) * 60 + Math.max(0, Math.min(59, startMinute)),
        end: Math.max(0, Math.min(23, endHour)) * 60 + Math.max(0, Math.min(59, endMinute))
      };
    }
  }

  return null;
}

function monthNameToNumber(rawMonth) {
  const value = String(rawMonth || '').trim().toLowerCase();
  const map = {
    januari: 1,
    feb: 2,
    februari: 2,
    mar: 3,
    maret: 3,
    apr: 4,
    april: 4,
    mei: 5,
    jun: 6,
    juni: 6,
    jul: 7,
    juli: 7,
    agu: 8,
    agustus: 8,
    sep: 9,
    september: 9,
    okt: 10,
    oktober: 10,
    nov: 11,
    november: 11,
    des: 12,
    desember: 12
  };
  return map[value] || null;
}

function to24Hour(hourInput, period = '') {
  let hour = Number(hourInput);
  if (!Number.isFinite(hour)) return null;
  hour = Math.max(0, Math.min(23, Math.floor(hour)));
  const p = String(period || '').trim().toLowerCase();
  if (!p) return hour;
  if (p === 'siang' && hour >= 1 && hour <= 11) return Math.min(23, hour + 12);
  if (p === 'sore' && hour >= 1 && hour <= 11) return Math.min(23, hour + 12);
  if (p === 'malam' && hour >= 1 && hour <= 11) return Math.min(23, hour + 12);
  return hour;
}

function parseStartAtInputFromBrief(brief, fallbackStartAt = '') {
  const text = String(brief || '').trim();
  if (!text) return String(fallbackStartAt || '').trim();

  let day = null;
  let month = null;
  let year = null;

  const dateWithMonthName = text.match(/(?:tgl|tanggal)?\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i);
  if (dateWithMonthName) {
    day = Number(dateWithMonthName[1]);
    month = monthNameToNumber(dateWithMonthName[2]);
    year = Number(dateWithMonthName[3]);
  } else {
    const dateNumeric = text.match(/(?:tgl|tanggal)?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
    if (dateNumeric) {
      day = Number(dateNumeric[1]);
      month = Number(dateNumeric[2]);
      year = Number(dateNumeric[3]);
    }
  }

  const explicitRange = parseTimeRangeMinutesFromText(text);
  let hour = explicitRange ? Math.floor(explicitRange.start / 60) : null;
  let minute = explicitRange ? explicitRange.start % 60 : 0;
  if (hour === null) {
    const timeMatch = text.match(/(?:jam\s*)?(\d{1,2})(?::(\d{2}))?\s*(pagi|siang|sore|malam)?/i);
    if (timeMatch) {
      hour = to24Hour(timeMatch[1], timeMatch[3]);
      minute = Number(timeMatch[2] || 0);
    }
  }

  const fallback = String(fallbackStartAt || '').trim();
  if (!day || !month || !year) {
    if (fallback) return fallback;
    return '';
  }
  if (!Number.isFinite(hour) || hour === null) {
    if (fallback) return fallback;
    hour = 8;
    minute = 0;
  }
  const yyyy = String(year).padStart(4, '0');
  const mm = String(Math.max(1, Math.min(12, month))).padStart(2, '0');
  const dd = String(Math.max(1, Math.min(31, day))).padStart(2, '0');
  const hh = String(Math.max(0, Math.min(23, hour))).padStart(2, '0');
  const min = String(Math.max(0, Math.min(59, minute))).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function titleCaseWords(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function stripTicketPriceTerms(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  return source
    .replace(/\b(?:harga|price)\s*(?:tiket|ticket)?\s*(?:masuk)?\s*[:=]?\s*(?:rp|idr)?\s*[\d.,]+(?:\s*(?:rb|ribu|k|jt|juta))?\b/gi, '')
    .replace(/\b(?:tiket|ticket)\s*(?:masuk)?\s*(?:[:=])?\s*(?:rp|idr)?\s*[\d.,]+(?:\s*(?:rb|ribu|k|jt|juta))?\b/gi, '')
    .replace(/\b(?:rp|idr)\s*[\d.,]+(?:\s*(?:rb|ribu|k|jt|juta))?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,:;.\-@|]+\s*$/g, '')
    .trim();
}

function extractBriefContext(brief) {
  const clean = String(brief || '').trim();
  const source = clean.toLowerCase();

  const topicMatch = clean.match(/topik(?:nya)?\s*(?:tentang|:)\s*([^.,\n]+)/i);
  const topic = stripTicketPriceTerms(String(topicMatch?.[1] || '').trim());

  const locationMatch = clean.match(/di\s+(.+?)(?=\s*(?:tgl|tanggal|jam|,|\d{1,2}\s*(?:pagi|siang|sore|malam)|\d{1,2}:\d{2}|$))/i);
  const location = String(locationMatch?.[1] || '').trim();

  const isArt = /lukis|lukisan|pameran|gallery|galeri|exhibition|art/.test(source);
  const isPainting = /lukis|lukisan|painting/.test(source);

  const baseIntent = clean
    .replace(/^saya\s+(mau|ingin)\s+mengadakan\s+/i, '')
    .replace(/^kami\s+(mau|ingin)\s+mengadakan\s+/i, '')
    .replace(/topik(?:nya)?\s*(?:tentang|:).*/i, '')
    .replace(/\b(?:harga|price)\s*(?:tiket|ticket)?\s*(?:masuk)?\s*[:=]?\s*(?:rp|idr)?\s*[\d.,]+(?:\s*(?:rb|ribu|k|jt|juta))?\b/gi, '')
    .replace(/\b(?:tiket|ticket)\s*(?:masuk)?\s*(?:[:=])?\s*(?:rp|idr)?\s*[\d.,]+(?:\s*(?:rb|ribu|k|jt|juta))?\b/gi, '')
    .replace(/\s+(di|tgl|tanggal|jam)\b.*/i, '')
    .replace(/[.,]+$/g, '')
    .trim();

  return {
    topic: topic || '',
    location: location || '',
    baseIntent: baseIntent || '',
    isArt,
    isPainting
  };
}

function buildScheduleTemplate(startAtValue, title, contextText = '') {
  const rawStart = String(startAtValue || '').trim();
  const explicitRange = parseTimeRangeMinutesFromText(contextText);
  const fallbackStart = rawStart && rawStart.includes('T') ? rawStart.slice(11, 16) : '08:00';
  const fallbackStartMinutes = Number(fallbackStart.slice(0, 2)) * 60 + Number(fallbackStart.slice(3, 5));
  const startMinutes = explicitRange?.start ?? fallbackStartMinutes;
  const endMinutes = explicitRange?.end ?? (startMinutes + 180);
  const mainStartMinutes = startMinutes + 45;
  const closingMinutes = Math.max(mainStartMinutes + 30, endMinutes - 30);

  const eventTitle = String(title || 'Main Session').trim() || 'Main Session';
  const isArt = /art|lukis|lukisan|pameran|gallery|exhibition|curator|karya/i.test(
    `${eventTitle} ${contextText}`
  );
  const registrationNote = isArt ? 'Verifikasi tamu & tiket masuk' : 'Verifikasi data peserta';
  const openingNote = isArt ? 'Opening remarks dari curator/host' : 'Briefing singkat dari trainer';
  const coreNote = isArt ? 'Sesi pameran utama & tur karya' : 'Sesi inti';
  const closingTitle = isArt ? 'Closing & networking' : 'Cooldown & networking';
  const closingNote = isArt ? 'Penutupan pameran dan sesi networking' : 'Penutup dan dokumentasi';

  return [
    `${formatHourMinute(startMinutes)} | Registrasi peserta | ${registrationNote}`,
    `${formatHourMinute(startMinutes + 15)} | Opening | ${openingNote}`,
    `${formatHourMinute(mainStartMinutes)} | ${eventTitle} | ${coreNote}`,
    `${formatHourMinute(closingMinutes)} | ${closingTitle} | ${closingNote}`
  ].join('\n');
}

function generateDraftFromBrief(brief, currentStartAt = '') {
  const clean = String(brief || '').trim();
  const context = extractBriefContext(clean);
  const categories = suggestCategoriesFromText(clean);
  const startAtInput = parseStartAtInputFromBrief(clean, currentStartAt);
  const range = parseTimeRangeMinutesFromText(clean);
  const durationMinutes = range && Number.isFinite(range.end) && Number.isFinite(range.start)
    ? Math.max(60, range.end - range.start)
    : 180;
  const durationHours = Math.max(1, Math.ceil(durationMinutes / 60));
  const topicLabel = titleCaseWords(context.topic || 'Budaya Indonesia');
  const locationLabel = context.location ? titleCaseWords(context.location) : '';

  let normalizedTopic = '';
  if (context.isArt && context.isPainting) {
    normalizedTopic = `Pameran Lukisan ${topicLabel}${locationLabel ? ` @ ${locationLabel}` : ''}`;
  } else if (context.isArt) {
    normalizedTopic = `Pameran Seni ${topicLabel}${locationLabel ? ` @ ${locationLabel}` : ''}`;
  } else {
    const fallback = context.baseIntent || clean.split(/[.\n]/)[0] || 'Community Training Session';
    normalizedTopic = sentenceCase(fallback.replace(/^tema[:\s-]*/i, ''));
  }
  normalizedTopic = normalizedTopic.slice(0, 90).trim() || 'Community Training Session';

  const isArt = categories.some((item) => /art/i.test(String(item || ''))) || context.isArt;
  const suggestedPrice = (() => {
    if (isArt) {
      const base = 50000;
      const addByHour = Math.max(0, durationHours - 3) * 15000;
      return Math.min(500000, base + addByHour);
    }
    const base = 25000;
    const addByHour = Math.max(0, durationHours - 2) * 10000;
    return Math.min(300000, base + addByHour);
  })();
  const description = isArt
    ? [
      `${normalizedTopic} bertema ${topicLabel} dan menghadirkan pengalaman pameran yang kuratorial, nyaman, dan mudah diakses publik.`,
      'Format sesi meliputi registrasi tamu, opening, sesi pameran utama, lalu penutupan dengan networking.',
      'Cocok untuk pecinta seni, kolektor, dan komunitas kreatif yang ingin menikmati karya dalam satu hari penuh.'
    ].join(' ')
    : [
      `${normalizedTopic} dirancang untuk peserta yang ingin latihan terarah dalam suasana komunitas.`,
      'Format sesi dibuat praktis: briefing singkat, sesi utama, lalu cooldown dan networking.',
      'Cocok untuk pemula maupun peserta rutin dengan penyesuaian intensitas di lapangan.'
    ].join(' ');
  return {
    eventName: normalizedTopic,
    description,
    categories,
    scheduleText: buildScheduleTemplate(startAtInput || currentStartAt, normalizedTopic, clean),
    imageKeyword: `${categories[0]} ${topicLabel} event`,
    durationMinutes,
    suggestedPrice,
    startAtInput
  };
}

function pickRandom(items = [], fallback = '') {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (list.length === 0) return fallback;
  const index = Math.floor(Math.random() * list.length);
  return list[index] || fallback;
}

function buildCatchyTitle(baseText, categories = [], location = '') {
  const clean = sentenceCase(
    stripTicketPriceTerms(String(baseText || ''))
      .replace(/\s+/g, ' ')
      .replace(/[|]+/g, '-')
      .trim()
  );
  if (!clean) return '';
  const category = String(categories?.[0] || '').trim();
  const locationToken = titleCaseWords(String(location || '').split(',')[0] || '').trim();
  const isArt = /art|lukis|lukisan|pameran|gallery|exhibition|museum/i.test(`${clean} ${category}`);

  const prefixOptions = isArt ? TITLE_SUGGESTION_CONFIG.artPrefix : TITLE_SUGGESTION_CONFIG.genericPrefix;
  const suffixOptions = isArt ? TITLE_SUGGESTION_CONFIG.artSuffix : TITLE_SUGGESTION_CONFIG.genericSuffix;
  const fallbackCategory = isArt ? TITLE_SUGGESTION_CONFIG.artFallbackCategory : TITLE_SUGGESTION_CONFIG.genericFallbackCategory;
  const withMarker = `${pickRandom(prefixOptions, clean)} ${pickRandom(suffixOptions, category || TITLE_SUGGESTION_CONFIG.eventFallback)}`.trim();
  const options = [
    clean,
    `${clean}: ${withMarker}`,
    `${withMarker} | ${clean}`,
    `${clean} - ${category || fallbackCategory}`.trim(),
    locationToken ? `${withMarker} @ ${locationToken}` : '',
    locationToken ? `${clean} @ ${locationToken}` : ''
  ].filter(Boolean);
  return pickRandom(options, clean).slice(0, 110).trim();
}

function createEmptyEventForm() {
  return {
    brief_event: '',
    event_name: '',
    has_coach: true,
    trainer_name: '',
    coach_shares: [],
    location: '',
    image_url: '',
    description: '',
    categories_text: '',
    award_enabled: true,
    award_scopes: ['overall'],
    award_top_n: '1',
    gallery_images_text: '',
    schedule_items_text: '',
    start_at: '',
    price: '0',
    max_participants: '0',
    duration_value: '1',
    duration_unit: 'hours',
    registration_fields: [],
    pre_event_info_text: '',
    pre_event_attachments_text: '',
    post_event_info_text: '',
    post_event_attachments_text: ''
  };
}

function serializeEventForm(value) {
  const form = value && typeof value === 'object' ? value : createEmptyEventForm();
  const registrationFields = Array.isArray(form.registration_fields)
    ? form.registration_fields.map((item) => ({
      field_id: String(item?.field_id || ''),
      label: String(item?.label || ''),
      type: String(item?.type || 'free_type'),
      required: item?.required === undefined ? true : Boolean(item.required),
      options_text: String(item?.options_text || '')
    }))
    : [];
  return JSON.stringify({
    brief_event: String(form.brief_event || ''),
    event_name: String(form.event_name || ''),
    has_coach: form.has_coach !== false,
    trainer_name: String(form.trainer_name || ''),
    coach_shares: (Array.isArray(form.coach_shares) ? form.coach_shares : []).map((item) => ({
      coach_name: String(item?.coach_name || ''),
      share_percent: String(item?.share_percent || '')
    })),
    location: String(form.location || ''),
    image_url: String(form.image_url || ''),
    description: String(form.description || ''),
    categories_text: String(form.categories_text || ''),
    award_scopes: normalizeEventAwardScopes(form.award_scopes, ['overall']),
    award_top_n: String(form.award_top_n || '1'),
    gallery_images_text: String(form.gallery_images_text || ''),
    schedule_items_text: String(form.schedule_items_text || ''),
    start_at: String(form.start_at || ''),
    max_participants: String(form.max_participants || '0'),
    duration_value: String(form.duration_value || '1'),
    duration_unit: String(form.duration_unit || 'hours'),
    registration_fields: registrationFields,
    pre_event_info_text: String(form.pre_event_info_text || ''),
    pre_event_attachments_text: String(form.pre_event_attachments_text || ''),
    post_event_info_text: String(form.post_event_info_text || ''),
    post_event_attachments_text: String(form.post_event_attachments_text || '')
  });
}

function createEmptyClassForm() {
  return {
    class_type: 'open_access',
    class_name: '',
    title: '',
    description: '',
    location: '',
    image_url: '',
    gallery_images_text: '',
    has_coach: true,
    coach_id: '',
    trainer_name: '',
    coach_shares: [],
    category: '',
    category_id: '',
    categories_text: '',
    tags_text: '',
    custom_fields_text: '',
    registration_fields: [],
    schedule_mode: 'everyday',
    registration_period_mode: 'always_open',
    weekly_days: [],
    weekly_start_time: '',
    weekly_end_time: '',
    manual_schedule: [createEmptyClassManualSession()],
    capacity: '20',
    capacity_mode: 'limited',
    quota_mode: 'manual',
    validity_mode: 'fixed',
    price: '0',
    start_date: '',
    end_date: '',
    registration_start: '',
    registration_end: '',
    period_end_at: '',
    max_meetings: '0',
    validity_unit: 'none',
    validity_value: '',
    validity_anchor: 'activation',
    usage_mode: 'unlimited',
    usage_limit: '',
    usage_period: 'entire_validity',
    pre_event_info_text: '',
    pre_event_attachments_text: '',
    post_event_info_text: '',
    post_event_attachments_text: '',
    min_quota: '',
    max_quota: '',
    auto_start_when_quota_met: false
  };
}

function createEmptyClassTemplateWizard() {
  return {
    template: '',
    title: '',
    duration_months: '1',
    usage_limit: '8',
    price: '0',
    coach_name: ''
  };
}

function inferEventEditorTemplate(item) {
  const source = [
    item?.event_name,
    Array.isArray(item?.event_categories) ? item.event_categories.join(' ') : '',
    item?.description,
    item?.brief_event
  ]
    .join(' ')
    .toLowerCase();
  if (isAwardEnabled(item?.award_enabled, true) || /(race|run|competition|lomba|tournament|championship)/.test(source)) {
    return 'race_competition';
  }
  if (/(workshop|seminar|talk|webinar|bootcamp|masterclass)/.test(source)) {
    return 'workshop_seminar';
  }
  if (/(community|gathering|meetup|komunitas)/.test(source)) {
    return 'community_gathering';
  }
  if (/(class|training|course|pelatihan)/.test(source) || String(item?.trainer_name || '').trim()) {
    return 'class_training';
  }
  return 'custom';
}

function getEventEditorTemplateLabel(template) {
  return getAdminEventTemplateConfig(template)?.title || '';
}

function createEventFormFromTemplate(template) {
  return {
    ...createEmptyEventForm(),
    ...(getAdminEventTemplateConfig(template)?.formDefaults || {})
  };
}

function splitClassCustomFields(value, primaryCategory = '') {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const memberInfo = splitMemberInfoCustomFields(source);
  const registrationFields = Array.isArray(source.registration_fields)
    ? source.registration_fields.map(toRegistrationFieldForm)
    : [];
  const storedSeoTags = Array.isArray(source.seo_tags)
    ? source.seo_tags
    : (Array.isArray(source.category_tags) ? source.category_tags : []);
  const normalizedPrimaryCategory = String(primaryCategory || source.category || '').trim();
  const seoTags = [...new Set(
    storedSeoTags
      .map((item) => String(item || '').trim())
      .filter((item) => item && item !== normalizedPrimaryCategory)
  )];
  const registrationMode = String(source.registration_mode || '').trim().toLowerCase();
  const normalizedRegistrationMode = registrationMode === 'closed' || registrationMode === 'range_date'
    ? registrationMode
    : 'always_open';
  const {
    registration_fields: _registrationFields,
    category_tags: _categoryTags,
    registration_mode: _registrationMode,
    member_pre_info_text: _memberPreInfoText,
    member_pre_info_attachments: _memberPreInfoAttachments,
    member_post_info_text: _memberPostInfoText,
    member_post_info_attachments: _memberPostInfoAttachments,
    location: _location,
    image_url: _imageUrl,
    gallery_images: _galleryImages,
    ...rest
  } = source;
  return {
    registration_fields: registrationFields,
    metadata_text: Object.keys(rest).length > 0 ? JSON.stringify(rest, null, 2) : '',
    categories_text: normalizedPrimaryCategory,
    tags_text: seoTags.join(', '),
    registration_mode: normalizedRegistrationMode,
    location: String(source.location || ''),
    image_url: String(source.image_url || ''),
    gallery_images_text: Array.isArray(source.gallery_images) ? source.gallery_images.join('\n') : '',
    pre_event_info_text: memberInfo.pre_event_info_text,
    pre_event_attachments_text: memberInfo.pre_event_attachments_text,
    post_event_info_text: memberInfo.post_event_info_text,
    post_event_attachments_text: memberInfo.post_event_attachments_text
  };
}

function buildClassCustomFieldsPayload(formValue) {
  const base = applyMemberInfoCustomFields(
    parseCustomFieldsInput(formValue?.custom_fields_text || '', 'class'),
    formValue
  );
  const seoTags = normalizeEventCategoriesForPayload(formValue?.tags_text || '');
  const registrationFields = normalizeRegistrationFieldsForPayload(formValue?.registration_fields);
  const registrationMode = String(formValue?.registration_period_mode || 'always_open').trim().toLowerCase();
  if (seoTags.length > 0) {
    base.seo_tags = seoTags;
    base.category_tags = seoTags;
  } else {
    delete base.seo_tags;
    delete base.category_tags;
  }
  if (registrationFields.length > 0) {
    base.registration_fields = registrationFields;
  } else {
    delete base.registration_fields;
  }
  if (registrationMode === 'closed' || registrationMode === 'range_date') {
    base.registration_mode = registrationMode;
  } else {
    delete base.registration_mode;
  }
  if (String(formValue?.location || '').trim()) {
    base.location = String(formValue.location || '').trim();
  } else {
    delete base.location;
  }
  if (String(formValue?.image_url || '').trim()) {
    base.image_url = String(formValue.image_url || '').trim();
  } else {
    delete base.image_url;
  }
  const galleryImages = normalizeGalleryImagesForPayload(formValue?.gallery_images_text);
  if (galleryImages.length > 0) {
    base.gallery_images = galleryImages;
  } else {
    delete base.gallery_images;
  }
  return base;
}

function normalizeAttachmentUrlsText(value) {
  const rows = String(value || '')
    .split('\n')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return [...new Set(rows)];
}

function splitMemberInfoCustomFields(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const preAttachments = Array.isArray(source.member_pre_info_attachments)
    ? source.member_pre_info_attachments.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const postAttachments = Array.isArray(source.member_post_info_attachments)
    ? source.member_post_info_attachments.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  return {
    pre_event_info_text: String(source.member_pre_info_text || ''),
    pre_event_attachments_text: preAttachments.join('\n'),
    post_event_info_text: String(source.member_post_info_text || ''),
    post_event_attachments_text: postAttachments.join('\n')
  };
}

function applyMemberInfoCustomFields(baseValue, formValue) {
  const base = baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue) ? { ...baseValue } : {};
  const preText = String(formValue?.pre_event_info_text || '').trim();
  const preAttachments = normalizeAttachmentUrlsText(formValue?.pre_event_attachments_text);
  const postText = String(formValue?.post_event_info_text || '').trim();
  const postAttachments = normalizeAttachmentUrlsText(formValue?.post_event_attachments_text);

  if (preText) base.member_pre_info_text = preText;
  else delete base.member_pre_info_text;
  if (preAttachments.length > 0) base.member_pre_info_attachments = preAttachments;
  else delete base.member_pre_info_attachments;
  if (postText) base.member_post_info_text = postText;
  else delete base.member_post_info_text;
  if (postAttachments.length > 0) base.member_post_info_attachments = postAttachments;
  else delete base.member_post_info_attachments;

  return base;
}

function buildEventCustomFieldsPayload(formValue) {
  return applyMemberInfoCustomFields({}, formValue);
}

function getAttachmentNameFromUrl(url) {
  const value = String(url || '').trim();
  if (!value) return 'Attachment';
  const [path] = value.split('?');
  const tokens = path.split('/');
  return decodeURIComponent(tokens[tokens.length - 1] || 'Attachment');
}

function toCoachShareFormRows(value) {
  const items = Array.isArray(value) ? value : [];
  return items
    .map((item) => ({
      coach_name: String(item?.coach_name || item?.trainer_name || item?.name || '').trim(),
      share_percent: item?.share_percent === undefined || item?.share_percent === null || item?.share_percent === ''
        ? ''
        : String(item.share_percent)
    }))
    .filter((item) => item.coach_name);
}

function syncCoachSharesWithTrainerNames(trainerNameValue, coachSharesValue) {
  const trainerNames = parseTrainerTokens(trainerNameValue);
  const currentRows = toCoachShareFormRows(coachSharesValue);
  const currentMap = new Map(
    currentRows.map((item) => [String(item.coach_name || '').trim().toLowerCase(), item])
  );
  return trainerNames.map((name) => {
    const current = currentMap.get(String(name || '').trim().toLowerCase());
    return {
      coach_name: name,
      share_percent: String(current?.share_percent || '')
    };
  });
}

function sumCoachSharePercent(value) {
  return toCoachShareFormRows(value).reduce((total, item) => total + (Number(item.share_percent || 0) || 0), 0);
}

function normalizeCoachSharesForPayload(value, label = 'coach') {
  const rows = toCoachShareFormRows(value);
  const normalized = [];
  let total = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const percentRaw = String(row.share_percent || '').trim();
    if (!percentRaw) continue;
    const sharePercent = Number(percentRaw);
    if (!Number.isFinite(sharePercent) || sharePercent <= 0 || sharePercent > 100) {
      throw new Error(getAdminPageCopy('coachShareRangeRequired', { label, name: row.coach_name }));
    }
    total += sharePercent;
    normalized.push({
      coach_name: row.coach_name,
      share_percent: Number(sharePercent.toFixed(2))
    });
  }
  if (total > 100.000001) {
    throw new Error(getAdminPageCopy('coachShareTotalMax', { label }));
  }
  return normalized;
}

function upsertCoachShareValue(coachSharesValue, coachName, sharePercent) {
  const rows = toCoachShareFormRows(coachSharesValue);
  const normalizedCoachName = String(coachName || '').trim();
  let matched = false;
  const nextRows = rows.map((item) => {
    if (item.coach_name !== normalizedCoachName) return item;
    matched = true;
    return {
      ...item,
      share_percent: sharePercent
    };
  });
  if (!matched && normalizedCoachName) {
    nextRows.push({
      coach_name: normalizedCoachName,
      share_percent: sharePercent
    });
  }
  return nextRows;
}

function createEmptyEventWalkinForm(eventId = '') {
  return {
    event_id: eventId,
    full_name: '',
    email: '',
    registration_answers: {},
    error: ''
  };
}
const DEFAULT_TRAINERS = getAdminFixture('trainers');
const DEFAULT_PRODUCTS = getAdminFixture('products');
const DEFAULT_PACKAGES = getAdminFixture('packages');
const DEFAULT_SALES = getAdminFixture('sales');
const DEFAULT_MEMBERS = getAdminFixture('members');
const DEFAULT_TRANSACTIONS = getAdminFixture('transactions');

function createEmptyMemberForm() {
  return {
    member_name: '',
    phone: '',
    email: '',
    relations: []
  };
}

function toInputDatetime(value) {
  return getAppDateTimeInputValue(value);
}

function toInputDate(value) {
  return getAppDateInputValue(value);
}

function toApiDatetime(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.includes(':')) return toAppIsoFromDateTimeInput(raw);
  return toAppIsoFromDateInput(raw);
}

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsToInputDate(dateInput, monthsToAdd) {
  const base = String(dateInput || '').trim() || getTodayInputDate();
  const parsedMonths = Number(monthsToAdd || 0);
  const date = new Date(`${base}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return base;
  if (Number.isFinite(parsedMonths) && parsedMonths > 0) {
    date.setUTCMonth(date.getUTCMonth() + parsedMonths);
  }
  return date.toISOString().slice(0, 10);
}

function formatClassDatetime(value) {
  return formatAppDateTime(value);
}

function formatDateOnly(value) {
  return formatAppDate(value);
}

function resolveEventImage(item) {
  const direct = String(item?.image_url || '').trim();
  if (direct) return direct;
  const seed = encodeURIComponent(String(item?.event_id || item?.event_name || 'event'));
  return `https://picsum.photos/seed/${seed}/960/540`;
}

function resolveClassImage(item) {
  const customFields = item?.custom_fields && typeof item.custom_fields === 'object' && !Array.isArray(item.custom_fields)
    ? item.custom_fields
    : {};
  const direct = String(customFields.image_url || item?.image_url || '').trim();
  if (direct) return direct;
  const seed = encodeURIComponent(String(item?.class_id || item?.class_name || 'program'));
  return `https://picsum.photos/seed/${seed}/960/540`;
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function normalizeClassScheduleForPayload(form) {
  const scheduleMode = String(form?.schedule_mode || 'everyday').trim().toLowerCase();
  if (!['everyday', 'weekly', 'manual', 'none'].includes(scheduleMode)) {
    throw new Error(getAdminPageCopy('classScheduleModeInvalid'));
  }
  if (scheduleMode === 'none') {
    return {
      schedule_mode: 'none',
      weekly_schedule: {
        weekdays: [],
        start_time: '',
        end_time: ''
      },
      manual_schedule: []
    };
  }
  if (scheduleMode === 'everyday') {
    const startTime = String(form?.weekly_start_time || '').trim();
    const endTime = String(form?.weekly_end_time || '').trim();
    if (!startTime || !endTime) {
      throw new Error(getAdminPageCopy('classEverydayTimeRequired'));
    }
    return {
      schedule_mode: 'everyday',
      weekly_schedule: {
        weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        start_time: startTime,
        end_time: endTime
      },
      manual_schedule: []
    };
  }
  if (scheduleMode === 'weekly') {
    const weekdays = [...new Set(
      (Array.isArray(form?.weekly_days) ? form.weekly_days : [])
        .map((item) => String(item || '').trim().toLowerCase())
        .filter((item) => CLASS_WEEKDAYS.some((day) => day.value === item))
    )];
    const startTime = String(form?.weekly_start_time || '').trim();
    const endTime = String(form?.weekly_end_time || '').trim();
    if (weekdays.length > 0 && (!startTime || !endTime)) {
      throw new Error(getAdminPageCopy('classWeeklyTimeRequired'));
    }
    return {
      schedule_mode: 'weekly',
      weekly_schedule: {
        weekdays,
        start_time: startTime,
        end_time: endTime
      },
      manual_schedule: []
    };
  }
  const manualSchedule = (Array.isArray(form?.manual_schedule) ? form.manual_schedule : [])
    .map((item) => ({
      start_at: toApiDatetime(item?.start_at || ''),
      end_at: toApiDatetime(item?.end_at || '')
    }))
    .filter((item) => item.start_at || item.end_at);
  manualSchedule.forEach((item, index) => {
    if (!item.start_at || !item.end_at) {
      throw new Error(getAdminPageCopy('classManualScheduleRangeRequired', { index: index + 1 }));
    }
    if (new Date(item.end_at).getTime() <= new Date(item.start_at).getTime()) {
      throw new Error(getAdminPageCopy('classManualScheduleEndAfterStartRequired', { index: index + 1 }));
    }
  });
  return {
    schedule_mode: 'manual',
    weekly_schedule: {
      weekdays: [],
      start_time: '',
      end_time: ''
    },
    manual_schedule: manualSchedule
  };
}

function resolveClassTypeForForm(form) {
  const usageMode = String(form?.usage_mode || 'unlimited').trim().toLowerCase();
  return usageMode === 'limited' ? 'session_pack' : 'open_access';
}

function inferClassEditorTemplate(item) {
  const scheduleMode = String(item?.schedule_mode || 'none').trim().toLowerCase();
  const normalizedType = String(item?.class_type || 'open_access').trim().toLowerCase();
  const hasCoach = item?.has_coach !== false;
  if (normalizedType === 'session_pack' && hasCoach) return 'personal_training';
  if (normalizedType === 'open_access' && !hasCoach) return 'membership';
  if (scheduleMode !== 'none') return 'activity_class';
  return 'custom';
}

function getClassEditorTemplateLabel(template) {
  return getAdminClassTemplateConfig(template)?.title || '';
}

function createClassFormFromTemplate(template) {
  return {
    ...createEmptyClassForm(),
    ...(getAdminClassTemplateConfig(template)?.formDefaults || {})
  };
}

function normalizeClassRegistrationMode(value) {
  const normalized = String(value || 'always_open').trim().toLowerCase();
  if (normalized === 'closed' || normalized === 'range_date') return normalized;
  return 'always_open';
}

function createClosedRegistrationPayload() {
  const registrationEnd = new Date();
  const registrationStart = new Date(registrationEnd.getTime() - 60 * 1000);
  return {
    registration_start: registrationStart.toISOString(),
    registration_end: registrationEnd.toISOString()
  };
}

function getActivityFieldGuide(classType) {
  const normalizedType = String(classType || 'scheduled').trim().toLowerCase();
  if (normalizedType === 'open_access') {
    return {
      summary: 'Open access cocok untuk membership atau akses periode tanpa sesi wajib.',
      duration: 'Isi `Duration` untuk lama aktif paket. Pilih `Unlimited` jika akses tidak punya masa berlaku.',
      activation: 'Pilih `Activation / Start` untuk menentukan akses mulai dari first date, purchase, atau fixed date.',
      usage: 'Gunakan `Usage Mode = unlimited` bila tidak ada batas pemakaian. Pilih `limited` bila ada batas kunjungan.',
      registration: 'Pilih `Always open` untuk registrasi selalu buka, `Range of date` untuk jendela pendaftaran, atau `Closed` untuk menutup registrasi.',
      capacity: 'Pilih `Unlimited` bila tidak ada batas holder. Gunakan `Min / Max cap` jika jumlah enrollment perlu dibatasi.'
    };
  }
  if (normalizedType === 'session_pack') {
    return {
      summary: 'Session pack cocok untuk paket kredit atau jumlah sesi tertentu, misalnya 4x atau 8x.',
      duration: 'Isi `Duration` untuk masa aktif paket, misalnya 1 bulan atau 3 bulan.',
      activation: 'Pilih `Activation / Start` untuk menentukan kapan masa aktif paket mulai dihitung.',
      usage: 'Gunakan `Usage Mode = limited` lalu isi limit dan periodenya, misalnya 4 kali per bulan.',
      registration: 'Pilih `Always open` jika paket selalu bisa dibeli, atau `Range of date` jika penjualan hanya dibuka di periode tertentu.',
      capacity: 'Biasanya `Unlimited`, kecuali Anda ingin membatasi jumlah paket aktif yang bisa dijual.'
    };
  }
  return {
    summary: 'Scheduled cocok untuk kelas batch atau kalender tetap dengan peserta yang mengikuti periode yang sama.',
    duration: 'Gunakan periode mulai dan akhir untuk menentukan jendela aktivitas kelas.',
    activation: 'Model ini dipakai saat tanggal kelas sudah ditentukan dari awal.',
    usage: 'Atur jumlah pertemuan dan jadwal agar peserta mengikuti kalender kelas yang sudah disiapkan.',
    registration: 'Gunakan registration period bila pendaftaran hanya dibuka pada rentang tanggal tertentu.',
    capacity: 'Isi min dan max quota untuk membatasi jumlah peserta dalam satu kelas.'
  };
}

function formatActivityUnitSummary(unit, value) {
  const normalizedUnit = String(unit || 'none').trim().toLowerCase();
  const numericValue = Number(value || 0);
  if (normalizedUnit === 'none') return 'tanpa expiry';
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '-';
  if (normalizedUnit === 'day') return `${numericValue} hari`;
  if (normalizedUnit === 'week') return `${numericValue} minggu`;
  if (normalizedUnit === 'month') return `${numericValue} bulan`;
  if (normalizedUnit === 'year') return `${numericValue} tahun`;
  return `${numericValue} ${normalizedUnit}`;
}

function formatValidityAnchorSummary(anchor) {
  const normalizedAnchor = String(anchor || 'activation').trim().toLowerCase();
  if (normalizedAnchor === 'purchase') return 'mulai saat purchase';
  if (normalizedAnchor === 'fixed_start') return 'mulai di fixed date';
  return 'mulai saat first date';
}

function formatUsageSummary(mode, limit, period) {
  const normalizedMode = String(mode || 'unlimited').trim().toLowerCase();
  if (normalizedMode !== 'limited') return 'unlimited';
  const numericLimit = Number(limit || 0);
  const safeLimit = Number.isFinite(numericLimit) && numericLimit > 0 ? numericLimit : 0;
  const normalizedPeriod = String(period || 'entire_validity').trim().toLowerCase();
  if (normalizedPeriod === 'per_day') return safeLimit > 0 ? `maks ${safeLimit} kali per hari` : 'limited per hari';
  if (normalizedPeriod === 'per_week') return safeLimit > 0 ? `maks ${safeLimit} kali per minggu` : 'limited per minggu';
  if (normalizedPeriod === 'per_month') return safeLimit > 0 ? `maks ${safeLimit} kali per bulan` : 'limited per bulan';
  return safeLimit > 0 ? `maks ${safeLimit} kali selama masa aktif` : 'limited selama masa aktif';
}

function formatRegistrationSummary(mode, registrationStart, registrationEnd) {
  const normalizedMode = normalizeClassRegistrationMode(mode);
  if (normalizedMode === 'closed') return 'Registrasi ditutup.';
  if (normalizedMode === 'range_date') {
    const startLabel = registrationStart ? formatDateTime(registrationStart) : '-';
    const endLabel = registrationEnd ? formatDateTime(registrationEnd) : '-';
    return `Registrasi buka ${startLabel} sampai ${endLabel}.`;
  }
  return 'Registrasi selalu terbuka.';
}

function formatClassAccessConfigurationSummary(form) {
  const classType = String(form?.class_type || 'scheduled').trim().toLowerCase();
  if (classType === 'scheduled') return [];
  const amount = Number(form?.price || 0);
  const priceLabel = Number.isFinite(amount) && amount > 0
    ? `Harga jual: Rp${IDR_FORMATTER.format(amount)} per enrollment.`
    : 'Harga jual: gratis / belum diisi.';
  const validityLabel = formatActivityUnitSummary(form?.validity_unit, form?.validity_value);
  const anchorLabel = formatValidityAnchorSummary(form?.validity_anchor);
  const usageLabel = formatUsageSummary(form?.usage_mode, form?.usage_limit, form?.usage_period);
  const registrationLabel = formatRegistrationSummary(
    form?.registration_period_mode,
    form?.registration_start,
    form?.registration_end
  );

  if (classType === 'open_access') {
    return [
      priceLabel,
      `Masa aktif: ${validityLabel}, ${anchorLabel}.`,
      `Pemakaian: ${usageLabel}.`,
      registrationLabel
    ];
  }

  return [
    priceLabel,
    `Benefit: ${usageLabel}.`,
    `Masa aktif paket: ${validityLabel}, ${anchorLabel}.`,
    registrationLabel
  ];
}
function formatActivityAccessSummary(item) {
  const classType = String(item?.class_type || 'scheduled').trim().toLowerCase();
  if (classType === 'open_access') {
    const unit = String(item?.validity_unit || '').trim().toLowerCase();
    const value = Number(item?.validity_value || 0);
    if (!unit || unit === 'none' || value <= 0) return 'Open access';
    return `${value} ${unit}${value > 1 ? 's' : ''}`;
  }
  if (classType === 'session_pack') {
    if (String(item?.usage_mode || '').trim().toLowerCase() === 'limited' && Number(item?.usage_limit || 0) > 0) {
      return `${item.usage_limit} sesi`;
    }
    return 'Session pack';
  }
  return '-';
}

function formatClassScheduleSummary(item) {
  const classType = String(item?.class_type || 'scheduled').trim().toLowerCase();
  if (classType !== 'scheduled') {
    return formatActivityAccessSummary(item);
  }
  const scheduleMode = String(item?.schedule_mode || 'weekly').trim().toLowerCase();
  if (scheduleMode === 'everyday') {
    const weeklySchedule = item?.weekly_schedule || {};
    return weeklySchedule.start_time && weeklySchedule.end_time
      ? `Everyday | ${weeklySchedule.start_time}-${weeklySchedule.end_time}`
      : 'Everyday';
  }
  if (scheduleMode === 'manual') {
    const total = Array.isArray(item?.manual_schedule) ? item.manual_schedule.length : 0;
    return total > 0 ? `Manual (${total} sesi)` : 'Manual';
  }
  const weeklySchedule = item?.weekly_schedule || {};
  const weekdays = Array.isArray(weeklySchedule.weekdays) ? weeklySchedule.weekdays : [];
  const labels = weekdays
    .map((value) => CLASS_WEEKDAYS.find((day) => day.value === value)?.label || String(value || '').toUpperCase())
    .filter(Boolean);
  const timeLabel = weeklySchedule.start_time && weeklySchedule.end_time
    ? `${weeklySchedule.start_time}-${weeklySchedule.end_time}`
    : '';
  if (labels.length === 0 && !timeLabel) return '-';
  return [labels.join(', '), timeLabel].filter(Boolean).join(' | ');
}

function parseCustomFieldsInput(raw, label) {
  const source = String(raw || '').trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(getAdminPageCopy('customFieldsObjectRequired', { label }));
    }
    return parsed;
  } catch {
    throw new Error(getAdminPageCopy('customFieldsInvalidJson', { label }));
  }
}

function resolvePaymentReferenceLabel(item, lookups = {}) {
  const referenceType = String(item?.reference_type || '').trim().toLowerCase();
  const referenceId = String(item?.reference_id || '').trim();
  const productsById = lookups.productsById || new Map();
  const packagesById = lookups.packagesById || new Map();
  const eventsById = lookups.eventsById || new Map();
  const classesById = lookups.classesById || new Map();

  if (referenceType === 'event_posting') {
    const eventName = eventsById.get(referenceId) || referenceId || '-';
    return `Event Posting - ${eventName}`;
  }
  if (referenceType === 'event_registration') {
    const eventName = eventsById.get(referenceId) || referenceId || '-';
    return `Event Registration - ${eventName}`;
  }
  if (referenceType === 'membership_purchase') {
    const packageName = packagesById.get(referenceId) || referenceId || item?.subscription_id || '-';
    return `Membership - ${packageName}`;
  }
  if (referenceType === 'activity_purchase' || referenceType === 'open_access_purchase' || referenceType === 'session_pack_purchase') {
    const className = classesById.get(referenceId) || referenceId || '-';
    return `Activity - ${className}`;
  }
  if (referenceType === 'pt_package' || referenceType === 'pt_package_purchase') {
    const packageName = packagesById.get(referenceId) || referenceId || '-';
    return `PT Package - ${packageName}`;
  }
  if (referenceType === 'class_booking') {
    const className = classesById.get(referenceId) || referenceId || '-';
    return `Class Booking - ${className}`;
  }
  if (referenceType === 'product_purchase' || referenceType === 'product') {
    const productName = productsById.get(referenceId) || referenceId || '-';
    return `Product - ${productName}`;
  }
  if (referenceType === 'manual') {
    return `Manual - ${referenceId || '-'}`;
  }
  return referenceType || referenceId ? `${referenceType || 'payment'}:${referenceId || '-'}` : item?.subscription_id || '-';
}

function resolvePaymentOperationLink(item, lookups = {}) {
  const subscriptionsByPaymentId = lookups.subscriptionsByPaymentId || new Map();
  const bookingsByPaymentId = lookups.bookingsByPaymentId || new Map();
  const ptPackagesByPaymentId = lookups.ptPackagesByPaymentId || new Map();
  const paymentId = String(item?.payment_id || '').trim();
  if (!paymentId) return '-';
  if (subscriptionsByPaymentId.has(paymentId)) {
    return `subscription:${subscriptionsByPaymentId.get(paymentId)}`;
  }
  if (bookingsByPaymentId.has(paymentId)) {
    return `booking:${bookingsByPaymentId.get(paymentId)}`;
  }
  if (ptPackagesByPaymentId.has(paymentId)) {
    return `pt_package:${ptPackagesByPaymentId.get(paymentId)}`;
  }
  return '-';
}

function estimateEventPostingPrice(durationMinutes) {
  const blocks = Math.max(1, Math.ceil(Number(durationMinutes || 60) / 60));
  return blocks * 99000;
}

function isPublishedStatus(status) {
  return isConfiguredAdminEventPublishedStatus(status);
}

function displayEventStatus(status) {
  return getAdminEventStatusLabel(status);
}

function toRegistrationFieldForm(item, index) {
  const type = String(item?.type || 'free_type').toLowerCase();
  return {
    field_id: String(item?.field_id || `rf_${Date.now()}_${index}`),
    label: String(item?.label || ''),
    type: type === 'date' || type === 'lookup' ? type : 'free_type',
    required: item?.required === undefined ? true : Boolean(item.required),
    options_text: Array.isArray(item?.options) ? item.options.join(', ') : ''
  };
}

function createRegistrationField(type = 'free_type') {
  return {
    field_id: `rf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    type: type === 'date' || type === 'lookup' ? type : 'free_type',
    required: true,
    options_text: ''
  };
}

function normalizeRegistrationFieldsForPayload(fields) {
  const normalized = Array.isArray(fields) ? fields : [];
  const result = [];
  for (let i = 0; i < normalized.length; i += 1) {
    const item = normalized[i];
    const label = String(item?.label || '').trim();
    if (!label) {
      throw new Error(getAdminPageCopy('registrationFieldLabelRequired', { index: i + 1 }));
    }
    const typeRaw = String(item?.type || 'free_type').toLowerCase();
    const type = typeRaw === 'date' || typeRaw === 'lookup' ? typeRaw : 'free_type';
    const payload = {
      field_id: String(item?.field_id || `rf_${Date.now()}_${i}`),
      label,
      type,
      required: item?.required === undefined ? true : Boolean(item.required)
    };
    if (type === 'lookup') {
      const options = String(item?.options_text || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (options.length === 0) {
        throw new Error(getAdminPageCopy('registrationFieldLookupOptionsRequired', { label }));
      }
      payload.options = options;
    } else {
      payload.options = [];
    }
    result.push(payload);
  }
  return result;
}

function normalizeGalleryImagesForPayload(value) {
  return String(value || '')
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean);
}

function scheduleItemsToText(items) {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => {
      const time = String(item?.time || '').trim();
      const title = String(item?.title || '').trim();
      const note = String(item?.note || '').trim();
      return `${time} | ${title} | ${note}`;
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeScheduleItemsForPayload(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const [time = '', title = '', note = ''] = line.split('|').map((part) => part.trim());
    return { time, title, note };
  });
}

function normalizeEventCategoriesForPayload(text) {
  return [...new Set(
    String(text || '')
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function normalizeEventAwardScopes(value, fallback = ['overall']) {
  const allowed = new Set(['overall', 'category']);
  const source = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === ''
      ? fallback
      : [value];
  const normalized = [...new Set(
    source
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => allowed.has(item))
  )];
  if (normalized.length > 0) return normalized;
  const fallbackNormalized = [...new Set(
    (Array.isArray(fallback) ? fallback : [fallback])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => allowed.has(item))
  )];
  return fallbackNormalized.length > 0 ? fallbackNormalized : ['overall'];
}

function formatEventAwardScopes(value) {
  const scopes = normalizeEventAwardScopes(value, ['overall']);
  const labels = [];
  if (scopes.includes('overall')) labels.push('Overall');
  if (scopes.includes('category')) labels.push('Per kategori');
  return labels.join(', ') || 'Overall';
}

function isAwardEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
  if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  return fallback;
}

function normalizeAwardTopN(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.max(1, Number(fallback) || 1);
  return Math.max(1, Math.floor(parsed));
}

function parseTrainerTokens(value) {
  return [...new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function normalizeEmailValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeMemberRelationTokens(value) {
  const items = Array.isArray(value) ? value : [];
  const result = [];
  const seen = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const kind = String(item.kind || '').trim().toLowerCase();
    const id = String(item.id || '').trim();
    const label = String(item.label || '').trim();
    if ((kind !== 'class' && kind !== 'event') || !id) continue;
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      kind,
      id,
      label: label || `${kind === 'class' ? 'Class' : 'Event'}: ${id}`
    });
  }
  return result;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map((item) => item.trim());
}

function parseMemberCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map((item) => normalizeToken(item).replace(/\s+/g, '_'));
  return lines.slice(1).map((line, index) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((header, colIndex) => {
      row[header] = cols[colIndex] || '';
    });
    return {
      member_name: row.member_name || row.full_name || row.nama || row.name || '',
      phone: row.phone || row.no_hp || row.hp || row.mobile || '',
      email: row.email || '',
      row_number: index + 2
    };
  });
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function compactCode(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12);
}

function getEventCategoryExamplesByIndustry(industrySlug) {
  const slug = String(industrySlug || '').trim().toLowerCase();
  if (slug === 'learning') return ['Workshop Dasar', 'Workshop Lanjutan', 'Sertifikasi'];
  if (slug === 'performance') return ['Konser Akustik', 'Festival Musik', 'VIP'];
  if (slug === 'arts') return ['Pameran Lukis', 'Gallery Opening', 'Art Talk'];
  if (slug === 'tourism') return ['City Tour', 'Sunrise Trip', 'Family Package'];
  return ['Running 5K', 'Running 10K', 'Beginner Friendly'];
}

function getClassCategoryExamplesByType(classType) {
  const normalized = String(classType || 'scheduled').trim().toLowerCase();
  if (normalized === 'open_access') return ['Gym Access', 'Open Studio', 'Membership'];
  if (normalized === 'session_pack') return ['PT Pack', 'Pilates Pack', 'Reformer Pack'];
  return ['Yoga', 'HIIT', 'Boxing'];
}

function toCategoryId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatRegistrationAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '-';
  const entries = Object.entries(value)
    .map(([key, answer]) => {
      const label = String(key || '').trim();
      const content = String(answer || '').trim();
      if (!label || !content) return '';
      return `${label}: ${content}`;
    })
    .filter(Boolean);
  return entries.length > 0 ? entries.join(' | ') : '-';
}

function csvEscape(value) {
  const raw = String(value ?? '');
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function shuffleList(items) {
  const next = Array.isArray(items) ? [...items] : [];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getStorageKey(entity, accountSlug) {
  return `ff.admin.${entity}.${accountSlug || 'foremoz-gym'}`;
}

function loadList(entity, accountSlug, fallbackList) {
  if (typeof window === 'undefined') return fallbackList;
  try {
    const saved = JSON.parse(localStorage.getItem(getStorageKey(entity, accountSlug)) || 'null');
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {
    // ignore invalid payload and fallback to defaults
  }
  return fallbackList;
}

function loadMap(entity, accountSlug, fallbackValue = {}) {
  if (typeof window === 'undefined') return fallbackValue;
  try {
    const saved = JSON.parse(localStorage.getItem(getStorageKey(entity, accountSlug)) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
  } catch {
    // ignore invalid payload and fallback
  }
  return fallbackValue;
}

function DeleteButton({ onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="admin-action-chip"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      delete
    </span>
  );
}

function ViewButton({ onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="admin-action-chip"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      view
    </span>
  );
}

function ShareButton({ onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="admin-action-chip"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      share
    </span>
  );
}

function ParticipantsButton({ onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className="admin-action-chip"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      participants
    </span>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { language } = useI18n();
  const role = String(session?.role || 'admin').toLowerCase();
  const accountSlug = getAccountSlug(session);
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const [targetEnv, setTargetEnv] = useState('admin');
  const [activeTab, setActiveTab] = useState('class');
  const [eventMode, setEventMode] = useState('list');
  const [userMode, setUserMode] = useState('list');
  const [classMode, setClassMode] = useState('list');
  const [productMode, setProductMode] = useState('list');
  const [packageMode, setPackageMode] = useState('list');
  const [trainerMode, setTrainerMode] = useState('list');
  const [salesMode, setSalesMode] = useState('list');
  const [memberMode, setMemberMode] = useState('list');
  const [transactionMode, setTransactionMode] = useState('list');
  const [feedback, setFeedback] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [classLoading, setClassLoading] = useState(false);
  const [classSaving, setClassSaving] = useState(false);
  const [classParticipantsLoading, setClassParticipantsLoading] = useState(false);
  const [classParticipants, setClassParticipants] = useState([]);
  const [classEditTab, setClassEditTab] = useState('general');
  const [editingClassId, setEditingClassId] = useState('');
  const [editingEventId, setEditingEventId] = useState('');
  const [productLoading, setProductLoading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState('');
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageSaving, setPackageSaving] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState('');
  const [classQuery, setClassQuery] = useState('');
  const [eventQuery, setEventQuery] = useState('');
  const [trainerQuery, setTrainerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [packageQuery, setPackageQuery] = useState('');
  const [salesQuery, setSalesQuery] = useState('');
  const [salesUserQuery, setSalesUserQuery] = useState('');
  const [ptUserQuery, setPtUserQuery] = useState('');
  const [trainerPackageQuery, setTrainerPackageQuery] = useState('');
  const [salesMemberQuery, setSalesMemberQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [transactionQuery, setTransactionQuery] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all');
  const [transactionLinkFilter, setTransactionLinkFilter] = useState('all');
  const [eventPostQuote, setEventPostQuote] = useState(null);
  const [pendingPostedEventId, setPendingPostedEventId] = useState('');
  const [eventParticipants, setEventParticipants] = useState([]);
  const [eventParticipantsLoading, setEventParticipantsLoading] = useState(false);
  const [eventEditTab, setEventEditTab] = useState('general');
  const [eventCheckinMap, setEventCheckinMap] = useState({});
  const [eventCheckinSavingMap, setEventCheckinSavingMap] = useState({});
  const [eventCheckoutMap, setEventCheckoutMap] = useState({});
  const [eventCheckoutRankMap, setEventCheckoutRankMap] = useState({});
  const [eventCheckoutSavingMap, setEventCheckoutSavingMap] = useState({});
  const [eventWalkinSavingMap, setEventWalkinSavingMap] = useState({});
  const [eventWalkinForm, setEventWalkinForm] = useState(() => createEmptyEventWalkinForm());
  const [eventCheckinSearch, setEventCheckinSearch] = useState('');
  const [eventCheckinBarcode, setEventCheckinBarcode] = useState('');
  const [eventCheckinCustomFieldsText, setEventCheckinCustomFieldsText] = useState('');
  const [eventCheckoutCustomFieldsText, setEventCheckoutCustomFieldsText] = useState('');

  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'staff' });
  const [eventForm, setEventForm] = useState(() => createEmptyEventForm());
  const [eventFormBaseline, setEventFormBaseline] = useState(() => serializeEventForm(createEmptyEventForm()));
  const [eventTemplateWizard, setEventTemplateWizard] = useState('custom');
  const [eventTrainerDraft, setEventTrainerDraft] = useState('');
  const [eventAiWorking, setEventAiWorking] = useState(false);
  const eventImageFileInputRef = useRef(null);
  const [classForm, setClassForm] = useState(() => createEmptyClassForm());
  const [classTemplateWizard, setClassTemplateWizard] = useState(() => createEmptyClassTemplateWizard());
  const [classTrainerDraft, setClassTrainerDraft] = useState('');
  const [classAiWorking, setClassAiWorking] = useState(false);
  const classImageFileInputRef = useRef(null);
  const [memberRelationDraft, setMemberRelationDraft] = useState('');
  const [trainerForm, setTrainerForm] = useState({ trainer_name: '', phone: '', specialization: '' });
  const [productForm, setProductForm] = useState({ product_name: '', category: 'retail', price: '', stock: '' });
  const [packageForm, setPackageForm] = useState(createEmptyPackageForm);
  const [salesForm, setSalesForm] = useState({ sales_name: '', channel: 'walkin', target_amount: '' });
  const [memberForm, setMemberForm] = useState(() => createEmptyMemberForm());
  const [transactionForm, setTransactionForm] = useState({
    no_transaction: '',
    member_id: '',
    product: '',
    operation_link: '',
    qty: '1',
    price: '',
    currency: 'IDR',
    method: 'virtual_account'
  });
  const [transactionDetail, setTransactionDetail] = useState(null);
  const [saasForm, setSaasForm] = useState({ months: '1', note: '' });

  const [users, setUsers] = useState([
    { user_id: 'usr_001', full_name: 'Aulia Admin', email: 'aulia@foremoz.com', role: 'admin' }
  ]);
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [trainers, setTrainers] = useState(() => loadList('trainers', accountSlug, DEFAULT_TRAINERS));
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [sales, setSales] = useState(() => loadList('sales', accountSlug, DEFAULT_SALES));
  const [members, setMembers] = useState(() => loadList('members', accountSlug, DEFAULT_MEMBERS));
  const [transactions, setTransactions] = useState(() => loadList('transactions', accountSlug, DEFAULT_TRANSACTIONS));
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [ptTrainerEnabledMap, setPtTrainerEnabledMap] = useState(() => loadMap('pt-trainer-enabled', accountSlug, {}));
  const [salesEnabledMap, setSalesEnabledMap] = useState(() => loadMap('sales-enabled', accountSlug, {}));
  const [selectedTrainerUser, setSelectedTrainerUser] = useState(null);
  const [trainerPackageRows, setTrainerPackageRows] = useState([]);
  const [trainerPackageLoading, setTrainerPackageLoading] = useState(false);
  const [selectedSalesUser, setSelectedSalesUser] = useState(null);
  const [salesMemberRows, setSalesMemberRows] = useState([]);
  const [salesMemberLoading, setSalesMemberLoading] = useState(false);
  const [memberUploadRelations, setMemberUploadRelations] = useState([]);
  const [memberUploadDraft, setMemberUploadDraft] = useState('');
  const [memberUploadModalOpen, setMemberUploadModalOpen] = useState(false);
  const [memberUploadMode, setMemberUploadMode] = useState('template');
  const [memberUploadText, setMemberUploadText] = useState(`${String(MEMBER_UPLOAD_CONFIG.csvHeader || '').trim()}\n`);
  const memberUploadInputRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('trainers', accountSlug), JSON.stringify(trainers));
  }, [accountSlug, trainers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('sales', accountSlug), JSON.stringify(sales));
  }, [accountSlug, sales]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('members', accountSlug), JSON.stringify(members));
  }, [accountSlug, members]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('transactions', accountSlug), JSON.stringify(transactions));
  }, [accountSlug, transactions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('pt-trainer-enabled', accountSlug), JSON.stringify(ptTrainerEnabledMap));
  }, [accountSlug, ptTrainerEnabledMap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('sales-enabled', accountSlug), JSON.stringify(salesEnabledMap));
  }, [accountSlug, salesEnabledMap]);

  async function loadUsers() {
    try {
      setUserLoading(true);
      const result = await apiJson(
        `/v1/owner/users?tenant_id=${encodeURIComponent(tenantId)}&status=active`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      if (rows.length === 0) return;
      setUsers(
        rows.map((item) => ({
          user_id: item.user_id || `usr_${Date.now()}`,
          full_name: item.full_name || '',
          email: item.email || '',
          role: String(item.role || 'staff').toLowerCase()
        }))
      );
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setUserLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function loadEvents() {
    try {
      setEventLoading(true);
      const result = await apiJson(
        `/v1/admin/events?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setEvents(
        rows.map((item) => ({
          event_id: item.event_id,
          brief_event: item.brief_event || '',
          event_name: item.event_name || '',
          has_coach: item.has_coach !== false,
          trainer_name: item.trainer_name || '',
          location: item.location || '',
          image_url: item.image_url || '',
          description: item.description || '',
          event_categories: Array.isArray(item.event_categories) ? item.event_categories : [],
          award_enabled: isAwardEnabled(item.award_enabled, true),
          award_scopes: normalizeEventAwardScopes(item.award_scopes ?? item.award_scope, ['overall']),
          award_top_n: String(normalizeAwardTopN(item.award_top_n, 1)),
          gallery_images: Array.isArray(item.gallery_images) ? item.gallery_images : [],
          schedule_items: Array.isArray(item.schedule_items) ? item.schedule_items : [],
          start_at: item.start_at || '',
          price: String(item.price || '0'),
          max_participants: String(item.max_participants || '0'),
          duration_minutes: String(item.duration_minutes || '60'),
          status: item.status || 'scheduled',
          participant_count: Number(item.participant_count || 0),
          registration_fields: Array.isArray(item.registration_fields) ? item.registration_fields : []
        }))
      );
    } catch (error) {
      setEvents(DEFAULT_EVENTS);
      setFeedback(error.message);
    } finally {
      setEventLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  async function loadClasses() {
    try {
      setClassLoading(true);
      const result = await apiJson(
        `/v1/admin/classes?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setClasses(
        rows.map((item) => ({
          class_id: item.class_id,
          class_type: item.class_type || 'scheduled',
          class_name: item.class_name || '',
          title: item.title || item.class_name || '',
          description: item.description || '',
          has_coach: item.has_coach !== false,
          coach_id: item.coach_id || '',
          trainer_name: item.trainer_name || '',
          category: item.category || '',
          category_id: item.category_id || '',
          custom_fields: item.custom_fields || {},
          schedule_mode: item.schedule_mode || (item.class_type === 'scheduled' ? 'everyday' : 'none'),
          weekly_schedule: item.weekly_schedule || { weekdays: [], start_time: '', end_time: '' },
          manual_schedule: Array.isArray(item.manual_schedule) ? item.manual_schedule : [],
          capacity: String(item.capacity || '20'),
          capacity_mode: item.capacity_mode || 'limited',
          quota_mode: item.quota_mode || 'manual',
          validity_mode: item.validity_mode || 'fixed',
          price: String(item.price || '0'),
          start_date: item.start_date || toInputDate(item.start_at || ''),
          end_date: item.end_date || toInputDate(item.period_end_at || item.end_at || ''),
          registration_start: toInputDatetime(item.registration_start || ''),
          registration_end: toInputDatetime(item.registration_end || ''),
          period_end_at: item.period_end_at || item.end_date || '',
          max_meetings: String(item.max_meetings || '0'),
          validity_unit: item.validity_unit || 'none',
          validity_value: item.validity_value === undefined || item.validity_value === null ? '' : String(item.validity_value),
          validity_anchor: item.validity_anchor || 'activation',
          usage_mode: item.usage_mode || 'unlimited',
          usage_limit: item.usage_limit === undefined || item.usage_limit === null ? '' : String(item.usage_limit),
          usage_period: item.usage_period || 'entire_validity',
          min_quota: item.min_quota === undefined || item.min_quota === null ? '' : String(item.min_quota),
          max_quota: item.max_quota === undefined || item.max_quota === null ? '' : String(item.max_quota),
          auto_start_when_quota_met: item.auto_start_when_quota_met === true,
          coach_shares: Array.isArray(item.coach_shares) ? item.coach_shares : []
        }))
      );
    } catch (error) {
      setClasses(DEFAULT_CLASSES);
      setFeedback(error.message);
    } finally {
      setClassLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  async function loadProducts() {
    try {
      setProductLoading(true);
      const result = await apiJson(
        `/v1/admin/products?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setProducts(
        rows.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name || '',
          category: item.category || 'retail',
          price: String(item.price ?? ''),
          stock: String(item.stock ?? '')
        }))
      );
    } catch (error) {
      setProducts(DEFAULT_PRODUCTS);
      setFeedback(error.message);
    } finally {
      setProductLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  async function loadPackages() {
    try {
      setPackageLoading(true);
      const result = await apiJson(
        `/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setPackages(
        rows.map((item) => ({
          package_id: item.package_id,
          package_name: item.package_name || '',
          package_type: item.package_type || 'membership',
          max_months: item.max_months != null ? String(item.max_months) : String(item.duration_months ?? ''),
          session_count: item.session_count != null ? String(item.session_count) : '',
          trainer_user_id: item.trainer_user_id || '',
          trainer_name: item.trainer_name || '',
          class_id: item.class_id || '',
          class_name: item.class_name || '',
          price: String(item.price ?? '')
        }))
      );
    } catch (error) {
      setPackages(DEFAULT_PACKAGES);
      setFeedback(error.message);
    } finally {
      setPackageLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  async function loadMembers() {
    try {
      setMemberSaving(true);
      const result = await apiJson(
        `/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=200`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setMembers(
        rows.map((item) => ({
          member_id: item.member_id || '',
          member_name: item.full_name || '',
          phone: item.phone || '',
          email: item.email || ''
        }))
      );
    } catch (error) {
      setMembers(DEFAULT_MEMBERS);
      setFeedback(error.message);
    } finally {
      setMemberSaving(false);
    }
  }

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, branchId]);

  async function loadTransactions() {
    try {
      setTransactionLoading(true);
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      const paymentsRes = await apiJson(
        `/v1/read/payments/queue?tenant_id=${encodeURIComponent(tenantId)}&status=all`
      ).catch(() => ({ rows: [] }));
      const [eventsRes, packagesRes, productsRes, classesRes] = await Promise.all([
        apiJson(`/v1/admin/events?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/products?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/classes?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] }))
      ]);
      const [subscriptionsRes, bookingsRes, ptBalanceRes] = await Promise.all([
        apiJson(`/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] }))
      ]);
      const eventsById = new Map(
        (Array.isArray(eventsRes.rows) ? eventsRes.rows : [])
          .map((row) => [String(row?.event_id || ''), String(row?.event_name || '').trim()])
          .filter(([id]) => Boolean(id))
      );
      const packagesById = new Map(
        (Array.isArray(packagesRes.rows) ? packagesRes.rows : [])
          .map((row) => [String(row?.package_id || ''), String(row?.package_name || '').trim()])
          .filter(([id]) => Boolean(id))
      );
      const productsById = new Map(
        (Array.isArray(productsRes.rows) ? productsRes.rows : [])
          .map((row) => [String(row?.product_id || ''), String(row?.product_name || '').trim()])
          .filter(([id]) => Boolean(id))
      );
      const classesById = new Map(
        (Array.isArray(classesRes.rows) ? classesRes.rows : [])
          .map((row) => [String(row?.class_id || ''), String(row?.class_name || '').trim()])
          .filter(([id]) => Boolean(id))
      );
      const subscriptionsByPaymentId = new Map(
        (Array.isArray(subscriptionsRes.rows) ? subscriptionsRes.rows : [])
          .map((row) => [String(row?.payment_id || ''), String(row?.subscription_id || '').trim()])
          .filter(([paymentId, subscriptionId]) => Boolean(paymentId && subscriptionId))
      );
      const bookingsByPaymentId = new Map(
        (Array.isArray(bookingsRes.rows) ? bookingsRes.rows : [])
          .map((row) => [String(row?.payment_id || ''), String(row?.booking_id || '').trim()])
          .filter(([paymentId, bookingId]) => Boolean(paymentId && bookingId))
      );
      const ptPackagesByPaymentId = new Map(
        (Array.isArray(ptBalanceRes.rows) ? ptBalanceRes.rows : [])
          .map((row) => [String(row?.payment_id || ''), String(row?.pt_package_id || '').trim()])
          .filter(([paymentId, ptPackageId]) => Boolean(paymentId && ptPackageId))
      );
      const rows = Array.isArray(paymentsRes.rows) ? paymentsRes.rows : [];
      rows.sort((a, b) => new Date(b.recorded_at || 0).getTime() - new Date(a.recorded_at || 0).getTime());
      setTransactions(rows.map((item) => ({
        transaction_id: item.payment_id || `trx_${Date.now()}`,
        no_transaction: item.payment_id || '',
        member_id: item.member_id || '',
        product: resolvePaymentReferenceLabel(item, { eventsById, packagesById, productsById, classesById }),
        operation_link: resolvePaymentOperationLink(item, { subscriptionsByPaymentId, bookingsByPaymentId, ptPackagesByPaymentId }),
        qty: '1',
        price: String(item.amount ?? ''),
        currency: item.currency || 'IDR',
        method: item.method || '-',
        status: item.status || 'pending',
        recorded_at: item.recorded_at || '',
        reviewed_at: item.reviewed_at || '',
        review_note: item.review_note || ''
      })));
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setTransactionLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'transaction') return;
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tenantId, branchId]);

  useEffect(() => {
    setTrainers(loadList('trainers', accountSlug, DEFAULT_TRAINERS));
    setSales(loadList('sales', accountSlug, DEFAULT_SALES));
    setTransactions(loadList('transactions', accountSlug, DEFAULT_TRANSACTIONS));
    setPtTrainerEnabledMap(loadMap('pt-trainer-enabled', accountSlug, {}));
    setSalesEnabledMap(loadMap('sales-enabled', accountSlug, {}));
  }, [accountSlug]);

  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);
  const packagePlan = getSessionPackagePlan(session);
  const isFreePlan = packagePlan === 'free';
  const resolvedVerticalSlug = String(session?.tenant?.industry_slug || '').trim().toLowerCase()
    || guessVerticalSlugByText(`${session?.tenant?.gym_name || ''} ${accountSlug}`, 'fitness');
  const resolvedVerticalConfig = getVerticalConfig(resolvedVerticalSlug) || null;
  const creatorLabel = String(resolvedVerticalConfig?.vocabulary?.creator || 'Trainer').trim() || 'Trainer';
  const creatorLabelLower = creatorLabel.toLowerCase();
  const inferredVerticalLabel = getVerticalLabel(resolvedVerticalSlug, 'Fitness');
  const eventCategoryExamples = useMemo(
    () => getEventCategoryExamplesByIndustry(resolvedVerticalSlug),
    [resolvedVerticalSlug]
  );
  const eventCategoryInstruction = `Pisahkan dengan koma atau baris baru. Contoh: ${eventCategoryExamples[0]}, ${eventCategoryExamples[1]}.`;
  const eventCategoryPlaceholder = `${eventCategoryExamples[0]}, ${eventCategoryExamples[1]}\n${eventCategoryExamples[2]}`;
  const isCsView = role === 'cs';
  const copy = useMemo(
    () => getAdminLocalizedCopy(language, { creator: creatorLabel }),
    [creatorLabel, language]
  );
  const dashboardTitle = isCsView ? copy.dashboardTitleSetup : copy.dashboardTitleAdmin;
  const dashboardSubtitle = isCsView ? copy.dashboardSubtitleSetup : copy.dashboardSubtitleAdmin;
  const dashboardMenuLabel = isCsView ? copy.dashboardMenuSetup : copy.dashboardMenuAdmin;
  const enabledAdminTabIds = useMemo(() => getAdminTabsByPlan(session), [session]);
  const visibleAdminTabs = useMemo(
    () => ADMIN_TABS.filter((tab) => enabledAdminTabIds.includes(tab.id)),
    [enabledAdminTabIds]
  );
  const lockedAdminTabs = useMemo(
    () => ADMIN_TABS.filter((tab) => !enabledAdminTabIds.includes(tab.id)),
    [enabledAdminTabIds]
  );
  const lockedWorkspaces = useMemo(() => {
    return WORKSPACE_SWITCHER_ENVIRONMENTS.filter((env) => !allowedEnv.includes(env));
  }, [allowedEnv]);
  const packagePlanLabel = getAdminPlanLabel(packagePlan, sentenceCase(String(packagePlan || 'starter').replace(/_/g, ' ')));

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);

  useEffect(() => {
    if (visibleAdminTabs.length === 0) return;
    if (!visibleAdminTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleAdminTabs[0].id);
    }
  }, [visibleAdminTabs, activeTab]);

  function goToEnv(env) {
    if (!allowedEnv.includes(env)) return;
    navigate(`/a/${accountSlug}${getMappedWorkspacePath('environmentHomePaths', env)}`);
  }

  function signOut() {
    clearSession();
    navigate(`/a/${accountSlug}`, { replace: true });
  }

  const filteredMembers = members.filter((item) =>
    String(item.member_name || '').toLowerCase().includes(memberQuery.toLowerCase()) ||
    String(item.email || '').toLowerCase().includes(memberQuery.toLowerCase())
  );
  const filteredEvents = events.filter((item) =>
    String(item.event_name || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.trainer_name || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.location || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.start_at || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.duration_minutes || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.status || '').toLowerCase().includes(eventQuery.toLowerCase())
  );
  const selectedWalkinEvent = useMemo(
    () => events.find((item) => String(item.event_id || '') === String(eventWalkinForm.event_id || '')) || null,
    [events, eventWalkinForm.event_id]
  );
  const filteredClasses = classes.filter((item) =>
    String(item.class_name || '').toLowerCase().includes(classQuery.toLowerCase()) ||
    String(item.trainer_name || '').toLowerCase().includes(classQuery.toLowerCase()) ||
    String(item.price || '').toLowerCase().includes(classQuery.toLowerCase()) ||
    String(item.start_date || '').toLowerCase().includes(classQuery.toLowerCase())
  );
  const filteredTrainers = trainers.filter((item) =>
    item.trainer_name.toLowerCase().includes(trainerQuery.toLowerCase()) ||
    item.phone.toLowerCase().includes(trainerQuery.toLowerCase()) ||
    item.specialization.toLowerCase().includes(trainerQuery.toLowerCase())
  );
  const coachLookupUsers = users.filter((item) => {
    const itemRole = String(item.role || '').toLowerCase();
    return itemRole === 'pt' || itemRole === 'owner';
  });
  const ptLookupOptions = users.filter((item) => {
    const itemRole = String(item.role || '').toLowerCase();
    if (itemRole !== 'pt' && itemRole !== 'owner') return false;
    return ptTrainerEnabledMap[item.user_id] !== false;
  });
  const trainerNameOptions = useMemo(() => {
    const names = new Set();
    coachLookupUsers.forEach((item) => {
      const fullName = String(item.full_name || '').trim();
      if (fullName) names.add(fullName);
    });
    if (String(session?.role || '').toLowerCase() === 'owner') {
      const ownerName = String(session?.user?.fullName || '').trim();
      if (ownerName) names.add(ownerName);
    }
    (events || []).forEach((item) => {
      parseTrainerTokens(item.trainer_name).forEach((name) => names.add(name));
    });
    (classes || []).forEach((item) => {
      parseTrainerTokens(item.trainer_name).forEach((name) => names.add(name));
    });
    (packages || []).forEach((item) => {
      const trainerName = String(item.trainer_name || '').trim();
      if (trainerName) names.add(trainerName);
    });
    (trainers || []).forEach((item) => {
      const trainerName = String(item.trainer_name || '').trim();
      if (trainerName) names.add(trainerName);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [coachLookupUsers, session, events, classes, packages, trainers]);
  const memberRelationOptions = useMemo(() => {
    const eventOptions = (events || []).map((item) => ({
      kind: 'event',
      id: String(item.event_id || '').trim(),
      label: `Event: ${item.event_name || item.event_id || '-'}`
    }));
    const classOptions = (classes || []).map((item) => ({
      kind: 'class',
      id: String(item.class_id || '').trim(),
      label: `Program: ${item.class_name || item.class_id || '-'}`
    }));
    return [...eventOptions, ...classOptions].filter((item) => item.id);
  }, [events, classes]);
  const selectedMemberRelationKeys = useMemo(
    () => new Set((memberForm.relations || []).map((item) => `${item.kind}:${item.id}`)),
    [memberForm.relations]
  );
  const availableMemberRelationOptions = useMemo(
    () => memberRelationOptions.filter((item) => !selectedMemberRelationKeys.has(`${item.kind}:${item.id}`)),
    [memberRelationOptions, selectedMemberRelationKeys]
  );
  const selectedMemberUploadRelationKeys = useMemo(
    () => new Set((memberUploadRelations || []).map((item) => `${item.kind}:${item.id}`)),
    [memberUploadRelations]
  );
  const availableMemberUploadRelationOptions = useMemo(
    () => memberRelationOptions.filter((item) => !selectedMemberUploadRelationKeys.has(`${item.kind}:${item.id}`)),
    [memberRelationOptions, selectedMemberUploadRelationKeys]
  );
  const selectedClassTrainerTokens = useMemo(() => parseTrainerTokens(classForm.trainer_name), [classForm.trainer_name]);
  const resolvedClassType = useMemo(() => resolveClassTypeForForm(classForm), [classForm]);
  const isScheduledClassForm = false;
  const isOpenAccessClassForm = resolvedClassType === 'open_access';
  const isSessionPackClassForm = resolvedClassType === 'session_pack';
  const classEditorTemplate = String(classTemplateWizard.template || 'custom').trim().toLowerCase() || 'custom';
  const isMembershipClassEditor = classEditorTemplate === 'membership';
  const isActivityClassEditor = classEditorTemplate === 'activity_class';
  const isPersonalTrainingClassEditor = classEditorTemplate === 'personal_training';
  const isCustomClassEditor = classEditorTemplate === 'custom';
  const eventEditorTemplate = String(eventTemplateWizard || 'custom').trim().toLowerCase() || 'custom';
  const isCompetitionEventEditor = eventEditorTemplate === 'race_competition';
  const isWorkshopEventEditor = eventEditorTemplate === 'workshop_seminar';
  const isCommunityEventEditor = eventEditorTemplate === 'community_gathering';
  const isClassEventEditor = eventEditorTemplate === 'class_training';
  const isCustomEventEditor = eventEditorTemplate === 'custom';
  const showEventCoachFields = eventForm.has_coach !== false;
  const showEventAwardSettings = isCompetitionEventEditor || isCustomEventEditor || isAwardEnabled(eventForm.award_enabled, true);
  const classGuideType = isActivityClassEditor ? 'scheduled' : resolvedClassType;
  const isFixedDateClassAccess = !isScheduledClassForm && classForm.validity_anchor === 'fixed_start';
  const showClassCoachFields = classForm.has_coach !== false;
  const classFieldGuide = useMemo(() => getActivityFieldGuide(classGuideType), [classGuideType]);
  const classAccessSummary = useMemo(() => formatClassAccessConfigurationSummary(classForm), [classForm]);
  const classCategoryExamples = useMemo(
    () => getClassCategoryExamplesByType(resolvedClassType),
    [resolvedClassType]
  );
  const classCategoryInstruction = `Isi satu category utama. Contoh: ${classCategoryExamples[0]}, ${classCategoryExamples[1]}, atau ${classCategoryExamples[2]}.`;
  const classCategoryPlaceholder = classCategoryExamples[0];
  const classTagPlaceholder = 'beginner, morning, 30 days, jakarta';
  const totalClassCoachShare = useMemo(() => sumCoachSharePercent(classForm.coach_shares), [classForm.coach_shares]);
  const availableClassTrainerOptions = useMemo(
    () => trainerNameOptions.filter((name) => !selectedClassTrainerTokens.includes(name)),
    [trainerNameOptions, selectedClassTrainerTokens]
  );
  const selectedEventTrainerTokens = useMemo(() => parseTrainerTokens(eventForm.trainer_name), [eventForm.trainer_name]);
  const totalEventCoachShare = useMemo(() => sumCoachSharePercent(eventForm.coach_shares), [eventForm.coach_shares]);
  const availableEventTrainerOptions = useMemo(
    () => trainerNameOptions.filter((name) => !selectedEventTrainerTokens.includes(name)),
    [trainerNameOptions, selectedEventTrainerTokens]
  );
  const filteredProducts = products.filter((item) =>
    String(item.product_name || '').toLowerCase().includes(productQuery.toLowerCase()) ||
    String(item.category || '').toLowerCase().includes(productQuery.toLowerCase()) ||
    String(item.price || '').toLowerCase().includes(productQuery.toLowerCase())
  );
  const filteredPackages = packages.filter((item) =>
    String(item.package_name || '').toLowerCase().includes(packageQuery.toLowerCase()) ||
    String(item.package_type || '').toLowerCase().includes(packageQuery.toLowerCase()) ||
    String(item.max_months || '').toLowerCase().includes(packageQuery.toLowerCase()) ||
    String(item.session_count || '').toLowerCase().includes(packageQuery.toLowerCase()) ||
    String(item.trainer_name || '').toLowerCase().includes(packageQuery.toLowerCase()) ||
    String(item.class_name || '').toLowerCase().includes(packageQuery.toLowerCase())
  );
  const classLookupOptions = classes.filter((item) => String(item.class_id || '').trim() && String(item.class_name || '').trim());
  const filteredSales = sales.filter((item) =>
    item.sales_name.toLowerCase().includes(salesQuery.toLowerCase()) ||
    item.channel.toLowerCase().includes(salesQuery.toLowerCase()) ||
    item.target_amount.toLowerCase().includes(salesQuery.toLowerCase())
  );
  const filteredSalesUsers = users.filter((item) => {
    const itemRole = String(item.role || '').toLowerCase();
    if (itemRole !== 'sales') return false;
    const q = salesUserQuery.toLowerCase();
    if (!q) return true;
    return (
      String(item.full_name || '').toLowerCase().includes(q) ||
      String(item.email || '').toLowerCase().includes(q)
    );
  });
  const filteredPtUsers = users.filter((item) => {
    const itemRole = String(item.role || '').toLowerCase();
    if (itemRole !== 'pt' && itemRole !== 'owner') return false;
    const q = ptUserQuery.toLowerCase();
    if (!q) return true;
    return (
      String(item.full_name || '').toLowerCase().includes(q) ||
      String(item.email || '').toLowerCase().includes(q)
    );
  });
  const filteredTrainerPackageRows = trainerPackageRows.filter((item) => {
    const q = trainerPackageQuery.toLowerCase();
    if (!q) return true;
    return (
      String(item.member_name || '').toLowerCase().includes(q) ||
      String(item.member_id || '').toLowerCase().includes(q) ||
      String(item.pt_package_id || '').toLowerCase().includes(q)
    );
  });
  const filteredSalesMemberRows = salesMemberRows.filter((item) => {
    const q = salesMemberQuery.toLowerCase();
    if (!q) return true;
    return (
      String(item.member_name || '').toLowerCase().includes(q) ||
      String(item.member_id || '').toLowerCase().includes(q) ||
      String(item.subscription_id || '').toLowerCase().includes(q) ||
      String(item.plan_id || '').toLowerCase().includes(q)
    );
  });
  const filteredTransactions = transactions.filter((item) => {
    const q = transactionQuery.toLowerCase();
    const statusMatch = transactionStatusFilter === 'all'
      ? true
      : String(item.status || '').toLowerCase() === transactionStatusFilter;
    const operationLink = String(item.operation_link || '').toLowerCase();
    const linkMatch = transactionLinkFilter === 'all'
      ? true
      : transactionLinkFilter === 'unlinked'
        ? !operationLink || operationLink === '-'
        : operationLink.startsWith(`${transactionLinkFilter}:`);
    if (!statusMatch || !linkMatch) return false;
    return (
      String(item.no_transaction || '').toLowerCase().includes(q) ||
      String(item.product || '').toLowerCase().includes(q) ||
      String(item.member_id || '').toLowerCase().includes(q) ||
      String(item.status || '').toLowerCase().includes(q) ||
      operationLink.includes(q)
    );
  });
  const isEventFormDirty = useMemo(
    () => serializeEventForm(eventForm) !== eventFormBaseline,
    [eventForm, eventFormBaseline]
  );
  const filteredEventCheckinParticipants = useMemo(() => {
    const q = normalizeToken(eventCheckinSearch);
    if (!q) return eventParticipants;
    return eventParticipants.filter((participant) => {
      const haystack = [
        participant?.full_name,
        participant?.email,
        participant?.passport_id,
        participant?.registration_id
      ]
        .map((item) => normalizeToken(item))
        .join(' ');
      return haystack.includes(q);
    });
  }, [eventParticipants, eventCheckinSearch]);
  const checkoutReadyParticipants = useMemo(
    () => {
      return eventParticipants
        .map((participant, index) => {
          const key = getParticipantCheckinKey(participant, index);
          return { participant, index, key };
        })
        .filter((row) => Boolean(eventCheckinMap[row.key] || eventCheckoutMap[row.key]));
    },
    [eventParticipants, eventCheckinMap, eventCheckoutMap]
  );
  const editingEvent = events.find((item) => String(item.event_id || '') === String(editingEventId || ''));
  const isEditingEventPublished = isPublishedStatus(editingEvent?.status);

  function addUser(e) {
    e.preventDefault();
    if (!userForm.full_name || !userForm.email) return;
    setUsers((prev) => [{ ...userForm, user_id: `usr_${Date.now()}` }, ...prev]);
    setFeedback(getAdminPageCopy('userCreatedFeedback', { name: userForm.full_name }));
    setUserForm({ full_name: '', email: '', role: 'staff' });
    setUserMode('list');
  }

  function viewUser(item) {
    setUserForm({
      full_name: item.full_name || '',
      email: item.email || '',
      role: item.role || 'staff'
    });
    setUserMode('add');
  }

  async function addClass(e) {
    e.preventDefault();
    const registrationPeriodMode = normalizeClassRegistrationMode(classForm.registration_period_mode);
    const scheduledCapacityMode = isScheduledClassForm
      ? String(classForm.capacity_mode || 'limited').trim().toLowerCase()
      : String(classForm.capacity_mode || 'none').trim().toLowerCase();
    const hasLimitedScheduledCapacity = isScheduledClassForm && scheduledCapacityMode === 'limited';
    const hasLimitedAccessCapacity = !isScheduledClassForm && String(classForm.capacity_mode || 'none').trim().toLowerCase() !== 'none';
    if (!String(classForm.class_name || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classNameRequired'));
      return;
    }
    if (showClassCoachFields && !String(classForm.trainer_name || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classCreatorRequired', { creator: creatorLabel }));
      return;
    }
    if (isScheduledClassForm && !String(classForm.start_date || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classStartDateRequired'));
      return;
    }
    if (!isScheduledClassForm && classForm.validity_unit !== 'none' && !String(classForm.validity_value || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classValidityValueRequired'));
      return;
    }
    if (isFixedDateClassAccess && !String(classForm.start_date || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classFixedStartDateRequired'));
      return;
    }
    if (isFixedDateClassAccess && !String(classForm.end_date || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classFixedEndDateRequired'));
      return;
    }
    if (!isScheduledClassForm && classForm.usage_mode === 'limited' && !String(classForm.usage_limit || '').trim()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classUsageLimitRequired'));
      return;
    }
    if (isScheduledClassForm && classForm.end_date && classForm.start_date && new Date(classForm.end_date).getTime() < new Date(classForm.start_date).getTime()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classEndAfterStartRequired'));
      return;
    }
    if (!isScheduledClassForm && isFixedDateClassAccess && classForm.end_date && classForm.start_date && new Date(classForm.end_date).getTime() < new Date(classForm.start_date).getTime()) {
      setClassEditTab('general');
      setFeedback(getAdminPageCopy('classFixedEndAfterStartRequired'));
      return;
    }
    if (registrationPeriodMode === 'range_date') {
      if (!String(classForm.registration_start || '').trim() || !String(classForm.registration_end || '').trim()) {
        setClassEditTab('general');
        setFeedback(getAdminPageCopy('classRegistrationRangeRequired'));
        return;
      }
      if (new Date(toApiDatetime(classForm.registration_end)).getTime() < new Date(toApiDatetime(classForm.registration_start)).getTime()) {
        setClassEditTab('general');
        setFeedback(getAdminPageCopy('classRegistrationEndAfterStartRequired'));
        return;
      }
    }
    if (hasLimitedScheduledCapacity) {
      const maxQuota = Number(classForm.max_quota || 0);
      const minQuota = Number(classForm.min_quota || 0);
      if (!Number.isFinite(maxQuota) || maxQuota <= 0) {
        setClassEditTab('general');
        setFeedback(getAdminPageCopy('classMaxQuotaRequired'));
        return;
      }
      if (Number.isFinite(minQuota) && minQuota > maxQuota) {
        setClassEditTab('general');
        setFeedback(getAdminPageCopy('classMinQuotaTooHigh'));
        return;
      }
    }
    if (hasLimitedAccessCapacity) {
      const maxQuota = Number(classForm.max_quota || 0);
      const minQuota = Number(classForm.min_quota || 0);
      if (!Number.isFinite(maxQuota) || maxQuota <= 0) {
        setClassEditTab('general');
        setFeedback(getAdminPageCopy('classMaxCapRequired'));
        return;
      }
      if (Number.isFinite(minQuota) && minQuota > maxQuota) {
        setClassEditTab('general');
        setFeedback(getAdminPageCopy('classMinCapTooHigh'));
        return;
      }
    }
    let normalizedSchedule;
    try {
      normalizedSchedule = normalizeClassScheduleForPayload({
        ...classForm,
        schedule_mode: classForm.schedule_mode
      });
    } catch (error) {
      setClassEditTab('general');
      setFeedback(error.message);
      return;
    }

    try {
      setClassSaving(true);
      const method = editingClassId ? 'PATCH' : 'POST';
      const endpoint = editingClassId
        ? `/v1/admin/classes/${encodeURIComponent(editingClassId)}`
        : '/v1/admin/classes';
      const primaryCategory = String(classForm.categories_text || '').trim();
      const capacityMode = isScheduledClassForm ? scheduledCapacityMode : classForm.capacity_mode;
      const normalizedCapacity = isScheduledClassForm
        ? (hasLimitedScheduledCapacity
            ? Number(classForm.max_quota || classForm.capacity || 0)
            : 0)
        : (hasLimitedAccessCapacity ? Number(classForm.max_quota || classForm.capacity || 0) : 0);
      const closedRegistrationPayload = registrationPeriodMode === 'closed'
        ? createClosedRegistrationPayload()
        : null;
      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          class_type: resolvedClassType,
          class_name: classForm.class_name,
          title: classForm.class_name,
          description: classForm.description || '',
          has_coach: showClassCoachFields,
          coach_id: classForm.coach_id || null,
          trainer_name: showClassCoachFields ? classForm.trainer_name : '',
          coach_shares: showClassCoachFields ? normalizeCoachSharesForPayload(classForm.coach_shares, 'coach') : [],
          category: primaryCategory,
          category_id: primaryCategory ? toCategoryId(primaryCategory) : '',
          custom_fields: buildClassCustomFieldsPayload(classForm),
          schedule_mode: normalizedSchedule.schedule_mode,
          weekly_schedule: normalizedSchedule.weekly_schedule,
          manual_schedule: normalizedSchedule.manual_schedule,
          capacity: normalizedCapacity,
          capacity_mode: capacityMode,
          quota_mode: isScheduledClassForm
            ? (hasLimitedScheduledCapacity ? 'manual' : 'none')
            : (hasLimitedAccessCapacity ? 'manual' : 'none'),
          validity_mode: classForm.validity_mode,
          price: Number(classForm.price || 0),
          start_date: classForm.start_date || null,
          end_date: classForm.end_date || null,
          registration_start: registrationPeriodMode === 'range_date' && classForm.registration_start
            ? toApiDatetime(classForm.registration_start)
            : (closedRegistrationPayload?.registration_start || null),
          registration_end: registrationPeriodMode === 'range_date' && classForm.registration_end
            ? toApiDatetime(classForm.registration_end)
            : (closedRegistrationPayload?.registration_end || null),
          max_meetings: Number(classForm.max_meetings || 0),
          validity_unit: classForm.validity_unit,
          validity_value: classForm.validity_value ? Number(classForm.validity_value) : null,
          validity_anchor: classForm.validity_anchor,
          usage_mode: classForm.usage_mode,
          usage_limit: classForm.usage_limit ? Number(classForm.usage_limit) : null,
          usage_period: classForm.usage_period,
          min_quota: (hasLimitedScheduledCapacity || hasLimitedAccessCapacity) && classForm.min_quota ? Number(classForm.min_quota) : null,
          max_quota: (hasLimitedScheduledCapacity || hasLimitedAccessCapacity) && classForm.max_quota ? Number(classForm.max_quota) : null,
          auto_start_when_quota_met: (hasLimitedScheduledCapacity || hasLimitedAccessCapacity) && classForm.auto_start_when_quota_met
        })
      });

      setFeedback(
        getAdminPageCopy(editingClassId ? 'classUpdatedFeedback' : 'classCreatedFeedback', {
          name: classForm.class_name
        })
      );
      setClassForm(createEmptyClassForm());
      setClassTemplateWizard(createEmptyClassTemplateWizard());
      setClassTrainerDraft('');
      setEditingClassId('');
      setClassParticipants([]);
      setClassEditTab('general');
      setClassMode('list');
      await loadClasses();
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('custom_fields') || message.includes('registration field') || message.includes('lookup options')) {
        setClassEditTab('custom_fields');
      }
      if (message.includes('schedule')) {
        setClassEditTab('general');
      }
      setFeedback(error.message);
    } finally {
      setClassSaving(false);
    }
  }

  function viewClass(item) {
    const trainerName = item.trainer_name || '';
    const classCustomFields = splitClassCustomFields(item.custom_fields, item.category || '');
    const editorTemplate = inferClassEditorTemplate(item);
    setClassForm({
      class_type: item.class_type || 'scheduled',
      class_name: item.class_name || '',
      title: item.title || item.class_name || '',
      description: item.description || '',
      location: classCustomFields.location,
      image_url: classCustomFields.image_url,
      gallery_images_text: classCustomFields.gallery_images_text,
      has_coach: item.has_coach !== false,
      coach_id: item.coach_id || '',
      trainer_name: trainerName,
      coach_shares: syncCoachSharesWithTrainerNames(trainerName, item.coach_shares),
      category: item.category || '',
      category_id: item.category_id || '',
      categories_text: classCustomFields.categories_text,
      tags_text: classCustomFields.tags_text,
      custom_fields_text: classCustomFields.metadata_text,
      registration_fields: classCustomFields.registration_fields,
      pre_event_info_text: classCustomFields.pre_event_info_text,
      pre_event_attachments_text: classCustomFields.pre_event_attachments_text,
      post_event_info_text: classCustomFields.post_event_info_text,
      post_event_attachments_text: classCustomFields.post_event_attachments_text,
      schedule_mode: item.schedule_mode || (item.class_type === 'scheduled' ? 'everyday' : 'none'),
      registration_period_mode: classCustomFields.registration_mode === 'closed'
        ? 'closed'
        : (classCustomFields.registration_mode === 'range_date' || item.registration_start || item.registration_end
            ? 'range_date'
            : 'always_open'),
      weekly_days: Array.isArray(item.weekly_schedule?.weekdays) ? item.weekly_schedule.weekdays : [],
      weekly_start_time: String(item.weekly_schedule?.start_time || ''),
      weekly_end_time: String(item.weekly_schedule?.end_time || ''),
      manual_schedule: Array.isArray(item.manual_schedule) && item.manual_schedule.length > 0
        ? item.manual_schedule.map((session) => ({
            start_at: toInputDatetime(session.start_at || ''),
            end_at: toInputDatetime(session.end_at || '')
          }))
        : [createEmptyClassManualSession()],
      capacity: item.capacity || item.max_quota || '20',
      capacity_mode: item.class_type === 'scheduled'
        ? ((item.capacity_mode === 'none' && !item.max_quota && !item.min_quota) ? 'none' : 'limited')
        : (item.capacity_mode || 'limited'),
      quota_mode: item.quota_mode || 'manual',
      validity_mode: item.validity_mode || 'fixed',
      price: String(item.price || '0'),
      start_date: item.start_date || toInputDate(item.start_at || ''),
      end_date: item.end_date || toInputDate(item.period_end_at || item.end_at || ''),
      registration_start: toInputDatetime(item.registration_start || ''),
      registration_end: toInputDatetime(item.registration_end || ''),
      period_end_at: toInputDate(item.period_end_at || item.end_date || ''),
      max_meetings: String(item.max_meetings || '0'),
      validity_unit: item.validity_unit || 'none',
      validity_value: item.validity_value === undefined || item.validity_value === null ? '' : String(item.validity_value),
      validity_anchor: item.validity_anchor || 'activation',
      usage_mode: item.usage_mode || 'unlimited',
      usage_limit: item.usage_limit === undefined || item.usage_limit === null ? '' : String(item.usage_limit),
      usage_period: item.usage_period || 'entire_validity',
      min_quota: item.min_quota === undefined || item.min_quota === null ? '' : String(item.min_quota),
      max_quota: item.max_quota === undefined || item.max_quota === null ? '' : String(item.max_quota),
      auto_start_when_quota_met: item.auto_start_when_quota_met === true
    });
    setClassTemplateWizard({
      ...createEmptyClassTemplateWizard(),
      template: editorTemplate
    });
    setClassTrainerDraft('');
    setEditingClassId(item.class_id || '');
    setClassParticipants([]);
    setClassEditTab('general');
    setClassMode('add');
  }

  function startAddClass() {
    setClassForm(createEmptyClassForm());
    setClassTemplateWizard(createEmptyClassTemplateWizard());
    setClassTrainerDraft('');
    setEditingClassId('');
    setClassParticipants([]);
    setClassEditTab('general');
    setClassMode('wizard');
  }

  function openClassTemplateWizard(template) {
    const normalizedTemplate = String(template || 'custom').trim().toLowerCase();
    setClassTemplateWizard({
      ...createEmptyClassTemplateWizard(),
      template: normalizedTemplate
    });
    setClassForm(createClassFormFromTemplate(normalizedTemplate));
    setClassTrainerDraft('');
    setEditingClassId('');
    setClassParticipants([]);
    setClassEditTab('general');
    setClassMode('add');
  }

  async function loadClassParticipants(classId, classType = 'scheduled') {
    if (!classId) {
      setClassParticipants([]);
      return;
    }
    try {
      setClassParticipantsLoading(true);
      const result = await apiJson(classType === 'scheduled'
        ? `/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}&class_id=${encodeURIComponent(classId)}`
        : `/v1/read/activity-enrollments?tenant_id=${encodeURIComponent(tenantId)}&class_id=${encodeURIComponent(classId)}`);
      setClassParticipants(Array.isArray(result.rows) ? result.rows : []);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setClassParticipantsLoading(false);
    }
  }

  function addClassTrainerToken(name) {
    const token = String(name || '').trim();
    if (!token) return;
    const nextTokens = [...new Set([...selectedClassTrainerTokens, token])];
    setClassForm((prev) => {
      const trainerName = nextTokens.join(', ');
      return {
        ...prev,
        trainer_name: trainerName,
        coach_shares: syncCoachSharesWithTrainerNames(trainerName, prev.coach_shares)
      };
    });
    setClassTrainerDraft('');
  }

  function removeClassTrainerToken(name) {
    const nextTokens = selectedClassTrainerTokens.filter((item) => item !== name);
    setClassForm((prev) => {
      const trainerName = nextTokens.join(', ');
      return {
        ...prev,
        trainer_name: trainerName,
        coach_shares: syncCoachSharesWithTrainerNames(trainerName, prev.coach_shares)
      };
    });
  }

  function addEventTrainerToken(name) {
    const token = String(name || '').trim();
    if (!token) return;
    const nextTokens = [...new Set([...selectedEventTrainerTokens, token])];
    setEventForm((prev) => {
      const trainerName = nextTokens.join(', ');
      return {
        ...prev,
        trainer_name: trainerName,
        coach_shares: syncCoachSharesWithTrainerNames(trainerName, prev.coach_shares)
      };
    });
    setEventTrainerDraft('');
  }

  function removeEventTrainerToken(name) {
    const nextTokens = selectedEventTrainerTokens.filter((item) => item !== name);
    setEventForm((prev) => {
      const trainerName = nextTokens.join(', ');
      return {
        ...prev,
        trainer_name: trainerName,
        coach_shares: syncCoachSharesWithTrainerNames(trainerName, prev.coach_shares)
      };
    });
  }

  function buildEventImageKeywords() {
    const source = [
      eventForm.event_name,
      eventForm.categories_text,
      eventForm.location,
      eventForm.description,
      eventForm.brief_event
    ].join(' ');
    const categories = suggestCategoriesFromText(source);
    const locationToken = String(eventForm.location || '').trim().split(/[,\s]+/)[0] || 'indonesia';
    const keywords = [
      `${String(eventForm.event_name || '').trim()} ${locationToken}`.trim(),
      `${categories[0]} ${locationToken} event`.trim(),
      `${String(eventForm.categories_text || '').split(',')[0] || categories[0]} ${locationToken}`.trim(),
      `${String(eventForm.brief_event || '').trim()} ${locationToken}`.trim()
    ]
      .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
      .filter((item) => item.length >= 3);
    return [...new Set(keywords)];
  }

  function buildClassImageKeywords() {
    const source = [
      classForm.class_name,
      classForm.categories_text,
      classForm.location,
      classForm.description
    ].join(' ');
    const categories = suggestCategoriesFromText(source);
    const locationToken = String(classForm.location || '').trim().split(/[,\s]+/)[0] || 'fitness';
    const keywords = [
      `${String(classForm.class_name || '').trim()} ${locationToken}`.trim(),
      `${categories[0]} ${locationToken} class`.trim(),
      `${String(classForm.categories_text || '').split(',')[0] || categories[0]} ${locationToken}`.trim(),
      `${String(classForm.description || '').trim()} ${locationToken}`.trim()
    ]
      .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
      .filter((item) => item.length >= 3);
    return [...new Set(keywords)];
  }

  async function fetchPexelsPhotos(keyword, perPage = 20) {
    const query = String(keyword || '').trim() || 'fitness event';
    const result = await apiJson(
      `/v1/ai/pexels/search?tenant_id=${encodeURIComponent(tenantId)}&query=${encodeURIComponent(query)}&per_page=${encodeURIComponent(perPage)}`
    );
    return Array.isArray(result.rows) ? result.rows : [];
  }

  function aiGenerateDraftFromBrief() {
    const brief = String(eventForm.brief_event || '').trim();
    if (!brief) {
      setFeedback(getAdminPageCopy('aiBriefRequired'));
      return;
    }
    const draft = generateDraftFromBrief(brief, eventForm.start_at);
    const mappedDuration = fromDurationMinutes(draft.durationMinutes || 180);
    setEventForm((prev) => ({
      ...prev,
      event_name: draft.eventName,
      description: draft.description,
      categories_text: draft.categories.join(', '),
      schedule_items_text: draft.scheduleText,
      start_at: draft.startAtInput || prev.start_at,
      duration_value: mappedDuration.duration_value,
      duration_unit: mappedDuration.duration_unit,
      price: String(draft.suggestedPrice || prev.price || '0')
    }));
    setFeedback(getAdminPageCopy('aiDraftCreated', { price: formatIdr(draft.suggestedPrice || 0) }));
  }

  function aiRewriteTitle() {
    const current = String(eventForm.event_name || '').trim();
    const source = current || (typeof window !== 'undefined'
      ? String(window.prompt(getAdminPageCopy('aiEventNamePrompt'), '') || '').trim()
      : '');
    if (!source) {
      setFeedback(getAdminPageCopy('aiEventNameRequired'));
      return;
    }
    const categories = suggestCategoriesFromText(`${eventForm.categories_text} ${source}`);
    const next = buildCatchyTitle(source, categories, eventForm.location);
    if (!next) {
      setFeedback(getAdminPageCopy('aiRewriteTitleFailed'));
      return;
    }
    setEventForm((prev) => ({ ...prev, event_name: next }));
    setFeedback(getAdminPageCopy('aiTitleUpdated', { title: next }));
  }

  function aiGenerateDescription() {
    const eventName = sentenceCase(eventForm.event_name || 'Community Event');
    const categories = suggestCategoriesFromText(`${eventForm.categories_text} ${eventName}`);
    const trainer = String(eventForm.trainer_name || '').trim() || `tim ${creatorLabelLower}`;
    const description = [
      `${eventName} adalah sesi ${categories[0]} dengan pendekatan praktis dan terstruktur.`,
      `Dipandu oleh ${trainer}, event ini menekankan pengalaman aman, progresif, dan tetap fun untuk berbagai level peserta.`,
      'Siapkan outfit nyaman, datang lebih awal untuk registrasi, lalu nikmati sesi utama sampai penutup.'
    ].join(' ');
    setEventForm((prev) => ({ ...prev, description }));
    setFeedback(getAdminPageCopy('aiEventDescriptionCreated'));
  }

  function aiShortenDescription() {
    const current = String(eventForm.description || '').trim();
    if (!current) {
      setFeedback(getAdminPageCopy('aiEventDescriptionRequired'));
      return;
    }
    const shortened = current.split('.').map((part) => part.trim()).filter(Boolean).slice(0, 2).join('. ');
    setEventForm((prev) => ({ ...prev, description: `${shortened}.` }));
    setFeedback(getAdminPageCopy('aiEventDescriptionShortened'));
  }

  function aiGenerateClassDescription() {
    const className = sentenceCase(classForm.class_name || 'Activity Program');
    const categories = suggestCategoriesFromText(`${classForm.categories_text} ${className}`);
    const coachNames = String(classForm.trainer_name || '').trim();
    const guideName = coachNames || (showClassCoachFields ? `tim ${creatorLabelLower}` : 'tim operasional');
    const description = [
      `${className} adalah sesi ${categories[0]} yang dirancang agar pengalaman member terasa jelas, nyaman, dan mudah diikuti.`,
      showClassCoachFields
        ? `Dipandu oleh ${guideName}, activity ini cocok untuk peserta yang ingin progres bertahap dengan arahan yang rapi.`
        : `Activity ini cocok untuk member yang ingin akses fleksibel dengan aturan penggunaan yang tetap jelas.`,
      String(classForm.location || '').trim()
        ? `Lokasi pelaksanaan di ${classForm.location}. Hadir lebih awal agar proses check-in dan persiapan berjalan lancar.`
        : 'Datang lebih awal agar proses check-in dan persiapan berjalan lancar.'
    ].join(' ');
    setClassForm((prev) => ({ ...prev, description }));
    setFeedback(getAdminPageCopy('aiClassDescriptionCreated'));
  }

  function aiShortenClassDescription() {
    const current = String(classForm.description || '').trim();
    if (!current) {
      setFeedback(getAdminPageCopy('aiClassDescriptionRequired'));
      return;
    }
    const shortened = current.split('.').map((part) => part.trim()).filter(Boolean).slice(0, 2).join('. ');
    setClassForm((prev) => ({ ...prev, description: `${shortened}.` }));
    setFeedback(getAdminPageCopy('aiClassDescriptionShortened'));
  }

  function aiGenerateRundown() {
    const title = String(eventForm.event_name || '').trim();
    const context = [
      eventForm.description,
      eventForm.categories_text,
      eventForm.location
    ].join(' ');
    const scheduleText = buildScheduleTemplate(eventForm.start_at, title, context);
    setEventForm((prev) => ({ ...prev, schedule_items_text: scheduleText }));
    setFeedback(getAdminPageCopy('aiRundownCreated'));
  }

  function aiImproveRundown() {
    const source = String(eventForm.schedule_items_text || '').trim();
    if (!source) {
      aiGenerateRundown();
      return;
    }
    const improved = source
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [time = '', title = '', note = ''] = line.split('|').map((item) => item.trim());
        const betterTitle = sentenceCase(title || 'Session');
        const betterNote = note || 'Detail aktivitas di sesi ini.';
        return `${time || '08:00'} | ${betterTitle} | ${betterNote}`;
      })
      .join('\n');
    setEventForm((prev) => ({ ...prev, schedule_items_text: improved }));
    setFeedback(getAdminPageCopy('aiRundownImproved'));
  }

  function aiSuggestCategory() {
    const source = [eventForm.event_name, eventForm.description, eventForm.categories_text].join(' ');
    const categories = suggestCategoriesFromText(source);
    setEventForm((prev) => ({ ...prev, categories_text: categories.join(', ') }));
    setFeedback(getAdminPageCopy('aiCategorySuggested', { categories: categories.join(', ') }));
  }

  function aiSuggestFields() {
    const fields = suggestRegistrationFieldsFromText(
      [eventForm.event_name, eventForm.description, eventForm.categories_text].join(' ')
    );
    setEventForm((prev) => ({ ...prev, registration_fields: fields }));
    setFeedback(getAdminPageCopy('aiCustomFieldsSuggested'));
  }

  async function aiFillGalleryFromPexels() {
    try {
      setEventAiWorking(true);
      const keywordCandidates = buildEventImageKeywords();
      if (keywordCandidates.length === 0) {
        throw new Error(getAdminPageCopy('aiEventGallerySeedRequired'));
      }
      let keyword = keywordCandidates[0];
      let photos = [];
      let lastError = null;
      for (const candidate of keywordCandidates) {
        keyword = candidate;
        try {
          photos = await fetchPexelsPhotos(candidate, 20);
        } catch (error) {
          lastError = error;
          photos = [];
        }
        if (photos.length > 0) break;
      }
      if (photos.length === 0) {
        if (lastError) {
          throw lastError;
        }
        setFeedback(getAdminPageCopy('aiEventGalleryNotFound'));
        return;
      }
      const urls = shuffleList(photos)
        .map((item) => item?.image_url || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      setEventForm((prev) => ({
        ...prev,
        image_url: urls[0] || prev.image_url,
        gallery_images_text: urls.join('\n')
      }));
      setFeedback(getAdminPageCopy('aiEventGalleryFilled', { count: urls.length, keyword }));
    } catch (error) {
      setFeedback(error.message || getAdminPageCopy('aiEventGalleryFailed'));
    } finally {
      setEventAiWorking(false);
    }
  }

  async function uploadOwnEventImage(file) {
    try {
      const selected = file || null;
      if (!selected) return;
      if (!String(selected.type || '').startsWith('image/')) {
        throw new Error(getAdminPageCopy('uploadImageTypeRequired'));
      }
      const maxBytes = 5 * 1024 * 1024;
      if (Number(selected.size || 0) > maxBytes) {
        throw new Error(getAdminPageCopy('uploadImageMaxSize'));
      }
      const dataUrl = await readFileAsDataUrl(selected);
      if (!dataUrl) {
        throw new Error(getAdminPageCopy('uploadImageProcessFailed'));
      }
      const uploadRes = await apiJson('/v1/admin/uploads/image', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          folder: 'events',
          filename: selected.name || 'cover-image',
          data_url: dataUrl
        })
      });
      const imageUrl = String(uploadRes?.url || '').trim();
      if (!imageUrl) {
        throw new Error(getAdminPageCopy('uploadImageUrlMissing'));
      }
      setEventForm((prev) => ({ ...prev, image_url: imageUrl }));
      setFeedback(getAdminPageCopy('uploadEventImageSuccess'));
    } catch (error) {
      setFeedback(error.message || getAdminPageCopy('uploadEventImageFailed'));
    }
  }

  async function uploadAttachmentAsset(file, folder) {
    const selected = file || null;
    if (!selected) return '';
    const maxBytes = 10 * 1024 * 1024;
    if (Number(selected.size || 0) > maxBytes) {
      throw new Error(getAdminPageCopy('uploadAttachmentMaxSize'));
    }
    const dataUrl = await readFileAsDataUrl(selected);
    if (!dataUrl) {
      throw new Error(getAdminPageCopy('uploadAttachmentProcessFailed'));
    }
    const uploadRes = await apiJson('/v1/admin/uploads/file', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        folder,
        filename: selected.name || 'attachment',
        data_url: dataUrl
      })
    });
    return String(uploadRes?.url || '').trim();
  }

  async function uploadEventInfoAttachment(file, phase) {
    try {
      const attachmentUrl = await uploadAttachmentAsset(file, 'event-info');
      if (!attachmentUrl) {
        throw new Error(getAdminPageCopy('uploadAttachmentUrlMissing'));
      }
      setEventForm((prev) => {
        const key = phase === 'post' ? 'post_event_attachments_text' : 'pre_event_attachments_text';
        return {
          ...prev,
          [key]: [...new Set([...normalizeAttachmentUrlsText(prev[key]), attachmentUrl].filter(Boolean))].join('\n')
        };
      });
      setFeedback(getAdminPageCopy('uploadEventAttachmentSuccess'));
    } catch (error) {
      setFeedback(error.message || getAdminPageCopy('uploadEventAttachmentFailed'));
    }
  }

  async function aiFillClassGalleryFromPexels() {
    try {
      setClassAiWorking(true);
      const keywordCandidates = buildClassImageKeywords();
      if (keywordCandidates.length === 0) {
        throw new Error(getAdminPageCopy('aiClassGallerySeedRequired'));
      }
      let keyword = keywordCandidates[0];
      let photos = [];
      let lastError = null;
      for (const candidate of keywordCandidates) {
        keyword = candidate;
        try {
          photos = await fetchPexelsPhotos(candidate, 20);
        } catch (error) {
          lastError = error;
          photos = [];
        }
        if (photos.length > 0) break;
      }
      if (photos.length === 0) {
        if (lastError) throw lastError;
        setFeedback(getAdminPageCopy('aiClassGalleryNotFound'));
        return;
      }
      const urls = shuffleList(photos)
        .map((item) => item?.image_url || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      setClassForm((prev) => ({
        ...prev,
        image_url: urls[0] || prev.image_url,
        gallery_images_text: urls.join('\n')
      }));
      setFeedback(getAdminPageCopy('aiClassGalleryFilled', { count: urls.length, keyword }));
    } catch (error) {
      setFeedback(error.message || getAdminPageCopy('aiClassGalleryFailed'));
    } finally {
      setClassAiWorking(false);
    }
  }

  async function uploadOwnClassImage(file) {
    try {
      const selected = file || null;
      if (!selected) return;
      if (!String(selected.type || '').startsWith('image/')) {
        throw new Error(getAdminPageCopy('uploadImageTypeRequired'));
      }
      const maxBytes = 5 * 1024 * 1024;
      if (Number(selected.size || 0) > maxBytes) {
        throw new Error(getAdminPageCopy('uploadImageMaxSize'));
      }
      const dataUrl = await readFileAsDataUrl(selected);
      if (!dataUrl) {
        throw new Error(getAdminPageCopy('uploadImageProcessFailed'));
      }
      const uploadRes = await apiJson('/v1/admin/uploads/image', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          folder: 'classes',
          filename: selected.name || 'class-cover-image',
          data_url: dataUrl
        })
      });
      const imageUrl = String(uploadRes?.url || '').trim();
      if (!imageUrl) {
        throw new Error(getAdminPageCopy('uploadImageUrlMissing'));
      }
      setClassForm((prev) => ({ ...prev, image_url: imageUrl }));
      setFeedback(getAdminPageCopy('uploadClassImageSuccess'));
    } catch (error) {
      setFeedback(error.message || getAdminPageCopy('uploadClassImageFailed'));
    }
  }

  async function uploadClassInfoAttachment(file, phase) {
    try {
      const attachmentUrl = await uploadAttachmentAsset(file, 'class-info');
      if (!attachmentUrl) {
        throw new Error(getAdminPageCopy('uploadAttachmentUrlMissing'));
      }
      setClassForm((prev) => {
        const key = phase === 'post' ? 'post_event_attachments_text' : 'pre_event_attachments_text';
        return {
          ...prev,
          [key]: [...new Set([...normalizeAttachmentUrlsText(prev[key]), attachmentUrl].filter(Boolean))].join('\n')
        };
      });
      setFeedback(getAdminPageCopy('uploadClassAttachmentSuccess'));
    } catch (error) {
      setFeedback(error.message || getAdminPageCopy('uploadClassAttachmentFailed'));
    }
  }

  async function deleteClass(classId) {
    try {
      setClassSaving(true);
      await apiJson(`/v1/admin/classes/${encodeURIComponent(classId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      setFeedback(getAdminPageCopy('programDeletedFeedback', { id: classId }));
      await loadClasses();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setClassSaving(false);
    }
  }

  function addTrainer(e) {
    e.preventDefault();
    if (!trainerForm.trainer_name) return;
    setTrainers((prev) => [{ ...trainerForm, trainer_id: `tr_${Date.now()}` }, ...prev]);
    setFeedback(getAdminPageCopy('trainerCreatedFeedback', { name: trainerForm.trainer_name }));
    setTrainerForm({ trainer_name: '', phone: '', specialization: '' });
    setTrainerMode('list');
  }

  async function addProduct(e) {
    e.preventDefault();
    if (!productForm.product_name || !productForm.price) return;
    try {
      setProductSaving(true);
      const method = editingProductId ? 'PATCH' : 'POST';
      const endpoint = editingProductId
        ? `/v1/admin/products/${encodeURIComponent(editingProductId)}`
        : '/v1/admin/products';
      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          product_name: productForm.product_name,
          category: productForm.category,
          price: Number(productForm.price || 0),
          stock: Number(productForm.stock || 0)
        })
      });
      setFeedback(
        getAdminPageCopy(editingProductId ? 'productUpdatedFeedback' : 'productCreatedFeedback', {
          name: productForm.product_name
        })
      );
      setProductForm({ product_name: '', category: 'retail', price: '', stock: '' });
      setEditingProductId('');
      setProductMode('list');
      await loadProducts();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setProductSaving(false);
    }
  }

  function viewProduct(item) {
    setProductForm({
      product_name: item.product_name || '',
      category: item.category || 'retail',
      price: item.price || '',
      stock: item.stock || ''
    });
    setEditingProductId(item.product_id || '');
    setProductMode('add');
  }

  function startAddProduct() {
    setProductForm({ product_name: '', category: 'retail', price: '', stock: '' });
    setEditingProductId('');
    setProductMode('add');
  }

  async function deleteProduct(productId) {
    try {
      setProductSaving(true);
      await apiJson(`/v1/admin/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      setFeedback(getAdminPageCopy('productDeletedFeedback', { id: productId }));
      await loadProducts();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setProductSaving(false);
    }
  }

  async function addPackageCreation(e) {
    e.preventDefault();
    if (!packageForm.package_name || !packageForm.price) return;
    const packageTypeMeta = getPackageTypeMeta(packageForm.package_type);
    if (packageTypeMeta.requiresDuration && !packageForm.max_months) return;
    if (packageTypeMeta.requiresSessionCount && !packageForm.session_count) return;
    if (packageTypeMeta.requiresTrainer && !packageForm.trainer_user_id) return;
    if (packageTypeMeta.requiresClass && !packageForm.class_id) return;
    const selectedPtTrainer = users.find((u) => u.user_id === packageForm.trainer_user_id);
    const selectedClass = classes.find((c) => c.class_id === packageForm.class_id);
    try {
      setPackageSaving(true);
      const method = editingPackageId ? 'PATCH' : 'POST';
      const endpoint = editingPackageId
        ? `/v1/admin/packages/${encodeURIComponent(editingPackageId)}`
        : '/v1/admin/packages';
      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          package_name: packageForm.package_name,
          package_type: packageForm.package_type,
          ...(packageTypeMeta.requiresSessionCount
            ? {
              max_months: Number(packageForm.max_months || 1),
              duration_months: Number(packageForm.max_months || 1),
              session_count: Number(packageForm.session_count || 1)
            }
            : packageTypeMeta.requiresDuration
              ? {
                duration_months: Number(packageForm.max_months || 1)
              }
              : {}),
          ...(packageTypeMeta.requiresTrainer
            ? {
              trainer_user_id: packageForm.trainer_user_id,
              trainer_name: selectedPtTrainer?.full_name || ''
            }
            : {
              trainer_user_id: null,
              trainer_name: null
            }),
          ...(packageTypeMeta.requiresClass
            ? {
              class_id: packageForm.class_id,
              class_name: selectedClass?.class_name || ''
            }
            : {
              class_id: null,
              class_name: null
            }),
          price: Number(packageForm.price || 0)
        })
      });
      setFeedback(
        getAdminPageCopy(editingPackageId ? 'packageUpdatedFeedback' : 'packageCreatedFeedback', {
          name: packageForm.package_name
        })
      );
      setPackageForm(createEmptyPackageForm());
      setEditingPackageId('');
      setPackageMode('list');
      await loadPackages();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setPackageSaving(false);
    }
  }

  function viewPackageCreation(item) {
    setPackageForm({
      package_name: item.package_name || '',
      package_type: item.package_type || 'membership',
      max_months: item.max_months || item.duration_months || '1',
      session_count: item.session_count || '1',
      trainer_user_id: item.trainer_user_id || '',
      class_id: item.class_id || '',
      price: item.price || ''
    });
    setEditingPackageId(item.package_id || '');
    setPackageMode('add');
  }

  function startAddPackage() {
    setPackageForm(createEmptyPackageForm());
    setEditingPackageId('');
    setPackageMode('add');
  }

  async function deletePackage(packageId) {
    try {
      setPackageSaving(true);
      await apiJson(`/v1/admin/packages/${encodeURIComponent(packageId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      setFeedback(getAdminPageCopy('packageDeletedFeedback', { id: packageId }));
      await loadPackages();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setPackageSaving(false);
    }
  }

  function viewTrainer(item) {
    setTrainerForm({
      trainer_name: item.trainer_name || '',
      phone: item.phone || '',
      specialization: item.specialization || ''
    });
    setTrainerMode('add');
  }

  async function openTrainerPackageList(user) {
    try {
      setTrainerPackageLoading(true);
      setSelectedTrainerUser(user);
      setTrainerPackageQuery('');
      const [ptBalanceRes, membersRes] = await Promise.all([
        apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}`),
        apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=200`)
      ]);
      const ptRows = Array.isArray(ptBalanceRes.rows) ? ptBalanceRes.rows : [];
      const memberRows = Array.isArray(membersRes.rows) ? membersRes.rows : [];
      const memberById = new Map(
        memberRows.map((row) => [
          String(row.member_id || ''),
          row
        ])
      );
      const rows = ptRows
        .filter((row) => String(row.trainer_id || '') === String(user.user_id || ''))
        .map((row) => {
          const member = memberById.get(String(row.member_id || '')) || {};
          return {
            pt_package_id: row.pt_package_id || '-',
            member_id: row.member_id || '-',
            member_name: member.full_name || member.member_name || '-',
            total_sessions: row.total_sessions ?? '-',
            remaining_sessions: row.remaining_sessions ?? '-',
            updated_at: row.updated_at || '-'
          };
        });
      setTrainerPackageRows(rows);
    } catch (error) {
      setFeedback(error.message);
      setTrainerPackageRows([]);
    } finally {
      setTrainerPackageLoading(false);
    }
  }

  function closeTrainerPackageList() {
    setSelectedTrainerUser(null);
    setTrainerPackageRows([]);
    setTrainerPackageQuery('');
  }

  async function openSalesMemberList(user) {
    try {
      setSalesMemberLoading(true);
      setSelectedSalesUser(user);
      setSalesMemberQuery('');
      const [prospectsRes, membersRes, subsRes] = await Promise.all([
        apiJson(`/v1/read/sales/prospects?tenant_id=${encodeURIComponent(tenantId)}`),
        apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=200`),
        apiJson(`/v1/read/subscriptions/active?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`)
      ]);
      const prospectRows = Array.isArray(prospectsRes.rows) ? prospectsRes.rows : [];
      const memberRows = Array.isArray(membersRes.rows) ? membersRes.rows : [];
      const subRows = Array.isArray(subsRes.rows) ? subsRes.rows : [];
      const memberById = new Map(memberRows.map((row) => [String(row.member_id || ''), row]));
      const subsByMemberId = new Map();
      subRows.forEach((row) => {
        const memberId = String(row.member_id || '');
        if (!memberId) return;
        const current = subsByMemberId.get(memberId) || [];
        current.push(row);
        subsByMemberId.set(memberId, current);
      });

      const rows = prospectRows
        .filter((row) => String(row.owner_sales_id || '') === String(user.user_id || '') && row.converted_member_id)
        .map((row) => {
          const memberId = String(row.converted_member_id || '');
          const member = memberById.get(memberId) || {};
          const subs = subsByMemberId.get(memberId) || [];
          return {
            member_id: memberId || '-',
            member_name: member.full_name || member.member_name || '-',
            subscription_id: subs[0]?.subscription_id || '-',
            plan_id: subs[0]?.plan_id || '-',
            prospect_id: row.prospect_id || '-',
            stage: row.stage || '-'
          };
        });
      setSalesMemberRows(rows);
    } catch (error) {
      setFeedback(error.message);
      setSalesMemberRows([]);
    } finally {
      setSalesMemberLoading(false);
    }
  }

  function closeSalesMemberList() {
    setSelectedSalesUser(null);
    setSalesMemberRows([]);
    setSalesMemberQuery('');
  }

  function addSales(e) {
    e.preventDefault();
    if (!salesForm.sales_name || !salesForm.target_amount) return;
    setSales((prev) => [{ ...salesForm, sales_id: `sales_${Date.now()}` }, ...prev]);
    setFeedback(getAdminPageCopy('salesTargetSetFeedback', { name: salesForm.sales_name }));
    setSalesForm({ sales_name: '', channel: 'walkin', target_amount: '' });
    setSalesMode('list');
  }

  function viewSales(item) {
    setSalesForm({
      sales_name: item.sales_name || '',
      channel: item.channel || 'walkin',
      target_amount: item.target_amount || ''
    });
    setSalesMode('add');
  }

  function addMemberRelationToken(rawValue, target = 'form') {
    const option = memberRelationOptions.find((item) => `${item.kind}:${item.id}` === String(rawValue || '').trim());
    if (!option) return;
    if (target === 'upload') {
      setMemberUploadRelations((prev) => normalizeMemberRelationTokens([...prev, option]));
      setMemberUploadDraft('');
      return;
    }
    setMemberForm((prev) => ({
      ...prev,
      relations: normalizeMemberRelationTokens([...(prev.relations || []), option])
    }));
    setMemberRelationDraft('');
  }

  function removeMemberRelationToken(token, target = 'form') {
    const matcher = `${token.kind}:${token.id}`;
    if (target === 'upload') {
      setMemberUploadRelations((prev) => prev.filter((item) => `${item.kind}:${item.id}` !== matcher));
      return;
    }
    setMemberForm((prev) => ({
      ...prev,
      relations: (prev.relations || []).filter((item) => `${item.kind}:${item.id}` !== matcher)
    }));
  }

  async function saveMemberWithRelations(payload) {
    const normalizedEmail = normalizeEmailValue(payload.email);
    if (!normalizedEmail) {
      throw new Error(getAdminPageCopy('memberEmailRequired'));
    }
    const relations = normalizeMemberRelationTokens(payload.relations);
    if (relations.length === 0) {
      throw new Error(getAdminPageCopy('memberRelationRequired'));
    }

    return apiJson('/v1/admin/members/upsert-with-relations', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        branch_id: branchId,
        full_name: payload.member_name || normalizedEmail.split('@')[0],
        phone: payload.phone || '',
        email: normalizedEmail,
        relations: relations.map((item) => ({ kind: item.kind, id: item.id }))
      })
    });
  }

  async function addMember(e) {
    e.preventDefault();
    try {
      setMemberSaving(true);
      const result = await saveMemberWithRelations(memberForm);
      setFeedback(
        getAdminPageCopy('memberSavedFeedback', {
          email: result.member?.email || normalizeEmailValue(memberForm.email),
          count: result.relation_results?.length || 0
        })
      );
      setMemberForm(createEmptyMemberForm());
      setMemberRelationDraft('');
      setMemberMode('list');
      await loadMembers();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setMemberSaving(false);
    }
  }

  function viewMember(item) {
    if (item?.member_id) {
      navigate(accountPath(session, `/members/${item.member_id}`));
      return;
    }
    setMemberForm({
      member_name: item.member_name || '',
      phone: item.phone || '',
      email: item.email || '',
      relations: []
    });
    setMemberRelationDraft('');
    setMemberMode('add');
  }

  function openMemberUploadModal() {
    setMemberUploadMode('template');
    setMemberUploadText(`${String(MEMBER_UPLOAD_CONFIG.csvHeader || '').trim()}\n`);
    setMemberUploadModalOpen(true);
  }

  function closeMemberUploadModal() {
    setMemberUploadModalOpen(false);
  }

  function downloadMemberUploadTemplate() {
    const templateRows = Array.isArray(MEMBER_UPLOAD_CONFIG.templateRows) ? MEMBER_UPLOAD_CONFIG.templateRows : [];
    const csvText = `${templateRows.map((row) => (Array.isArray(row) ? row : []).map(csvEscape).join(',')).join('\n')}\n`;
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = String(MEMBER_UPLOAD_CONFIG.templateFilename || 'member-upload-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback(getAdminPageCopy('memberUploadTemplateDownloaded'));
  }

  async function processMemberUploadText(text, sourceLabel = 'upload') {
    if (memberUploadRelations.length === 0) {
      throw new Error(getAdminPageCopy('memberUploadRequiresRelation'));
    }

    const rows = parseMemberCsv(text).filter((item) => normalizeEmailValue(item.email));
    if (rows.length === 0) {
      throw new Error(getAdminPageCopy('memberUploadNoValidRows'));
    }

    let successCount = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        await saveMemberWithRelations({
          ...row,
          relations: memberUploadRelations
        });
        successCount += 1;
      } catch (error) {
        errors.push(getAdminPageCopy('memberUploadRowError', { row: row.row_number, message: error.message }));
      }
    }

    await loadMembers();
    if (errors.length > 0) {
      setFeedback(getAdminPageCopy('memberUploadPartialFeedback', {
        source: sourceLabel,
        success: successCount,
        total: rows.length,
        error: errors[0]
      }));
    } else {
      setFeedback(getAdminPageCopy('memberUploadSuccessFeedback', {
        source: sourceLabel,
        success: successCount,
        total: rows.length
      }));
    }
  }

  async function handleMemberUploadChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
      setFeedback(getAdminPageCopy('memberUploadCsvOnly'));
      return;
    }

    try {
      setMemberSaving(true);
      const text = await file.text();
      await processMemberUploadText(text, 'upload_file');
      closeMemberUploadModal();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setMemberSaving(false);
    }
  }

  async function submitMemberUploadText(event) {
    event.preventDefault();
    try {
      setMemberSaving(true);
      await processMemberUploadText(memberUploadText, 'upload_paste');
      closeMemberUploadModal();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setMemberSaving(false);
    }
  }

  async function addEvent(e) {
    e.preventDefault();
    if (!String(eventForm.event_name || '').trim()) {
      setEventEditTab('general');
      setFeedback(getAdminPageCopy('eventNameRequired'));
      return;
    }
    if (!String(eventForm.start_at || '').trim()) {
      setEventEditTab('general');
      setFeedback(getAdminPageCopy('eventStartRequired'));
      return;
    }
    if (!String(eventForm.duration_value || '').trim()) {
      setEventEditTab('general');
      setFeedback(getAdminPageCopy('eventDurationRequired'));
      return;
    }
    const startAtIso = toApiDatetime(eventForm.start_at);
    if (!startAtIso) {
      setFeedback(getAdminPageCopy('eventStartInvalid'));
      return;
    }
    const durationMinutes = toDurationMinutes(eventForm.duration_value, eventForm.duration_unit);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFeedback(getAdminPageCopy('eventDurationPositiveRequired'));
      return;
    }
    try {
      setEventSaving(true);
      const awardEnabled = isFreePlan ? true : isAwardEnabled(eventForm.award_enabled, true);
      const awardScopes = isFreePlan
        ? ['overall']
        : awardEnabled
          ? normalizeEventAwardScopes(eventForm.award_scopes, ['overall'])
          : [];
      const awardTopN = isFreePlan ? 1 : awardEnabled ? normalizeAwardTopN(eventForm.award_top_n, 1) : 0;
      const method = editingEventId ? 'PATCH' : 'POST';
      const endpoint = editingEventId
        ? `/v1/admin/events/${encodeURIComponent(editingEventId)}`
        : '/v1/admin/events';
      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          brief_event: eventForm.brief_event || null,
          event_name: eventForm.event_name,
          has_coach: eventForm.has_coach !== false,
          trainer_name: eventForm.has_coach !== false ? (eventForm.trainer_name || null) : null,
          coach_shares: eventForm.has_coach !== false
            ? normalizeCoachSharesForPayload(eventForm.coach_shares, 'coach')
            : [],
          location: eventForm.location || null,
          image_url: eventForm.image_url || null,
          description: eventForm.description || null,
          event_categories: normalizeEventCategoriesForPayload(eventForm.categories_text),
          award_enabled: awardEnabled,
          award_scopes: awardScopes,
          award_scope: awardEnabled ? (awardScopes[0] || 'overall') : null,
          award_top_n: awardTopN,
          gallery_images: normalizeGalleryImagesForPayload(eventForm.gallery_images_text),
          schedule_items: normalizeScheduleItemsForPayload(eventForm.schedule_items_text),
          start_at: startAtIso,
          price: Number(eventForm.price || 0),
          max_participants: Math.max(0, Number(eventForm.max_participants || 0)),
          duration_minutes: durationMinutes,
          registration_fields: normalizeRegistrationFieldsForPayload(eventForm.registration_fields),
          custom_fields: buildEventCustomFieldsPayload(eventForm),
          status: editingEventId ? (editingEvent?.status || 'scheduled') : 'scheduled'
        })
      });
      setFeedback(
        getAdminPageCopy(editingEventId ? 'eventUpdatedFeedback' : 'eventCreatedFeedback', {
          name: eventForm.event_name
        })
      );
      const emptyForm = createEmptyEventForm();
      setEventForm(emptyForm);
      setEventFormBaseline(serializeEventForm(emptyForm));
      setEventTemplateWizard('custom');
      setEventTrainerDraft('');
      setEventPostQuote(null);
      setEditingEventId('');
      setEventMode('list');
      await loadEvents();
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('registration field') || message.includes('lookup option') || message.includes('registration_answers')) {
        setEventEditTab('custom_fields');
      }
      if (message.includes('custom_fields')) {
        setEventEditTab('member_info');
      }
      setFeedback(error.message);
    } finally {
      setEventSaving(false);
    }
  }

  function viewEvent(item) {
    const durationInput = fromDurationMinutes(item.duration_minutes || '60');
    const eventTemplate = inferEventEditorTemplate(item);
    const eventMemberInfo = splitMemberInfoCustomFields(item.custom_fields);
    const nextForm = {
      brief_event: item.brief_event || '',
      event_name: item.event_name || '',
      has_coach: Boolean(String(item.trainer_name || '').trim()),
      trainer_name: item.trainer_name || '',
      coach_shares: syncCoachSharesWithTrainerNames(item.trainer_name || '', item.coach_shares),
      location: item.location || '',
      image_url: item.image_url || '',
      description: item.description || '',
      categories_text: Array.isArray(item.event_categories) ? item.event_categories.join(', ') : '',
      award_enabled: isAwardEnabled(item.award_enabled, true),
      award_scopes: normalizeEventAwardScopes(item.award_scopes ?? item.award_scope, ['overall']),
      award_top_n: String(normalizeAwardTopN(item.award_top_n, 1)),
      gallery_images_text: Array.isArray(item.gallery_images) ? item.gallery_images.join('\n') : '',
      schedule_items_text: scheduleItemsToText(item.schedule_items),
      start_at: toInputDatetime(item.start_at || ''),
      price: String(item.price || '0'),
      max_participants: String(item.max_participants || '0'),
      duration_value: durationInput.duration_value,
      duration_unit: durationInput.duration_unit,
      registration_fields: (Array.isArray(item.registration_fields) ? item.registration_fields : []).map(toRegistrationFieldForm),
      pre_event_info_text: eventMemberInfo.pre_event_info_text,
      pre_event_attachments_text: eventMemberInfo.pre_event_attachments_text,
      post_event_info_text: eventMemberInfo.post_event_info_text,
      post_event_attachments_text: eventMemberInfo.post_event_attachments_text
    };
    setEventWalkinForm(createEmptyEventWalkinForm());
    setEventForm(nextForm);
    setEventFormBaseline(serializeEventForm(nextForm));
    setEventTemplateWizard(eventTemplate);
    setEventTrainerDraft('');
    setEventPostQuote(null);
    setEditingEventId(item.event_id || '');
    setEventEditTab('general');
    setEventCheckinSearch('');
    setEventCheckinBarcode('');
    setEventCheckinMap({});
    setEventCheckinSavingMap({});
    setEventCheckoutMap({});
    setEventCheckoutRankMap({});
    setEventCheckoutSavingMap({});
    setEventMode('add');
    if (item?.event_id) {
      loadEventParticipants(item.event_id);
    } else {
      setEventParticipants([]);
      setEventCheckinMap({});
      setEventCheckoutMap({});
      setEventCheckoutRankMap({});
    }
  }

  function startAddEvent() {
    const emptyForm = createEmptyEventForm();
    setEventForm(emptyForm);
    setEventFormBaseline(serializeEventForm(emptyForm));
    setEventTemplateWizard('custom');
    setEventTrainerDraft('');
    setEventWalkinForm(createEmptyEventWalkinForm());
    setEventPostQuote(null);
    setEditingEventId('');
    setEventParticipants([]);
    setEventEditTab('general');
    setEventCheckinSearch('');
    setEventCheckinBarcode('');
    setEventCheckinMap({});
    setEventCheckinSavingMap({});
    setEventCheckoutMap({});
    setEventCheckoutRankMap({});
    setEventCheckoutSavingMap({});
    setEventMode('wizard');
  }

  function openEventTemplateWizard(template) {
    const normalizedTemplate = String(template || 'custom').trim().toLowerCase();
    const nextForm = createEventFormFromTemplate(normalizedTemplate);
    setEventTemplateWizard(normalizedTemplate);
    setEventForm(nextForm);
    setEventFormBaseline(serializeEventForm(nextForm));
    setEventTrainerDraft('');
    setEventWalkinForm(createEmptyEventWalkinForm());
    setEventPostQuote(null);
    setEditingEventId('');
    setEventParticipants([]);
    setEventEditTab('general');
    setEventCheckinSearch('');
    setEventCheckinBarcode('');
    setEventCheckinMap({});
    setEventCheckinSavingMap({});
    setEventCheckoutMap({});
    setEventCheckoutRankMap({});
    setEventCheckoutSavingMap({});
    setEventMode('add');
  }

  function switchEventEditTab(nextTab) {
    if (nextTab === eventEditTab) return;
    if (isEventFormDirty && typeof window !== 'undefined') {
      const proceed = window.confirm(copy.unsavedEventTabPrompt);
      if (!proceed) return;
    }
    setEventEditTab(nextTab);
  }

  async function loadEventParticipants(eventId) {
    if (!eventId) {
      setEventParticipants([]);
      setEventCheckinMap({});
      setEventCheckoutMap({});
      setEventCheckoutRankMap({});
      return;
    }
    try {
      setEventParticipantsLoading(true);
      const result = await apiJson(
        `/v1/admin/events/${encodeURIComponent(eventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=200`
      );
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setEventParticipants(rows);
      setEventCheckinMap(() => {
        const next = {};
        rows.forEach((participant, index) => {
          const key = getParticipantCheckinKey(participant, index, eventId);
          if (participant?.checked_in_at) next[key] = true;
        });
        return next;
      });
      setEventCheckoutMap(() => {
        const next = {};
        rows.forEach((participant, index) => {
          const key = getParticipantCheckinKey(participant, index, eventId);
          if (participant?.checked_out_at) next[key] = true;
        });
        return next;
      });
      setEventCheckoutRankMap(() => {
        const next = {};
        rows.forEach((participant, index) => {
          const key = getParticipantCheckinKey(participant, index, eventId);
          if (participant?.rank !== undefined && participant?.rank !== null && participant?.rank !== '') {
            next[key] = String(participant.rank);
          }
        });
        return next;
      });
    } catch (error) {
      setEventParticipants([]);
      setEventCheckinMap({});
      setEventCheckoutMap({});
      setEventCheckoutRankMap({});
      setFeedback(error.message);
    } finally {
      setEventParticipantsLoading(false);
    }
  }

  async function deleteEvent(eventId) {
    if (!eventId) return;
    try {
      setEventSaving(true);
      await apiJson(`/v1/admin/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      setFeedback(getAdminPageCopy('eventDeletedFeedback', { id: eventId }));
      await loadEvents();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEventSaving(false);
    }
  }

  async function shareEvent(item) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const eventId = encodeURIComponent(String(item?.event_id || ''));
    const eventName = String(item?.event_name || 'Event');
    const shareUrl = `${baseUrl}${eventId ? `/a/${encodeURIComponent(accountSlug)}/e/${eventId}` : `/a/${encodeURIComponent(accountSlug)}`}`;
    const shareText = `${eventName}\n${shareUrl}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setFeedback(getAdminPageCopy('eventSharedCopiedFeedback', { name: eventName }));
        return;
      }
      throw new Error('clipboard not available');
    } catch {
      if (typeof window !== 'undefined') {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
      setFeedback(getAdminPageCopy('eventSharedOpenedFeedback', { url: shareUrl }));
    }
  }

  function openEventParticipants(item) {
    setActiveTab('event');
    viewEvent(item);
    setEventEditTab('participants');
    setFeedback(getAdminPageCopy('eventParticipantsOpenedFeedback', { name: item?.event_name || item?.event_id || '-' }));
  }

  function openEventWalkinForm(item) {
    const eventId = String(item?.event_id || '').trim();
    if (!eventId) return;
    if (eventWalkinForm.event_id === eventId && eventMode === 'walkin') {
      setEventWalkinForm(createEmptyEventWalkinForm());
      setEventMode('list');
      return;
    }
    setEventWalkinForm(createEmptyEventWalkinForm(eventId));
    setEventMode('walkin');
  }

  async function submitEventWalkinForm(e) {
    e.preventDefault();
    const eventId = String(eventWalkinForm.event_id || '').trim();
    if (!eventId) return;
    const email = normalizeEmailValue(eventWalkinForm.email);
    const fullName = String(eventWalkinForm.full_name || '').trim();
    const registrationFields = Array.isArray(selectedWalkinEvent?.registration_fields)
      ? selectedWalkinEvent.registration_fields
      : [];
    if (!email) {
      setEventWalkinForm((prev) => ({ ...prev, error: 'Email wajib diisi.' }));
      return;
    }
    for (let i = 0; i < registrationFields.length; i += 1) {
      const field = registrationFields[i] || {};
      const fieldId = String(field.field_id || '');
      const label = String(field.label || `Field ${i + 1}`);
      const value = String(eventWalkinForm.registration_answers[fieldId] || '').trim();
      if (field.required !== false && !value) {
        setEventWalkinForm((prev) => ({ ...prev, error: `${label} wajib diisi.` }));
        return;
      }
    }
    const answersByLabel = registrationFields.reduce((acc, field, index) => {
      const fieldId = String(field?.field_id || '');
      const label = String(field?.label || `Field ${index + 1}`).trim();
      if (!fieldId || !label) return acc;
      const value = String(eventWalkinForm.registration_answers[fieldId] || '').trim();
      if (!value) return acc;
      acc[label] = value;
      return acc;
    }, {});
    try {
      setEventWalkinForm((prev) => ({ ...prev, error: '' }));
      setEventWalkinSavingMap((prev) => ({ ...prev, [eventId]: true }));
      await apiJson(`/v1/events/${encodeURIComponent(eventId)}/register`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          full_name: fullName || null,
          email: email || null,
          registration_answers: answersByLabel
        })
      });
      setFeedback(getAdminPageCopy('walkinRegisteredFeedback', { name: fullName || email }));
      setEventWalkinForm(createEmptyEventWalkinForm());
      setEventMode('list');
      await loadEvents();
      if (editingEventId && editingEventId === eventId) {
        await loadEventParticipants(eventId);
      }
    } catch (error) {
      setEventWalkinForm((prev) => ({ ...prev, error: error.message || 'Gagal registrasi walk-in.' }));
    } finally {
      setEventWalkinSavingMap((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    }
  }

  function getParticipantCheckinKey(participant, index = 0, eventIdOverride = '') {
    const participantKey =
      String(participant?.registration_id || '').trim() ||
      String(participant?.passport_id || '').trim() ||
      String(participant?.email || '').trim().toLowerCase() ||
      `idx_${index}`;
    return `${eventIdOverride || editingEventId || 'event'}::${participantKey}`;
  }

  function getParticipantScanCode(participant, index = 0) {
    const direct = String(participant?.participant_no || participant?.registration_id || '').trim();
    if (direct) return direct;
    const eventKey = compactCode(editingEventId || 'EVT');
    const identityKey = compactCode(
      participant?.passport_id || participant?.email || participant?.full_name || `IDX${index + 1}`
    );
    return `EVR-${eventKey}-${identityKey || `IDX${index + 1}`}`;
  }

  function findParticipantsByScanCode(rawCode) {
    const code = normalizeToken(rawCode);
    if (!code) return [];
    return eventParticipants.filter((participant, index) => {
      const candidates = [
        participant?.participant_no,
        participant?.registration_id,
        participant?.passport_id,
        participant?.email,
        participant?.full_name,
        getParticipantScanCode(participant, index)
      ].map((item) => normalizeToken(item));
      return candidates.some((item) => item && (code === item || code.includes(item) || item.includes(code)));
    });
  }

  function scanCheckinByBarcode() {
    const matches = findParticipantsByScanCode(eventCheckinBarcode);
    if (matches.length === 0) {
      setFeedback(getAdminPageCopy('participantBarcodeNotFound'));
      return;
    }
    if (matches.length > 1) {
      setFeedback(getAdminPageCopy('participantBarcodeAmbiguous'));
      return;
    }
    const participant = matches[0];
    checkinParticipant(participant, getParticipantCheckinKey(participant));
  }

  async function checkinParticipant(participant, keyOverride = '') {
    if (!editingEventId) return;
    const key = keyOverride || getParticipantCheckinKey(participant);
    try {
      setEventCheckinSavingMap((prev) => ({ ...prev, [key]: true }));
      const customFields = parseCustomFieldsInput(eventCheckinCustomFieldsText, 'Check-in');
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}/participants/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          registration_id: participant?.registration_id || null,
          passport_id: participant?.passport_id || null,
          email: participant?.email || null,
          full_name: participant?.full_name || null,
          custom_fields: customFields
        })
      });
      setEventCheckinMap((prev) => ({ ...prev, [key]: true }));
      const participantName = participant?.full_name || participant?.email || participant?.passport_id || '-';
      if (result?.duplicate) {
        setFeedback(getAdminPageCopy('participantCheckinSkipped', { name: participantName }));
      } else {
        setFeedback(getAdminPageCopy('participantCheckinSuccess', { name: participantName }));
      }
      setEventCheckinBarcode('');
      await loadEventParticipants(editingEventId);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEventCheckinSavingMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function checkoutParticipant(row) {
    if (!editingEventId) return;
    if (isFreePlan) {
      setFeedback(getAdminPageCopy('eventUpgradeRequired'));
      return;
    }
    const key = row?.key;
    const participant = row?.participant || {};
    if (!key) return;
    const awardEnabled = isAwardEnabled(eventForm.award_enabled, true);
    if (!awardEnabled) {
      setFeedback(getAdminPageCopy('eventAwardInactive'));
      return;
    }
    const topN = normalizeAwardTopN(eventForm.award_top_n, 1);
    const rankRaw = String(eventCheckoutRankMap[key] || '').trim();
    const rank = rankRaw ? normalizeAwardTopN(rankRaw, 1) : null;
    if (rank !== null && rank > topN) {
      setFeedback(getAdminPageCopy('eventRankMax', { rank: topN }));
      return;
    }
    try {
      setEventCheckoutSavingMap((prev) => ({ ...prev, [key]: true }));
      const customFields = parseCustomFieldsInput(eventCheckoutCustomFieldsText, 'Check-out');
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}/participants/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          registration_id: participant.registration_id || null,
          passport_id: participant.passport_id || null,
          email: participant.email || null,
          full_name: participant.full_name || null,
          rank,
          custom_fields: customFields
        })
      });
      const scorePoints = Number(result?.score_points || 0);
      setEventCheckoutMap((prev) => ({ ...prev, [key]: true }));
      const participantName = participant.full_name || participant.email || participant.passport_id || '-';
      if (result?.duplicate) {
        setFeedback(getAdminPageCopy('participantCheckoutSkipped', { name: participantName }));
      } else {
        setFeedback(
          getAdminPageCopy('participantCheckoutSuccess', {
            name: participantName,
            suffix: rank
              ? getAdminPageCopy('participantCheckoutRankSuffix', { rank, score: scorePoints })
              : ''
          })
        );
      }
      await loadEventParticipants(editingEventId);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEventCheckoutSavingMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function exportEventParticipantsCsv() {
    if (!editingEventId) {
      setFeedback(getAdminPageCopy('eventRequiredForParticipantExport'));
      return;
    }
    const rows = [
      [
        'event_id',
        'registration_id',
        'participant_no',
        'full_name',
        'email',
        'passport_id',
        'registered_at',
        'checked_in_at',
        'checked_out_at',
        'rank',
        'score_points',
        'answers'
      ]
    ];
    eventParticipants.forEach((participant, index) => {
      rows.push([
        editingEventId,
        participant?.registration_id || '',
        getParticipantScanCode(participant, index) || '',
        participant?.full_name || '',
        participant?.email || '',
        participant?.passport_id || '',
        participant?.registered_at || '',
        participant?.checked_in_at || '',
        participant?.checked_out_at || '',
        participant?.rank ?? '',
        Number(participant?.score_points || 0),
        formatRegistrationAnswers(participant?.registration_answers)
      ]);
    });
    const fileId = `${editingEventId}-${new Date().toISOString().slice(0, 10)}`.replace(/[^a-zA-Z0-9_-]/g, '');
    downloadCsvFile(`event-participants-${fileId}.csv`, rows);
    setFeedback(getAdminPageCopy('eventParticipantsExportedFeedback', { count: rows.length - 1 }));
  }

  function preparePostEventQuote() {
    if (!editingEventId) {
      setFeedback(getAdminPageCopy('eventSaveBeforePublish'));
      return;
    }
    if (isEditingEventPublished) {
      setFeedback(getAdminPageCopy('eventAlreadyPublished'));
      return;
    }
    const startAtIso = toApiDatetime(eventForm.start_at);
    const durationMinutes = toDurationMinutes(eventForm.duration_value, eventForm.duration_unit);
    if (!startAtIso) {
      setFeedback(getAdminPageCopy('eventStartInvalid'));
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFeedback(getAdminPageCopy('eventDurationPositiveRequired'));
      return;
    }
    const price = estimateEventPostingPrice(durationMinutes);
    setEventPostQuote({
      start_at: startAtIso,
      duration_minutes: durationMinutes,
      price
    });
  }

  async function moveEventToDraft() {
    if (!editingEventId) return;
    try {
      setEventSaving(true);
      await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          status: getAdminEventWorkflowValue('draftStatus', 'draft')
        })
      });
      await loadEvents();
      setEventPostQuote(null);
      setFeedback(getAdminPageCopy('eventDraftedFeedback', { name: eventForm.event_name || editingEvent?.event_name || editingEventId }));
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEventSaving(false);
    }
  }

  async function proceedPostEventPayment() {
    if (!editingEventId || !eventPostQuote) return;
    try {
      setEventSaving(true);
      const awardEnabled = isFreePlan ? true : isAwardEnabled(eventForm.award_enabled, true);
      const awardScopes = isFreePlan
        ? ['overall']
        : awardEnabled
          ? normalizeEventAwardScopes(eventForm.award_scopes, ['overall'])
          : [];
      const awardTopN = isFreePlan ? 1 : awardEnabled ? normalizeAwardTopN(eventForm.award_top_n, 1) : 0;
      await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          event_name: eventForm.event_name,
          has_coach: eventForm.has_coach !== false,
          trainer_name: eventForm.has_coach !== false ? (eventForm.trainer_name || null) : null,
          coach_shares: eventForm.has_coach !== false
            ? normalizeCoachSharesForPayload(eventForm.coach_shares, 'coach')
            : [],
          location: eventForm.location || null,
          image_url: eventForm.image_url || null,
          description: eventForm.description || null,
          event_categories: normalizeEventCategoriesForPayload(eventForm.categories_text),
          award_enabled: awardEnabled,
          award_scopes: awardScopes,
          award_scope: awardEnabled ? (awardScopes[0] || 'overall') : null,
          award_top_n: awardTopN,
          gallery_images: normalizeGalleryImagesForPayload(eventForm.gallery_images_text),
          schedule_items: normalizeScheduleItemsForPayload(eventForm.schedule_items_text),
          start_at: eventPostQuote.start_at,
          price: Number(eventForm.price || 0),
          max_participants: Math.max(0, Number(eventForm.max_participants || 0)),
          duration_minutes: eventPostQuote.duration_minutes,
          registration_fields: normalizeRegistrationFieldsForPayload(eventForm.registration_fields),
          status: getAdminEventWorkflowValue('publishStatus', 'published')
        })
      });
      await loadEvents();
      if (typeof window !== 'undefined') {
        const postedUrl = `${window.location.origin}/a/${encodeURIComponent(accountSlug)}/e/${encodeURIComponent(editingEventId)}`;
        window.open(postedUrl, '_blank', 'noopener,noreferrer');
      }
      if (enabledAdminTabIds.includes('transaction')) {
        setTransactionForm({
          no_transaction: `TRX-EVT-${Date.now()}`,
          member_id: session?.user?.userId || session?.user?.email || 'owner_self_service',
          product: `Post Event - ${eventForm.event_name || editingEventId}`,
          operation_link: '',
          qty: '1',
          price: String(eventPostQuote.price),
          currency: 'IDR',
          method: 'virtual_account'
        });
        setTransactionDetail(null);
        setPendingPostedEventId(editingEventId);
        setTransactionMode('add');
        setActiveTab('transaction');
        setFeedback(getAdminPageCopy('eventPublishedWithPaymentFeedback', { name: eventForm.event_name }));
      } else {
        setFeedback(getAdminPageCopy('eventPublishedFeedback', { name: eventForm.event_name, price: formatIdr(eventPostQuote.price) }));
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEventSaving(false);
    }
  }

  async function addTransaction(e) {
    e.preventDefault();
    if (!transactionForm.no_transaction || !transactionForm.member_id || !transactionForm.qty || !transactionForm.price) return;
    try {
      const qty = Number(transactionForm.qty || 1);
      const price = Number(transactionForm.price || 0);
      const amount = Math.max(0, qty) * Math.max(0, price);
      if (!Number.isFinite(amount) || amount <= 0) {
        setFeedback(getAdminPageCopy('transactionAmountPositiveRequired'));
        return;
      }
      await apiJson('/v1/payments/record', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          payment_id: transactionForm.no_transaction,
          member_id: transactionForm.member_id,
          amount,
          currency: transactionForm.currency || 'IDR',
          method: transactionForm.method || 'virtual_account',
          reference_type: pendingPostedEventId ? 'event_posting' : 'manual',
          reference_id: pendingPostedEventId || null,
          actor_id: session?.user?.userId || session?.user?.email || 'owner_self_service'
        })
      });
      if (pendingPostedEventId) {
        await apiJson(`/v1/payments/${encodeURIComponent(transactionForm.no_transaction)}/confirm`, {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId,
            note: 'Auto-confirm posting fee'
          })
        });
        if (typeof window !== 'undefined') {
          const postedUrl = `${window.location.origin}/a/${encodeURIComponent(accountSlug)}/e/${encodeURIComponent(pendingPostedEventId)}`;
          window.open(postedUrl, '_blank', 'noopener,noreferrer');
        }
        setFeedback(getAdminPageCopy('paymentRecordedEventFeedback', { transaction: transactionForm.no_transaction }));
        setPendingPostedEventId('');
      } else {
        setFeedback(getAdminPageCopy('transactionCreatedFeedback', { transaction: transactionForm.no_transaction }));
      }
      await loadTransactions();
      setTransactionForm({
        no_transaction: '',
        member_id: '',
        product: '',
        operation_link: '',
        qty: '1',
        price: '',
        currency: 'IDR',
        method: 'virtual_account'
      });
      setTransactionDetail(null);
      setTransactionMode('list');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function confirmTransaction(item) {
    try {
      await apiJson(`/v1/payments/${encodeURIComponent(item.no_transaction)}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      });
      await loadTransactions();
      if (transactionMode === 'detail' && transactionDetail?.no_transaction === item.no_transaction) {
        await refreshTransactionDetail(item.no_transaction);
      }
      setFeedback(getAdminPageCopy('paymentConfirmedFeedback', { transaction: item.no_transaction }));
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function rejectTransaction(item) {
    try {
      const reason =
        typeof window !== 'undefined'
          ? window.prompt(
              getAdminPageCopy('paymentRejectPrompt', { transaction: item.no_transaction }),
              getAdminPageCopy('paymentRejectDefaultReason')
            ) || ''
          : '';
      await apiJson(`/v1/payments/${encodeURIComponent(item.no_transaction)}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          reason: reason.trim() || null
        })
      });
      await loadTransactions();
      if (transactionMode === 'detail' && transactionDetail?.no_transaction === item.no_transaction) {
        await refreshTransactionDetail(item.no_transaction);
      }
      setFeedback(getAdminPageCopy('paymentRejectedFeedback', { transaction: item.no_transaction }));
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function viewTransaction(item) {
    let detailNote = '';
    try {
      const paymentId = String(item?.no_transaction || '').trim();
      if (paymentId) {
        const linksRes = await apiJson(
          `/v1/read/payments/${encodeURIComponent(paymentId)}/links?tenant_id=${encodeURIComponent(tenantId)}`
        ).catch(() => ({ subscription: null, booking: null, pt_package: null }));
        const subscriptionRow = linksRes.subscription || null;
        const bookingRow = linksRes.booking || null;
        const ptBalanceRow = linksRes.pt_package || null;
        if (subscriptionRow) {
          detailNote = `subscription_id=${subscriptionRow.subscription_id || '-'} | plan_id=${subscriptionRow.plan_id || '-'} | end_date=${subscriptionRow.end_date || '-'}`;
        } else if (bookingRow) {
          detailNote = `booking_id=${bookingRow.booking_id || '-'} | class_id=${bookingRow.class_id || '-'} | status=${bookingRow.status || '-'} | booked_at=${bookingRow.booked_at || '-'}`;
        } else if (ptBalanceRow) {
          detailNote = `pt_package_id=${ptBalanceRow.pt_package_id || '-'} | remaining_sessions=${ptBalanceRow.remaining_sessions ?? '-'} | trainer_id=${ptBalanceRow.trainer_id || '-'}`;
        }
      }
    } catch {
      detailNote = '';
    }
    setTransactionDetail({
      no_transaction: item.no_transaction || '',
      member_id: item.member_id || '',
      product: item.product || '',
      operation_link: item.operation_link || '',
      qty: item.qty || '1',
      price: item.price || '',
      currency: item.currency || 'IDR',
      method: item.method || 'virtual_account',
      status: item.status || '-',
      review_note: item.review_note || '',
      recorded_at: item.recorded_at || '',
      reviewed_at: item.reviewed_at || '',
      detail_note: detailNote
    });
    setTransactionMode('detail');
  }

  async function refreshTransactionDetail(paymentId) {
    const targetPaymentId = String(paymentId || '').trim();
    if (!targetPaymentId) return;
    await loadTransactions();
    const paymentsRes = await apiJson(
      `/v1/read/payments/queue?tenant_id=${encodeURIComponent(tenantId)}&status=all`
    ).catch(() => ({ rows: [] }));
    const rows = Array.isArray(paymentsRes.rows) ? paymentsRes.rows : [];
    const paymentRow = rows.find((row) => String(row?.payment_id || '') === targetPaymentId) || null;
    if (!paymentRow) {
      setTransactionDetail(null);
      setTransactionMode('list');
      return;
    }
    await viewTransaction({
      no_transaction: paymentRow.payment_id || '',
      member_id: paymentRow.member_id || '',
      product: transactionDetail?.product || '',
      operation_link: transactionDetail?.operation_link || '',
      qty: '1',
      price: String(paymentRow.amount ?? ''),
      currency: paymentRow.currency || 'IDR',
      method: paymentRow.method || 'virtual_account',
      status: paymentRow.status || '-',
      review_note: paymentRow.review_note || '',
      recorded_at: paymentRow.recorded_at || '',
      reviewed_at: paymentRow.reviewed_at || ''
    });
  }

  function extendSaas(e) {
    e.preventDefault();
    setFeedback(getAdminPageCopy('saasExtendedFeedback', { months: saasForm.months }));
    setSaasForm({ months: '1', note: '' });
  }

  return (
    <main className="dashboard">
      <WorkspaceHeader
        eyebrow={dashboardTitle}
        title={session?.tenant?.gym_name || `Foremoz ${inferredVerticalLabel} Tenant`}
        subtitle={dashboardSubtitle}
        allowedEnv={allowedEnv}
        targetEnv={targetEnv}
        getEnvironmentLabel={getEnvironmentLabel}
        extraActions={role === 'owner' ? (
          <Link className="btn ghost small" to="/host/owner">
            Jump to host setting
          </Link>
        ) : null}
        onSelectEnv={(env) => {
          setTargetEnv(env);
          goToEnv(env);
        }}
        onSignOut={signOut}
      />

      {lockedAdminTabs.length > 0 || lockedWorkspaces.length > 0 ? (
        <section className="card" style={{ marginTop: '1rem', borderStyle: 'dashed' }}>
          <p className="eyebrow">Package gating</p>
          <p className="feedback">
            Paket aktif saat ini: <strong>{packagePlanLabel}</strong>.
          </p>
          {lockedAdminTabs.length > 0 ? (
            <p className="feedback">
              Modul yang belum terbuka: {lockedAdminTabs.map((tab) => tab.label).join(', ')}.
            </p>
          ) : null}
          {lockedWorkspaces.length > 0 ? (
            <p className="feedback">
              Workspace yang belum terbuka: {lockedWorkspaces.map((env) => getEnvironmentLabel(env)).join(', ')}.
            </p>
          ) : null}
          <div className="row-actions" style={{ marginTop: '0.5rem' }}>
            <button className="btn ghost small" type="button" onClick={() => navigate('/host/owner')}>
              Lihat paket & upgrade
            </button>
          </div>
        </section>
      ) : null}

      <section className="card admin-tabs-card">
        <p className="eyebrow">{dashboardMenuLabel}</p>
        <div className="admin-tabs-wrap">
          {visibleAdminTabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                if (
                  activeTab === 'event' &&
                  tab.id !== 'event' &&
                  eventMode === 'add' &&
                  isEventFormDirty &&
                  typeof window !== 'undefined'
                ) {
                  const proceed = window.confirm(copy.unsavedEventMenuPrompt);
                  if (!proceed) return;
                }
                setActiveTab(tab.id);
                if (tab.id === 'class') {
                  setEditingClassId('');
                  setClassForm(createEmptyClassForm());
                  setClassTrainerDraft('');
                  setClassParticipants([]);
                  setClassEditTab('general');
                  setClassMode('list');
                }
                if (tab.id === 'event') {
                  setEditingEventId('');
                  setEventForm(createEmptyEventForm());
                  setEventTemplateWizard('custom');
                  setEventPostQuote(null);
                  setEventParticipants([]);
                  setEventEditTab('general');
                  setEventWalkinForm(createEmptyEventWalkinForm());
                  setEventMode('list');
                }
                if (tab.id === 'user') {
                  setUserMode('list');
                }
                if (tab.id === 'trainer') {
                  setTrainerMode('list');
                }
                if (tab.id === 'product') {
                  setEditingProductId('');
                  setProductForm({ product_name: '', category: 'retail', price: '', stock: '' });
                  setProductMode('list');
                }
                if (tab.id === 'package_creation') {
                  setEditingPackageId('');
                  setPackageForm(createEmptyPackageForm());
                  setPackageMode('list');
                }
                if (tab.id === 'sales') {
                  setSalesMode('list');
                }
                if (tab.id === 'transaction') {
                  setTransactionMode('list');
                }
              }}
            >
              {copy.adminTabs[tab.id] || tab.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '0.8rem' }}>
        <article className="card admin-main">
          {activeTab === 'event' ? (
            <>
              <p className="eyebrow">{copy.eventEyebrow}</p>
              {eventMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{copy.eventListTitle}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={copy.eventSearchPlaceholder}
                        value={eventQuery}
                        onChange={(e) => setEventQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddEvent}>
                        {copy.addNew}
                      </button>
                    </div>
                  </div>
                  {eventLoading ? <p className="feedback">{copy.loadingEventList}</p> : null}
                  <div className="event-card-grid">
                    {filteredEvents.map((item) => (
                      <article key={item.event_id} className="event-admin-card">
                        <img
                          className="event-admin-image"
                          src={resolveEventImage(item)}
                          alt={item.event_name || 'Event'}
                        />
                        <div className="event-admin-body">
                          <div className="event-admin-title-row">
                            <h3>{item.event_name}</h3>
                            <span className="event-admin-status">{displayEventStatus(item.status)}</span>
                          </div>
                          <p>Trainer: {item.trainer_name || '-'}</p>
                          <p>{item.location || '-'}</p>
                          <p>Category: {Array.isArray(item.event_categories) && item.event_categories.length > 0 ? item.event_categories.join(', ') : '-'}</p>
                          {!isFreePlan ? (
                            <p>Award: {isAwardEnabled(item.award_enabled, true) ? formatEventAwardScopes(item.award_scopes ?? item.award_scope) : 'No'}</p>
                          ) : null}
                          {!isFreePlan && isAwardEnabled(item.award_enabled, true) ? <p>Top N: {normalizeAwardTopN(item.award_top_n, 1)}</p> : null}
                          <p>Start: {formatClassDatetime(item.start_at)}</p>
                          <p>Price: {formatIdr(item.price || 0)}</p>
                          <p>Duration: {formatDurationLabelFromMinutes(item.duration_minutes || '60')}</p>
                          <p>
                            Participants: {Number(item.participant_count || 0)}
                            {Number(item.max_participants || 0) > 0 ? ` / ${Number(item.max_participants || 0)}` : ' / unlimited'}
                          </p>
                          <div className="row-actions">
                            <button
                              className="btn ghost small"
                              type="button"
                              onClick={() => openEventWalkinForm(item)}
                            >
                              Walk-in
                            </button>
                            <ParticipantsButton onClick={() => openEventParticipants(item)} />
                            <ShareButton onClick={() => shareEvent(item)} />
                            <ViewButton onClick={() => viewEvent(item)} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : eventMode === 'wizard' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('eventAddTitle')}</h2>
                    <button className="btn ghost" type="button" onClick={() => setEventMode('list')}>
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <div className="class-wizard-shell">
                    <div className="class-wizard-intro card">
                      <p className="eyebrow">{getAdminPageCopy('eventWizardEyebrow')}</p>
                      <h3>{getAdminPageCopy('eventWizardTitle')}</h3>
                      <p className="feedback">Template ini akan memberi titik awal yang lebih fokus. `Custom` tetap membuka form lengkap event seperti sekarang.</p>
                    </div>
                    <div className="class-wizard-grid">
                      {EVENT_TEMPLATE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          className={`class-wizard-card class-wizard-card-${option.visualClass}`}
                          type="button"
                          onClick={() => openEventTemplateWizard(option.id)}
                        >
                          <div className={`class-wizard-visual class-wizard-visual-${option.visualClass}`} aria-hidden="true">
                            <span className="class-wizard-shape class-wizard-shape-a" />
                            <span className="class-wizard-shape class-wizard-shape-b" />
                            <span className="class-wizard-shape class-wizard-shape-c" />
                            <div className="class-wizard-mini-card">
                              <span>{option.accents[0]}</span>
                              <strong>{option.accents[1]}</strong>
                            </div>
                          </div>
                          <div className="class-wizard-copy">
                            <span className="class-wizard-tag">{option.tag}</span>
                            <h3>{option.title}</h3>
                            <p>{option.description}</p>
                            <span className="class-wizard-cta">Pilih mode</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : eventMode === 'walkin' && selectedWalkinEvent ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('eventWalkinRegistrationTitle')}</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setEventWalkinForm(createEmptyEventWalkinForm());
                        setEventMode('list');
                      }}
                    >
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <form className="card" style={{ borderStyle: 'dashed', marginBottom: '0.8rem' }} onSubmit={submitEventWalkinForm}>
                    <p className="feedback" style={{ marginBottom: '0.6rem' }}>
                      Event: <strong>{selectedWalkinEvent.event_name || selectedWalkinEvent.event_id}</strong>
                    </p>
                    <p className="feedback" style={{ marginBottom: '0.6rem' }}>
                      Harga: <strong>{formatIdr(selectedWalkinEvent.price || 0)}</strong>
                    </p>
                    <label>
                      Nama
                      <input
                        value={eventWalkinForm.full_name}
                        onChange={(e) => setEventWalkinForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={eventWalkinForm.email}
                        onChange={(e) => setEventWalkinForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </label>
                    {Array.isArray(selectedWalkinEvent.registration_fields) && selectedWalkinEvent.registration_fields.length > 0 ? (
                      <>
                        <p className="eyebrow">{getAdminPageCopy('eventOrganizerInfoEyebrow')}</p>
                        {selectedWalkinEvent.registration_fields.map((field, index) => {
                          const fieldId = String(field?.field_id || `field_${index}`);
                          const type = String(field?.type || 'free_type');
                          const label = String(field?.label || `Field ${index + 1}`);
                          const isRequired = field?.required !== false;
                          const value = String(eventWalkinForm.registration_answers[fieldId] || '');
                          if (type === 'date') {
                            return (
                              <label key={fieldId}>
                                {label}{isRequired ? ' *' : ''}
                                <input
                                  type="date"
                                  value={value}
                                  onChange={(e) =>
                                    setEventWalkinForm((prev) => ({
                                      ...prev,
                                      registration_answers: { ...prev.registration_answers, [fieldId]: e.target.value }
                                    }))
                                  }
                                />
                              </label>
                            );
                          }
                          if (type === 'lookup') {
                            const options = Array.isArray(field?.options) ? field.options : [];
                            return (
                              <label key={fieldId}>
                                {label}{isRequired ? ' *' : ''}
                                <select
                                  value={value}
                                  onChange={(e) =>
                                    setEventWalkinForm((prev) => ({
                                      ...prev,
                                      registration_answers: { ...prev.registration_answers, [fieldId]: e.target.value }
                                    }))
                                  }
                                >
                                  <option value="">{getAdminPageCopy('lookupSelect')}</option>
                                  {options.map((opt, optIndex) => (
                                    <option key={`${fieldId}-${optIndex}`} value={String(opt)}>
                                      {String(opt)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          }
                          return (
                            <label key={fieldId}>
                              {label}{isRequired ? ' *' : ''}
                              <input
                                value={value}
                                onChange={(e) =>
                                  setEventWalkinForm((prev) => ({
                                    ...prev,
                                    registration_answers: { ...prev.registration_answers, [fieldId]: e.target.value }
                                  }))
                                }
                              />
                            </label>
                          );
                        })}
                      </>
                    ) : null}
                    {eventWalkinForm.error ? <p className="error">{eventWalkinForm.error}</p> : null}
                    <div className="row-actions">
                      <button
                        className="btn"
                        type="submit"
                        disabled={Boolean(eventWalkinSavingMap[selectedWalkinEvent.event_id])}
                      >
                        {eventWalkinSavingMap[selectedWalkinEvent.event_id] ? 'Registering...' : 'Simpan Walk-in'}
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => {
                          setEventWalkinForm(createEmptyEventWalkinForm());
                          setEventMode('list');
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>
                      {editingEventId
                        ? getAdminPageCopy('eventEditTitle', { name: eventForm.event_name || '' }).trim()
                        : getAdminPageCopy('eventAddTemplateTitle', { template: getEventEditorTemplateLabel(eventEditorTemplate) })}
                    </h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        if (isEventFormDirty && typeof window !== 'undefined') {
                          const proceed = window.confirm(copy.unsavedEventListPrompt);
                          if (!proceed) return;
                        }
                        if (editingEventId) {
                          setEventMode('list');
                          return;
                        }
                        startAddEvent();
                      }}
                    >
                      {editingEventId ? getAdminPageCopy('backToList') : getAdminPageCopy('backToWizard')}
                    </button>
                  </div>
                  {!editingEventId ? (
                    <div className="card" style={{ borderStyle: 'dashed', marginBottom: '0.75rem' }}>
                      <p className="eyebrow">{getAdminPageCopy('modeEyebrow')}</p>
                      <p className="feedback">
                        Form ini sedang memakai mode <strong>{getEventEditorTemplateLabel(eventEditorTemplate)}</strong>.
                        {isCustomEventEditor
                          ? ' Semua field event tetap tersedia.'
                          : ' Field utama sudah diarahkan sesuai jenis event yang Anda pilih.'}
                      </p>
                      <button className="btn ghost small" type="button" onClick={startAddEvent}>
                        Ganti mode
                      </button>
                    </div>
                  ) : null}
                  <div className="landing-tabs" style={{ marginBottom: '0.8rem' }}>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'general' ? 'active' : ''}`}
                      onClick={() => switchEventEditTab('general')}
                    >
                      General information
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'category' ? 'active' : ''}`}
                      onClick={() => switchEventEditTab('category')}
                    >
                      Category
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'custom_fields' ? 'active' : ''}`}
                      onClick={() => switchEventEditTab('custom_fields')}
                    >
                      Custom fields
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'member_info' ? 'active' : ''}`}
                      onClick={() => switchEventEditTab('member_info')}
                    >
                      Member info
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'participants' ? 'active' : ''}`}
                      onClick={() => switchEventEditTab('participants')}
                    >
                      Participants
                    </button>
                  </div>
                  <form className="form" onSubmit={addEvent}>
                    {eventEditTab === 'general' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                        <label>Event Name<input value={eventForm.event_name} onChange={(e) => setEventForm((p) => ({ ...p, event_name: e.target.value }))} /></label>
                        <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={eventAiWorking}
                            onClick={aiRewriteTitle}
                          >
                            AI Rewrite Title
                          </button>
                        </div>
                        {!editingEventId ? (
                          <p className="feedback">
                            {isCompetitionEventEditor
                              ? 'Mode competition menyiapkan event dengan award, leaderboard, dan kapasitas peserta.'
                              : isWorkshopEventEditor
                                ? 'Mode workshop fokus ke materi, trainer, dan kapasitas peserta.'
                                : isCommunityEventEditor
                                  ? 'Mode community gathering dibuat lebih ringan, tanpa coach wajib dan tanpa award.'
                                  : isClassEventEditor
                                    ? 'Mode class / training fokus ke trainer, rundown sesi, dan peserta.'
                                    : 'Mode custom membuka semua field event untuk konfigurasi bebas.'}
                          </p>
                        ) : null}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={showEventCoachFields}
                            onChange={(e) =>
                              setEventForm((prev) => ({
                                ...prev,
                                has_coach: e.target.checked,
                                trainer_name: e.target.checked ? prev.trainer_name : '',
                                coach_shares: e.target.checked ? prev.coach_shares : []
                              }))
                            }
                          />
                          <span>Event ini punya coach</span>
                        </label>
                        {showEventCoachFields ? (
                        <div className="card" style={{ borderStyle: 'dashed' }}>
                          <p className="eyebrow">{creatorLabel} Name (token input)</p>
                          <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                            {selectedEventTrainerTokens.length === 0 ? <span className="feedback">Belum ada {creatorLabelLower} dipilih.</span> : null}
                            {selectedEventTrainerTokens.map((name) => (
                              <span key={name} className="passport-chip">
                                {name}
                                <button
                                  type="button"
                                  className="btn ghost small"
                                  style={{ marginLeft: '0.35rem' }}
                                  onClick={() => removeEventTrainerToken(name)}
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                          {availableEventTrainerOptions.length > 0 ? (
                            <label>
                              Pilih dari {creatorLabelLower} aktif
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) addEventTrainerToken(e.target.value);
                                }}
                              >
                                <option value="">{getAdminPageCopy('creatorSelect', { creator: creatorLabelLower })}</option>
                                {availableEventTrainerOptions.map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <p className="feedback">
                              Belum ada {creatorLabelLower} aktif di tenant. Tambahkan user role `pt` atau `owner`, atau isi manual.
                            </p>
                          )}
                          <label>
                            Tambah manual
                            <input
                              value={eventTrainerDraft}
                              placeholder={`Ketik nama ${creatorLabelLower} lalu Enter`}
                              onChange={(e) => setEventTrainerDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addEventTrainerToken(eventTrainerDraft);
                                }
                              }}
                            />
                          </label>
                          <p className="feedback">Tersimpan sebagai: {eventForm.trainer_name || '-'}</p>
                          {selectedEventTrainerTokens.length > 0 ? (
                            <div className="card" style={{ borderStyle: 'dashed' }}>
                              <p className="eyebrow">{creatorLabel} Share</p>
                              <p className="feedback">Masukkan % komisi/share per coach yang terlibat. Total boleh kurang dari atau sama dengan 100%.</p>
                              <div className="entity-list">
                                {selectedEventTrainerTokens.map((coachName) => {
                                  const currentRow = (eventForm.coach_shares || []).find((item) => item.coach_name === coachName) || { coach_name: coachName, share_percent: '' };
                                  return (
                                    <div key={`event-share-${coachName}`} className="entity-row">
                                      <div>
                                        <strong>{coachName}</strong>
                                        <p>% dari event</p>
                                      </div>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={currentRow.share_percent || ''}
                                        placeholder={getAdminPageCopy('sharePlaceholder')}
                                        onChange={(e) =>
                                          setEventForm((prev) => ({
                                            ...prev,
                                            coach_shares: syncCoachSharesWithTrainerNames(
                                              prev.trainer_name,
                                              upsertCoachShareValue(prev.coach_shares, coachName, e.target.value)
                                            )
                                          }))
                                        }
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="feedback">Total share terisi: {Number(totalEventCoachShare || 0).toFixed(2)}%</p>
                            </div>
                          ) : null}
                        </div>
                        ) : (
                          <p className="feedback">Mode ini tidak mewajibkan coach. Cocok untuk meetup, gathering, atau event umum tanpa instruktur khusus.</p>
                        )}
                        <label>Location<input value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} /></label>
                        <label>Image URL<input value={eventForm.image_url} onChange={(e) => setEventForm((p) => ({ ...p, image_url: e.target.value }))} /></label>
                        <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                          <button
                            className="btn ghost small"
                            type="button"
                            onClick={() => eventImageFileInputRef.current?.click()}
                          >
                            Upload Cover Image
                          </button>
                          <input
                            ref={eventImageFileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                uploadOwnEventImage(file);
                              }
                              e.target.value = '';
                            }}
                          />
                        </div>
                        <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={eventAiWorking}
                            onClick={aiFillGalleryFromPexels}
                          >
                            AI Fill Gallery
                          </button>
                        </div>
                        <label>
                          description
                          <textarea
                            rows={4}
                            value={eventForm.description}
                            onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                          />
                        </label>
                        <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={eventAiWorking}
                            onClick={aiGenerateDescription}
                          >
                            AI Generate Description
                          </button>
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={eventAiWorking}
                            onClick={aiShortenDescription}
                          >
                            AI Shorten Description
                          </button>
                        </div>
                        <label>
                          Gallery Images (satu URL per baris)
                          <textarea
                            rows={4}
                            placeholder={'https://...\nhttps://...'}
                            value={eventForm.gallery_images_text}
                            onChange={(e) => setEventForm((p) => ({ ...p, gallery_images_text: e.target.value }))}
                          />
                        </label>
                        <label>
                          Schedule Items (format: waktu | judul | catatan)
                          <textarea
                            rows={5}
                            placeholder={'09:00 | Registrasi | Check in peserta\n09:30 | Opening | Sambutan coach'}
                            value={eventForm.schedule_items_text}
                            onChange={(e) => setEventForm((p) => ({ ...p, schedule_items_text: e.target.value }))}
                          />
                        </label>
                        <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={eventAiWorking}
                            onClick={aiGenerateRundown}
                          >
                            AI Generate Rundown
                          </button>
                          <button
                            className="btn ghost small"
                            type="button"
                            disabled={eventAiWorking}
                            onClick={aiImproveRundown}
                          >
                            AI Improve Rundown
                          </button>
                        </div>
                        <label>Start At<input type="datetime-local" value={eventForm.start_at} onChange={(e) => setEventForm((p) => ({ ...p, start_at: e.target.value }))} /></label>
                        <label>Price<input type="number" min="0" value={eventForm.price} onChange={(e) => setEventForm((p) => ({ ...p, price: e.target.value }))} /></label>
                        <label>
                          Max Peserta (0 = unlimited)
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={eventForm.max_participants}
                            onChange={(e) => setEventForm((p) => ({ ...p, max_participants: e.target.value }))}
                          />
                        </label>
                        <label>
                          Duration Value
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={eventForm.duration_value}
                            onChange={(e) => setEventForm((p) => ({ ...p, duration_value: e.target.value }))}
                          />
                        </label>
                        <label>
                          Duration Unit
                          <select
                            value={eventForm.duration_unit}
                            onChange={(e) => setEventForm((p) => ({ ...p, duration_unit: e.target.value }))}
                          >
                            {EVENT_DURATION_UNITS.map((unit) => (
                              <option key={unit.value} value={unit.value}>{unit.label}</option>
                            ))}
                          </select>
                        </label>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('aiAssistEyebrow')}</p>
                            <label>
                              Brief Event
                              <textarea
                                rows={4}
                                placeholder={getAdminPageCopy('eventBriefPlaceholder')}
                                value={eventForm.brief_event}
                                onChange={(e) => setEventForm((p) => ({ ...p, brief_event: e.target.value }))}
                              />
                            </label>
                            <div className="row-actions">
                              <button
                                className="btn ghost small"
                                type="button"
                                disabled={eventAiWorking}
                                onClick={aiGenerateDraftFromBrief}
                              >
                                Generate Draft From Brief
                              </button>
                            </div>
                            <p className="feedback">
                              Tulis tujuan event, lokasi, jam, topik, dan vibe yang Anda mau. Draft AI akan membantu mengisi nama, deskripsi, rundown, dan arahan awal lainnya.
                            </p>
                            {eventAiWorking ? <p className="feedback">AI assist running...</p> : null}
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {eventEditTab === 'category' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('eventCategoryEyebrow')}</p>
                            <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                disabled={eventAiWorking}
                                onClick={aiSuggestCategory}
                              >
                                AI Suggest Category
                              </button>
                            </div>
                            <p className="feedback">{eventCategoryInstruction}</p>
                            <textarea
                              rows={4}
                              placeholder={eventCategoryPlaceholder}
                              value={eventForm.categories_text}
                              onChange={(e) => setEventForm((p) => ({ ...p, categories_text: e.target.value }))}
                            />
                            <p className="feedback">
                              Preview: {normalizeEventCategoriesForPayload(eventForm.categories_text).join(' | ') || '-'}
                            </p>
                            {showEventAwardSettings ? (
                              <>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600 }}>Award applicable?</p>
                              <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.35rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                  <input
                                    type="radio"
                                    name="award_enabled"
                                    checked={isFreePlan ? true : isAwardEnabled(eventForm.award_enabled, true)}
                                    disabled={isFreePlan}
                                    onChange={() => setEventForm((p) => ({ ...p, award_enabled: true }))}
                                  />
                                  <span>Yes</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                  <input
                                    type="radio"
                                    name="award_enabled"
                                    checked={!isFreePlan && !isAwardEnabled(eventForm.award_enabled, true)}
                                    disabled={isFreePlan}
                                    onChange={() => setEventForm((p) => ({ ...p, award_enabled: false }))}
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </div>
                            {isFreePlan ? (
                              <p className="feedback">Award scope tersedia untuk paket Starter ke atas.</p>
                            ) : (
                              <p className="feedback">
                                Setting saat ini: {isAwardEnabled(eventForm.award_enabled, true) ? formatEventAwardScopes(eventForm.award_scopes) : 'No award'}
                              </p>
                            )}
                            {isFreePlan || isAwardEnabled(eventForm.award_enabled, true) ? (
                              <>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 600 }}>Award scope</p>
                                  <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.35rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                      <input
                                        type="checkbox"
                                        checked={normalizeEventAwardScopes(eventForm.award_scopes, ['overall']).includes('overall')}
                                        disabled={isFreePlan}
                                        onChange={(e) =>
                                          setEventForm((p) => {
                                            const current = normalizeEventAwardScopes(p.award_scopes, ['overall']);
                                            const next = e.target.checked
                                              ? [...new Set([...current, 'overall'])]
                                              : current.filter((scope) => scope !== 'overall');
                                            return { ...p, award_scopes: normalizeEventAwardScopes(next, ['overall']) };
                                          })
                                        }
                                      />
                                      <span>Overall</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                      <input
                                        type="checkbox"
                                        checked={normalizeEventAwardScopes(eventForm.award_scopes, ['overall']).includes('category')}
                                        disabled={isFreePlan}
                                        onChange={(e) =>
                                          setEventForm((p) => {
                                            const current = normalizeEventAwardScopes(p.award_scopes, ['overall']);
                                            const next = e.target.checked
                                              ? [...new Set([...current, 'category'])]
                                              : current.filter((scope) => scope !== 'category');
                                            return { ...p, award_scopes: normalizeEventAwardScopes(next, ['overall']) };
                                          })
                                        }
                                      />
                                      <span>Per kategori</span>
                                    </label>
                                  </div>
                                </div>
                                <label>
                                  Top N
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={isFreePlan ? '1' : eventForm.award_top_n || '1'}
                                    disabled={isFreePlan}
                                    onChange={(e) => setEventForm((p) => ({ ...p, award_top_n: e.target.value }))}
                                  />
                                </label>
                                {isFreePlan ? <p className="feedback">Top N award tersedia untuk paket Starter ke atas.</p> : null}
                              </>
                            ) : (
                              <p className="feedback">Award dinonaktifkan untuk event ini.</p>
                            )}
                              </>
                            ) : (
                              <p className="feedback">Award disembunyikan untuk mode ini. Gunakan `Race / competition` atau `Custom` jika event butuh ranking atau pemenang.</p>
                            )}
                          </div>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                            <p className="feedback">
                              <strong>Category:</strong> isi dengan label yang dipakai untuk grouping event, misalnya `fun run`, `seminar`, `workshop`, atau `competition`.
                            </p>
                            <p className="feedback">
                              <strong>Award:</strong> aktifkan jika event punya ranking atau pemenang. Gunakan `overall` untuk juara umum dan `per kategori` jika pemenang dibedakan menurut kategori event.
                            </p>
                            <p className="feedback">
                              <strong>Top N:</strong> jumlah pemenang yang ingin ditampilkan atau diproses. Untuk event biasa tanpa leaderboard, award bisa dimatikan.
                            </p>
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {eventEditTab === 'custom_fields' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('registrationFieldsEyebrow')}</p>
                            <p className="feedback">Informasi yang dikumpulkan saat member register event.</p>
                            <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                disabled={eventAiWorking}
                                onClick={aiSuggestFields}
                              >
                                AI Suggest Fields
                              </button>
                            </div>
                            <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    registration_fields: [...(prev.registration_fields || []), createRegistrationField('free_type')]
                                  }))
                                }
                              >
                                + free type
                              </button>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    registration_fields: [...(prev.registration_fields || []), createRegistrationField('date')]
                                  }))
                                }
                              >
                                + date
                              </button>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setEventForm((prev) => ({
                                    ...prev,
                                    registration_fields: [...(prev.registration_fields || []), createRegistrationField('lookup')]
                                  }))
                                }
                              >
                                + lookup
                              </button>
                            </div>
                            {(eventForm.registration_fields || []).length === 0 ? (
                              <p className="feedback">Belum ada custom field. Contoh: Kota, Tahu dari mana?, Sekolah, Jenis kelamin.</p>
                            ) : (
                              <div className="entity-list">
                                {(eventForm.registration_fields || []).map((field, index) => (
                                  <div key={field.field_id || index} className="card" style={{ marginBottom: '0.5rem' }}>
                                    <label>
                                      Label
                                      <input
                                        value={field.label || ''}
                                        onChange={(e) =>
                                          setEventForm((prev) => ({
                                            ...prev,
                                            registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                              idx === index ? { ...item, label: e.target.value } : item
                                            )
                                          }))
                                        }
                                      />
                                    </label>
                                    <label>
                                      Type
                                      <select
                                        value={field.type || 'free_type'}
                                        onChange={(e) =>
                                          setEventForm((prev) => ({
                                            ...prev,
                                            registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                              idx === index ? { ...item, type: e.target.value } : item
                                            )
                                          }))
                                        }
                                      >
                                        {REGISTRATION_FIELD_TYPE_OPTIONS.map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                                      <span className="feedback" style={{ margin: 0 }}>Required field</span>
                                      <input
                                        type="checkbox"
                                        checked={field.required !== false}
                                        onChange={(e) =>
                                          setEventForm((prev) => ({
                                            ...prev,
                                            registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                              idx === index ? { ...item, required: e.target.checked } : item
                                            )
                                          }))
                                        }
                                      />
                                    </div>
                                    {String(field.type || 'free_type') === 'lookup' ? (
                                      <label>
                                        Options (pisahkan dengan koma)
                                        <input
                                          value={field.options_text || ''}
                                          onChange={(e) =>
                                            setEventForm((prev) => ({
                                              ...prev,
                                              registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                                idx === index ? { ...item, options_text: e.target.value } : item
                                              )
                                            }))
                                          }
                                        />
                                      </label>
                                    ) : null}
                                    <button
                                      className="btn ghost small"
                                      type="button"
                                      onClick={() =>
                                        setEventForm((prev) => ({
                                          ...prev,
                                          registration_fields: (prev.registration_fields || []).filter((_, idx) => idx !== index)
                                        }))
                                      }
                                    >
                                      Hapus field
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                            <p className="feedback">
                              <strong>Gunakan seperlunya:</strong> tambah field hanya jika benar-benar dibutuhkan saat registrasi. Terlalu banyak field biasanya menurunkan conversion.
                            </p>
                            <p className="feedback">
                              <strong>free type:</strong> untuk jawaban bebas seperti kota, sekolah, atau nama komunitas. <strong>date:</strong> untuk tanggal lahir atau tanggal kedatangan. <strong>lookup:</strong> untuk pilihan tetap seperti gender, ukuran jersey, atau sumber info.
                            </p>
                            <p className="feedback">
                              <strong>Required:</strong> aktifkan hanya untuk data yang wajib secara operasional. Kalau field hanya untuk insight tambahan, lebih aman dibuat opsional.
                            </p>
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {eventEditTab === 'member_info' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('eventBeforeInfoEyebrow')}</p>
                            <p className="feedback">Informasi yang muncul di dashboard member setelah mereka berhasil join, sebelum acara dimulai.</p>
                            <label>
                              Free text
                              <textarea
                                rows={5}
                                placeholder={getAdminPageCopy('eventBeforeInfoPlaceholder')}
                                value={eventForm.pre_event_info_text}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, pre_event_info_text: e.target.value }))}
                              />
                            </label>
                            <label>
                              Attachment URLs
                              <textarea
                                rows={4}
                                placeholder={'https://.../guide.pdf\nhttps://.../map.png'}
                                value={eventForm.pre_event_attachments_text}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, pre_event_attachments_text: e.target.value }))}
                              />
                            </label>
                            <div className="row-actions">
                              <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                                Upload attachment
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) uploadEventInfoAttachment(file, 'pre');
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                            <div className="entity-list">
                              {normalizeAttachmentUrlsText(eventForm.pre_event_attachments_text).map((url) => (
                                <div className="entity-row" key={`event-pre-${url}`}>
                                  <div>
                                    <strong>{getAttachmentNameFromUrl(url)}</strong>
                                    <p>{url}</p>
                                  </div>
                                  <button
                                    className="btn ghost small"
                                    type="button"
                                    onClick={() =>
                                      setEventForm((prev) => ({
                                        ...prev,
                                        pre_event_attachments_text: normalizeAttachmentUrlsText(prev.pre_event_attachments_text)
                                          .filter((item) => item !== url)
                                          .join('\n')
                                      }))
                                    }
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ))}
                              {normalizeAttachmentUrlsText(eventForm.pre_event_attachments_text).length === 0 ? (
                                <p className="feedback">Belum ada attachment sebelum event.</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('eventAfterInfoEyebrow')}</p>
                            <p className="feedback">Informasi follow-up setelah acara selesai, misalnya link sertifikat, dokumentasi, atau langkah lanjutan.</p>
                            <label>
                              Free text
                              <textarea
                                rows={5}
                                placeholder={getAdminPageCopy('eventAfterInfoPlaceholder')}
                                value={eventForm.post_event_info_text}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, post_event_info_text: e.target.value }))}
                              />
                            </label>
                            <label>
                              Attachment URLs
                              <textarea
                                rows={4}
                                placeholder={'https://.../deck.pdf\nhttps://.../sertifikat.png'}
                                value={eventForm.post_event_attachments_text}
                                onChange={(e) => setEventForm((prev) => ({ ...prev, post_event_attachments_text: e.target.value }))}
                              />
                            </label>
                            <div className="row-actions">
                              <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                                Upload attachment
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) uploadEventInfoAttachment(file, 'post');
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                            <div className="entity-list">
                              {normalizeAttachmentUrlsText(eventForm.post_event_attachments_text).map((url) => (
                                <div className="entity-row" key={`event-post-${url}`}>
                                  <div>
                                    <strong>{getAttachmentNameFromUrl(url)}</strong>
                                    <p>{url}</p>
                                  </div>
                                  <button
                                    className="btn ghost small"
                                    type="button"
                                    onClick={() =>
                                      setEventForm((prev) => ({
                                        ...prev,
                                        post_event_attachments_text: normalizeAttachmentUrlsText(prev.post_event_attachments_text)
                                          .filter((item) => item !== url)
                                          .join('\n')
                                      }))
                                    }
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ))}
                              {normalizeAttachmentUrlsText(eventForm.post_event_attachments_text).length === 0 ? (
                                <p className="feedback">Belum ada attachment sesudah event.</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                            <p className="feedback">
                              <strong>Before event:</strong> isi hal yang harus diketahui member sebelum datang, seperti rundown, dress code, meeting point, atau barang yang wajib dibawa.
                            </p>
                            <p className="feedback">
                              <strong>After event:</strong> isi follow-up seperti materi, dokumentasi, sertifikat, hasil acara, atau CTA lanjutan.
                            </p>
                            <p className="feedback">
                              <strong>Attachment:</strong> gunakan untuk map, guidebook, rundown PDF, poster, atau file pendukung lain. URL manual tetap bisa dipakai jika file sudah ada di tempat lain.
                            </p>
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {eventEditTab === 'participants' ? (
                      editingEventId ? (
                        <div className="card" style={{ borderStyle: 'dashed' }}>
                          <div className="panel-head" style={{ marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0 }}>Participants</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={exportEventParticipantsCsv}
                                disabled={eventParticipantsLoading || eventParticipants.length === 0}
                              >
                                Export CSV
                              </button>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() => loadEventParticipants(editingEventId)}
                                disabled={eventParticipantsLoading}
                              >
                                {eventParticipantsLoading ? getAdminPageCopy('refreshing') : getAdminPageCopy('refresh')}
                              </button>
                            </div>
                          </div>
                          {!isEditingEventPublished ? (
                            <div className="card" style={{ borderStyle: 'dashed', marginBottom: '0.6rem' }}>
                              <p className="eyebrow">{getAdminPageCopy('guideEyebrow')}</p>
                              <p className="feedback">{getAdminPageCopy('eventDraftParticipantGuide')}</p>
                              <p className="feedback">{getAdminPageCopy('eventParticipantQuickGuide')}</p>
                            </div>
                          ) : null}
                          <div className="form" style={{ marginBottom: '0.6rem' }}>
                            <label>
                              Check-in custom_fields (JSON, optional)
                              <textarea
                                rows={2}
                                value={eventCheckinCustomFieldsText}
                                onChange={(e) => setEventCheckinCustomFieldsText(e.target.value)}
                                placeholder='{"gate":"east","operator":"admin-1"}'
                              />
                            </label>
                            <label>
                              Check-out custom_fields (JSON, optional)
                              <textarea
                                rows={2}
                                value={eventCheckoutCustomFieldsText}
                                onChange={(e) => setEventCheckoutCustomFieldsText(e.target.value)}
                                placeholder='{"judge":"coach-a","score_source":"manual"}'
                              />
                            </label>
                          </div>
                          {eventParticipantsLoading ? <p className="feedback">{getAdminPageCopy('loadingParticipants')}</p> : null}
                          {!eventParticipantsLoading && eventParticipants.length === 0 ? (
                            <p className="feedback">{getAdminPageCopy('eventParticipantsEmpty')}</p>
                          ) : null}
                          {!eventParticipantsLoading && eventParticipants.length > 0 ? (
                            <div className="entity-list">
                              {eventParticipants.map((participant, index) => (
                                <div className="entity-row" key={participant.registration_id || `${participant.email || participant.passport_id || 'participant'}-${index}`}>
                                  <div>
                                    <strong>{participant.full_name || participant.email || participant.passport_id || 'Participant'}</strong>
                                    <p>{participant.email || '-'}</p>
                                    <p>Unique No: {getParticipantScanCode(participant, index)}</p>
                                    <p>Registered: {formatClassDatetime(participant.registered_at || '')}</p>
                                    <p>Answers: {formatRegistrationAnswers(participant.registration_answers)}</p>
                                    <p>Checkout: {participant.checked_out_at ? 'Sudah checkout' : 'Belum checkout'}</p>
                                    <p>Checkin fields: {participant.checkin_custom_fields && Object.keys(participant.checkin_custom_fields).length > 0 ? JSON.stringify(participant.checkin_custom_fields) : '-'}</p>
                                    <p>Checkout fields: {participant.checkout_custom_fields && Object.keys(participant.checkout_custom_fields).length > 0 ? JSON.stringify(participant.checkout_custom_fields) : '-'}</p>
                                    {participant.rank !== undefined && participant.rank !== null ? (
                                      <p>Rank: #{participant.rank} | Score: {Number(participant.score_points || 0)}</p>
                                    ) : (
                                      <p>Score: {Number(participant.score_points || 0)}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="feedback">{getAdminPageCopy('eventParticipantsRequiresSave')}</p>
                      )
                    ) : null}
                    {eventEditTab === 'general' ? (
                      <>
                        <button className="btn" type="submit" disabled={eventSaving}>{eventSaving ? getAdminPageCopy('saving') : getAdminPageCopy('saveEvent')}</button>
                        {editingEventId && !isEditingEventPublished ? (
                          <button className="btn ghost" type="button" disabled={eventSaving} onClick={preparePostEventQuote}>
                            Publikasikan Event
                          </button>
                        ) : null}
                        {editingEventId && isEditingEventPublished ? (
                          <>
                            <p className="feedback">Status: Dipublikasikan</p>
                            <button className="btn ghost" type="button" disabled={eventSaving} onClick={moveEventToDraft}>
                              Turunkan ke Draft
                            </button>
                          </>
                        ) : null}
                        {editingEventId ? (
                          <button
                            className="btn ghost"
                            type="button"
                            disabled={eventSaving}
                            onClick={async () => {
                              await deleteEvent(editingEventId);
                              setEditingEventId('');
                              setEventForm(createEmptyEventForm());
                              setEventParticipants([]);
                              setEventMode('list');
                            }}
                          >
                            Delete event
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </form>
                  {editingEventId && eventPostQuote && !isEditingEventPublished ? (
                    <div className="card" style={{ marginTop: '0.8rem', borderStyle: 'dashed' }}>
                      <p className="eyebrow">{getAdminPageCopy('eventPublicationPreviewEyebrow')}</p>
                      <p>{getAdminPageCopy('eventPublicationStartLabel')}: {formatClassDatetime(eventPostQuote.start_at)}</p>
                      <p>{getAdminPageCopy('eventPublicationDurationLabel')}: {formatDurationLabelFromMinutes(eventPostQuote.duration_minutes)}</p>
                      <p>{getAdminPageCopy('eventPublicationFeeLabel')}: <strong>{formatIdr(eventPostQuote.price)}</strong></p>
                      <button className="btn" type="button" disabled={eventSaving} onClick={proceedPostEventPayment}>
                        {getAdminPageCopy('eventPublishNowButton')}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {activeTab === 'user' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('userEyebrow')}</p>
              {userMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('userListTitle')}</h2>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setUserForm({ full_name: '', email: '', role: 'staff' });
                        setUserMode('add');
                      }}
                    >
                      {getAdminPageCopy('addNew')}
                    </button>
                  </div>
                  <div className="entity-list">
                    {users.map((item) => (
                      <div className="entity-row" key={item.user_id}>
                        <div>
                          <strong>{item.full_name}</strong>
                          <p>{item.email} - {item.role}</p>
                        </div>
                        <div className="row-actions">
                          <ViewButton onClick={() => viewUser(item)} />
                          <DeleteButton onClick={() => setUsers((prev) => prev.filter((v) => v.user_id !== item.user_id))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {userMode === 'add' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('userAddTitle')}</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setUserMode('list');
                      }}
                    >
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <form className="form" onSubmit={addUser}>
                    <label>full_name<input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
                    <label>email<input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></label>
                    <label>role<select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                      {USER_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select></label>
                    <button className="btn" type="submit">{getAdminPageCopy('saveUser')}</button>
                  </form>
                </>
              ) : null}
            </>
          ) : null}

          {activeTab === 'class' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('programEyebrow')}</p>
              {classMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('programListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('programSearchPlaceholder')}
                        value={classQuery}
                        onChange={(e) => setClassQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddClass}>
                        {getAdminPageCopy('addNew')}
                      </button>
                    </div>
                  </div>
                  {classLoading ? <p className="feedback">{getAdminPageCopy('loadingProgramList')}</p> : null}
                  <div className="event-card-grid">
                    {filteredClasses.map((item) => {
                      const customFields = splitClassCustomFields(item.custom_fields, item.category || '');
                      const coachLabel = item.has_coach !== false ? (item.trainer_name || item.coach_id || '-') : 'No coach';
                      const categoryLabel = customFields.categories_text || item.category || item.category_id || '-';
                      const locationLabel = customFields.location || '-';
                      const templateLabel = getClassEditorTemplateLabel(inferClassEditorTemplate(item));
                      const capacityLabel = item.class_type === 'scheduled'
                        ? item.capacity || '-'
                        : String(item.usage_mode || '').toLowerCase() === 'limited'
                          ? `${item.usage_limit || '-'} use`
                          : 'Unlimited';
                      const periodLabel = item.class_type === 'scheduled'
                        ? `${formatDateOnly(item.start_date || item.start_at)}${item.end_date || item.period_end_at ? ` - ${formatDateOnly(item.end_date || item.period_end_at)}` : ''}`
                        : '-';
                      const meetingLabel = item.class_type === 'scheduled'
                        ? (Number(item.max_meetings || 0) > 0 ? item.max_meetings : '-')
                        : (String(item.usage_mode || '').toLowerCase() === 'limited' ? item.usage_limit || '-' : '-');
                      return (
                        <article key={item.class_id} className="event-admin-card">
                          <img
                            className="event-admin-image"
                            src={resolveClassImage(item)}
                            alt={item.class_name || 'Program'}
                          />
                          <div className="event-admin-body">
                            <div className="event-admin-title-row">
                              <h3>{item.class_name}</h3>
                              <span className="event-admin-status">{templateLabel}</span>
                            </div>
                            <p>Coach: {coachLabel}</p>
                            <p>Location: {locationLabel}</p>
                            <p>Category: {categoryLabel}</p>
                            <p>Schedule: {formatClassScheduleSummary(item)}</p>
                            <p>Capacity: {capacityLabel}</p>
                            <p>Price: {formatIdr(item.price || 0)}</p>
                            <p>Periode: {periodLabel}</p>
                            <p>Max meeting: {meetingLabel}</p>
                            <div className="row-actions">
                              <ViewButton onClick={() => viewClass(item)} />
                              <DeleteButton onClick={() => deleteClass(item.class_id)} />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {filteredClasses.length === 0 ? (
                      <article className="event-admin-card">
                        <div className="event-admin-body">
                          <div className="event-admin-title-row">
                            <h3>{getAdminPageCopy('programEmptyTitle')}</h3>
                          </div>
                          <p>{getAdminPageCopy('programEmptyDescription')}</p>
                        </div>
                      </article>
                    ) : null}
                  </div>
                </>
              ) : classMode === 'wizard' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('programAddTitle')}</h2>
                    <button className="btn ghost" type="button" onClick={() => setClassMode('list')}>
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <div className="class-wizard-shell">
                    <div className="class-wizard-intro card">
                      <p className="eyebrow">{getAdminPageCopy('programWizardEyebrow')}</p>
                      <h3>{getAdminPageCopy('programWizardTitle')}</h3>
                      <p className="feedback">Setiap mode akan membuka form yang lebih fokus. `Custom` tetap membuka form lengkap seperti sekarang.</p>
                    </div>
                    <div className="class-wizard-grid">
                      {CLASS_TEMPLATE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          className={`class-wizard-card class-wizard-card-${option.visualClass}`}
                          type="button"
                          onClick={() => openClassTemplateWizard(option.id)}
                        >
                          <div className={`class-wizard-visual class-wizard-visual-${option.visualClass}`} aria-hidden="true">
                            <span className="class-wizard-shape class-wizard-shape-a" />
                            <span className="class-wizard-shape class-wizard-shape-b" />
                            <span className="class-wizard-shape class-wizard-shape-c" />
                            <div className="class-wizard-mini-card">
                              <span>{option.accents[0]}</span>
                              <strong>{option.accents[1]}</strong>
                            </div>
                          </div>
                          <div className="class-wizard-copy">
                            <span className="class-wizard-tag">{option.tag}</span>
                            <h3>{option.title}</h3>
                            <p>{option.description}</p>
                            <span className="class-wizard-cta">Pilih mode</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>
                      {editingClassId
                        ? getAdminPageCopy('programEditTitle')
                        : getAdminPageCopy('programAddTemplateTitle', { template: getClassEditorTemplateLabel(classEditorTemplate) })}
                    </h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        if (editingClassId) {
                          setClassMode('list');
                          return;
                        }
                        startAddClass();
                      }}
                    >
                      {editingClassId ? getAdminPageCopy('backToList') : getAdminPageCopy('backToWizard')}
                    </button>
                  </div>
                  {!editingClassId ? (
                    <div className="card" style={{ borderStyle: 'dashed', marginBottom: '0.75rem' }}>
                      <p className="eyebrow">{getAdminPageCopy('modeEyebrow')}</p>
                      <p className="feedback">
                        Form ini sedang memakai mode <strong>{getClassEditorTemplateLabel(classEditorTemplate)}</strong>.
                        {classEditorTemplate === 'custom'
                          ? ' Semua field tersedia.'
                          : ' Hanya field yang relevan untuk mode ini yang ditampilkan.'}
                      </p>
                      <button className="btn ghost small" type="button" onClick={startAddClass}>
                        Ganti mode
                      </button>
                    </div>
                  ) : null}
                  <div className="landing-tabs" style={{ marginBottom: '0.8rem' }}>
                    <button
                      type="button"
                      className={`landing-tab ${classEditTab === 'general' ? 'active' : ''}`}
                      onClick={() => setClassEditTab('general')}
                    >
                      General information
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${classEditTab === 'category' ? 'active' : ''}`}
                      onClick={() => setClassEditTab('category')}
                    >
                      Category
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${classEditTab === 'custom_fields' ? 'active' : ''}`}
                      onClick={() => setClassEditTab('custom_fields')}
                    >
                      Custom fields
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${classEditTab === 'member_info' ? 'active' : ''}`}
                      onClick={() => setClassEditTab('member_info')}
                    >
                      Member info
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${classEditTab === 'participants' ? 'active' : ''}`}
                      onClick={() => {
                        setClassEditTab('participants');
                        if (editingClassId) loadClassParticipants(editingClassId, resolvedClassType);
                      }}
                    >
                      Participants
                    </button>
                  </div>
                  <form className="form" onSubmit={addClass}>
                    {classEditTab === 'general' ? (
                      <>
                        <div className="class-general-layout">
                          <div className="class-general-main">
                            <label>Program Name<input value={classForm.class_name} onChange={(e) => setClassForm((p) => ({ ...p, class_name: e.target.value }))} /></label>
                            <label>
                              Description
                              <textarea
                                rows={4}
                                value={classForm.description}
                                placeholder={getAdminPageCopy('classDescriptionPlaceholder')}
                                onChange={(e) => setClassForm((p) => ({ ...p, description: e.target.value }))}
                              />
                            </label>
                            <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={aiGenerateClassDescription}
                              >
                                AI Generate Description
                              </button>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={aiShortenClassDescription}
                              >
                                AI Shorten Description
                              </button>
                            </div>
                            {!isMembershipClassEditor ? (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={showClassCoachFields}
                                  onChange={(e) =>
                                    setClassForm((p) => ({
                                      ...p,
                                      has_coach: e.target.checked,
                                      coach_id: e.target.checked ? p.coach_id : '',
                                      trainer_name: e.target.checked ? p.trainer_name : '',
                                      coach_shares: e.target.checked ? p.coach_shares : []
                                    }))
                                  }
                                />
                                <span>Activity ini punya coach</span>
                              </label>
                            ) : null}
                            {!isMembershipClassEditor && showClassCoachFields ? (
                              <div className="card" style={{ borderStyle: 'dashed' }}>
                                <p className="eyebrow">{creatorLabel} Name (token input)</p>
                                <label>
                                  Primary coach_id
                                  <input value={classForm.coach_id} onChange={(e) => setClassForm((p) => ({ ...p, coach_id: e.target.value }))} placeholder={getAdminPageCopy('classCoachIdPlaceholder')} />
                                </label>
                                <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                                  {selectedClassTrainerTokens.length === 0 ? <span className="feedback">Belum ada {creatorLabelLower} dipilih.</span> : null}
                                  {selectedClassTrainerTokens.map((name) => (
                                    <span key={name} className="passport-chip">
                                      {name}
                                      <button
                                        type="button"
                                        className="btn ghost small"
                                        style={{ marginLeft: '0.35rem' }}
                                        onClick={() => removeClassTrainerToken(name)}
                                      >
                                        x
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                {availableClassTrainerOptions.length > 0 ? (
                                  <label>
                                    Pilih dari {creatorLabelLower} aktif
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) addClassTrainerToken(e.target.value);
                                      }}
                                    >
                                      <option value="">{getAdminPageCopy('creatorSelect', { creator: creatorLabelLower })}</option>
                                      {availableClassTrainerOptions.map((name) => (
                                        <option key={name} value={name}>
                                          {name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : (
                                  <p className="feedback">
                                    Belum ada {creatorLabelLower} aktif di tenant. Tambahkan user role `pt` atau `owner`, atau isi manual.
                                  </p>
                                )}
                                <label>
                                  Tambah manual
                                  <input
                                    value={classTrainerDraft}
                                    placeholder={`Ketik nama ${creatorLabelLower} lalu Enter`}
                                    onChange={(e) => setClassTrainerDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addClassTrainerToken(classTrainerDraft);
                                      }
                                    }}
                                  />
                                </label>
                                <p className="feedback">Tekan Enter untuk menambahkan nama manual ke daftar coach.</p>
                                <p className="feedback">Tersimpan sebagai: {classForm.trainer_name || '-'}</p>
                                {selectedClassTrainerTokens.length > 0 ? (
                                  <div className="card" style={{ borderStyle: 'dashed' }}>
                                    <p className="eyebrow">{creatorLabel} Share</p>
                                    <p className="feedback">Masukkan % komisi/share per coach yang terlibat. Total boleh kurang dari atau sama dengan 100%.</p>
                                    <div className="entity-list">
                                      {selectedClassTrainerTokens.map((coachName) => {
                                        const currentRow = (classForm.coach_shares || []).find((item) => item.coach_name === coachName) || { coach_name: coachName, share_percent: '' };
                                        return (
                                          <div key={`class-share-${coachName}`} className="entity-row">
                                            <div>
                                              <strong>{coachName}</strong>
                                              <p>% dari program</p>
                                            </div>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.01"
                                              value={currentRow.share_percent || ''}
                                              placeholder={getAdminPageCopy('sharePlaceholder')}
                                              onChange={(e) =>
                                                setClassForm((prev) => ({
                                                  ...prev,
                                                  coach_shares: syncCoachSharesWithTrainerNames(
                                                    prev.trainer_name,
                                                    upsertCoachShareValue(prev.coach_shares, coachName, e.target.value)
                                                  )
                                                }))
                                              }
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <p className="feedback">Total share terisi: {Number(totalClassCoachShare || 0).toFixed(2)}%</p>
                                  </div>
                                ) : null}
                              </div>
                            ) : !isMembershipClassEditor ? (
                              <p className="feedback">Mode ini tidak mewajibkan coach. Cocok untuk gym access, open studio, atau paket sesi generik.</p>
                            ) : null}
                            <label>Price<input type="number" min="0" value={classForm.price} onChange={(e) => setClassForm((p) => ({ ...p, price: e.target.value }))} /></label>
                            {!isScheduledClassForm ? (
                              <p className="feedback">
                                Price adalah harga per enrollment/pembelian.
                                Lama akses ditentukan oleh `Validity Unit` + `Validity Value`.
                                Kalau `No expiry`, harga ini berarti akses tanpa batas waktu sampai dinonaktifkan manual.
                              </p>
                            ) : null}
                            <label>Location<input value={classForm.location} onChange={(e) => setClassForm((p) => ({ ...p, location: e.target.value }))} /></label>
                            <label>Image URL<input value={classForm.image_url} onChange={(e) => setClassForm((p) => ({ ...p, image_url: e.target.value }))} /></label>
                            <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() => classImageFileInputRef.current?.click()}
                              >
                                Upload Cover Image
                              </button>
                              <input
                                ref={classImageFileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  if (file) {
                                    uploadOwnClassImage(file);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </div>
                            <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                disabled={classAiWorking}
                                onClick={aiFillClassGalleryFromPexels}
                              >
                                AI Fill Gallery
                              </button>
                            </div>
                            <label>
                              Gallery Images (satu URL per baris)
                              <textarea
                                rows={4}
                                placeholder={'https://...\nhttps://...'}
                                value={classForm.gallery_images_text}
                                onChange={(e) => setClassForm((p) => ({ ...p, gallery_images_text: e.target.value }))}
                              />
                            </label>
                            <div className="card" style={{ borderStyle: 'dashed' }}>
                              <p className="eyebrow">
                                {isScheduledClassForm ? getAdminPageCopy('classScheduleEyebrow') : getAdminPageCopy('classAccessRulesEyebrow')}
                              </p>
                              {isScheduledClassForm ? (
                                <>
                                  <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                      <input
                                        type="radio"
                                        name="class_schedule_mode"
                                        checked={classForm.schedule_mode === 'everyday'}
                                        onChange={() => setClassForm((prev) => ({ ...prev, schedule_mode: 'everyday' }))}
                                      />
                                      <span>Everyday + time</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                      <input
                                        type="radio"
                                        name="class_schedule_mode"
                                        checked={classForm.schedule_mode === 'weekly'}
                                        onChange={() => setClassForm((prev) => ({ ...prev, schedule_mode: 'weekly' }))}
                                      />
                                      <span>Weekly: pilih hari dan jam</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                      <input
                                        type="radio"
                                        name="class_schedule_mode"
                                        checked={classForm.schedule_mode === 'manual'}
                                        onChange={() =>
                                          setClassForm((prev) => ({
                                            ...prev,
                                            schedule_mode: 'manual',
                                            manual_schedule: Array.isArray(prev.manual_schedule) && prev.manual_schedule.length > 0
                                              ? prev.manual_schedule
                                              : [createEmptyClassManualSession()]
                                          }))
                                        }
                                      />
                                      <span>Custom date and time</span>
                                    </label>
                                  </div>
                                  {classForm.schedule_mode === 'everyday' ? (
                                    <>
                                <p className="feedback">Program aktif setiap hari dengan jam yang sama.</p>
                                      <label>
                                        Jam Mulai
                                        <input
                                          type="time"
                                          value={classForm.weekly_start_time}
                                          onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_start_time: e.target.value }))}
                                        />
                                      </label>
                                      <label>
                                        Jam Akhir
                                        <input
                                          type="time"
                                          value={classForm.weekly_end_time}
                                          onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_end_time: e.target.value }))}
                                        />
                                      </label>
                                    </>
                                  ) : classForm.schedule_mode === 'weekly' ? (
                                    <>
                                      <p className="feedback">Pilih hari yang aktif, lalu isi jam untuk hari-hari tersebut.</p>
                                      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                        {CLASS_WEEKDAYS.map((day) => {
                                          const isChecked = (classForm.weekly_days || []).includes(day.value);
                                          return (
                                            <label key={day.value} className="passport-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) =>
                                                  setClassForm((prev) => {
                                                    const current = Array.isArray(prev.weekly_days) ? prev.weekly_days : [];
                                                    const next = e.target.checked
                                                      ? [...new Set([...current, day.value])]
                                                      : current.filter((item) => item !== day.value);
                                                    return { ...prev, weekly_days: next };
                                                  })
                                                }
                                              />
                                              <span>{day.label}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                      <label>
                                        Jam Mulai
                                        <input
                                          type="time"
                                          value={classForm.weekly_start_time}
                                          onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_start_time: e.target.value }))}
                                        />
                                      </label>
                                      <label>
                                        Jam Akhir
                                        <input
                                          type="time"
                                          value={classForm.weekly_end_time}
                                          onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_end_time: e.target.value }))}
                                        />
                                      </label>
                                    </>
                                  ) : (
                                    <>
                                      <p className="feedback">Tambahkan tanggal dan jam spesifik satu per satu.</p>
                                      <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                                        <button
                                          className="btn ghost small"
                                          type="button"
                                          onClick={() =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              manual_schedule: [...(Array.isArray(prev.manual_schedule) ? prev.manual_schedule : []), createEmptyClassManualSession()]
                                            }))
                                          }
                                        >
                                          + session manual
                                        </button>
                                      </div>
                                      <div className="entity-list">
                                        {(Array.isArray(classForm.manual_schedule) ? classForm.manual_schedule : []).map((session, index) => (
                                          <div key={`class-manual-session-${index}`} className="card" style={{ marginBottom: '0.5rem' }}>
                                            <label>
                                              Tanggal + Jam Mulai
                                              <input
                                                type="datetime-local"
                                                value={session.start_at || ''}
                                                onChange={(e) =>
                                                  setClassForm((prev) => ({
                                                    ...prev,
                                                    manual_schedule: (Array.isArray(prev.manual_schedule) ? prev.manual_schedule : []).map((item, idx) =>
                                                      idx === index ? { ...item, start_at: e.target.value } : item
                                                    )
                                                  }))
                                                }
                                              />
                                            </label>
                                            <label>
                                              Tanggal + Jam Akhir
                                              <input
                                                type="datetime-local"
                                                value={session.end_at || ''}
                                                onChange={(e) =>
                                                  setClassForm((prev) => ({
                                                    ...prev,
                                                    manual_schedule: (Array.isArray(prev.manual_schedule) ? prev.manual_schedule : []).map((item, idx) =>
                                                      idx === index ? { ...item, end_at: e.target.value } : item
                                                    )
                                                  }))
                                                }
                                              />
                                            </label>
                                            <button
                                              className="btn ghost small"
                                              type="button"
                                              onClick={() =>
                                                setClassForm((prev) => {
                                                  const current = Array.isArray(prev.manual_schedule) ? prev.manual_schedule : [];
                                                  const next = current.filter((_, idx) => idx !== index);
                                                  return {
                                                    ...prev,
                                                    manual_schedule: next.length > 0 ? next : [createEmptyClassManualSession()]
                                                  };
                                                })
                                              }
                                            >
                                              Hapus session
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="feedback">
                                    {isMembershipClassEditor
                                      ? 'Untuk membership, isi harga, durasi aktif, waktu mulai, dan aturan registrasi.'
                                      : isActivityClassEditor
                                        ? 'Untuk activity program, isi durasi akses, jadwal, registrasi, dan capacity program.'
                                        : isPersonalTrainingClassEditor
                                          ? 'Untuk personal training, isi coach, masa aktif paket, jumlah sesi, dan jadwal sesi.'
                                          : isOpenAccessClassForm
                                            ? 'Untuk open access, masa aktif dan kuota dihitung per enrollment user.'
                                            : 'Untuk session pack, isi expiry dan jumlah sesi yang diberikan per enrollment user.'}
                                  </p>
                                  <label>
                                    Duration
                                    <select
                                      value={classForm.validity_unit === 'none' ? 'unlimited' : 'limited'}
                                      onChange={(e) =>
                                        setClassForm((p) => ({
                                          ...p,
                                          validity_unit: e.target.value === 'unlimited' ? 'none' : (p.validity_unit === 'none' ? 'month' : p.validity_unit),
                                          validity_value: e.target.value === 'unlimited' ? '' : (p.validity_value || '1'),
                                          validity_anchor: e.target.value === 'unlimited' ? 'activation' : p.validity_anchor,
                                          start_date: e.target.value === 'unlimited' && p.validity_anchor === 'fixed_start' ? '' : p.start_date,
                                          end_date: e.target.value === 'unlimited' && p.validity_anchor === 'fixed_start' ? '' : p.end_date
                                        }))
                                      }
                                    >
                                      {DURATION_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                  {classForm.validity_unit !== 'none' ? (
                                    <>
                                      <label>Duration Value<input type="number" min="1" value={classForm.validity_value} onChange={(e) => setClassForm((p) => ({ ...p, validity_value: e.target.value }))} /></label>
                                      <label>
                                        Duration Unit
                                        <select value={classForm.validity_unit} onChange={(e) => setClassForm((p) => ({ ...p, validity_unit: e.target.value }))}>
                                          {ACTIVITY_LIMITED_DURATION_UNIT_OPTIONS.map((item) => (
                                            <option key={item.value} value={item.value}>{item.label}</option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        Activation / Start
                                        <select value={classForm.validity_anchor} onChange={(e) => setClassForm((p) => ({ ...p, validity_anchor: e.target.value }))}>
                                          {ACTIVITY_VALIDITY_ANCHOR_OPTIONS.map((item) => (
                                            <option key={item.value} value={item.value}>{item.label}</option>
                                          ))}
                                        </select>
                                      </label>
                                      {isFixedDateClassAccess ? (
                                        <>
                                          <label>Periode Mulai<input type="date" value={classForm.start_date} onChange={(e) => setClassForm((p) => ({ ...p, start_date: e.target.value }))} /></label>
                                          <label>Periode Akhir<input type="date" value={classForm.end_date} onChange={(e) => setClassForm((p) => ({ ...p, end_date: e.target.value }))} /></label>
                                        </>
                                      ) : null}
                                    </>
                                  ) : null}
                                  {!isMembershipClassEditor ? (
                                    <>
                                      <label>
                                        Usage Mode
                                        <select value={classForm.usage_mode} onChange={(e) => setClassForm((p) => ({ ...p, usage_mode: e.target.value }))}>
                                          {USAGE_MODE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                          ))}
                                        </select>
                                      </label>
                                      {classForm.usage_mode === 'limited' ? (
                                        <>
                                          <label>Usage Limit<input type="number" min="1" value={classForm.usage_limit} onChange={(e) => setClassForm((p) => ({ ...p, usage_limit: e.target.value }))} /></label>
                                          <label>
                                            Usage Period
                                            <select value={classForm.usage_period} onChange={(e) => setClassForm((p) => ({ ...p, usage_period: e.target.value }))}>
                                              {ACTIVITY_USAGE_PERIOD_OPTIONS.map((item) => (
                                                <option key={item.value} value={item.value}>{item.label}</option>
                                              ))}
                                            </select>
                                          </label>
                                        </>
                                      ) : null}
                                    </>
                                  ) : null}
                                  {isActivityClassEditor || isPersonalTrainingClassEditor || isCustomClassEditor ? (
                                    <div className="card" style={{ borderStyle: 'dashed', marginTop: '0.75rem' }}>
                                    <p className="eyebrow">{getAdminPageCopy('classScheduleEyebrow')}</p>
                                    <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_schedule_mode"
                                          checked={classForm.schedule_mode === 'everyday'}
                                          onChange={() => setClassForm((prev) => ({ ...prev, schedule_mode: 'everyday' }))}
                                        />
                                        <span>Everyday</span>
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_schedule_mode"
                                          checked={classForm.schedule_mode === 'weekly'}
                                          onChange={() => setClassForm((prev) => ({ ...prev, schedule_mode: 'weekly' }))}
                                        />
                                        <span>Weekday</span>
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_schedule_mode"
                                          checked={classForm.schedule_mode === 'manual'}
                                          onChange={() =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              schedule_mode: 'manual',
                                              manual_schedule: Array.isArray(prev.manual_schedule) && prev.manual_schedule.length > 0
                                                ? prev.manual_schedule
                                                : [createEmptyClassManualSession()]
                                            }))
                                          }
                                        />
                                        <span>Custom</span>
                                      </label>
                                    </div>
                                    {classForm.schedule_mode === 'everyday' ? (
                                      <>
                                        <label>Jam Mulai<input type="time" value={classForm.weekly_start_time} onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_start_time: e.target.value }))} /></label>
                                        <label>Jam Akhir<input type="time" value={classForm.weekly_end_time} onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_end_time: e.target.value }))} /></label>
                                      </>
                                    ) : null}
                                    {classForm.schedule_mode === 'weekly' ? (
                                      <>
                                        <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                          {CLASS_WEEKDAYS.map((day) => {
                                            const isChecked = (classForm.weekly_days || []).includes(day.value);
                                            return (
                                              <label key={`access-${day.value}`} className="passport-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(e) =>
                                                    setClassForm((prev) => {
                                                      const current = Array.isArray(prev.weekly_days) ? prev.weekly_days : [];
                                                      const next = e.target.checked
                                                        ? [...new Set([...current, day.value])]
                                                        : current.filter((item) => item !== day.value);
                                                      return { ...prev, weekly_days: next };
                                                    })
                                                  }
                                                />
                                                <span>{day.label}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                        <label>Jam Mulai<input type="time" value={classForm.weekly_start_time} onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_start_time: e.target.value }))} /></label>
                                        <label>Jam Akhir<input type="time" value={classForm.weekly_end_time} onChange={(e) => setClassForm((prev) => ({ ...prev, weekly_end_time: e.target.value }))} /></label>
                                      </>
                                    ) : null}
                                    {classForm.schedule_mode === 'manual' ? (
                                      <>
                                        <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                                          <button
                                            className="btn ghost small"
                                            type="button"
                                            onClick={() =>
                                              setClassForm((prev) => ({
                                                ...prev,
                                                manual_schedule: [...(Array.isArray(prev.manual_schedule) ? prev.manual_schedule : []), createEmptyClassManualSession()]
                                              }))
                                            }
                                          >
                                            + custom date
                                          </button>
                                        </div>
                                        <div className="entity-list">
                                          {(Array.isArray(classForm.manual_schedule) ? classForm.manual_schedule : []).map((session, index) => (
                                            <div key={`class-access-manual-session-${index}`} className="card" style={{ marginBottom: '0.5rem' }}>
                                              <label>
                                                Tanggal + Jam Mulai
                                                <input
                                                  type="datetime-local"
                                                  value={session.start_at || ''}
                                                  onChange={(e) =>
                                                    setClassForm((prev) => ({
                                                      ...prev,
                                                      manual_schedule: (Array.isArray(prev.manual_schedule) ? prev.manual_schedule : []).map((item, idx) =>
                                                        idx === index ? { ...item, start_at: e.target.value } : item
                                                      )
                                                    }))
                                                  }
                                                />
                                              </label>
                                              <label>
                                                Tanggal + Jam Akhir
                                                <input
                                                  type="datetime-local"
                                                  value={session.end_at || ''}
                                                  onChange={(e) =>
                                                    setClassForm((prev) => ({
                                                      ...prev,
                                                      manual_schedule: (Array.isArray(prev.manual_schedule) ? prev.manual_schedule : []).map((item, idx) =>
                                                        idx === index ? { ...item, end_at: e.target.value } : item
                                                      )
                                                    }))
                                                  }
                                                />
                                              </label>
                                              <button
                                                className="btn ghost small"
                                                type="button"
                                                onClick={() =>
                                                  setClassForm((prev) => {
                                                    const current = Array.isArray(prev.manual_schedule) ? prev.manual_schedule : [];
                                                    const next = current.filter((_, idx) => idx !== index);
                                                    return {
                                                      ...prev,
                                                      manual_schedule: next.length > 0 ? next : [createEmptyClassManualSession()]
                                                    };
                                                  })
                                                }
                                              >
                                                Hapus date
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    ) : null}
                                    </div>
                                  ) : null}
                                  <div className="card" style={{ borderStyle: 'dashed', marginTop: '0.75rem' }}>
                                    <p className="eyebrow">{getAdminPageCopy('classRegistrationEyebrow')}</p>
                                    <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_registration_mode"
                                          checked={normalizeClassRegistrationMode(classForm.registration_period_mode) === 'always_open'}
                                          onChange={() =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              registration_period_mode: 'always_open',
                                              registration_start: '',
                                              registration_end: ''
                                            }))
                                          }
                                        />
                                        <span>Always open</span>
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_registration_mode"
                                          checked={normalizeClassRegistrationMode(classForm.registration_period_mode) === 'range_date'}
                                          onChange={() => setClassForm((prev) => ({ ...prev, registration_period_mode: 'range_date' }))}
                                        />
                                        <span>Range of date</span>
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_registration_mode"
                                          checked={normalizeClassRegistrationMode(classForm.registration_period_mode) === 'closed'}
                                          onChange={() =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              registration_period_mode: 'closed',
                                              registration_start: '',
                                              registration_end: ''
                                            }))
                                          }
                                        />
                                        <span>Closed</span>
                                      </label>
                                    </div>
                                    {normalizeClassRegistrationMode(classForm.registration_period_mode) === 'range_date' ? (
                                      <>
                                        <label>Registration Start<input type="datetime-local" value={classForm.registration_start} onChange={(e) => setClassForm((p) => ({ ...p, registration_start: e.target.value }))} /></label>
                                        <label>Registration End<input type="datetime-local" value={classForm.registration_end} onChange={(e) => setClassForm((p) => ({ ...p, registration_end: e.target.value }))} /></label>
                                      </>
                                    ) : (
                                      <p className="feedback">
                                        {normalizeClassRegistrationMode(classForm.registration_period_mode) === 'closed'
                                          ? 'Registrasi ditutup sampai Anda ubah lagi.'
                                          : 'Registrasi selalu terbuka selama akses masih aktif.'}
                                      </p>
                                    )}
                                  </div>
                                  {isActivityClassEditor || isCustomClassEditor ? (
                                    <div className="card" style={{ borderStyle: 'dashed', marginTop: '0.75rem' }}>
                                    <p className="eyebrow">{getAdminPageCopy('classCapacityEyebrow')}</p>
                                    <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_capacity_mode"
                                          checked={classForm.capacity_mode === 'none'}
                                          onChange={() =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              capacity_mode: 'none',
                                              quota_mode: 'none',
                                              capacity: '0',
                                              min_quota: '',
                                              max_quota: '',
                                              auto_start_when_quota_met: false
                                            }))
                                          }
                                        />
                                        <span>Unlimited</span>
                                      </label>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                        <input
                                          type="radio"
                                          name="class_access_capacity_mode"
                                          checked={classForm.capacity_mode !== 'none'}
                                          onChange={() =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              capacity_mode: 'limited',
                                              quota_mode: 'manual',
                                              capacity: prev.max_quota || prev.capacity || '20'
                                            }))
                                          }
                                        />
                                        <span>Min / Max cap</span>
                                      </label>
                                    </div>
                                    {classForm.capacity_mode !== 'none' ? (
                                      <>
                                        <label>Min cap<input type="number" min="0" value={classForm.min_quota} onChange={(e) => setClassForm((p) => ({ ...p, min_quota: e.target.value }))} /></label>
                                        <label>Max cap<input type="number" min="1" value={classForm.max_quota} onChange={(e) => setClassForm((p) => ({ ...p, max_quota: e.target.value, capacity: e.target.value }))} /></label>
                                      </>
                                    ) : (
                                      <p className="feedback">Tidak ada batas holder/enrollment.</p>
                                    )}
                                    </div>
                                  ) : null}
                                  {classAccessSummary.length > 0 ? (
                                    <div className="card" style={{ borderStyle: 'dashed', marginTop: '0.25rem' }}>
                                      <p className="eyebrow">{getAdminPageCopy('classConfigSummaryEyebrow')}</p>
                                      {classAccessSummary.map((line) => (
                                        <p key={line} className="feedback">{line}</p>
                                      ))}
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                          <aside className="class-general-guide">
                            <div className="card" style={{ borderStyle: 'dashed' }}>
                              <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                              <p className="feedback"><strong>Ringkasan:</strong> {classFieldGuide.summary}</p>
                              <p className="feedback"><strong>Duration:</strong> {classFieldGuide.duration}</p>
                              <p className="feedback"><strong>Activation / Start:</strong> {classFieldGuide.activation}</p>
                              <p className="feedback"><strong>Usage:</strong> {classFieldGuide.usage}</p>
                              <p className="feedback"><strong>Registration:</strong> {classFieldGuide.registration}</p>
                              <p className="feedback"><strong>Capacity:</strong> {classFieldGuide.capacity}</p>
                            </div>
                          </aside>
                        </div>
                        {isScheduledClassForm ? (
                          <>
                            <label>Periode Mulai<input type="date" value={classForm.start_date} onChange={(e) => setClassForm((p) => ({ ...p, start_date: e.target.value }))} /></label>
                            <label>Periode Akhir<input type="date" value={classForm.end_date} onChange={(e) => setClassForm((p) => ({ ...p, end_date: e.target.value }))} /></label>
                            <div className="card" style={{ borderStyle: 'dashed' }}>
                              <p className="eyebrow">{getAdminPageCopy('classRegistrationPeriodEyebrow')}</p>
                              <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                  <input
                                    type="radio"
                                    name="class_registration_period"
                                    checked={normalizeClassRegistrationMode(classForm.registration_period_mode) === 'always_open'}
                                    onChange={() =>
                                      setClassForm((prev) => ({
                                        ...prev,
                                        registration_period_mode: 'always_open',
                                        registration_start: '',
                                        registration_end: ''
                                      }))
                                    }
                                  />
                                  <span>No</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                  <input
                                    type="radio"
                                    name="class_registration_period"
                                    checked={classForm.registration_period_mode === 'range_date'}
                                    onChange={() => setClassForm((prev) => ({ ...prev, registration_period_mode: 'range_date' }))}
                                  />
                                  <span>Range date</span>
                                </label>
                              </div>
                              {classForm.registration_period_mode === 'range_date' ? (
                                <>
                                  <label>Registration Start<input type="datetime-local" value={classForm.registration_start} onChange={(e) => setClassForm((p) => ({ ...p, registration_start: e.target.value }))} /></label>
                                  <label>Registration End<input type="datetime-local" value={classForm.registration_end} onChange={(e) => setClassForm((p) => ({ ...p, registration_end: e.target.value }))} /></label>
                                </>
                              ) : (
                                <p className="feedback">Registrasi selalu terbuka selama program masih aktif.</p>
                              )}
                            </div>
                            <label>Jumlah Pertemuan Max<input type="number" min="0" value={classForm.max_meetings} onChange={(e) => setClassForm((p) => ({ ...p, max_meetings: e.target.value }))} /></label>
                            <div className="card" style={{ borderStyle: 'dashed' }}>
                              <p className="eyebrow">{getAdminPageCopy('classQuotaCapacityEyebrow')}</p>
                              <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                  <input
                                    type="radio"
                                    name="class_capacity_mode"
                                    checked={classForm.capacity_mode === 'none'}
                                    onChange={() =>
                                      setClassForm((prev) => ({
                                        ...prev,
                                        capacity_mode: 'none',
                                        quota_mode: 'none',
                                        capacity: '0',
                                        min_quota: '',
                                        max_quota: '',
                                        auto_start_when_quota_met: false
                                      }))
                                    }
                                  />
                                  <span>No</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                                  <input
                                    type="radio"
                                    name="class_capacity_mode"
                                    checked={classForm.capacity_mode !== 'none'}
                                    onChange={() =>
                                      setClassForm((prev) => ({
                                        ...prev,
                                        capacity_mode: 'limited',
                                        quota_mode: 'manual',
                                        capacity: prev.max_quota || prev.capacity || '20'
                                      }))
                                    }
                                  />
                                  <span>Limited</span>
                                </label>
                              </div>
                              {classForm.capacity_mode !== 'none' ? (
                                <>
                                  <label>Min quota<input type="number" min="0" value={classForm.min_quota} onChange={(e) => setClassForm((p) => ({ ...p, min_quota: e.target.value }))} /></label>
                                  <label>Max quota<input type="number" min="1" value={classForm.max_quota} onChange={(e) => setClassForm((p) => ({ ...p, max_quota: e.target.value, capacity: e.target.value }))} /></label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={classForm.auto_start_when_quota_met} onChange={(e) => setClassForm((p) => ({ ...p, auto_start_when_quota_met: e.target.checked }))} />
                                    <span>Auto start when quota met</span>
                                  </label>
                                </>
                              ) : (
                                <p className="feedback">Program ini tidak membatasi jumlah peserta.</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="feedback">Capacity diatur sebagai `Unlimited` atau `Min / Max cap` pada bagian access di atas.</p>
                          </>
                        )}
                      </>
                    ) : null}
                    {classEditTab === 'category' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('classCategoryEyebrow')}</p>
                            <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() => {
                                  const categories = suggestCategoriesFromText(
                                    [classForm.class_name, classForm.description, classForm.categories_text].join(' ')
                                  );
                                  setClassForm((prev) => ({ ...prev, categories_text: categories[0] || prev.categories_text }));
                                  setFeedback(getAdminPageCopy('aiCategorySuggested', { categories: categories[0] || '-' }));
                                }}
                              >
                                AI Suggest Category
                              </button>
                            </div>
                            <p className="feedback">{classCategoryInstruction}</p>
                            <input
                              placeholder={classCategoryPlaceholder}
                              value={classForm.categories_text}
                              onChange={(e) => setClassForm((p) => ({ ...p, categories_text: e.target.value }))}
                            />
                            <p className="feedback">
                              Preview: {String(classForm.categories_text || '').trim() || '-'}
                            </p>
                            <p className="eyebrow" style={{ marginTop: '1rem' }}>Tag (SEO)</p>
                            <p className="feedback">Tag bebas untuk SEO, search, dan discovery. Tidak dipakai untuk logic operasional.</p>
                            <textarea
                              rows={4}
                              placeholder={classTagPlaceholder}
                              value={classForm.tags_text}
                              onChange={(e) => setClassForm((p) => ({ ...p, tags_text: e.target.value }))}
                            />
                            <p className="feedback">
                              Preview Tag: {normalizeEventCategoriesForPayload(classForm.tags_text).join(' | ') || '-'}
                            </p>
                          </div>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                            <p className="feedback">
                              <strong>Category:</strong> pakai satu kategori utama untuk grouping, filter, dan reporting program.
                            </p>
                            <p className="feedback">
                              <strong>Tag (SEO):</strong> isi bebas untuk search, discovery, dan konteks marketing seperti `beginner`, `morning`, atau `30 days`.
                            </p>
                            <p className="feedback">
                              <strong>Jangan campur:</strong> hari, jam, division, quota, atau aturan paket sebaiknya tidak dijadikan category utama.
                            </p>
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {classEditTab === 'custom_fields' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('registrationFieldsEyebrow')}</p>
                            <p className="feedback">Informasi yang dikumpulkan saat member booking atau mendaftar program.</p>
                            <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setClassForm((prev) => ({
                                    ...prev,
                                    registration_fields: suggestRegistrationFieldsFromText(
                                      [prev.class_name, prev.description, prev.category, prev.category_id].join(' ')
                                    )
                                  }))
                                }
                              >
                                AI Suggest Fields
                              </button>
                            </div>
                            <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setClassForm((prev) => ({
                                    ...prev,
                                    registration_fields: [...(prev.registration_fields || []), createRegistrationField('free_type')]
                                  }))
                                }
                              >
                                + free type
                              </button>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setClassForm((prev) => ({
                                    ...prev,
                                    registration_fields: [...(prev.registration_fields || []), createRegistrationField('date')]
                                  }))
                                }
                              >
                                + date
                              </button>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={() =>
                                  setClassForm((prev) => ({
                                    ...prev,
                                    registration_fields: [...(prev.registration_fields || []), createRegistrationField('lookup')]
                                  }))
                                }
                              >
                                + lookup
                              </button>
                            </div>
                            {(classForm.registration_fields || []).length === 0 ? (
                              <p className="feedback">Belum ada custom field. Contoh: Kota, Tahu dari mana?, Sekolah, Jenis kelamin.</p>
                            ) : (
                              <div className="entity-list">
                                {(classForm.registration_fields || []).map((field, index) => (
                                  <div key={field.field_id || index} className="card" style={{ marginBottom: '0.5rem' }}>
                                    <label>
                                      Label
                                      <input
                                        value={field.label || ''}
                                        onChange={(e) =>
                                          setClassForm((prev) => ({
                                            ...prev,
                                            registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                              idx === index ? { ...item, label: e.target.value } : item
                                            )
                                          }))
                                        }
                                      />
                                    </label>
                                    <label>
                                      Type
                                      <select
                                        value={field.type || 'free_type'}
                                        onChange={(e) =>
                                          setClassForm((prev) => ({
                                            ...prev,
                                            registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                              idx === index ? { ...item, type: e.target.value } : item
                                            )
                                          }))
                                        }
                                      >
                                        {REGISTRATION_FIELD_TYPE_OPTIONS.map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                                      <span className="feedback" style={{ margin: 0 }}>Required field</span>
                                      <input
                                        type="checkbox"
                                        checked={field.required !== false}
                                        onChange={(e) =>
                                          setClassForm((prev) => ({
                                            ...prev,
                                            registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                              idx === index ? { ...item, required: e.target.checked } : item
                                            )
                                          }))
                                        }
                                      />
                                    </div>
                                    {String(field.type || 'free_type') === 'lookup' ? (
                                      <label>
                                        Options (pisahkan dengan koma)
                                        <input
                                          value={field.options_text || ''}
                                          onChange={(e) =>
                                            setClassForm((prev) => ({
                                              ...prev,
                                              registration_fields: (prev.registration_fields || []).map((item, idx) =>
                                                idx === index ? { ...item, options_text: e.target.value } : item
                                              )
                                            }))
                                          }
                                        />
                                      </label>
                                    ) : null}
                                    <button
                                      className="btn ghost small"
                                      type="button"
                                      onClick={() =>
                                        setClassForm((prev) => ({
                                          ...prev,
                                          registration_fields: (prev.registration_fields || []).filter((_, idx) => idx !== index)
                                        }))
                                      }
                                    >
                                      Hapus field
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('classMetadataEyebrow')}</p>
                            <p className="feedback">Metadata tambahan untuk operasional program dalam format JSON object.</p>
                            <textarea
                              rows={8}
                              placeholder={'{\n  "level": "beginner",\n  "room": "Studio A"\n}'}
                              value={classForm.custom_fields_text}
                              onChange={(e) => setClassForm((p) => ({ ...p, custom_fields_text: e.target.value }))}
                            />
                          </div>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                            <p className="feedback">
                              <strong>Gunakan seperlunya:</strong> tambah field hanya jika benar-benar dibutuhkan saat booking program. Terlalu banyak field biasanya menurunkan conversion.
                            </p>
                            <p className="feedback">
                              <strong>free type:</strong> untuk jawaban bebas seperti kota, sekolah, atau nama komunitas. <strong>date:</strong> untuk tanggal lahir atau tanggal mulai preferensi. <strong>lookup:</strong> untuk pilihan tetap seperti level, gender, atau sumber info.
                            </p>
                            <p className="feedback">
                              <strong>Metadata JSON:</strong> simpan flag operasional tambahan seperti room, level, atau notes internal yang tidak perlu ditanya ke member.
                            </p>
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {classEditTab === 'member_info' ? (
                      <div className="editor-with-guide">
                        <div className="editor-main">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('classBeforeInfoEyebrow')}</p>
                            <p className="feedback">Informasi yang muncul setelah member booking atau membeli program, sebelum sesi berjalan.</p>
                            <label>
                              Free text
                              <textarea
                                rows={5}
                                placeholder={getAdminPageCopy('classBeforeInfoPlaceholder')}
                                value={classForm.pre_event_info_text}
                                onChange={(e) => setClassForm((prev) => ({ ...prev, pre_event_info_text: e.target.value }))}
                              />
                            </label>
                            <label>
                              Attachment URLs
                              <textarea
                                rows={4}
                                placeholder={'https://.../program-guide.pdf\nhttps://.../floor-map.png'}
                                value={classForm.pre_event_attachments_text}
                                onChange={(e) => setClassForm((prev) => ({ ...prev, pre_event_attachments_text: e.target.value }))}
                              />
                            </label>
                            <div className="row-actions">
                              <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                                Upload attachment
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) uploadClassInfoAttachment(file, 'pre');
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                            <div className="entity-list">
                              {normalizeAttachmentUrlsText(classForm.pre_event_attachments_text).map((url) => (
                                <div className="entity-row" key={`class-pre-${url}`}>
                                  <div>
                                    <strong>{getAttachmentNameFromUrl(url)}</strong>
                                    <p>{url}</p>
                                  </div>
                                  <button
                                    className="btn ghost small"
                                    type="button"
                                    onClick={() =>
                                      setClassForm((prev) => ({
                                        ...prev,
                                        pre_event_attachments_text: normalizeAttachmentUrlsText(prev.pre_event_attachments_text)
                                          .filter((item) => item !== url)
                                          .join('\n')
                                      }))
                                    }
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ))}
                              {normalizeAttachmentUrlsText(classForm.pre_event_attachments_text).length === 0 ? (
                                <p className="feedback">Belum ada attachment sebelum program.</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('classAfterInfoEyebrow')}</p>
                            <p className="feedback">Informasi follow-up setelah sesi selesai, misalnya materi latihan, evaluasi, atau langkah berikutnya.</p>
                            <label>
                              Free text
                              <textarea
                                rows={5}
                                placeholder={getAdminPageCopy('classAfterInfoPlaceholder')}
                                value={classForm.post_event_info_text}
                                onChange={(e) => setClassForm((prev) => ({ ...prev, post_event_info_text: e.target.value }))}
                              />
                            </label>
                            <label>
                              Attachment URLs
                              <textarea
                                rows={4}
                                placeholder={'https://.../homework.pdf\nhttps://.../video-link.txt'}
                                value={classForm.post_event_attachments_text}
                                onChange={(e) => setClassForm((prev) => ({ ...prev, post_event_attachments_text: e.target.value }))}
                              />
                            </label>
                            <div className="row-actions">
                              <label className="btn ghost small" style={{ cursor: 'pointer' }}>
                                Upload attachment
                                <input
                                  type="file"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) uploadClassInfoAttachment(file, 'post');
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                            <div className="entity-list">
                              {normalizeAttachmentUrlsText(classForm.post_event_attachments_text).map((url) => (
                                <div className="entity-row" key={`class-post-${url}`}>
                                  <div>
                                    <strong>{getAttachmentNameFromUrl(url)}</strong>
                                    <p>{url}</p>
                                  </div>
                                  <button
                                    className="btn ghost small"
                                    type="button"
                                    onClick={() =>
                                      setClassForm((prev) => ({
                                        ...prev,
                                        post_event_attachments_text: normalizeAttachmentUrlsText(prev.post_event_attachments_text)
                                          .filter((item) => item !== url)
                                          .join('\n')
                                      }))
                                    }
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ))}
                              {normalizeAttachmentUrlsText(classForm.post_event_attachments_text).length === 0 ? (
                                <p className="feedback">Belum ada attachment sesudah program.</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <aside className="editor-guide">
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="eyebrow">{getAdminPageCopy('quickGuideEyebrow')}</p>
                            <p className="feedback">
                              <strong>Before program:</strong> isi briefing sebelum sesi, termasuk pakaian, alat, lokasi, atau persiapan khusus.
                            </p>
                            <p className="feedback">
                              <strong>After program:</strong> isi tindak lanjut setelah sesi, seperti materi, evaluasi, atau langkah lanjutan.
                            </p>
                            <p className="feedback">
                              <strong>Attachment:</strong> cocok untuk PDF panduan, meal plan, poster, map, atau file workbook.
                            </p>
                          </div>
                        </aside>
                      </div>
                    ) : null}
                    {classEditTab === 'participants' ? (
                      editingClassId ? (
                        <div className="card" style={{ borderStyle: 'dashed' }}>
                          <div className="panel-head" style={{ marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0 }}>Participants</h3>
                            <button
                              className="btn ghost small"
                              type="button"
                              onClick={() => loadClassParticipants(editingClassId, resolvedClassType)}
                              disabled={classParticipantsLoading}
                            >
                              {classParticipantsLoading ? getAdminPageCopy('refreshing') : getAdminPageCopy('refresh')}
                            </button>
                          </div>
                          {classParticipantsLoading ? <p className="feedback">{getAdminPageCopy('loadingParticipants')}</p> : null}
                          {!classParticipantsLoading && classParticipants.length === 0 ? (
                            <p className="feedback">
                              {resolvedClassType === 'scheduled'
                                ? getAdminPageCopy('classScheduledParticipantsEmpty')
                                : getAdminPageCopy('classActivityParticipantsEmpty')}
                            </p>
                          ) : null}
                          {!classParticipantsLoading && classParticipants.length > 0 ? (
                            <div className="entity-list">
                              {classParticipants.map((participant, index) => (
                                <div className="entity-row" key={participant.booking_id || participant.enrollment_id || `${participant.member_id || participant.guest_name || 'participant'}-${index}`}>
                                  <div>
                                    <strong>{participant.guest_name || participant.member_id || 'Participant'}</strong>
                                    <p>Member ID: {participant.member_id || '-'}</p>
                                    <p>Status: {participant.status || '-'}</p>
                                    {participant.booking_id ? <p>Booked: {formatClassDatetime(participant.booked_at || '')}</p> : null}
                                    {participant.enrollment_id ? <p>Enrolled: {formatClassDatetime(participant.enrolled_at || participant.purchased_at || '')}</p> : null}
                                    {participant.valid_from ? <p>Valid from: {formatClassDatetime(participant.valid_from)}</p> : null}
                                    {participant.valid_until ? <p>Valid until: {formatClassDatetime(participant.valid_until)}</p> : null}
                                    {participant.attendance_confirmed_at ? <p>Attendance: {formatClassDatetime(participant.attendance_confirmed_at)}</p> : null}
                                    {participant.remaining_usage !== undefined && participant.remaining_usage !== null ? <p>Remaining usage: {participant.remaining_usage}</p> : null}
                                    <p>Payment: {participant.payment_id || '-'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="feedback">{getAdminPageCopy('classParticipantsRequiresSave')}</p>
                      )
                    ) : null}
                    <button className="btn" type="submit" disabled={classSaving}>{classSaving ? getAdminPageCopy('saving') : getAdminPageCopy('saveProgram')}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'product' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('productEyebrow')}</p>
              {productMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('productListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('productSearchPlaceholder')}
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddProduct}>
                        {getAdminPageCopy('addNew')}
                      </button>
                    </div>
                  </div>
                  {productLoading ? <p className="feedback">{getAdminPageCopy('loadingProductList')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {PRODUCT_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((item, idx) => (
                          <tr key={item.product_id} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.product_name}</td>
                            <td className="admin-data-cell">{item.category}</td>
                            <td className="admin-data-cell">{item.price}</td>
                            <td className="admin-data-cell">{item.stock || '-'}</td>
                            <td className="admin-data-cell">
                              <div className="row-actions">
                                <ViewButton onClick={() => viewProduct(item)} />
                                <DeleteButton onClick={() => deleteProduct(item.product_id)} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{editingProductId ? getAdminPageCopy('productEditTitle') : getAdminPageCopy('productAddTitle')}</h2>
                    <button className="btn ghost" type="button" onClick={() => setProductMode('list')}>
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <form className="form" onSubmit={addProduct}>
                    <label>product_name<input value={productForm.product_name} onChange={(e) => setProductForm((p) => ({ ...p, product_name: e.target.value }))} /></label>
                    <label>category<select value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}>
                      {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select></label>
                    <label>price<input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <label>stock<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} /></label>
                    <button className="btn" type="submit" disabled={productSaving}>{productSaving ? getAdminPageCopy('saving') : getAdminPageCopy('saveProduct')}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'package_creation' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('packageEyebrow')}</p>
              {packageMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('packageListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('packageSearchPlaceholder')}
                        value={packageQuery}
                        onChange={(e) => setPackageQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddPackage}>
                        {getAdminPageCopy('addNew')}
                      </button>
                    </div>
                  </div>
                  {packageLoading ? <p className="feedback">{getAdminPageCopy('loadingPackageList')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {PACKAGE_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPackages.map((item, idx) => (
                          <tr key={item.package_id} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.package_name}</td>
                            <td className="admin-data-cell">{item.package_type}</td>
                            <td className="admin-data-cell">{item.package_type === 'pt' ? (item.trainer_name || '-') : '-'}</td>
                            <td className="admin-data-cell">{item.package_type === 'class' ? (item.class_name || '-') : '-'}</td>
                            <td className="admin-data-cell">{item.package_type === 'pt' || item.package_type === 'membership' || item.package_type === 'class' ? `${item.max_months} bulan` : '-'}</td>
                            <td className="admin-data-cell">{item.package_type === 'pt' || item.package_type === 'class' ? item.session_count : '-'}</td>
                            <td className="admin-data-cell">{item.price}</td>
                            <td className="admin-data-cell">
                              <div className="row-actions">
                                <ViewButton onClick={() => viewPackageCreation(item)} />
                                <DeleteButton onClick={() => deletePackage(item.package_id)} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{editingPackageId ? getAdminPageCopy('packageEditTitle') : getAdminPageCopy('packageAddTitle')}</h2>
                    <button className="btn ghost" type="button" onClick={() => setPackageMode('list')}>
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <form className="form" onSubmit={addPackageCreation}>
                    <label>package_name<input value={packageForm.package_name} onChange={(e) => setPackageForm((p) => ({ ...p, package_name: e.target.value }))} /></label>
                    <label>package_type<select value={packageForm.package_type} onChange={(e) => setPackageForm((p) => ({ ...p, package_type: e.target.value }))}>
                      {PACKAGE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select></label>
                    {getPackageTypeMeta(packageForm.package_type).requiresSessionCount ? (
                      <>
                        <label>max_months<input type="number" min="1" value={packageForm.max_months} onChange={(e) => setPackageForm((p) => ({ ...p, max_months: e.target.value }))} /></label>
                        <label>max_sessions<input type="number" min="1" value={packageForm.session_count} onChange={(e) => setPackageForm((p) => ({ ...p, session_count: e.target.value }))} /></label>
                      </>
                    ) : null}
                    {getPackageTypeMeta(packageForm.package_type).requiresTrainer ? (
                      <label>pt_trainer<select value={packageForm.trainer_user_id} onChange={(e) => setPackageForm((p) => ({ ...p, trainer_user_id: e.target.value }))}>
                        <option value="">{getAdminPageCopy('trainerSelect')}</option>
                        {ptLookupOptions.map((item) => (
                          <option key={item.user_id} value={item.user_id}>{item.full_name}</option>
                        ))}
                      </select></label>
                    ) : null}
                    {getPackageTypeMeta(packageForm.package_type).requiresClass ? (
                      <label>program_lookup<select value={packageForm.class_id} onChange={(e) => setPackageForm((p) => ({ ...p, class_id: e.target.value }))}>
                        <option value="">{getAdminPageCopy('programSelect')}</option>
                        {classLookupOptions.map((item) => (
                          <option key={item.class_id} value={item.class_id}>{item.class_name}</option>
                        ))}
                      </select></label>
                    ) : null}
                    {getPackageTypeMeta(packageForm.package_type).requiresDuration && !getPackageTypeMeta(packageForm.package_type).requiresSessionCount ? (
                      <label>duration_months<input type="number" min="1" value={packageForm.max_months} onChange={(e) => setPackageForm((p) => ({ ...p, max_months: e.target.value }))} /></label>
                    ) : null}
                    <label>price<input type="number" min="0" value={packageForm.price} onChange={(e) => setPackageForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <button className="btn" type="submit" disabled={packageSaving}>{packageSaving ? getAdminPageCopy('saving') : getAdminPageCopy('savePackage')}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'trainer' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('coachEyebrow')}</p>
              {selectedTrainerUser ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('coachMemberPackageTitle', { name: selectedTrainerUser.full_name })}</h2>
                    <button className="btn ghost" type="button" onClick={closeTrainerPackageList}>
                      {getAdminPageCopy('coachBackToList')}
                    </button>
                  </div>
                  <div className="panel-head">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('coachMemberPackageSearchPlaceholder')}
                        value={trainerPackageQuery}
                        onChange={(e) => setTrainerPackageQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {trainerPackageLoading ? <p className="feedback">{getAdminPageCopy('loadingMemberPackageList')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {TRAINER_PACKAGE_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrainerPackageRows.map((item, idx) => (
                          <tr key={`${item.pt_package_id}-${item.member_id}-${idx}`} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.member_name}</td>
                            <td className="admin-data-cell">{item.member_id}</td>
                            <td className="admin-data-cell">{item.pt_package_id}</td>
                            <td className="admin-data-cell">{item.total_sessions}</td>
                            <td className="admin-data-cell">{item.remaining_sessions}</td>
                            <td className="admin-data-cell">{formatClassDatetime(item.updated_at)}</td>
                          </tr>
                        ))}
                        {filteredTrainerPackageRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="admin-data-cell">{getAdminPageCopy('coachMemberPackageEmpty')}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('coachListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('coachSearchPlaceholder')}
                        value={ptUserQuery}
                        onChange={(e) => setPtUserQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {userLoading ? <p className="feedback">{getAdminPageCopy('loadingUserList')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {PT_USER_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPtUsers.map((item, idx) => (
                          <tr key={item.user_id} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.full_name}</td>
                            <td className="admin-data-cell">{item.email}</td>
                            <td className="admin-data-cell">{String(item.role || '-').toLowerCase()}</td>
                            <td className="admin-data-cell">
                              <button type="button" className="btn ghost small" onClick={() => openTrainerPackageList(item)}>
                                list
                              </button>
                            </td>
                            <td className="admin-data-cell">
                              <button
                                type="button"
                                className={`btn ghost small ${ptTrainerEnabledMap[item.user_id] === false ? '' : 'active'}`}
                                onClick={() => {
                                  setPtTrainerEnabledMap((prev) => ({
                                    ...prev,
                                    [item.user_id]: prev[item.user_id] === false
                                      ? true
                                      : false
                                  }));
                                }}
                              >
                                {ptTrainerEnabledMap[item.user_id] === false ? 'off' : 'on'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredPtUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="admin-data-cell">{getAdminPageCopy('coachUserEmpty')}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </>
          ) : null}

          {activeTab === 'sales' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('salesEyebrow')}</p>
              {selectedSalesUser ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('salesMemberPurchasedTitle', { name: selectedSalesUser.full_name })}</h2>
                    <button className="btn ghost" type="button" onClick={closeSalesMemberList}>
                      {getAdminPageCopy('salesBackToList')}
                    </button>
                  </div>
                  <div className="panel-head">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('salesMemberSearchPlaceholder')}
                        value={salesMemberQuery}
                        onChange={(e) => setSalesMemberQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {salesMemberLoading ? <p className="feedback">{getAdminPageCopy('loadingMemberPurchasedList')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {SALES_MEMBER_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesMemberRows.map((item, idx) => (
                          <tr key={`${item.member_id}-${item.prospect_id}-${idx}`} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.member_name}</td>
                            <td className="admin-data-cell">{item.member_id}</td>
                            <td className="admin-data-cell">{item.subscription_id}</td>
                            <td className="admin-data-cell">{item.plan_id}</td>
                            <td className="admin-data-cell">{item.prospect_id}</td>
                            <td className="admin-data-cell">{item.stage}</td>
                          </tr>
                        ))}
                        {filteredSalesMemberRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="admin-data-cell">{getAdminPageCopy('salesMemberEmpty')}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('salesListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('salesUserSearchPlaceholder')}
                        value={salesUserQuery}
                        onChange={(e) => setSalesUserQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {userLoading ? <p className="feedback">{getAdminPageCopy('loadingUserList')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {SALES_USER_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesUsers.map((item, idx) => (
                          <tr key={item.user_id} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.full_name}</td>
                            <td className="admin-data-cell">{item.email}</td>
                            <td className="admin-data-cell">
                              <button type="button" className="btn ghost small" onClick={() => openSalesMemberList(item)}>
                                list
                              </button>
                            </td>
                            <td className="admin-data-cell">
                              <button
                                type="button"
                                className={`btn ghost small ${salesEnabledMap[item.user_id] === false ? '' : 'active'}`}
                                onClick={() => {
                                  setSalesEnabledMap((prev) => ({
                                    ...prev,
                                    [item.user_id]: prev[item.user_id] === false
                                      ? true
                                      : false
                                  }));
                                }}
                              >
                                {salesEnabledMap[item.user_id] === false ? 'off' : 'on'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredSalesUsers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="admin-data-cell">{getAdminPageCopy('salesUserEmpty')}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'member' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('memberEyebrow')}</p>
              {memberMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('memberListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('memberSearchPlaceholder')}
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setMemberForm(createEmptyMemberForm());
                          setMemberRelationDraft('');
                          setMemberMode('add');
                        }}
                      >
                        {getAdminPageCopy('addNew')}
                      </button>
                      <input
                        ref={memberUploadInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleMemberUploadChange}
                        style={{ display: 'none' }}
                      />
                      <button className="btn ghost" type="button" onClick={openMemberUploadModal} disabled={memberSaving}>
                        {getAdminPageCopy('memberUploadButton')}
                      </button>
                    </div>
                  </div>
                  <div className="card" style={{ borderStyle: 'dashed', marginBottom: '1rem' }}>
                    <p className="eyebrow">{getAdminPageCopy('memberUploadRelationEyebrow')}</p>
                    <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                      {memberUploadRelations.length === 0 ? <span className="feedback">{getAdminPageCopy('memberUploadRelationGuide')}</span> : null}
                      {memberUploadRelations.map((item) => (
                        <span key={`${item.kind}:${item.id}`} className="passport-chip">
                          {item.label}
                          <button
                            type="button"
                            className="btn ghost small"
                            style={{ marginLeft: '0.35rem' }}
                            onClick={() => removeMemberRelationToken(item, 'upload')}
                          >
                            {getAdminPageCopy('removeTokenLabel')}
                          </button>
                        </span>
                      ))}
                    </div>
                    <label>
                      {getAdminPageCopy('memberUploadRelationAddLabel')}
                      <select
                        value={memberUploadDraft}
                        onChange={(e) => {
                          setMemberUploadDraft(e.target.value);
                          if (e.target.value) addMemberRelationToken(e.target.value, 'upload');
                        }}
                      >
                        <option value="">{getAdminPageCopy('programEventSelect')}</option>
                        {availableMemberUploadRelationOptions.map((item) => (
                          <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="sub" style={{ marginTop: '0.5rem' }}>
                      {getAdminPageCopy('memberUploadFormat')}
                    </p>
                  </div>
                  {memberUploadModalOpen ? (
                    <div className="modal-overlay" onClick={closeMemberUploadModal}>
                      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                        <div className="panel-head">
                          <div>
                            <p className="eyebrow">{getAdminPageCopy('memberUploadEyebrow')}</p>
                            <h3 style={{ margin: 0 }}>{getAdminPageCopy('memberUploadTitle')}</h3>
                          </div>
                          <button className="btn ghost small" type="button" onClick={closeMemberUploadModal}>
                            {getAdminPageCopy('close')}
                          </button>
                        </div>
                        <div className="row-actions" style={{ marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            className={`btn ghost small ${memberUploadMode === 'template' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMemberUploadMode('template')}
                          >
                            {getAdminPageCopy('memberUploadDownloadMode')}
                          </button>
                          <button
                            className={`btn ghost small ${memberUploadMode === 'paste' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMemberUploadMode('paste')}
                          >
                            {getAdminPageCopy('memberUploadPasteMode')}
                          </button>
                          <button
                            className={`btn ghost small ${memberUploadMode === 'file' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMemberUploadMode('file')}
                          >
                            {getAdminPageCopy('memberUploadFileMode')}
                          </button>
                        </div>
                        {memberUploadMode === 'template' ? (
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="feedback">{getAdminPageCopy('memberUploadTemplateGuide')}</p>
                            <p className="sub">{getAdminPageCopy('memberUploadTemplateColumns')}</p>
                            <button className="btn" type="button" onClick={downloadMemberUploadTemplate}>
                              {getAdminPageCopy('memberUploadDownloadTemplate')}
                            </button>
                          </div>
                        ) : null}
                        {memberUploadMode === 'paste' ? (
                          <form className="form" onSubmit={submitMemberUploadText}>
                            <label>
                              {getAdminPageCopy('memberUploadPasteLabel')}
                              <textarea
                                rows={10}
                                value={memberUploadText}
                                onChange={(event) => setMemberUploadText(event.target.value)}
                                placeholder={String(MEMBER_UPLOAD_CONFIG.pastePlaceholder || '')}
                              />
                            </label>
                            <p className="sub">{getAdminPageCopy('memberUploadFormat')}</p>
                            <button className="btn" type="submit" disabled={memberSaving}>
                              {memberSaving ? getAdminPageCopy('memberUploadUploading') : getAdminPageCopy('memberUploadPasteSubmit')}
                            </button>
                          </form>
                        ) : null}
                        {memberUploadMode === 'file' ? (
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="feedback">{getAdminPageCopy('memberUploadFileGuide')}</p>
                            <p className="sub">{getAdminPageCopy('memberUploadFormat')}</p>
                            <button className="btn" type="button" onClick={() => memberUploadInputRef.current?.click()} disabled={memberSaving}>
                              {memberSaving ? getAdminPageCopy('memberUploadUploading') : getAdminPageCopy('memberUploadFileSelect')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {MEMBER_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((item, idx) => (
                          <tr key={item.member_id} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.member_name}</td>
                            <td className="admin-data-cell">{item.phone}</td>
                            <td className="admin-data-cell">{item.email || '-'}</td>
                            <td className="admin-data-cell">
                              <div className="row-actions">
                                <ViewButton onClick={() => viewMember(item)} />
                                <DeleteButton onClick={() => setMembers((prev) => prev.filter((v) => v.member_id !== item.member_id))} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('memberAddTitle')}</h2>
                    <button className="btn ghost" type="button" onClick={() => setMemberMode('list')}>
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <form className="form" onSubmit={addMember}>
                    <label>{getAdminPageCopy('memberNameField')}<input value={memberForm.member_name} onChange={(e) => setMemberForm((p) => ({ ...p, member_name: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('memberPhoneField')}<input value={memberForm.phone} onChange={(e) => setMemberForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('memberEmailKeyField')}<input type="email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} required /></label>
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">{getAdminPageCopy('memberRelationEyebrow')}</p>
                      <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                        {memberForm.relations.length === 0 ? <span className="feedback">{getAdminPageCopy('memberRelationEmpty')}</span> : null}
                        {memberForm.relations.map((item) => (
                          <span key={`${item.kind}:${item.id}`} className="passport-chip">
                            {item.label}
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ marginLeft: '0.35rem' }}
                              onClick={() => removeMemberRelationToken(item)}
                            >
                              {getAdminPageCopy('removeTokenLabel')}
                            </button>
                          </span>
                        ))}
                      </div>
                      <label>
                        {getAdminPageCopy('memberRelationAddLabel')}
                        <select
                          value={memberRelationDraft}
                          onChange={(e) => {
                            setMemberRelationDraft(e.target.value);
                            if (e.target.value) addMemberRelationToken(e.target.value);
                          }}
                        >
                          <option value="">{getAdminPageCopy('programEventSelect')}</option>
                          {availableMemberRelationOptions.map((item) => (
                            <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button className="btn" type="submit" disabled={memberSaving}>
                      {memberSaving ? getAdminPageCopy('saving') : getAdminPageCopy('saveMember')}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'transaction' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('transactionEyebrow')}</p>
              {transactionMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('transactionListTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder={getAdminPageCopy('transactionSearchPlaceholder')}
                        value={transactionQuery}
                        onChange={(e) => setTransactionQuery(e.target.value)}
                      />
                      <select value={transactionStatusFilter} onChange={(e) => setTransactionStatusFilter(e.target.value)}>
                        {TRANSACTION_STATUS_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select value={transactionLinkFilter} onChange={(e) => setTransactionLinkFilter(e.target.value)}>
                        {TRANSACTION_LINK_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <button className="btn" type="button" onClick={() => setTransactionMode('add')}>
                        {getAdminPageCopy('addNew')}
                      </button>
                    </div>
                  </div>
                  {transactionLoading ? <p className="feedback">{getAdminPageCopy('loadingPayments')}</p> : null}
                  <div className="entity-list">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          {TRANSACTION_TABLE_COLUMNS.map((column) => (
                            <th className="admin-data-head" key={column.value}>{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((item, idx) => (
                          <tr key={item.transaction_id} className={idx % 2 === 0 ? 'admin-data-row' : 'admin-data-row admin-data-row-alt'}>
                            <td className="admin-data-cell">{item.no_transaction}</td>
                            <td className="admin-data-cell">{item.member_id || '-'}</td>
                            <td className="admin-data-cell">
                              <div>
                                <strong>{item.product}</strong>
                                <p className="admin-operation-link">{item.operation_link || '-'}</p>
                              </div>
                            </td>
                            <td className="admin-data-cell">{item.qty}</td>
                            <td className="admin-data-cell">{item.currency || 'IDR'} {item.price}</td>
                            <td className="admin-data-cell">{item.method || '-'}</td>
                            <td className="admin-data-cell">{String(item.status || '-').toUpperCase()}</td>
                            <td className="admin-data-cell">{item.review_note || '-'}</td>
                            <td className="admin-data-cell">
                              <div className="row-actions admin-action-strip">
                                {TRANSACTION_ACTIONS.filter((action) => isAdminActionVisible(action, item)).map((action) => {
                                  const runAction = () => {
                                    if (action.value === 'view') viewTransaction(item);
                                    if (action.value === 'confirm') confirmTransaction(item);
                                    if (action.value === 'reject') rejectTransaction(item);
                                  };
                                  return (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="admin-action-chip"
                                      key={action.value}
                                      onClick={runAction}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') runAction();
                                      }}
                                    >
                                      {action.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : transactionMode === 'detail' ? (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('transactionDetailTitle')}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {String(transactionDetail?.status || '').toLowerCase() === 'pending' ? (
                        <>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => confirmTransaction(transactionDetail)}
                          >
                            {getAdminPageCopy('transactionConfirm')}
                          </button>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => rejectTransaction(transactionDetail)}
                          >
                            {getAdminPageCopy('transactionReject')}
                          </button>
                        </>
                      ) : null}
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => {
                          setTransactionDetail(null);
                          setTransactionMode('list');
                        }}
                      >
                        {getAdminPageCopy('backToList')}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setTransactionDetail(null);
                          setTransactionForm({
                            no_transaction: '',
                            member_id: '',
                            product: '',
                            operation_link: '',
                            qty: '1',
                            price: '',
                            currency: 'IDR',
                            method: 'virtual_account'
                          });
                          setTransactionMode('add');
                        }}
                      >
                        {getAdminPageCopy('addNew')}
                      </button>
                    </div>
                  </div>
                  <div className="form">
                    <p><strong>{getAdminPageCopy('transactionNoField')}:</strong> {transactionDetail?.no_transaction || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionMemberField')}:</strong> {transactionDetail?.member_id || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionProductField')}:</strong> {transactionDetail?.product || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionLinkedOperationField')}:</strong> {transactionDetail?.operation_link || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionDetailField')}:</strong> {transactionDetail?.detail_note || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionQtyField')}:</strong> {transactionDetail?.qty || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionPriceField')}:</strong> {transactionDetail?.currency || 'IDR'} {transactionDetail?.price || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionMethodField')}:</strong> {transactionDetail?.method || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionStatusField')}:</strong> {String(transactionDetail?.status || '-').toUpperCase()}</p>
                    <p><strong>{getAdminPageCopy('transactionRecordedAtField')}:</strong> {transactionDetail?.recorded_at || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionReviewedAtField')}:</strong> {transactionDetail?.reviewed_at || '-'}</p>
                    <p><strong>{getAdminPageCopy('transactionReviewNoteField')}:</strong> {transactionDetail?.review_note || '-'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{getAdminPageCopy('transactionAddTitle')}</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setTransactionDetail(null);
                        setTransactionMode('list');
                      }}
                    >
                      {getAdminPageCopy('backToList')}
                    </button>
                  </div>
                  <form className="form" onSubmit={addTransaction}>
                    <label>{getAdminPageCopy('transactionNoField')}<input value={transactionForm.no_transaction} onChange={(e) => setTransactionForm((p) => ({ ...p, no_transaction: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('transactionMemberField')}<input value={transactionForm.member_id} onChange={(e) => setTransactionForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('transactionProductField')}<input value={transactionForm.product} onChange={(e) => setTransactionForm((p) => ({ ...p, product: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('transactionQtyField')}<input type="number" min="1" value={transactionForm.qty} onChange={(e) => setTransactionForm((p) => ({ ...p, qty: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('transactionPriceField')}<input type="number" min="0" value={transactionForm.price} onChange={(e) => setTransactionForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <label>{getAdminPageCopy('transactionCurrencyField')}<select value={transactionForm.currency} onChange={(e) => setTransactionForm((p) => ({ ...p, currency: e.target.value }))}>
                      {TRANSACTION_CURRENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select></label>
                    <label>{getAdminPageCopy('transactionMethodField')}<select value={transactionForm.method} onChange={(e) => setTransactionForm((p) => ({ ...p, method: e.target.value }))}>
                      {TRANSACTION_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select></label>
                    <button className="btn" type="submit">{getAdminPageCopy('saveTransaction')}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'saas' ? (
            <>
              <p className="eyebrow">{getAdminPageCopy('saasEyebrow')}</p>
              <h2>{getAdminPageCopy('saasExtensionTitle')}</h2>
              <form className="form" onSubmit={extendSaas}>
                <label>{getAdminPageCopy('saasExtensionMonthsField')}<select value={saasForm.months} onChange={(e) => setSaasForm((p) => ({ ...p, months: e.target.value }))}>
                  {SAAS_EXTENSION_MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select></label>
                <label>{getAdminPageCopy('saasExtensionNoteField')}<input value={saasForm.note} onChange={(e) => setSaasForm((p) => ({ ...p, note: e.target.value }))} /></label>
                <button className="btn" type="submit">{getAdminPageCopy('saasExtensionSubmit')}</button>
              </form>
            </>
          ) : null}

          {feedback ? <p className="feedback">{feedback}</p> : null}
        </article>
      </section>

      <footer className="dash-foot">
        <Link to={accountPath(session, '/cs/dashboard')}>{getAdminPageCopy('footerBackToSearchMember')}</Link>
      </footer>
    </main>
  );
}
