let _rafId: number | null = null;
const _slideTimers: ReturnType<typeof setTimeout>[] = [];
let _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let _heroObserver: IntersectionObserver | null = null;
let _deviceOrientationHandler: ((e: DeviceOrientationEvent) => void) | null =
  null;
let _visibilityHandler: (() => void) | null = null;

function cleanup() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  _slideTimers.splice(0).forEach(clearTimeout);
  if (_keydownHandler) {
    document.removeEventListener("keydown", _keydownHandler);
    _keydownHandler = null;
  }
  if (_heroObserver) {
    _heroObserver.disconnect();
    _heroObserver = null;
  }
  if (_deviceOrientationHandler) {
    window.removeEventListener("deviceorientation", _deviceOrientationHandler);
    _deviceOrientationHandler = null;
  }
  if (_visibilityHandler) {
    document.removeEventListener("visibilitychange", _visibilityHandler);
    _visibilityHandler = null;
  }
}

function initHero() {
  const hero = document.getElementById("hero-parallax") as HTMLElement | null;
  const heroBg = document.getElementById("hero-bg") as HTMLElement | null;
  const heroOrb = document.getElementById("hero-orbs") as HTMLElement | null;
  const heroCnt = document.getElementById("hero-content") as HTMLElement | null;

  if (!hero || !heroBg || !heroCnt) return;

  // ── Slideshow crossfade ────────────────────────────────────
  const allSlides = Array.from(
    document.querySelectorAll<HTMLImageElement>("#hero-bg .hero-slide"),
  );

  document
    .querySelectorAll<HTMLImageElement>(
      '.hero-slide[data-download-protected="true"]',
    )
    .forEach((img) => {
      img.addEventListener("contextmenu", (e) => e.preventDefault());
      img.addEventListener("dragstart", (e) => e.preventDefault());
    });

  // Every featured photo renders as a slide, and a slide holds its decoded
  // bitmap (~8.3MB at 1920x1080, ~3.7MB at 1280x720) for as long as its src is
  // set. Letting all of them accumulate walks straight into WebKit's per-tab
  // memory ceiling, and iOS Safari kills the tab -- that is what the "a problem
  // repeatedly occurred" reload is. So we hold at most two decoded at once and
  // release the rest, which makes peak memory independent of the photo count.
  const srcAttr = window.matchMedia("(pointer: coarse)").matches
    ? "srcSm"
    : "srcLg";

  let startSlideshow = () => {};
  let stopSlideshow = () => {};

  if (
    allSlides.length > 1 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const SHOW_MS = 6000;
    const FADE_MS = 2000;
    let current = 0;
    let running = false;

    allSlides[0]!.style.opacity = "1";

    const nextIndex = (i: number) => (i + 1) % allSlides.length;

    const loadSlide = (img: HTMLImageElement) => {
      const src = img.dataset[srcAttr];
      if (src && !img.getAttribute("src")) img.src = src;
    };

    // removeAttribute, not `src = ""` -- the empty string resolves against the
    // document URL, so it would fire a real request for the page's own HTML.
    // Reloading later is close to free: /api/cms/assets/* is served
    // `immutable, max-age=31536000` by the proxy.
    const unloadSlide = (img: HTMLImageElement) => {
      img.removeAttribute("src");
      img.style.opacity = "0";
      img.style.transition = "";
    };

    const releaseAllBut = (...keep: number[]) => {
      const keepSet = new Set(keep);
      allSlides.forEach((img, i) => {
        if (!keepSet.has(i)) unloadSlide(img);
      });
    };

    function crossfadeTo(next: number) {
      const from = allSlides[current]!;
      const to = allSlides[next]!;
      loadSlide(to);
      from.style.transition = `opacity ${FADE_MS / 1000}s linear`;
      to.style.transition = `opacity ${FADE_MS / 1000}s linear`;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          from.style.opacity = "0";
          to.style.opacity = "1";
        }),
      );
      current = next;

      // Release the outgoing slide only once its fade has finished -- dropping
      // the src mid-transition would flash the layer empty. Releasing it here,
      // at the same moment the next one is preloaded, keeps exactly two decoded
      // at any instant: {outgoing, incoming} during a fade, {current, upcoming}
      // between them. Verified in WebKit: peak stays at 2 across many cycles.
      _slideTimers.push(
        setTimeout(() => {
          const upcoming = nextIndex(current);
          releaseAllBut(current, upcoming);
          loadSlide(allSlides[upcoming]!);
        }, FADE_MS),
      );
      _slideTimers.push(
        setTimeout(() => crossfadeTo(nextIndex(current)), SHOW_MS + FADE_MS),
      );
    }

    startSlideshow = () => {
      if (running) return;
      running = true;
      loadSlide(allSlides[current]!);
      loadSlide(allSlides[nextIndex(current)]!);
      _slideTimers.push(
        setTimeout(() => crossfadeTo(nextIndex(current)), SHOW_MS),
      );
    };

    // Called when the hero scrolls out of view or the tab is backgrounded. The
    // old code kept the timer chain running in both cases, so slides carried on
    // decoding while the guest read the rest of the page.
    stopSlideshow = () => {
      if (!running) return;
      running = false;
      _slideTimers.splice(0).forEach(clearTimeout);
      releaseAllBut(current);
      allSlides[current]!.style.opacity = "1";
    };
  }

  // ── Focus / immersive mode ─────────────────────────────────
  const focusBtn = document.getElementById("hero-focus-btn");
  const nav = document.getElementById("site-nav");
  const player = document.querySelector<HTMLElement>(".spotify-player--fixed");

  function enterFocus() {
    hero!.classList.add("hero--immersive");
    focusBtn?.setAttribute("aria-pressed", "true");
    if (nav) {
      nav.style.opacity = "0";
      nav.style.pointerEvents = "none";
    }
    if (player) player.classList.add("spotify-player--hidden");
  }
  function exitFocus() {
    hero!.classList.remove("hero--immersive");
    focusBtn?.setAttribute("aria-pressed", "false");
    if (nav) {
      nav.style.opacity = "";
      nav.style.pointerEvents = "";
    }
    if (player) player.classList.remove("spotify-player--hidden");
  }

  focusBtn?.addEventListener("click", () => {
    hero.classList.contains("hero--immersive") ? exitFocus() : enterFocus();
  });

  _keydownHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && hero.classList.contains("hero--immersive"))
      exitFocus();
  };
  document.addEventListener("keydown", _keydownHandler);

  // ── Parallax ──────────────────────────────────────────────
  const BG_STR = 16;
  const ORB_STR = 8;
  const CNT_STR = 4;

  // Cursor parallax is a fine-pointer effect. On touch, mousemove never fires,
  // and neither does deviceorientation -- iOS 13+ gates it behind an explicit
  // DeviceOrientationEvent.requestPermission() from a user gesture, which we
  // never call. So on a phone this loop would just rewrite translate3d(0,0,0)
  // onto three composited layers at 60fps forever.
  const parallaxEnabled =
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let startParallax = () => {};
  let stopParallax = () => {};

  if (parallaxEnabled) {
    let tx = 0,
      ty = 0;
    let cx = 0,
      cy = 0;

    hero.addEventListener("mousemove", (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    hero.addEventListener("mouseleave", () => {
      tx = 0;
      ty = 0;
    });

    if (typeof DeviceOrientationEvent !== "undefined") {
      _deviceOrientationHandler = (e: DeviceOrientationEvent) => {
        if (e.gamma == null && e.beta == null) return;
        tx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 25));
        ty = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 25));
      };
      window.addEventListener("deviceorientation", _deviceOrientationHandler, {
        passive: true,
      });
    }

    const tick = () => {
      cx += (tx - cx) * 0.025;
      cy += (ty - cy) * 0.025;
      heroBg!.style.transform = `translate3d(${cx * -BG_STR}px,  ${cy * -BG_STR * 0.5}px, 0)`;
      if (heroOrb)
        heroOrb.style.transform = `translate3d(${cx * -ORB_STR}px, ${cy * -ORB_STR * 0.5}px, 0)`;
      heroCnt!.style.transform = `translate3d(${cx * CNT_STR}px, ${cy * CNT_STR * 0.5}px, 0)`;
      _rafId = requestAnimationFrame(tick);
    };

    startParallax = () => {
      if (_rafId === null) _rafId = requestAnimationFrame(tick);
    };
    stopParallax = () => {
      if (_rafId !== null) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
      }
    };
  }

  // Single owner of "is the hero worth spending resources on": parks both the
  // parallax loop and the slideshow whenever the hero is off-screen, and is
  // also the exit-focus trigger it already was.
  let heroOnScreen = false;
  _heroObserver = new IntersectionObserver(
    ([entry]) => {
      heroOnScreen = entry!.isIntersecting;
      if (heroOnScreen) {
        startParallax();
        if (!document.hidden) startSlideshow();
      } else {
        exitFocus();
        stopParallax();
        stopSlideshow();
      }
    },
    { threshold: 0 },
  );
  _heroObserver.observe(hero);

  // A backgrounded tab still runs setTimeout, so without this the carousel keeps
  // decoding new slides for a tab nobody is looking at.
  _visibilityHandler = () => {
    if (document.hidden) stopSlideshow();
    else if (heroOnScreen) startSlideshow();
  };
  document.addEventListener("visibilitychange", _visibilityHandler);
}

document.addEventListener("astro:before-swap", cleanup);
document.addEventListener("astro:page-load", () => {
  if (document.getElementById("hero-parallax")) initHero();
});
