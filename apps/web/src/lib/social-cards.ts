// apps/web/src/lib/social-cards.ts
// Generates social-media card PNG files via Satori (layout) + Sharp (rasterise).
// Three formats: square (1080×1080), dm (1200×630), story (1080×1920).
// Two themes: light (default, ivory — matches site design system) and dark.

import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Shared accent colours (same in both themes) ───────────────
const MINT     = '#A8D4B8';
const LAVENDER = '#C5B8E0';

// ── Theme definitions ────────────────────────────────────────
export type SocialTheme = 'light' | 'dark';

interface Theme {
  bg:         string;   // card background
  bgGrad:     string;   // no-photo background gradient
  bgGradLeft: string;   // DM left-panel gradient (no photo)
  text:       string;   // primary text (names)
  text85:     string;   // secondary text (date)
  text55:     string;   // muted text (location, labels)
  eyebrow:    string;   // "Save the Date" eyebrow label colour
  scrimStart: string;   // photo overlay — opaque end
  scrimMid:   string;   // photo overlay — mid
  scrimEnd:   string;   // photo overlay — transparent end
}

const THEMES: Record<SocialTheme, Theme> = {
  light: {
    bg:         '#c5ded1',
    bgGrad:     'linear-gradient(145deg, #c5ded1 0%, #b8d4c6 100%)',
    bgGradLeft: 'linear-gradient(155deg, #b8d4c6, #c5ded1)',
    text:       '#1a1a2e',
    text85:     'rgba(26,26,46,0.85)',
    text55:     'rgba(26,26,46,0.50)',
    eyebrow:    'rgba(26,26,46,0.55)',
    scrimStart: 'rgba(197,222,209,0.92)',
    scrimMid:   'rgba(197,222,209,0.60)',
    scrimEnd:   'rgba(197,222,209,0.05)',
  },
  dark: {
    bg:         '#1a1a2e',
    bgGrad:     'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f1f2e 100%)',
    bgGradLeft: 'linear-gradient(155deg, #16213e, #1a1a2e)',
    text:       '#c5ded1',
    text85:     'rgba(197,222,209,0.85)',
    text55:     'rgba(197,222,209,0.55)',
    eyebrow:    '#A8D4B8',
    scrimStart: 'rgba(26,26,46,0.80)',
    scrimMid:   'rgba(26,26,46,0.40)',
    scrimEnd:   'rgba(26,26,46,0.10)',
  },
};

// ── Font loading (cached at module level) ────────────────────
function loadFont(pkg: string, file: string): ArrayBuffer {
  const buf = readFileSync(resolve(`node_modules/${pkg}/files/${file}.woff`));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const CG  = 'cormorant-garamond';
const CG_ITALIC = loadFont(`@fontsource/${CG}`, `${CG}-latin-300-italic`);
const CG_NORMAL = loadFont(`@fontsource/${CG}`, `${CG}-latin-400-normal`);
const JOST_400  = loadFont('@fontsource/jost',  'jost-latin-400-normal');
const JOST_600  = loadFont('@fontsource/jost',  'jost-latin-600-normal');

const FONTS: Parameters<typeof satori>[1]['fonts'] = [
  { name: 'CG',   data: CG_ITALIC, weight: 300, style: 'italic' },
  { name: 'CG',   data: CG_NORMAL, weight: 400, style: 'normal' },
  { name: 'Jost', data: JOST_400,  weight: 400, style: 'normal' },
  { name: 'Jost', data: JOST_600,  weight: 600, style: 'normal' },
];

// ── Element helpers ──────────────────────────────────────────
type El = Record<string, any>;
type Child = El | string | null | undefined | false;

function h(tag: string, style: Record<string, any> = {}, ...children: Child[]): El {
  const valid = children.filter(Boolean) as (El | string)[];
  return {
    type: tag,
    props: {
      style,
      children: valid.length === 0 ? undefined
               : valid.length === 1 ? valid[0]
               : valid,
    },
  };
}

// ── Shared decorative pieces (accent colours only) ────────────
function gradBar(w: number, h_: number = 6): El {
  return h('div', {
    width: w, height: h_, flexShrink: 0,
    backgroundImage: `linear-gradient(90deg, ${MINT}, ${LAVENDER}, ${MINT})`,
  });
}

function diamondRule(width: number): El {
  return h('div', { display: 'flex', alignItems: 'center', gap: 12, width },
    h('div', { flex: 1, height: 1, backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER})` }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontSize: 9, color: LAVENDER }, '◆'),
    h('div', { flex: 1, height: 1, backgroundImage: `linear-gradient(90deg, ${LAVENDER}, transparent)` }),
  );
}

function andRow(width: number, fontSize = 22): El {
  return h('div', { display: 'flex', alignItems: 'center', gap: 20, width },
    h('div', { flex: 1, height: 1, backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER})` }),
    h('span', { fontFamily: 'CG', fontStyle: 'italic', fontSize, color: LAVENDER, fontWeight: 300 }, 'and'),
    h('div', { flex: 1, height: 1, backgroundImage: `linear-gradient(90deg, ${LAVENDER}, transparent)` }),
  );
}

