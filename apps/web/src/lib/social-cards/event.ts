import { h, gradBar, diamondRule, andRow, photoScrim, LAVENDER, type Theme, type El, type CardData } from './helpers';

export function buildRsvpReminder(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    flex: 1, paddingTop: 80, paddingLeft: 80, paddingRight: 80, paddingBottom: 80,
    position: 'relative', zIndex: 1,
  },
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 68, lineHeight: 1, color: t.text }, d.groom),
      andRow(380, 16),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 68, lineHeight: 1, color: t.text }, d.bride),
    ),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 10, color: t.eyebrow, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 20 }, 'Kindly RSVP by'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 100, lineHeight: 1, color: t.text, textAlign: 'center' }, d.rsvpDeadline),
      h('div', { height: 36 }),
      h('div', { height: 1, width: 320, backgroundImage: `linear-gradient(90deg, transparent, ${LAVENDER}, transparent)` }),
      h('div', { height: 28 }),
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: LAVENDER, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10 }, 'RSVP at'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 32, color: LAVENDER }, d.siteUrl),
    ),

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

export function buildCountdown(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;
  const days = String(d.daysTo ?? 0);

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    flex: 1, paddingTop: 72, paddingLeft: 80, paddingRight: 80, paddingBottom: 72,
    position: 'relative', zIndex: 1,
  },
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 8 }, 'Counting Down'),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 340, lineHeight: 0.88, color: t.text }, days),
      h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 20, color: t.text55, letterSpacing: 8, textTransform: 'uppercase', marginTop: 12 }, 'days to go'),
    ),

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

export function buildWeddingMorning(d: CardData, photo: string | null, t: Theme): El {
  const W = 1080, H = 1080;

  const content = h('div', {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between',
    flex: 1, paddingTop: 80, paddingLeft: 80, paddingRight: 80, paddingBottom: 80,
    position: 'relative', zIndex: 1,
  },
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'Jost', fontWeight: 600, fontSize: 9, color: t.eyebrow, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 12 }, 'Wedding Day'),
      h('div', { fontFamily: 'Jost', fontWeight: 400, fontSize: 11, color: t.text55, letterSpacing: 3, textTransform: 'uppercase' }, d.date),
    ),

    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 80, lineHeight: 1.1, color: t.text85, textAlign: 'center', marginBottom: 36 }, "Today's the Day"),
      diamondRule(400),
      h('div', { height: 32 }),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 118, lineHeight: 1, color: t.text }, d.groom),
      andRow(520, 24),
      h('div', { fontFamily: 'CG', fontStyle: 'italic', fontWeight: 300, fontSize: 118, lineHeight: 1, color: t.text }, d.bride),
    ),

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

export function buildThankYou(d: CardData, photo: string | null, t: Theme): El {
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
