import express from 'express';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { pool, query } from './db.js';
import { appendDomainEvent } from './event-store.js';
import { runPassportProjection } from './projection.js';
import { hashPassword, normalizeEmail, verifyPassword } from './auth.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.corsOrigin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send();
  return next();
});

function fail(statusCode, errorCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function required(value, name) {
  if (value === undefined || value === null || value === '') {
    throw fail(400, 'VALIDATION_ERROR', `${name} is required`);
  }
  return value;
}

async function appendAndProject({
  tenantId,
  branchId,
  actorId,
  actorKind,
  eventType,
  subjectKind,
  subjectId,
  data,
  refs
}) {
  const event = await appendDomainEvent({
    tenantId,
    branchId,
    actorId,
    actorKind,
    eventType,
    subjectKind,
    subjectId,
    data,
    refs,
    ts: new Date().toISOString()
  });
  const projection = await runPassportProjection({ tenantId, branchId });
  return { event, projection };
}

app.get('/health', async (_req, res) => {
  try {
    await query('select 1');
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ status: 'FAIL', error_code: 'DB_UNAVAILABLE', message: error.message });
  }
});

app.post('/v1/tenant/auth/signup', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));
    const fullName = required(data.full_name, 'full_name');
    const passportId = data.passport_id || `pass_${Date.now()}_${randomUUID().slice(0, 6)}`;

    if (password.length < 8) {
      throw fail(400, 'AUTH_WEAK_PASSWORD', 'password min length is 8 characters');
    }

    const existing = await query(
      `select passport_id
       from read.rm_passport_account_auth
       where tenant_id = $1 and email = $2
       limit 1`,
      [tenantId, email]
    );
    if (existing.rows[0]) {
      throw fail(409, 'AUTH_EMAIL_EXISTS', 'email already registered');
    }

    const passwordHash = await hashPassword(password);
    const payload = {
      tenant_id: tenantId,
      passport_id: passportId,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await appendAndProject({
      tenantId,
      branchId: null,
      actorId: data.actor_id || passportId,
      actorKind: 'member',
      eventType: 'passport.account.created',
      subjectKind: 'passport_account',
      subjectId: passportId,
      data: payload,
      refs: {}
    });

    return res.status(201).json({
      status: 'PASS',
      user: {
        tenant_id: tenantId,
        passport_id: passportId,
        full_name: fullName,
        email,
        status: 'active'
      },
      ...result
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/tenant/auth/signin', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));

    const authResult = await query(
      `select tenant_id, passport_id, full_name, email, password_hash, status
       from read.rm_passport_account_auth
       where tenant_id = $1 and email = $2
       limit 1`,
      [tenantId, email]
    );
    const authRow = authResult.rows[0] || null;
    if (!authRow) {
      throw fail(401, 'AUTH_INVALID_CREDENTIALS', 'invalid email or password');
    }
    if (authRow.status !== 'active') {
      throw fail(403, 'AUTH_ACCOUNT_INACTIVE', 'account is not active');
    }

    const matched = await verifyPassword(password, authRow.password_hash);
    if (!matched) {
      throw fail(401, 'AUTH_INVALID_CREDENTIALS', 'invalid email or password');
    }

    return res.json({
      status: 'PASS',
      user: {
        tenant_id: authRow.tenant_id,
        passport_id: authRow.passport_id,
        full_name: authRow.full_name,
        email: authRow.email,
        status: authRow.status
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/passport/create', async (req, res, next) => {
  try {
    const d = req.body || {};
    const passportId = d.passport_id || `pass_${Date.now()}_${randomUUID().slice(0, 6)}`;
    const tenantId = d.tenant_id || config.defaultTenantId;
    const payload = {
      tenant_id: tenantId,
      passport_id: passportId,
      member_id: required(d.member_id, 'member_id'),
      full_name: d.full_name || null,
      sport_interests: d.sport_interests || [],
      updated_at: new Date().toISOString()
    };
    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || payload.member_id,
      actorKind: 'member',
      eventType: 'passport.created',
      subjectKind: 'passport',
      subjectId: passportId,
      data: payload,
      refs: {}
    });
    return res.status(201).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/actors/profile/upsert', async (req, res, next) => {
  try {
    const d = req.body || {};
    const tenantId = d.tenant_id || config.defaultTenantId;
    const actorKind = String(required(d.actor_kind, 'actor_kind')).trim().toLowerCase();
    const actorId = String(required(d.actor_id, 'actor_id')).trim();
    const payload = {
      tenant_id: tenantId,
      actor_kind: actorKind,
      actor_id: actorId,
      passport_id: d.passport_id || null,
      display_name: d.display_name || null,
      headline: d.headline || null,
      bio: d.bio || null,
      avatar_url: d.avatar_url || null,
      contact_json: d.contact_json || null,
      status: d.status || 'active',
      updated_at: new Date().toISOString()
    };
    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || actorId,
      actorKind,
      eventType: 'actor.profile.upserted',
      subjectKind: 'actor_profile',
      subjectId: `${actorKind}:${actorId}`,
      data: payload,
      refs: {}
    });
    return res.status(201).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/passport/profile', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const passportId = required(req.query.passport_id, 'passport_id');
    const { rows } = await query(
      `select tenant_id, passport_id, member_id, full_name, sport_interests, updated_at
       from read.rm_passport_profile
       where tenant_id = $1 and passport_id = $2
       limit 1`,
      [tenantId, passportId]
    );
    return res.json({ status: 'PASS', item: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/subscriptions/create', async (req, res, next) => {
  try {
    const d = req.body || {};
    const subscriptionId = d.subscription_id || `sub_${Date.now()}_${randomUUID().slice(0, 6)}`;
    const tenantId = d.tenant_id || config.defaultTenantId;
    const payload = {
      tenant_id: tenantId,
      subscription_id: subscriptionId,
      passport_id: required(d.passport_id, 'passport_id'),
      coach_id: d.coach_id || null,
      studio_id: d.studio_id || null,
      plan_id: d.plan_id || null,
      status: 'active',
      updated_at: new Date().toISOString()
    };
    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || payload.passport_id,
      actorKind: 'member',
      eventType: 'subscription.created',
      subjectKind: 'subscription',
      subjectId: subscriptionId,
      data: payload,
      refs: {}
    });
    return res.status(201).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/performance/log', async (req, res, next) => {
  try {
    const d = req.body || {};
    const category = required(d.metric_category, 'metric_category');
    const allowed = new Set(['diet', 'weight', 'muscle', 'workout']);
    if (!allowed.has(category)) {
      throw fail(400, 'VALIDATION_ERROR', 'metric_category must be one of: diet, weight, muscle, workout');
    }

    const metricLogId = d.metric_log_id || `mtr_${Date.now()}_${randomUUID().slice(0, 6)}`;
    const tenantId = d.tenant_id || config.defaultTenantId;
    const payload = {
      tenant_id: tenantId,
      metric_log_id: metricLogId,
      passport_id: required(d.passport_id, 'passport_id'),
      metric_category: category,
      metric_value_json: d.metric_value_json || {},
      measured_at: d.measured_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const eventType = `performance.${category}.logged`;
    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || payload.passport_id,
      actorKind: 'member',
      eventType,
      subjectKind: 'performance_metric',
      subjectId: metricLogId,
      data: payload,
      refs: {}
    });
    return res.status(201).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/consents/grant', async (req, res, next) => {
  try {
    const d = req.body || {};
    const consentId = d.consent_id || `cons_${Date.now()}_${randomUUID().slice(0, 6)}`;
    const tenantId = d.tenant_id || config.defaultTenantId;
    const payload = {
      tenant_id: tenantId,
      consent_id: consentId,
      passport_id: required(d.passport_id, 'passport_id'),
      coach_id: required(d.coach_id, 'coach_id'),
      metric_categories: d.metric_categories || [],
      status: 'active',
      granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || payload.passport_id,
      actorKind: 'member',
      eventType: 'consent.granted',
      subjectKind: 'consent',
      subjectId: consentId,
      data: payload,
      refs: {}
    });
    return res.status(201).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/consents/revoke', async (req, res, next) => {
  try {
    const d = req.body || {};
    const tenantId = d.tenant_id || config.defaultTenantId;
    const payload = {
      tenant_id: tenantId,
      consent_id: required(d.consent_id, 'consent_id'),
      passport_id: required(d.passport_id, 'passport_id'),
      coach_id: required(d.coach_id, 'coach_id'),
      metric_categories: d.metric_categories || [],
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || payload.passport_id,
      actorKind: 'member',
      eventType: 'consent.revoked',
      subjectKind: 'consent',
      subjectId: payload.consent_id,
      data: payload,
      refs: {}
    });
    return res.status(200).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/pricing/plan/change', async (req, res, next) => {
  try {
    const d = req.body || {};
    const tenantId = d.tenant_id || config.defaultTenantId;
    const payload = {
      tenant_id: tenantId,
      passport_id: required(d.passport_id, 'passport_id'),
      plan_code: required(d.plan_code, 'plan_code'),
      plan_status: d.plan_status || 'active',
      effective_at: d.effective_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await appendAndProject({
      tenantId,
      branchId: d.branch_id || null,
      actorId: d.actor_id || payload.passport_id,
      actorKind: 'member',
      eventType: 'pricing.plan.changed',
      subjectKind: 'passport_plan',
      subjectId: `${payload.passport_id}:${payload.plan_code}`,
      data: payload,
      refs: {}
    });
    return res.status(200).json({ status: 'PASS', ...result });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/projections/run', async (req, res, next) => {
  try {
    const tenantId = req.body?.tenant_id || config.defaultTenantId;
    const branchId = req.body?.branch_id || null;
    const result = await runPassportProjection({ tenantId, branchId });
    return res.json({ status: 'PASS', projection: result });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/profile', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(`select * from read.rm_passport_profile where tenant_id = $1 order by updated_at desc limit 200`, [tenantId]);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/subscriptions', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(`select * from read.rm_passport_subscriptions where tenant_id = $1 order by updated_at desc limit 200`, [tenantId]);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/actors/profile', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const actorKind = req.query.actor_kind ? String(req.query.actor_kind).trim().toLowerCase() : null;
    const actorId = req.query.actor_id || null;
    const passportId = req.query.passport_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_actor_profile where tenant_id = $1`;
    if (actorKind) {
      params.push(actorKind);
      sql += ` and actor_kind = $${params.length}`;
    }
    if (actorId) {
      params.push(actorId);
      sql += ` and actor_id = $${params.length}`;
    }
    if (passportId) {
      params.push(passportId);
      sql += ` and passport_id = $${params.length}`;
    }
    sql += ` order by updated_at desc limit 300`;
    const { rows } = await query(sql, params);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/performance', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(`select * from read.rm_passport_performance_log where tenant_id = $1 order by measured_at desc limit 200`, [tenantId]);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/consents', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(`select * from read.rm_passport_consent where tenant_id = $1 order by updated_at desc limit 200`, [tenantId]);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/coach-shared-view', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(`select * from read.rm_coach_shared_view where tenant_id = $1 order by updated_at desc limit 200`, [tenantId]);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/passport-plan', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(`select * from read.rm_passport_plan_state where tenant_id = $1 order by updated_at desc limit 200`, [tenantId]);
    return res.json({ status: 'PASS', items: rows });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_ERROR';
  return res.status(statusCode).json({ status: 'FAIL', error_code: errorCode, message: error.message });
});

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[passport-api] listening on :${config.port}`);
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[passport-api] received ${signal}, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
