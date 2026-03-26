import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountPath, apiJson, clearSession, getAccountSlug, getEnvironmentLabel, getSession, getAdminTabsByPlan, getAllowedEnvironments, getSessionPackagePlan } from '../lib.js';
import { getVerticalConfig, getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';
import WorkspaceHeader from '../components/WorkspaceHeader.jsx';

const ADMIN_TABS = [
  // { id: 'user', label: 'User' },
  { id: 'event', label: 'Event' },
  { id: 'class', label: 'Class' },
  { id: 'product', label: 'Product' },
  { id: 'package_creation', label: 'Package creation' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'sales', label: 'Sales' },
  { id: 'member', label: 'Member' },
  { id: 'transaction', label: 'Transaction' },
  // { id: 'saas', label: 'SaaS' }
];

const DEFAULT_CLASSES = [
  { class_id: 'class_001', class_name: 'HIIT Morning', trainer_name: 'Raka', capacity: '20', price: '150000', start_at: '2026-03-03 07:00' }
];
const DEFAULT_EVENTS = [
  {
    event_id: 'evt_001',
    event_name: 'One-time Bootcamp',
    trainer_name: 'Coach Rafi',
    location: 'Main Hall',
    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
    start_at: '2026-03-10 07:00',
    price: '0',
    duration_minutes: '60',
    status: 'scheduled'
  }
];

const EVENT_DURATION_UNITS = [
  { value: 'minutes', label: 'Minutes', minutes: 1 },
  { value: 'hours', label: 'Hours', minutes: 60 },
  { value: 'days', label: 'Days', minutes: 60 * 24 },
  { value: 'weeks', label: 'Weeks', minutes: 60 * 24 * 7 },
  { value: 'months', label: 'Months (30 days)', minutes: 60 * 24 * 30 },
  { value: 'years', label: 'Years (365 days)', minutes: 60 * 24 * 365 }
];

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

  const artPrefix = ['Warna', 'Jejak', 'Ruang', 'Kanvas', 'Narasi', 'Spektrum'];
  const artSuffix = ['Nusantara', 'Warisan', 'Majapahit', 'Peradaban', 'Budaya Indonesia'];
  const genericPrefix = ['Momentum', 'Ritme', 'Puncak', 'Arah', 'Forum', 'Eksplorasi'];
  const genericSuffix = ['Komunitas', 'Kreatif', 'Inovasi', 'Kolaborasi', 'Pengalaman'];

  const withMarker = `${pickRandom(isArt ? artPrefix : genericPrefix, clean)} ${pickRandom(isArt ? artSuffix : genericSuffix, category || 'Event')}`.trim();
  const options = [
    clean,
    `${clean}: ${withMarker}`,
    `${withMarker} | ${clean}`,
    `${clean} - ${category || (isArt ? 'Art Experience' : 'Community Session')}`.trim(),
    locationToken ? `${withMarker} @ ${locationToken}` : '',
    locationToken ? `${clean} @ ${locationToken}` : ''
  ].filter(Boolean);
  return pickRandom(options, clean).slice(0, 110).trim();
}

function createEmptyEventForm() {
  return {
    brief_event: '',
    event_name: '',
    trainer_name: '',
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
    registration_fields: []
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
    trainer_name: String(form.trainer_name || ''),
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
    registration_fields: registrationFields
  });
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
const DEFAULT_TRAINERS = [
  { trainer_id: 'tr_001', trainer_name: 'Raka', phone: '081234555500', specialization: 'HIIT' }
];
const DEFAULT_PRODUCTS = [
  { product_id: 'prd_001', product_name: 'Whey Protein 1kg', category: 'retail', price: '450000', stock: '12' }
];
const DEFAULT_PACKAGES = [
  { package_id: 'pkg_001', package_name: 'Membership 1 Month', package_type: 'membership', max_months: '', session_count: '', trainer_user_id: '', trainer_name: '', class_id: '', class_name: '', price: '350000' }
];
const DEFAULT_SALES = [
  { sales_id: 'sales_001', sales_name: 'Nina', channel: 'instagram', target_amount: '20000000' }
];
const DEFAULT_MEMBERS = [
  { member_id: 'member_001', member_name: 'Doni', phone: '081200001111', email: 'doni@foremoz.com' }
];
const DEFAULT_TRANSACTIONS = [
  {
    transaction_id: 'trx_001',
    no_transaction: 'TRX-001',
    member_id: 'owner_self_service',
    product: 'Monthly Membership',
    qty: '1',
    price: '350000',
    currency: 'IDR',
    method: 'virtual_account',
    status: 'pending',
    recorded_at: ''
  }
];

function createEmptyMemberForm() {
  return {
    member_name: '',
    phone: '',
    email: '',
    relations: []
  };
}

function toInputDatetime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.slice(0, 16);
  if (raw.includes(' ')) return raw.replace(' ', 'T').slice(0, 16);
  return raw.slice(0, 16);
}

function toApiDatetime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatClassDatetime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  if (raw.includes('T')) return raw.replace('T', ' ').slice(0, 16);
  return raw.slice(0, 16);
}

function resolveEventImage(item) {
  const direct = String(item?.image_url || '').trim();
  if (direct) return direct;
  const seed = encodeURIComponent(String(item?.event_id || item?.event_name || 'event'));
  return `https://picsum.photos/seed/${seed}/960/540`;
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function parseCustomFieldsInput(raw, label) {
  const source = String(raw || '').trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} custom_fields must be a JSON object`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields is invalid JSON object`);
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
  const normalized = String(status || '').toLowerCase();
  return normalized === 'published' || normalized === 'posted';
}

