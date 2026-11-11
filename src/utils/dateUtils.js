export const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDateOnly = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().split('T')[0];
};

export const formatTimeOnly = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

export const getSessionComputedStatus = (session) => {
  if (!session) return 'closed';
  if (session.status === 'closed') return 'closed';

  const now = new Date();
  const opensAt = session.opensAt?.toDate ? session.opensAt.toDate() : new Date(session.opensAt);
  const closesAt = session.closesAt?.toDate ? session.closesAt.toDate() : new Date(session.closesAt);

  if (now < opensAt) return 'scheduled';
  if (now > closesAt) return 'expired';
  return 'open';
};

export const toDateTimeLocalString = (dateObj) => {
  const pad = (n) => (n < 10 ? '0' + n : n);
  return (
    dateObj.getFullYear() +
    '-' +
    pad(dateObj.getMonth() + 1) +
    '-' +
    pad(dateObj.getDate()) +
    'T' +
    pad(dateObj.getHours()) +
    ':' +
    pad(dateObj.getMinutes())
  );
};