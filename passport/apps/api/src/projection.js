import { resolveChainId, resolveNamespaceId } from './event-store.js';
import { withTx } from './db.js';

const PROJECTOR_NAME = 'passport_v1';

function j(value) {
  return JSON.stringify(value ?? null);
}

async function upsertActorProfile(client, {
  tenantId,
  actorKind,
  actorId,
  passportId = null,
  displayName = null,
  headline = null,
  bio = null,
  avatarUrl = null,
  contactJson = null,
  status = 'active',
  updatedAt
}) {
  if (!actorKind || !actorId) return;
  await client.query(
    `insert into read.rm_actor_profile
       (tenant_id, actor_kind, actor_id, passport_id, display_name, headline, bio, avatar_url, contact_json, status, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (tenant_id, actor_kind, actor_id) do update set
       passport_id = coalesce(excluded.passport_id, read.rm_actor_profile.passport_id),
       display_name = coalesce(excluded.display_name, read.rm_actor_profile.display_name),
       headline = coalesce(excluded.headline, read.rm_actor_profile.headline),
       bio = coalesce(excluded.bio, read.rm_actor_profile.bio),
       avatar_url = coalesce(excluded.avatar_url, read.rm_actor_profile.avatar_url),
       contact_json = coalesce(excluded.contact_json, read.rm_actor_profile.contact_json),
       status = coalesce(excluded.status, read.rm_actor_profile.status),
       updated_at = excluded.updated_at`,
    [
      tenantId,
      actorKind,
      actorId,
      passportId,
      displayName,
      headline,
      bio,
      avatarUrl,
      contactJson ? j(contactJson) : null,
      status,
      updatedAt
    ]
  );
}