function displayEventStatus(status) {
  return isPublishedStatus(status) ? 'PUBLISHED' : String(status || 'scheduled').toUpperCase();
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
      throw new Error(`Label registration field #${i + 1} wajib diisi`);
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
        throw new Error(`Lookup options untuk field "${label}" wajib diisi`);
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
      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
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
      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
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
      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
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
      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
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
  const [eventTrainerDraft, setEventTrainerDraft] = useState('');
  const [eventAiWorking, setEventAiWorking] = useState(false);
  const eventImageFileInputRef = useRef(null);
  const [classForm, setClassForm] = useState({ class_name: '', trainer_name: '', capacity: '20', price: '0', start_at: '' });
  const [classTrainerDraft, setClassTrainerDraft] = useState('');
  const [memberRelationDraft, setMemberRelationDraft] = useState('');
  const [trainerForm, setTrainerForm] = useState({ trainer_name: '', phone: '', specialization: '' });
  const [productForm, setProductForm] = useState({ product_name: '', category: 'retail', price: '', stock: '' });
  const [packageForm, setPackageForm] = useState({ package_name: '', package_type: 'membership', max_months: '1', session_count: '1', trainer_user_id: '', class_id: '', price: '' });
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
  const [memberUploadText, setMemberUploadText] = useState('email,member_name,phone\n');
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
          class_name: item.class_name || '',
          trainer_name: item.trainer_name || '',
          capacity: String(item.capacity || '20'),
          price: String(item.price || '0'),
          start_at: item.start_at || ''
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
    || guessVerticalSlugByText(`${session?.tenant?.gym_name || ''} ${accountSlug}`, 'active');
  const resolvedVerticalConfig = getVerticalConfig(resolvedVerticalSlug) || null;
  const creatorLabel = String(resolvedVerticalConfig?.vocabulary?.creator || 'Trainer').trim() || 'Trainer';
  const creatorLabelLower = creatorLabel.toLowerCase();
  const inferredVerticalLabel = getVerticalLabel(resolvedVerticalSlug, 'Active');
  const eventCategoryExamples = useMemo(
    () => getEventCategoryExamplesByIndustry(resolvedVerticalSlug),
    [resolvedVerticalSlug]
  );
  const eventCategoryInstruction = `Pisahkan dengan koma atau baris baru. Contoh: ${eventCategoryExamples[0]}, ${eventCategoryExamples[1]}.`;
  const eventCategoryPlaceholder = `${eventCategoryExamples[0]}, ${eventCategoryExamples[1]}\n${eventCategoryExamples[2]}`;
  const isCsView = role === 'cs';
  const dashboardTitle = isCsView ? 'Setup' : 'Admin';
  const dashboardSubtitle = isCsView ? 'Tenant setup panel' : 'Tenant administration panel';
  const dashboardMenuLabel = isCsView ? 'Setup Menu' : 'Admin Menu';
  const enabledAdminTabIds = useMemo(() => getAdminTabsByPlan(session), [session]);
  const visibleAdminTabs = useMemo(
    () => ADMIN_TABS.filter((tab) => enabledAdminTabIds.includes(tab.id)),
    [enabledAdminTabIds]
  );

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
    if (env === 'admin') {
      navigate(`/a/${accountSlug}/admin/dashboard`);
      return;
    }
    if (env === 'sales') {
      navigate(`/a/${accountSlug}/sales/dashboard`);
      return;
    }
    if (env === 'pt') {
      navigate(`/a/${accountSlug}/pt/dashboard`);
      return;
    }
    navigate(`/a/${accountSlug}/cs/dashboard`);
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
    String(item.start_at || '').toLowerCase().includes(classQuery.toLowerCase())
  );
  const filteredTrainers = trainers.filter((item) =>
    item.trainer_name.toLowerCase().includes(trainerQuery.toLowerCase()) ||
    item.phone.toLowerCase().includes(trainerQuery.toLowerCase()) ||
    item.specialization.toLowerCase().includes(trainerQuery.toLowerCase())
  );
  const trainerNameOptions = useMemo(
    () =>
      [...new Set((trainers || []).map((item) => String(item.trainer_name || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [trainers]
  );
  const memberRelationOptions = useMemo(() => {
    const eventOptions = (events || []).map((item) => ({
      kind: 'event',
      id: String(item.event_id || '').trim(),
      label: `Event: ${item.event_name || item.event_id || '-'}`
    }));
    const classOptions = (classes || []).map((item) => ({
      kind: 'class',
      id: String(item.class_id || '').trim(),
      label: `Class: ${item.class_name || item.class_id || '-'}`
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
  const availableClassTrainerOptions = useMemo(
    () => trainerNameOptions.filter((name) => !selectedClassTrainerTokens.includes(name)),
    [trainerNameOptions, selectedClassTrainerTokens]
  );
  const selectedEventTrainerTokens = useMemo(() => parseTrainerTokens(eventForm.trainer_name), [eventForm.trainer_name]);
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
  const ptLookupOptions = users.filter((item) => {
    const itemRole = String(item.role || '').toLowerCase();
    if (itemRole !== 'pt') return false;
    return ptTrainerEnabledMap[item.user_id] !== false;
  });
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
    if (itemRole !== 'pt') return false;
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
    setFeedback(`user.created: ${userForm.full_name}`);
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
    if (!classForm.class_name || !classForm.trainer_name || !classForm.start_at) return;

    const startAtIso = toApiDatetime(classForm.start_at);
    if (!startAtIso) {
      setFeedback('start_at tidak valid');
      return;
    }

    try {
      setClassSaving(true);
      const method = editingClassId ? 'PATCH' : 'POST';
      const endpoint = editingClassId
        ? `/v1/admin/classes/${encodeURIComponent(editingClassId)}`
        : '/v1/admin/classes';
      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          class_name: classForm.class_name,
          trainer_name: classForm.trainer_name,
          capacity: Number(classForm.capacity || 20),
          price: Number(classForm.price || 0),
          start_at: startAtIso
        })
      });

      setFeedback(editingClassId ? `class.updated: ${classForm.class_name}` : `class.scheduled: ${classForm.class_name}`);
      setClassForm({ class_name: '', trainer_name: '', capacity: '20', price: '0', start_at: '' });
      setClassTrainerDraft('');
      setEditingClassId('');
      setClassMode('list');
      await loadClasses();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setClassSaving(false);
    }
  }

  function viewClass(item) {
    const normalizedStartAt = toInputDatetime(item.start_at);
    setClassForm({
      class_name: item.class_name || '',
      trainer_name: item.trainer_name || '',
      capacity: item.capacity || '20',
      price: String(item.price || '0'),
      start_at: normalizedStartAt || ''
    });
    setClassTrainerDraft('');
    setEditingClassId(item.class_id || '');
    setClassMode('add');
  }

  function startAddClass() {
    setClassForm({ class_name: '', trainer_name: '', capacity: '20', price: '0', start_at: '' });
    setClassTrainerDraft('');
    setEditingClassId('');
    setClassMode('add');
  }

  function addClassTrainerToken(name) {
    const token = String(name || '').trim();
    if (!token) return;
    const nextTokens = [...new Set([...selectedClassTrainerTokens, token])];
    setClassForm((prev) => ({ ...prev, trainer_name: nextTokens.join(', ') }));
    setClassTrainerDraft('');
  }

  function removeClassTrainerToken(name) {
    const nextTokens = selectedClassTrainerTokens.filter((item) => item !== name);
    setClassForm((prev) => ({ ...prev, trainer_name: nextTokens.join(', ') }));
  }

  function addEventTrainerToken(name) {
    const token = String(name || '').trim();
    if (!token) return;
    const nextTokens = [...new Set([...selectedEventTrainerTokens, token])];
    setEventForm((prev) => ({ ...prev, trainer_name: nextTokens.join(', ') }));
    setEventTrainerDraft('');
  }

  function removeEventTrainerToken(name) {
    const nextTokens = selectedEventTrainerTokens.filter((item) => item !== name);
    setEventForm((prev) => ({ ...prev, trainer_name: nextTokens.join(', ') }));
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

  async function fetchPexelsPhotos(keyword, perPage = 4) {
    const query = String(keyword || '').trim() || 'fitness event';
    const result = await apiJson(
      `/v1/ai/pexels/search?tenant_id=${encodeURIComponent(tenantId)}&query=${encodeURIComponent(query)}&per_page=${encodeURIComponent(perPage)}`
    );
    return Array.isArray(result.rows) ? result.rows : [];
  }

  function aiGenerateDraftFromBrief() {
    const brief = String(eventForm.brief_event || '').trim();
    if (!brief) {
      setFeedback('Isi brief dulu di textbox AI Assist.');
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
    setFeedback(`ai.assist: Draft event dibuat. Harga rekomendasi ${formatIdr(draft.suggestedPrice || 0)}.`);
  }

  function aiRewriteTitle() {
    const current = String(eventForm.event_name || '').trim();
    const source = current || (typeof window !== 'undefined'
      ? String(window.prompt('Event Name masih kosong. Masukkan brief/judul awal:', '') || '').trim()
      : '');
    if (!source) {
      setFeedback('Isi Event Name dulu atau masukkan brief saat diminta.');
      return;
    }
    const categories = suggestCategoriesFromText(`${eventForm.categories_text} ${source}`);
    const next = buildCatchyTitle(source, categories, eventForm.location);
    if (!next) {
      setFeedback('ai.assist: Gagal rewrite title.');
      return;
    }
    setEventForm((prev) => ({ ...prev, event_name: next }));
    setFeedback(`ai.assist: Judul event diperbarui -> ${next}`);
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
    setFeedback('ai.assist: Description dibuat.');
  }

  function aiShortenDescription() {
    const current = String(eventForm.description || '').trim();
    if (!current) {
      setFeedback('Isi Description dulu.');
      return;
    }
    const shortened = current.split('.').map((part) => part.trim()).filter(Boolean).slice(0, 2).join('. ');
    setEventForm((prev) => ({ ...prev, description: `${shortened}.` }));
    setFeedback('ai.assist: Description dipersingkat.');
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
    setFeedback('ai.assist: Rundown dibuat.');
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
    setFeedback('ai.assist: Rundown dirapikan.');
  }

  function aiSuggestCategory() {
    const source = [eventForm.event_name, eventForm.description, eventForm.categories_text].join(' ');
    const categories = suggestCategoriesFromText(source);
    setEventForm((prev) => ({ ...prev, categories_text: categories.join(', ') }));
    setFeedback(`ai.assist: Category suggestion -> ${categories.join(', ')}`);
  }

  function aiSuggestFields() {
    const fields = suggestRegistrationFieldsFromText(
      [eventForm.event_name, eventForm.description, eventForm.categories_text].join(' ')
    );
    setEventForm((prev) => ({ ...prev, registration_fields: fields }));
    setFeedback('ai.assist: Custom fields disarankan otomatis.');
  }

  async function aiFillGalleryFromPexels() {
    try {
      setEventAiWorking(true);
      const keywordCandidates = buildEventImageKeywords();
      if (keywordCandidates.length === 0) {
        throw new Error('Isi Event Name atau Brief dulu agar gallery bisa digenerate.');
      }
      let keyword = keywordCandidates[0];
      let photos = [];
      let lastError = null;
      for (const candidate of keywordCandidates) {
        keyword = candidate;
        try {
          photos = await fetchPexelsPhotos(candidate, 6);
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
        setFeedback('ai.assist: Pexels tidak menemukan gambar dari keyword yang dicoba.');
        return;
      }
      const urls = photos
        .map((item) => item?.image_url || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      setEventForm((prev) => ({
        ...prev,
        image_url: urls[0] || prev.image_url,
        gallery_images_text: urls.join('\n')
      }));
      setFeedback(`ai.assist: Gallery diisi ${urls.length} gambar dari Pexels (${keyword}).`);
    } catch (error) {
      setFeedback(error.message || 'ai.assist: Gagal mengambil gambar dari Pexels.');
    } finally {
      setEventAiWorking(false);
    }
  }

  async function uploadOwnEventImage(file) {
    try {
      const selected = file || null;
      if (!selected) return;
      if (!String(selected.type || '').startsWith('image/')) {
        throw new Error('File harus berupa gambar.');
      }
      const maxBytes = 5 * 1024 * 1024;
      if (Number(selected.size || 0) > maxBytes) {
        throw new Error('Ukuran gambar maksimal 5MB.');
      }
      const dataUrl = await readFileAsDataUrl(selected);
      if (!dataUrl) {
        throw new Error('Gagal memproses gambar.');
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
        throw new Error('Upload berhasil tapi URL gambar tidak tersedia.');
      }
      setEventForm((prev) => ({ ...prev, image_url: imageUrl }));
      setFeedback('event.image.uploaded: Cover image berhasil diunggah ke S3.');
    } catch (error) {
      setFeedback(error.message || 'Gagal upload cover image.');
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
      setFeedback(`class.deleted: ${classId}`);
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
    setFeedback(`trainer.created: ${trainerForm.trainer_name}`);
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
      setFeedback(editingProductId ? `product.updated: ${productForm.product_name}` : `product.created: ${productForm.product_name}`);
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
      setFeedback(`product.deleted: ${productId}`);
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
    if ((packageForm.package_type === 'pt' || packageForm.package_type === 'class') && (!packageForm.max_months || !packageForm.session_count)) return;
    if (packageForm.package_type === 'membership' && !packageForm.max_months) return;
    if (packageForm.package_type === 'pt' && !packageForm.trainer_user_id) return;
    if (packageForm.package_type === 'class' && !packageForm.class_id) return;
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
          ...((packageForm.package_type === 'pt' || packageForm.package_type === 'class')
            ? {
              max_months: Number(packageForm.max_months || 1),
              duration_months: Number(packageForm.max_months || 1),
              session_count: Number(packageForm.session_count || 1)
            }
            : packageForm.package_type === 'membership'
              ? {
                duration_months: Number(packageForm.max_months || 1)
              }
              : {}),
          ...(packageForm.package_type === 'pt'
            ? {
              trainer_user_id: packageForm.trainer_user_id,
              trainer_name: selectedPtTrainer?.full_name || ''
            }
            : {
              trainer_user_id: null,
              trainer_name: null
            }),
          ...(packageForm.package_type === 'class'
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
      setFeedback(editingPackageId ? `package.updated: ${packageForm.package_name}` : `package.created: ${packageForm.package_name}`);
      setPackageForm({ package_name: '', package_type: 'membership', max_months: '1', session_count: '1', trainer_user_id: '', class_id: '', price: '' });
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
    setPackageForm({ package_name: '', package_type: 'membership', max_months: '1', session_count: '1', trainer_user_id: '', class_id: '', price: '' });
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
      setFeedback(`package.deleted: ${packageId}`);
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
    setFeedback(`sales.target.set: ${salesForm.sales_name}`);
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
      throw new Error('email wajib diisi');
    }
    const relations = normalizeMemberRelationTokens(payload.relations);
    if (relations.length === 0) {
      throw new Error('Pilih minimal satu class/event.');
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
        `member.saved: ${result.member?.email || normalizeEmailValue(memberForm.email)} (${result.relation_results?.length || 0} relasi)`
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
    setMemberUploadText('email,member_name,phone\n');
    setMemberUploadModalOpen(true);
  }

  function closeMemberUploadModal() {
    setMemberUploadModalOpen(false);
  }

  function downloadMemberUploadTemplate() {
    const csvText = 'email,member_name,phone\nmember1@example.com,Member Satu,081234567890\nmember2@example.com,Member Dua,081234567891\n';
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member-upload-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback('Template CSV berhasil diunduh.');
  }

  async function processMemberUploadText(text, sourceLabel = 'upload') {
    if (memberUploadRelations.length === 0) {
      throw new Error('Pilih minimal satu class/event untuk upload member.');
    }

    const rows = parseMemberCsv(text).filter((item) => normalizeEmailValue(item.email));
    if (rows.length === 0) {
      throw new Error('Data upload tidak memiliki baris member yang valid.');
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
        errors.push(`baris ${row.row_number}: ${error.message}`);
      }
    }

    await loadMembers();
    if (errors.length > 0) {
      setFeedback(`member.${sourceLabel}: ${successCount}/${rows.length} berhasil. ${errors[0]}`);
    } else {
      setFeedback(`member.${sourceLabel}: ${successCount}/${rows.length} berhasil.`);
    }
  }

  async function handleMemberUploadChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
      setFeedback('Upload member saat ini mendukung file CSV.');
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
    if (!eventForm.event_name || !eventForm.start_at || !eventForm.duration_value) return;
    const startAtIso = toApiDatetime(eventForm.start_at);
    if (!startAtIso) {
      setFeedback('start_at tidak valid');
      return;
    }
    const durationMinutes = toDurationMinutes(eventForm.duration_value, eventForm.duration_unit);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFeedback('Duration harus lebih dari 0');
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
          trainer_name: eventForm.trainer_name || null,
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
          status: editingEventId ? (editingEvent?.status || 'scheduled') : 'scheduled'
        })
      });
      setFeedback(editingEventId ? `event.updated: ${eventForm.event_name}` : `event.created: ${eventForm.event_name}`);
      const emptyForm = createEmptyEventForm();
      setEventForm(emptyForm);
      setEventFormBaseline(serializeEventForm(emptyForm));
      setEventTrainerDraft('');
      setEventPostQuote(null);
      setEditingEventId('');
      setEventMode('list');
      await loadEvents();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEventSaving(false);
    }
  }

  function viewEvent(item) {
    const durationInput = fromDurationMinutes(item.duration_minutes || '60');
    const nextForm = {
      brief_event: item.brief_event || '',
      event_name: item.event_name || '',
      trainer_name: item.trainer_name || '',
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
      registration_fields: (Array.isArray(item.registration_fields) ? item.registration_fields : []).map(toRegistrationFieldForm)
    };
    setEventWalkinForm(createEmptyEventWalkinForm());
    setEventForm(nextForm);
    setEventFormBaseline(serializeEventForm(nextForm));
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
      const proceed = window.confirm('Ada perubahan event yang belum disimpan. Tetap pindah tab?');
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
      setFeedback(`event.deleted: ${eventId}`);
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
        setFeedback(`event.shared: link copied for ${eventName}`);
        return;
      }
      throw new Error('clipboard not available');
    } catch {
      if (typeof window !== 'undefined') {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
      setFeedback(`event.shared: opened ${shareUrl}`);
    }
  }

  function openEventParticipants(item) {
    setActiveTab('event');
    viewEvent(item);
    setEventEditTab('participants');
    setFeedback(`event.participants: ${item?.event_name || item?.event_id || '-'}`);
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
      setFeedback(`walkin.registered: ${fullName || email}`);
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
      setFeedback('Barcode/tiket tidak ditemukan di daftar participant.');
      return;
    }
    if (matches.length > 1) {
      setFeedback('Barcode cocok ke lebih dari satu participant. Check-in dibatalkan, gunakan kode yang lebih spesifik.');
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
      if (result?.duplicate) {
        setFeedback(`checkin.skip: ${participant?.full_name || participant?.email || participant?.passport_id || '-'} sudah check-in sebelumnya.`);
      } else {
        setFeedback(`checkin.success: ${participant?.full_name || participant?.email || participant?.passport_id || '-'}`);
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
      setFeedback('Upgrade to starter untuk menikmati fasilitas ini.');
      return;
    }
    const key = row?.key;
    const participant = row?.participant || {};
    if (!key) return;
    const awardEnabled = isAwardEnabled(eventForm.award_enabled, true);
    if (!awardEnabled) {
      setFeedback('Award tidak aktif untuk event ini.');
      return;
    }
    const topN = normalizeAwardTopN(eventForm.award_top_n, 1);
    const rankRaw = String(eventCheckoutRankMap[key] || '').trim();
    const rank = rankRaw ? normalizeAwardTopN(rankRaw, 1) : null;
    if (rank !== null && rank > topN) {
      setFeedback(`Rank maksimal untuk event ini adalah ${topN}.`);
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
      if (result?.duplicate) {
        setFeedback(`checkout.skip: ${participant.full_name || participant.email || participant.passport_id || '-'} sudah checkout sebelumnya.`);
      } else {
        setFeedback(
          `checkout.success: ${participant.full_name || participant.email || participant.passport_id || '-'}${rank ? ` (rank ${rank}, score ${scorePoints})` : ''}`
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
      setFeedback('Pilih event dulu sebelum export participants.');
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
    setFeedback(`participants.exported: ${rows.length - 1} rows`);
  }

  function preparePostEventQuote() {
    if (!editingEventId) {
      setFeedback('Simpan event dulu sebelum dipublikasikan.');
      return;
    }
    if (isEditingEventPublished) {
      setFeedback('Event sudah dipublikasikan.');
      return;
    }
    const startAtIso = toApiDatetime(eventForm.start_at);
    const durationMinutes = toDurationMinutes(eventForm.duration_value, eventForm.duration_unit);
    if (!startAtIso) {
      setFeedback('start_at tidak valid');
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFeedback('Duration harus lebih dari 0');
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
          status: 'draft'
        })
      });
      await loadEvents();
      setEventPostQuote(null);
      setFeedback(`event.draft: ${eventForm.event_name || editingEvent?.event_name || editingEventId}. Event diturunkan ke draft.`);
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
          trainer_name: eventForm.trainer_name || null,
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
          status: 'published'
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
        setFeedback(`event.published: ${eventForm.event_name}. Foremoz Events ditampilkan, lanjut pembayaran.`);
      } else {
        setFeedback(`event.published: ${eventForm.event_name}. Foremoz Events ditampilkan. harga ${formatIdr(eventPostQuote.price)}.`);
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
        setFeedback('Nominal transaksi harus lebih dari 0.');
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
        setFeedback(`payment.recorded: ${transactionForm.no_transaction}. event sudah tampil di Foremoz Events.`);
        setPendingPostedEventId('');
      } else {
        setFeedback(`transaction.created: ${transactionForm.no_transaction}`);
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
      setFeedback(`payment.confirmed: ${item.no_transaction}`);
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function rejectTransaction(item) {
    try {
      const reason =
        typeof window !== 'undefined'
          ? window.prompt(`Alasan reject untuk ${item.no_transaction}:`, 'invalid proof / duplicate payment') || ''
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
      setFeedback(`payment.rejected: ${item.no_transaction}`);
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
    setFeedback(`saas.extended: +${saasForm.months} month(s)`);
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
        onSelectEnv={(env) => {
          setTargetEnv(env);
          goToEnv(env);
        }}
        onSignOut={signOut}
      />

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
                  const proceed = window.confirm('Ada perubahan event yang belum disimpan. Tetap pindah menu?');
                  if (!proceed) return;
                }
                setActiveTab(tab.id);
                if (tab.id === 'class') {
                  setEditingClassId('');
                  setClassForm({ class_name: '', trainer_name: '', capacity: '20', price: '0', start_at: '' });
                  setClassTrainerDraft('');
                  setClassMode('list');
                }
                if (tab.id === 'event') {
                  setEditingEventId('');
                  setEventForm(createEmptyEventForm());
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
                  setPackageForm({ package_name: '', package_type: 'membership', max_months: '1', session_count: '1', trainer_user_id: '', class_id: '', price: '' });
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
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '0.8rem' }}>
        <article className="card admin-main">
          {activeTab === 'event' ? (
            <>
              <p className="eyebrow">Event</p>
              {eventMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Event list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari event..."
                        value={eventQuery}
                        onChange={(e) => setEventQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddEvent}>
                        Add New
                      </button>
                    </div>
                  </div>
                  {eventLoading ? <p className="feedback">Loading event list...</p> : null}
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
              ) : eventMode === 'walkin' && selectedWalkinEvent ? (
                <>
                  <div className="panel-head">
                    <h2>Walk-in Registration</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setEventWalkinForm(createEmptyEventWalkinForm());
                        setEventMode('list');
                      }}
                    >
                      Back to list
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
                        <p className="eyebrow">Informasi untuk penyelenggara</p>
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
                                  <option value="">Pilih</option>
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
                    <h2>{editingEventId ? `Edit event ${eventForm.event_name || ''}`.trim() : 'Add event'}</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        if (isEventFormDirty && typeof window !== 'undefined') {
                          const proceed = window.confirm('Ada perubahan event yang belum disimpan. Kembali ke list?');
                          if (!proceed) return;
                        }
                        setEventMode('list');
                      }}
                    >
                      Back to list
                    </button>
                  </div>
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
                      className={`landing-tab ${eventEditTab === 'participants' ? 'active' : ''}`}
                      onClick={() => switchEventEditTab('participants')}
                    >
                      Participants
                    </button>
                  </div>
                  {eventEditTab === 'general' ? (
                    <div className="card" style={{ marginBottom: '0.8rem', borderStyle: 'dashed' }}>
                      <p className="eyebrow">AI Assist</p>
                      <label>
                        Brief Event
                        <textarea
                          rows={3}
                          placeholder="Contoh: Saya mau mengadakan pameran lukisan di Artpreneur Jakarta tgl 1 April 2026, 8 pagi - 20 sore, topiknya budaya Indonesia."
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
                      {eventAiWorking ? <p className="feedback">AI assist running...</p> : null}
                    </div>
                  ) : null}
                  <form className="form" onSubmit={addEvent}>
                    {eventEditTab === 'general' ? (
                      <>
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
                              Pilih dari {creatorLabelLower}
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) addEventTrainerToken(e.target.value);
                                }}
                              >
                                <option value="">Pilih {creatorLabelLower}...</option>
                                {availableEventTrainerOptions.map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
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
                        </div>
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
                      </>
                    ) : null}
                    {eventEditTab === 'category' ? (
                      <div className="card" style={{ borderStyle: 'dashed' }}>
                        <p className="eyebrow">Event category</p>
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
                      </div>
                    ) : null}
                    {eventEditTab === 'custom_fields' ? (
                      <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">Registration fields</p>
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
                                  <option value="free_type">free type</option>
                                  <option value="date">date</option>
                                  <option value="lookup">lookup</option>
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
                                {eventParticipantsLoading ? 'Refreshing...' : 'Refresh'}
                              </button>
                            </div>
                          </div>
                          {!isEditingEventPublished ? (
                            <div className="card" style={{ borderStyle: 'dashed', marginBottom: '0.6rem' }}>
                              <p className="eyebrow">Guide</p>
                              <p className="feedback">Event masih draft. Participant biasanya muncul setelah event dipublikasikan dan member melakukan registrasi.</p>
                              <p className="feedback">Langkah cepat: Save event {'->'} Publikasikan Event {'->'} bagikan link event {'->'} refresh tab Participants.</p>
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
                          {eventParticipantsLoading ? <p className="feedback">Loading participants...</p> : null}
                          {!eventParticipantsLoading && eventParticipants.length === 0 ? (
                            <p className="feedback">Belum ada participant yang join event ini.</p>
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
                        <p className="feedback">Simpan event dulu untuk melihat participants.</p>
                      )
                    ) : null}
                    {eventEditTab === 'general' ? (
                      <>
                        <button className="btn" type="submit" disabled={eventSaving}>{eventSaving ? 'Saving...' : 'Save event'}</button>
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
                      <p className="eyebrow">Preview Publikasi</p>
                      <p>Mulai: {formatClassDatetime(eventPostQuote.start_at)}</p>
                      <p>Durasi: {formatDurationLabelFromMinutes(eventPostQuote.duration_minutes)}</p>
                      <p>Biaya publikasi: <strong>{formatIdr(eventPostQuote.price)}</strong></p>
                      <button className="btn" type="button" disabled={eventSaving} onClick={proceedPostEventPayment}>
                        Publikasikan Sekarang
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {activeTab === 'user' ? (
            <>
              <p className="eyebrow">User</p>
              {userMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>User list, delete</h2>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setUserForm({ full_name: '', email: '', role: 'staff' });
                        setUserMode('add');
                      }}
                    >
                      Add New
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
                    <h2>Add user</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setUserMode('list');
                      }}
                    >
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addUser}>
                    <label>full_name<input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
                    <label>email<input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></label>
                    <label>role<select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}><option value="staff">staff</option><option value="manager">manager</option><option value="admin">admin</option><option value="cs">cs</option><option value="sales">sales</option><option value="pt">pt</option></select></label>
                    <button className="btn" type="submit">Save user</button>
                  </form>
                </>
              ) : null}
            </>
          ) : null}

          {activeTab === 'class' ? (
            <>
              <p className="eyebrow">Class</p>
              {classMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Class list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari class..."
                        value={classQuery}
                        onChange={(e) => setClassQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddClass}>
                        Add New
                      </button>
                    </div>
                  </div>
                  {classLoading ? <p className="feedback">Loading class list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Class Name</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Trainer</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Capacity</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Price</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Start At</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClasses.map((item, idx) => (
                          <tr key={item.class_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.class_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.trainer_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.capacity}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{formatIdr(item.price || 0)}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{formatClassDatetime(item.start_at)}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions">
                                <ViewButton onClick={() => viewClass(item)} />
                                <DeleteButton onClick={() => deleteClass(item.class_id)} />
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
                    <h2>{editingClassId ? 'Edit class' : 'Add class'}</h2>
                    <button className="btn ghost" type="button" onClick={() => setClassMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addClass}>
                    <label>Class Name<input value={classForm.class_name} onChange={(e) => setClassForm((p) => ({ ...p, class_name: e.target.value }))} /></label>
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">{creatorLabel} Name (token input)</p>
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
                          Pilih dari {creatorLabelLower}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) addClassTrainerToken(e.target.value);
                            }}
                          >
                            <option value="">Pilih {creatorLabelLower}...</option>
                            {availableClassTrainerOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
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
                      <p className="feedback">Tersimpan sebagai: {classForm.trainer_name || '-'}</p>
                    </div>
                    <label>Capacity<input type="number" min="1" value={classForm.capacity} onChange={(e) => setClassForm((p) => ({ ...p, capacity: e.target.value }))} /></label>
                    <label>Price<input type="number" min="0" value={classForm.price} onChange={(e) => setClassForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <label>Start At<input type="datetime-local" value={classForm.start_at} onChange={(e) => setClassForm((p) => ({ ...p, start_at: e.target.value }))} /></label>
                    <button className="btn" type="submit" disabled={classSaving}>{classSaving ? 'Saving...' : 'Save class'}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'product' ? (
            <>
              <p className="eyebrow">Product</p>
              {productMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Product list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari product..."
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddProduct}>
                        Add New
                      </button>
                    </div>
                  </div>
                  {productLoading ? <p className="feedback">Loading product list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Product</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Category</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Price</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Stock</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((item, idx) => (
                          <tr key={item.product_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.product_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.category}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.price}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.stock || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
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
                    <h2>{editingProductId ? 'Edit product' : 'Add product'}</h2>
                    <button className="btn ghost" type="button" onClick={() => setProductMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addProduct}>
                    <label>product_name<input value={productForm.product_name} onChange={(e) => setProductForm((p) => ({ ...p, product_name: e.target.value }))} /></label>
                    <label>category<select value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}><option value="retail">retail</option><option value="service">service</option><option value="bundle">bundle</option></select></label>
                    <label>price<input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <label>stock<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} /></label>
                    <button className="btn" type="submit" disabled={productSaving}>{productSaving ? 'Saving...' : 'Save product'}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'package_creation' ? (
            <>
              <p className="eyebrow">Package creation</p>
              {packageMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Package list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari package..."
                        value={packageQuery}
                        onChange={(e) => setPackageQuery(e.target.value)}
                      />
                      <button className="btn" type="button" onClick={startAddPackage}>
                        Add New
                      </button>
                    </div>
                  </div>
                  {packageLoading ? <p className="feedback">Loading package list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Package</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Type</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>PT Trainer</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Class</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Max Months</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Session</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Price</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPackages.map((item, idx) => (
                          <tr key={item.package_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.package_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.package_type}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.package_type === 'pt' ? (item.trainer_name || '-') : '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.package_type === 'class' ? (item.class_name || '-') : '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.package_type === 'pt' || item.package_type === 'membership' || item.package_type === 'class' ? `${item.max_months} bulan` : '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.package_type === 'pt' || item.package_type === 'class' ? item.session_count : '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.price}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
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
                    <h2>{editingPackageId ? 'Edit package' : 'Add package'}</h2>
                    <button className="btn ghost" type="button" onClick={() => setPackageMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addPackageCreation}>
                    <label>package_name<input value={packageForm.package_name} onChange={(e) => setPackageForm((p) => ({ ...p, package_name: e.target.value }))} /></label>
                    <label>package_type<select value={packageForm.package_type} onChange={(e) => setPackageForm((p) => ({ ...p, package_type: e.target.value }))}><option value="membership">membership</option><option value="pt">pt</option><option value="class">class</option></select></label>
                    {packageForm.package_type === 'pt' || packageForm.package_type === 'class' ? (
                      <>
                        <label>max_months<input type="number" min="1" value={packageForm.max_months} onChange={(e) => setPackageForm((p) => ({ ...p, max_months: e.target.value }))} /></label>
                        <label>max_sessions<input type="number" min="1" value={packageForm.session_count} onChange={(e) => setPackageForm((p) => ({ ...p, session_count: e.target.value }))} /></label>
                      </>
                    ) : null}
                    {packageForm.package_type === 'pt' ? (
                      <label>pt_trainer<select value={packageForm.trainer_user_id} onChange={(e) => setPackageForm((p) => ({ ...p, trainer_user_id: e.target.value }))}>
                        <option value="">pilih trainer</option>
                        {ptLookupOptions.map((item) => (
                          <option key={item.user_id} value={item.user_id}>{item.full_name}</option>
                        ))}
                      </select></label>
                    ) : null}
                    {packageForm.package_type === 'class' ? (
                      <label>class_lookup<select value={packageForm.class_id} onChange={(e) => setPackageForm((p) => ({ ...p, class_id: e.target.value }))}>
                        <option value="">pilih class</option>
                        {classLookupOptions.map((item) => (
                          <option key={item.class_id} value={item.class_id}>{item.class_name}</option>
                        ))}
                      </select></label>
                    ) : null}
                    {packageForm.package_type === 'membership' ? (
                      <label>duration_months<input type="number" min="1" value={packageForm.max_months} onChange={(e) => setPackageForm((p) => ({ ...p, max_months: e.target.value }))} /></label>
                    ) : null}
                    <label>price<input type="number" min="0" value={packageForm.price} onChange={(e) => setPackageForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <button className="btn" type="submit" disabled={packageSaving}>{packageSaving ? 'Saving...' : 'Save package'}</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'trainer' ? (
            <>
              <p className="eyebrow">Trainer</p>
              {selectedTrainerUser ? (
                <>
                  <div className="panel-head">
                    <h2>Member PT Package - {selectedTrainerUser.full_name}</h2>
                    <button className="btn ghost" type="button" onClick={closeTrainerPackageList}>
                      Back to trainer list
                    </button>
                  </div>
                  <div className="panel-head">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari member/package..."
                        value={trainerPackageQuery}
                        onChange={(e) => setTrainerPackageQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {trainerPackageLoading ? <p className="feedback">Loading member package list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Member</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Member ID</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>PT Package</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Total</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Remaining</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrainerPackageRows.map((item, idx) => (
                          <tr key={`${item.pt_package_id}-${item.member_id}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_id}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.pt_package_id}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.total_sessions}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.remaining_sessions}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{formatClassDatetime(item.updated_at)}</td>
                          </tr>
                        ))}
                        {filteredTrainerPackageRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Belum ada member yang membeli paket trainer ini.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Trainer List</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari user PT..."
                        value={ptUserQuery}
                        onChange={(e) => setPtUserQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {userLoading ? <p className="feedback">Loading user list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Nama</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Email</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>List</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Trainer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPtUsers.map((item, idx) => (
                          <tr key={item.user_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.full_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.email}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <button type="button" className="btn ghost small" onClick={() => openTrainerPackageList(item)}>
                                list
                              </button>
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
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
                            <td colSpan={4} style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Belum ada user role pt.</td>
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
              <p className="eyebrow">Sales</p>
              {selectedSalesUser ? (
                <>
                  <div className="panel-head">
                    <h2>Member Purchased - {selectedSalesUser.full_name}</h2>
                    <button className="btn ghost" type="button" onClick={closeSalesMemberList}>
                      Back to sales list
                    </button>
                  </div>
                  <div className="panel-head">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari member/subscription..."
                        value={salesMemberQuery}
                        onChange={(e) => setSalesMemberQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {salesMemberLoading ? <p className="feedback">Loading member purchased list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Member</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Member ID</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Subscription</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Plan</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Prospect</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesMemberRows.map((item, idx) => (
                          <tr key={`${item.member_id}-${item.prospect_id}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_id}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.subscription_id}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.plan_id}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.prospect_id}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.stage}</td>
                          </tr>
                        ))}
                        {filteredSalesMemberRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Belum ada member membeli paket dari sales ini.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Sales List</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari user sales..."
                        value={salesUserQuery}
                        onChange={(e) => setSalesUserQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {userLoading ? <p className="feedback">Loading user list...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Nama</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Email</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>List</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesUsers.map((item, idx) => (
                          <tr key={item.user_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.full_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.email}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <button type="button" className="btn ghost small" onClick={() => openSalesMemberList(item)}>
                                list
                              </button>
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
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
                            <td colSpan={4} style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Belum ada user role sales.</td>
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
              <p className="eyebrow">Member</p>
              {memberMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Member list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari member..."
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
                        Add New
                      </button>
                      <input
                        ref={memberUploadInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleMemberUploadChange}
                        style={{ display: 'none' }}
                      />
                      <button className="btn ghost" type="button" onClick={openMemberUploadModal} disabled={memberSaving}>
                        Upload
                      </button>
                    </div>
                  </div>
                  <div className="card" style={{ borderStyle: 'dashed', marginBottom: '1rem' }}>
                    <p className="eyebrow">Upload member relation scope</p>
                    <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                      {memberUploadRelations.length === 0 ? <span className="feedback">Upload akan memakai relasi class/event yang dipilih di sini.</span> : null}
                      {memberUploadRelations.map((item) => (
                        <span key={`${item.kind}:${item.id}`} className="passport-chip">
                          {item.label}
                          <button
                            type="button"
                            className="btn ghost small"
                            style={{ marginLeft: '0.35rem' }}
                            onClick={() => removeMemberRelationToken(item, 'upload')}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                    <label>
                      Tambah class/event untuk upload
                      <select
                        value={memberUploadDraft}
                        onChange={(e) => {
                          setMemberUploadDraft(e.target.value);
                          if (e.target.value) addMemberRelationToken(e.target.value, 'upload');
                        }}
                      >
                        <option value="">Pilih class/event...</option>
                        {availableMemberUploadRelationOptions.map((item) => (
                          <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="sub" style={{ marginTop: '0.5rem' }}>
                      Format CSV: `email,member_name,phone`
                    </p>
                  </div>
                  {memberUploadModalOpen ? (
                    <div className="modal-overlay" onClick={closeMemberUploadModal}>
                      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                        <div className="panel-head">
                          <div>
                            <p className="eyebrow">Upload Member</p>
                            <h3 style={{ margin: 0 }}>Pilih metode upload</h3>
                          </div>
                          <button className="btn ghost small" type="button" onClick={closeMemberUploadModal}>
                            Close
                          </button>
                        </div>
                        <div className="row-actions" style={{ marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            className={`btn ghost small ${memberUploadMode === 'template' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMemberUploadMode('template')}
                          >
                            Download template
                          </button>
                          <button
                            className={`btn ghost small ${memberUploadMode === 'paste' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMemberUploadMode('paste')}
                          >
                            Copy paste
                          </button>
                          <button
                            className={`btn ghost small ${memberUploadMode === 'file' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setMemberUploadMode('file')}
                          >
                            Upload file
                          </button>
                        </div>
                        {memberUploadMode === 'template' ? (
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="feedback">Unduh template CSV lalu isi sesuai format standar upload member.</p>
                            <p className="sub">Kolom wajib: `email`. Kolom lain: `member_name`, `phone`.</p>
                            <button className="btn" type="button" onClick={downloadMemberUploadTemplate}>
                              Download template CSV
                            </button>
                          </div>
                        ) : null}
                        {memberUploadMode === 'paste' ? (
                          <form className="form" onSubmit={submitMemberUploadText}>
                            <label>
                              Paste CSV
                              <textarea
                                rows={10}
                                value={memberUploadText}
                                onChange={(event) => setMemberUploadText(event.target.value)}
                                placeholder={'email,member_name,phone\nmember1@example.com,Member Satu,081234567890'}
                              />
                            </label>
                            <p className="sub">Format: `email,member_name,phone`</p>
                            <button className="btn" type="submit" disabled={memberSaving}>
                              {memberSaving ? 'Uploading...' : 'Upload dari paste'}
                            </button>
                          </form>
                        ) : null}
                        {memberUploadMode === 'file' ? (
                          <div className="card" style={{ borderStyle: 'dashed' }}>
                            <p className="feedback">Pilih file CSV untuk upload massal member.</p>
                            <p className="sub">Format: `email,member_name,phone`</p>
                            <button className="btn" type="button" onClick={() => memberUploadInputRef.current?.click()} disabled={memberSaving}>
                              {memberSaving ? 'Uploading...' : 'Pilih file CSV'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Nama Member</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>No. HP</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Email Aktif</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((item, idx) => (
                          <tr key={item.member_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_name}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.phone}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.email || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
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
                    <h2>Add member</h2>
                    <button className="btn ghost" type="button" onClick={() => setMemberMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addMember}>
                    <label>member_name<input value={memberForm.member_name} onChange={(e) => setMemberForm((p) => ({ ...p, member_name: e.target.value }))} /></label>
                    <label>phone<input value={memberForm.phone} onChange={(e) => setMemberForm((p) => ({ ...p, phone: e.target.value }))} /></label>
                    <label>email (key)<input type="email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} required /></label>
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">class/event (token input)</p>
                      <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                        {memberForm.relations.length === 0 ? <span className="feedback">Pilih minimal satu class atau event.</span> : null}
                        {memberForm.relations.map((item) => (
                          <span key={`${item.kind}:${item.id}`} className="passport-chip">
                            {item.label}
                            <button
                              type="button"
                              className="btn ghost small"
                              style={{ marginLeft: '0.35rem' }}
                              onClick={() => removeMemberRelationToken(item)}
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                      <label>
                        Tambah relasi
                        <select
                          value={memberRelationDraft}
                          onChange={(e) => {
                            setMemberRelationDraft(e.target.value);
                            if (e.target.value) addMemberRelationToken(e.target.value);
                          }}
                        >
                          <option value="">Pilih class/event...</option>
                          {availableMemberRelationOptions.map((item) => (
                            <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button className="btn" type="submit" disabled={memberSaving}>
                      {memberSaving ? 'Saving...' : 'Save member'}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'transaction' ? (
            <>
              <p className="eyebrow">Transaction</p>
              {transactionMode === 'list' ? (
                <>
                  <div className="panel-head">
                    <h2>Transaction list, delete</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                      <input
                        type="text"
                        placeholder="Cari transaction..."
                        value={transactionQuery}
                        onChange={(e) => setTransactionQuery(e.target.value)}
                      />
                      <select value={transactionStatusFilter} onChange={(e) => setTransactionStatusFilter(e.target.value)}>
                        <option value="all">all status</option>
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="rejected">rejected</option>
                      </select>
                      <select value={transactionLinkFilter} onChange={(e) => setTransactionLinkFilter(e.target.value)}>
                        <option value="all">all links</option>
                        <option value="subscription">subscription</option>
                        <option value="booking">booking</option>
                        <option value="pt_package">pt package</option>
                        <option value="unlinked">unlinked</option>
                      </select>
                      <button className="btn" type="button" onClick={() => setTransactionMode('add')}>
                        Add New
                      </button>
                    </div>
                  </div>
                  {transactionLoading ? <p className="feedback">Loading payments...</p> : null}
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>No Transaction</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Member</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Product</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Qty</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Price</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Method</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Review</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((item, idx) => (
                          <tr key={item.transaction_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.no_transaction}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.member_id || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div>
                                <strong>{item.product}</strong>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{item.operation_link || '-'}</p>
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.qty}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.currency || 'IDR'} {item.price}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.method || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{String(item.status || '-').toUpperCase()}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.review_note || '-'}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <div className="row-actions" style={{ display: 'flex', gap: '0' }}>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
                                  onClick={() => viewTransaction(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      viewTransaction(item);
                                    }
                                  }}
                                >
                                  view
                                </span>
                                {String(item.status || '').toLowerCase() === 'pending' ? (
                                  <>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
                                      onClick={() => confirmTransaction(item)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') confirmTransaction(item);
                                      }}
                                    >
                                      confirm
                                    </span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
                                      onClick={() => rejectTransaction(item)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') rejectTransaction(item);
                                      }}
                                    >
                                      reject
                                    </span>
                                  </>
                                ) : null}
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
                    <h2>Transaction detail</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {String(transactionDetail?.status || '').toLowerCase() === 'pending' ? (
                        <>
                          <button
                            className="btn"
                            type="button"
                            onClick={() => confirmTransaction(transactionDetail)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => rejectTransaction(transactionDetail)}
                          >
                            Reject
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
                        Back to list
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
                        Add New
                      </button>
                    </div>
                  </div>
                  <div className="form">
                    <p><strong>no_transaction:</strong> {transactionDetail?.no_transaction || '-'}</p>
                    <p><strong>member_id:</strong> {transactionDetail?.member_id || '-'}</p>
                    <p><strong>product:</strong> {transactionDetail?.product || '-'}</p>
                    <p><strong>linked_operation:</strong> {transactionDetail?.operation_link || '-'}</p>
                    <p><strong>detail:</strong> {transactionDetail?.detail_note || '-'}</p>
                    <p><strong>qty:</strong> {transactionDetail?.qty || '-'}</p>
                    <p><strong>price:</strong> {transactionDetail?.currency || 'IDR'} {transactionDetail?.price || '-'}</p>
                    <p><strong>method:</strong> {transactionDetail?.method || '-'}</p>
                    <p><strong>status:</strong> {String(transactionDetail?.status || '-').toUpperCase()}</p>
                    <p><strong>recorded_at:</strong> {transactionDetail?.recorded_at || '-'}</p>
                    <p><strong>reviewed_at:</strong> {transactionDetail?.reviewed_at || '-'}</p>
                    <p><strong>review_note:</strong> {transactionDetail?.review_note || '-'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>Add transaction</h2>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setTransactionDetail(null);
                        setTransactionMode('list');
                      }}
                    >
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addTransaction}>
                    <label>no_transaction<input value={transactionForm.no_transaction} onChange={(e) => setTransactionForm((p) => ({ ...p, no_transaction: e.target.value }))} /></label>
                    <label>member_id<input value={transactionForm.member_id} onChange={(e) => setTransactionForm((p) => ({ ...p, member_id: e.target.value }))} /></label>
                    <label>product<input value={transactionForm.product} onChange={(e) => setTransactionForm((p) => ({ ...p, product: e.target.value }))} /></label>
                    <label>qty<input type="number" min="1" value={transactionForm.qty} onChange={(e) => setTransactionForm((p) => ({ ...p, qty: e.target.value }))} /></label>
                    <label>price<input type="number" min="0" value={transactionForm.price} onChange={(e) => setTransactionForm((p) => ({ ...p, price: e.target.value }))} /></label>
                    <label>currency<select value={transactionForm.currency} onChange={(e) => setTransactionForm((p) => ({ ...p, currency: e.target.value }))}>
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                    </select></label>
                    <label>method<select value={transactionForm.method} onChange={(e) => setTransactionForm((p) => ({ ...p, method: e.target.value }))}>
                      <option value="virtual_account">virtual_account</option>
                      <option value="bank_transfer">bank_transfer</option>
                      <option value="qris">qris</option>
                      <option value="ewallet">ewallet</option>
                      <option value="cash">cash</option>
                      <option value="credit_card">credit_card</option>
                      <option value="debit_card">debit_card</option>
                    </select></label>
                    <button className="btn" type="submit">Save transaction</button>
                  </form>
                </>
              )}
            </>
          ) : null}

          {activeTab === 'saas' ? (
            <>
              <p className="eyebrow">SaaS</p>
              <h2>Perpanjang sewa SaaS</h2>
              <form className="form" onSubmit={extendSaas}>
                <label>tambah_bulan<select value={saasForm.months} onChange={(e) => setSaasForm((p) => ({ ...p, months: e.target.value }))}><option value="1">1</option><option value="3">3</option><option value="6">6</option><option value="12">12</option></select></label>
                <label>note<input value={saasForm.note} onChange={(e) => setSaasForm((p) => ({ ...p, note: e.target.value }))} /></label>
                <button className="btn" type="submit">Perpanjang sewa</button>
              </form>
            </>
          ) : null}

          {feedback ? <p className="feedback">{feedback}</p> : null}
        </article>
      </section>

      <footer className="dash-foot">
        <Link to={accountPath(session, '/cs/dashboard')}>Back to search member</Link>
      </footer>
    </main>
  );
}