// ── Photo layer helpers ───────────────────────────────────────
function photoScrim(w: number, h_: number, photoSrc: string, t: Theme, scrimDir = 'to top'): El[] {
  return [
    {
      type: 'img',
      props: {
        src: photoSrc,
        width: w,
        height: h_,
        style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover', objectPosition: 'center center' },
      },
    },
    h('div', {
      position: 'absolute', top: 0, left: 0, width: w, height: h_,
      backgroundImage: `linear-gradient(${scrimDir}, ${t.scrimStart} 0%, ${t.scrimMid} 55%, ${t.scrimEnd} 100%)`,
    }),
  ];
}

// ════════════════════════════════════════════════════════════
// Card data
// ════════════════════════════════════════════════════════════
export interface CardData {
  groom: string;
  bride: string;
  date: string;
  day: string;
  location: string;
  hashtag: string;
  ceremonyVenue: string;
  ceremonyTime: string;
  receptionVenue: string;
  receptionTime: string;
  rsvpDeadline: string;
  siteUrl: string;
  daysTo?: number;  // for countdown card
}

// ════════════════════════════════════════════════════════════
// Square — 1080 × 1080
// ════════════════════════════════════════════════════════════
function buildSquare(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const textContent = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, padding: '60px 80px',
    position: 'relative', zIndex: 1,
  },
    h('div', {
      fontFamily: 'Jost', fontWeight: 600, fontSize: 10,
      color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 40,
    }, 'Save the Date'),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 128, lineHeight: 1, color: t.text }, d.groom),
      andRow(600, 26),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 128, lineHeight: 1, color: t.text }, d.bride),
    ),

    h('div', { height: 44 }),
    diamondRule(440),
    h('div', { height: 32 }),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 34, color: t.text85 }, d.date),
    h('div', { height: 10 }),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 11, color: t.text55, letterSpacing: 3, textTransform: 'uppercase' }, `${d.location} · Canada`),

    h('div', { height: 44 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: LAVENDER }, d.hashtag),
  );

  const background = photo
    ? h('div', { display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H },
        ...photoScrim(W, H, photo, t, 'to top'))
    : h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad });

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundColor: t.bg,
  },
    background,
    gradBar(W),
    textContent,
    gradBar(W),
  );
}

