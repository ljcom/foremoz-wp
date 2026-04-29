import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, clearSession, getAccountSlug, getAllowedEnvironments, getEnvironmentLabel, getSession, setSession } from '../lib.js';
import BackendWorkspaceShell from '../components/BackendWorkspaceShell.jsx';
import { getBackendShellNavItems, getPtWorkspaceConfig } from '../config/app-config.js';
import {
  formatAppDateTime,
  getAppDateKey,
  getAppDateTimeInputValue,
  getAppNowDateTimeInput,
  toAppIsoFromDateTimeInput
} from '../time.js';

const COACH_SIDEBAR_NAV_ITEMS = getBackendShellNavItems('coach');
const PT_WORKSPACE_CONFIG = getPtWorkspaceConfig();
const PT_BOOK_SESSION_CONFIG = PT_WORKSPACE_CONFIG.bookSession || {};
const PT_BOOK_SESSION_USED_FIELD_CONFIG = PT_BOOK_SESSION_CONFIG.sessionUsedField || {};
const PT_HISTORY_SESSION_CONFIG = PT_WORKSPACE_CONFIG.historySession || {};

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
      throw new Error(`${label} custom_fields harus object JSON.`);
    }
    return parsed;
  } catch {
    throw new Error(`${label} custom_fields tidak valid (format JSON object).`);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function shuffleList(items) {
  const next = Array.isArray(items) ? [...items] : [];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const WEEKDAY_BY_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getProgramScheduleOptions(classItem) {
  const scheduleMode = String(classItem?.schedule_mode || 'none').trim().toLowerCase();
  const weeklySchedule = classItem?.weekly_schedule || {};
  const startTime = String(weeklySchedule.start_time || '').trim();
  const endTime = String(weeklySchedule.end_time || '').trim();
  if (scheduleMode === 'manual') {
    return (Array.isArray(classItem?.manual_schedule) ? classItem.manual_schedule : []).map((item, index) => ({
      key: `manual:${item.start_at}:${item.end_at}:${index}`,
      label: `${item.start_at} -> ${item.end_at}`,
      payload: {
        schedule_mode: 'manual',
        start_at: item.start_at,
        end_at: item.end_at
      }
    }));
  }
  if (scheduleMode === 'everyday') {
    return [{
      key: `everyday:${startTime}:${endTime}`,
      label: startTime && endTime ? `Everyday | ${startTime}-${endTime}` : 'Everyday',
      payload: {
        schedule_mode: 'everyday',
        start_time: startTime,
        end_time: endTime
      }
    }];
  }
  if (scheduleMode === 'weekly') {
    return (Array.isArray(weeklySchedule.weekdays) ? weeklySchedule.weekdays : [])
      .map((weekday) => String(weekday || '').trim().toLowerCase())
      .filter(Boolean)
      .map((weekday) => ({
        key: `weekly:${weekday}:${startTime}:${endTime}`,
        label: `${weekday.toUpperCase()} | ${startTime}-${endTime}`,
        payload: {
          schedule_mode: 'weekly',
          weekday,
          start_time: startTime,
          end_time: endTime
        }
      }));
  }
  return [];
}

function resolveScheduleChoiceBySessionAt(options, sessionAtInput) {
  if (!Array.isArray(options) || options.length === 0) return null;
  if (options.length === 1) return options[0];
  const sessionDate = new Date(String(sessionAtInput || '').trim());
  const sessionTime = Number.isFinite(sessionDate.getTime()) ? sessionDate.getTime() : NaN;
  if (Number.isFinite(sessionTime)) {
    const weekday = WEEKDAY_BY_INDEX[sessionDate.getDay()] || '';
    const weeklyMatched = options.find((item) => String(item?.payload?.weekday || '').trim().toLowerCase() === weekday) || null;
    if (weeklyMatched) return weeklyMatched;
    const manualMatched = options.find((item) => {
      const start = new Date(String(item?.payload?.start_at || '').trim()).getTime();
      const end = new Date(String(item?.payload?.end_at || '').trim()).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
      return sessionTime >= start && sessionTime <= end;
    }) || null;
    if (manualMatched) return manualMatched;
  }
  return options[0];
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatIdr(value) {
  return `IDR ${Number(value || 0).toLocaleString('id-ID')}`;
}

function createPerformanceFields() {
  return {
    performance_score: '',
    energy_level: '',
    body_weight_kg: '',
    reps: '',
    load_kg: '',
    next_focus: '',
    coach_note: ''
  };
}

function createBookForm() {
  return {
    pt_package_id: '',
    member_id: '',
    session_used: String(PT_BOOK_SESSION_USED_FIELD_CONFIG.defaultValue || 1),
    session_at: getAppNowDateTimeInput(),
    activity_note: '',
    custom_fields_text: ''
  };
}

function createCompleteForm() {
  return {
    pt_package_id: '',
    member_id: '',
    session_id: '',
    completed_at: getAppNowDateTimeInput(),
    activity_note: '',
    custom_fields_text: '',
    performance_fields: createPerformanceFields()
  };
}

function createActivityForm() {
  return {
    pt_package_id: '',
    member_id: '',
    session_at: getAppNowDateTimeInput(),
    activity_note: '',
    custom_fields_text: '',
    performance_fields: createPerformanceFields()
  };
}

function createAwardForm() {
  return {
    rank: '',
    score_points: '',
    award_scope: 'overall',
    award_title: '',
    award_note: '',
    custom_fields_text: ''
  };
}

function buildPerformanceCustomFields(rawText, label, performanceFields = {}) {
  const parsed = parseCustomFieldsInput(rawText, label);
  const next = {
    ...parsed
  };
  const score = Number(performanceFields.performance_score || 0);
  const energy = Number(performanceFields.energy_level || 0);
  const bodyWeight = Number(performanceFields.body_weight_kg || 0);
  const reps = Number(performanceFields.reps || 0);
  const loadKg = Number(performanceFields.load_kg || 0);
  if (Number.isFinite(score) && score > 0) next.performance_score = score;
  if (Number.isFinite(energy) && energy > 0) next.energy_level = energy;
  if (Number.isFinite(bodyWeight) && bodyWeight > 0) next.body_weight_kg = bodyWeight;
  if (Number.isFinite(reps) && reps > 0) next.reps = reps;
  if (Number.isFinite(loadKg) && loadKg > 0) next.load_kg = loadKg;
  if (String(performanceFields.next_focus || '').trim()) next.next_focus = String(performanceFields.next_focus).trim();
  if (String(performanceFields.coach_note || '').trim()) next.coach_note = String(performanceFields.coach_note).trim();
  return next;
}

function normalizeIntegerInput(value, fallbackValue = 1, minValue = 1) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  const fallback = Number.parseInt(String(fallbackValue || 1), 10);
  const min = Number.parseInt(String(minValue || 1), 10);
  if (!Number.isFinite(parsed)) return Number.isFinite(fallback) ? fallback : min;
  if (Number.isFinite(min) && parsed < min) return min;
  return parsed;
}

function buildBookSessionCustomFields(rawText, sessionUsedValue) {
  const parsed = parseCustomFieldsInput(rawText, 'Book schedule');
  const fieldKey = String(PT_BOOK_SESSION_USED_FIELD_CONFIG.key || 'session_used').trim();
  if (!fieldKey) return parsed;
  return {
    ...parsed,
    [fieldKey]: normalizeIntegerInput(
      sessionUsedValue,
      PT_BOOK_SESSION_USED_FIELD_CONFIG.defaultValue,
      PT_BOOK_SESSION_USED_FIELD_CONFIG.min
    )
  };
}

function describePtCustomFields(customFields) {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return 'custom_fields: -';
  const snippets = [];
  if (customFields.performance_score) snippets.push(`score ${customFields.performance_score}`);
  if (customFields.energy_level) snippets.push(`energy ${customFields.energy_level}`);
  if (customFields.body_weight_kg) snippets.push(`weight ${customFields.body_weight_kg}kg`);
  if (customFields.reps) snippets.push(`reps ${customFields.reps}`);
  if (customFields.load_kg) snippets.push(`load ${customFields.load_kg}kg`);
  if (customFields.next_focus) snippets.push(`next ${customFields.next_focus}`);
  if (snippets.length > 0) return snippets.join(' | ');
  return Object.keys(customFields).length > 0 ? `custom_fields: ${JSON.stringify(customFields)}` : 'custom_fields: -';
}

function readConfiguredRowValue(row, fieldPath) {
  return String(fieldPath || '').split('.').reduce((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[key];
  }, row);
}

function resolveConfiguredDateTime(row, fieldPaths = []) {
  for (const fieldPath of Array.isArray(fieldPaths) ? fieldPaths : []) {
    const value = readConfiguredRowValue(row, fieldPath);
    if (value) return value;
  }
  return null;
}

function shouldShowHistoryCompletedAt(row) {
  const activityTypes = Array.isArray(PT_HISTORY_SESSION_CONFIG.completedActivityTypes)
    ? PT_HISTORY_SESSION_CONFIG.completedActivityTypes
    : [];
  const activityType = String(row?.activity_type || '').trim().toLowerCase();
  return activityTypes.includes(activityType);
}

function resolveHistoryCompletedAt(row) {
  const configuredValue = resolveConfiguredDateTime(row, PT_HISTORY_SESSION_CONFIG.completedAtFields);
  if (configuredValue) return configuredValue;
  return shouldShowHistoryCompletedAt(row) ? row?.session_at || null : null;
}

function isEventAwardEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return fallback;
}

function eventParticipantKey(row) {
  const registrationId = String(row?.registration_id || '').trim();
  if (registrationId) return `registration:${registrationId}`;
  const passportId = String(row?.passport_id || '').trim();
  if (passportId) return `passport:${passportId}`;
  const email = String(row?.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  return '';
}

function getNormalizedOrderItems(order) {
  const items = Array.isArray(order?.order_items) && order.order_items.length > 0
    ? order.order_items
    : [order];
  return items.filter((item) => item && typeof item === 'object');
}

export default function PtPage() {
  const PT_TABS = COACH_SIDEBAR_NAV_ITEMS;
  const navigate = useNavigate();
  const session = getSession();
  const accountSlug = getAccountSlug(session);
  const role = String(session?.role || 'pt').toLowerCase();
  const tenantId = session?.tenant?.id || 'tn_001';
  const branchId = session?.branch?.id || 'core';
  const trainerId = session?.user?.userId || null;
  const [targetEnv, setTargetEnv] = useState('pt');
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileAiWorking, setProfileAiWorking] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const profileImageInputRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    full_name: session?.user?.fullName || '',
    photo_url: ''
  });
  const [ptBalances, setPtBalances] = useState([]);
  const [ptActivityRows, setPtActivityRows] = useState([]);
  const [classBookingRows, setClassBookingRows] = useState([]);
  const [classRows, setClassRows] = useState([]);
  const [packageRows, setPackageRows] = useState([]);
  const [orderRows, setOrderRows] = useState([]);
  const [activityEnrollmentRows, setActivityEnrollmentRows] = useState([]);
  const [memberDirectoryRows, setMemberDirectoryRows] = useState([]);
  const [paymentRows, setPaymentRows] = useState([]);
  const [eventRows, setEventRows] = useState([]);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [selectedAwardEventId, setSelectedAwardEventId] = useState('');
  const [selectedAwardParticipantKey, setSelectedAwardParticipantKey] = useState('');
  const [awardForm, setAwardForm] = useState(createAwardForm);
  const [awardLoading, setAwardLoading] = useState(false);
  const [bookForm, setBookForm] = useState(createBookForm);
  const [completeForm, setCompleteForm] = useState(createCompleteForm);
  const [activityForm, setActivityForm] = useState(createActivityForm);
  const allowedEnv = useMemo(() => {
    return getAllowedEnvironments(session, role);
  }, [session, role]);
  const coachSidebarNavItems = useMemo(
    () =>
      COACH_SIDEBAR_NAV_ITEMS.map((item) => ({
        ...item,
        href: `#${item.id}`,
        onClick: (event) => {
          event.preventDefault();
          setActiveTab(item.id);
        }
      })),
    []
  );

  useEffect(() => {
    if (allowedEnv.length === 0) return;
    if (!allowedEnv.includes(targetEnv)) {
      setTargetEnv(allowedEnv[0]);
    }
  }, [allowedEnv, targetEnv]);
  const insightStats = useMemo(() => {
    const uniqueMembers = new Set(ptBalances.map((item) => String(item.member_id || '').trim()).filter(Boolean)).size;
    const remainingSessions = ptBalances.reduce((sum, row) => sum + Number(row.remaining_sessions || 0), 0);
    const today = getAppDateKey(new Date().toISOString());
    const todaySessions = ptActivityRows.filter((row) => getAppDateKey(row.session_at) === today).length;
    return [
      {
        label: 'active member',
        value: uniqueMembers,
        iconClass: 'fa-solid fa-user-group',
        tone: 'tone-subscription',
        hint: 'member assigned to this PT'
      },
      {
        label: 'remaining session',
        value: remainingSessions,
        iconClass: 'fa-solid fa-dumbbell',
        tone: 'tone-booking',
        hint: 'across active PT package'
      },
      {
        label: 'today activity',
        value: todaySessions,
        iconClass: 'fa-solid fa-calendar-day',
        tone: 'tone-checkin',
        hint: 'booked, completed, and log'
      }
    ];
  }, [ptBalances, ptActivityRows]);
  const memberRows = useMemo(() => {
    const grouped = new Map();
    ptBalances.forEach((row) => {
      const memberId = String(row.member_id || '').trim();
      if (!memberId) return;
      const current = grouped.get(memberId) || {
        member_id: memberId,
        package_count: 0,
        total_sessions: 0,
        consumed_sessions: 0,
        remaining_sessions: 0,
        latest_updated_at: ''
      };
      current.package_count += 1;
      current.total_sessions += Number(row.total_sessions || 0);
      current.consumed_sessions += Number(row.consumed_sessions || 0);
      current.remaining_sessions += Number(row.remaining_sessions || 0);
      const updatedAt = String(row.updated_at || row.last_session_at || '').trim();
      if (updatedAt && (!current.latest_updated_at || updatedAt > current.latest_updated_at)) {
        current.latest_updated_at = updatedAt;
      }
      grouped.set(memberId, current);
    });
    return [...grouped.values()].sort((a, b) => a.member_id.localeCompare(b.member_id));
  }, [ptBalances]);
  const bookingMemberRows = useMemo(() => {
    const normalizedTrainerId = String(trainerId || '').trim().toLowerCase();
    const normalizedTrainerName = String(session?.user?.fullName || '').trim().toLowerCase();
    const classById = new Map(
      classRows
        .map((item) => [String(item?.class_id || '').trim(), item])
        .filter(([classId]) => classId)
    );
    const grouped = new Map();
    classBookingRows
      .filter((row) => String(row?.status || '').trim().toLowerCase() !== 'canceled')
      .forEach((row) => {
        const classId = String(row?.class_id || '').trim();
        const classDetail = classById.get(classId) || null;
        const coachId = String(classDetail?.coach_id || '').trim().toLowerCase();
        const trainerName = String(classDetail?.trainer_name || '').trim().toLowerCase();
        const hasCoach = Boolean(classDetail?.has_coach);
        const coachMatched =
          (normalizedTrainerId && coachId && normalizedTrainerId === coachId)
          || (
            normalizedTrainerName
            && trainerName
            && (normalizedTrainerName === trainerName
              || normalizedTrainerName.includes(trainerName)
              || trainerName.includes(normalizedTrainerName))
          );
        if (!hasCoach || !coachMatched) return;
        const memberId = String(row?.member_id || '').trim();
        if (!memberId) return;
        const current = grouped.get(memberId) || {
          member_id: memberId,
          package_count: 0,
          total_sessions: 0,
          consumed_sessions: 0,
          remaining_sessions: 0,
          latest_updated_at: '',
          booking_count: 0
        };
        current.booking_count += 1;
        const updatedAt = String(row?.updated_at || row?.booked_at || '').trim();
        if (updatedAt && (!current.latest_updated_at || updatedAt > current.latest_updated_at)) {
          current.latest_updated_at = updatedAt;
        }
        grouped.set(memberId, current);
      });
    return [...grouped.values()].sort((a, b) => a.member_id.localeCompare(b.member_id));
  }, [classBookingRows, classRows, session?.user?.fullName, trainerId]);
  const memberTabRows = useMemo(() => {
    const grouped = new Map();
    [...memberRows, ...bookingMemberRows].forEach((row) => {
      const memberId = String(row?.member_id || '').trim();
      if (!memberId) return;
      const current = grouped.get(memberId) || {
        member_id: memberId,
        package_count: 0,
        total_sessions: 0,
        consumed_sessions: 0,
        remaining_sessions: 0,
        latest_updated_at: '',
        booking_count: 0
      };
      current.package_count += Number(row?.package_count || 0);
      current.total_sessions += Number(row?.total_sessions || 0);
      current.consumed_sessions += Number(row?.consumed_sessions || 0);
      current.remaining_sessions += Number(row?.remaining_sessions || 0);
      current.booking_count += Number(row?.booking_count || 0);
      const updatedAt = String(row?.latest_updated_at || '').trim();
      if (updatedAt && (!current.latest_updated_at || updatedAt > current.latest_updated_at)) {
        current.latest_updated_at = updatedAt;
      }
      grouped.set(memberId, current);
    });
    return [...grouped.values()].sort((a, b) => a.member_id.localeCompare(b.member_id));
  }, [memberRows, bookingMemberRows]);
  const memberNameById = useMemo(
    () => new Map(
      memberDirectoryRows
        .map((row) => [String(row?.member_id || '').trim(), String(row?.full_name || '').trim()])
        .filter(([memberId, fullName]) => memberId && fullName)
    ),
    [memberDirectoryRows]
  );
  const balanceByPackageId = useMemo(
    () => new Map(ptBalances.map((row) => [String(row.pt_package_id || ''), row])),
    [ptBalances]
  );
  const bookedSessions = useMemo(
    () => ptActivityRows.filter((row) => String(row.activity_type || '').trim().toLowerCase() === 'session_booked'),
    [ptActivityRows]
  );
  const completedSessions = useMemo(
    () => ptActivityRows.filter((row) => String(row.activity_type || '').trim().toLowerCase() === 'session_completed'),
    [ptActivityRows]
  );
  const completedSessionIds = useMemo(
    () => new Set(completedSessions.map((row) => String(row.session_id || '').trim()).filter(Boolean)),
    [completedSessions]
  );
  const pendingBookedSessions = useMemo(
    () => bookedSessions
      .filter((row) => {
        const sessionId = String(row.session_id || '').trim();
        return !sessionId || !completedSessionIds.has(sessionId);
      })
      .sort((a, b) => new Date(a.session_at || 0).getTime() - new Date(b.session_at || 0).getTime()),
    [bookedSessions, completedSessionIds]
  );
  const coachProgramBookedSessions = useMemo(() => {
    const normalizedTrainerId = String(trainerId || '').trim().toLowerCase();
    const normalizedTrainerName = String(session?.user?.fullName || '').trim().toLowerCase();
    const classById = new Map(
      classRows
        .map((item) => [String(item?.class_id || '').trim(), item])
        .filter(([classId]) => classId)
    );
    return classBookingRows
      .filter((row) => String(row?.status || '').trim().toLowerCase() === 'booked')
      .filter((row) => !row?.attendance_checked_out_at)
      .map((row) => {
        const classId = String(row?.class_id || '').trim();
        const classDetail = classById.get(classId) || null;
        const coachId = String(classDetail?.coach_id || '').trim().toLowerCase();
        const trainerName = String(classDetail?.trainer_name || '').trim().toLowerCase();
        const hasCoach = Boolean(classDetail?.has_coach);
        const coachMatched =
          (normalizedTrainerId && coachId && normalizedTrainerId === coachId)
          || (
            normalizedTrainerName
            && trainerName
            && (normalizedTrainerName === trainerName
              || normalizedTrainerName.includes(trainerName)
              || trainerName.includes(normalizedTrainerName))
          );
        if (!hasCoach || !coachMatched) return null;
        const scheduleStartAt = row?.schedule_choice?.start_at || classDetail?.start_at || row?.booked_at || null;
        return {
          activity_id: `class_booking:${row?.booking_id || classId}`,
          session_id: String(row?.booking_id || '').trim() || null,
          session_at: scheduleStartAt,
          activity_note: classDetail?.class_name || classDetail?.title || classId || 'Booked program',
          custom_fields: row?.registration_answers && typeof row.registration_answers === 'object' ? row.registration_answers : {},
          pt_package_id: null,
          member_id: String(row?.member_id || '').trim(),
          source_kind: 'class_booking',
          booking_kind: String(row?.booking_kind || '').trim().toLowerCase() || 'member',
          class_id: classId,
          schedule_label: String(row?.schedule_label || '').trim()
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.session_at || 0).getTime() - new Date(b.session_at || 0).getTime());
  }, [classBookingRows, classRows, session?.user?.fullName, trainerId]);
  const upcomingBookedSessions = useMemo(
    () => [...pendingBookedSessions, ...coachProgramBookedSessions]
      .sort((a, b) => new Date(a.session_at || 0).getTime() - new Date(b.session_at || 0).getTime()),
    [pendingBookedSessions, coachProgramBookedSessions]
  );
  const recentCompletedSessions = useMemo(
    () => [...completedSessions].sort((a, b) => new Date(b.session_at || 0).getTime() - new Date(a.session_at || 0).getTime()),
    [completedSessions]
  );
  const coachProgramCompletedSessions = useMemo(() => {
    const normalizedTrainerId = String(trainerId || '').trim().toLowerCase();
    const normalizedTrainerName = String(session?.user?.fullName || '').trim().toLowerCase();
    const classById = new Map(
      classRows
        .map((item) => [String(item?.class_id || '').trim(), item])
        .filter(([classId]) => classId)
    );
    return classBookingRows
      .filter((row) => String(row?.status || '').trim().toLowerCase() === 'booked')
      .filter((row) => row?.attendance_checked_out_at)
      .map((row) => {
        const classId = String(row?.class_id || '').trim();
        const classDetail = classById.get(classId) || null;
        const coachId = String(classDetail?.coach_id || '').trim().toLowerCase();
        const trainerName = String(classDetail?.trainer_name || '').trim().toLowerCase();
        const hasCoach = Boolean(classDetail?.has_coach);
        const coachMatched =
          (normalizedTrainerId && coachId && normalizedTrainerId === coachId)
          || (
            normalizedTrainerName
            && trainerName
            && (normalizedTrainerName === trainerName
              || normalizedTrainerName.includes(trainerName)
              || trainerName.includes(normalizedTrainerName))
          );
        if (!hasCoach || !coachMatched) return null;
        const sessionAt = row?.attendance_checked_out_at
          || row?.attendance_checked_in_at
          || row?.attendance_confirmed_at
          || row?.booked_at
          || null;
        return {
          activity_id: `class_checkout:${row?.booking_id || classId}`,
          pt_package_id: null,
          member_id: String(row?.member_id || '').trim(),
          session_id: String(row?.booking_id || '').trim() || null,
          session_at: sessionAt,
          completed_at: row?.attendance_checked_out_at || null,
          activity_type: 'program_completed',
          activity_note: classDetail?.class_name || classDetail?.title || classId || 'Program booking',
          custom_fields: row?.registration_answers && typeof row.registration_answers === 'object' ? row.registration_answers : {},
          source_kind: 'class_booking',
          booking_kind: String(row?.booking_kind || '').trim().toLowerCase() || 'member',
          schedule_label: String(row?.schedule_label || '').trim()
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.session_at || 0).getTime() - new Date(a.session_at || 0).getTime());
  }, [classBookingRows, classRows, session?.user?.fullName, trainerId]);
  const historySessionRows = useMemo(
    () => [...ptActivityRows, ...coachProgramCompletedSessions]
      .sort((a, b) => new Date(b.session_at || 0).getTime() - new Date(a.session_at || 0).getTime()),
    [ptActivityRows, coachProgramCompletedSessions]
  );
  const paymentById = useMemo(
    () => new Map(paymentRows.map((row) => [String(row.payment_id || ''), row])),
    [paymentRows]
  );
  const incentiveRows = useMemo(() => {
    return recentCompletedSessions.map((row) => {
      const balance = balanceByPackageId.get(String(row.pt_package_id || '')) || null;
      const payment = balance?.payment_id ? paymentById.get(String(balance.payment_id || '')) || null : null;
      const packageAmount = Number(payment?.amount || 0);
      const totalSessions = Number(balance?.total_sessions || 0);
      const estimatedSessionValue = totalSessions > 0 ? packageAmount / totalSessions : 0;
      return {
        ...row,
        estimated_session_value: estimatedSessionValue,
        payment_amount: packageAmount,
        total_sessions: totalSessions
      };
    });
  }, [recentCompletedSessions, balanceByPackageId, paymentById]);
  const incentiveSummary = useMemo(() => {
    const totalCompleted = incentiveRows.length;
    const totalEstimatedValue = incentiveRows.reduce((sum, row) => sum + Number(row.estimated_session_value || 0), 0);
    const activeMembers = new Set(incentiveRows.map((row) => String(row.member_id || '')).filter(Boolean)).size;
    return {
      totalCompleted,
      totalEstimatedValue,
      activeMembers
    };
  }, [incentiveRows]);
  const purchasedProgramRows = useMemo(() => {
    const allowedClassTypes = new Set(['scheduled', 'session_pack']);
    const allowedReferenceTypes = new Set(['activity_purchase', 'open_access_purchase', 'session_pack_purchase']);
    const classById = new Map(
      classRows
        .map((item) => [String(item?.class_id || '').trim(), item])
        .filter(([classId]) => classId)
    );
    const packageClassIdByPackageId = new Map(
      packageRows
        .map((item) => [String(item?.package_id || '').trim(), String(item?.class_id || '').trim()])
        .filter(([packageId, classId]) => packageId && classId)
    );
    const normalizedTrainerId = String(trainerId || '').trim().toLowerCase();
    const normalizedTrainerName = String(session?.user?.fullName || '').trim().toLowerCase();
    const enrollmentByMemberClass = new Map();
    activityEnrollmentRows.forEach((row) => {
      const memberId = String(row?.member_id || '').trim();
      const classId = String(row?.class_id || '').trim();
      if (!memberId || !classId) return;
      const key = `${memberId}:${classId}`;
      if (enrollmentByMemberClass.has(key)) return;
      enrollmentByMemberClass.set(key, row);
    });
    const seen = new Set();
    const rows = [];
    orderRows.forEach((order) => {
      const orderStatus = String(order?.status || '').trim().toLowerCase();
      const paymentStatus = String(order?.payment_status || '').trim().toLowerCase();
      const isPurchased = orderStatus === 'paid' || paymentStatus === 'confirmed';
      if (!isPurchased) return;
      const memberId = String(order?.member_id || '').trim();
      if (!memberId) return;
      getNormalizedOrderItems(order).forEach((item) => {
        const referenceType = String(item?.reference_type || '').trim().toLowerCase();
        const referenceId = String(item?.reference_id || '').trim();
        if (!referenceId || !allowedReferenceTypes.has(referenceType)) return;
        const mappedClassId = packageClassIdByPackageId.get(referenceId);
        const classId = mappedClassId || referenceId;
        const classDetail = classById.get(classId) || null;
        const classType = String(classDetail?.class_type || 'scheduled').trim().toLowerCase();
        if (!classDetail || !allowedClassTypes.has(classType)) return;
        const coachId = String(classDetail?.coach_id || '').trim().toLowerCase();
        const trainerName = String(classDetail?.trainer_name || '').trim().toLowerCase();
        const hasCoach = Boolean(classDetail?.has_coach);
        const coachMatched =
          (normalizedTrainerId && coachId && normalizedTrainerId === coachId)
          || (
            normalizedTrainerName
            && trainerName
            && (normalizedTrainerName === trainerName
              || normalizedTrainerName.includes(trainerName)
              || trainerName.includes(normalizedTrainerName))
          );
        if (!hasCoach || !coachMatched) return;
        const key = `${memberId}:${classId}`;
        if (seen.has(key)) return;
        seen.add(key);
        const enrollmentRow = enrollmentByMemberClass.get(key) || null;
        const usageLimit = Number(classDetail?.usage_limit || 0);
        const hasRemainingUsage = enrollmentRow?.remaining_usage !== null && enrollmentRow?.remaining_usage !== undefined;
        const remainingUsage = hasRemainingUsage ? Number(enrollmentRow?.remaining_usage || 0) : null;
        rows.push({
          member_id: memberId,
          class_id: classId,
          class_type: classType,
          class_name: String(classDetail?.class_name || classDetail?.title || classId).trim(),
          usage_mode: String(classDetail?.usage_mode || '').trim().toLowerCase(),
          usage_limit: usageLimit,
          total_sessions: usageLimit > 0 ? usageLimit : null,
          remaining_sessions: usageLimit > 0
            ? (hasRemainingUsage && Number.isFinite(remainingUsage) ? remainingUsage : usageLimit)
            : null
        });
      });
    });
    return rows.sort((a, b) => {
      if (a.member_id !== b.member_id) return a.member_id.localeCompare(b.member_id);
      return a.class_name.localeCompare(b.class_name);
    });
  }, [activityEnrollmentRows, classRows, orderRows, packageRows, session?.user?.fullName, trainerId]);
  const bookMemberOptions = useMemo(() => {
    const grouped = new Map();
    purchasedProgramRows.forEach((row) => {
      const memberId = String(row?.member_id || '').trim();
      if (!memberId) return;
      const current = grouped.get(memberId) || {
        member_id: memberId,
        program_count: 0
      };
      current.program_count += 1;
      grouped.set(memberId, current);
    });
    return [...grouped.values()].sort((a, b) => a.member_id.localeCompare(b.member_id));
  }, [purchasedProgramRows]);
  const bookProgramOptions = useMemo(() => {
    const memberId = String(bookForm.member_id || '').trim();
    if (!memberId) return purchasedProgramRows;
    return purchasedProgramRows.filter((row) => String(row?.member_id || '').trim() === memberId);
  }, [bookForm.member_id, purchasedProgramRows]);
  const completeProgramOptions = useMemo(() => {
    const memberId = String(completeForm.member_id || '').trim();
    if (!memberId) return purchasedProgramRows;
    return purchasedProgramRows.filter((row) => String(row?.member_id || '').trim() === memberId);
  }, [completeForm.member_id, purchasedProgramRows]);
  const activityPackageOptions = useMemo(() => {
    const memberId = String(activityForm.member_id || '').trim();
    if (!memberId) return ptBalances;
    return ptBalances.filter((row) => String(row.member_id || '').trim() === memberId);
  }, [activityForm.member_id, ptBalances]);
  const awardEventOptions = useMemo(
    () => [...eventRows].sort((a, b) => new Date(b.start_at || b.updated_at || 0).getTime() - new Date(a.start_at || a.updated_at || 0).getTime()),
    [eventRows]
  );
  const selectedAwardEvent = useMemo(
    () => awardEventOptions.find((item) => String(item.event_id || '') === String(selectedAwardEventId || '')) || null,
    [awardEventOptions, selectedAwardEventId]
  );
  const selectedAwardParticipant = useMemo(
    () => eventParticipants.find((item) => eventParticipantKey(item) === selectedAwardParticipantKey) || null,
    [eventParticipants, selectedAwardParticipantKey]
  );
  const awardedParticipants = useMemo(
    () => eventParticipants
      .filter((item) => item?.rank !== null || Number(item?.score_points || 0) > 0 || String(item?.award_title || '').trim())
      .sort((a, b) => {
        const rankA = a?.rank === null || a?.rank === undefined ? Number.MAX_SAFE_INTEGER : Number(a.rank);
        const rankB = b?.rank === null || b?.rank === undefined ? Number.MAX_SAFE_INTEGER : Number(b.rank);
        if (rankA !== rankB) return rankA - rankB;
        return Number(b?.score_points || 0) - Number(a?.score_points || 0);
      }),
    [eventParticipants]
  );
  const awardSummary = useMemo(() => {
    const awardedCount = awardedParticipants.length;
    const totalScore = awardedParticipants.reduce((sum, item) => sum + Number(item.score_points || 0), 0);
    const topRankedCount = awardedParticipants.filter((item) => item?.rank !== null && item?.rank !== undefined).length;
    return {
      awardedCount,
      totalScore,
      topRankedCount
    };
  }, [awardedParticipants]);

  function buildCoachImageKeywords() {
    const cityToken = String(session?.tenant?.city || '').trim().split(/[,\s]+/)[0] || 'Indonesia';
    const accountToken = String(accountSlug || '').replace(/[-_]+/g, ' ').trim();
    const keywords = [
      `${String(profileForm.full_name || '').trim()} coach portrait`.trim(),
      `${String(profileForm.full_name || '').trim()} personal trainer`.trim(),
      `${accountToken} coach ${cityToken}`.trim(),
      `${sentenceCase(role)} fitness portrait ${cityToken}`.trim()
    ]
      .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
      .filter((item) => item.length >= 3);
    return [...new Set(keywords)];
  }

  async function fetchPexelsPhotos(keyword, perPage = 20) {
    const query = String(keyword || '').trim() || 'fitness coach portrait';
    const result = await apiJson(
      `/v1/ai/pexels/search?tenant_id=${encodeURIComponent(tenantId)}&query=${encodeURIComponent(query)}&per_page=${encodeURIComponent(perPage)}`
    );
    return Array.isArray(result.rows) ? result.rows : [];
  }

  async function loadPtWorkspace() {
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
      const trainerFilter = trainerId ? `&trainer_id=${encodeURIComponent(trainerId)}` : '';
      const [profileRes, balanceRes, activityRes, paymentRes, eventRes, bookingRes, classRes, packageRes, orderRes, enrollmentRes, memberRes] = await Promise.all([
        apiJson(`/v1/pt/profile?tenant_id=${encodeURIComponent(tenantId)}&user_id=${encodeURIComponent(trainerId || '')}`).catch(() => ({ row: null })),
        apiJson(`/v1/read/pt-balance?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}${trainerFilter}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/pt-activity?tenant_id=${encodeURIComponent(tenantId)}${trainerFilter}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/payments/history?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/events?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&status=all&limit=200`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/bookings?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/orders?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=500`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/activity-enrollments?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
        apiJson(`/v1/read/members?tenant_id=${encodeURIComponent(tenantId)}&limit=1000`).catch(() => ({ rows: [] }))
      ]);
      const profileRow = profileRes?.row || null;
      if (profileRow) {
        setProfileForm({
          full_name: String(profileRow.full_name || session?.user?.fullName || ''),
          photo_url: String(profileRow.photo_url || '')
        });
      }
      const balances = Array.isArray(balanceRes.rows) ? balanceRes.rows : [];
      setPtBalances(balances);
      setPtActivityRows(Array.isArray(activityRes.rows) ? activityRes.rows : []);
      setClassBookingRows(Array.isArray(bookingRes.rows) ? bookingRes.rows : []);
      const scopedClassRows = Array.isArray(classRes.rows) ? classRes.rows : [];
      const scopedPackageRows = Array.isArray(packageRes.rows) ? packageRes.rows : [];
      const scopedOrderRows = Array.isArray(orderRes.rows) ? orderRes.rows : [];
      let finalClassRows = scopedClassRows;
      let finalPackageRows = scopedPackageRows;
      let finalOrderRows = scopedOrderRows;
      if (finalClassRows.length === 0 || finalPackageRows.length === 0 || finalOrderRows.length === 0) {
        const [globalClassRes, globalPackageRes, globalOrderRes] = await Promise.all([
          apiJson(`/v1/read/class-availability?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/admin/packages?tenant_id=${encodeURIComponent(tenantId)}`).catch(() => ({ rows: [] })),
          apiJson(`/v1/read/orders?tenant_id=${encodeURIComponent(tenantId)}&limit=500`).catch(() => ({ rows: [] }))
        ]);
        if (finalClassRows.length === 0) finalClassRows = Array.isArray(globalClassRes?.rows) ? globalClassRes.rows : [];
        if (finalPackageRows.length === 0) finalPackageRows = Array.isArray(globalPackageRes?.rows) ? globalPackageRes.rows : [];
        if (finalOrderRows.length === 0) finalOrderRows = Array.isArray(globalOrderRes?.rows) ? globalOrderRes.rows : [];
      }
      setClassRows(finalClassRows);
      setPackageRows(finalPackageRows);
      setOrderRows(finalOrderRows);
      setActivityEnrollmentRows(Array.isArray(enrollmentRes.rows) ? enrollmentRes.rows : []);
      setMemberDirectoryRows(Array.isArray(memberRes.rows) ? memberRes.rows : []);
      setPaymentRows(Array.isArray(paymentRes.rows) ? paymentRes.rows : []);
      const nextEventRows = Array.isArray(eventRes.rows) ? eventRes.rows : [];
      setEventRows(nextEventRows);
      if (nextEventRows.length > 0) {
        const preferredEvent =
          nextEventRows.find((item) => isEventAwardEnabled(item?.award_enabled, true))
          || nextEventRows[0];
        setSelectedAwardEventId((prev) => prev || String(preferredEvent?.event_id || ''));
      }

      if (balances.length > 0) {
        const first = balances[0];
        setBookForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
        setCompleteForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
        setActivityForm((prev) => ({
          ...prev,
          pt_package_id: prev.pt_package_id || String(first.pt_package_id || ''),
          member_id: prev.member_id || String(first.member_id || '')
        }));
      }
    } catch (err) {
      setError(err.message || 'failed to load PT workspace');
    } finally {
      setLoading(false);
    }
  }

  async function loadAwardParticipants(eventId) {
    const normalizedEventId = String(eventId || '').trim();
    if (!normalizedEventId) {
      setEventParticipants([]);
      setSelectedAwardParticipantKey('');
      return;
    }
    try {
      setAwardLoading(true);
      const result = await apiJson(
        `/v1/admin/events/${encodeURIComponent(normalizedEventId)}/participants?tenant_id=${encodeURIComponent(tenantId)}&branch_id=${encodeURIComponent(branchId)}&limit=300`
      ).catch(() => ({ rows: [] }));
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setEventParticipants(rows);
      setSelectedAwardParticipantKey((prev) => {
        if (prev && rows.some((item) => eventParticipantKey(item) === prev)) return prev;
        return rows[0] ? eventParticipantKey(rows[0]) : '';
      });
    } finally {
      setAwardLoading(false);
    }
  }

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

  async function submitAward(e) {
    e.preventDefault();
    if (!selectedAwardEventId) {
      setFeedback('Pilih event dulu.');
      return;
    }
    if (!selectedAwardParticipant) {
      setFeedback('Pilih member event yang ingin diberi score atau award.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = parseCustomFieldsInput(awardForm.custom_fields_text, 'Award');
      const result = await apiJson(`/v1/admin/events/${encodeURIComponent(selectedAwardEventId)}/participants/award`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          registration_id: selectedAwardParticipant.registration_id || null,
          passport_id: selectedAwardParticipant.passport_id || null,
          email: selectedAwardParticipant.email || null,
          full_name: selectedAwardParticipant.full_name || null,
          rank: awardForm.rank || null,
          score_points: awardForm.score_points || null,
          award_scope: awardForm.award_scope || 'overall',
          award_title: awardForm.award_title || null,
          award_note: awardForm.award_note || null,
          custom_fields: customFields
        })
      });
      setFeedback(
        `Award saved untuk ${selectedAwardParticipant.full_name || selectedAwardParticipant.email || selectedAwardParticipant.passport_id || '-'}` +
        `${result?.rank ? ` (rank ${result.rank})` : ''}`
      );
      setAwardForm(createAwardForm());
      await loadAwardParticipants(selectedAwardEventId);
    } catch (err) {
      setFeedback(err.message || 'Gagal menyimpan award event.');
    } finally {
      setSaving(false);
    }
  }

  async function submitProfile(e) {
    e.preventDefault();
    const fullName = String(profileForm.full_name || '').trim();
    const photoUrl = String(profileForm.photo_url || '').trim();
    if (!fullName) {
      setFeedback('Nama coach wajib diisi.');
      return;
    }
    try {
      setProfileSaving(true);
      setFeedback('');
      const result = await apiJson('/v1/pt/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: trainerId,
          full_name: fullName,
          photo_url: photoUrl || null
        })
      });
      const row = result?.row || null;
      const nextSession = {
        ...(session || {}),
        user: {
          ...(session?.user || {}),
          userId: trainerId,
          fullName: String(row?.full_name || fullName),
          photoUrl: String(row?.photo_url || photoUrl || '')
        }
      };
      setSession(nextSession);
      setProfileForm({
        full_name: String(row?.full_name || fullName),
        photo_url: String(row?.photo_url || photoUrl || '')
      });
      setFeedback('Profil coach berhasil disimpan.');
    } catch (err) {
      setFeedback(err.message || 'Gagal menyimpan profil coach.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function onProfileImageUpload(event) {
    try {
      const file = event.target.files?.[0] || null;
      if (!file) return;
      if (!String(file.type || '').startsWith('image/')) {
        throw new Error('File harus berupa gambar.');
      }
      const maxBytes = 5 * 1024 * 1024;
      if (Number(file.size || 0) > maxBytes) {
        throw new Error('Ukuran gambar maksimal 5MB.');
      }
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        throw new Error('Gagal memproses gambar.');
      }
      const uploadRes = await apiJson('/v1/admin/uploads/image', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          folder: 'coach-profile',
          filename: file.name || 'coach-profile-image',
          data_url: dataUrl
        })
      });
      const imageUrl = String(uploadRes?.url || '').trim();
      if (!imageUrl) {
        throw new Error('Upload berhasil tapi URL gambar tidak tersedia.');
      }
      setProfileForm((prev) => ({ ...prev, photo_url: imageUrl }));
      setFeedback('coach.image.uploaded: Foto coach berhasil diunggah ke S3.');
    } catch (err) {
      setFeedback(err.message || 'Gagal upload foto coach.');
    } finally {
      event.target.value = '';
    }
  }

  async function aiFillCoachGallery() {
    try {
      setProfileAiWorking(true);
      const keywordCandidates = buildCoachImageKeywords();
      if (keywordCandidates.length === 0) {
        throw new Error('Isi nama coach dulu agar gambar bisa digenerate.');
      }
      let keyword = keywordCandidates[0];
      let photos = [];
      let lastError = null;
      for (const candidate of keywordCandidates) {
        keyword = candidate;
        try {
          photos = await fetchPexelsPhotos(candidate, 20);
        } catch (error) {
          lastError = error;
          photos = [];
        }
        if (photos.length > 0) break;
      }
      if (photos.length === 0) {
        if (lastError) throw lastError;
        setFeedback('ai.assist: Pexels tidak menemukan gambar untuk coach ini.');
        return;
      }
      const urls = shuffleList(photos)
        .map((item) => item?.image_url || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      setProfileForm((prev) => ({
        ...prev,
        photo_url: urls[0] || prev.photo_url
      }));
      setFeedback(`ai.assist: Foto coach diisi dari Pexels (${keyword}).`);
    } catch (error) {
      setFeedback(error.message || 'ai.assist: Gagal mengambil gambar coach.');
    } finally {
      setProfileAiWorking(false);
    }
  }

  async function submitBookSession(e) {
    e.preventDefault();
    if (!bookForm.pt_package_id || !bookForm.member_id || !bookForm.session_at) {
      setFeedback('Lengkapi program, member, dan jadwal sesi.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = buildBookSessionCustomFields(bookForm.custom_fields_text, bookForm.session_used);
      const selectedClass = classRows.find((item) => String(item?.class_id || '').trim() === String(bookForm.pt_package_id || '').trim()) || null;
      const scheduleOptions = getProgramScheduleOptions(selectedClass);
      const selectedSchedule = resolveScheduleChoiceBySessionAt(scheduleOptions, bookForm.session_at);
      await apiJson('/v1/bookings/classes/create', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          class_id: bookForm.pt_package_id,
          booking_kind: 'pt',
          member_id: bookForm.member_id,
          schedule_choice: selectedSchedule?.key || null,
          schedule_label: selectedSchedule?.label || null,
          booked_at: toAppIsoFromDateTimeInput(bookForm.session_at),
          activity_note: bookForm.activity_note || null,
          registration_answers: customFields
        })
      });
      setFeedback('Program booking berhasil dibuat.');
      setBookForm((prev) => ({
        ...createBookForm(),
        pt_package_id: prev.pt_package_id,
        member_id: prev.member_id
      }));
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal membuat booking program.');
    } finally {
      setSaving(false);
    }
  }

  async function submitCompleteSession(e) {
    e.preventDefault();
    if (!completeForm.pt_package_id || !completeForm.member_id || !completeForm.completed_at) {
      setFeedback('Lengkapi package, member, dan waktu selesai sesi.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const completedAtIso = toAppIsoFromDateTimeInput(completeForm.completed_at);
      const selectedProgram = classRows.find(
        (item) => String(item?.class_id || '').trim() === String(completeForm.pt_package_id || '').trim()
      ) || null;
      if (selectedProgram) {
        const customFields = buildPerformanceCustomFields(
          completeForm.custom_fields_text,
          'Complete session',
          completeForm.performance_fields
        );
        const normalizedMemberId = String(completeForm.member_id || '').trim();
        const normalizedClassId = String(selectedProgram.class_id || '').trim();
        const normalizedSessionId = String(completeForm.session_id || '').trim();
        const candidateRows = classBookingRows
          .filter((row) => String(row?.status || '').trim().toLowerCase() === 'booked')
          .filter((row) => !row?.attendance_checked_out_at)
          .filter((row) => String(row?.member_id || '').trim() === normalizedMemberId)
          .filter((row) => String(row?.class_id || '').trim() === normalizedClassId)
          .sort((a, b) => new Date(b?.booked_at || 0).getTime() - new Date(a?.booked_at || 0).getTime());
        const targetBooking = normalizedSessionId
          ? candidateRows.find((row) => String(row?.booking_id || '').trim() === normalizedSessionId) || null
          : candidateRows[0] || null;
        if (!targetBooking?.booking_id) {
          setFeedback('Booking program belum ditemukan untuk member ini. Buat booking dulu di tab Book list.');
          return;
        }
        const bookingId = String(targetBooking.booking_id || '').trim();
        await apiJson(`/v1/bookings/classes/${encodeURIComponent(bookingId)}/attendance-confirm`, {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: tenantId,
            branch_id: branchId,
            actor_id: trainerId || undefined,
            checked_in_at: completedAtIso
          })
        });
        const checkoutPayload = {
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          checked_out_at: completedAtIso,
          custom_fields: customFields
        };
        let checkoutError = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await apiJson(`/v1/bookings/classes/${encodeURIComponent(bookingId)}/checkout`, {
              method: 'POST',
              body: JSON.stringify(checkoutPayload)
            });
            checkoutError = null;
            break;
          } catch (error) {
            const message = String(error?.message || '').toLowerCase();
            const shouldRetry = message.includes('must be checked in first');
            if (!shouldRetry || attempt === 2) {
              checkoutError = error;
              break;
            }
            await sleep(250);
          }
        }
        if (checkoutError) {
          throw checkoutError;
        }
        setFeedback('Program booking completed.');
        setCompleteForm((prev) => ({
          ...createCompleteForm(),
          pt_package_id: prev.pt_package_id,
          member_id: prev.member_id
        }));
        await loadPtWorkspace();
        return;
      }
      const customFields = buildPerformanceCustomFields(
        completeForm.custom_fields_text,
        'Complete session',
        completeForm.performance_fields
      );
      await apiJson(`/v1/pt/sessions/${encodeURIComponent(completeForm.pt_package_id)}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          member_id: completeForm.member_id,
          session_id: completeForm.session_id || null,
          completed_at: completedAtIso,
          activity_note: completeForm.activity_note || null,
          custom_fields: customFields
        })
      });
      setFeedback('Session completed.');
      setCompleteForm((prev) => ({
        ...createCompleteForm(),
        pt_package_id: prev.pt_package_id,
        member_id: prev.member_id
      }));
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal menyelesaikan session.');
    } finally {
      setSaving(false);
    }
  }

  async function submitActivityLog(e) {
    e.preventDefault();
    if (!activityForm.member_id || !activityForm.activity_note) {
      setFeedback('Lengkapi member dan catatan aktivitas.');
      return;
    }
    try {
      setSaving(true);
      setFeedback('');
      const customFields = buildPerformanceCustomFields(
        activityForm.custom_fields_text,
        'Activity log',
        activityForm.performance_fields
      );
      await apiJson('/v1/pt/activity/log', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          branch_id: branchId,
          actor_id: trainerId || undefined,
          trainer_id: trainerId || undefined,
          pt_package_id: activityForm.pt_package_id || null,
          member_id: activityForm.member_id,
          session_at: toAppIsoFromDateTimeInput(activityForm.session_at),
          activity_note: activityForm.activity_note,
          custom_fields: customFields
        })
      });
      setFeedback('Activity logged.');
      setActivityForm((prev) => ({
        ...createActivityForm(),
        pt_package_id: prev.pt_package_id,
        member_id: prev.member_id
      }));
      await loadPtWorkspace();
    } catch (err) {
      setFeedback(err.message || 'Gagal log activity.');
    } finally {
      setSaving(false);
    }
  }

  function seedFormsFromBalance(row) {
    const packageId = String(row?.pt_package_id || '');
    const memberId = String(row?.member_id || '');
    setBookForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
    setCompleteForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
    setActivityForm((prev) => ({ ...prev, pt_package_id: packageId, member_id: memberId }));
  }

  function seedMemberIntoForms(memberId, nextTab = 'book') {
    const normalizedMemberId = String(memberId || '').trim();
    if (!normalizedMemberId) return;
    setBookForm((prev) => ({ ...prev, member_id: normalizedMemberId }));
    setCompleteForm((prev) => ({ ...prev, member_id: normalizedMemberId }));
    setActivityForm((prev) => ({ ...prev, member_id: normalizedMemberId }));
    setActiveTab(nextTab);
  }

  function seedBookFromActivity(row) {
    setBookForm((prev) => ({
      ...prev,
      pt_package_id: String(row?.pt_package_id || prev.pt_package_id || ''),
      member_id: String(row?.member_id || prev.member_id || ''),
      session_used: String(row?.custom_fields?.[PT_BOOK_SESSION_USED_FIELD_CONFIG.key] || prev.session_used || PT_BOOK_SESSION_USED_FIELD_CONFIG.defaultValue || 1),
      session_at: row?.session_at ? getAppDateTimeInputValue(row.session_at) : prev.session_at,
      activity_note: String(row?.activity_note || prev.activity_note || ''),
      custom_fields_text: row?.custom_fields && Object.keys(row.custom_fields).length > 0 ? JSON.stringify(row.custom_fields, null, 2) : ''
    }));
    setActiveTab('book');
  }

  function seedCompleteFromActivity(row) {
    setCompleteForm((prev) => ({
      ...prev,
      pt_package_id: String(row?.pt_package_id || prev.pt_package_id || ''),
      member_id: String(row?.member_id || prev.member_id || ''),
      session_id: String(row?.session_id || prev.session_id || ''),
      completed_at: row?.session_at ? getAppDateTimeInputValue(row.session_at) : prev.completed_at,
      activity_note: String(row?.activity_note || prev.activity_note || ''),
      custom_fields_text: row?.custom_fields && Object.keys(row.custom_fields).length > 0 ? JSON.stringify(row.custom_fields, null, 2) : '',
      performance_fields: createPerformanceFields()
    }));
    setActiveTab('complete');
  }

  function seedAwardFromParticipant(row) {
    const key = eventParticipantKey(row);
    setSelectedAwardParticipantKey(key);
    setAwardForm({
      rank: row?.rank === null || row?.rank === undefined ? '' : String(row.rank),
      score_points: row?.score_points ? String(row.score_points) : '',
      award_scope: String(row?.award_scope || 'overall'),
      award_title: String(row?.award_title || ''),
      award_note: String(row?.award_note || ''),
      custom_fields_text:
        row?.award_custom_fields && Object.keys(row.award_custom_fields).length > 0
          ? JSON.stringify(row.award_custom_fields, null, 2)
          : ''
    });
    setActiveTab('award');
  }

  useEffect(() => {
    loadPtWorkspace();
  }, [tenantId, branchId, trainerId]);

  useEffect(() => {
    if (!selectedAwardEventId) {
      setEventParticipants([]);
      setSelectedAwardParticipantKey('');
      return;
    }
    loadAwardParticipants(selectedAwardEventId);
  }, [selectedAwardEventId, tenantId, branchId]);

  return (
    <BackendWorkspaceShell
      activeNavId={activeTab}
      navItems={coachSidebarNavItems}
      eyebrow="Foremoz Admin"
      title="Coach"
      subtitle="Session booking, completion, and member activity tracking"
      session={session}
      role={role}
      userName={profileForm.full_name || session?.user?.fullName || 'PT'}
      allowedEnv={allowedEnv}
      targetEnv={targetEnv}
      getEnvironmentLabel={getEnvironmentLabel}
      onSelectEnv={(env) => {
        setTargetEnv(env);
        goToEnv(env);
      }}
      onSignOut={signOut}
    >
      {activeTab === 'insight' ? (
        <section style={{ marginTop: '1rem' }}>
          <p className="eyebrow">Insight</p>
          <section className="stats-grid">
            {insightStats.map((s) => (
              <Stat key={s.label} label={s.label} value={s.value} iconClass={s.iconClass} tone={s.tone} hint={s.hint} />
            ))}
          </section>
        </section>
      ) : null}

      {loading ? <p className="feedback">Loading PT workspace...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {feedback ? <p className="feedback">{feedback}</p> : null}

      {activeTab !== 'insight' ? (
      <section className="card admin-main" style={{ marginTop: '1rem' }}>
        {activeTab === 'profile' ? (
          <div>
            <h2>Coach profile</h2>
            <form className="form" onSubmit={submitProfile}>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(140px, 180px) minmax(0, 1fr)', alignItems: 'start' }}>
                <div>
                  <div className="photo-preview-box" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '1rem', overflow: 'hidden' }}>
                    {profileForm.photo_url ? (
                      <img src={profileForm.photo_url} alt={profileForm.full_name || 'Coach'} className="photo-preview-image" />
                    ) : (
                      <div className="empty-photo-preview">Belum ada foto</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.9rem' }}>
                  <label>
                    Coach Name
                    <input
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Nama coach"
                    />
                  </label>
                  <label>
                    Profile Image URL
                    <input
                      value={profileForm.photo_url}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, photo_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                  <div className="row-actions" style={{ marginTop: '-0.2rem' }}>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                    >
                      Upload Image
                    </button>
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={onProfileImageUpload}
                    />
                    <button
                      className="btn ghost small"
                      type="button"
                      disabled={profileAiWorking}
                      onClick={aiFillCoachGallery}
                    >
                      AI Fill Gallery
                    </button>
                  </div>
                  <div>
                    <button className="btn" type="submit" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save coach profile'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : null}
        {activeTab === 'book' ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div className="ops-grid">
              <section className="card">
                <p className="eyebrow">Add booking schedule</p>
                <h2>Book session untuk member</h2>
                <p className="feedback">Gunakan ini saat member belum booking dari sisi mereka. PT bisa langsung menambahkan jadwal sesi dari dashboard.</p>
                <form className="form" onSubmit={submitBookSession}>
                  <label>
                    member_id
                    <select
                      value={bookForm.member_id}
                      onChange={(e) =>
                        setBookForm((p) => ({
                          ...p,
                          member_id: e.target.value,
                          pt_package_id: ''
                        }))
                      }
                    >
                      <option value="">Pilih member</option>
                      {bookMemberOptions.map((item) => (
                        <option key={item.member_id} value={item.member_id}>
                          {(memberNameById.get(String(item.member_id || '').trim()) || item.member_id)}
                          {` - ${item.member_id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    pt_package_id (program)
                    <select
                      value={bookForm.pt_package_id}
                      onChange={(e) => setBookForm((p) => ({ ...p, pt_package_id: e.target.value }))}
                    >
                      <option value="">Pilih program scheduled</option>
                      {bookProgramOptions.map((item) => (
                        <option key={`${item.member_id}:${item.class_id}`} value={item.class_id}>
                          {item.class_name} | {item.class_id} | {item.member_id}
                          {` | remaining ${item.usage_mode === 'limited' && item.total_sessions
                            ? `${item.total_sessions}/${item.remaining_sessions ?? item.total_sessions}`
                            : '-'}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {PT_BOOK_SESSION_USED_FIELD_CONFIG.label}
                    <input
                      type="number"
                      min={PT_BOOK_SESSION_USED_FIELD_CONFIG.min || 1}
                      step="1"
                      value={bookForm.session_used}
                      onChange={(e) => setBookForm((p) => ({ ...p, session_used: e.target.value }))}
                    />
                  </label>
                  <label>session_at<input type="datetime-local" value={bookForm.session_at} onChange={(e) => setBookForm((p) => ({ ...p, session_at: e.target.value }))} /></label>
                  <label>activity_note<input value={bookForm.activity_note} onChange={(e) => setBookForm((p) => ({ ...p, activity_note: e.target.value }))} placeholder="Contoh: Upper body, mobility, assessment" /></label>
                  <label>custom_fields (JSON)<textarea rows={3} value={bookForm.custom_fields_text} onChange={(e) => setBookForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"booking_source":"pt_dashboard","planned_focus":"upper body"}' /></label>
                  <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Book program'}</button>
                </form>
              </section>

              <div style={{ display: 'grid', gap: '0.8rem', alignContent: 'start', alignSelf: 'start', gridColumn: 'span 2' }}>
                <section className="card">
                  <p className="eyebrow">Book list</p>
                  <h2>Upcoming booked sessions</h2>
                  <div className="entity-list">
                    {upcomingBookedSessions.slice(0, 12).map((item) => (
                      <div className="entity-row" key={item.activity_id}>
                        <div>
                          <strong>
                            {memberNameById.get(String(item.member_id || '').trim()) || item.member_id}
                          </strong>
                          {item.member_id ? <p>{item.member_id}</p> : null}
                          {item.pt_package_id ? <p>{item.pt_package_id}</p> : null}
                          <p>{formatAppDateTime(item.session_at)}</p>
                          {item.schedule_label ? <p>{item.schedule_label}</p> : null}
                          <p>{item.activity_note || '-'}</p>
                          <p>{describePtCustomFields(item.custom_fields)}</p>
                        </div>
                        {item.source_kind === 'class_booking' ? (
                          <div className="payment-meta">
                            <span className="passport-chip">{item.booking_kind === 'pt' ? 'booking by pt' : 'member booking'}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="btn ghost small" type="button" onClick={() => seedBookFromActivity(item)}>Edit base</button>
                            <button className="btn ghost small" type="button" onClick={() => seedCompleteFromActivity(item)}>Go to complete</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {upcomingBookedSessions.length === 0 ? (
                      <div className="entity-row">
                        <div>
                          <strong>Belum ada booked session</strong>
                          <p>Sesi yang sudah dibooking dan belum selesai akan muncul di sini.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          </div>
        ) : null}
        {activeTab === 'complete' ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div className="ops-grid">
              <section className="card">
                <p className="eyebrow">Complete session</p>
                <h2>Submit hasil sesi member</h2>
                <form className="form" onSubmit={submitCompleteSession}>
                  <label>
                    member_id
                    <select
                      value={completeForm.member_id}
                      onChange={(e) =>
                        setCompleteForm((p) => ({
                          ...p,
                          member_id: e.target.value,
                          pt_package_id: '',
                          session_id: ''
                        }))
                      }
                    >
                      <option value="">Pilih member</option>
                      {bookMemberOptions.map((item) => (
                        <option key={item.member_id} value={item.member_id}>
                          {(memberNameById.get(String(item.member_id || '').trim()) || item.member_id)}
                          {` - ${item.member_id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    pt_package_id (program)
                    <select
                      value={completeForm.pt_package_id}
                      onChange={(e) => setCompleteForm((p) => ({ ...p, pt_package_id: e.target.value }))}
                    >
                      <option value="">Pilih program scheduled</option>
                      {completeProgramOptions.map((item) => (
                        <option key={`${item.member_id}:${item.class_id}`} value={item.class_id}>
                          {item.class_name} | {item.class_id} | {item.member_id}
                          {` | remaining ${item.usage_mode === 'limited' && item.total_sessions
                            ? `${item.total_sessions}/${item.remaining_sessions ?? item.total_sessions}`
                            : '-'}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    session_id
                    <select
                      value={completeForm.session_id}
                      onChange={(e) => setCompleteForm((p) => ({ ...p, session_id: e.target.value }))}
                    >
                      <option value="">Pilih booked session</option>
                      {pendingBookedSessions
                        .filter((item) => {
                          const memberMatch = !completeForm.member_id || String(item.member_id || '') === String(completeForm.member_id || '');
                          const packageMatch = !completeForm.pt_package_id || String(item.pt_package_id || '') === String(completeForm.pt_package_id || '');
                          return memberMatch && packageMatch;
                        })
                        .map((item) => (
                          <option key={item.activity_id} value={item.session_id || ''}>
                            {item.session_id || item.activity_id} | {formatAppDateTime(item.session_at)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>completed_at<input type="datetime-local" value={completeForm.completed_at} onChange={(e) => setCompleteForm((p) => ({ ...p, completed_at: e.target.value }))} /></label>
                  <label>completion_note<input value={completeForm.activity_note} onChange={(e) => setCompleteForm((p) => ({ ...p, activity_note: e.target.value }))} placeholder="Ringkasan sesi, hasil, atau evaluasi" /></label>
                  <div className="card" style={{ borderStyle: 'dashed' }}>
                    <p className="eyebrow">Member performance</p>
                    <div className="form">
                      <label>performance_score<input type="number" min="0" max="10" value={completeForm.performance_fields.performance_score} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, performance_score: e.target.value } }))} /></label>
                      <label>energy_level<input type="number" min="0" max="10" value={completeForm.performance_fields.energy_level} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, energy_level: e.target.value } }))} /></label>
                      <label>body_weight_kg<input type="number" min="0" value={completeForm.performance_fields.body_weight_kg} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, body_weight_kg: e.target.value } }))} /></label>
                      <label>reps<input type="number" min="0" value={completeForm.performance_fields.reps} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, reps: e.target.value } }))} /></label>
                      <label>load_kg<input type="number" min="0" value={completeForm.performance_fields.load_kg} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, load_kg: e.target.value } }))} /></label>
                      <label>next_focus<input value={completeForm.performance_fields.next_focus} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, next_focus: e.target.value } }))} placeholder="Contoh: lower body stability" /></label>
                      <label>coach_note<input value={completeForm.performance_fields.coach_note} onChange={(e) => setCompleteForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, coach_note: e.target.value } }))} placeholder="Catatan performa member" /></label>
                    </div>
                  </div>
                  <label>custom_fields (JSON)<textarea rows={3} value={completeForm.custom_fields_text} onChange={(e) => setCompleteForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"sleep_hours":7,"pain_area":"hamstring"}' /></label>
                  <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Complete session'}</button>
                </form>
              </section>

              <div style={{ display: 'grid', gap: '0.8rem', alignContent: 'start', alignSelf: 'start', gridColumn: 'span 2' }}>
                <section className="card">
                  <p className="eyebrow">Complete list</p>
                  <h2>Sesi yang siap diselesaikan</h2>
                  <div className="entity-list">
                    {upcomingBookedSessions.slice(0, 12).map((item) => (
                      <div className="entity-row" key={`${item.activity_id}-complete`}>
                        <div>
                          <strong>{memberNameById.get(String(item.member_id || '').trim()) || item.member_id || '-'}</strong>
                          {item.member_id ? <p>{item.member_id}</p> : null}
                          {item.pt_package_id ? <p>{item.pt_package_id}</p> : null}
                          <p>{formatAppDateTime(item.session_at)} | session {item.session_id || '-'}</p>
                          {item.schedule_label ? <p>{item.schedule_label}</p> : null}
                          <p>{item.activity_note || '-'}</p>
                        </div>
                        {item.source_kind === 'class_booking' ? (
                          <div className="payment-meta">
                            <span className="passport-chip">{item.booking_kind === 'pt' ? 'booking by pt' : 'checked member'}</span>
                          </div>
                        ) : (
                          <button className="btn ghost small" type="button" onClick={() => seedCompleteFromActivity(item)}>Use</button>
                        )}
                      </div>
                    ))}
                    {upcomingBookedSessions.length === 0 ? (
                      <div className="entity-row">
                        <div>
                          <strong>Tidak ada sesi pending</strong>
                          <p>Booked session yang belum completed akan muncul di sini.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>

            <section className="card">
              <p className="eyebrow">Completed list</p>
              <div className="entity-list">
                {recentCompletedSessions.slice(0, 12).map((item) => (
                  <div className="entity-row" key={item.activity_id}>
                    <div>
                      <strong>{item.member_id} {item.pt_package_id ? `- ${item.pt_package_id}` : ''}</strong>
                      <p>{formatAppDateTime(item.session_at)} | session {item.session_id || '-'}</p>
                      <p>{item.activity_note || '-'}</p>
                      <p>{describePtCustomFields(item.custom_fields)}</p>
                    </div>
                  </div>
                ))}
                {recentCompletedSessions.length === 0 ? (
                  <div className="entity-row">
                    <div>
                      <strong>Belum ada sesi selesai</strong>
                      <p>Completed session akan tampil di sini.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
        {activeTab === 'award' ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div className="ops-grid">
              <section className="card">
                <p className="eyebrow">Give score or award</p>
                <h2>Score member di event</h2>
                <form className="form" onSubmit={submitAward}>
                  <label>
                    event
                    <select
                      value={selectedAwardEventId}
                      onChange={(e) => {
                        setSelectedAwardEventId(e.target.value);
                        setSelectedAwardParticipantKey('');
                        setAwardForm(createAwardForm());
                      }}
                    >
                      <option value="">Pilih event</option>
                      {awardEventOptions.map((item) => (
                        <option key={item.event_id} value={item.event_id}>
                          {item.event_name || item.title || item.event_id} | {item.start_at ? formatAppDateTime(item.start_at) : 'no schedule'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="card" style={{ borderStyle: 'dashed' }}>
                    <p className="eyebrow">Event info</p>
                    {selectedAwardEvent ? (
                      <div style={{ display: 'grid', gap: '0.35rem' }}>
                        <p><strong>{selectedAwardEvent.event_name || selectedAwardEvent.title || selectedAwardEvent.event_id}</strong></p>
                        <p>Schedule: {selectedAwardEvent.start_at ? formatAppDateTime(selectedAwardEvent.start_at) : 'No schedule'}</p>
                        <p>Award enabled: {isEventAwardEnabled(selectedAwardEvent.award_enabled, true) ? 'Yes' : 'No'}</p>
                        <p>Top N: {selectedAwardEvent.award_top_n || 1}</p>
                      </div>
                    ) : (
                      <p className="feedback">Pilih event dulu untuk mulai memberi score atau award.</p>
                    )}
                  </div>
                  <label>
                    participant
                    <select
                      value={selectedAwardParticipantKey}
                      onChange={(e) => setSelectedAwardParticipantKey(e.target.value)}
                      disabled={!selectedAwardEventId || awardLoading}
                    >
                      <option value="">Pilih participant</option>
                      {eventParticipants.map((item) => (
                        <option key={eventParticipantKey(item)} value={eventParticipantKey(item)}>
                          {item.full_name || item.email || item.passport_id || item.registration_id || '-'}
                          {item.rank !== null && item.rank !== undefined ? ` | rank ${item.rank}` : ''}
                          {Number(item.score_points || 0) > 0 ? ` | score ${item.score_points}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    rank
                    <input
                      type="number"
                      min="1"
                      max={selectedAwardEvent?.award_top_n || 1}
                      value={awardForm.rank}
                      onChange={(e) => setAwardForm((prev) => ({ ...prev, rank: e.target.value }))}
                      placeholder="Opsional"
                    />
                  </label>
                  <label>
                    score_points
                    <input
                      type="number"
                      min="0"
                      value={awardForm.score_points}
                      onChange={(e) => setAwardForm((prev) => ({ ...prev, score_points: e.target.value }))}
                      placeholder="Kosongkan untuk auto score dari rank"
                    />
                  </label>
                  <label>
                    award_scope
                    <select value={awardForm.award_scope} onChange={(e) => setAwardForm((prev) => ({ ...prev, award_scope: e.target.value }))}>
                      <option value="overall">overall</option>
                      <option value="category">category</option>
                    </select>
                  </label>
                  <label>
                    award_title
                    <input
                      value={awardForm.award_title}
                      onChange={(e) => setAwardForm((prev) => ({ ...prev, award_title: e.target.value }))}
                      placeholder="Contoh: Best Progress, Juara 1, MVP"
                    />
                  </label>
                  <label>
                    award_note
                    <textarea
                      rows={3}
                      value={awardForm.award_note}
                      onChange={(e) => setAwardForm((prev) => ({ ...prev, award_note: e.target.value }))}
                      placeholder="Catatan kenapa member dapat score atau award ini"
                    />
                  </label>
                  <label>
                    custom_fields (JSON)
                    <textarea
                      rows={3}
                      value={awardForm.custom_fields_text}
                      onChange={(e) => setAwardForm((prev) => ({ ...prev, custom_fields_text: e.target.value }))}
                      placeholder='{"category":"women_open","judge_note":"strong finish"}'
                    />
                  </label>
                  <button
                    className="btn"
                    type="submit"
                    disabled={
                      saving
                      || !selectedAwardEventId
                      || !selectedAwardParticipant
                      || !isEventAwardEnabled(selectedAwardEvent?.award_enabled, true)
                    }
                  >
                    {saving ? 'Saving...' : 'Save award'}
                  </button>
                </form>
              </section>

              <section className="card">
                <p className="eyebrow">Report award</p>
                <h2>Ringkasan per event</h2>
                <p><strong>Awarded members:</strong> {awardSummary.awardedCount}</p>
                <p><strong>Ranked members:</strong> {awardSummary.topRankedCount}</p>
                <p><strong>Total score:</strong> {awardSummary.totalScore}</p>
                <p className="feedback">Laporan ini mengambil award terbaru per participant untuk event terpilih. Jika participant belum dapat award manual, rank atau score dari check-out event tetap ikut terbaca.</p>
              </section>
            </div>

            <section className="card">
              <p className="eyebrow">Participant list</p>
              {awardLoading ? <p className="feedback">Loading event participant...</p> : null}
              <div className="entity-list">
                {eventParticipants.map((item) => (
                  <div className="entity-row" key={eventParticipantKey(item)}>
                    <div>
                      <strong>{item.full_name || item.email || item.passport_id || item.registration_id || '-'}</strong>
                      <p>{item.email || item.passport_id || item.registration_id || '-'}</p>
                      <p>check-in: {item.checked_in_at ? 'yes' : 'no'} | check-out: {item.checked_out_at ? 'yes' : 'no'}</p>
                      <p>rank: {item.rank ?? '-'} | score: {Number(item.score_points || 0)}</p>
                      <p>{item.award_title ? `award: ${item.award_title}` : 'award: -'}</p>
                    </div>
                    <button className="btn ghost small" type="button" onClick={() => seedAwardFromParticipant(item)}>
                      Give score
                    </button>
                  </div>
                ))}
                {!awardLoading && eventParticipants.length === 0 ? (
                  <div className="entity-row">
                    <div>
                      <strong>Belum ada participant</strong>
                      <p>Pilih event untuk melihat participant dan memberi score atau award.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="card">
              <p className="eyebrow">Award list</p>
              <div className="entity-list">
                {awardedParticipants.map((item) => (
                  <div className="entity-row" key={`award-${eventParticipantKey(item)}`}>
                    <div>
                      <strong>{item.full_name || item.email || item.passport_id || item.registration_id || '-'}</strong>
                      <p>rank: {item.rank ?? '-'} | score: {Number(item.score_points || 0)} | scope: {item.award_scope || 'overall'}</p>
                      <p>{item.award_title || '-'}</p>
                      <p>{item.award_note || '-'}</p>
                    </div>
                    <div className="payment-meta">
                      <strong>{item.rank ? `#${item.rank}` : `${Number(item.score_points || 0)} pts`}</strong>
                      <span className="passport-chip">{item.award_updated_at ? formatAppDateTime(item.award_updated_at) : 'from checkout/event score'}</span>
                    </div>
                  </div>
                ))}
                {awardedParticipants.length === 0 ? (
                  <div className="entity-row">
                    <div>
                      <strong>Belum ada award</strong>
                      <p>Score, rank, atau award yang disimpan untuk event ini akan tampil di sini.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
        {activeTab === 'member' ? (
          <div style={{ marginTop: '1rem' }}>
            <h2>Member</h2>
            <div className="entity-list">
              {memberTabRows.map((item) => (
                <div className="entity-row" key={item.member_id}>
                  <div>
                    <strong>{memberNameById.get(String(item.member_id || '').trim()) || item.member_id}</strong>
                    <p>{item.member_id}</p>
                    <p>{item.package_count} package | remaining {item.remaining_sessions} / total {item.total_sessions} | consumed {item.consumed_sessions}</p>
                    <p>{item.booking_count} active booking program</p>
                    <p>{item.latest_updated_at ? `Last update ${formatAppDateTime(item.latest_updated_at)}` : 'Belum ada aktivitas sesi.'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn ghost small" type="button" onClick={() => seedMemberIntoForms(item.member_id, 'book')}>Book</button>
                    <button className="btn ghost small" type="button" onClick={() => seedMemberIntoForms(item.member_id, 'complete')}>Complete</button>
                    <button className="btn ghost small" type="button" onClick={() => seedMemberIntoForms(item.member_id, 'history')}>Performance</button>
                  </div>
                </div>
              ))}
              {memberTabRows.length === 0 ? (
                <div className="entity-row">
                  <div>
                    <strong>Belum ada member PT</strong>
                    <p>Member dengan package PT atau booking program akan tampil di sini.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {activeTab === 'history' ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div>
              <h2>History sessions</h2>
              <div className="entity-list">
                {historySessionRows.map((item) => (
                  <div className="entity-row" key={item.activity_id}>
                    <div>
                      <strong>{memberNameById.get(String(item.member_id || '').trim()) || item.member_id || '-'}</strong>
                      {item.member_id ? <p>{item.member_id}</p> : null}
                      {item.pt_package_id ? <p>{item.pt_package_id}</p> : null}
                      <p>{formatAppDateTime(item.session_at)} | {item.activity_type || 'activity_logged'}{item.session_id ? ` | session ${item.session_id}` : ''}</p>
                      {item.schedule_label ? <p>{item.schedule_label}</p> : null}
                      {resolveHistoryCompletedAt(item) ? (
                        <p>{PT_HISTORY_SESSION_CONFIG.completedAtLabel}: {formatAppDateTime(resolveHistoryCompletedAt(item))}</p>
                      ) : null}
                      <p>{item.activity_note || '-'}</p>
                      <p>{describePtCustomFields(item.custom_fields)}</p>
                    </div>
                    {item.source_kind === 'class_booking' ? (
                      <div className="payment-meta">
                        <span className="passport-chip">{item.booking_kind === 'pt' ? 'booking by pt' : 'completed session'}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
                {historySessionRows.length === 0 ? (
                  <div className="entity-row">
                    <div>
                      <strong>Belum ada history session</strong>
                      <p>Riwayat booking, complete, dan activity log akan tampil di sini.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <h2>Log member performance</h2>
              <form className="form" onSubmit={submitActivityLog}>
                <label>
                  member_id
                  <select
                    value={activityForm.member_id}
                    onChange={(e) =>
                      setActivityForm((p) => ({
                        ...p,
                        member_id: e.target.value,
                        pt_package_id: ''
                      }))
                    }
                  >
                  <option value="">Pilih member</option>
                  {memberRows.map((item) => (
                    <option key={item.member_id} value={item.member_id}>
                      {(memberNameById.get(String(item.member_id || '').trim()) || item.member_id)}
                      {` - ${item.member_id} | remaining ${item.remaining_sessions}`}
                    </option>
                  ))}
                </select>
              </label>
                <label>
                  pt_package_id (optional)
                  <select value={activityForm.pt_package_id} onChange={(e) => setActivityForm((p) => ({ ...p, pt_package_id: e.target.value }))}>
                    <option value="">Pilih package PT</option>
                    {activityPackageOptions.map((item) => (
                      <option key={item.pt_package_id} value={item.pt_package_id}>
                        {item.pt_package_id} | {item.member_id} | remaining {item.remaining_sessions}/{item.total_sessions}
                      </option>
                    ))}
                  </select>
                </label>
                <label>session_at<input type="datetime-local" value={activityForm.session_at} onChange={(e) => setActivityForm((p) => ({ ...p, session_at: e.target.value }))} /></label>
                <label>activity_note<input value={activityForm.activity_note} onChange={(e) => setActivityForm((p) => ({ ...p, activity_note: e.target.value }))} /></label>
                <div className="card" style={{ borderStyle: 'dashed' }}>
                  <p className="eyebrow">Member performance</p>
                  <div className="form">
                    <label>performance_score<input type="number" min="0" max="10" value={activityForm.performance_fields.performance_score} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, performance_score: e.target.value } }))} /></label>
                    <label>energy_level<input type="number" min="0" max="10" value={activityForm.performance_fields.energy_level} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, energy_level: e.target.value } }))} /></label>
                    <label>body_weight_kg<input type="number" min="0" value={activityForm.performance_fields.body_weight_kg} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, body_weight_kg: e.target.value } }))} /></label>
                    <label>reps<input type="number" min="0" value={activityForm.performance_fields.reps} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, reps: e.target.value } }))} /></label>
                    <label>load_kg<input type="number" min="0" value={activityForm.performance_fields.load_kg} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, load_kg: e.target.value } }))} /></label>
                    <label>next_focus<input value={activityForm.performance_fields.next_focus} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, next_focus: e.target.value } }))} placeholder="Contoh: improve squat depth" /></label>
                    <label>coach_note<input value={activityForm.performance_fields.coach_note} onChange={(e) => setActivityForm((p) => ({ ...p, performance_fields: { ...p.performance_fields, coach_note: e.target.value } }))} placeholder="Catatan khusus coach" /></label>
                  </div>
                </div>
                <label>custom_fields (JSON)<textarea rows={3} value={activityForm.custom_fields_text} onChange={(e) => setActivityForm((p) => ({ ...p, custom_fields_text: e.target.value }))} placeholder='{"exercise":"deadlift","sleep_hours":7}' /></label>
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log activity'}</button>
              </form>
            </div>
          </div>
        ) : null}
        {activeTab === 'incentive' ? (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
            <div className="ops-grid">
              <section className="card">
                <p className="eyebrow">Report incentive</p>
                <h2>Ringkasan incentive basis</h2>
                <p><strong>Completed sessions:</strong> {incentiveSummary.totalCompleted}</p>
                <p><strong>Active members:</strong> {incentiveSummary.activeMembers}</p>
                <p><strong>Estimated session value:</strong> {formatIdr(incentiveSummary.totalEstimatedValue)}</p>
                <p className="feedback">Perhitungan ini memakai basis sederhana: nominal payment package PT dibagi total sesi package, lalu dijumlah dari sesi yang sudah completed. Belum memakai rule komisi terpisah.</p>
              </section>
              <section className="card">
                <p className="eyebrow">Coach flow</p>
                <h2>Alur minimum PT</h2>
                <p className="feedback">1. Pilih member atau package PT. 2. Tambahkan booking schedule jika member belum booking. 3. Gunakan complete list saat sesi selesai. 4. Isi performance fields supaya histori member dan report incentive lebih rapi.</p>
              </section>
            </div>
            <section className="card">
              <p className="eyebrow">Incentive detail</p>
              <div className="entity-list">
                {incentiveRows.map((item) => (
                  <div className="entity-row" key={`incentive-${item.activity_id}`}>
                    <div>
                      <strong>{item.member_id} {item.pt_package_id ? `- ${item.pt_package_id}` : ''}</strong>
                      <p>{formatAppDateTime(item.session_at)} | session {item.session_id || '-'}</p>
                      <p>{item.activity_note || '-'}</p>
                      <p>{describePtCustomFields(item.custom_fields)}</p>
                    </div>
                    <div className="payment-meta">
                      <strong>{formatIdr(item.estimated_session_value || 0)}</strong>
                      <span className="passport-chip">package {formatIdr(item.payment_amount || 0)}</span>
                    </div>
                  </div>
                ))}
                {incentiveRows.length === 0 ? (
                  <div className="entity-row">
                    <div>
                      <strong>Belum ada data incentive</strong>
                      <p>Report akan muncul setelah ada completed session dan payment package PT tercatat.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
        {activeTab === 'book' || activeTab === 'complete' ? (
          <div style={{ marginTop: '1rem' }}>
            <p className="eyebrow">PT package balance</p>
            <div className="entity-list">
              {ptBalances.map((item) => (
                <div className="entity-row" key={`${item.pt_package_id}:${item.member_id}`}>
                  <div>
                    <strong>{item.member_id} - {item.pt_package_id}</strong>
                    <p>remaining {item.remaining_sessions} / total {item.total_sessions} | consumed {item.consumed_sessions}</p>
                  </div>
                  <button className="btn ghost" type="button" onClick={() => seedFormsFromBalance(item)}>Use</button>
                </div>
              ))}
              {ptBalances.length === 0 ? (
                <div className="entity-row">
                  <div>
                    <strong>Belum ada PT package</strong>
                    <p>Package PT aktif akan tampil di sini untuk memudahkan booking dan completion.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      <footer className="dash-foot"><Link to="/host">Back to host</Link></footer>
    </BackendWorkspaceShell>
  );
}
