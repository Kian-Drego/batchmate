export function inr(amount?: number | null): string {
  if (amount === undefined || amount === null) return '—';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount}`;
}

export function shortDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(value?: string | null): { text: string; tone: 'calm' | 'soon' | 'urgent' | 'closed' } {
  const days = daysUntil(value);
  if (days === null) return { text: 'No deadline listed', tone: 'calm' };
  if (days < 0) return { text: 'Closed', tone: 'closed' };
  if (days <= 7) return { text: `${days} day${days === 1 ? '' : 's'} left`, tone: 'urgent' };
  if (days <= 21) return { text: `${days} days left`, tone: 'soon' };
  return { text: `${days} days left`, tone: 'calm' };
}

export function bytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${size} B`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