export async function runPassportProjection({ tenantId, branchId }) {
  const namespaceId = resolveNamespaceId(tenantId);
  const chainId = resolveChainId(branchId);

  return withTx(async (client) => {
    await client.query(
      `insert into read.rm_checkpoint (projector_name, namespace_id, chain_id, last_sequence)
       values ($1, $2, $3, 0)
       on conflict (projector_name, namespace_id, chain_id) do nothing`,
      [PROJECTOR_NAME, namespaceId, chainId]
    );

    const { rows: cpRows } = await client.query(
      `select last_sequence
       from read.rm_checkpoint
       where projector_name = $1 and namespace_id = $2 and chain_id = $3
       for update`,
      [PROJECTOR_NAME, namespaceId, chainId]
    );

    const lastSequence = Number(cpRows[0]?.last_sequence || 0);
    const { rows: events } = await client.query(
      `select sequence, event_type, event_time, payload
       from eventdb_event
       where namespace_id = $1 and chain_id = $2 and sequence > $3
       order by sequence asc`,
      [namespaceId, chainId, lastSequence]
    );

    let applied = 0;
    let maxSeq = lastSequence;

    for (const evt of events) {
      const data = evt.payload?.data || {};
      const ts = data.updated_at || data.recorded_at || data.measured_at || evt.payload?.ts || evt.event_time;
      const tenant = data.tenant_id || tenantId;

      if (evt.event_type === 'passport.account.created') {
        await client.query(
          `insert into read.rm_passport_account_auth
             (tenant_id, passport_id, full_name, email, password_hash, status, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (tenant_id, passport_id) do update set
             full_name = excluded.full_name,
             email = excluded.email,
             password_hash = excluded.password_hash,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.passport_id,
            data.full_name,
            data.email,
            data.password_hash,
            data.status || 'active',
            data.created_at || ts,
            ts
          ]
        );
        await upsertActorProfile(client, {
          tenantId: tenant,
          actorKind: 'member',
          actorId: data.passport_id,
          passportId: data.passport_id,
          displayName: data.full_name || null,
          contactJson: data.email ? { email: data.email } : null,
          status: data.status || 'active',
          updatedAt: ts
        });
      } else if (evt.event_type === 'passport.created' || evt.event_type === 'passport.profile.updated' || evt.event_type === 'passport.sport_interest.updated') {
        await client.query(
          `insert into read.rm_passport_profile
             (tenant_id, passport_id, member_id, full_name, sport_interests, updated_at)
           values ($1,$2,$3,$4,$5,$6)
           on conflict (tenant_id, passport_id) do update set
             member_id = excluded.member_id,
             full_name = coalesce(excluded.full_name, read.rm_passport_profile.full_name),
             sport_interests = coalesce(excluded.sport_interests, read.rm_passport_profile.sport_interests),
             updated_at = excluded.updated_at`,
          [tenant, data.passport_id, data.member_id, data.full_name || null, j(data.sport_interests), ts]
        );
        await upsertActorProfile(client, {
          tenantId: tenant,
          actorKind: 'member',
          actorId: data.member_id || data.passport_id,
          passportId: data.passport_id,
          displayName: data.full_name || null,
          headline: 'passport member',
          contactJson: data.sport_interests ? { sport_interests: data.sport_interests } : null,
          status: 'active',
          updatedAt: ts
        });
      } else if (evt.event_type === 'actor.profile.upserted') {
        await upsertActorProfile(client, {
          tenantId: tenant,
          actorKind: data.actor_kind,
          actorId: data.actor_id,
          passportId: data.passport_id || null,
          displayName: data.display_name || null,
          headline: data.headline || null,
          bio: data.bio || null,
          avatarUrl: data.avatar_url || null,
          contactJson: data.contact_json || null,
          status: data.status || 'active',
          updatedAt: ts
        });
      } else if (evt.event_type === 'subscription.created' || evt.event_type === 'subscription.canceled') {
        await client.query(
          `insert into read.rm_passport_subscriptions
             (tenant_id, subscription_id, passport_id, coach_id, studio_id, plan_id, status, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (tenant_id, subscription_id) do update set
             coach_id = excluded.coach_id,
             studio_id = excluded.studio_id,
             plan_id = excluded.plan_id,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.subscription_id,
            data.passport_id,
            data.coach_id || null,
            data.studio_id || null,
            data.plan_id || null,
            data.status || (evt.event_type === 'subscription.canceled' ? 'canceled' : 'active'),
            ts
          ]
        );
        if (data.coach_id) {
          await upsertActorProfile(client, {
            tenantId: tenant,
            actorKind: 'coach',
            actorId: data.coach_id,
            headline: 'coach',
            status: 'active',
            updatedAt: ts
          });
        }
        if (data.studio_id) {
          await upsertActorProfile(client, {
            tenantId: tenant,
            actorKind: 'studio',
            actorId: data.studio_id,
            headline: 'studio',
            status: 'active',
            updatedAt: ts
          });
        }
      } else if (
        evt.event_type === 'performance.diet.logged' ||
        evt.event_type === 'performance.weight.logged' ||
        evt.event_type === 'performance.muscle.logged' ||
        evt.event_type === 'performance.workout.logged'
      ) {
        await client.query(
          `insert into read.rm_passport_performance_log
             (tenant_id, metric_log_id, passport_id, metric_category, metric_value_json, measured_at, created_at)
           values ($1,$2,$3,$4,$5,$6,$7)
           on conflict (tenant_id, metric_log_id) do update set
             metric_category = excluded.metric_category,
             metric_value_json = excluded.metric_value_json,
             measured_at = excluded.measured_at`,
          [
            tenant,
            data.metric_log_id,
            data.passport_id,
            data.metric_category,
            j(data.metric_value_json || data),
            data.measured_at || ts,
            ts
          ]
        );
      } else if (evt.event_type === 'performance.milestone.recorded') {
        await client.query(
          `insert into read.rm_passport_milestone
             (tenant_id, milestone_id, passport_id, title, detail, recorded_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7)
           on conflict (tenant_id, milestone_id) do update set
             title = excluded.title,
             detail = excluded.detail,
             recorded_at = excluded.recorded_at,
             updated_at = excluded.updated_at`,
          [tenant, data.milestone_id, data.passport_id, data.title, data.detail || null, data.recorded_at || ts, ts]
        );
      } else if (evt.event_type === 'consent.granted' || evt.event_type === 'consent.revoked' || evt.event_type === 'consent.scope.updated') {
        await client.query(
          `insert into read.rm_passport_consent
             (tenant_id, consent_id, passport_id, coach_id, metric_categories, status, granted_at, revoked_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (tenant_id, consent_id) do update set
             metric_categories = excluded.metric_categories,
             status = excluded.status,
             granted_at = coalesce(excluded.granted_at, read.rm_passport_consent.granted_at),
             revoked_at = excluded.revoked_at,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.consent_id,
            data.passport_id,
            data.coach_id,
            j(data.metric_categories || []),
            data.status || (evt.event_type === 'consent.revoked' ? 'revoked' : 'active'),
            data.granted_at || ts,
            data.revoked_at || null,
            ts
          ]
        );
      } else if (evt.event_type === 'coach.member.linked' || evt.event_type === 'member.studio.joined' || evt.event_type === 'member.studio.left') {
        await client.query(
          `insert into read.rm_passport_network
             (tenant_id, relation_id, left_actor_kind, left_actor_id, right_actor_kind, right_actor_id, status, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (tenant_id, relation_id) do update set
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.relation_id,
            data.left_actor_kind,
            data.left_actor_id,
            data.right_actor_kind,
            data.right_actor_id,
            data.status || (evt.event_type === 'member.studio.left' ? 'inactive' : 'active'),
            ts
          ]
        );
        await upsertActorProfile(client, {
          tenantId: tenant,
          actorKind: data.left_actor_kind,
          actorId: data.left_actor_id,
          status: 'active',
          updatedAt: ts
        });
        await upsertActorProfile(client, {
          tenantId: tenant,
          actorKind: data.right_actor_kind,
          actorId: data.right_actor_id,
          status: data.status || (evt.event_type === 'member.studio.left' ? 'inactive' : 'active'),
          updatedAt: ts
        });
      } else if (evt.event_type === 'pricing.plan.changed' || evt.event_type === 'billing.subscription.updated') {
        await client.query(
          `insert into read.rm_passport_plan_state
             (tenant_id, passport_id, plan_code, plan_status, effective_at, updated_at)
           values ($1,$2,$3,$4,$5,$6)
           on conflict (tenant_id, passport_id) do update set
             plan_code = excluded.plan_code,
             plan_status = excluded.plan_status,
             effective_at = excluded.effective_at,
             updated_at = excluded.updated_at`,
          [tenant, data.passport_id, data.plan_code || 'free', data.plan_status || 'active', data.effective_at || ts, ts]
        );
      }

      // Recompute coach-shared view after every consent/metric update.
      if (
        evt.event_type.startsWith('performance.') ||
        evt.event_type.startsWith('consent.')
      ) {
        const passportId = data.passport_id;
        if (passportId) {
          await client.query(
            `delete from read.rm_coach_shared_view
             where tenant_id = $1 and passport_id = $2`,
            [tenant, passportId]
          );

          await client.query(
            `insert into read.rm_coach_shared_view
               (tenant_id, passport_id, coach_id, metric_category, latest_metric_value_json, latest_measured_at, updated_at)
             select c.tenant_id,
                    c.passport_id,
                    c.coach_id,
                    m.metric_category,
                    m.metric_value_json,
                    m.measured_at,
                    now()
             from read.rm_passport_consent c
             join lateral (
               select pl.metric_category, pl.metric_value_json, pl.measured_at
               from read.rm_passport_performance_log pl
               where pl.tenant_id = c.tenant_id
                 and pl.passport_id = c.passport_id
                 and pl.metric_category = any(
                   select jsonb_array_elements_text(c.metric_categories)
                 )
               order by pl.measured_at desc
               limit 1
             ) m on true
             where c.tenant_id = $1
               and c.passport_id = $2
               and c.status = 'active'`,
            [tenant, passportId]
          );
        }
      }

      applied += 1;
      maxSeq = Number(evt.sequence);
    }

    await client.query(
      `update read.rm_checkpoint
       set last_sequence = $4, updated_at = now()
       where projector_name = $1 and namespace_id = $2 and chain_id = $3`,
      [PROJECTOR_NAME, namespaceId, chainId, maxSeq]
    );

    return { applied, last_sequence: maxSeq };
  });
}
