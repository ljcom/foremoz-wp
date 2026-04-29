import { resolveChainId, resolveNamespaceId } from './event-store.js';
import { withTx } from './db.js';

const PROJECTOR_NAME = 'fitness_v1';

function toDateOnly(value) {
  return String(value || '').slice(0, 10);
}

function normalizeActivityClassType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'open_access' || normalized === 'session_pack') return normalized;
  return 'scheduled';
}

function normalizeActivityUsageMode(value) {
  return String(value || '').trim().toLowerCase() === 'limited' ? 'limited' : 'unlimited';
}

function isTimestampUdtName(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'timestamp' || normalized === 'timestamptz';
}

async function getColumnMetadata(client, tableName, columnName) {
  const { rows } = await client.query(
    `select data_type, udt_name
     from information_schema.columns
     where table_schema = 'read' and table_name = $1 and column_name = $2
     limit 1`,
    [tableName, columnName]
  );
  return rows[0] || null;
}

export async function runFitnessProjection({ tenantId, branchId }) {
  const namespaceId = resolveNamespaceId(tenantId);
  const chainId = resolveChainId(branchId);

  return withTx(async (client) => {
    await client.query(
      `alter table if exists read.rm_owner_setup
         add column if not exists industry_slug text not null default 'active'`
    );
    await client.query(
      `alter table if exists read.rm_owner_saas
         add column if not exists current_package_plan text,
         add column if not exists bought_at timestamptz,
         add column if not exists expires_at date,
         add column if not exists last_term_months integer not null default 0`
    );
    await client.query(
      `alter table if exists read.rm_payment_queue
         add column if not exists reference_type text,
         add column if not exists reference_id text,
         add column if not exists review_note text,
         alter column review_note type text using review_note::text`
    );
    await client.query(
      `alter table if exists read.rm_payment_history
         add column if not exists reference_type text,
         add column if not exists reference_id text,
         add column if not exists review_note text,
         alter column review_note type text using review_note::text`
    );
    await client.query(
      `alter table if exists read.rm_subscription_active
         add column if not exists payment_id text`
    );
    await client.query(
      `create table if not exists read.rm_activity_enrollment (
         tenant_id text not null,
         branch_id text,
         enrollment_id text not null,
         class_id text not null,
         class_type text not null default 'scheduled',
         member_id text not null,
         user_id text not null,
         payment_id text,
         legacy_subscription_id text,
         status text not null,
         purchased_at timestamptz not null,
         enrolled_at timestamptz not null,
         activated_at timestamptz,
         valid_from timestamptz,
         valid_until timestamptz,
         usage_mode text not null default 'unlimited',
         usage_limit integer,
         usage_period text,
         remaining_usage integer,
         updated_at timestamptz not null,
         primary key (tenant_id, enrollment_id)
       )`
    );
    await client.query(
      `create table if not exists read.rm_order_list (
         tenant_id text not null,
         branch_id text,
         order_id text not null,
         member_id text not null,
         sales_owner_id text,
         prospect_id text,
         created_by_role text,
         order_label text not null,
         order_type text not null default 'manual',
         qty integer not null default 1,
         unit_price integer not null default 0,
         total_amount integer not null default 0,
         currency text not null default 'IDR',
         status text not null default 'pending_payment',
         payment_id text,
         payment_status text,
         payment_method text,
         payment_responsibility text,
         reference_type text,
         reference_id text,
         item_count integer not null default 1,
         order_items jsonb,
         notes text,
         created_at timestamptz not null,
         updated_at timestamptz not null,
         primary key (tenant_id, order_id)
       )`
    );
    await client.query(
      `create table if not exists read.rm_member_history_override (
         tenant_id text not null,
         branch_id text not null default 'all',
         member_id text not null,
         history_key text not null,
         kind text,
         source_id text,
         source_name text,
         full_name text,
         email text,
         participant_no text,
         registration_id text,
         status text,
         linked_status text,
         booked_at timestamptz,
         checked_in_at timestamptz,
         checked_out_at timestamptz,
         updated_at timestamptz not null,
         primary key (tenant_id, branch_id, history_key)
       )`
    );
    await client.query(
      `create index if not exists idx_rm_member_history_member
       on read.rm_member_history_override (tenant_id, branch_id, member_id, updated_at desc)`
    );
    await client.query(
      `alter table if exists read.rm_order_list
         add column if not exists sales_owner_id text,
         add column if not exists prospect_id text,
         add column if not exists created_by_role text,
         add column if not exists payment_responsibility text,
         add column if not exists item_count integer not null default 1,
         add column if not exists order_items jsonb`
    );
    await client.query(
      `alter table if exists read.rm_class_availability
         add column if not exists title text not null default '',
         add column if not exists description text,
         add column if not exists class_type text not null default 'scheduled',
         add column if not exists has_coach boolean not null default false,
         add column if not exists coach_id text,
         add column if not exists category_id text,
         add column if not exists capacity_mode text not null default 'limited',
         add column if not exists quota_mode text not null default 'none',
         add column if not exists validity_mode text not null default 'fixed',
         add column if not exists start_date date,
         add column if not exists end_date date,
         add column if not exists registration_start timestamptz,
         add column if not exists registration_end timestamptz,
         add column if not exists usage_mode text not null default 'unlimited',
         add column if not exists usage_limit integer,
         add column if not exists usage_period text,
         add column if not exists validity_unit text,
         add column if not exists validity_value integer,
         add column if not exists validity_anchor text,
         add column if not exists min_quota integer,
         add column if not exists max_quota integer,
         add column if not exists auto_start_when_quota_met boolean not null default false`
    );
    await client.query(
      `alter table if exists read.rm_class_availability
         alter column start_at drop not null,
         alter column end_at drop not null`
    );
    await client.query(
      `alter table if exists read.rm_booking_list
         add column if not exists payment_id text,
         add column if not exists registration_answers jsonb,
         add column if not exists schedule_choice jsonb,
         add column if not exists schedule_label text,
         add column if not exists attendance_checked_in_at timestamptz,
         add column if not exists attendance_checked_out_at timestamptz`
    );
    await client.query(
      `alter table if exists read.rm_class_availability
         add column if not exists custom_fields jsonb`
    );
    await client.query(
      `alter table if exists read.rm_pt_balance
         add column if not exists payment_id text`
    );
    await client.query(
      `alter table if exists read.rm_pt_activity_log
         add column if not exists pt_package_id text,
         add column if not exists activity_type text not null default 'activity_logged',
         add column if not exists completed_at timestamptz,
         add column if not exists custom_fields jsonb`
    );
    await client.query(
      `alter table if exists read.rm_tenant_user_auth
         add column if not exists photo_url text`
    );
    await client.query(
      `alter table if exists read.rm_sales_prospect
         add column if not exists email text,
         add column if not exists id_card text,
         add column if not exists notes text,
         add column if not exists custom_fields jsonb,
         add column if not exists next_followup_at timestamptz,
         add column if not exists last_contact_at timestamptz,
         add column if not exists converted_at timestamptz`
    );
    await client.query(
      `create index if not exists idx_rm_subscription_payment
       on read.rm_subscription_active (tenant_id, payment_id)`
    );
    await client.query(
      `create index if not exists idx_rm_activity_enrollment_member
       on read.rm_activity_enrollment (tenant_id, member_id, status, valid_until)`
    );
    await client.query(
      `create index if not exists idx_rm_activity_enrollment_class
       on read.rm_activity_enrollment (tenant_id, class_id, status, updated_at desc)`
    );
    await client.query(
      `create index if not exists idx_rm_activity_enrollment_payment
       on read.rm_activity_enrollment (tenant_id, payment_id)`
    );
    await client.query(
      `create index if not exists idx_rm_order_member
       on read.rm_order_list (tenant_id, member_id, updated_at desc)`
    );
    await client.query(
      `create index if not exists idx_rm_order_sales_owner
       on read.rm_order_list (tenant_id, sales_owner_id, updated_at desc)`
    );
    await client.query(
      `create index if not exists idx_rm_order_prospect
       on read.rm_order_list (tenant_id, prospect_id, updated_at desc)`
    );
    await client.query(
      `create index if not exists idx_rm_booking_payment
       on read.rm_booking_list (tenant_id, payment_id)`
    );
    await client.query(
      `create index if not exists idx_rm_pt_balance_payment
       on read.rm_pt_balance (tenant_id, payment_id)`
    );
    await client.query(
      `create index if not exists idx_rm_pt_balance_trainer
       on read.rm_pt_balance (tenant_id, trainer_id, updated_at desc)`
    );
    await client.query(
      `create index if not exists idx_rm_pt_activity_trainer
       on read.rm_pt_activity_log (tenant_id, trainer_id, session_at desc)`
    );
    await client.query(
      `create index if not exists idx_rm_sales_owner
       on read.rm_sales_prospect (tenant_id, owner_sales_id, updated_at desc)`
    );

    await client.query(
      `insert into read.rm_checkpoint (projector_name, namespace_id, chain_id, last_sequence)
       values ($1, $2, $3, 0)
       on conflict (projector_name, namespace_id, chain_id) do nothing`,
      [PROJECTOR_NAME, namespaceId, chainId]
    );

    const { rows: checkpointRows } = await client.query(
      `select last_sequence
       from read.rm_checkpoint
       where projector_name = $1 and namespace_id = $2 and chain_id = $3
       for update`,
      [PROJECTOR_NAME, namespaceId, chainId]
    );

    const lastSequence = Number(checkpointRows[0]?.last_sequence || 0);

    const { rows: eventRows } = await client.query(
      `select sequence, event_type, event_time, payload
       from eventdb_event
       where namespace_id = $1 and chain_id = $2 and sequence > $3
       order by sequence asc`,
      [namespaceId, chainId, lastSequence]
    );

    const queueReviewNoteMeta = await getColumnMetadata(client, 'rm_payment_queue', 'review_note');
    const historyReviewNoteMeta = await getColumnMetadata(client, 'rm_payment_history', 'review_note');
    const queueReviewNoteIsTimestamp = isTimestampUdtName(queueReviewNoteMeta?.udt_name);
    const historyReviewNoteIsTimestamp = isTimestampUdtName(historyReviewNoteMeta?.udt_name);

    let applied = 0;
    for (const event of eventRows) {
      const payload = event.payload || {};
      const data = payload.data || {};
      const refs = payload.refs || {};
      const eventTs = payload.ts || event.event_time;
      const tenant = data.tenant_id || tenantId;
      const branch = data.branch_id || branchId || 'core';

      if (event.event_type === 'member.registered') {
        await client.query(
          `insert into read.rm_member (
             tenant_id, branch_id, member_id, full_name, phone, email, status, registered_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (tenant_id, member_id) do update set
             branch_id = excluded.branch_id,
             full_name = excluded.full_name,
             phone = excluded.phone,
             email = excluded.email,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [tenant, branch, data.member_id, data.full_name, data.phone || null, data.email || null, data.status || 'active', eventTs, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'member.updated') {
        const patch = data.patch || {};
        await client.query(
          `update read.rm_member
           set full_name = coalesce($3, full_name),
               phone = coalesce($4, phone),
               email = coalesce($5, email),
               status = coalesce($6, status),
               updated_at = $7
           where tenant_id = $1 and member_id = $2`,
          [tenant, data.member_id, patch.full_name || null, patch.phone || null, patch.email || null, patch.status || null, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'member.auth.registered') {
        await client.query(
          `insert into read.rm_member_auth (
             tenant_id, member_id, email, password_hash, status,
             registered_at, password_changed_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,null,$7)
           on conflict (tenant_id, member_id) do update set
             email = excluded.email,
             password_hash = excluded.password_hash,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.member_id,
            data.email,
            data.password_hash,
            data.status || 'active',
            data.registered_at || eventTs,
            eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'member.auth.password.changed') {
        await client.query(
          `update read.rm_member_auth
           set password_hash = $3,
               password_changed_at = $4,
               updated_at = $4
           where tenant_id = $1 and member_id = $2`,
          [tenant, data.member_id, data.password_hash, data.changed_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.user.created') {
        await client.query(
          `insert into read.rm_tenant_user_auth (
             tenant_id, user_id, full_name, email, role, password_hash, status, photo_url, created_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           on conflict (tenant_id, user_id) do update set
             full_name = excluded.full_name,
             email = excluded.email,
             role = excluded.role,
             password_hash = excluded.password_hash,
             status = excluded.status,
             photo_url = coalesce(excluded.photo_url, read.rm_tenant_user_auth.photo_url),
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.user_id,
            data.full_name,
            data.email,
            data.role || 'owner',
            data.password_hash,
            data.status || 'active',
            data.photo_url || null,
            data.created_at || eventTs,
            eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.user.password.changed') {
        await client.query(
          `update read.rm_tenant_user_auth
           set password_hash = $3,
               updated_at = $4
           where tenant_id = $1 and user_id = $2`,
          [tenant, data.user_id, data.password_hash, data.changed_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.user.updated') {
        await client.query(
          `update read.rm_tenant_user_auth
           set full_name = coalesce($3, full_name),
               role = coalesce($4, role),
               status = coalesce($5, status),
               photo_url = coalesce($6, photo_url),
               updated_at = $7
           where tenant_id = $1 and user_id = $2`,
          [tenant, data.user_id, data.full_name || null, data.role || null, data.status || null, data.photo_url || null, data.updated_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.user.deleted') {
        await client.query(
          `update read.rm_tenant_user_auth
           set status = 'deleted',
               updated_at = $3
           where tenant_id = $1 and user_id = $2`,
          [tenant, data.user_id, data.deleted_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.tenant.setup.saved') {
        await client.query(
          `insert into read.rm_owner_setup (
             tenant_id, gym_name, branch_id, account_slug, address, city, photo_url, package_plan, industry_slug, status, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)
           on conflict (tenant_id) do update set
             gym_name = excluded.gym_name,
             branch_id = excluded.branch_id,
             account_slug = excluded.account_slug,
             address = excluded.address,
             city = excluded.city,
             photo_url = excluded.photo_url,
             package_plan = excluded.package_plan,
             industry_slug = excluded.industry_slug,
             status = 'active',
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.gym_name,
            data.branch_id,
            data.account_slug,
            data.address || null,
            data.city || null,
            data.photo_url || null,
            data.package_plan || 'free',
            String(data.industry_slug || '').trim().toLowerCase() || 'active',
            data.saved_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.tenant.setup.deleted') {
        await client.query(
          `update read.rm_owner_setup
           set status = 'deleted',
               updated_at = $2
           where tenant_id = $1`,
          [tenant, data.deleted_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'owner.saas.extended') {
        await client.query(
          `insert into read.rm_owner_saas (
             tenant_id, total_months, current_package_plan, last_term_months, bought_at, expires_at, last_note, last_extended_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$8)
           on conflict (tenant_id) do update set
             total_months = read.rm_owner_saas.total_months + excluded.total_months,
             current_package_plan = excluded.current_package_plan,
             last_term_months = excluded.last_term_months,
             bought_at = excluded.bought_at,
             expires_at = excluded.expires_at,
             last_note = excluded.last_note,
             last_extended_at = excluded.last_extended_at,
             updated_at = excluded.updated_at`,
          [
            tenant,
            Number(data.months || 0),
            data.package_plan || null,
            Number(data.last_term_months || data.months || 0),
            data.bought_at || data.extended_at || eventTs,
            data.expires_at || null,
            data.note || null,
            data.extended_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'subscription.activated') {
        await client.query(
          `insert into read.rm_subscription_active (
             tenant_id, branch_id, subscription_id, member_id, plan_id, payment_id, status,
             start_date, end_date, freeze_until, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           on conflict (tenant_id, subscription_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             plan_id = excluded.plan_id,
             payment_id = excluded.payment_id,
             status = excluded.status,
             start_date = excluded.start_date,
             end_date = excluded.end_date,
             freeze_until = excluded.freeze_until,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.subscription_id,
            data.member_id,
            data.plan_id,
            refs.payment_id || null,
            data.status || 'active',
            data.start_date,
            data.end_date,
            null,
            eventTs
          ]
        );
        const candidateClassIds = [...new Set(
          [data.class_id, data.plan_id]
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )];
        if (candidateClassIds.length > 0) {
          const { rows: activityRows } = await client.query(
            `select class_id, class_type, usage_mode, usage_limit, usage_period
             from read.rm_class_availability
             where tenant_id = $1
               and class_id = any($2::text[])
             order by updated_at desc
             limit 1`,
            [tenant, candidateClassIds]
          );
          const activityRow = activityRows[0] || null;
          if (activityRow) {
            const classType = normalizeActivityClassType(activityRow.class_type);
            await client.query(
              `insert into read.rm_activity_enrollment (
                 tenant_id, branch_id, enrollment_id, class_id, class_type, member_id, user_id,
                 payment_id, legacy_subscription_id, status, purchased_at, enrolled_at,
                 activated_at, valid_from, valid_until, usage_mode, usage_limit, usage_period,
                 remaining_usage, updated_at
               ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14,$15,$16,$17,$18,$19)
               on conflict (tenant_id, enrollment_id) do update set
                 branch_id = excluded.branch_id,
                 class_id = excluded.class_id,
                 class_type = excluded.class_type,
                 member_id = excluded.member_id,
                 user_id = excluded.user_id,
                 payment_id = excluded.payment_id,
                 legacy_subscription_id = excluded.legacy_subscription_id,
                 status = excluded.status,
                 activated_at = excluded.activated_at,
                 valid_from = excluded.valid_from,
                 valid_until = excluded.valid_until,
                 usage_mode = excluded.usage_mode,
                 usage_limit = excluded.usage_limit,
                 usage_period = excluded.usage_period,
                 remaining_usage = excluded.remaining_usage,
                 updated_at = excluded.updated_at`,
              [
                tenant,
                branch,
                data.subscription_id,
                activityRow.class_id,
                classType,
                data.member_id,
                data.member_id,
                refs.payment_id || null,
                data.subscription_id,
                data.status || 'active',
                data.start_date || eventTs,
                data.start_date || eventTs,
                data.start_date || null,
                data.start_date || null,
                data.end_date || null,
                normalizeActivityUsageMode(activityRow.usage_mode),
                activityRow.usage_limit ?? null,
                activityRow.usage_period || null,
                normalizeActivityUsageMode(activityRow.usage_mode) === 'limited'
                  ? Number(activityRow.usage_limit || 0)
                  : null,
                eventTs
              ]
            );
          }
        }
        applied += 1;
        continue;
      }

      if (event.event_type === 'subscription.extended') {
        await client.query(
          `update read.rm_subscription_active
           set end_date = $3,
               updated_at = $4
           where tenant_id = $1 and subscription_id = $2`,
          [tenant, data.subscription_id, data.new_end_date, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'subscription.frozen') {
        await client.query(
          `update read.rm_subscription_active
           set status = 'frozen',
               freeze_until = $3,
               updated_at = $4
           where tenant_id = $1 and subscription_id = $2`,
          [tenant, data.subscription_id, data.freeze_end_date, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'subscription.unfrozen') {
        await client.query(
          `update read.rm_subscription_active
           set status = 'active',
               freeze_until = null,
               updated_at = $3
           where tenant_id = $1 and subscription_id = $2`,
          [tenant, data.subscription_id, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'subscription.expired') {
        await client.query(
          `update read.rm_subscription_active
           set status = 'expired',
               updated_at = $3
           where tenant_id = $1 and subscription_id = $2`,
          [tenant, data.subscription_id, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'activity.enrollment.upserted') {
        const classType = normalizeActivityClassType(data.class_type);
        const usageMode = normalizeActivityUsageMode(data.usage_mode);
        await client.query(
          `insert into read.rm_activity_enrollment (
             tenant_id, branch_id, enrollment_id, class_id, class_type, member_id, user_id,
             payment_id, legacy_subscription_id, status, purchased_at, enrolled_at,
             activated_at, valid_from, valid_until, usage_mode, usage_limit, usage_period,
             remaining_usage, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           on conflict (tenant_id, enrollment_id) do update set
             branch_id = excluded.branch_id,
             class_id = excluded.class_id,
             class_type = excluded.class_type,
             member_id = excluded.member_id,
             user_id = excluded.user_id,
             payment_id = excluded.payment_id,
             legacy_subscription_id = excluded.legacy_subscription_id,
             status = excluded.status,
             purchased_at = excluded.purchased_at,
             enrolled_at = excluded.enrolled_at,
             activated_at = excluded.activated_at,
             valid_from = excluded.valid_from,
             valid_until = excluded.valid_until,
             usage_mode = excluded.usage_mode,
             usage_limit = excluded.usage_limit,
             usage_period = excluded.usage_period,
             remaining_usage = excluded.remaining_usage,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.enrollment_id,
            data.class_id,
            classType,
            data.member_id || data.user_id,
            data.user_id || data.member_id,
            refs.payment_id || data.payment_id || null,
            data.legacy_subscription_id || null,
            data.status || 'active',
            data.purchased_at || eventTs,
            data.enrolled_at || data.purchased_at || eventTs,
            data.activated_at || null,
            data.valid_from || null,
            data.valid_until || null,
            usageMode,
            data.usage_limit ?? null,
            data.usage_period || null,
            usageMode === 'limited' ? Number(data.remaining_usage ?? data.usage_limit ?? 0) : null,
            eventTs
          ]
        );

        if (classType === 'open_access') {
          const subscriptionId = String(data.legacy_subscription_id || data.enrollment_id || '').trim();
          if (subscriptionId) {
            await client.query(
              `insert into read.rm_subscription_active (
                 tenant_id, branch_id, subscription_id, member_id, plan_id, payment_id, status,
                 start_date, end_date, freeze_until, updated_at
               ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,$10)
               on conflict (tenant_id, subscription_id) do update set
                 branch_id = excluded.branch_id,
                 member_id = excluded.member_id,
                 plan_id = excluded.plan_id,
                 payment_id = excluded.payment_id,
                 status = excluded.status,
                 start_date = excluded.start_date,
                 end_date = excluded.end_date,
                 freeze_until = excluded.freeze_until,
                 updated_at = excluded.updated_at`,
              [
                tenant,
                branch,
                subscriptionId,
                data.member_id || data.user_id,
                data.class_id,
                refs.payment_id || data.payment_id || null,
                data.status || 'active',
                toDateOnly(data.valid_from || data.activated_at || data.purchased_at || eventTs),
                toDateOnly(data.valid_until || data.valid_from || data.activated_at || data.purchased_at || eventTs),
                eventTs
              ]
            );
          }
        }
        applied += 1;
        continue;
      }

      if (event.event_type === 'payment.recorded' || event.event_type === 'payment.updated') {
        const orderId = String(refs.order_id || data.order_id || '').trim() || null;
        const queueStatus = String(data.status || 'pending').trim().toLowerCase() || 'pending';
        const reviewNote = data.review_note || data.note || null;
        const queueReviewNoteValue = queueReviewNoteIsTimestamp ? null : reviewNote;
        const historyReviewNoteValue = historyReviewNoteIsTimestamp ? null : reviewNote;
        await client.query(
          `insert into read.rm_payment_queue (
             tenant_id, branch_id, payment_id, member_id, subscription_id,
             amount, currency, method, proof_url, reference_type, reference_id, status,
             recorded_at, reviewed_at, reviewed_by, review_note, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,null,null,null,$12)
           on conflict (tenant_id, payment_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             subscription_id = excluded.subscription_id,
             amount = excluded.amount,
             currency = excluded.currency,
             method = excluded.method,
             proof_url = excluded.proof_url,
             reference_type = excluded.reference_type,
             reference_id = excluded.reference_id,
             status = $13,
             review_note = $14,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.payment_id,
            data.member_id,
            data.subscription_id || null,
            data.amount,
            data.currency,
            data.method,
            data.proof_url || null,
            data.reference_type || null,
            data.reference_id || null,
            data.recorded_at || eventTs,
            queueStatus,
            queueReviewNoteValue
          ]
        );
        await client.query(
          `insert into read.rm_payment_history (
             tenant_id, payment_id, member_id, amount, currency, reference_type, reference_id, review_note, status, recorded_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
           on conflict (tenant_id, payment_id) do update set
             member_id = excluded.member_id,
             amount = excluded.amount,
             currency = excluded.currency,
             reference_type = excluded.reference_type,
             reference_id = excluded.reference_id,
             review_note = $8,
             status = $9,
             recorded_at = excluded.recorded_at,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.payment_id,
            data.member_id,
            data.amount,
            data.currency,
            data.reference_type || null,
            data.reference_id || null,
            historyReviewNoteValue,
            queueStatus,
            data.recorded_at || eventTs
          ]
        );
        if (orderId) {
          await client.query(
            `update read.rm_order_list
             set payment_id = $3,
                 payment_status = $4,
                 payment_method = $5,
                 status = case
                   when lower(status) in ('paid', 'completed') then status
                   when $4 = 'deleted' then 'deleted'
                   else 'pending_payment'
                 end,
                 updated_at = $6
             where tenant_id = $1 and order_id = $2`,
            [tenant, orderId, data.payment_id, queueStatus, data.method || null, data.recorded_at || eventTs]
          );
        }
        applied += 1;
        continue;
      }

      if (event.event_type === 'payment.confirmed' || event.event_type === 'payment.rejected') {
        const paymentStatus = event.event_type === 'payment.confirmed' ? 'confirmed' : 'rejected';
        const reviewedAt = data.confirmed_at || data.rejected_at || eventTs;
        const reviewNote = data.note || data.reason || null;
        const queueReviewNoteValue = queueReviewNoteIsTimestamp ? null : reviewNote;
        await client.query(
          `update read.rm_payment_queue
           set status = $3,
               reviewed_at = $4,
               reviewed_by = $5,
               review_note = $6,
               updated_at = $4
           where tenant_id = $1 and payment_id = $2`,
          [
            tenant,
            data.payment_id,
            paymentStatus,
            reviewedAt,
            data.confirmed_by || data.rejected_by || payload.actor?.id || null,
            queueReviewNoteValue
          ]
        );
        await client.query(
          `insert into read.rm_payment_history (
             tenant_id, payment_id, member_id, amount, currency, reference_type, reference_id, review_note, status, recorded_at, updated_at
           )
           select tenant_id, payment_id, member_id, amount, currency, reference_type, reference_id, ${
             historyReviewNoteIsTimestamp ? 'null' : 'review_note'
           }, $3, recorded_at, $4
           from read.rm_payment_queue
           where tenant_id = $1 and payment_id = $2
           on conflict (tenant_id, payment_id) do update set
             reference_type = excluded.reference_type,
             reference_id = excluded.reference_id,
             review_note = excluded.review_note,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [tenant, data.payment_id, paymentStatus, reviewedAt]
        );
        const orderId = String(refs.order_id || data.order_id || '').trim() || null;
        if (orderId) {
          await client.query(
            `update read.rm_order_list
             set payment_status = $3,
                 status = $4,
                 updated_at = $5
             where tenant_id = $1 and order_id = $2`,
            [tenant, orderId, paymentStatus, paymentStatus === 'confirmed' ? 'paid' : 'payment_rejected', reviewedAt]
          );
        }
        applied += 1;
        continue;
      }

      if (event.event_type === 'order.created' || event.event_type === 'order.updated') {
        await client.query(
          `insert into read.rm_order_list (
             tenant_id, branch_id, order_id, member_id, sales_owner_id, prospect_id, created_by_role, order_label, order_type,
             qty, unit_price, total_amount, currency, status, payment_id,
             payment_status, payment_method, payment_responsibility, reference_type, reference_id,
             item_count, order_items, notes, created_at, updated_at
           ) values (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,
             $10,$11,$12,$13,$14,$15,
             $16,$17,$18,$19,$20,
             $21,$22,$23,$24,$25
           )
           on conflict (tenant_id, order_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             sales_owner_id = excluded.sales_owner_id,
             prospect_id = excluded.prospect_id,
             created_by_role = excluded.created_by_role,
             order_label = excluded.order_label,
             order_type = excluded.order_type,
             qty = excluded.qty,
             unit_price = excluded.unit_price,
             total_amount = excluded.total_amount,
             currency = excluded.currency,
             status = excluded.status,
             payment_id = excluded.payment_id,
             payment_status = excluded.payment_status,
             payment_method = excluded.payment_method,
             payment_responsibility = excluded.payment_responsibility,
             reference_type = excluded.reference_type,
             reference_id = excluded.reference_id,
             item_count = excluded.item_count,
             order_items = excluded.order_items,
             notes = excluded.notes,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.order_id,
            data.member_id,
            data.sales_owner_id || null,
            data.prospect_id || null,
            data.created_by_role || null,
            data.order_label || data.label || data.order_id,
            data.order_type || 'manual',
            Number(data.qty || 1),
            Number(data.unit_price || 0),
            Number(data.total_amount || 0),
            data.currency || 'IDR',
            data.status || 'pending_payment',
            data.payment_id || null,
            data.payment_status || null,
            data.payment_method || null,
            data.payment_responsibility || null,
            data.reference_type || null,
            data.reference_id || null,
            Number(data.item_count || 1),
            Array.isArray(data.order_items) ? JSON.stringify(data.order_items) : null,
            data.notes || null,
            data.created_at || eventTs,
            eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'checkin.logged') {
        const attendanceDate = toDateOnly(data.checkin_at || eventTs);
        await client.query(
          `insert into read.rm_attendance_daily (
             tenant_id, branch_id, attendance_date, total_checkin, unique_member_count, updated_at
           ) values ($1,$2,$3,1,1,$4)
           on conflict (tenant_id, branch_id, attendance_date) do update set
             total_checkin = read.rm_attendance_daily.total_checkin + 1,
             unique_member_count = (
               select count(distinct (e.payload->'data'->>'member_id'))
               from eventdb_event e
               where e.namespace_id = $5
                 and e.chain_id = $6
                 and e.event_type = 'checkin.logged'
                 and (e.payload->'data'->>'branch_id') = $2
                 and (e.payload->'data'->>'checkin_at')::date = $3::date
             ),
             updated_at = $4`,
          [tenant, branch, attendanceDate, eventTs, namespaceId, chainId]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.scheduled') {
        const classType = normalizeActivityClassType(data.class_type);
        const normalizedCapacity = Number(
          data.capacity
          ?? data.max_quota
          ?? (classType === 'scheduled' ? 20 : 0)
        );
        await client.query(
          `insert into read.rm_class_availability (
             tenant_id, branch_id, class_id, class_name, title, description, class_type,
             has_coach, coach_id, category_id, capacity_mode, quota_mode, validity_mode,
             start_date, end_date, registration_start, registration_end, start_at, end_at,
             capacity, usage_mode, usage_limit, usage_period, validity_unit, validity_value,
             validity_anchor, min_quota, max_quota, auto_start_when_quota_met,
             custom_fields, booked_count, available_slots, updated_at
           ) values (
             $1,$2,$3,$4,$5,$6,$7,
             $8,$9,$10,$11,$12,$13,
             $14,$15,$16,$17,$18,$19,
             $20,$21,$22,$23,$24,$25,
             $26,$27,$28,$29,$30,
             0,
             case when $7 = 'scheduled' then greatest(0, $20) else greatest(0, coalesce($28, 0)) end,
             $31
           )
           on conflict (tenant_id, class_id) do update set
             branch_id = excluded.branch_id,
             class_name = excluded.class_name,
             title = excluded.title,
             description = excluded.description,
             class_type = excluded.class_type,
             has_coach = excluded.has_coach,
             coach_id = excluded.coach_id,
             category_id = excluded.category_id,
             capacity_mode = excluded.capacity_mode,
             quota_mode = excluded.quota_mode,
             validity_mode = excluded.validity_mode,
             start_date = excluded.start_date,
             end_date = excluded.end_date,
             registration_start = excluded.registration_start,
             registration_end = excluded.registration_end,
             start_at = excluded.start_at,
             end_at = excluded.end_at,
             capacity = excluded.capacity,
             usage_mode = excluded.usage_mode,
             usage_limit = excluded.usage_limit,
             usage_period = excluded.usage_period,
             validity_unit = excluded.validity_unit,
             validity_value = excluded.validity_value,
             validity_anchor = excluded.validity_anchor,
             min_quota = excluded.min_quota,
             max_quota = excluded.max_quota,
             auto_start_when_quota_met = excluded.auto_start_when_quota_met,
             custom_fields = excluded.custom_fields,
             available_slots = case
               when excluded.class_type = 'scheduled'
                 then greatest(0, excluded.capacity - read.rm_class_availability.booked_count)
               else greatest(0, coalesce(excluded.max_quota, 0) - read.rm_class_availability.booked_count)
             end,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.class_id,
            data.class_name,
            data.title || data.class_name,
            data.description || null,
            classType,
            Boolean(data.has_coach),
            data.coach_id || null,
            data.category_id || data.category || null,
            data.capacity_mode || 'limited',
            data.quota_mode || 'none',
            data.validity_mode || (classType === 'scheduled' ? 'fixed' : 'rolling'),
            data.start_date || null,
            data.end_date || null,
            data.registration_start || null,
            data.registration_end || null,
            data.start_at || null,
            data.end_at || null,
            Number.isFinite(normalizedCapacity) ? normalizedCapacity : 0,
            normalizeActivityUsageMode(data.usage_mode),
            data.usage_limit ?? null,
            data.usage_period || null,
            data.validity_unit || null,
            data.validity_value ?? null,
            data.validity_anchor || null,
            data.min_quota ?? null,
            data.max_quota ?? null,
            Boolean(data.auto_start_when_quota_met),
            JSON.stringify(data.custom_fields || {}),
            eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.deleted') {
        await client.query(
          `delete from read.rm_class_availability
           where tenant_id = $1 and class_id = $2`,
          [tenant, data.class_id]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.booking.created') {
        await client.query(
          `insert into read.rm_booking_list (
             tenant_id, branch_id, booking_id, class_id, booking_kind,
             member_id, guest_name, payment_id, registration_answers, status, booked_at,
             schedule_choice, schedule_label, canceled_at, attendance_confirmed_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,null,null,$11)
           on conflict (tenant_id, booking_id) do update set
             payment_id = excluded.payment_id,
             registration_answers = excluded.registration_answers,
             schedule_choice = excluded.schedule_choice,
             schedule_label = excluded.schedule_label,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.booking_id,
            data.class_id,
            data.booking_kind,
            data.member_id || null,
            data.guest_name || null,
            refs.payment_id || null,
            JSON.stringify(data.registration_answers || {}),
            data.status || 'booked',
            data.booked_at || eventTs
            ,
            JSON.stringify(data.schedule_choice || null),
            data.schedule_label || null
          ]
        );

        await client.query(
          `update read.rm_class_availability
           set booked_count = booked_count + 1,
               available_slots = greatest(0, capacity - (booked_count + 1)),
               updated_at = $3
           where tenant_id = $1 and class_id = $2`,
          [tenant, data.class_id, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.booking.canceled') {
        await client.query(
          `update read.rm_booking_list
           set status = 'canceled',
               canceled_at = $3,
               updated_at = $3
           where tenant_id = $1 and booking_id = $2`,
          [tenant, data.booking_id, data.canceled_at || eventTs]
        );

        await client.query(
          `update read.rm_class_availability
           set booked_count = greatest(0, booked_count - 1),
               available_slots = greatest(0, capacity - greatest(0, booked_count - 1)),
               updated_at = $3
           where tenant_id = $1 and class_id = $2`,
          [tenant, data.class_id, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.attendance.confirmed' || event.event_type === 'class.attendance.checked_in') {
        await client.query(
          `update read.rm_booking_list
           set attendance_confirmed_at = $3,
               attendance_checked_in_at = $3,
               updated_at = $3
           where tenant_id = $1 and booking_id = $2`,
          [tenant, data.booking_id, data.checked_in_at || data.confirmed_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.attendance.checked_out') {
        await client.query(
          `update read.rm_booking_list
           set attendance_checked_out_at = $3,
               registration_answers = coalesce(registration_answers, '{}'::jsonb) || $4::jsonb,
               updated_at = $3
           where tenant_id = $1 and booking_id = $2`,
          [
            tenant,
            data.booking_id,
            data.checked_out_at || eventTs,
            JSON.stringify(data.custom_fields || {})
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'pt.package.assigned') {
        await client.query(
          `insert into read.rm_pt_balance (
             tenant_id, branch_id, pt_package_id, member_id, trainer_id,
             total_sessions, consumed_sessions, remaining_sessions, payment_id, last_session_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,0,$6,$7,null,$8)
           on conflict (tenant_id, pt_package_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             trainer_id = excluded.trainer_id,
             total_sessions = excluded.total_sessions,
             remaining_sessions = excluded.remaining_sessions,
             payment_id = excluded.payment_id,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.pt_package_id,
            data.member_id,
            data.trainer_id || null,
            data.total_sessions,
            refs.payment_id || null,
            data.assigned_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'pt.session.completed') {
        await client.query(
          `update read.rm_pt_balance
           set consumed_sessions = consumed_sessions + 1,
               remaining_sessions = greatest(0, total_sessions - (consumed_sessions + 1)),
               last_session_at = $3,
               updated_at = $3
           where tenant_id = $1 and pt_package_id = $2`,
          [tenant, data.pt_package_id, data.completed_at || eventTs]
        );
        const activityId = data.session_id || data.completion_id || `${event.event_type}:${event.sequence}`;
        await client.query(
          `insert into read.rm_pt_activity_log (
             tenant_id, activity_id, pt_package_id, member_id, trainer_id, session_id,
             activity_type, activity_note, custom_fields, session_at, completed_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           on conflict (tenant_id, activity_id) do update set
             pt_package_id = excluded.pt_package_id,
             member_id = excluded.member_id,
             trainer_id = excluded.trainer_id,
             session_id = excluded.session_id,
             activity_type = excluded.activity_type,
             activity_note = excluded.activity_note,
             custom_fields = excluded.custom_fields,
             session_at = excluded.session_at,
             completed_at = excluded.completed_at,
             updated_at = excluded.updated_at`,
          [
            tenant,
            activityId,
            data.pt_package_id || null,
            data.member_id,
            data.trainer_id || null,
            data.session_id || null,
            'session_completed',
            data.activity_note || data.note || null,
            JSON.stringify(data.custom_fields || {}),
            data.completed_at || eventTs,
            data.completed_at || eventTs,
            eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'pt.session.booked' || event.event_type === 'pt.activity.logged') {
        const activityId = data.activity_id || data.session_id || `${event.event_type}:${event.sequence}`;
        await client.query(
          `insert into read.rm_pt_activity_log (
             tenant_id, activity_id, pt_package_id, member_id, trainer_id, session_id,
             activity_type, activity_note, custom_fields, session_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           on conflict (tenant_id, activity_id) do update set
             pt_package_id = excluded.pt_package_id,
             member_id = excluded.member_id,
             trainer_id = excluded.trainer_id,
             session_id = excluded.session_id,
             activity_type = excluded.activity_type,
             activity_note = excluded.activity_note,
             custom_fields = excluded.custom_fields,
             session_at = excluded.session_at,
             updated_at = excluded.updated_at`,
          [
            tenant,
            activityId,
            data.pt_package_id || null,
            data.member_id,
            data.trainer_id || null,
            data.session_id || null,
            event.event_type === 'pt.session.booked' ? 'session_booked' : 'activity_logged',
            data.activity_note || data.note || null,
            JSON.stringify(data.custom_fields || {}),
            data.session_at || data.booked_at || data.logged_at || eventTs,
            eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'sales.prospect.created') {
        await client.query(
          `insert into read.rm_sales_prospect (
             tenant_id, prospect_id, full_name, email, phone, id_card, source, stage,
             owner_sales_id, converted_member_id, notes, custom_fields,
             next_followup_at, last_contact_at, converted_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,$10,$11,$12,$13,null,$14)
           on conflict (tenant_id, prospect_id) do update set
             full_name = excluded.full_name,
             email = excluded.email,
             phone = excluded.phone,
             id_card = excluded.id_card,
             source = excluded.source,
             stage = excluded.stage,
             owner_sales_id = excluded.owner_sales_id,
             notes = excluded.notes,
             custom_fields = excluded.custom_fields,
             next_followup_at = excluded.next_followup_at,
             last_contact_at = excluded.last_contact_at,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.prospect_id,
            data.full_name,
            data.email || null,
            data.phone || null,
            data.id_card || null,
            data.source || null,
            data.stage || 'new',
            data.owner_sales_id || null,
            data.notes || null,
            JSON.stringify(data.custom_fields || {}),
            data.next_followup_at || null,
            data.last_contact_at || null,
            data.updated_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'sales.prospect.updated' || event.event_type === 'sales.prospect.followup.logged') {
        await client.query(
          `update read.rm_sales_prospect
           set full_name = coalesce($3, full_name),
               email = coalesce($4, email),
               phone = coalesce($5, phone),
               id_card = coalesce($6, id_card),
               source = coalesce($7, source),
               stage = coalesce($8, stage),
               owner_sales_id = coalesce($9, owner_sales_id),
               notes = coalesce($10, notes),
               custom_fields = coalesce($11::jsonb, custom_fields),
               next_followup_at = coalesce($12, next_followup_at),
               last_contact_at = coalesce($13, last_contact_at),
               updated_at = $14
           where tenant_id = $1 and prospect_id = $2`,
          [
            tenant,
            data.prospect_id,
            data.full_name || null,
            data.email || null,
            data.phone || null,
            data.id_card || null,
            data.source || null,
            data.stage || (event.event_type === 'sales.prospect.followup.logged' ? 'followup' : null),
            data.owner_sales_id || null,
            data.notes || null,
            data.custom_fields === undefined ? null : JSON.stringify(data.custom_fields || {}),
            data.next_followup_at || null,
            data.last_contact_at || null,
            data.updated_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'sales.prospect.converted') {
        await client.query(
          `update read.rm_sales_prospect
           set stage = 'converted',
               converted_member_id = $3,
               converted_at = coalesce($4, converted_at),
               notes = coalesce($5, notes),
               custom_fields = coalesce($6::jsonb, custom_fields),
               updated_at = $7
           where tenant_id = $1 and prospect_id = $2`,
          [
            tenant,
            data.prospect_id,
            data.converted_member_id || null,
            data.converted_at || null,
            data.notes || null,
            data.custom_fields === undefined ? null : JSON.stringify(data.custom_fields || {}),
            data.updated_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (
        event.event_type === 'gov.tenant.suspended' ||
        event.event_type === 'gov.tenant.unsuspended' ||
        event.event_type === 'gov.tenant.free_granted' ||
        event.event_type === 'gov.tenant.price.updated' ||
        event.event_type === 'gov.tenant.promotion.updated'
      ) {
        const nextStatus =
          event.event_type === 'gov.tenant.suspended'
            ? 'suspended'
            : event.event_type === 'gov.tenant.unsuspended'
              ? 'active'
              : data.status || null;
        await client.query(
          `insert into read.rm_tenant_policy (
             tenant_id, status, price_monthly, free_months_granted, promotion_code, promotion_active, updated_at
           ) values ($1,coalesce($2,'active'),$3,$4,$5,$6,$7)
           on conflict (tenant_id) do update set
             status = coalesce(excluded.status, read.rm_tenant_policy.status),
             price_monthly = coalesce(excluded.price_monthly, read.rm_tenant_policy.price_monthly),
             free_months_granted = greatest(read.rm_tenant_policy.free_months_granted, excluded.free_months_granted),
             promotion_code = coalesce(excluded.promotion_code, read.rm_tenant_policy.promotion_code),
             promotion_active = excluded.promotion_active,
             updated_at = excluded.updated_at`,
          [
            tenant,
            nextStatus,
            data.price_monthly || null,
            Number(data.free_months_granted || data.months || 0),
            data.promotion_code || null,
            Boolean(data.promotion_active),
            data.updated_at || eventTs
          ]
        );

        await client.query(
          `insert into read.rm_tenant_performance (
             tenant_id, performance_date, mrr_amount, active_member_count, checkin_30d_count, updated_at
           )
           values (
             $1,
             $2::date,
             coalesce($3, 0),
             (
               select count(*)::int
               from read.rm_subscription_active
               where tenant_id = $1 and status = 'active' and end_date >= current_date
             ),
             (
               select count(*)::int
               from eventdb_event
               where namespace_id = $4 and event_type = 'checkin.logged' and event_time >= (now() - interval '30 days')
             ),
             $5
           )
           on conflict (tenant_id, performance_date) do update set
             mrr_amount = excluded.mrr_amount,
             active_member_count = excluded.active_member_count,
             checkin_30d_count = excluded.checkin_30d_count,
             updated_at = excluded.updated_at`,
          [tenant, toDateOnly(data.updated_at || eventTs), data.mrr_amount || data.price_monthly || 0, namespaceId, data.updated_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'passport.created' || event.event_type === 'passport.sport_interest.updated') {
        const passportId = data.passport_id || payload.subject?.id;
        const sportInterests = data.sport_interests || [];
        await client.query(
          `insert into read.rm_passport_profile (
             tenant_id, passport_id, member_id, sport_interests, training_history_summary,
             coach_relation_count, studio_relation_count, performance_milestone_count, updated_at
           ) values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9)
           on conflict (tenant_id, passport_id) do update set
             member_id = excluded.member_id,
             sport_interests = excluded.sport_interests,
             training_history_summary = coalesce(excluded.training_history_summary, read.rm_passport_profile.training_history_summary),
             updated_at = excluded.updated_at`,
          [
            tenant,
            passportId,
            data.member_id || data.passport_id || null,
            JSON.stringify(sportInterests),
            JSON.stringify(data.training_history_summary || null),
            Number(data.coach_relation_count || 0),
            Number(data.studio_relation_count || 0),
            Number(data.performance_milestone_count || 0),
            data.updated_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'invitation.sent') {
        const invitationId = data.invitation_id || payload.subject?.id;
        await client.query(
          `insert into read.rm_invitation_queue (
             tenant_id, invitation_id, inviter_actor_kind, invitee_actor_kind, target_contact, channel, status, updated_at
           ) values ($1,$2,$3,$4,$5,$6,'pending',$7)
           on conflict (tenant_id, invitation_id) do update set
             inviter_actor_kind = excluded.inviter_actor_kind,
             invitee_actor_kind = excluded.invitee_actor_kind,
             target_contact = excluded.target_contact,
             channel = excluded.channel,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [tenant, invitationId, data.inviter_actor_kind, data.invitee_actor_kind, data.target_contact || null, data.channel || null, data.updated_at || eventTs]
        );
        const relationId = data.relation_id || invitationId;
        await client.query(
          `insert into read.rm_actor_network (
             tenant_id, relation_id, left_actor_kind, left_actor_id, right_actor_kind, right_actor_id, status, source_invitation_id, updated_at
           ) values ($1,$2,$3,$4,$5,$6,'pending',$7,$8)
           on conflict (tenant_id, relation_id) do update set
             status = 'pending',
             source_invitation_id = excluded.source_invitation_id,
             updated_at = excluded.updated_at`,
          [
            tenant,
            relationId,
            data.inviter_actor_kind || payload.actor?.kind || 'unknown',
            data.inviter_actor_id || payload.actor?.id || data.target_contact || 'unknown',
            data.invitee_actor_kind || 'unknown',
            data.invitee_actor_id || data.target_contact || invitationId,
            invitationId,
            data.updated_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'invitation.accepted' || event.event_type === 'invitation.rejected') {
        const invitationId = data.invitation_id || payload.subject?.id;
        const invitationStatus = event.event_type === 'invitation.accepted' ? 'accepted' : 'rejected';
        await client.query(
          `update read.rm_invitation_queue
           set status = $3,
               updated_at = $4
           where tenant_id = $1 and invitation_id = $2`,
          [tenant, invitationId, invitationStatus, data.updated_at || eventTs]
        );
        await client.query(
          `update read.rm_actor_network
           set status = $3,
               updated_at = $4
           where tenant_id = $1 and source_invitation_id = $2`,
          [tenant, invitationId, invitationStatus, data.updated_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (
        event.event_type === 'coach.studio.linked' ||
        event.event_type === 'coach.member.linked' ||
        event.event_type === 'member.studio.joined' ||
        event.event_type === 'member.studio.left'
      ) {
        const relationId = data.relation_id || payload.subject?.id || `${event.event_type}:${event.sequence}`;
        await client.query(
          `insert into read.rm_actor_network (
             tenant_id, relation_id, left_actor_kind, left_actor_id, right_actor_kind, right_actor_id, status, source_invitation_id, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (tenant_id, relation_id) do update set
             left_actor_kind = excluded.left_actor_kind,
             left_actor_id = excluded.left_actor_id,
             right_actor_kind = excluded.right_actor_kind,
             right_actor_id = excluded.right_actor_id,
             status = excluded.status,
             source_invitation_id = coalesce(excluded.source_invitation_id, read.rm_actor_network.source_invitation_id),
             updated_at = excluded.updated_at`,
          [
            tenant,
            relationId,
            data.left_actor_kind || data.actor_kind || payload.actor?.kind || 'unknown',
            data.left_actor_id || data.coach_id || data.member_id || payload.actor?.id || 'unknown',
            data.right_actor_kind || data.target_actor_kind || (event.event_type.includes('studio') ? 'studio' : 'member'),
            data.right_actor_id || data.studio_id || data.member_id || data.target_actor_id || payload.subject?.id || 'unknown',
            event.event_type === 'member.studio.left' ? 'inactive' : 'active',
            data.invitation_id || null,
            data.updated_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }
    }

    const processedTo = eventRows.length > 0 ? Number(eventRows[eventRows.length - 1].sequence) : lastSequence;

    await client.query(
      `update read.rm_checkpoint
       set last_sequence = $4,
           updated_at = now()
       where projector_name = $1 and namespace_id = $2 and chain_id = $3`,
      [PROJECTOR_NAME, namespaceId, chainId, processedTo]
    );

    const tenant = tenantId;
    const branch = branchId || 'core';
    const today = new Date().toISOString().slice(0, 10);

    const activeSubs = await client.query(
      `select count(*)::int as count
       from read.rm_subscription_active
       where tenant_id = $1 and branch_id = $2 and status = 'active' and end_date >= current_date`,
      [tenant, branch]
    );

    const todayCheckin = await client.query(
      `select coalesce(total_checkin, 0)::int as count
       from read.rm_attendance_daily
       where tenant_id = $1 and branch_id = $2 and attendance_date = current_date`,
      [tenant, branch]
    );

    const todayBooking = await client.query(
      `select count(*)::int as count
       from read.rm_booking_list
       where tenant_id = $1 and branch_id = $2 and status = 'booked' and booked_at::date = current_date`,
      [tenant, branch]
    );

    const pendingPayment = await client.query(
      `select count(*)::int as count
       from read.rm_payment_queue
       where tenant_id = $1 and coalesce(branch_id, $2) = $2 and status = 'pending'`,
      [tenant, branch]
    );

    await client.query(
      `insert into read.rm_dashboard (
         tenant_id, branch_id, dashboard_date,
         active_subscription_count, today_checkin_count,
         today_booking_count, pending_payment_count, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,now())
       on conflict (tenant_id, branch_id, dashboard_date) do update set
         active_subscription_count = excluded.active_subscription_count,
         today_checkin_count = excluded.today_checkin_count,
         today_booking_count = excluded.today_booking_count,
         pending_payment_count = excluded.pending_payment_count,
         updated_at = now()`,
      [
        tenant,
        branch,
        today,
        activeSubs.rows[0]?.count || 0,
        todayCheckin.rows[0]?.count || 0,
        todayBooking.rows[0]?.count || 0,
        pendingPayment.rows[0]?.count || 0
      ]
    );

    return {
      status: 'PASS',
      checked_scope: {
        projector_name: PROJECTOR_NAME,
        namespace_id: namespaceId,
        chain_id: chainId
      },
      message: 'Fitness projection run completed',
      artifact: {
        from_sequence: lastSequence + 1,
        to_sequence: processedTo,
        events_scanned: eventRows.length,
        rows_applied: applied,
        last_sequence: processedTo
      }
    };
  });
}
