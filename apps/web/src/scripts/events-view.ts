const STORAGE_KEY = 'events-view';
let ctrl: AbortController | null = null;

function init() {
  const btnTimeline  = document.getElementById('btn-timeline');
  const btnCalendar  = document.getElementById('btn-calendar');
  const viewTimeline = document.getElementById('view-timeline');
  const viewCalendar = document.getElementById('view-calendar');
  if (!btnTimeline || !btnCalendar || !viewTimeline || !viewCalendar) return;

  ctrl?.abort();
  ctrl = new AbortController();
  const { signal } = ctrl;

  function setView(view: 'timeline' | 'calendar') {
    const isCalendar = view === 'calendar';
    btnTimeline!.classList.toggle('active', !isCalendar);
    btnCalendar!.classList.toggle('active', isCalendar);
    btnTimeline!.setAttribute('aria-pressed', String(!isCalendar));
    btnCalendar!.setAttribute('aria-pressed', String(isCalendar));
    viewTimeline!.classList.toggle('hidden', isCalendar);
    viewCalendar!.classList.toggle('hidden', !isCalendar);
    try { localStorage.setItem(STORAGE_KEY, view); } catch {}
  }

  btnTimeline.addEventListener('click', () => setView('timeline'), { signal });
  btnCalendar.addEventListener('click', () => setView('calendar'), { signal });

  try {
    const saved = localStorage.getItem(STORAGE_KEY) as 'timeline' | 'calendar' | null;
    setView(saved === 'timeline' ? 'timeline' : 'calendar');
  } catch {
    setView('calendar');
  }
}

document.addEventListener('astro:page-load', init);
