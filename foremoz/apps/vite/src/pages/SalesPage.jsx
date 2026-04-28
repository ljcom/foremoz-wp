import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSalesWorkspaceConfig } from '../config/app-config.js';
import { apiJson, clearSession, getAccountSlug, getAllowedEnvironments, getEnvironmentLabel, getSession } from '../lib.js';
import {
  formatAppDateTime,
  getAppDateKey,
  getAppDateTimeInputValue,
  toAppIsoFromDateTimeInput
} from '../time.js';

const SALES_WORKSPACE_CONFIG = getSalesWorkspaceConfig();
const SALES_WORKSPACE_COPY = SALES_WORKSPACE_CONFIG.copy || {};
const SALES_NAV_ITEMS = Array.isArray(SALES_WORKSPACE_CONFIG.navItems) ? SALES_WORKSPACE_CONFIG.navItems : [];
const SALES_QUICK_GUIDE = Array.isArray(SALES_WORKSPACE_CONFIG.quickGuide) ? SALES_WORKSPACE_CONFIG.quickGuide : [];
const SALES_STAGE_FILTERS = Array.isArray(SALES_WORKSPACE_CONFIG.stageFilters) ? SALES_WORKSPACE_CONFIG.stageFilters : [];

function salesCopy(key, fallback = '', vars = {}) {
  const template = String(SALES_WORKSPACE_COPY[key] || fallback || '');
  return template.replace(/\{(\w+)\}/g, (_, varKey) => String(vars[varKey] ?? ''));
}

function Stat({ label, value, iconClass, tone, hint }) {
  return (
    <article className={`stat ${tone}`}>
      <div className="stat-top">
        <p>{label}</p>
        <span className="stat-icon" aria-hidden="true">
          <i className={iconClass} />
        </span>
      </div>
      <div className="stat-value-row">
        <h3>{value}</h3>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function parseCustomFieldsInput(raw, label) {
  const source = String(raw || '').trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} custom_fields must be JSON object`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields is invalid JSON object`);
  }
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function createSalesOrderForm() {
  return {
    order_type: 'package',
    target_key: '',
    label: '',
    qty: '1',
    unit_price: '',
    payment_route: 'member_self',
    payment_method: 'virtual_account',
    notes: ''
  };
}

function normalizeSalesOrderType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['package', 'event', 'class', 'product', 'manual'].includes(normalized)) return normalized;
  return 'package';
}

function createSalesOrderTarget(item, type) {
  if (!item) return null;
  if (type === 'package') {
    return {
      key: `package:${item.package_id}`,
      reference_type: 'package',
      reference_id: item.package_id,
      order_label: item.package_name || item.package_id,
      unit_price: Number(item.price || 0),
      hint: item.package_type || 'package'
    };
  }
  if (type === 'event') {
    return {
      key: `event:${item.event_id}`,
      reference_type: 'event',
      reference_id: item.event_id,
      order_label: item.event_name || item.title || item.event_id,
      unit_price: Number(item.price || item.ticket_price || 0),
      hint: item.start_at || ''
    };
  }
  if (type === 'class') {
    return {
      key: `class:${item.class_id}`,
      reference_type: 'class',
      reference_id: item.class_id,
      order_label: item.class_name || item.title || item.class_id,
      unit_price: Number(item.price || item.amount || 0),
      hint: item.class_type || 'class'
    };
  }
  if (type === 'product') {
    return {
      key: `product:${item.product_id}`,
      reference_type: 'product',
      reference_id: item.product_id,
      order_label: item.product_name || item.product_id,
      unit_price: Number(item.price || 0),
      hint: item.category || 'product'
    };
  }
  return null;
}

function resolveSalesPaymentMethodOptions(paymentRoute) {
  if (String(paymentRoute || '').trim().toLowerCase() === 'cs_assisted') {
    return ['cash', 'qris', 'debit_card', 'bank_transfer'];
  }
  return ['virtual_account', 'bank_transfer', 'ewallet', 'qris', 'credit_card', 'debit_card'];
}