// ════════════════════════════════════════════════════════════
// DM / Landscape — 1200 × 630
// ════════════════════════════════════════════════════════════
function buildDM(d: CardData, photo: string | null, t: Theme): El {
  const W = 1200, H = 630;
  const LEFT = 480;

  const leftContent = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', zIndex: 1,
    width: LEFT, height: H, paddingTop: 40, paddingBottom: 40, paddingLeft: 48, paddingRight: 48,
  },
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 16, color: LAVENDER, letterSpacing: 8, marginBottom: 32 }, '✦  ✦  ✦'),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 80, lineHeight: 1, color: t.text }, d.groom),
    andRow(280, 18),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 80, lineHeight: 1, color: t.text }, d.bride),

    h('div', { height: 24 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 20, color: t.text85 }, d.date),
    h('div', { height: 8 }),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 9, color: t.text55, letterSpacing: 2.5, textTransform: 'uppercase' }, d.location),
    h('div', { height: 20 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 17, color: LAVENDER }, d.hashtag),
  );

  const leftPanel = photo
    ? h('div', { display: 'flex', position: 'relative', width: LEFT, height: H, overflow: 'hidden', flexShrink: 0 },
        ...photoScrim(LEFT, H, photo, t, '135deg'),
        leftContent)
    : h('div', {
        display: 'flex', position: 'relative', width: LEFT, height: H, flexShrink: 0,
        backgroundImage: t.bgGradLeft,
      },
        leftContent);

  const rightPanel = h('div', {
    flex: 1, height: H, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', paddingTop: 40, paddingBottom: 40, paddingLeft: 52, paddingRight: 52,
    borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: 'rgba(197,184,224,0.35)',
  },
    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 8, color: LAVENDER, letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 6 }, 'Ceremony'),
    h('div', { fontFamily: 'CG', fontWeight: 400, fontSize: 26, color: t.text, lineHeight: 1.2 }, d.ceremonyVenue),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 10, color: t.text55, marginTop: 4 }, `${d.ceremonyTime}  ·  ${d.location}`),

    h('div', { height: 20 }),
    h('div', { display: 'flex', alignItems: 'center', gap: 10 },
      h('div', { flex: 1, height: 1, backgroundImage: `linear-gradient(90deg, rgba(197,184,224,0.3), transparent)` }),
      h('div', { fontFamily: 'CG', fontSize: 8, color: LAVENDER }, '◆'),
      h('div', { flex: 1, height: 1, backgroundImage: `linear-gradient(90deg, transparent, rgba(197,184,224,0.3))` }),
    ),
    h('div', { height: 20 }),

    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 8, color: LAVENDER, letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 6 }, 'Reception'),
    h('div', { fontFamily: 'CG', fontWeight: 400, fontSize: 26, color: t.text, lineHeight: 1.2 }, d.receptionVenue),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 10, color: t.text55, marginTop: 4 }, `${d.receptionTime}  ·  ${d.location}`),

    h('div', { height: 28 }),
    h('div', { height: 1, backgroundImage: `linear-gradient(90deg, rgba(197,184,224,0.25), transparent)`, marginBottom: 16 }),
    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 8, color: t.text55, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }, `Kindly RSVP by ${d.rsvpDeadline}`),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 15, color: LAVENDER }, d.siteUrl),
  );

  return h('div', {
    display: 'flex', flexDirection: 'row',
    width: W, height: H,
    backgroundColor: t.bg, overflow: 'hidden',
  },
    gradBar(6, H),
    leftPanel,
    rightPanel,
  );
}

// ════════════════════════════════════════════════════════════
// Story — 1080 × 1920
// ════════════════════════════════════════════════════════════
function buildStory(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1920;
  const PHOTO_H = 1100;

  if (photo) {
    const photoSection = h('div', {
      display: 'flex', position: 'relative', width: W, height: PHOTO_H, flexShrink: 0, overflow: 'hidden',
    },
      {
        type: 'img',
        props: {
          src: photo, width: W, height: PHOTO_H,
          style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover', objectPosition: 'center 30%' },
        },
      },
      h('div', {
        position: 'absolute', bottom: 0, left: 0, width: W, height: 360,
        backgroundImage: `linear-gradient(to top, ${t.bg} 0%, transparent 100%)`,
      }),
    );

    const textSection = h('div', {
      width: W, flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.bg, paddingTop: 70, paddingLeft: 80, paddingRight: 80, paddingBottom: 70,
    },
      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 11, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 20 }, 'Save the Date'),
        diamondRule(400),
      ),

      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 130, lineHeight: 1, color: t.text }, d.groom),
        andRow(560, 28),
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 130, lineHeight: 1, color: t.text }, d.bride),
      ),

      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 34, color: t.text85, marginBottom: 10 }, d.date),
        h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 12, color: t.text55, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 36 }, `${d.day}  ·  ${d.location}`),
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: LAVENDER, marginBottom: 36 }, d.hashtag),
        gradBar(360, 5),
      ),
    );

    return h('div', {
      display: 'flex', flexDirection: 'column',
      width: W, height: H, backgroundColor: t.bg, overflow: 'hidden',
    },
      gradBar(W),
      photoSection,
      textSection,
    );
  }

  // No photo — full-frame typographic poster
  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H, backgroundImage: t.bgGrad,
    overflow: 'hidden', position: 'relative',
  },
    h('div', {
      position: 'absolute', top: 260, left: 0,
      width: W, display: 'flex', justifyContent: 'center',
      fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300,
      fontSize: 440, lineHeight: 1,
      color: t === THEMES.dark ? 'rgba(197,184,224,0.05)' : 'rgba(197,184,224,0.12)',
    }, `${d.groom[0]}${d.bride[0]}`),

    h('div', {
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      flex: 1, position: 'relative', zIndex: 1,
    },
      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 120 },
        gradBar(320, 5),
        h('div', { height: 40 }),
        h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 10, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase' }, 'Save the Date'),
      ),

      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 140, lineHeight: 1, color: t.text }, d.groom),
        andRow(600, 30),
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 140, lineHeight: 1, color: t.text }, d.bride),
      ),

      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 120 },
        diamondRule(480),
        h('div', { height: 32 }),
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 36, color: t.text85 }, d.date),
        h('div', { height: 10 }),
        h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 13, color: t.text55, letterSpacing: 3, textTransform: 'uppercase' }, `${d.day}  ·  ${d.location}`),
        h('div', { height: 44 }),
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 28, color: LAVENDER }, d.hashtag),
        h('div', { height: 36 }),
        gradBar(320, 5),
      ),
    ),
  );
}

