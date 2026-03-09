import { createHash, randomUUID } from 'node:crypto';
import { config } from './config.js';
import { canonicalStringify } from './canonical-json.js';
import { withTx } from './db.js';

function hashCanonicalObject(value) {
  return createHash('sha256').update(canonicalStringify(value)).digest('hex');
}

function buildEventSigningObject(event) {
  return {
    namespace_id: event.namespace_id,
    chain_id: event.chain_id,
    event_id: event.event_id,
    sequence: Number(event.sequence),
    prev_hash: event.prev_hash,
    account_id: event.account_id,
    event_type: event.event_type,
    event_time: event.event_time,
    payload: event.payload
  };
}

export function resolveNamespaceId(tenantId) {
  return `foremoz:${tenantId || config.defaultTenantId}`;
}

export function resolveChainId(branchId) {
  return branchId ? `branch:${branchId}` : 'core';
}

function duplicateIdError(scope, value) {
  const error = new Error(`duplicate id detected for ${scope}:${value}`);
  error.statusCode = 409;
  error.errorCode = 'EVENTDB_ID_NOT_UNIQUE';
  return error;
}

export async function appendDomainEvent({
  tenantId,
  branchId,
  actorId,
  eventType,
  subjectKind,
  subjectId,
  data,
  refs,
  uniqueIds,
  ts,
  actorKind = 'staff'
}) {
  const namespaceId = resolveNamespaceId(tenantId);
  const chainId = resolveChainId(branchId);
  const eventTime = ts || new Date().toISOString();

  return withTx(async (client) => {
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

    await client.query(
      `insert into eventdb_chain (namespace_id, chain_id)
       values ($1, $2)
       on conflict (namespace_id, chain_id) do nothing`,
      [namespaceId, chainId]
    );

    const { rows } = await client.query(
      `select namespace_id, chain_id, event_id, sequence, prev_hash, account_id, event_type, event_time, payload
       from eventdb_event
       where namespace_id = $1 and chain_id = $2
       order by sequence desc
       limit 1
       for update`,
      [namespaceId, chainId]
    );

    const prev = rows[0] || null;
    const sequence = prev ? Number(prev.sequence) + 1 : 1;
    const prevHash = prev
      ? hashCanonicalObject(buildEventSigningObject(prev))
      : config.eventGenesisPrevHash;

    const eventId = `evt_${Date.now()}_${randomUUID().slice(0, 8)}`;

    for (const item of uniqueIds || []) {
      const scope = String(item?.scope || '').trim();
      const value = String(item?.value || '').trim().toLowerCase();
      if (!scope || !value) continue;

      const reserve = await client.query(
        `insert into eventdb_unique_id (namespace_id, id_scope, id_value, reserved_by_event_id)
         values ($1, $2, $3, $4)
         on conflict do nothing
         returning id_value`,
        [namespaceId, scope, value, eventId]
      );

      if (reserve.rowCount !== 1) {
        throw duplicateIdError(scope, value);
      }
    }

    const payload = {
      type: eventType,
      actor: {
        kind: actorKind,
        id: actorId || config.defaultActorId
      },
      subject: {
        kind: subjectKind,
        id: subjectId
      },
      data: data || {},
      refs: refs || {},
      ts: eventTime
    };

    await client.query(
      `insert into eventdb_event (
         namespace_id, chain_id, event_id, sequence, prev_hash,
         account_id, event_type, event_time, payload, signature
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        namespaceId,
        chainId,
        eventId,
        sequence,
        prevHash,
        actorId || config.defaultActorId,
        eventType,
        eventTime,
        payload,
        `sig_${eventId}`
      ]
    );

    return {
      namespace_id: namespaceId,
      chain_id: chainId,
      event_id: eventId,
      sequence,
      event_type: eventType,
      ts: eventTime
    };
  });
}
