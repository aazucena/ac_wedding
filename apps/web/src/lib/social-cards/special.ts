import { h, gradBar, diamondRule, andRow, photoScrim, LAVENDER, type Theme, type El, type CardData } from './helpers';

export function buildSplitPanel(d: CardData, photo: string | null, t: Theme): El {
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

export function buildVignette(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

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
      h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundColor: 'rgba(26,26,46,0.38)' }),
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
    h('div', { position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: `radial-gradient(ellipse at center, transparent 40%, ${t.scrimStart} 100%)` }),
    textContent,
  );
}

export function buildBordered(d: CardData, _photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;
  const OUTER = 36;
  const INNER = 52;

  const textContent = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    flex: 1, paddingLeft: 100, paddingRight: 100,
    position: 'relative', zIndex: 1,
  },
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
    h('div', { position: 'absolute', top: OUTER, left: OUTER, width: W - OUTER * 2, height: H - OUTER * 2, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(197,184,224,0.55)' }),
    h('div', { position: 'absolute', top: INNER, left: INNER, width: W - INNER * 2, height: H - INNER * 2, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(197,184,224,0.30)' }),
    textContent,
  );
}

export function buildEngagement(d: CardData, photo: string | null, t: Theme): El {
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