// ════════════════════════════════════════════════════════════
// Split Panel — 1080 × 1080
// Photo left (~55%), text right (~45%), grad bar divider.
// Square sibling to the DM card — same concept, feed ratio.
// ════════════════════════════════════════════════════════════
function buildSplitPanel(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;
  const LEFT = 594; // 55%

  const leftPanel = photo
    ? h('div', { display: 'flex', position: 'relative', width: LEFT, height: H, overflow: 'hidden', flexShrink: 0 },
        { type: 'img', props: { src: photo, width: LEFT, height: H, style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover', objectPosition: 'center' } } },
        h('div', { position: 'absolute', top: 0, left: 0, width: LEFT, height: H,
          backgroundImage: `linear-gradient(to right, transparent 55%, ${t.bg} 100%)` }),
      )
    : h('div', { width: LEFT, height: H, flexShrink: 0, backgroundImage: t.bgGradLeft });

  const RIGHT = W - LEFT - 6;
  const rightPanel = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    width: RIGHT, height: H,
    paddingTop: 56, paddingBottom: 56, paddingLeft: 36, paddingRight: 48,
  },
    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 32 }, 'Save the Date'),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 90, lineHeight: 1, color: t.text }, d.groom),
      andRow(320, 18),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 90, lineHeight: 1, color: t.text }, d.bride),
    ),

    h('div', { height: 36 }),
    diamondRule(300),
    h('div', { height: 28 }),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: t.text85 }, d.date),
    h('div', { height: 8 }),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 9, color: t.text55, letterSpacing: 2.5, textTransform: 'uppercase' }, d.location),

    h('div', { height: 32 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: LAVENDER }, d.hashtag),
  );

  return h('div', {
    display: 'flex', flexDirection: 'row',
    width: W, height: H,
    backgroundColor: t.bg, overflow: 'hidden',
  },
    leftPanel,
    gradBar(6, H),
    rightPanel,
  );
}

