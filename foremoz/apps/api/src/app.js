import express from 'express';
import { randomUUID } from 'node:crypto';
import { query, pool, withTx } from './db.js';
import { appendDomainEvent, resolveNamespaceId } from './event-store.js';
import { runFitnessProjection } from './projection.js';
import { config } from './config.js';
import {
  hashPassword,
  normalizeEmail,
  readBearerToken,
  signMemberJwt,
  signTenantJwt,
  verifyMemberJwt,
  verifyPassword
} from './auth.js';

const app = express();
app.use((req, res, next) => {
  const allowOrigin = config.corsOrigin || '*';
  res.header('Access-Control-Allow-Origin', allowOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  return next();
});
app.use(express.json({ limit: '1mb' }));

function required(value, name) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

function fail(statusCode, errorCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function ok(res, data) {
  return res.status(200).json({ status: 'PASS', ...data });
}

function created(res, data) {
  return res.status(201).json({ status: 'PASS', ...data });
}

function normalizeUserRole(input) {
  const role = String(input || '').trim().toLowerCase();
  const allowed = new Set(['admin', 'cs', 'sales', 'pt']);
  if (!allowed.has(role)) {
    throw fail(400, 'OWNER_INVALID_ROLE', 'role must be one of: admin, cs, sales, pt');
  }
  return role;
}

function validateAccountSlug(input) {
  const slug = String(input || '').trim().toLowerCase();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    throw fail(
      400,
      'OWNER_INVALID_ACCOUNT_SLUG',
      'account_slug must be URL-safe (lowercase letters, numbers, single hyphen between words)'
    );
  }
  if (slug.length > 32) {
    throw fail(400, 'OWNER_INVALID_ACCOUNT_SLUG', 'account_slug max length is 32');
  }
  return slug;
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
    const role = data.role || 'owner';
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));
    const fullName = required(data.full_name, 'full_name');
    const userId = data.user_id || `usr_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const ts = new Date().toISOString();

    if (password.length < 8) {
      throw fail(400, 'AUTH_WEAK_PASSWORD', 'password min length is 8 characters');
    }

    const existing = await query(
      `select user_id
       from read.rm_tenant_user_auth
       where tenant_id = $1 and email = $2
       limit 1`,
      [tenantId, email]
    );
    if (existing.rows[0]) {
      throw fail(409, 'AUTH_EMAIL_EXISTS', 'email already registered');
    }

    const passwordHash = await hashPassword(password);
    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.user.created',
      subjectKind: 'tenant_user',
      subjectId: userId,
      data: {
        tenant_id: tenantId,
        user_id: userId,
        full_name: fullName,
        email,
        role,
        password_hash: passwordHash,
        status: 'active',
        created_at: ts
      },
      refs: {},
      uniqueIds: [
        { scope: 'tenant_user.user_id', value: userId },
        { scope: 'tenant_user.email', value: email }
      ],
      ts
    });

    await runFitnessProjection({ tenantId, branchId: null });
    const tokenSigned = signTenantJwt({ tenantId, userId, email, role });

    return created(res, {
      user: {
        tenant_id: tenantId,
        user_id: userId,
        full_name: fullName,
        email,
        role,
        status: 'active'
      },
      auth: {
        access_token: tokenSigned.token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiresInSec
      },
      event
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/tenant/auth/signin', async (req, res, next) => {
  try {
    const data = req.body || {};
    const requestedTenantId = data.tenant_id ? String(data.tenant_id).trim() : null;
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));
    const requestedRole = data.role || null;

    let authRow = null;
    if (requestedTenantId) {
      const authResult = await query(
        `select tenant_id, user_id, full_name, email, role, password_hash, status
         from read.rm_tenant_user_auth
         where tenant_id = $1 and email = $2
         limit 1`,
        [requestedTenantId, email]
      );
      authRow = authResult.rows[0] || null;
    }

    // Owner signin from /signin may not know tenant_id yet.
    if (!authRow && requestedRole === 'owner') {
      const ownerResult = await query(
        `select tenant_id, user_id, full_name, email, role, password_hash, status
         from read.rm_tenant_user_auth
         where email = $1 and role = 'owner'
         order by updated_at desc
         limit 1`,
        [email]
      );
      authRow = ownerResult.rows[0] || null;
    }

    // Keep backward compatibility for callers that omit tenant_id.
    if (!authRow && !requestedTenantId && requestedRole !== 'owner') {
      const authResult = await query(
        `select tenant_id, user_id, full_name, email, role, password_hash, status
         from read.rm_tenant_user_auth
         where tenant_id = $1 and email = $2
         limit 1`,
        [config.defaultTenantId, email]
      );
      authRow = authResult.rows[0] || null;
    }

    if (!authRow) {
      throw fail(401, 'AUTH_INVALID_CREDENTIALS', 'invalid email or password');
    }

    if (authRow.status !== 'active') {
      throw fail(403, 'AUTH_ACCOUNT_INACTIVE', 'account is not active');
    }

    if (requestedRole && requestedRole !== authRow.role) {
      throw fail(403, 'AUTH_ROLE_MISMATCH', `account role mismatch, expected ${requestedRole}`);
    }

    const matched = await verifyPassword(password, authRow.password_hash);
    if (!matched) {
      throw fail(401, 'AUTH_INVALID_CREDENTIALS', 'invalid email or password');
    }

    const actualTenantId = authRow.tenant_id;
    const tokenSigned = signTenantJwt({
      tenantId: actualTenantId,
      userId: authRow.user_id,
      email: authRow.email,
      role: authRow.role
    });

    return ok(res, {
      user: {
        tenant_id: actualTenantId,
        user_id: authRow.user_id,
        full_name: authRow.full_name,
        email: authRow.email,
        role: authRow.role,
        status: authRow.status
      },
      auth: {
        access_token: tokenSigned.token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiresInSec
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/owner/setup', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(
      `select tenant_id, gym_name, branch_id, account_slug, address, city, photo_url, package_plan, status, updated_at
       from read.rm_owner_setup
       where tenant_id = $1
       limit 1`,
      [tenantId]
    );
    return ok(res, { row: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/public/account/resolve', async (req, res, next) => {
  try {
    const accountSlug = String(req.query.account_slug || '').trim().toLowerCase();
    if (!accountSlug) {
      throw fail(400, 'ACCOUNT_SLUG_REQUIRED', 'account_slug is required');
    }

    const { rows } = await query(
      `select tenant_id, gym_name, branch_id, account_slug, address, city, photo_url, package_plan, status, updated_at
       from read.rm_owner_setup
       where lower(account_slug) = $1 and status = 'active'
       order by updated_at desc
       limit 1`,
      [accountSlug]
    );
    return ok(res, { row: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/owner/setup/save', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const branchId = required(data.branch_id, 'branch_id');
    const accountSlug = validateAccountSlug(required(data.account_slug, 'account_slug'));
    const packagePlan = data.package_plan || 'free';

    const existingSlug = await query(
      `select tenant_id
       from read.rm_owner_setup
       where lower(account_slug) = $1
         and tenant_id <> $2
         and status = 'active'
       limit 1`,
      [accountSlug, tenantId]
    );
    if (existingSlug.rows[0]) {
      throw fail(409, 'OWNER_ACCOUNT_SLUG_EXISTS', `account_slug "${accountSlug}" already used`);
    }

    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: data.actor_id || 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.tenant.setup.saved',
      subjectKind: 'tenant_setup',
      subjectId: tenantId,
      data: {
        tenant_id: tenantId,
        gym_name: required(data.gym_name, 'gym_name'),
        branch_id: branchId,
        account_slug: accountSlug,
        address: data.address || null,
        city: data.city || null,
        photo_url: data.photo_url || null,
        package_plan: packagePlan,
        saved_at: new Date().toISOString()
      },
      refs: {}
    });
    await runFitnessProjection({ tenantId, branchId: null });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.delete('/v1/owner/setup', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || req.query.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: data.actor_id || 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.tenant.setup.deleted',
      subjectKind: 'tenant_setup',
      subjectId: tenantId,
      data: {
        tenant_id: tenantId,
        deleted_at: new Date().toISOString()
      },
      refs: {}
    });
    await runFitnessProjection({ tenantId, branchId: null });
    return ok(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/owner/account/delete', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = required(data.tenant_id || config.defaultTenantId, 'tenant_id');
    const confirmText = required(data.confirm_text, 'confirm_text');
    const expectedConfirm = `DELETE ${tenantId}`;
    if (confirmText !== expectedConfirm) {
      throw fail(400, 'OWNER_DELETE_CONFIRM_MISMATCH', `confirm_text must be exactly "${expectedConfirm}"`);
    }

    const namespaceId = resolveNamespaceId(tenantId);
    const result = await withTx(async (client) => {
      await client.query(
        `create table if not exists eventdb_unique_id (
           namespace_id text not null,
           id_scope text not null,
           id_value text not null,
           reserved_by_event_id text not null,
           created_at timestamptz not null default now(),
           primary key (namespace_id, id_scope, id_value)
         )`
      );

      const checkpointDelete = await client.query(
        `delete from read.rm_checkpoint where namespace_id = $1`,
        [namespaceId]
      );
      const chainDelete = await client.query(
        `delete from eventdb_chain where namespace_id = $1`,
        [namespaceId]
      );
      const uniqueDelete = await client.query(
        `delete from eventdb_unique_id where namespace_id = $1`,
        [namespaceId]
      );

      const readTables = [
        'read.rm_owner_setup',
        'read.rm_owner_saas',
        'read.rm_tenant_user_auth',
        'read.rm_member_auth',
        'read.rm_member',
        'read.rm_subscription_active',
        'read.rm_attendance_daily',
        'read.rm_class_availability',
        'read.rm_booking_list',
        'read.rm_pt_balance',
        'read.rm_payment_queue',
        'read.rm_payment_history',
        'read.rm_sales_prospect',
        'read.rm_tenant_performance',
        'read.rm_tenant_policy',
        'read.rm_actor_network',
        'read.rm_invitation_queue',
        'read.rm_passport_profile',
        'read.rm_pt_activity_log',
        'read.rm_dashboard'
      ];

      let readDeleted = 0;
      for (const tableName of readTables) {
        const deleted = await client.query(`delete from ${tableName} where tenant_id = $1`, [tenantId]);
        readDeleted += deleted.rowCount;
      }

      return {
        namespace_id: namespaceId,
        tenant_id: tenantId,
        deleted: {
          chain_rows: chainDelete.rowCount,
          checkpoint_rows: checkpointDelete.rowCount,
          unique_id_rows: uniqueDelete.rowCount,
          read_model_rows: readDeleted
        }
      };
    });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/owner/users', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const status = req.query.status || 'active';
    const { rows } = await query(
      `select tenant_id, user_id, full_name, email, role, status, created_at, updated_at
       from read.rm_tenant_user_auth
       where tenant_id = $1 and status = $2
       order by updated_at desc`,
      [tenantId, status]
    );
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/owner/users', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const role = normalizeUserRole(required(data.role, 'role'));
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));
    const fullName = required(data.full_name, 'full_name');
    const userId = data.user_id || `usr_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const ts = new Date().toISOString();

    if (password.length < 8) {
      throw fail(400, 'AUTH_WEAK_PASSWORD', 'password min length is 8 characters');
    }

    const passwordHash = await hashPassword(password);
    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: data.actor_id || 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.user.created',
      subjectKind: 'tenant_user',
      subjectId: userId,
      data: {
        tenant_id: tenantId,
        user_id: userId,
        full_name: fullName,
        email,
        role,
        password_hash: passwordHash,
        status: 'active',
        created_at: ts
      },
      refs: {},
      uniqueIds: [
        { scope: 'tenant_user.user_id', value: userId },
        { scope: 'tenant_user.email', value: email }
      ],
      ts
    });

    await runFitnessProjection({ tenantId, branchId: null });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.patch('/v1/owner/users/:userId', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const userId = required(req.params.userId, 'userId');
    const fullName = data.full_name || null;
    const role = data.role ? normalizeUserRole(data.role) : null;
    if (!fullName && !role) {
      throw fail(400, 'BAD_REQUEST', 'full_name or role is required');
    }

    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: data.actor_id || 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.user.updated',
      subjectKind: 'tenant_user',
      subjectId: userId,
      data: {
        tenant_id: tenantId,
        user_id: userId,
        full_name: fullName,
        role,
        updated_at: new Date().toISOString()
      },
      refs: {}
    });

    await runFitnessProjection({ tenantId, branchId: null });
    return ok(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.delete('/v1/owner/users/:userId', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || req.query.tenant_id || config.defaultTenantId;
    const userId = required(req.params.userId, 'userId');
    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: data.actor_id || 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.user.deleted',
      subjectKind: 'tenant_user',
      subjectId: userId,
      data: {
        tenant_id: tenantId,
        user_id: userId,
        deleted_at: new Date().toISOString()
      },
      refs: {}
    });

    await runFitnessProjection({ tenantId, branchId: null });
    return ok(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/owner/saas', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(
      `select tenant_id, total_months, last_note, last_extended_at, updated_at
       from read.rm_owner_saas
       where tenant_id = $1
       limit 1`,
      [tenantId]
    );
    return ok(res, { row: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/owner/saas/extend', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const months = Number(required(data.months, 'months'));
    if (!Number.isFinite(months) || months <= 0) {
      throw fail(400, 'BAD_REQUEST', 'months must be a positive number');
    }

    const event = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: data.actor_id || 'owner_self_service',
      actorKind: 'owner',
      eventType: 'owner.saas.extended',
      subjectKind: 'tenant_saas',
      subjectId: tenantId,
      data: {
        tenant_id: tenantId,
        months,
        note: data.note || null,
        extended_at: new Date().toISOString()
      },
      refs: {}
    });
    await runFitnessProjection({ tenantId, branchId: null });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/auth/signup', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));
    const fullName = required(data.full_name, 'full_name');
    const memberId = data.member_id || `mem_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const ts = new Date().toISOString();

    if (password.length < 8) {
      throw fail(400, 'AUTH_WEAK_PASSWORD', 'password min length is 8 characters');
    }

    const existingAuth = await query(
      `select member_id
       from read.rm_member_auth
       where tenant_id = $1 and email = $2
       limit 1`,
      [tenantId, email]
    );

    if (existingAuth.rows[0]) {
      throw fail(409, 'AUTH_EMAIL_EXISTS', 'email already registered');
    }

    const existingMember = await query(
      `select member_id
       from read.rm_member
       where tenant_id = $1 and member_id = $2
       limit 1`,
      [tenantId, memberId]
    );

    const events = [];

    if (!existingMember.rows[0]) {
      const registerEvent = await appendDomainEvent({
        tenantId,
        branchId: null,
        actorId: 'member_self_service',
        actorKind: 'member',
        eventType: 'member.registered',
        subjectKind: 'member',
        subjectId: memberId,
        data: {
          tenant_id: tenantId,
          branch_id: data.branch_id || null,
          member_id: memberId,
          full_name: fullName,
          phone: data.phone || null,
          status: 'active'
        },
        refs: {},
        uniqueIds: [
          { scope: 'member.member_id', value: memberId },
          { scope: 'member_auth.email', value: email }
        ],
        ts
      });
      events.push(registerEvent);
    }

    const passwordHash = await hashPassword(password);
    const authEvent = await appendDomainEvent({
      tenantId,
      branchId: null,
      actorId: 'member_self_service',
      actorKind: 'member',
      eventType: 'member.auth.registered',
      subjectKind: 'member_auth',
      subjectId: memberId,
      data: {
        tenant_id: tenantId,
        branch_id: data.branch_id || null,
        member_id: memberId,
        email,
        password_hash: passwordHash,
        status: 'active',
        registered_at: ts
      },
      refs: {},
      ts
    });
    events.push(authEvent);

    await runFitnessProjection({ tenantId, branchId: null });

    const tokenSigned = signMemberJwt({ tenantId, memberId, email });
    return created(res, {
      member: {
        tenant_id: tenantId,
        member_id: memberId,
        full_name: fullName,
        email,
        phone: data.phone || null
      },
      auth: {
        access_token: tokenSigned.token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiresInSec
      },
      events
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/auth/signin', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const email = normalizeEmail(required(data.email, 'email'));
    const password = String(required(data.password, 'password'));

    const authResult = await query(
      `select tenant_id, member_id, email, password_hash, status, updated_at
       from read.rm_member_auth
       where tenant_id = $1 and email = $2
       limit 1`,
      [tenantId, email]
    );

    const authRow = authResult.rows[0];
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

    const memberResult = await query(
      `select member_id, full_name, phone, status
       from read.rm_member
       where tenant_id = $1 and member_id = $2
       limit 1`,
      [tenantId, authRow.member_id]
    );

    const memberRow = memberResult.rows[0] || null;
    const tokenSigned = signMemberJwt({
      tenantId,
      memberId: authRow.member_id,
      email: authRow.email
    });

    return ok(res, {
      member: {
        tenant_id: tenantId,
        member_id: authRow.member_id,
        full_name: memberRow?.full_name || null,
        phone: memberRow?.phone || null,
        status: memberRow?.status || authRow.status,
        email: authRow.email
      },
      auth: {
        access_token: tokenSigned.token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiresInSec
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/auth/me', async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw fail(401, 'AUTH_TOKEN_MISSING', 'bearer token is required');
    }

    const payload = verifyMemberJwt(token);
    const authResult = await query(
      `select tenant_id, member_id, email, status
       from read.rm_member_auth
       where tenant_id = $1 and member_id = $2
       limit 1`,
      [payload.tenant_id, payload.sub]
    );

    const authRow = authResult.rows[0];
    if (!authRow || authRow.status !== 'active') {
      throw fail(401, 'AUTH_TOKEN_REJECTED', 'token subject is no longer active');
    }

    const memberResult = await query(
      `select full_name, phone, status
       from read.rm_member
       where tenant_id = $1 and member_id = $2
       limit 1`,
      [payload.tenant_id, payload.sub]
    );

    return ok(res, {
      member: {
        tenant_id: payload.tenant_id,
        member_id: payload.sub,
        role: payload.role,
        email: authRow.email,
        full_name: memberResult.rows[0]?.full_name || null,
        phone: memberResult.rows[0]?.phone || null,
        status: memberResult.rows[0]?.status || authRow.status
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/members/register', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: data.branch_id || null,
      actorId: data.actor_id || config.defaultActorId,
      eventType: 'member.registered',
      subjectKind: 'member',
      subjectId: required(data.member_id, 'member_id'),
      data: {
        tenant_id: tenantId,
        branch_id: data.branch_id || null,
        member_id: required(data.member_id, 'member_id'),
        full_name: required(data.full_name, 'full_name'),
        phone: data.phone || null,
        status: data.status || 'active'
      },
      refs: {},
      uniqueIds: [{ scope: 'member.member_id', value: required(data.member_id, 'member_id') }]
    });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/subscriptions/activate', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: data.branch_id || null,
      actorId: data.actor_id || config.defaultActorId,
      eventType: 'subscription.activated',
      subjectKind: 'subscription',
      subjectId: required(data.subscription_id, 'subscription_id'),
      data: {
        tenant_id: tenantId,
        branch_id: data.branch_id || null,
        subscription_id: required(data.subscription_id, 'subscription_id'),
        member_id: required(data.member_id, 'member_id'),
        plan_id: required(data.plan_id, 'plan_id'),
        start_date: required(data.start_date, 'start_date'),
        end_date: required(data.end_date, 'end_date'),
        status: data.status || 'active'
      },
      refs: { payment_id: data.payment_id || null },
      uniqueIds: [{ scope: 'subscription.subscription_id', value: required(data.subscription_id, 'subscription_id') }]
    });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/payments/record', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: data.branch_id || null,
      actorId: data.actor_id || config.defaultActorId,
      eventType: 'payment.recorded',
      subjectKind: 'payment',
      subjectId: required(data.payment_id, 'payment_id'),
      data: {
        tenant_id: tenantId,
        branch_id: data.branch_id || null,
        payment_id: required(data.payment_id, 'payment_id'),
        member_id: required(data.member_id, 'member_id'),
        subscription_id: data.subscription_id || null,
        amount: Number(required(data.amount, 'amount')),
        currency: required(data.currency, 'currency'),
        method: required(data.method, 'method'),
        proof_url: data.proof_url || null,
        recorded_at: data.recorded_at || new Date().toISOString()
      },
      refs: { subscription_id: data.subscription_id || null },
      uniqueIds: [{ scope: 'payment.payment_id', value: required(data.payment_id, 'payment_id') }]
    });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/checkins/log', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: required(data.branch_id, 'branch_id'),
      actorId: data.actor_id || config.defaultActorId,
      eventType: 'checkin.logged',
      subjectKind: 'checkin',
      subjectId: required(data.checkin_id, 'checkin_id'),
      data: {
        tenant_id: tenantId,
        branch_id: required(data.branch_id, 'branch_id'),
        checkin_id: required(data.checkin_id, 'checkin_id'),
        member_id: required(data.member_id, 'member_id'),
        channel: data.channel || 'manual',
        checkin_at: data.checkin_at || new Date().toISOString()
      },
      refs: {},
      uniqueIds: [{ scope: 'checkin.checkin_id', value: required(data.checkin_id, 'checkin_id') }]
    });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/bookings/classes/create', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: required(data.branch_id, 'branch_id'),
      actorId: data.actor_id || config.defaultActorId,
      eventType: 'class.booking.created',
      subjectKind: 'booking',
      subjectId: required(data.booking_id, 'booking_id'),
      data: {
        tenant_id: tenantId,
        branch_id: required(data.branch_id, 'branch_id'),
        booking_id: required(data.booking_id, 'booking_id'),
        class_id: required(data.class_id, 'class_id'),
        booking_kind: data.booking_kind || 'member',
        member_id: data.member_id || null,
        guest_name: data.guest_name || null,
        status: data.status || 'booked',
        booked_at: data.booked_at || new Date().toISOString()
      },
      refs: { subscription_id: data.subscription_id || null },
      uniqueIds: [{ scope: 'booking.booking_id', value: required(data.booking_id, 'booking_id') }]
    });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/pt/packages/assign', async (req, res, next) => {
  try {
    const data = req.body || {};
    const tenantId = data.tenant_id || config.defaultTenantId;
    const event = await appendDomainEvent({
      tenantId,
      branchId: required(data.branch_id, 'branch_id'),
      actorId: data.actor_id || config.defaultActorId,
      eventType: 'pt.package.assigned',
      subjectKind: 'pt_package',
      subjectId: required(data.pt_package_id, 'pt_package_id'),
      data: {
        tenant_id: tenantId,
        branch_id: required(data.branch_id, 'branch_id'),
        pt_package_id: required(data.pt_package_id, 'pt_package_id'),
        member_id: required(data.member_id, 'member_id'),
        trainer_id: data.trainer_id || null,
        total_sessions: Number(required(data.total_sessions, 'total_sessions')),
        assigned_at: data.assigned_at || new Date().toISOString()
      },
      refs: {},
      uniqueIds: [{ scope: 'pt_package.pt_package_id', value: required(data.pt_package_id, 'pt_package_id') }]
    });
    return created(res, { event });
  } catch (error) {
    return next(error);
  }
});

app.post('/v1/projections/run', async (req, res, next) => {
  try {
    const data = req.body || {};
    const result = await runFitnessProjection({
      tenantId: data.tenant_id || config.defaultTenantId,
      branchId: data.branch_id || null
    });
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/members', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const branchId = req.query.branch_id || null;
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const params = [tenantId];
    let sql = `select * from read.rm_member where tenant_id = $1`;
    if (branchId) {
      params.push(branchId);
      sql += ` and branch_id = $2`;
    }
    params.push(limit);
    sql += ` order by updated_at desc limit $${params.length}`;
    const { rows } = await query(sql, params);
    return ok(res, { rows, limit });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/subscriptions/active', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const branchId = req.query.branch_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_subscription_active where tenant_id = $1 and status = 'active'`;
    if (branchId) {
      params.push(branchId);
      sql += ` and branch_id = $2`;
    }
    sql += ` order by end_date asc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/class-availability', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const branchId = req.query.branch_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_class_availability where tenant_id = $1`;
    if (branchId) {
      params.push(branchId);
      sql += ` and branch_id = $2`;
    }
    sql += ` order by start_at asc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/bookings', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const classId = req.query.class_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_booking_list where tenant_id = $1`;
    if (classId) {
      params.push(classId);
      sql += ` and class_id = $2`;
    }
    sql += ` order by booked_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/payments/queue', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const status = req.query.status || 'pending';
    const { rows } = await query(
      `select *
       from read.rm_payment_queue
       where tenant_id = $1 and status = $2
       order by recorded_at asc`,
      [tenantId, status]
    );
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/payments/history', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const memberId = req.query.member_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_payment_history where tenant_id = $1`;
    if (memberId) {
      params.push(memberId);
      sql += ` and member_id = $2`;
    }
    sql += ` order by recorded_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/pt-balance', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const memberId = req.query.member_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_pt_balance where tenant_id = $1`;
    if (memberId) {
      params.push(memberId);
      sql += ` and member_id = $2`;
    }
    sql += ` order by updated_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/pt-activity', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const memberId = req.query.member_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_pt_activity_log where tenant_id = $1`;
    if (memberId) {
      params.push(memberId);
      sql += ` and member_id = $2`;
    }
    sql += ` order by session_at desc nulls last, updated_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/sales/prospects', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const stage = req.query.stage || null;
    const params = [tenantId];
    let sql = `select * from read.rm_sales_prospect where tenant_id = $1`;
    if (stage) {
      params.push(stage);
      sql += ` and stage = $2`;
    }
    sql += ` order by updated_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/tenant/policy', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const { rows } = await query(
      `select *
       from read.rm_tenant_policy
       where tenant_id = $1
       limit 1`,
      [tenantId]
    );
    return ok(res, { row: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/tenant/performance', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 180);
    const { rows } = await query(
      `select *
       from read.rm_tenant_performance
       where tenant_id = $1
       order by performance_date desc
       limit $2`,
      [tenantId, limit]
    );
    return ok(res, { rows, limit });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/actor-network', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const status = req.query.status || null;
    const params = [tenantId];
    let sql = `select * from read.rm_actor_network where tenant_id = $1`;
    if (status) {
      params.push(status);
      sql += ` and status = $2`;
    }
    sql += ` order by updated_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/invitations', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const status = req.query.status || null;
    const params = [tenantId];
    let sql = `select * from read.rm_invitation_queue where tenant_id = $1`;
    if (status) {
      params.push(status);
      sql += ` and status = $2`;
    }
    sql += ` order by updated_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/passport-profiles', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const memberId = req.query.member_id || null;
    const params = [tenantId];
    let sql = `select * from read.rm_passport_profile where tenant_id = $1`;
    if (memberId) {
      params.push(memberId);
      sql += ` and member_id = $2`;
    }
    sql += ` order by updated_at desc`;
    const { rows } = await query(sql, params);
    return ok(res, { rows });
  } catch (error) {
    return next(error);
  }
});

app.get('/v1/read/dashboard', async (req, res, next) => {
  try {
    const tenantId = req.query.tenant_id || config.defaultTenantId;
    const branchId = req.query.branch_id || 'core';
    const date = req.query.dashboard_date || new Date().toISOString().slice(0, 10);
    const { rows } = await query(
      `select *
       from read.rm_dashboard
       where tenant_id = $1 and branch_id = $2 and dashboard_date = $3
       limit 1`,
      [tenantId, branchId, date]
    );
    return ok(res, { row: rows[0] || null });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  return res.status(error.statusCode || 400).json({
    status: 'FAIL',
    error_code: error.errorCode || 'BAD_REQUEST',
    message: error.message
  });
});

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`foremoz-fitness-api listening on :${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
