import { h, gradBar, diamondRule, andRow, photoScrim, THEMES, LAVENDER, type Theme, type El, type CardData } from './helpers';

export function buildSquare(d: CardData, photo: string | null, t: Theme): El {
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

export function buildDM(d: CardData, photo: string | null, t: Theme): El {
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

export function buildStory(d: CardData, photo: string | null, t: Theme): El {
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
    }, `${d.bride[0]}${d.groom[0]}`),

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