// ════════════════════════════════════════════════════════════
// Vignette — 1080 × 1080
// Photo (or gradient) fills the full card. A radial-gradient
// darkens the edges inward, keeping the centre bright for text.
// Text is forced ivory when a photo is present.
// ════════════════════════════════════════════════════════════
function buildVignette(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  // Vignette cards with a photo always read light-on-dark.
  const TEXT    = photo ? '#fdfaf7'                  : t.text;
  const TEXT85  = photo ? 'rgba(253,250,247,0.85)'   : t.text85;
  const TEXT55  = photo ? 'rgba(253,250,247,0.55)'   : t.text55;
  const EYEBROW = photo ? 'rgba(253,250,247,0.65)'   : t.eyebrow;

  const textContent = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingLeft: 80, paddingRight: 80,
    position: 'relative', zIndex: 1,
  },
    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: EYEBROW, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 40 }, 'Save the Date'),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 128, lineHeight: 1, color: TEXT }, d.groom),
      andRow(560, 26),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 128, lineHeight: 1, color: TEXT }, d.bride),
    ),

    h('div', { height: 44 }),
    diamondRule(440),
    h('div', { height: 32 }),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 32, color: TEXT85 }, d.date),
    h('div', { height: 10 }),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 11, color: TEXT55, letterSpacing: 3, textTransform: 'uppercase' }, `${d.location} · Canada`),
    h('div', { height: 44 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: LAVENDER }, d.hashtag),
  );

  if (photo) {
    return h('div', {
      display: 'flex', flexDirection: 'column',
      width: W, height: H,
      position: 'relative', overflow: 'hidden', backgroundColor: '#1a1a2e',
    },
      { type: 'img', props: { src: photo, width: W, height: H, style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover', objectPosition: 'center' } } },
      // Dark overlay for legibility
      h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundColor: 'rgba(26,26,46,0.38)' }),
      // Radial vignette — darkens edges, keeps centre clear
      h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: 'radial-gradient(ellipse at center, transparent 28%, rgba(10,10,25,0.68) 100%)' }),
      textContent,
    );
  }

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden', backgroundColor: t.bg,
  },
    h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad }),
    // Softer vignette on gradient (uses the bg colour itself)
    h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: `radial-gradient(ellipse at center, transparent 40%, ${t.scrimStart} 100%)` }),
    textContent,
  );
}

// ════════════════════════════════════════════════════════════
// Bordered / Stationery — 1080 × 1080
// Gradient background (photo intentionally ignored — it would
// fight the frame). Two inset border lines create a printed-
// invitation feel. No grad bars — the frame is the boundary.
// ════════════════════════════════════════════════════════════
function buildBordered(d: CardData, _photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;
  const OUTER = 36;
  const INNER = 52;

  const textContent = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingLeft: 100, paddingRight: 100,
    position: 'relative', zIndex: 1,
  },
    // Short accent bar inside the frame — brand nod without grad bars at edges
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 },
      gradBar(180, 4),
    ),

    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 32 }, 'Save the Date'),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 128, lineHeight: 1, color: t.text }, d.groom),
      andRow(560, 26),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 128, lineHeight: 1, color: t.text }, d.bride),
    ),

    h('div', { height: 44 }),
    diamondRule(440),
    h('div', { height: 32 }),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 34, color: t.text85 }, d.date),
    h('div', { height: 10 }),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 11, color: t.text55, letterSpacing: 3, textTransform: 'uppercase' }, `${d.location} · Canada`),

    h('div', { height: 44 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: LAVENDER }, d.hashtag),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 },
      gradBar(180, 4),
    ),
  );

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundImage: t.bgGrad, backgroundColor: t.bg,
  },
    // Outer border line
    h('div', { position: 'absolute', top: OUTER, left: OUTER, width: W - OUTER * 2, height: H - OUTER * 2, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(197,184,224,0.55)' }),
    // Inner border line
    h('div', { position: 'absolute', top: INNER, left: INNER, width: W - INNER * 2, height: H - INNER * 2, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(197,184,224,0.30)' }),
    textContent,
  );
}

// ════════════════════════════════════════════════════════════
// Engagement Announcement — 1080 × 1080
// "We're getting married" as the hero phrase; warmer, more
// personal than Save the Date. No grad bars — cleaner feel.
// ════════════════════════════════════════════════════════════
function buildEngagement(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingLeft: 80, paddingRight: 80,
    position: 'relative', zIndex: 1,
  },
    h('div', {
      fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300,
      fontSize: 58, lineHeight: 1.1, color: t.text85, textAlign: 'center', marginBottom: 48,
    }, "We're getting married"),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 130, lineHeight: 1, color: t.text }, d.groom),
      andRow(560, 26),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 130, lineHeight: 1, color: t.text }, d.bride),
    ),

    h('div', { height: 52 }),
    h('div', { height: 1, width: 360, backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER}, transparent)` }),
    h('div', { height: 32 }),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 34, color: t.text85 }, d.date),
    h('div', { height: 10 }),
    h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 11, color: t.text55, letterSpacing: 3, textTransform: 'uppercase' }, d.location),

    h('div', { height: 48 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: LAVENDER }, d.hashtag),
  );

  const background = photo
    ? h('div', { display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H },
        ...photoScrim(W, H, photo, t, 'to top'))
    : h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad });

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundColor: t.bg,
  },
    background,
    content,
  );
}

// ════════════════════════════════════════════════════════════
// RSVP Reminder — 1080 × 1080
// Deadline date is the visual hero. Website URL prominent.
// ════════════════════════════════════════════════════════════
function buildRsvpReminder(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    flex: 1, paddingTop: 80, paddingLeft: 80, paddingRight: 80, paddingBottom: 80,
    position: 'relative', zIndex: 1,
  },
    // Top: names (smaller — supporting role here)
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 68, lineHeight: 1, color: t.text }, d.groom),
      andRow(380, 16),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 68, lineHeight: 1, color: t.text }, d.bride),
    ),

    // Center: deadline hero
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 10, color: t.eyebrow, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 20 }, 'Kindly RSVP by'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 100, lineHeight: 1, color: t.text, textAlign: 'center' }, d.rsvpDeadline),
      h('div', { height: 36 }),
      h('div', { height: 1, width: 320, backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER}, transparent)` }),
      h('div', { height: 28 }),
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: LAVENDER, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10 }, 'RSVP at'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 32, color: LAVENDER }, d.siteUrl),
    ),

    // Bottom: wedding date
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 9, color: t.text55, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }, 'Wedding Day'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: t.text85 }, d.date),
    ),
  );

  const background = photo
    ? h('div', { display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H },
        ...photoScrim(W, H, photo, t, 'to top'))
    : h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad });

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundColor: t.bg,
  },
    background,
    gradBar(W),
    content,
    gradBar(W),
  );
}

