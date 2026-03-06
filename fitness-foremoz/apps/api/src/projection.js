import { resolveChainId, resolveNamespaceId } from './event-store.js';
import { withTx } from './db.js';

const PROJECTOR_NAME = 'fitness_v1';

function toDateOnly(value) {
  return String(value || '').slice(0, 10);
}

export async function runFitnessProjection({ tenantId, branchId }) {
  const namespaceId = resolveNamespaceId(tenantId);
  const chainId = resolveChainId(branchId);

  return withTx(async (client) => {
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

    let applied = 0;
    for (const event of eventRows) {
      const payload = event.payload || {};
      const data = payload.data || {};
      const eventTs = payload.ts || event.event_time;
      const tenant = data.tenant_id || tenantId;
      const branch = data.branch_id || branchId || 'core';

      if (event.event_type === 'member.registered') {
        await client.query(
          `insert into read.rm_member (
             tenant_id, branch_id, member_id, full_name, phone, status, registered_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (tenant_id, member_id) do update set
             branch_id = excluded.branch_id,
             full_name = excluded.full_name,
             phone = excluded.phone,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [tenant, branch, data.member_id, data.full_name, data.phone || null, data.status || 'active', eventTs, eventTs]
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
               status = coalesce($5, status),
               updated_at = $6
           where tenant_id = $1 and member_id = $2`,
          [tenant, data.member_id, patch.full_name || null, patch.phone || null, patch.status || null, eventTs]
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
             tenant_id, user_id, full_name, email, role, password_hash, status, created_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (tenant_id, user_id) do update set
             full_name = excluded.full_name,
             email = excluded.email,
             role = excluded.role,
             password_hash = excluded.password_hash,
             status = excluded.status,
             updated_at = excluded.updated_at`,
          [
            tenant,
            data.user_id,
            data.full_name,
            data.email,
            data.role || 'owner',
            data.password_hash,
            data.status || 'active',
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
               updated_at = $5
           where tenant_id = $1 and user_id = $2`,
          [tenant, data.user_id, data.full_name || null, data.role || null, data.updated_at || eventTs]
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
             tenant_id, gym_name, branch_id, account_slug, address, city, photo_url, package_plan, status, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
           on conflict (tenant_id) do update set
             gym_name = excluded.gym_name,
             branch_id = excluded.branch_id,
             account_slug = excluded.account_slug,
             address = excluded.address,
             city = excluded.city,
             photo_url = excluded.photo_url,
             package_plan = excluded.package_plan,
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
             tenant_id, total_months, last_note, last_extended_at, updated_at
           ) values ($1,$2,$3,$4,$4)
           on conflict (tenant_id) do update set
             total_months = read.rm_owner_saas.total_months + excluded.total_months,
             last_note = excluded.last_note,
             last_extended_at = excluded.last_extended_at,
             updated_at = excluded.updated_at`,
          [tenant, Number(data.months || 0), data.note || null, data.extended_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'subscription.activated') {
        await client.query(
          `insert into read.rm_subscription_active (
             tenant_id, branch_id, subscription_id, member_id, plan_id, status,
             start_date, end_date, freeze_until, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           on conflict (tenant_id, subscription_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             plan_id = excluded.plan_id,
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
            data.status || 'active',
            data.start_date,
            data.end_date,
            null,
            eventTs
          ]
        );
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

      if (event.event_type === 'payment.recorded') {
        await client.query(
          `insert into read.rm_payment_queue (
             tenant_id, branch_id, payment_id, member_id, subscription_id,
             amount, currency, method, proof_url, status,
             recorded_at, reviewed_at, reviewed_by, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,null,null,$10)
           on conflict (tenant_id, payment_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             subscription_id = excluded.subscription_id,
             amount = excluded.amount,
             currency = excluded.currency,
             method = excluded.method,
             proof_url = excluded.proof_url,
             status = 'pending',
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
            data.recorded_at || eventTs
          ]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'payment.confirmed' || event.event_type === 'payment.rejected') {
        await client.query(
          `update read.rm_payment_queue
           set status = $3,
               reviewed_at = $4,
               reviewed_by = $5,
               updated_at = $4
           where tenant_id = $1 and payment_id = $2`,
          [
            tenant,
            data.payment_id,
            event.event_type === 'payment.confirmed' ? 'confirmed' : 'rejected',
            data.confirmed_at || data.rejected_at || eventTs,
            data.confirmed_by || data.rejected_by || payload.actor?.id || null
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
        await client.query(
          `insert into read.rm_class_availability (
             tenant_id, branch_id, class_id, class_name, start_at, end_at,
             capacity, booked_count, available_slots, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,0,$7,$8)
           on conflict (tenant_id, class_id) do update set
             branch_id = excluded.branch_id,
             class_name = excluded.class_name,
             start_at = excluded.start_at,
             end_at = excluded.end_at,
             capacity = excluded.capacity,
             available_slots = greatest(0, excluded.capacity - read.rm_class_availability.booked_count),
             updated_at = excluded.updated_at`,
          [tenant, branch, data.class_id, data.class_name, data.start_at, data.end_at, data.capacity, eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'class.booking.created') {
        await client.query(
          `insert into read.rm_booking_list (
             tenant_id, branch_id, booking_id, class_id, booking_kind,
             member_id, guest_name, status, booked_at,
             canceled_at, attendance_confirmed_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null,null,$9)
           on conflict (tenant_id, booking_id) do update set
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
            data.status || 'booked',
            data.booked_at || eventTs
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

      if (event.event_type === 'class.attendance.confirmed') {
        await client.query(
          `update read.rm_booking_list
           set attendance_confirmed_at = $3,
               updated_at = $3
           where tenant_id = $1 and booking_id = $2`,
          [tenant, data.booking_id, data.confirmed_at || eventTs]
        );
        applied += 1;
        continue;
      }

      if (event.event_type === 'pt.package.assigned') {
        await client.query(
          `insert into read.rm_pt_balance (
             tenant_id, branch_id, pt_package_id, member_id, trainer_id,
             total_sessions, consumed_sessions, remaining_sessions, last_session_at, updated_at
           ) values ($1,$2,$3,$4,$5,$6,0,$6,null,$7)
           on conflict (tenant_id, pt_package_id) do update set
             branch_id = excluded.branch_id,
             member_id = excluded.member_id,
             trainer_id = excluded.trainer_id,
             total_sessions = excluded.total_sessions,
             remaining_sessions = excluded.remaining_sessions,
             updated_at = excluded.updated_at`,
          [
            tenant,
            branch,
            data.pt_package_id,
            data.member_id,
            data.trainer_id || null,
            data.total_sessions,
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
