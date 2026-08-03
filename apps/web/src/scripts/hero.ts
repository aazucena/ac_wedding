let _rafId: number | null = null;
const _slideTimers: ReturnType<typeof setTimeout>[] = [];
let _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let _heroObserver: IntersectionObserver | null = null;
let _deviceOrientationHandler: ((e: DeviceOrientationEvent) => void) | null =
  null;

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

  if (
    allSlides.length > 1 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const SHOW_MS = 6000;
    const FADE_MS = 2000;
    let current = 0;

    allSlides[0]!.style.opacity = "1";

    function loadSlide(img: HTMLImageElement) {
      if (img.dataset.src && !img.src) img.src = img.dataset.src;
    }

    loadSlide(allSlides[1]!);

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
      const preloadIdx = (next + 1) % allSlides.length;
      _slideTimers.push(
        setTimeout(() => loadSlide(allSlides[preloadIdx]!), SHOW_MS / 2),
      );
      _slideTimers.push(
        setTimeout(
          () => crossfadeTo((next + 1) % allSlides.length),
          SHOW_MS + FADE_MS,
        ),
      );
    }

    _slideTimers.push(setTimeout(() => crossfadeTo(1), SHOW_MS));
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
  // and neither does deviceorientation — iOS 13+ gates it behind an explicit
  // DeviceOrientationEvent.requestPermission() from a user gesture, which we
  // never call. So on a phone this loop would just rewrite translate3d(0,0,0)
  // onto three composited layers at 60fps forever — one of which
  // (.hero-content) wraps the countdown bar's backdrop-filter and forces it to
  // re-sample every frame.
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

    startParallax();
  }

  // Also the exit-focus trigger it already was — now it additionally parks the
  // RAF loop whenever the hero is off-screen, where the effect is invisible.
  _heroObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry!.isIntersecting) {
        startParallax();
      } else {
        exitFocus();
        stopParallax();
      }
    },
    { threshold: 0 },
  );
  _heroObserver.observe(hero);
}

document.addEventListener("astro:before-swap", cleanup);
document.addEventListener("astro:page-load", () => {
  if (document.getElementById("hero-parallax")) initHero();
});