// ════════════════════════════════════════════════════════════
// Countdown — 1080 × 1080
// The number IS the card. Huge typographic countdown.
// ════════════════════════════════════════════════════════════
function buildCountdown(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;
  const days = String(d.daysTo ?? 0);

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    flex: 1, paddingTop: 72, paddingLeft: 80, paddingRight: 80, paddingBottom: 72,
    position: 'relative', zIndex: 1,
  },
    // Top: number + label
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 8 }, 'Counting Down'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 340, lineHeight: 0.88, color: t.text }, days),
      h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 20, color: t.text55, letterSpacing: 8, textTransform: 'uppercase', marginTop: 12 }, 'days to go'),
    ),

    // Bottom: names + date + hashtag
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      diamondRule(360),
      h('div', { height: 24 }),
      h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 58, lineHeight: 1, color: t.text }, d.groom),
        andRow(340, 15),
        h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 58, lineHeight: 1, color: t.text }, d.bride),
      ),
      h('div', { height: 16 }),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 24, color: t.text85 }, d.date),
      h('div', { height: 10 }),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 20, color: LAVENDER }, d.hashtag),
    ),
  );

  const background = photo
    ? h('div', { display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H },
        ...photoScrim(W, H, photo, t, 'to top'))
    : h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad });

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundColor: t.bg,
  },
    background,
    gradBar(W),
    content,
    gradBar(W),
  );
}

// ════════════════════════════════════════════════════════════
// Wedding Morning — 1080 × 1080
// Day-of card. "Today's the Day" as the emotional centrepiece.
// ════════════════════════════════════════════════════════════
function buildWeddingMorning(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    flex: 1, paddingTop: 80, paddingLeft: 80, paddingRight: 80, paddingBottom: 80,
    position: 'relative', zIndex: 1,
  },
    // Top: label + date
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 12 }, 'Wedding Day'),
      h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 11, color: t.text55, letterSpacing: 3, textTransform: 'uppercase' }, d.date),
    ),

    // Center: hero phrase + names
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 80, lineHeight: 1.1, color: t.text85, textAlign: 'center', marginBottom: 36 }, "Today's the Day"),
      diamondRule(400),
      h('div', { height: 32 }),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 118, lineHeight: 1, color: t.text }, d.groom),
      andRow(520, 24),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 118, lineHeight: 1, color: t.text }, d.bride),
    ),

    // Bottom: location + hashtag
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 10, color: t.text55, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }, d.location),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: LAVENDER }, d.hashtag),
    ),
  );

  const background = photo
    ? h('div', { display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H },
        ...photoScrim(W, H, photo, t, 'to top'))
    : h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad });

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundColor: t.bg,
  },
    background,
    gradBar(W),
    content,
    gradBar(W),
  );
}