export default function SalesPage() {
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'sales').toLowerCase();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const userId = session?.user?.userId || null;
  const [targetEnv, setTargetEnv] = useState('sales');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedProspectId, setSelectedProspectId] = useState('');
  const [selected, setSelected] = useState([]);
  const [items, setItems] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [packageRows, setPackageRows] = useState([]);
  const [eventRows, setEventRows] = useState([]);
  const [classRows, setClassRows] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [timelineRows, setTimelineRows] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [prospectDrawerOpen, setProspectDrawerOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    source: 'walkin',
    notes: '',
    next_followup_at: '',
    custom_fields_text: ''
  });
  const [followupForm, setFollowupForm] = useState({
    notes: '',
    stage: 'followup',
    next_followup_at: '',
    custom_fields_text: ''
  });
  const [convertForm, setConvertForm] = useState({
    create_member: true,
    converted_member_id: '',
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    notes: '',
    custom_fields_text: ''
  });
  const [orderForm, setOrderForm] = useState(createSalesOrderForm);

  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);

  const selectedProspect = useMemo(
    () => items.find((item) => String(item.prospect_id || '') === String(selectedProspectId || '')) || null,
    [items, selectedProspectId]
  );
  const salesOrderSummary = useMemo(() => {
    const paidOrders = orderRows.filter((item) => String(item.payment_status || '').toLowerCase() === 'confirmed');
    const pendingOrders = orderRows.filter((item) => String(item.payment_status || '').toLowerCase() === 'pending');
    return {
      totalOrders: orderRows.length,
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      paidAmount: paidOrders.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
      pendingAmount: pendingOrders.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
    };
  }, [orderRows]);
  const selectedProspectOrders = useMemo(
    () => orderRows.filter((item) => String(item.prospect_id || '') === String(selectedProspectId || '')),
    [orderRows, selectedProspectId]
  );
  const packageTargets = useMemo(
    () => packageRows.map((item) => createSalesOrderTarget(item, 'package')).filter(Boolean),
    [packageRows]
  );
  const eventTargets = useMemo(
    () => eventRows.map((item) => createSalesOrderTarget(item, 'event')).filter(Boolean),
    [eventRows]
  );
  const classTargets = useMemo(
    () => classRows.map((item) => createSalesOrderTarget(item, 'class')).filter(Boolean),
    [classRows]
  );
  const productTargets = useMemo(
    () => productRows.map((item) => createSalesOrderTarget(item, 'product')).filter(Boolean),
    [productRows]
  );
  const currentOrderTargets = useMemo(() => {
    const orderType = normalizeSalesOrderType(orderForm.order_type);
    if (orderType === 'event') return eventTargets;
    if (orderType === 'class') return classTargets;
    if (orderType === 'product') return productTargets;
    if (orderType === 'manual') return [];
    return packageTargets;
  }, [orderForm.order_type, packageTargets, eventTargets, classTargets, productTargets]);
  const selectedOrderTarget = useMemo(
    () => currentOrderTargets.find((item) => item.key === orderForm.target_key) || null,
    [currentOrderTargets, orderForm.target_key]
  );

  const insightStats = useMemo(() => {
    const today = getAppDateKey(new Date().toISOString());
    const totalProspect = items.length;
    const followupToday = items.filter((item) => getAppDateKey(item.next_followup_at) === today).length;
    const dealToday = items.filter((item) => getAppDateKey(item.converted_at) === today).length;
    const pendingOrders = orderRows.filter((item) => String(item.payment_status || '').toLowerCase() === 'pending').length;
    const paidBasis = orderRows
      .filter((item) => String(item.payment_status || '').toLowerCase() === 'confirmed')
      .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    return [
      { label: 'total prospect', value: totalProspect, iconClass: 'fa-solid fa-users', tone: 'tone-subscription', hint: 'all leads in pipeline' },
      { label: 'followup today', value: followupToday, iconClass: 'fa-solid fa-phone', tone: 'tone-checkin', hint: 'scheduled follow-up today' },
      { label: 'deal today', value: dealToday, iconClass: 'fa-solid fa-handshake', tone: 'tone-booking', hint: 'converted today' },
      { label: 'pending orders', value: pendingOrders, iconClass: 'fa-solid fa-file-invoice-dollar', tone: 'tone-payment', hint: 'menunggu member atau cs bayar' },
      { label: 'paid basis', value: formatIdr(paidBasis), iconClass: 'fa-solid fa-sack-dollar', tone: 'tone-booking', hint: 'basis report incentive' }
    ];
  }, [items, orderRows]);

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);

  async function loadSalesWorkspace() {
    try {
      setLoading(true);
      setError('');
      await apiJson('/v1/projections/run', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId
        })
      }).catch(() => {});
      const qs = new URLSearchParams();
      qs.set('tenant_id', tenantId);
      if (stageFilter !== 'all') {
        qs.set('stage', stageFilter);
      }
      if (search.trim()) {
        qs.set('q', search.trim());
      }
      if (role === 'sales' && userId) {
        qs.set('owner_sales_id', userId);
      }
      const [prospectRes, orderRes, packageRes, eventRes, classRes, productRes] = await Promise.all([
        apiJson(`/v1/read/sales/prospects?${qs.toString()}`),
        apiJson(`/v1/read/orders?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&sales_owner_id=${encodeURIComponent(userId || '')}&limit=200`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/events?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&status=all&limit=200`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/products?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] }))
      ]);
      setItems(Array.isArray(prospectRes.rows) ? prospectRes.rows : []);
      setOrderRows(Array.isArray(orderRes.rows) ? orderRes.rows : []);
      setPackageRows(Array.isArray(packageRes.rows) ? packageRes.rows : []);
      setEventRows(Array.isArray(eventRes.rows) ? eventRes.rows : []);
      setClassRows(Array.isArray(classRes.rows) ? classRes.rows : []);
      setProductRows(Array.isArray(productRes.rows) ? productRes.rows : []);
    } catch (err) {
      setError(err.message || 'failed to load sales workspace');
    } finally {
      setLoading(false);
    }
  }

  async function loadProspectTimeline(prospectId) {
    if (!prospectId) {
      setTimelineRows([]);
      return;
    }
    try {
      setTimelineLoading(true);
      const result = await apiJson(
        `/v1/read/sales/prospects/${encodeURIComponent(prospectId)}/timeline?tenant_id=${encodeURIComponent(tenantId)}`
      );
      setTimelineRows(Array.isArray(result.rows) ? result.rows : []);
    } catch {
      setTimelineRows([]);
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    loadSalesWorkspace();
  }, [tenantId, branchId, role, userId, search, stageFilter]);

  useEffect(() => {
    loadProspectTimeline(selectedProspectId);
  }, [selectedProspectId, tenantId]);

  useEffect(() => {
    setOrderForm(createSalesOrderForm());
  }, [selectedProspectId]);

  useEffect(() => {
    const options = resolveSalesPaymentMethodOptions(orderForm.payment_route);
    if (!options.includes(orderForm.payment_method)) {
      setOrderForm((prev) => ({ ...prev, payment_method: options[0] || 'virtual_account' }));
    }
  }, [orderForm.payment_route, orderForm.payment_method]);

  useEffect(() => {
    if (orderForm.order_type === 'manual') return;
    if (!selectedOrderTarget && orderForm.target_key) {
      setOrderForm((prev) => ({ ...prev, target_key: '' }));
    }
  }, [orderForm.order_type, orderForm.target_key, selectedOrderTarget]);

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

  async function createProspect(e) {
    e.preventDefault();
    if (!newForm.full_name.trim()) {
      setFeedback('full_name is required');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(newForm.custom_fields_text, 'Create prospect');
      await apiJson('/v1/sales/prospects', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          owner_sales_id: userId || undefined,
          full_name: newForm.full_name.trim(),
          email: newForm.email.trim() || null,
          phone: newForm.phone.trim() || null,
          id_card: newForm.id_card.trim() || null,
          source: newForm.source.trim() || null,
          notes: newForm.notes.trim() || null,
          next_followup_at: toAppIsoFromDateTimeInput(newForm.next_followup_at),
          custom_fields: customFields
        })
      });
      setFeedback(`prospect.created: ${newForm.full_name}`);
      setNewForm({
        full_name: '',
        email: '',
        phone: '',
        id_card: '',
        source: 'walkin',
        notes: '',
        next_followup_at: '',
        custom_fields_text: ''
      });
      setProspectDrawerOpen(false);
      await loadSalesWorkspace();
    } catch (err) {
      setFeedback(err.message || 'failed to create prospect');
    } finally {
      setSaving(false);
    }
  }

  async function submitOrder(e) {
    e.preventDefault();
    if (!selectedProspect) {
      setFeedback('Pilih prospect dulu sebelum membuat order.');
      return;
    }
    if (!selectedProspect.converted_member_id) {
      setFeedback('Convert prospect dulu supaya order punya member_id yang valid.');
      return;
    }
    const orderType = normalizeSalesOrderType(orderForm.order_type);
    if (orderType !== 'manual' && !selectedOrderTarget) {
      setFeedback('Pilih target order sesuai tipenya terlebih dulu.');
      return;
    }
    const label = String(orderForm.label || '').trim() || selectedOrderTarget?.order_label || '';
    if (!label) {
      setFeedback('Label order wajib diisi.');
      return;
    }
    const qty = orderType === 'product' || orderType === 'manual'
      ? Math.max(1, Number(orderForm.qty || 1))
      : 1;
    const unitPrice = Math.max(0, Number(orderForm.unit_price || selectedOrderTarget?.unit_price || 0));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setFeedback('Harga order harus lebih besar dari 0.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const response = await apiJson('/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          actor_role: 'sales',
          created_by_role: 'sales',
          sales_owner_id: userId || undefined,
          prospect_id: selectedProspect.prospect_id,
          member_id: selectedProspect.converted_member_id,
          order_label: label,
          order_type: orderType,
          qty,
          unit_price: unitPrice,
          currency: 'IDR',
          payment_method: orderForm.payment_method || 'virtual_account',
          payment_settlement: 'pending',
          payment_responsibility: orderForm.payment_route || 'member_self',
          reference_type: selectedOrderTarget?.reference_type || 'manual',
          reference_id: selectedOrderTarget?.reference_id || null,
          notes:
            String(orderForm.notes || '').trim()
            || `Sales order for ${selectedProspect.full_name || selectedProspect.prospect_id}. Payment must be completed by member or CS.`
        })
      });
      setFeedback(
        `order.created: ${selectedProspect.full_name || selectedProspect.prospect_id} -> ${response?.order?.order_id || '-'} `
        + `(${response?.order?.payment_status || 'pending'}). Payment harus diselesaikan member atau CS.`
      );
      setOrderForm(createSalesOrderForm());
      await loadSalesWorkspace();
      await loadProspectTimeline(selectedProspect.prospect_id);
    } catch (err) {
      setFeedback(err.message || 'failed to create sales order');
    } finally {
      setSaving(false);
    }
  }

  async function updateProspectStage(item, stage) {
    if (!item?.prospect_id) return;
    try {
      setSaving(true);
      setFeedback('');
      await apiJson(`/v1/sales/prospects/${encodeURIComponent(item.prospect_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          actor_id: userId || undefined,
          stage
        })
      });
      setFeedback(`prospect.stage.updated: ${item.prospect_id} -> ${stage}`);
      await loadSalesWorkspace();
      await loadProspectTimeline(item.prospect_id);
    } catch (err) {
      setFeedback(err.message || 'failed to update stage');
    } finally {
      setSaving(false);
    }
  }

  function openFollowup(item) {
    setSelectedProspectId(item.prospect_id);
    setFollowupForm({
      notes: '',
      stage: 'followup',
      next_followup_at: getAppDateTimeInputValue(item.next_followup_at),
      custom_fields_text: item.custom_fields ? JSON.stringify(item.custom_fields) : ''
    });
  }

  async function submitFollowup(e) {
    e.preventDefault();
    if (!selectedProspectId) return;
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(followupForm.custom_fields_text, 'Follow-up');
      await apiJson(`/v1/sales/prospects/${encodeURIComponent(selectedProspectId)}/followup`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          owner_sales_id: userId || undefined,
          stage: followupForm.stage,
          notes: followupForm.notes.trim() || null,
          next_followup_at: toAppIsoFromDateTimeInput(followupForm.next_followup_at),
          custom_fields: customFields
        })
      });
      setFeedback(`prospect.followup.logged: ${selectedProspectId}`);
      await loadSalesWorkspace();
      await loadProspectTimeline(selectedProspectId);
    } catch (err) {
      setFeedback(err.message || 'failed to log followup');
    } finally {
      setSaving(false);
    }
  }

  function openConvert(item) {
    setSelectedProspectId(item.prospect_id);
    setConvertForm({
      create_member: true,
      converted_member_id: '',
      full_name: item.full_name || '',
      email: item.email || '',
      phone: item.phone || '',
      id_card: item.id_card || '',
      notes: '',
      custom_fields_text: item.custom_fields ? JSON.stringify(item.custom_fields) : ''
    });
  }

  async function submitConvert(e) {
    e.preventDefault();
    if (!selectedProspectId) return;
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(convertForm.custom_fields_text, 'Convert');
      await apiJson(`/v1/sales/prospects/${encodeURIComponent(selectedProspectId)}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: userId || undefined,
          create_member: Boolean(convertForm.create_member),
          converted_member_id: convertForm.converted_member_id.trim() || null,
          full_name: convertForm.full_name.trim() || null,
          email: convertForm.email.trim() || null,
          phone: convertForm.phone.trim() || null,
          id_card: convertForm.id_card.trim() || null,
          notes: convertForm.notes.trim() || null,
          custom_fields: customFields
        })
      });
      setFeedback(`prospect.converted: ${selectedProspectId}`);
      await loadSalesWorkspace();
      await loadProspectTimeline(selectedProspectId);
    } catch (err) {
      setFeedback(err.message || 'failed to convert prospect');
    } finally {
      setSaving(false);
    }
  }

  async function markSelectedLost() {
    if (selected.length === 0) return;
    try {
      setSaving(true);
      setFeedback('');
      for (const prospectId of selected) {
        await apiJson(`/v1/sales/prospects/${encodeURIComponent(prospectId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tenant_id: tenantId,
            actor_id: userId || undefined,
            stage: 'lost'
          })
        });
      }
      setFeedback(`prospect.lost.bulk: ${selected.length}`);
      setSelected([]);
      await loadSalesWorkspace();
    } catch (err) {
      setFeedback(err.message || 'failed to update selected prospect');
    } finally {
      setSaving(false);
    }
  }

  function togglePick(prospectId) {
    setSelected((prev) =>
      prev.includes(prospectId) ? prev.filter((id) => id !== prospectId) : [...prev, prospectId]
    );
  }

  const allFilteredSelected = items.length > 0 && items.every((item) => selected.includes(item.prospect_id));

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelected([]);
      return;
    }
    setSelected(items.map((item) => item.prospect_id));
  }

  return (
    <main className="backend-shell sales-workspace-shell">
      <aside className="backend-sidebar">
        <div className="backend-sidebar-brand">{salesCopy('brand', 'Foremoz')}</div>
        <nav className="backend-sidebar-nav" aria-label="Sales workspace navigation">
          {SALES_NAV_ITEMS.map((item) => (
            <a key={item.id} className={item.active ? 'active' : ''} href={item.href || `#${item.id}`}>
              {item.label || item.id}
            </a>
          ))}
        </nav>
        <div className="backend-sidebar-user">
          <p>{salesCopy('signedInAs', 'Signed in as')}</p>
          <strong>{session?.user?.fullName || salesCopy('titleFallback', 'Sales')}</strong>
          <small>{role}</small>
          <button className="btn ghost small" type="button" onClick={signOut}>{salesCopy('signOut', 'Sign out')}</button>
        </div>
      </aside>

      <section className="backend-main">
        <header className="backend-topbar">
          <div>
            <p className="eyebrow">{salesCopy('topbarEyebrow', 'Foremoz Admin')}</p>
            <h1>{salesCopy('eyebrow', 'Sales Workspace')}</h1>
            <p className="muted">{salesCopy('subtitle', 'Manage prospects, follow-ups, conversions, and incentive basis.')}</p>
          </div>
          <div className="backend-topbar-actions">
            <div className="backend-env-switcher" aria-label="Workspace environment switcher">
              {allowedEnv.map((env) => (
                <button
                  className={`btn ghost small ${targetEnv === env ? 'active' : ''}`}
                  key={env}
                  type="button"
                  onClick={() => {
                    setTargetEnv(env);
                    goToEnv(env);
                  }}
                >
                  {getEnvironmentLabel(env)}
                </button>
              ))}
            </div>
            <div className="backend-primary-actions">
              <button className="btn small" type="button" onClick={() => setProspectDrawerOpen(true)}>{salesCopy('addProspect', 'Add Prospect')}</button>
            </div>
          </div>
        </header>

      <section className="section-stack">
        <p className="eyebrow">{salesCopy('insightEyebrow', 'Insight')}</p>
        <section className="stats-grid">
          {insightStats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
          ))}
        </section>
        {loading ? <p className="feedback">{salesCopy('loading', 'Loading sales workspace...')}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>

      <section className="card admin-main">
        <p className="eyebrow">{salesCopy('quickGuideEyebrow', 'Quick Guide')}</p>
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          {SALES_QUICK_GUIDE.map((item, index) => (
            <p key={item.text}><strong>{index + 1}.</strong> {item.text}</p>
          ))}
        </div>
      </section>

      <section className="card admin-main" id="prospects">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{salesCopy('prospectEyebrow', 'Prospect')}</p>
            <h2>{salesCopy('prospectPipelineTitle', 'Prospect Pipeline')}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label>{salesCopy('stageLabel', 'stage')}
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                {SALES_STAGE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label || item.value}</option>
                ))}
              </select>
            </label>
            <button className="btn ghost" type="button" onClick={markSelectedLost} disabled={selected.length === 0 || saving}>
              {salesCopy('markLost', 'Mark lost ({count})', { count: selected.length })}
            </button>
            <button className="btn" type="button" onClick={() => setProspectDrawerOpen(true)}>{salesCopy('addProspect', 'Add Prospect')}</button>
          </div>
        </div>

        <label>
          search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name, email, phone, source, stage, prospect_id"
          />
        </label>

        <div style={{ margin: '0.75rem 0' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
            Select all listed
          </label>
        </div>

        <div className="entity-list">
          {items.length > 0 ? (
            items.map((item) => {
              const isSelected = String(selectedProspectId || '') === String(item.prospect_id || '');
              return (
                <div className={`entity-row ${isSelected ? 'sales-prospect-row-selected' : ''}`} key={item.prospect_id}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.prospect_id)}
                      onChange={() => togglePick(item.prospect_id)}
                      aria-label={`select ${item.full_name}`}
                    />
                    <div>
                      <strong>{item.full_name}</strong>
                      <p>{item.email || '-'} | {item.phone || '-'} | {item.source || '-'}</p>
                      <p>{item.stage} | followup: {formatAppDateTime(item.next_followup_at)} | converted: {item.converted_member_id || '-'}</p>
                    </div>
                  </div>
                  <div className="row-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button className="btn ghost small" type="button" onClick={() => setSelectedProspectId(item.prospect_id)}>Detail</button>
                    <button className="btn ghost small" type="button" onClick={() => openFollowup(item)}>Follow-up</button>
                    <button className="btn ghost small" type="button" onClick={() => updateProspectStage(item, 'qualified')} disabled={saving}>Qualified</button>
                    <button className="btn ghost small" type="button" onClick={() => updateProspectStage(item, 'lost')} disabled={saving}>Lost</button>
                    <button className="btn ghost small" type="button" onClick={() => openConvert(item)}>Convert</button>
                    <button className="btn ghost small" type="button" onClick={() => setSelectedProspectId(item.prospect_id)}>
                      {item.converted_member_id ? 'Create order' : 'Open'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted">No prospect found.</p>
          )}
        </div>
      </section>

      {selectedProspect ? (
        <section className="card admin-main" id="orders" style={{ marginTop: '1rem' }}>
          <h2>Prospect detail - {selectedProspect.full_name}</h2>
          <p>ID: {selectedProspect.prospect_id}</p>
          <p>Stage: {selectedProspect.stage || '-'} | member_id: {selectedProspect.converted_member_id || '-'}</p>
          <p>Custom fields: {selectedProspect.custom_fields ? JSON.stringify(selectedProspect.custom_fields) : '-'}</p>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <form className="form" onSubmit={submitFollowup}>
              <p className="eyebrow">Follow-up</p>
              <label>stage
                <select value={followupForm.stage} onChange={(e) => setFollowupForm((p) => ({ ...p, stage: e.target.value }))}>
                  <option value="followup">followup</option>
                  <option value="qualified">qualified</option>
                  <option value="new">new</option>
                </select>
              </label>
              <label>notes<input value={followupForm.notes} onChange={(e) => setFollowupForm((p) => ({ ...p, notes: e.target.value }))} /></label>
              <label>next_followup_at<input type="datetime-local" value={followupForm.next_followup_at} onChange={(e) => setFollowupForm((p) => ({ ...p, next_followup_at: e.target.value }))} /></label>
              <label>custom_fields (JSON)<textarea rows={3} value={followupForm.custom_fields_text} onChange={(e) => setFollowupForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"channel":"wa","result":"interested"}' /></label>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log follow-up'}</button>
            </form>

            <form className="form" onSubmit={submitConvert}>
              <p className="eyebrow">Convert</p>
              <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(convertForm.create_member)}
                  onChange={(e) => setConvertForm((p) => ({ ...p, create_member: e.target.checked }))}
                />
                create member automatically
              </label>
              <label>converted_member_id (optional)<input value={convertForm.converted_member_id} onChange={(e) => setConvertForm((p) => ({ ...p, converted_member_id: e.target.value }))} /></label>
              <label>full_name<input value={convertForm.full_name} onChange={(e) => setConvertForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
              <label>email<input type="email" value={convertForm.email} onChange={(e) => setConvertForm((p) => ({ ...p, email: e.target.value }))} /></label>
              <label>phone<input value={convertForm.phone} onChange={(e) => setConvertForm((p) => ({ ...p, phone: e.target.value }))} /></label>
              <label>id_card<input value={convertForm.id_card} onChange={(e) => setConvertForm((p) => ({ ...p, id_card: e.target.value }))} /></label>
              <label>notes<input value={convertForm.notes} onChange={(e) => setConvertForm((p) => ({ ...p, notes: e.target.value }))} /></label>
              <label>custom_fields (JSON)<textarea rows={3} value={convertForm.custom_fields_text} onChange={(e) => setConvertForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"conversion_reason":"trial completed"}' /></label>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Convert prospect'}</button>
            </form>

            <form className="form" onSubmit={submitOrder}>
              <p className="eyebrow">Create order</p>
              {!selectedProspect.converted_member_id ? (
                <div className="card" style={{ borderStyle: 'dashed' }}>
                  <p className="feedback">Convert prospect dulu. Order butuh `member_id`, dan pembayaran tetap harus dilakukan member atau dibantu CS.</p>
                </div>
              ) : null}
              <label>
                order_type
                <select
                  value={orderForm.order_type}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      order_type: e.target.value,
                      target_key: '',
                      label: '',
                      unit_price: '',
                      qty: '1'
                    }))
                  }
                >
                  <option value="package">package</option>
                  <option value="event">event</option>
                  <option value="class">class</option>
                  <option value="product">product</option>
                  <option value="manual">custom</option>
                </select>
              </label>
              {normalizeSalesOrderType(orderForm.order_type) !== 'manual' ? (
                <label>
                  target
                  <select
                    value={orderForm.target_key}
                    onChange={(e) => {
                      const nextTarget = currentOrderTargets.find((item) => item.key === e.target.value) || null;
                      setOrderForm((prev) => ({
                        ...prev,
                        target_key: e.target.value,
                        label: nextTarget?.order_label || '',
                        unit_price: nextTarget?.unit_price ? String(nextTarget.unit_price) : '',
                        qty: normalizeSalesOrderType(prev.order_type) === 'product' ? prev.qty : '1'
                      }));
                    }}
                  >
                    <option value="">Pilih target order</option>
                    {currentOrderTargets.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.order_label} | {item.hint || '-'} | {formatIdr(item.unit_price || 0)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                order_label
                <input value={orderForm.label} onChange={(e) => setOrderForm((prev) => ({ ...prev, label: e.target.value }))} />
              </label>
              <label>
                qty
                <input
                  type="number"
                  min="1"
                  value={orderForm.qty}
                  disabled={!['product', 'manual'].includes(normalizeSalesOrderType(orderForm.order_type))}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, qty: e.target.value }))}
                />
              </label>
              <label>
                unit_price
                <input
                  type="number"
                  min="0"
                  value={orderForm.unit_price}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                />
              </label>
              <label>
                payment_route
                <select
                  value={orderForm.payment_route}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, payment_route: e.target.value }))}
                >
                  <option value="member_self">member side</option>
                  <option value="cs_assisted">via cs</option>
                </select>
              </label>
              <label>
                payment_method
                <select
                  value={orderForm.payment_method}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                >
                  {resolveSalesPaymentMethodOptions(orderForm.payment_route).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                notes
                <textarea
                  rows={3}
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Jelaskan offer atau instruksi pembayaran untuk member / CS"
                />
              </label>
              <p className="feedback">Order akan selalu dibuat `pending`. Sales tidak boleh mark paid atau menerima uang langsung.</p>
              <button className="btn" type="submit" disabled={saving || !selectedProspect.converted_member_id}>
                {saving ? 'Saving...' : 'Create order'}
              </button>
            </form>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p className="eyebrow">Orders for this prospect</p>
            <div className="entity-list">
              {selectedProspectOrders.map((item) => (
                <div className="entity-row" key={item.order_id}>
                  <div>
                    <strong>{item.order_label || item.order_id}</strong>
                    <p>{item.order_type || '-'} | {formatIdr(item.total_amount || 0)} | {item.payment_method || '-'}</p>
                    <p>{item.payment_responsibility === 'cs_assisted' ? 'Payment via CS' : 'Payment by member'} | payment_id: {item.payment_id || '-'}</p>
                    <p>{item.reference_type || '-'}:{item.reference_id || '-'}</p>
                  </div>
                  <div className="payment-meta">
                    <span className={`status ${item.status || 'pending_payment'}`}>{item.status || 'pending_payment'}</span>
                    <span className="passport-chip">{item.payment_status || 'pending'}</span>
                  </div>
                </div>
              ))}
              {selectedProspectOrders.length === 0 ? <p className="muted">Belum ada order untuk prospect ini.</p> : null}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p className="eyebrow">Timeline</p>
            {timelineLoading ? (
              <p className="feedback">Loading timeline...</p>
            ) : timelineRows.length > 0 ? (
              <div className="entity-list">
                {timelineRows.map((row) => (
                  <div className="entity-row" key={`${row.sequence}:${row.event_type}`}>
                    <div>
                      <strong>{row.event_type}</strong>
                      <p>{formatAppDateTime(row.ts || row.data?.updated_at)}</p>
                      <p>{JSON.stringify(row.data || {})}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No timeline yet.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="card admin-main" id="report" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Report incentive</p>
            <h2>Sales order and incentive basis</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="card" style={{ borderStyle: 'dashed' }}>
            <p><strong>Total orders:</strong> {salesOrderSummary.totalOrders}</p>
            <p><strong>Paid orders:</strong> {salesOrderSummary.paidCount}</p>
            <p><strong>Pending orders:</strong> {salesOrderSummary.pendingCount}</p>
          </div>
          <div className="card" style={{ borderStyle: 'dashed' }}>
            <p><strong>Paid basis:</strong> {formatIdr(salesOrderSummary.paidAmount)}</p>
            <p><strong>Pending amount:</strong> {formatIdr(salesOrderSummary.pendingAmount)}</p>
            <p><strong>Converted prospects:</strong> {items.filter((item) => item.converted_member_id).length}</p>
          </div>
        </div>
        <p className="feedback" style={{ marginTop: '1rem' }}>
          Report ini adalah basis incentive sederhana dari order yang sudah `paid`. Belum memakai rule komisi terpisah.
        </p>
        <div className="entity-list" style={{ marginTop: '1rem' }}>
          {orderRows.map((item) => (
            <div className="entity-row" key={`report-${item.order_id}`}>
              <div>
                <strong>{item.order_label || item.order_id}</strong>
                <p>{item.prospect_id || '-'} | member {item.member_id || '-'}</p>
                <p>{item.order_type || '-'} | {item.reference_type || '-'}:{item.reference_id || '-'}</p>
                <p>{item.payment_responsibility === 'cs_assisted' ? 'Payment via CS' : 'Payment by member'} | {formatAppDateTime(item.created_at)}</p>
              </div>
              <div className="payment-meta">
                <strong>{formatIdr(item.total_amount || 0)}</strong>
                <span className={`status ${item.payment_status || 'pending'}`}>{item.payment_status || 'pending'}</span>
              </div>
            </div>
          ))}
          {orderRows.length === 0 ? <p className="muted">Belum ada order sales.</p> : null}
        </div>
      </section>

      {prospectDrawerOpen ? (
        <div className="backend-drawer-overlay" onClick={() => setProspectDrawerOpen(false)}>
          <aside className="backend-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">{salesCopy('prospectEyebrow', 'Prospect')}</p>
                <h2>{salesCopy('addProspect', 'Add Prospect')}</h2>
              </div>
              <button className="btn ghost small" type="button" onClick={() => setProspectDrawerOpen(false)}>{salesCopy('close', 'Close')}</button>
            </div>
            <form className="form form-grid" onSubmit={createProspect}>
              <label>full_name<input value={newForm.full_name} onChange={(e) => setNewForm((p) => ({ ...p, full_name: e.target.value }))} /></label>
              <label>email<input type="email" value={newForm.email} onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))} /></label>
              <label>phone<input value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} /></label>
              <label>id_card<input value={newForm.id_card} onChange={(e) => setNewForm((p) => ({ ...p, id_card: e.target.value }))} /></label>
              <label>source<input value={newForm.source} onChange={(e) => setNewForm((p) => ({ ...p, source: e.target.value }))} /></label>
              <label>next_followup_at<input type="datetime-local" value={newForm.next_followup_at} onChange={(e) => setNewForm((p) => ({ ...p, next_followup_at: e.target.value }))} /></label>
              <label className="span-2">notes<textarea rows={3} value={newForm.notes} onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))} /></label>
              <label className="span-2">custom_fields (JSON)<textarea rows={3} value={newForm.custom_fields_text} onChange={(e) => setNewForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"interest":"personal training"}' /></label>
              <button className="btn span-2" type="submit" disabled={saving}>{saving ? salesCopy('saving', 'Saving...') : salesCopy('createProspect', 'Create prospect')}</button>
            </form>
          </aside>
        </div>
      ) : null}

      <footer className="dash-foot"><Link to="/host">{salesCopy('backToHost', 'Back to host')}</Link></footer>
      </section>
    </main>
  );
}
