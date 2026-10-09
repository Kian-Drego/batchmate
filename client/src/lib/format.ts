export function inr(amount?: number | null): string {
  if (amount == null) return '—';
  if (amount >= 10000000) return `₹${+(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${+(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${+(amount / 1000).toFixed(1)}k`;
  return `₹${amount}`;
}

export function shortDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeTime(value?: string | null): string {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(value);
}

export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

export type DeadlineTone = 'calm' | 'soon' | 'urgent' | 'closed';

export function deadlineLabel(value?: string | null): { text: string; tone: DeadlineTone } {
  const days = daysUntil(value);
  if (days === null) return { text: 'Rolling', tone: 'calm' };
  if (days < 0) return { text: 'Closed', tone: 'closed' };
  if (days === 0) return { text: 'Closes today', tone: 'urgent' };
  if (days <= 7) return { text: `${days}d left`, tone: 'urgent' };
  if (days <= 21) return { text: `${days}d left`, tone: 'soon' };
  return { text: `${days}d left`, tone: 'calm' };
}

export function bytes(size: number): string {
  if (size >= 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function initials(name?: string | null): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

export function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'there';
}
