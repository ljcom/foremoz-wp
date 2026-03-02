export const MEMBER_FIXTURES = [
  {
    member_id: 'mem_4471',
    full_name: 'Nadia Pratama',
    phone: '081234567800',
    ktp_number: '3174124503900001',
    status: 'active',
    subscription_end: '2026-03-31',
    pt_remaining_sessions: 6
  },
  {
    member_id: 'mem_4472',
    full_name: 'Rudi Hartono',
    phone: '081298765432',
    ktp_number: '3174122208910002',
    status: 'expired',
    subscription_end: '2026-02-20',
    pt_remaining_sessions: 0
  },
  {
    member_id: 'mem_4473',
    full_name: 'Citra Ananda',
    phone: '081277777700',
    ktp_number: '3174121402940003',
    status: 'frozen',
    subscription_end: '2026-04-08',
    pt_remaining_sessions: 10
  }
];

export function findMembers(searchBy, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  return MEMBER_FIXTURES.filter((member) => {
    const fields = {
      full_name: member.full_name.toLowerCase(),
      phone: member.phone.toLowerCase(),
      ktp_number: member.ktp_number.toLowerCase(),
      member_id: member.member_id.toLowerCase()
    };

    if (searchBy === 'all') {
      return Object.values(fields).some((value) => value.includes(q));
    }

    return fields[searchBy]?.includes(q);
  });
}

export function getMemberById(memberId) {
  return MEMBER_FIXTURES.find((member) => member.member_id === memberId) || null;
}