// ════════════════════════════════════════════════════════════
// Thank You — 1080 × 1080
// Post-wedding. Gracious. Hashtag is the takeaway.
// No grad bars — softer close.
// ════════════════════════════════════════════════════════════
function buildThankYou(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingLeft: 80, paddingRight: 80,
    position: 'relative', zIndex: 1,
  },
    h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 36 }, 'With Love'),

    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 112, lineHeight: 1, color: t.text, textAlign: 'center' }, 'Thank You'),
    h('div', { height: 14 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 30, color: t.text85, textAlign: 'center' }, 'for celebrating with us'),

    h('div', { height: 52 }),
    diamondRule(400),
    h('div', { height: 40 }),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 96, lineHeight: 1, color: t.text }, d.groom),
      andRow(480, 22),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 96, lineHeight: 1, color: t.text }, d.bride),
    ),

    h('div', { height: 48 }),
    h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 26, color: LAVENDER }, d.hashtag),
  );

  const background = photo
    ? h('div', { display: 'flex', position: 'absolute', top: 0, left: 0, width: W, height: H },
        ...photoScrim(W, H, photo, t, 'to top'))
    : h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: t.bgGrad });

  return h('div', {
    display: 'flex', flexDirection: 'column',
    width: W, height: H,
    position: 'relative', overflow: 'hidden',
    backgroundColor: t.bg,
  },
    background,
    content,
  );
}

// ════════════════════════════════════════════════════════════
// Public render function
// ════════════════════════════════════════════════════════════

// Layout format — determines dimensions AND visual composition.
// Square-family (1080×1080): square, split, vignette, bordered.
// Special formats: dm (1200×630), story (1080×1920).
export type SocialFormat = 'square' | 'split' | 'vignette' | 'bordered' | 'dm' | 'story';

// Content variant — what the card says.
// Currently only the original `square` composition is variant-aware;
// the other compositions always render save-the-date content.
export type CardVariant =
  | 'save-the-date' | 'engagement' | 'rsvp-reminder'
  | 'countdown' | 'wedding-morning' | 'thank-you';

const DIMS: Record<SocialFormat, { w: number; h: number }> = {
  square:   { w: 1080, h: 1080 },
  split:    { w: 1080, h: 1080 },
  vignette: { w: 1080, h: 1080 },
  bordered: { w: 1080, h: 1080 },
  dm:       { w: 1200, h: 630  },
  story:    { w: 1080, h: 1920 },
};

export async function renderSocialCard(
  format: SocialFormat,
  data: CardData,
  photoSrc: string | null = null,
  theme: SocialTheme = 'light',
  variant: CardVariant = 'save-the-date',
): Promise<Buffer> {
  const { w, h: ht } = DIMS[format];
  const t = THEMES[theme];

  const tree =
    format === 'split'           ? buildSplitPanel(data, photoSrc, t)     :
    format === 'vignette'        ? buildVignette(data, photoSrc, t)        :
    format === 'bordered'        ? buildBordered(data, photoSrc, t)        :
    format === 'dm'              ? buildDM(data, photoSrc, t)              :
    format === 'story'           ? buildStory(data, photoSrc, t)           :
    // square — variant-aware
    variant === 'engagement'      ? buildEngagement(data, photoSrc, t)     :
    variant === 'rsvp-reminder'   ? buildRsvpReminder(data, photoSrc, t)   :
    variant === 'countdown'       ? buildCountdown(data, photoSrc, t)      :
    variant === 'wedding-morning' ? buildWeddingMorning(data, photoSrc, t) :
    variant === 'thank-you'       ? buildThankYou(data, photoSrc, t)       :
                                    buildSquare(data, photoSrc, t);

  const svg = await satori(tree, { width: w, height: ht, fonts: FONTS });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
