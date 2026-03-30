import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  APP_ORIGIN,
  apiJson,
  clearSession,
  getOwnerSetup,
  getSession,
  IS_MOCK_MODE,
  IS_MOCKUP_OPEN_ACCESS,
  setOwnerSetup,
  setSession
} from '../lib.js';
import { getVerticalConfig, listVerticalConfigs, normalizeVerticalSlug } from '../industry-jargon.js';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 'IDR 0 / bulan',
    note: 'One-time event + check-in/check-out.'
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 'IDR 499.000 / bulan',
    note: 'Event + program + CS + product + check-in/check-out.'
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 'IDR 1.490.000 / bulan',
    note: 'Starter + team mode (multi coach) + sales.'
  },
  {
    key: 'multi_branch',
    name: 'Multi-branch',
    price: 'IDR 3.490.000 / bulan',
    note: 'Growth + multi location operations.'
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Mulai IDR 7.500.000+ / bulan',
    note: 'Untuk kebutuhan governance/compliance dan SLA custom.'
  }
];

const PLAN_PRICE = {
  free: 0,
  starter: 499000,
  growth: 1490000,
  multi_branch: 3490000,
  enterprise: 7500000,
  basic: 499000,
  pro: 1490000
};
const ENTERPRISE_REQUEST_EMAIL = 'hello@foremoz.com';

function normalizePackagePlan(value) {
  const plan = String(value || 'free').trim().toLowerCase();
  if (plan === 'basic') return 'starter';
  if (plan === 'pro') return 'growth';
  return plan || 'free';
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function createEmptyUserForm() {
  return { full_name: '', email: '', role: '', password: '' };
}

function formatAddUserRoleLabel(role, industrySlug = 'fitness') {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'pt') return getVerticalConfig(industrySlug)?.vocabulary?.creator || 'Coach';
  if (normalized === 'sales') return 'Influencer/Sales';
  if (normalized === 'cs') return 'CS';
  return 'User';
}

function getAssignableUserRoles(planValue) {
  const plan = normalizePackagePlan(planValue);
  if (plan === 'free' || plan === 'starter') return ['cs'];
  return ['cs', 'sales', 'pt'];
}

