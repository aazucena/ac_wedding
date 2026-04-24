// src/lib/print.ts
// Shared utilities for print pages (invitation + program)

export const FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />`;
const DAYS     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ORDINALS = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth','Sixteenth','Seventeenth','Eighteenth','Nineteenth','Twentieth','Twenty-First','Twenty-Second','Twenty-Third','Twenty-Fourth','Twenty-Fifth','Twenty-Sixth','Twenty-Seventh','Twenty-Eighth','Twenty-Ninth','Thirtieth','Thirty-First'];
const ONES     = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS     = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

export function formatLonghandDate(dateStr: string | undefined | null): { dayOfWeek: string; ordinalDate: string; yearInWords: string } {
  const date = new Date((dateStr ?? '2026-09-26') + 'T12:00:00');
  const rem  = date.getFullYear() - 2000;
  let yearInWords = 'Two Thousand';
  if (rem > 0 && rem < 20) yearInWords += ` and ${ONES[rem]}`;
  else if (rem >= 20) {
    const t = Math.floor(rem / 10), o = rem % 10;
    yearInWords += ` and ${TENS[t]}${o > 0 ? `-${ONES[o]}` : ''}`;
  }
  return {
    dayOfWeek:   DAYS[date.getDay()],
    ordinalDate: `the ${ORDINALS[date.getDate() - 1]} of ${MONTHS[date.getMonth()]}`,
    yearInWords,
  };
}

export function formatTime(t: string | undefined | null, fallback = 'TBD'): string {
  if (!t) return fallback;
  const [h = 0, m = 0] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
// Shared toolbar CSS (bottom-centered)
export const TOOLBAR_CSS = `
  /* ── Toolbar (bottom, centered) ────────────────────────── */
  .toolbar {
    position: fixed; bottom: 0; left: 0; right: 0;
    display: flex; flex-wrap: wrap;
    align-items: center; justify-content: center;
    gap: 10px 20px;
    padding: 14px 24px 16px;
    background: rgba(253,250,247,0.96);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(197,184,224,0.4);
    z-index: 100;
  }

  body { padding-bottom: 80px; } /* room for fixed toolbar */

  .toolbar-group { display: flex; align-items: center; gap: 10px; }

  .toolbar-hint {
    width: 100%; text-align: center;
    font-size: 10px; color: #8a8499; font-style: italic;
  }

  .btn-print {
    padding: 8px 20px; background: #1a1a2e; color: #A8D4B8;
    border: none; border-radius: 999px; cursor: pointer;
    font-family: 'Jost', sans-serif; font-size: 10px;
    font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
  }
  .btn-link {
    font-size: 11px; color: #8a8499; text-decoration: none;
    letter-spacing: 0.3px;
  }
  .btn-link:hover { color: #1a1a2e; }

  .seg-control {
    display: flex; border: 1px solid rgba(197,184,224,0.7);
    border-radius: 8px; overflow: hidden;
  }
  .seg-btn {
    padding: 6px 14px; border: none; cursor: pointer; background: #fdfaf7;
    font-family: 'Jost', sans-serif; font-size: 11px; font-weight: 500;
    color: #8a8499; transition: background 0.15s, color 0.15s;
  }
  .seg-btn.active { background: #1a1a2e; color: #A8D4B8; }
`;
// Shared flip card CSS
export const FLIP_CSS = `
  /* ── Flip container ─────────────────────────────────────── */
  .flip-container { cursor: pointer; }

  body.size-5x7 .flip-container { width: 5in;   min-height: 7in;   }
  body.size-a4  .flip-container { width: 210mm; min-height: 297mm; }

  .flipper {
    position: relative; width: 100%; height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
  }
  .flipper.is-flipped { transform: rotateY(180deg); }

  .face {
    position: absolute; top: 0; left: 0;
    width: 100%; min-height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .face.back { transform: rotateY(180deg); }
`;
// Shared card shell CSS
export const CARD_CSS = `
  /* ── Card shell ─────────────────────────────────────────── */
  .card {
    background: #fdfaf7;
    border: 1px solid rgba(197,184,224,0.45);
    display: flex; flex-direction: column;
    overflow: hidden;
    box-shadow: 0 6px 32px rgba(26,26,46,0.12);
  }

  .card-accent {
    height: 5px; width: 100%; flex-shrink: 0;
    background: linear-gradient(90deg, #A8D4B8 0%, #C5B8E0 50%, #A8D4B8 100%);
  }
  .card-accent-bottom {
    height: 5px; width: 100%;
    background: linear-gradient(90deg, #A8D4B8 0%, #C5B8E0 50%, #A8D4B8 100%);
    margin-top: auto;
  }
`;
// Shared HR ornament CSS
export const HR_CSS = `
  /* ── Ornament divider ───────────────────────────────────── */
  .hr {
    display: flex; align-items: center; gap: 10px;
    padding: 0 40px; flex-shrink: 0;
  }
  .hr-rule {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(197,184,224,0.5), transparent);
  }
  .hr-diamond { font-size: 7px; color: #C5B8E0; }
`;
// Shared print media query CSS
export const PRINT_RESET_CSS = `
  @media print {
    body { background: white; padding: 0 !important; gap: 0; display: block; }
    .no-print { display: none !important; }

    .flip-container {
      display: block !important; width: auto !important;
      height: auto !important; cursor: default; overflow: visible;
    }
    .flipper {
      transform: none !important; transform-style: flat;
      position: static; width: auto; height: auto;
    }
    .face {
      position: static !important; transform: none !important;
      backface-visibility: visible; -webkit-backface-visibility: visible;
      width: auto; min-height: auto; overflow: visible;
    }
    .face.front { break-after: page; page-break-after: always; }

    .card { box-shadow: none; break-inside: avoid; page-break-inside: avoid; }

    body.size-5x7 .card { width: 5in;   min-height: 7in;   }
    body.size-a4  .card { width: 210mm; min-height: 297mm; }

    @page { margin: 0; }
  }
`;
// Shared JS — size toggle + flip
export const SHARED_SCRIPT = `
  // Size toggle
  function setSize(size) {
    document.body.className = 'size-' + size;
    document.getElementById('btn-5x7').classList.toggle('active', size === '5x7');
    document.getElementById('btn-a4').classList.toggle('active',  size === 'a4');
    if (typeof syncHeight === 'function') syncHeight();
  }
  window.setSize = setSize;

  // Flip
  let flipped = false;
  let pointerStartY = 0;
  const flipContainer = document.getElementById('flip-container');

  flipContainer.addEventListener('pointerdown', e => { pointerStartY = e.clientY; });
  flipContainer.addEventListener('click', e => {
    if (Math.abs(e.clientY - pointerStartY) > 6) return;
    flipped = !flipped;
    document.getElementById('flipper').classList.toggle('is-flipped', flipped);
    syncFaceButtons(flipped);
  });

  function showFace(face) {
    flipped = face === 'back';
    document.getElementById('flipper').classList.toggle('is-flipped', flipped);
    syncFaceButtons(flipped);
  }
  window.showFace = showFace;

  function syncFaceButtons(isFlipped) {
    document.getElementById('btn-front').classList.toggle('active', !isFlipped);
    document.getElementById('btn-back').classList.toggle('active',   isFlipped);
  }

  // Sync container height to tallest face
  function syncHeight() {
    const flipper = document.getElementById('flipper');
    const front   = flipper.querySelector('.face.front');
    const back    = flipper.querySelector('.face.back');
    const wasFlipped = flipper.classList.contains('is-flipped');
    flipper.style.transition = 'none';
    flipper.classList.remove('is-flipped');
    back.style.transform  = 'none';
    back.style.visibility = 'hidden';
    const h = Math.max(front.scrollHeight, back.scrollHeight);
    back.style.transform  = '';
    back.style.visibility = '';
    if (wasFlipped) flipper.classList.add('is-flipped');
    requestAnimationFrame(() => { flipper.style.transition = ''; });
    flipContainer.style.height = h + 'px';
  }
  window.syncHeight = syncHeight;
  window.addEventListener('load', syncHeight);
`;