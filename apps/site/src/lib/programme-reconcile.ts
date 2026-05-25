/**
 * The build-time `today` baked talks into "upcoming" or "recent" sections.
 * Once deployed, the partition is frozen until the next push. This module
 * re-partitions on the visitor's clock so a May 23 talk viewed on May 25
 * moves out of "Catch me at" into "Recent" without a redeploy.
 *
 * Companion to `RelativeDays.tsx` (which only fixes per-item relative-time text).
 */

function midnightMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function itemMidnightMs(item: Element): number {
  const iso = item.getAttribute('data-iso');
  if (!iso) return NaN;
  return midnightMs(new Date(iso));
}

export interface ReconcileOptions {
  upcomingSection: HTMLElement;
  recentSection: HTMLElement;
  upcomingList: HTMLElement;
  recentList: HTMLElement;
  /** Apply muted styling when a node moves from upcoming -> recent. */
  applyPastStyle?: (item: HTMLElement) => void;
  /** Strip muted styling when a node moves from recent -> upcoming. */
  applyFutureStyle?: (item: HTMLElement) => void;
  /** Notified with the new upcoming[0] (or null if empty) after reconciliation. */
  onUpcomingHeadChange?: (newHead: HTMLElement | null) => void;
}

export function reconcileProgramme(opts: ReconcileOptions): void {
  const todayMs = midnightMs(new Date());
  const { upcomingSection, recentSection, upcomingList, recentList } = opts;

  const items: HTMLElement[] = [
    ...(Array.from(upcomingList.children) as HTMLElement[]),
    ...(Array.from(recentList.children) as HTMLElement[]),
  ].filter((el) => el.hasAttribute('data-iso'));

  const upcoming: HTMLElement[] = [];
  const recent: HTMLElement[] = [];
  for (const item of items) {
    const ms = itemMidnightMs(item);
    if (Number.isNaN(ms)) continue;
    const wasInUpcoming = item.parentElement === upcomingList;
    if (ms >= todayMs) {
      upcoming.push(item);
      if (!wasInUpcoming) opts.applyFutureStyle?.(item);
    } else {
      recent.push(item);
      if (wasInUpcoming) opts.applyPastStyle?.(item);
    }
  }

  upcoming.sort((a, b) => itemMidnightMs(a) - itemMidnightMs(b));
  recent.sort((a, b) => itemMidnightMs(b) - itemMidnightMs(a));

  for (const item of upcoming) upcomingList.appendChild(item);
  for (const item of recent) recentList.appendChild(item);

  upcomingSection.hidden = upcoming.length === 0;
  recentSection.hidden = recent.length === 0;

  opts.onUpcomingHeadChange?.(upcoming[0] ?? null);
}

type Bucket = 'today' | 'tomorrow' | 'yesterday' | 'other';
function bucketOf(days: number): Bucket {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return 'other';
}

/**
 * Update a `<span class="rel-days …">` element's text + bucket class to reflect
 * the relative time between `iso` and today. Used for headers that point at a
 * specific talk (e.g. "Next up · 2 days ago") whose target may shift after
 * reconciliation. RelativeDays.tsx is bound to its original iso prop and can't
 * be re-pointed from outside, so this rewrites the DOM directly.
 */
export function updateRelDaysSpan(span: HTMLElement, iso: string, bcp47: string): void {
  const todayMs = midnightMs(new Date());
  const targetMs = midnightMs(new Date(iso));
  const days = Math.round((targetMs - todayMs) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(bcp47, { numeric: 'auto' });
  span.textContent = rtf.format(days, 'day');
  span.className = `rel-days rel-days--${bucketOf(days)}`;
}