function openDashboardInNewTab(accountSlug) {
  const slug = String(accountSlug || '').trim();
  if (!slug) return;
  const baseOrigin = APP_ORIGIN || window.location.origin;
  const targetUrl = `${baseOrigin}/a/${slug}/admin/dashboard`;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function formatActivationFeedback(result, fullName) {
  const safeName = String(fullName || '').trim() || 'user';
  if (result?.email_delivery?.sent) {
    return `owner.user.created ${safeName}. Activation email sent.`;
  }
  if (result?.activation?.activation_url) {
    return `owner.user.created ${safeName}. Email not sent from this server, gunakan activation link manual: ${result.activation.activation_url}`;
  }
  return `owner.user.created ${safeName}. Pending activation.`;
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

export default function WebOwnerPage() {
  const navigate = useNavigate();
  const session = getSession();
  const existingSetupRaw = getOwnerSetup();
  const existingSetup = existingSetupRaw?.tenant_id === session?.tenant?.id ? existingSetupRaw : null;
  const tenantSeed = useMemo(() => session?.tenant?.id || existingSetup?.tenant_id || 'tn_001', [session, existingSetup]);

  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiWorking, setAiWorking] = useState(false);
  const [step, setStep] = useState(1);
  const [menu, setMenu] = useState('profile');
  const [setupRow, setSetupRow] = useState(null);

  const [setupForm, setSetupForm] = useState({
    gym_name: existingSetup?.gym_name || session?.tenant?.gym_name || '',
    account_slug: existingSetup?.account_slug || session?.tenant?.account_slug || '',
    package_plan: normalizePackagePlan(existingSetup?.package_plan || 'free'),
    industry_slug: normalizeVerticalSlug(existingSetup?.industry_slug || session?.tenant?.industry_slug, 'fitness'),
    tenant_id: existingSetup?.tenant_id || session?.tenant?.id || 'tn_001',
    branch_id: existingSetup?.branch_id || session?.branch?.id || '',
    address: existingSetup?.address || '',
    city: existingSetup?.city || '',
    photo_url: existingSetup?.photo_url || ''
  });

  const [saasForm, setSaasForm] = useState({ months: '1', note: '' });
  const [saasInfo, setSaasInfo] = useState(null);
  const [userForm, setUserForm] = useState(createEmptyUserForm);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchStatusFilter, setBranchStatusFilter] = useState('active');
  const [branchMode, setBranchMode] = useState('list');
  const [editingBranchId, setEditingBranchId] = useState('');
  const [branchForm, setBranchForm] = useState({
    branch_id: '',
    branch_name: '',
    account_slug: '',
    address: '',
    city: '',
    photo_url: ''
  });
  const [userMode, setUserMode] = useState('list');
  const [newUserRolePreset, setNewUserRolePreset] = useState('cs');
  const [editingUserId, setEditingUserId] = useState('');
  const [editingUser, setEditingUser] = useState({ full_name: '', role: 'staff' });
  const [dangerConfirm, setDangerConfirm] = useState('');
  const businessImageInputRef = useRef(null);
  const [enterpriseRequest, setEnterpriseRequest] = useState({
    requester_name: session?.user?.fullName || '',
    requester_email: session?.user?.email || '',
    phone: '',
    company_name: '',
    location_count: '1',
    requirement: ''
  });

  const selectedPlanMonthlyPrice = PLAN_PRICE[setupForm.package_plan] || 0;
  const verticalOptions = listVerticalConfigs();
  const creatorLabel = getVerticalConfig(normalizeVerticalSlug(setupForm.industry_slug, 'fitness'))?.vocabulary?.creator || 'Coach';
  const selectedMonths = Number(saasForm.months || 1);
  const extendTotalPrice = selectedPlanMonthlyPrice * selectedMonths;
  const isGrowthOrAbove = useMemo(
    () => ['growth', 'multi_branch', 'enterprise'].includes(normalizePackagePlan(setupForm.package_plan)),
    [setupForm.package_plan]
  );
  const assignableUserRoles = useMemo(
    () => getAssignableUserRoles(setupForm.package_plan),
    [setupForm.package_plan]
  );
  const canAddBranch = useMemo(
    () => ['multi_branch', 'enterprise'].includes(normalizePackagePlan(setupForm.package_plan)),
    [setupForm.package_plan]
  );
  const addUserRoleLabel = useMemo(
    () => formatAddUserRoleLabel(userForm.role || newUserRolePreset, setupForm.industry_slug),
    [userForm.role, newUserRolePreset, setupForm.industry_slug]
  );

  const isSetupReady = Boolean(
    setupRow?.status === 'active' && setupRow?.gym_name && setupRow?.account_slug
  );

  function buildBusinessImageKeywords() {
    const verticalLabel = sentenceCase(normalizeVerticalSlug(setupForm.industry_slug, 'fitness'));
    const cityToken = String(setupForm.city || '').trim().split(/[,\s]+/)[0] || 'Indonesia';
    const keywords = [
      `${String(setupForm.gym_name || '').trim()} ${cityToken}`.trim(),
      `${verticalLabel} studio ${cityToken}`.trim(),
      `${verticalLabel} community ${cityToken}`.trim(),
      `${String(setupForm.address || '').trim()} ${verticalLabel}`.trim()
    ]
      .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
      .filter((item) => item.length >= 3);
    return [...new Set(keywords)];
  }

  async function fetchPexelsPhotos(keyword, perPage = 4) {
    const query = String(keyword || '').trim() || 'fitness studio';
    const result = await apiJson(
      `/v1/ai/pexels/search?tenant_id=${encodeURIComponent(setupForm.tenant_id || tenantSeed)}&query=${encodeURIComponent(query)}&per_page=${encodeURIComponent(perPage)}`
    );
    return Array.isArray(result.rows) ? result.rows : [];
  }

  async function aiFillBusinessGallery() {
    try {
      setAiWorking(true);
      const keywordCandidates = buildBusinessImageKeywords();
      if (keywordCandidates.length === 0) {
        throw new Error('Isi display name atau city dulu agar gambar bisnis bisa digenerate.');
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
        if (lastError) throw lastError;
        setFeedback('ai.assist: Pexels tidak menemukan gambar untuk business profile ini.');
        return;
      }
      const urls = photos
        .map((item) => item?.image_url || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      setSetupForm((prev) => ({
        ...prev,
        photo_url: urls[0] || prev.photo_url
      }));
      setFeedback(`ai.assist: Business profile image diisi dari Pexels (${keyword}).`);
    } catch (error) {
      setFeedback(error.message || 'ai.assist: Gagal mengambil gambar business profile.');
    } finally {
      setAiWorking(false);
    }
  }

  async function uploadBusinessImage(file) {
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
          tenant_id: setupForm.tenant_id || tenantSeed,
          folder: 'owner-profile',
          filename: selected.name || 'business-profile-image',
          data_url: dataUrl
        })
      });
      const imageUrl = String(uploadRes?.url || '').trim();
      if (!imageUrl) {
        throw new Error('Upload berhasil tapi URL gambar tidak tersedia.');
      }
      setSetupForm((prev) => ({ ...prev, photo_url: imageUrl }));
      setFeedback('owner.image.uploaded: Business profile image berhasil diunggah ke S3.');
    } catch (error) {
      setFeedback(error.message || 'Gagal upload business profile image.');
    }
  }

  async function refreshOwnerData(targetTenantId) {
    const activeTenant = targetTenantId || setupForm.tenant_id || tenantSeed;
    const [setupRes, saasRes, usersRes, branchesRes] = await Promise.all([
      apiJson(`/v1/owner/setup?tenant_id=${encodeURIComponent(activeTenant)}`),
      apiJson(`/v1/owner/saas?tenant_id=${encodeURIComponent(activeTenant)}`),
      apiJson(`/v1/owner/users?tenant_id=${encodeURIComponent(activeTenant)}&status=all`),
      apiJson(
        `/v1/owner/branches?tenant_id=${encodeURIComponent(activeTenant)}&status=${encodeURIComponent(branchStatusFilter)}`
      )
    ]);

    setSetupRow(setupRes.row || null);

    if (setupRes.row?.status === 'active') {
      setSetupForm((prev) => ({
        ...prev,
        gym_name: setupRes.row.gym_name || prev.gym_name,
        tenant_id: setupRes.row.tenant_id || prev.tenant_id,
        branch_id: setupRes.row.branch_id || prev.branch_id,
        account_slug: setupRes.row.account_slug || prev.account_slug,
        industry_slug: normalizeVerticalSlug(setupRes.row.industry_slug || prev.industry_slug, 'fitness'),
        address: setupRes.row.address || '',
        city: setupRes.row.city || '',
        photo_url: setupRes.row.photo_url || '',
        package_plan: normalizePackagePlan(setupRes.row.package_plan || prev.package_plan)
      }));
      setOwnerSetup({
        gym_name: setupRes.row.gym_name,
        tenant_id: setupRes.row.tenant_id,
        branch_id: setupRes.row.branch_id,
        account_slug: setupRes.row.account_slug,
        package_plan: normalizePackagePlan(setupRes.row.package_plan || setupForm.package_plan),
        industry_slug: normalizeVerticalSlug(setupRes.row.industry_slug || setupForm.industry_slug, 'fitness'),
        address: setupRes.row.address || '',
        city: setupRes.row.city || '',
        photo_url: setupRes.row.photo_url || ''
      });
    } else {
      // Prevent stale local setup from another tenant leaking into wizard mode.
      setOwnerSetup(null);
      setSetupForm((prev) => ({
        ...prev,
        tenant_id: activeTenant,
        gym_name: '',
        account_slug: '',
        branch_id: '',
        package_plan: 'free',
        industry_slug: 'fitness',
        address: '',
        city: '',
        photo_url: ''
      }));
    }

    setSaasInfo(saasRes.row || null);
    setUsers(usersRes.rows || []);
    setBranches(branchesRes.rows || []);
  }

  useEffect(() => {
    refreshOwnerData(tenantSeed).catch((error) => setFeedback(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSeed, branchStatusFilter]);

  useEffect(() => {
    if (!(IS_MOCK_MODE && IS_MOCKUP_OPEN_ACCESS)) return;
    const current = getSession();
    const currentSetup = getOwnerSetup();
    const setup = setupRow || currentSetup || null;
    const accountSlug = setup?.account_slug || current?.tenant?.account_slug || 'tn_mock';
    const tenantId = setup?.tenant_id || current?.tenant?.id || 'tn_mock';
    const branchId = setup?.branch_id || current?.branch?.id || 'br_mock_01';
    const gymName = setup?.gym_name || current?.tenant?.gym_name || 'Foremoz Organization';

    if (!current?.isAuthenticated || (current?.role || 'owner') !== 'owner') {
      setSession({
        isAuthenticated: true,
        isOnboarded: true,
        role: 'owner',
        user: {
          fullName: 'Mock Owner',
          email: 'owner@mock.foremoz.local',
          userId: 'usr_mock_owner'
        },
        tenant: {
          id: tenantId,
          account_slug: accountSlug,
          namespace: `foremoz:${tenantId}`,
          gym_name: gymName,
          package_plan: normalizePackagePlan(setup?.package_plan || setupForm.package_plan || 'free'),
          industry_slug: normalizeVerticalSlug(setup?.industry_slug || setupForm.industry_slug, 'fitness')
        },
        branch: {
          id: branchId,
          chain: `branch:${branchId}`
        },
        auth: {
          tokenType: 'Bearer',
          accessToken: 'mock-token',
          expiresIn: 86400
        }
      });
    }

    navigate(`/a/${accountSlug}/admin/dashboard`, { replace: true });
  }, [navigate, setupRow]);

  function continueToPlan() {
    const gymName = setupForm.gym_name.trim();
    const accountSlug = normalizeSlug(setupForm.account_slug || gymName);
    if (!gymName || !accountSlug) return;

    const tenantDefault = setupForm.tenant_id || `tn_${accountSlug.replace(/-/g, '_')}`;
    const branchDefault = setupForm.branch_id || `br_${accountSlug.replace(/-/g, '_')}_main`;

    setSetupForm((prev) => ({
      ...prev,
      gym_name: gymName,
      account_slug: accountSlug,
      tenant_id: tenantDefault,
      branch_id: branchDefault
    }));
    setStep(2);
  }

  async function persistSetup(payload) {
    await apiJson('/v1/owner/setup/save', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setOwnerSetup(payload);
    if (session?.isAuthenticated && (session?.role || 'owner') === 'owner') {
      setSession({
        ...session,
        isOnboarded: true,
        tenant: {
          id: payload.tenant_id,
          account_slug: payload.account_slug,
          namespace: `foremoz:${payload.tenant_id}`,
          gym_name: payload.gym_name,
          package_plan: normalizePackagePlan(payload.package_plan),
          industry_slug: normalizeVerticalSlug(payload.industry_slug, 'fitness')
        },
        branch: {
          id: payload.branch_id,
          chain: `branch:${payload.branch_id}`
        }
      });
    }
  }

  async function submitWizard(e) {
    e.preventDefault();
    if (!setupForm.gym_name || !setupForm.account_slug || !setupForm.package_plan) return;

    try {
      setLoading(true);
      const payload = {
        gym_name: setupForm.gym_name,
        tenant_id: setupForm.tenant_id,
        branch_id: setupForm.branch_id,
        account_slug: normalizeSlug(setupForm.account_slug),
        package_plan: setupForm.package_plan,
        industry_slug: normalizeVerticalSlug(setupForm.industry_slug, 'fitness'),
        address: setupForm.address,
        city: setupForm.city,
        photo_url: setupForm.photo_url
      };

      await persistSetup(payload);
      await refreshOwnerData(payload.tenant_id);
      setFeedback(
        `owner.setup.saved package ${payload.package_plan} namespace foremoz:${payload.tenant_id} chain branch:${payload.branch_id}`
      );
      setMenu('profile');
      navigate('/host/owner', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRenameGym(e) {
    e.preventDefault();
    if (!setupForm.gym_name || !setupForm.account_slug) return;

    try {
      setLoading(true);
      const payload = {
        gym_name: setupForm.gym_name,
        tenant_id: setupForm.tenant_id,
        branch_id: setupForm.branch_id,
        account_slug: setupForm.account_slug,
        package_plan: setupForm.package_plan,
        industry_slug: normalizeVerticalSlug(setupForm.industry_slug, 'fitness'),
        address: setupForm.address,
        city: setupForm.city,
        photo_url: setupForm.photo_url
      };
      await persistSetup(payload);
      await refreshOwnerData(payload.tenant_id);
      setFeedback(`owner.setup.updated gym_name ${payload.gym_name}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitBranch(e) {
    e.preventDefault();
    if (!canAddBranch) {
      setFeedback('Silahkan upgrade ke Multi-branch untuk menambah branch.');
      return;
    }
    const branchId = String(branchForm.branch_id || '').trim().toLowerCase();
    const branchName = String(branchForm.branch_name || '').trim();
    const derivedSlug = normalizeSlug(String(branchForm.account_slug || '').trim() || branchId.replace(/_/g, '-'));
    if (!branchId || !branchName || !derivedSlug) return;

    try {
      setLoading(true);
      await apiJson('/v1/owner/branches', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          branch_id: branchId,
          branch_name: branchName,
          account_slug: derivedSlug,
          address: String(branchForm.address || '').trim(),
          city: String(branchForm.city || '').trim(),
          photo_url: String(branchForm.photo_url || '').trim()
        })
      });
      setBranchForm({
        branch_id: '',
        branch_name: '',
        account_slug: '',
        address: '',
        city: '',
        photo_url: ''
      });
      setBranchMode('list');
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
      setFeedback(`owner.branch.created ${branchId} -> /a/${derivedSlug}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddBranchForm() {
    if (!canAddBranch) {
      setFeedback('Silahkan upgrade ke Multi-branch untuk menambah branch.');
      return;
    }
    setBranchMode('add');
    setEditingBranchId('');
    setBranchForm({
      branch_id: '',
      branch_name: '',
      account_slug: '',
      address: '',
      city: '',
      photo_url: ''
    });
  }

  function openEditBranchForm(row) {
    setEditingBranchId(String(row?.branch_id || ''));
    setBranchForm({
      branch_id: String(row?.branch_id || ''),
      branch_name: String(row?.branch_name || ''),
      account_slug: String(row?.account_slug || ''),
      address: String(row?.address || ''),
      city: String(row?.city || ''),
      photo_url: String(row?.photo_url || '')
    });
    setBranchMode('edit');
  }

  async function submitEditBranch(e) {
    e.preventDefault();
    const branchId = String(editingBranchId || branchForm.branch_id || '').trim().toLowerCase();
    const branchName = String(branchForm.branch_name || '').trim();
    const accountSlug = normalizeSlug(String(branchForm.account_slug || '').trim());
    if (!branchId || !branchName || !accountSlug) return;

    try {
      setLoading(true);
      await apiJson(`/v1/owner/branches/${encodeURIComponent(branchId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          branch_name: branchName,
          account_slug: accountSlug,
          address: String(branchForm.address || '').trim(),
          city: String(branchForm.city || '').trim(),
          photo_url: String(branchForm.photo_url || '').trim()
        })
      });
      setBranchMode('list');
      setEditingBranchId('');
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
      setFeedback(`owner.branch.updated ${branchId}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deactivateBranch(row) {
    const branchId = String(row?.branch_id || '').trim().toLowerCase();
    if (!branchId) return;
    const confirmed = window.confirm(`Deactivate branch "${branchId}"? Branch tidak akan muncul di URL publik.`);
    if (!confirmed) return;
    try {
      setLoading(true);
      await apiJson(`/v1/owner/branches/${encodeURIComponent(branchId)}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed
        })
      });
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
      setFeedback(`owner.branch.deactivated ${branchId}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reactivateBranch(row) {
    const branchId = String(row?.branch_id || '').trim().toLowerCase();
    if (!branchId) return;
    try {
      setLoading(true);
      await apiJson(`/v1/owner/branches/${encodeURIComponent(branchId)}/reactivate`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed
        })
      });
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
      setFeedback(`owner.branch.reactivated ${branchId}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitSaas(e) {
    e.preventDefault();
    if (setupForm.package_plan === 'free') {
      setFeedback('Paket free tidak memerlukan perpanjangan.');
      return;
    }
    try {
      setLoading(true);
      await apiJson('/v1/owner/saas/extend', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          months: Number(saasForm.months),
          note: saasForm.note
        })
      });
      setFeedback(`owner.saas.extended +${saasForm.months} month(s)`);
      setSaasForm({ months: '1', note: '' });
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function changePackage(e) {
    e.preventDefault();
    if (setupForm.package_plan === 'enterprise') {
      setFeedback('Paket enterprise diajukan lewat request form.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        gym_name: setupForm.gym_name,
        tenant_id: setupForm.tenant_id,
        branch_id: setupForm.branch_id,
        account_slug: setupForm.account_slug,
        package_plan: setupForm.package_plan,
        industry_slug: normalizeVerticalSlug(setupForm.industry_slug, 'fitness'),
        address: setupForm.address,
        city: setupForm.city,
        photo_url: setupForm.photo_url
      };
      await persistSetup(payload);
      await refreshOwnerData(payload.tenant_id);
      setFeedback(`owner.package.changed ${payload.package_plan}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  function sendEnterpriseRequest() {
    if (!enterpriseRequest.requester_name || !enterpriseRequest.requester_email || !enterpriseRequest.requirement) {
      setFeedback('Lengkapi requester_name, requester_email, dan requirement.');
      return;
    }

    const tenantId = setupForm.tenant_id || tenantSeed;
    const subject = `[Enterprise Request] ${setupForm.gym_name || '-'} (${tenantId})`;
    const body = [
      `tenant_id: ${tenantId}`,
      `account_slug: ${setupForm.account_slug || '-'}`,
      `gym_name: ${setupForm.gym_name || '-'}`,
      `requester_name: ${enterpriseRequest.requester_name}`,
      `requester_email: ${enterpriseRequest.requester_email}`,
      `phone: ${enterpriseRequest.phone || '-'}`,
      `company_name: ${enterpriseRequest.company_name || '-'}`,
      `location_count: ${enterpriseRequest.location_count || '-'}`,
      '',
      'requirement:',
      enterpriseRequest.requirement
    ].join('\n');

    const mailto = `mailto:${ENTERPRISE_REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setFeedback(`enterprise.request.sent to ${ENTERPRISE_REQUEST_EMAIL}`);
  }

  async function activateStarterTrialFromAddUser() {
    const agreeTrial = window.confirm('Paket Free hanya 1 user admin. Kamu mau trial 1 bulan untuk upgrade ke Starter?');
    if (!agreeTrial) {
      setFeedback('Tambah user dibatalkan. Aktifkan trial Starter untuk menambah user.');
      return false;
    }

    const upgradePayload = {
      gym_name: setupForm.gym_name,
      tenant_id: setupForm.tenant_id,
      branch_id: setupForm.branch_id,
      account_slug: setupForm.account_slug,
      package_plan: 'starter',
      industry_slug: normalizeVerticalSlug(setupForm.industry_slug, 'fitness'),
      address: setupForm.address,
      city: setupForm.city,
      photo_url: setupForm.photo_url
    };

    await persistSetup(upgradePayload);
    try {
      await apiJson('/v1/owner/saas/extend', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          months: 1,
          note: 'starter trial from add user'
        })
      });
    } catch {
      // optional in case backend does not support trial extension yet
    }
    await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    setSetupForm((p) => ({ ...p, package_plan: 'starter' }));
    setFeedback('Starter trial 1 bulan aktif. Lanjut tambah user.');
    return true;
  }

  async function openAddUserForm(targetRole = 'cs') {
    try {
      setLoading(true);
      if (setupForm.package_plan === 'free') {
        const upgraded = await activateStarterTrialFromAddUser();
        if (!upgraded) return;
      }
      const allowedRoles = getAssignableUserRoles(setupForm.package_plan);
      const safeRole = allowedRoles.includes(targetRole) ? targetRole : (allowedRoles[0] || 'cs');
      setNewUserRolePreset(safeRole);
      setUserForm({ ...createEmptyUserForm(), role: safeRole });
      setUserMode('add');
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openPresetAddUser(preset) {
    const normalized = String(preset || '').trim().toLowerCase();
    if (normalized === 'cs') {
      await openAddUserForm('cs');
      return;
    }
    if (!isGrowthOrAbove) {
      setFeedback(`Silahkan upgrade ke Growth untuk menambah ${creatorLabel} atau Influencer/Sales.`);
      return;
    }
    if (normalized === 'coach' || normalized === 'pt') {
      await openAddUserForm('pt');
      return;
    }
    await openAddUserForm('sales');
  }

  async function submitUser(e) {
    e.preventDefault();
    const effectiveRole = String(userForm.role || newUserRolePreset || '').trim().toLowerCase();
    if (!userForm.full_name || !userForm.email || !userForm.password || !effectiveRole) return;

    try {
      setLoading(true);
      if (setupForm.package_plan === 'free') {
        const upgraded = await activateStarterTrialFromAddUser();
        if (!upgraded) {
          return;
        }
      }
      const allowedRoles = getAssignableUserRoles(setupForm.package_plan);
      if (!allowedRoles.includes(effectiveRole)) {
        setFeedback(`Role ${effectiveRole} tidak tersedia untuk paket ${normalizePackagePlan(setupForm.package_plan)}.`);
        return;
      }

      const result = await apiJson('/v1/owner/users', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          full_name: userForm.full_name,
          email: userForm.email,
          role: effectiveRole,
          password: userForm.password
        })
      });
      setFeedback(formatActivationFeedback(result, userForm.full_name));
      setUserForm(createEmptyUserForm());
      setUserMode('list');
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  function startEditUser(user) {
    const allowedRoles = getAssignableUserRoles(setupForm.package_plan);
    const normalizedUserRole = String(user.role || '').trim().toLowerCase();
    const nextRole = normalizedUserRole === 'owner'
      ? 'owner'
      : (allowedRoles.includes(normalizedUserRole) ? normalizedUserRole : (allowedRoles[0] || 'cs'));
    setEditingUserId(user.user_id);
    setEditingUser({ full_name: user.full_name || '', role: nextRole });
  }

  async function saveEditUser(userId) {
    try {
      setLoading(true);
      const currentUser = users.find((item) => String(item.user_id) === String(userId));
      const isOwnerUser = String(currentUser?.role || '').trim().toLowerCase() === 'owner';
      const allowedRoles = getAssignableUserRoles(setupForm.package_plan);
      if (isOwnerUser && String(editingUser.role || '').trim().toLowerCase() !== 'owner') {
        setFeedback('Role owner tidak bisa diubah ke role lain.');
        return;
      }
      if (!isOwnerUser && !allowedRoles.includes(editingUser.role)) {
        setFeedback(`Role ${editingUser.role} tidak tersedia untuk paket ${normalizePackagePlan(setupForm.package_plan)}.`);
        return;
      }
      await apiJson(`/v1/owner/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          full_name: editingUser.full_name,
          role: editingUser.role
        })
      });
      setEditingUserId('');
      setFeedback(`owner.user.updated ${userId}`);
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId) {
    try {
      setLoading(true);
      const currentUser = users.find((item) => String(item.user_id) === String(userId));
      const isOwnerUser = String(currentUser?.role || '').trim().toLowerCase() === 'owner';
      if (isOwnerUser) {
        setFeedback('User owner tidak bisa dihapus.');
        return;
      }
      await apiJson(`/v1/owner/users/${encodeURIComponent(userId)}?tenant_id=${encodeURIComponent(setupForm.tenant_id || tenantSeed)}`, {
        method: 'DELETE'
      });
      setFeedback(`owner.user.deleted ${userId}`);
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendUserActivation(user) {
    try {
      setLoading(true);
      const result = await apiJson('/v1/tenant/auth/activation/resend', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: setupForm.tenant_id || tenantSeed,
          email: user.email
        })
      });
      if (result.already_active) {
        setFeedback(`Akun ${user.email} sudah aktif.`);
      } else {
        if (result?.email_delivery?.sent) {
          setFeedback(`Activation email dikirim ulang ke ${user.email}.`);
        } else if (result?.activation?.activation_url) {
          setFeedback(`Email belum terkirim dari server ini. Gunakan activation link manual: ${result.activation.activation_url}`);
        } else {
          setFeedback(`Activation user ${user.email} sudah di-refresh.`);
        }
      }
      await refreshOwnerData(setupForm.tenant_id || tenantSeed);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearSession();
    navigate('/host', { replace: true });
  }

  async function deleteAccountPermanently(e) {
    e.preventDefault();
    try {
      setLoading(true);
      const tenantId = setupForm.tenant_id || tenantSeed;
      await apiJson('/v1/owner/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          confirm_text: dangerConfirm
        })
      });
      clearSession();
      setOwnerSetup(null);
      setFeedback(`owner.account.deleted ${tenantId}`);
      navigate('/host', { replace: true });
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="dash-head card">
        <div>
          <p className="eyebrow">Web Owner</p>
          <h1>{isSetupReady ? 'Owner control panel' : 'Owner setup'}</h1>
          <p>
            {isSetupReady
              ? 'Kelola tenant per topik: profile, package, dan user.'
              : 'Lengkapi nama bisnis/organisasi dan slug akun sebelum masuk control panel.'}
          </p>
        </div>
        <div className="meta">
          {isSetupReady ? (
            <button
              className="btn ghost"
              onClick={() => openDashboardInNewTab(setupForm.account_slug)}
            >
              Jump to dashboard
            </button>
          ) : null}
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {!isSetupReady ? (
        <section className="card wide wizard" style={{ marginTop: '1rem' }}>
          <div className="wizard-steps">
            <span className={step === 1 ? 'active' : ''}>1. Penamaan</span>
            <span className={step === 2 ? 'active' : ''}>2. Paket</span>
          </div>

          {step === 1 ? (
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Profil tenant</h2>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  continueToPlan();
                }}
              >
                <label>
                  Nama bisnis / organisasi
                  <input
                    placeholder="Contoh: Foremoz Fitness Cilandak"
                    value={setupForm.gym_name}
                    onChange={(e) => setSetupForm((p) => ({ ...p, gym_name: e.target.value }))}
                  />
                </label>
                <label>
                  Industry
                  <select
                    value={setupForm.industry_slug}
                    onChange={(e) => setSetupForm((p) => ({ ...p, industry_slug: e.target.value }))}
                  >
                    {verticalOptions.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Account slug
                  <input
                    placeholder="contoh: foremoz-cilandak"
                    value={setupForm.account_slug}
                    onChange={(e) => setSetupForm((p) => ({ ...p, account_slug: normalizeSlug(e.target.value) }))}
                  />
                </label>
                <button className="btn" type="submit" disabled={loading}>Lanjut pilih paket</button>
              </form>
            </div>
          ) : (
            <form className="form" onSubmit={submitWizard}>
              <p className="eyebrow">Step 2</p>
              <h2>Pilih paket</h2>
              <div className="plan-grid">
                {PLANS.map((plan) => (
                  <button
                    type="button"
                    key={plan.key}
                    className={`plan-card ${setupForm.package_plan === plan.key ? 'selected' : ''}`}
                    onClick={() => setSetupForm((p) => ({ ...p, package_plan: plan.key }))}
                  >
                    <strong>{plan.name}</strong>
                    <p>{plan.price}</p>
                    <small>{plan.note}</small>
                  </button>
                ))}
              </div>
              {setupForm.package_plan === 'enterprise' ? (
                <>
                  <p className="eyebrow">Enterprise Request Form</p>
                  <label>
                    requester_name
                    <input
                      value={enterpriseRequest.requester_name}
                      onChange={(e) => setEnterpriseRequest((p) => ({ ...p, requester_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    requester_email
                    <input
                      type="email"
                      value={enterpriseRequest.requester_email}
                      onChange={(e) => setEnterpriseRequest((p) => ({ ...p, requester_email: e.target.value }))}
                    />
                  </label>
                  <label>
                    phone
                    <input
                      value={enterpriseRequest.phone}
                      onChange={(e) => setEnterpriseRequest((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </label>
                  <label>
                    company_name
                    <input
                      value={enterpriseRequest.company_name}
                      onChange={(e) => setEnterpriseRequest((p) => ({ ...p, company_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    location_count
                    <input
                      type="number"
                      min="1"
                      value={enterpriseRequest.location_count}
                      onChange={(e) => setEnterpriseRequest((p) => ({ ...p, location_count: e.target.value }))}
                    />
                  </label>
                  <label>
                    requirement
                    <textarea
                      rows={4}
                      value={enterpriseRequest.requirement}
                      onChange={(e) => setEnterpriseRequest((p) => ({ ...p, requirement: e.target.value }))}
                    />
                  </label>
                </>
              ) : null}
              <div className="member-actions">
                <button className="btn ghost" type="button" onClick={() => setStep(1)} disabled={loading}>Kembali</button>
                {setupForm.package_plan === 'enterprise' ? (
                  <button className="btn" type="button" onClick={sendEnterpriseRequest}>
                    Kirim request enterprise
                  </button>
                ) : (
                  <button className="btn" type="submit" disabled={loading}>Simpan setup</button>
                )}
              </div>
            </form>
          )}
        </section>
      ) : (
        <section className="workspace" style={{ marginTop: '1rem' }}>
          <aside className="sidebar card">
            <p className="eyebrow">Owner Menu</p>
            <button className={`side-item ${menu === 'profile' ? 'active' : ''}`} onClick={() => setMenu('profile')}>
              Business profile
            </button>
            <button
              className={`side-item ${menu === 'branch' ? 'active' : ''}`}
              onClick={() => {
                setMenu('branch');
                setBranchMode('list');
              }}
            >
              Branch
            </button>
            <button className={`side-item ${menu === 'package' ? 'active' : ''}`} onClick={() => setMenu('package')}>
              Paket dan SaaS
            </button>
            <button
              className={`side-item ${menu === 'users' ? 'active' : ''}`}
              onClick={() => {
                setMenu('users');
                setUserMode('list');
              }}
            >
              User access
            </button>
            <button className={`side-item ${menu === 'danger' ? 'active' : ''}`} onClick={() => setMenu('danger')}>
              Danger zone
            </button>
          </aside>

          <article className="card admin-panel" style={{ flex: 1 }}>
            {menu === 'profile' ? (
              <>
                <p className="eyebrow">Business Profile</p>
                <h2>Perbarui nama bisnis / organisasi</h2>
                <form className="form" onSubmit={submitRenameGym}>
                  <label>
                    display_name
                    <input value={setupForm.gym_name} onChange={(e) => setSetupForm((p) => ({ ...p, gym_name: e.target.value }))} />
                  </label>
                  <label>
                    address
                    <input value={setupForm.address} onChange={(e) => setSetupForm((p) => ({ ...p, address: e.target.value }))} />
                  </label>
                  <label>
                    city
                    <input value={setupForm.city} onChange={(e) => setSetupForm((p) => ({ ...p, city: e.target.value }))} />
                  </label>
                  <label>
                    photo_url
                    <input
                      type="url"
                      placeholder="https://..."
                      value={setupForm.photo_url}
                      onChange={(e) => setSetupForm((p) => ({ ...p, photo_url: e.target.value }))}
                    />
                  </label>
                  <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => businessImageInputRef.current?.click()}
                    >
                      Upload Image
                    </button>
                    <input
                      ref={businessImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          uploadBusinessImage(file);
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      className="btn ghost small"
                      type="button"
                      disabled={aiWorking}
                      onClick={aiFillBusinessGallery}
                    >
                      AI Fill Gallery
                    </button>
                  </div>
                  {setupForm.photo_url ? (
                    <div className="photo-preview-box">
                      <img
                        src={setupForm.photo_url}
                        alt="Business preview"
                        className="photo-preview-image"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <label>
                    account_slug (read only)
                    <input value={setupForm.account_slug} disabled readOnly />
                  </label>
                  <div className="member-actions">
                    <button className="btn" type="submit" disabled={loading}>Save profile</button>
                  </div>
                </form>
              </>
            ) : null}

            {menu === 'branch' ? (
              <>
                <p className="eyebrow">Branch</p>
                {branchMode === 'list' ? (
                  <>
                    <div className="panel-head">
                      <h2>Branch list</h2>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={branchStatusFilter}
                          onChange={(e) => setBranchStatusFilter(String(e.target.value || 'active'))}
                          disabled={loading}
                          aria-label="branch status filter"
                        >
                          <option value="active">Status: Active</option>
                          <option value="all">Status: All</option>
                          <option value="inactive">Status: Inactive</option>
                        </select>
                        <button className="btn" type="button" onClick={openAddBranchForm} disabled={loading}>
                          Add branch
                        </button>
                      </div>
                    </div>
                    <p className="mini-note">Setiap branch punya URL sendiri: /a/&lt;branch-account&gt;</p>
                    {!canAddBranch ? (
                      <p className="mini-note">Silahkan upgrade ke Multi-branch untuk menambah branch.</p>
                    ) : null}
                    <div className="entity-list">
                      {branches.map((row) => (
                        <div className="entity-row" key={`${row.tenant_id || 'tn'}:${row.branch_id}`}>
                          <div>
                            <strong>{row.branch_name || row.branch_id}</strong>
                            <p>
                              {row.branch_id} - /a/{row.account_slug} {row.is_primary ? '(Primary)' : ''} [{row.status || 'active'}]
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!row.is_primary ? (
                              <button className="btn ghost" type="button" onClick={() => openEditBranchForm(row)} disabled={loading}>
                                Edit
                              </button>
                            ) : null}
                            {!row.is_primary && String(row.status || '').toLowerCase() === 'active' ? (
                              <button className="btn ghost" type="button" onClick={() => deactivateBranch(row)} disabled={loading}>
                                Deactivate
                              </button>
                            ) : null}
                            {!row.is_primary && String(row.status || '').toLowerCase() === 'inactive' ? (
                              <button className="btn ghost" type="button" onClick={() => reactivateBranch(row)} disabled={loading}>
                                Reactivate
                              </button>
                            ) : null}
                            <a className="btn ghost" href={`/a/${row.account_slug}`} target="_blank" rel="noreferrer">
                              Open public
                            </a>
                            <a className="btn ghost" href={`/a/${row.account_slug}/admin/dashboard`} target="_blank" rel="noreferrer">
                              Open dashboard
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : branchMode === 'add' ? (
                  <form className="form" onSubmit={submitBranch}>
                    <div className="panel-head">
                      <h2>Add branch</h2>
                      <button className="btn ghost" type="button" onClick={() => setBranchMode('list')} disabled={loading}>
                        Back to list
                      </button>
                    </div>
                    <label>
                      branch_id
                      <input
                        value={branchForm.branch_id}
                        onChange={(e) => setBranchForm((p) => ({ ...p, branch_id: String(e.target.value || '').trim().toLowerCase() }))}
                        placeholder="contoh: br_jkt_selatan"
                      />
                    </label>
                    <label>
                      branch_name
                      <input
                        value={branchForm.branch_name}
                        onChange={(e) => setBranchForm((p) => ({ ...p, branch_name: e.target.value }))}
                        placeholder="contoh: Jakarta Selatan"
                      />
                    </label>
                    <label>
                      branch_account_slug
                      <input
                        value={branchForm.account_slug}
                        onChange={(e) => setBranchForm((p) => ({ ...p, account_slug: normalizeSlug(e.target.value) }))}
                        placeholder="contoh: jaksel-main"
                      />
                    </label>
                    <label>
                      address
                      <input
                        value={branchForm.address}
                        onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))}
                        placeholder="contoh: Jl. TB Simatupang No. 8"
                      />
                    </label>
                    <label>
                      city
                      <input
                        value={branchForm.city}
                        onChange={(e) => setBranchForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="contoh: Jakarta Selatan"
                      />
                    </label>
                    <label>
                      photo_url
                      <input
                        type="url"
                        value={branchForm.photo_url}
                        onChange={(e) => setBranchForm((p) => ({ ...p, photo_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                    <p className="mini-note">
                      URL branch: /a/{normalizeSlug((branchForm.account_slug || branchForm.branch_id || '').replace(/_/g, '-')) || '-'}
                    </p>
                    <button className="btn" type="submit" disabled={loading}>
                      Add branch
                    </button>
                  </form>
                ) : (
                  <form className="form" onSubmit={submitEditBranch}>
                    <div className="panel-head">
                      <h2>Edit branch</h2>
                      <button className="btn ghost" type="button" onClick={() => setBranchMode('list')} disabled={loading}>
                        Back to list
                      </button>
                    </div>
                    <label>
                      branch_id (read only)
                      <input value={branchForm.branch_id} disabled readOnly />
                    </label>
                    <label>
                      branch_name
                      <input
                        value={branchForm.branch_name}
                        onChange={(e) => setBranchForm((p) => ({ ...p, branch_name: e.target.value }))}
                      />
                    </label>
                    <label>
                      branch_account_slug
                      <input
                        value={branchForm.account_slug}
                        onChange={(e) => setBranchForm((p) => ({ ...p, account_slug: normalizeSlug(e.target.value) }))}
                      />
                    </label>
                    <label>
                      address
                      <input
                        value={branchForm.address}
                        onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))}
                      />
                    </label>
                    <label>
                      city
                      <input
                        value={branchForm.city}
                        onChange={(e) => setBranchForm((p) => ({ ...p, city: e.target.value }))}
                      />
                    </label>
                    <label>
                      photo_url
                      <input
                        type="url"
                        value={branchForm.photo_url}
                        onChange={(e) => setBranchForm((p) => ({ ...p, photo_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                    <button className="btn" type="submit" disabled={loading}>
                      Save branch
                    </button>
                  </form>
                )}
              </>
            ) : null}

            {menu === 'package' ? (
              <>
                <p className="eyebrow">Paket dan SaaS</p>
                <h2>Paket</h2>
                {saasInfo ? <p className="feedback">Total extended months: {saasInfo.total_months || 0}</p> : null}
                <p className="muted">Current package: {setupForm.package_plan}</p>
                {setupForm.package_plan === 'free' ? (
                  <p className="feedback">
                    Paket free aktif, jadi tidak perlu perpanjangan.
                  </p>
                ) : (
                  <form className="form" onSubmit={submitSaas}>
                    <label>
                      tambah_bulan
                      <select value={saasForm.months} onChange={(e) => setSaasForm((p) => ({ ...p, months: e.target.value }))}>
                        <option value="1">1</option>
                        <option value="3">3</option>
                        <option value="6">6</option>
                        <option value="12">12</option>
                      </select>
                    </label>
                    <label>
                      note
                      <input value={saasForm.note} onChange={(e) => setSaasForm((p) => ({ ...p, note: e.target.value }))} />
                    </label>
                    <p className="feedback">
                      Harga perpanjang {selectedMonths} bulan: {formatIdr(extendTotalPrice)}
                    </p>
                    <button className="btn" type="submit" disabled={loading}>Perpanjang</button>
                  </form>
                )}
                <form className="form" onSubmit={changePackage}>
                  <p className="eyebrow">Change package</p>
                  <div className="plan-grid">
                    {PLANS.map((plan) => (
                      <button
                        type="button"
                        key={plan.key}
                        className={`plan-card ${setupForm.package_plan === plan.key ? 'selected' : ''}`}
                        onClick={() => setSetupForm((p) => ({ ...p, package_plan: plan.key }))}
                      >
                        <strong>{plan.name}</strong>
                        <p>{plan.price}</p>
                        <small>{plan.note}</small>
                      </button>
                    ))}
                  </div>
                  {setupForm.package_plan === 'enterprise' ? (
                    <>
                      <p className="eyebrow">Enterprise Request Form</p>
                      <label>
                        requester_name
                        <input
                          value={enterpriseRequest.requester_name}
                          onChange={(e) => setEnterpriseRequest((p) => ({ ...p, requester_name: e.target.value }))}
                        />
                      </label>
                      <label>
                        requester_email
                        <input
                          type="email"
                          value={enterpriseRequest.requester_email}
                          onChange={(e) => setEnterpriseRequest((p) => ({ ...p, requester_email: e.target.value }))}
                        />
                      </label>
                      <label>
                        phone
                        <input
                          value={enterpriseRequest.phone}
                          onChange={(e) => setEnterpriseRequest((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </label>
                      <label>
                        company_name
                        <input
                          value={enterpriseRequest.company_name}
                          onChange={(e) => setEnterpriseRequest((p) => ({ ...p, company_name: e.target.value }))}
                        />
                      </label>
                      <label>
                        location_count
                        <input
                          type="number"
                          min="1"
                          value={enterpriseRequest.location_count}
                          onChange={(e) => setEnterpriseRequest((p) => ({ ...p, location_count: e.target.value }))}
                        />
                      </label>
                      <label>
                        requirement
                        <textarea
                          rows={4}
                          value={enterpriseRequest.requirement}
                          onChange={(e) => setEnterpriseRequest((p) => ({ ...p, requirement: e.target.value }))}
                        />
                      </label>
                      <button className="btn" type="button" onClick={sendEnterpriseRequest}>
                        Kirim request enterprise
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="feedback">
                        Harga paket terpilih: {formatIdr(selectedPlanMonthlyPrice)} / bulan
                      </p>
                      <button className="btn" type="submit" disabled={loading}>Change paket</button>
                    </>
                  )}
                </form>
              </>
            ) : null}

            {menu === 'users' ? (
              <>
                <p className="eyebrow">User access</p>
                {userMode === 'list' ? (
                  <>
                    <div className="panel-head">
                      <h2>Add/edit/delete user</h2>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => openPresetAddUser('cs')}
                          disabled={loading}
                        >
                          Add CS
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => openPresetAddUser('pt')}
                          disabled={loading}
                        >
                          {`Add ${creatorLabel}`}
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => openPresetAddUser('sales')}
                          disabled={loading}
                        >
                          Add Influencer/Sales
                        </button>
                      </div>
                    </div>
                    <div className="entity-list">
                      {users.map((u) => (
                        <div className="entity-row" key={u.user_id}>
                          <div>
                            {editingUserId === u.user_id ? (
                              <>
                                <input value={editingUser.full_name} onChange={(e) => setEditingUser((p) => ({ ...p, full_name: e.target.value }))} />
                                {String(u.role || '').trim().toLowerCase() === 'owner' ? (
                                  <input value="owner" disabled readOnly />
                                ) : (
                                  <select value={editingUser.role} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}>
                                    {assignableUserRoles.map((role) => (
                                      <option key={role} value={role}>{role}</option>
                                    ))}
                                  </select>
                                )}
                              </>
                            ) : (
                              <>
                                <strong>{u.full_name}</strong>
                                <p>{u.email} - {u.role} [{u.status || 'active'}]</p>
                              </>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {editingUserId !== u.user_id && String(u.status || '').trim().toLowerCase() === 'pending_activation' ? (
                              <button className="btn ghost" onClick={() => resendUserActivation(u)} disabled={loading}>
                                Resend activation
                              </button>
                            ) : null}
                            {editingUserId === u.user_id ? (
                              <button className="btn" onClick={() => saveEditUser(u.user_id)} disabled={loading}>Save</button>
                            ) : (
                              <button className="btn ghost" onClick={() => startEditUser(u)} disabled={loading}>Edit</button>
                            )}
                            <button
                              className="btn ghost"
                              onClick={() => deleteUser(u.user_id)}
                              disabled={loading || String(u.role || '').trim().toLowerCase() === 'owner'}
                              title={String(u.role || '').trim().toLowerCase() === 'owner' ? 'Owner tidak bisa dihapus' : ''}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel-head">
                      <h2>{`Add ${addUserRoleLabel}`}</h2>
                      <button className="btn ghost" type="button" onClick={() => setUserMode('list')} disabled={loading}>
                        Back to list
                      </button>
                    </div>
                    <form className="form" autoComplete="off" onSubmit={submitUser}>
                      <p className="mini-note">User baru akan masuk status pending activation sampai verifikasi email selesai.</p>
                      <label>
                        full_name
                        <input value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} />
                      </label>
                      <label>
                        email
                        <input type="email" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
                      </label>
                      <label>
                        password
                        <input type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
                      </label>
                      <p className="mini-note">
                        Role user: {String(userForm.role || newUserRolePreset || '-').toUpperCase()}
                      </p>
                      <button className="btn" type="submit" disabled={loading}>Add user</button>
                    </form>
                  </>
                )}
              </>
            ) : null}

            {menu === 'danger' ? (
              <>
                <p className="eyebrow">Danger zone</p>
                <h2>Delete account permanently</h2>
                <p className="error">
                  Ini akan menghapus seluruh data tenant (event stream + read model) dan tidak bisa di-undo.
                </p>
                <form className="form" onSubmit={deleteAccountPermanently}>
                  <label>
                    Type exactly: DELETE {setupForm.tenant_id || tenantSeed}
                    <input
                      value={dangerConfirm}
                      onChange={(e) => setDangerConfirm(e.target.value)}
                      placeholder={`DELETE ${setupForm.tenant_id || tenantSeed}`}
                    />
                  </label>
                  <button className="btn ghost" type="submit" disabled={loading}>
                    Delete account permanently
                  </button>
                </form>
              </>
            ) : null}
          </article>
        </section>
      )}

      {feedback ? <p className="feedback">{feedback}</p> : null}

      <footer className="dash-foot">
        <Link to="/host">Back to host landing</Link>
      </footer>
    </main>
  );
}
