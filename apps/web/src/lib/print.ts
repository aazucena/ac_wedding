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
