import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountPath, apiJson, getAccountSlug, getEnvironmentLabel, getSession, getAdminTabsByPlan, getAllowedEnvironments, getSessionPackagePlan } from '../lib.js';
import { getVerticalLabel, guessVerticalSlugByText } from '../industry-jargon.js';

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
  { class_id: 'class_001', class_name: 'HIIT Morning', trainer_name: 'Raka', capacity: '20', start_at: '2026-03-03 07:00' }
];
const DEFAULT_EVENTS = [
  {
    event_id: 'evt_001',
    event_name: 'One-time Bootcamp',
    location: 'Main Hall',
    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80',
    start_at: '2026-03-10 07:00',
    duration_minutes: '60',
    status: 'scheduled'
  }
];
function createEmptyEventForm() {
  return {
    event_name: '',
    location: '',
    image_url: '',
    description: '',
    categories_text: '',
    award_scopes: ['overall'],
    award_top_n: '1',
    gallery_images_text: '',
    schedule_items_text: '',
    start_at: '',
    duration_minutes: '60',
    registration_fields: []
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
  { transaction_id: 'trx_001', no_transaction: 'TRX-001', product: 'Monthly Membership', qty: '1', price: '350000' }
];

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
  const [eventCheckinSearch, setEventCheckinSearch] = useState('');
  const [eventCheckinBarcode, setEventCheckinBarcode] = useState('');

  const [userForm, setUserForm] = useState({ full_name: '', email: '', role: 'staff' });
  const [eventForm, setEventForm] = useState(() => createEmptyEventForm());
  const [classForm, setClassForm] = useState({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
  const [classTrainerDraft, setClassTrainerDraft] = useState('');
  const [trainerForm, setTrainerForm] = useState({ trainer_name: '', phone: '', specialization: '' });
  const [productForm, setProductForm] = useState({ product_name: '', category: 'retail', price: '', stock: '' });
  const [packageForm, setPackageForm] = useState({ package_name: '', package_type: 'membership', max_months: '1', session_count: '1', trainer_user_id: '', class_id: '', price: '' });
  const [salesForm, setSalesForm] = useState({ sales_name: '', channel: 'walkin', target_amount: '' });
  const [memberForm, setMemberForm] = useState({ member_name: '', phone: '', email: '' });
  const [transactionForm, setTransactionForm] = useState({ no_transaction: '', product: '', qty: '1', price: '' });
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
  const [ptTrainerEnabledMap, setPtTrainerEnabledMap] = useState(() => loadMap('pt-trainer-enabled', accountSlug, {}));
  const [salesEnabledMap, setSalesEnabledMap] = useState(() => loadMap('sales-enabled', accountSlug, {}));
  const [selectedTrainerUser, setSelectedTrainerUser] = useState(null);
  const [trainerPackageRows, setTrainerPackageRows] = useState([]);
  const [trainerPackageLoading, setTrainerPackageLoading] = useState(false);
  const [selectedSalesUser, setSelectedSalesUser] = useState(null);
  const [salesMemberRows, setSalesMemberRows] = useState([]);
  const [salesMemberLoading, setSalesMemberLoading] = useState(false);

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
          event_name: item.event_name || '',
          location: item.location || '',
          image_url: item.image_url || '',
          description: item.description || '',
          event_categories: Array.isArray(item.event_categories) ? item.event_categories : [],
          award_scopes: normalizeEventAwardScopes(item.award_scopes ?? item.award_scope, ['overall']),
          award_top_n: String(normalizeAwardTopN(item.award_top_n, 1)),
          gallery_images: Array.isArray(item.gallery_images) ? item.gallery_images : [],
          schedule_items: Array.isArray(item.schedule_items) ? item.schedule_items : [],
          start_at: item.start_at || '',
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

  useEffect(() => {
    setTrainers(loadList('trainers', accountSlug, DEFAULT_TRAINERS));
    setSales(loadList('sales', accountSlug, DEFAULT_SALES));
    setMembers(loadList('members', accountSlug, DEFAULT_MEMBERS));
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

  const filteredMembers = members.filter((item) =>
    item.member_name.toLowerCase().includes(memberQuery.toLowerCase())
  );
  const filteredEvents = events.filter((item) =>
    String(item.event_name || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.location || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.start_at || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.duration_minutes || '').toLowerCase().includes(eventQuery.toLowerCase()) ||
    String(item.status || '').toLowerCase().includes(eventQuery.toLowerCase())
  );
  const filteredClasses = classes.filter((item) =>
    String(item.class_name || '').toLowerCase().includes(classQuery.toLowerCase()) ||
    String(item.trainer_name || '').toLowerCase().includes(classQuery.toLowerCase()) ||
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
  const selectedClassTrainerTokens = useMemo(() => parseTrainerTokens(classForm.trainer_name), [classForm.trainer_name]);
  const availableClassTrainerOptions = useMemo(
    () => trainerNameOptions.filter((name) => !selectedClassTrainerTokens.includes(name)),
    [trainerNameOptions, selectedClassTrainerTokens]
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
  const filteredTransactions = transactions.filter((item) =>
    item.no_transaction.toLowerCase().includes(transactionQuery.toLowerCase()) ||
    item.product.toLowerCase().includes(transactionQuery.toLowerCase())
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
          start_at: startAtIso
        })
      });

      setFeedback(editingClassId ? `class.updated: ${classForm.class_name}` : `class.scheduled: ${classForm.class_name}`);
      setClassForm({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
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
      start_at: normalizedStartAt || ''
    });
    setClassTrainerDraft('');
    setEditingClassId(item.class_id || '');
    setClassMode('add');
  }

  function startAddClass() {
    setClassForm({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
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

  function addMember(e) {
    e.preventDefault();
    if (!memberForm.member_name || !memberForm.phone) return;
    setMembers((prev) => [{ ...memberForm, member_id: `member_${Date.now()}` }, ...prev]);
    setFeedback(`member.created: ${memberForm.member_name}`);
    setMemberForm({ member_name: '', phone: '', email: '' });
    setMemberMode('list');
  }

  function viewMember(item) {
    if (item?.member_id) {
      navigate(accountPath(session, `/members/${item.member_id}`));
      return;
    }
    setMemberForm({
      member_name: item.member_name || '',
      phone: item.phone || '',
      email: item.email || ''
    });
    setMemberMode('add');
  }

  async function addEvent(e) {
    e.preventDefault();
    if (!eventForm.event_name || !eventForm.start_at || !eventForm.duration_minutes) return;
    const startAtIso = toApiDatetime(eventForm.start_at);
    if (!startAtIso) {
      setFeedback('start_at tidak valid');
      return;
    }
    const durationMinutes = Number(eventForm.duration_minutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFeedback('duration_minutes harus lebih dari 0');
      return;
    }
    try {
      setEventSaving(true);
      const awardScopes = isFreePlan
        ? ['overall']
        : normalizeEventAwardScopes(eventForm.award_scopes, ['overall']);
      const awardTopN = isFreePlan ? 1 : normalizeAwardTopN(eventForm.award_top_n, 1);
      const method = editingEventId ? 'PATCH' : 'POST';
      const endpoint = editingEventId
        ? `/v1/admin/events/${encodeURIComponent(editingEventId)}`
        : '/v1/admin/events';
      await apiJson(endpoint, {
        method,
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          event_name: eventForm.event_name,
          location: eventForm.location || null,
          image_url: eventForm.image_url || null,
          description: eventForm.description || null,
          event_categories: normalizeEventCategoriesForPayload(eventForm.categories_text),
          award_scopes: awardScopes,
          award_scope: awardScopes[0] || 'overall',
          award_top_n: awardTopN,
          gallery_images: normalizeGalleryImagesForPayload(eventForm.gallery_images_text),
          schedule_items: normalizeScheduleItemsForPayload(eventForm.schedule_items_text),
          start_at: startAtIso,
          duration_minutes: durationMinutes,
          registration_fields: normalizeRegistrationFieldsForPayload(eventForm.registration_fields),
          status: editingEventId ? (editingEvent?.status || 'scheduled') : 'scheduled'
        })
      });
      setFeedback(editingEventId ? `event.updated: ${eventForm.event_name}` : `event.created: ${eventForm.event_name}`);
      setEventForm(createEmptyEventForm());
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
    setEventForm({
      event_name: item.event_name || '',
      location: item.location || '',
      image_url: item.image_url || '',
      description: item.description || '',
      categories_text: Array.isArray(item.event_categories) ? item.event_categories.join(', ') : '',
      award_scopes: normalizeEventAwardScopes(item.award_scopes ?? item.award_scope, ['overall']),
      award_top_n: String(normalizeAwardTopN(item.award_top_n, 1)),
      gallery_images_text: Array.isArray(item.gallery_images) ? item.gallery_images.join('\n') : '',
      schedule_items_text: scheduleItemsToText(item.schedule_items),
      start_at: toInputDatetime(item.start_at || ''),
      duration_minutes: String(item.duration_minutes || '60'),
      registration_fields: (Array.isArray(item.registration_fields) ? item.registration_fields : []).map(toRegistrationFieldForm)
    });
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
    setEventForm(createEmptyEventForm());
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
      await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}/participants/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          registration_id: participant?.registration_id || null,
          passport_id: participant?.passport_id || null,
          email: participant?.email || null,
          full_name: participant?.full_name || null
        })
      });
      setEventCheckinMap((prev) => ({ ...prev, [key]: true }));
      setFeedback(`checkin.success: ${participant?.full_name || participant?.email || participant?.passport_id || '-'}`);
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
    const topN = normalizeAwardTopN(eventForm.award_top_n, 1);
    const rankRaw = String(eventCheckoutRankMap[key] || '').trim();
    const rank = rankRaw ? normalizeAwardTopN(rankRaw, 1) : null;
    if (rank !== null && rank > topN) {
      setFeedback(`Rank maksimal untuk event ini adalah ${topN}.`);
      return;
    }
    try {
      setEventCheckoutSavingMap((prev) => ({ ...prev, [key]: true }));
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}/participants/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          registration_id: participant.registration_id || null,
          passport_id: participant.passport_id || null,
          email: participant.email || null,
          full_name: participant.full_name || null,
          rank
        })
      });
      const scorePoints = Number(result?.score_points || 0);
      setEventCheckoutMap((prev) => ({ ...prev, [key]: true }));
      setFeedback(
        `checkout.success: ${participant.full_name || participant.email || participant.passport_id || '-'}${rank ? ` (rank ${rank}, score ${scorePoints})` : ''}`
      );
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
    const durationMinutes = Number(eventForm.duration_minutes);
    if (!startAtIso) {
      setFeedback('start_at tidak valid');
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFeedback('duration_minutes harus lebih dari 0');
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
      const awardScopes = isFreePlan
        ? ['overall']
        : normalizeEventAwardScopes(eventForm.award_scopes, ['overall']);
      const awardTopN = isFreePlan ? 1 : normalizeAwardTopN(eventForm.award_top_n, 1);
      await apiJson(`/v1/admin/events/${encodeURIComponent(editingEventId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          event_name: eventForm.event_name,
          location: eventForm.location || null,
          image_url: eventForm.image_url || null,
          description: eventForm.description || null,
          event_categories: normalizeEventCategoriesForPayload(eventForm.categories_text),
          award_scopes: awardScopes,
          award_scope: awardScopes[0] || 'overall',
          award_top_n: awardTopN,
          gallery_images: normalizeGalleryImagesForPayload(eventForm.gallery_images_text),
          schedule_items: normalizeScheduleItemsForPayload(eventForm.schedule_items_text),
          start_at: eventPostQuote.start_at,
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
          product: `Post Event - ${eventForm.event_name || editingEventId}`,
          qty: '1',
          price: String(eventPostQuote.price)
        });
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
    if (!transactionForm.no_transaction || !transactionForm.product || !transactionForm.qty || !transactionForm.price) return;
    try {
      setTransactions((prev) => [{ ...transactionForm, transaction_id: `trx_${Date.now()}` }, ...prev]);
      if (pendingPostedEventId) {
        await apiJson(`/v1/admin/events/${encodeURIComponent(pendingPostedEventId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId,
            status: 'published'
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
      setTransactionForm({ no_transaction: '', product: '', qty: '1', price: '' });
      setTransactionMode('list');
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function viewTransaction(item) {
    setTransactionForm({
      no_transaction: item.no_transaction || '',
      product: item.product || '',
      qty: item.qty || '1',
      price: item.price || ''
    });
    setTransactionMode('add');
  }

  function extendSaas(e) {
    e.preventDefault();
    setFeedback(`saas.extended: +${saasForm.months} month(s)`);
    setSaasForm({ months: '1', note: '' });
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">{dashboardTitle}</p>
          <h1>{session?.tenant?.gym_name || `Foremoz ${inferredVerticalLabel} Tenant`}</h1>
          <p>{dashboardSubtitle}</p>
        </div>
        <div className="meta">
          {allowedEnv.length > 0 ? (
            <div className="env-switcher">
              <label className="env-lookup">
                Environment
                <select
                  value={targetEnv}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTargetEnv(next);
                    goToEnv(next);
                  }}
                >
                  {allowedEnv.map((env) => (
                    <option key={env} value={env}>
                      {getEnvironmentLabel(env)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="env-buttons" role="group" aria-label="Environment">
                {allowedEnv.map((env) => (
                  <button
                    key={env}
                    type="button"
                    className={`btn ghost small ${targetEnv === env ? 'active' : ''}`}
                    onClick={() => {
                      setTargetEnv(env);
                      goToEnv(env);
                    }}
                  >
                    {getEnvironmentLabel(env)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="card admin-tabs-card">
        <p className="eyebrow">{dashboardMenuLabel}</p>
        <div className="admin-tabs-wrap">
          {visibleAdminTabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'class') {
                  setEditingClassId('');
                  setClassForm({ class_name: '', trainer_name: '', capacity: '20', start_at: '' });
                  setClassTrainerDraft('');
                  setClassMode('list');
                }
                if (tab.id === 'event') {
                  setEditingEventId('');
                  setEventForm(createEmptyEventForm());
                  setEventPostQuote(null);
                  setEventParticipants([]);
                  setEventEditTab('general');
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
                          <p>{item.location || '-'}</p>
                          <p>Category: {Array.isArray(item.event_categories) && item.event_categories.length > 0 ? item.event_categories.join(', ') : '-'}</p>
                          {!isFreePlan ? (
                            <p>Award: {formatEventAwardScopes(item.award_scopes ?? item.award_scope)}</p>
                          ) : null}
                          {!isFreePlan ? <p>Top N: {normalizeAwardTopN(item.award_top_n, 1)}</p> : null}
                          <p>Start: {formatClassDatetime(item.start_at)}</p>
                          <p>Duration: {item.duration_minutes || '60'} minutes</p>
                          <p>Participants: {Number(item.participant_count || 0)}</p>
                          <div className="row-actions">
                            <ParticipantsButton onClick={() => openEventParticipants(item)} />
                            <ShareButton onClick={() => shareEvent(item)} />
                            <ViewButton onClick={() => viewEvent(item)} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="panel-head">
                    <h2>{editingEventId ? 'Edit event' : 'Add event'}</h2>
                    <button className="btn ghost" type="button" onClick={() => setEventMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <div className="landing-tabs" style={{ marginBottom: '0.8rem' }}>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'general' ? 'active' : ''}`}
                      onClick={() => setEventEditTab('general')}
                    >
                      General information
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'category' ? 'active' : ''}`}
                      onClick={() => setEventEditTab('category')}
                    >
                      Category
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'custom_fields' ? 'active' : ''}`}
                      onClick={() => setEventEditTab('custom_fields')}
                    >
                      Custom fields
                    </button>
                    <button
                      type="button"
                      className={`landing-tab ${eventEditTab === 'participants' ? 'active' : ''}`}
                      onClick={() => setEventEditTab('participants')}
                    >
                      Participants
                    </button>
                  </div>
                  <form className="form" onSubmit={addEvent}>
                    {eventEditTab === 'general' ? (
                      <>
                        <label>event_name<input value={eventForm.event_name} onChange={(e) => setEventForm((p) => ({ ...p, event_name: e.target.value }))} /></label>
                        <label>location<input value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} /></label>
                        <label>image_url<input value={eventForm.image_url} onChange={(e) => setEventForm((p) => ({ ...p, image_url: e.target.value }))} /></label>
                        <label>
                          description
                          <textarea
                            rows={4}
                            value={eventForm.description}
                            onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                          />
                        </label>
                        <label>
                          gallery_images (satu URL per baris)
                          <textarea
                            rows={4}
                            placeholder={'https://...\nhttps://...'}
                            value={eventForm.gallery_images_text}
                            onChange={(e) => setEventForm((p) => ({ ...p, gallery_images_text: e.target.value }))}
                          />
                        </label>
                        <label>
                          schedule_items (format: waktu | judul | catatan)
                          <textarea
                            rows={5}
                            placeholder={'09:00 | Registrasi | Check in peserta\n09:30 | Opening | Sambutan coach'}
                            value={eventForm.schedule_items_text}
                            onChange={(e) => setEventForm((p) => ({ ...p, schedule_items_text: e.target.value }))}
                          />
                        </label>
                        <label>start_at<input type="datetime-local" value={eventForm.start_at} onChange={(e) => setEventForm((p) => ({ ...p, start_at: e.target.value }))} /></label>
                        <label>duration_minutes<input type="number" min="1" value={eventForm.duration_minutes} onChange={(e) => setEventForm((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>
                      </>
                    ) : null}
                    {eventEditTab === 'category' ? (
                      <div className="card" style={{ borderStyle: 'dashed' }}>
                        <p className="eyebrow">Event category</p>
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
                        {isFreePlan ? (
                          <p className="feedback">Award scope tersedia untuk paket Starter ke atas.</p>
                        ) : (
                          <p className="feedback">
                            Setting saat ini: {formatEventAwardScopes(eventForm.award_scopes)}
                          </p>
                        )}
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
                            <button
                              className="btn ghost small"
                              type="button"
                              onClick={() => loadEventParticipants(editingEventId)}
                              disabled={eventParticipantsLoading}
                            >
                              {eventParticipantsLoading ? 'Refreshing...' : 'Refresh'}
                            </button>
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
                      <p>Durasi: {eventPostQuote.duration_minutes} menit</p>
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
                    <label>class_name<input value={classForm.class_name} onChange={(e) => setClassForm((p) => ({ ...p, class_name: e.target.value }))} /></label>
                    <div className="card" style={{ borderStyle: 'dashed' }}>
                      <p className="eyebrow">trainer_name (token input)</p>
                      <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
                        {selectedClassTrainerTokens.length === 0 ? <span className="feedback">Belum ada trainer dipilih.</span> : null}
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
                          Pilih dari trainer
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) addClassTrainerToken(e.target.value);
                            }}
                          >
                            <option value="">Pilih trainer...</option>
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
                          placeholder="Ketik nama trainer lalu Enter"
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
                    <label>capacity<input type="number" min="1" value={classForm.capacity} onChange={(e) => setClassForm((p) => ({ ...p, capacity: e.target.value }))} /></label>
                    <label>start_at<input type="datetime-local" value={classForm.start_at} onChange={(e) => setClassForm((p) => ({ ...p, start_at: e.target.value }))} /></label>
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
                      <button className="btn" type="button" onClick={() => setMemberMode('add')}>
                        Add New
                      </button>
                    </div>
                  </div>
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
                    <label>email<input type="email" value={memberForm.email} onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))} /></label>
                    <button className="btn" type="submit">Save member</button>
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
                      <button className="btn" type="button" onClick={() => setTransactionMode('add')}>
                        Add New
                      </button>
                    </div>
                  </div>
                  <div className="entity-list">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>No Transaction</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Product</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Qty</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Price</th>
                          <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', borderBottom: '1px solid #d1d5db', background: '#f7efe6', fontWeight: 700 }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((item, idx) => (
                          <tr key={item.transaction_id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7efe6' }}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.no_transaction}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.product}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.qty}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>{item.price}</td>
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
                                <span
                                  role="button"
                                  tabIndex={0}
                                  style={{ cursor: 'pointer', background: '#fff', color: '#8f3f1e', border:'1px solid #d9bea0', margin: '2px', padding: '0.2rem 0.45rem', borderRadius: '10px' }}
                                  onClick={() => setTransactions((prev) => prev.filter((v) => v.transaction_id !== item.transaction_id))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      setTransactions((prev) => prev.filter((v) => v.transaction_id !== item.transaction_id));
                                    }
                                  }}
                                >
                                  delete
                                </span>
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
                    <h2>Add transaction</h2>
                    <button className="btn ghost" type="button" onClick={() => setTransactionMode('list')}>
                      Back to list
                    </button>
                  </div>
                  <form className="form" onSubmit={addTransaction}>
                    <label>no_transaction<input value={transactionForm.no_transaction} onChange={(e) => setTransactionForm((p) => ({ ...p, no_transaction: e.target.value }))} /></label>
                    <label>product<input value={transactionForm.product} onChange={(e) => setTransactionForm((p) => ({ ...p, product: e.target.value }))} /></label>
                    <label>qty<input type="number" min="1" value={transactionForm.qty} onChange={(e) => setTransactionForm((p) => ({ ...p, qty: e.target.value }))} /></label>
                    <label>price<input type="number" min="0" value={transactionForm.price} onChange={(e) => setTransactionForm((p) => ({ ...p, price: e.target.value }))} /></label>
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
