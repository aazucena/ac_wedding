import 'temporal-polyfill/global';
import {
  createCalendar,
  createViewMonthAgenda,
  createViewMonthGrid,
} from '@schedule-x/calendar';

let calendarMounted = false;
let observer: MutationObserver | null = null;
let calInstance: ReturnType<typeof createCalendar> | null = null;
let mqListener: ((e: MediaQueryListEvent) => void) | null = null;

// ≤ 768 px → agenda (phone/small tablet); wider → month grid
const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

function mountCalendar(mount: HTMLElement) {
  if (calendarMounted) return;

  const data = JSON.parse(mount.dataset.cal!);
  const cp   = getComputedStyle(document.documentElement)
    .getPropertyValue('--cp').trim() || '#c9a8b8';

  const tz = 'America/Edmonton' as const;
  const calEvents = (data.events as Array<Record<string, string>>).map(ev => ({
    ...ev,
    id:    ev.id ?? '',
    start: Temporal.ZonedDateTime.from(`${(ev.start ?? '').replace(' ', 'T')}:00[${tz}]`),
    end:   Temporal.ZonedDateTime.from(`${(ev.end   ?? '').replace(' ', 'T')}:00[${tz}]`),
  }));

  const monthView  = createViewMonthGrid();
  const agendaView = createViewMonthAgenda();
  const activeView = MOBILE_MQ.matches ? agendaView : monthView;

  const cal = createCalendar({
    locale: 'en-US',
    timezone: tz,
    firstDayOfWeek: 7,
    defaultView: activeView.name,
    selectedDate: Temporal.PlainDate.from((data.weddingDate as string).slice(0, 10)),
    views: [activeView],
    events: calEvents,
    skipValidation: true,
    dayBoundaries: { start: '07:00', end: '23:00' },
    weekOptions: {
      gridHeight: 2500,
      gridStep: 30,
      timeAxisFormatOptions: { hour: 'numeric', minute: '2-digit' },
    },
    calendars: {
      wedding: {
        colorName: 'wedding',
        lightColors: { main: cp, container: '#fdf5f7', onContainer: '#2a1a28' },
      },
    },
  });

  // Agenda view sizes itself by content; grid view needs a concrete height
  mount.style.height = MOBILE_MQ.matches ? 'auto' : '700px';

  cal.render(mount);
  calendarMounted = true;
  calInstance = cal;

  // Re-mount with the correct view whenever the viewport crosses the breakpoint
  if (mqListener) MOBILE_MQ.removeEventListener('change', mqListener);
  mqListener = () => {
    calInstance?.destroy();
    calInstance = null;
    calendarMounted = false;
    mountCalendar(mount);
  };
  MOBILE_MQ.addEventListener('change', mqListener);

  setupTooltip(mount, data.events as Array<Record<string, string>>);
}

// ── Hover tooltip ────────────────────────────────────────────────────────

function fmtTime(str: string): string {
  const [h = 0, m = 0] = str.slice(11, 16).split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const h12    = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function buildTooltipContent(tip: HTMLElement, ev: Record<string, string>) {
  tip.replaceChildren();

  const titleEl = document.createElement('p');
  titleEl.className   = 'ct-title';
  titleEl.textContent = ev.title ?? null;
  tip.appendChild(titleEl);

  const timeEl = document.createElement('p');
  timeEl.className   = 'ct-time';
  timeEl.textContent = `${fmtTime(ev.start ?? '')} – ${fmtTime(ev.end ?? '')}`;
  tip.appendChild(timeEl);

  if (ev.location) {
    const locEl = document.createElement('p');
    locEl.className   = 'ct-loc';
    locEl.textContent = ev.location;
    tip.appendChild(locEl);
  }
}

function setupTooltip(mount: HTMLElement, events: Array<Record<string, string>>) {
  const eventMap = new Map(events.map(e => [String(e.id), e]));

  let tip = document.getElementById('cal-tooltip') as HTMLElement | null;
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'cal-tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }

  let hideTimer: ReturnType<typeof setTimeout>;
  let activeEventId: string | null = null;

  function positionTip(target: Element) {
    const rect = target.getBoundingClientRect();
    const tipH = tip!.offsetHeight || 80;
    const top  = rect.top - 8 > tipH
      ? rect.top  + window.scrollY - tipH - 8
      : rect.bottom + window.scrollY + 8;
    const left = Math.max(8, Math.min(
      rect.left + window.scrollX + rect.width / 2 - 120,
      window.innerWidth - 256
    ));
    tip!.style.top  = `${top}px`;
    tip!.style.left = `${left}px`;
  }

  function show(ev: Record<string, string>, target: Element) {
    clearTimeout(hideTimer);
    buildTooltipContent(tip!, ev);
    tip!.classList.add('ct-visible');
    positionTip(target);
  }

  function hide() {
    hideTimer = setTimeout(() => {
      tip?.classList.remove('ct-visible');
      activeEventId = null;
    }, 120);
  }

  mount.addEventListener('mouseover', (e) => {
    const el = (e.target as Element).closest('[data-event-id]');
    if (!el) return;
    const ev = eventMap.get(el.getAttribute('data-event-id')!);
    if (ev) show(ev, el);
  });

  mount.addEventListener('mouseout', (e) => {
    if (!(e.target as Element).closest('[data-event-id]')) return;
    hide();
  });

  tip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  tip.addEventListener('mouseleave', hide);

  mount.addEventListener('click', (e) => {
    const el = (e.target as Element).closest('[data-event-id]');
    if (!el) return;
    const id = el.getAttribute('data-event-id')!;
    if (activeEventId === id && tip!.classList.contains('ct-visible')) {
      hide();
      return;
    }
    const ev = eventMap.get(id);
    if (!ev) return;
    activeEventId = id;
    show(ev, el);
  });

  document.addEventListener('click', (e) => {
    if (tip?.contains(e.target as Node)) return;
    if ((e.target as Element).closest('[data-event-id]')) return;
    hide();
  });
}

function init() {
  const mount      = document.getElementById('calendar-mount') as HTMLElement | null;
  // Watch the outer wrapper (#view-calendar in events.astro) — that's what the
  // toggle script adds/removes 'hidden' on, not the inner #calendar element.
  const viewWrapper = document.getElementById('view-calendar');
  if (!mount || !viewWrapper) return;

  // Reset on re-navigation (View Transitions replaces the DOM)
  calendarMounted = false;
  observer?.disconnect();
  if (mqListener) { MOBILE_MQ.removeEventListener('change', mqListener); mqListener = null; }
  calInstance?.destroy();
  calInstance = null;

  // Always set up the observer so switching to calendar tab triggers a mount.
  observer = new MutationObserver(() => {
    if (!viewWrapper.classList.contains('hidden') && !calendarMounted) {
      observer?.disconnect();
      requestAnimationFrame(() => mountCalendar(mount));
    }
  });
  observer.observe(viewWrapper, { attributes: true, attributeFilter: ['class'] });

  // Defer the initial visibility check via queueMicrotask so it runs after ALL
  // astro:page-load listeners have completed — including the toggle script that
  // may hide this wrapper when localStorage says 'timeline'.
  queueMicrotask(() => {
    if (!viewWrapper.classList.contains('hidden') && !calendarMounted) {
      requestAnimationFrame(() => mountCalendar(mount));
    }
  });
}

document.addEventListener('astro:page-load', init);
