import { galleryHash } from "../lib/utils/gallery";

// document/window listeners are re-registered on every astro:page-load; abort
// the previous set first so they don't stack up across client-side navigations
// (same pattern as Navbar.astro).
let abort: AbortController | null = null;

document.addEventListener("astro:page-load", () => {
  abort?.abort();
  abort = new AbortController();
  const sig = { signal: abort.signal };

  const filter = document.getElementById("gallery-filter");
  const filterBtns = document.querySelectorAll<HTMLButtonElement>(
    ".gallery-filter-btn",
  );
  const menu = document.getElementById("gallery-filter-menu");
  const menuToggle = document.getElementById("gallery-filter-toggle");
  const menuOptions = document.querySelectorAll<HTMLButtonElement>(
    ".gallery-filter-option",
  );
  const currentLabel = document.getElementById("gallery-filter-current");
  const currentCount = document.getElementById("gallery-filter-current-count");
  const grid = document.getElementById("gallery-grid");
  const gridItems = document.querySelectorAll<HTMLElement>(
    ".gallery-item:not(.gallery-item--pad)",
  );
  const padItems = document.querySelectorAll<HTMLElement>(".gallery-item--pad");
  const sections = document.querySelectorAll<HTMLElement>(".gallery-section");
  const sectionLinks = document.querySelectorAll<HTMLAnchorElement>(
    ".gallery-section-link",
  );
  const emptyMsg = document.getElementById("gallery-filter-empty");

  if (!filterBtns.length || !gridItems.length) return;

  // One choice at a time: "all", a category, or "bw" (which cuts across
  // categories and gets its own heading).
  let active = "all";

  function applyFilter() {
    let visible = 0;
    const visibleByCategory = new Map<string, number>();
    gridItems.forEach((item) => {
      const cat = item.dataset.category ?? "";
      const show =
        active === "all" ||
        (active === "bw" ? item.dataset.bw === "true" : cat === active);
      item.style.display = show ? "" : "none";
      // Read by the lightbox so next/previous stays within this filter.
      item.toggleAttribute("data-filtered-out", !show);
      if (show) {
        visible++;
        visibleByCategory.set(cat, (visibleByCategory.get(cat) ?? 0) + 1);
      }
    });
    // A heading follows its photos: hidden when none are showing. Under B&W
    // the category headings step aside for the single Black & White one.
    sections.forEach((section) => {
      const key = section.dataset.category ?? "";
      const n =
        key === "bw"
          ? active === "bw"
            ? visible
            : 0
          : active === "bw"
            ? 0
            : (visibleByCategory.get(key) ?? 0);
      section.style.display = n > 0 ? "" : "none";
    });
    padItems.forEach((p) => {
      p.style.display = active === "all" ? "" : "none";
    });
    // Lets the headings drop their "open this category" link styling.
    grid?.toggleAttribute("data-filtered", active !== "all");
    if (emptyMsg) {
      emptyMsg.textContent =
        visible === 0 ? "No photos match this filter." : "";
    }
  }

  // The bar is pinned, so a filter can change far down the page. Bring the
  // start of the (now shorter) grid back into view, and keep the chosen pill
  // visible if the bar has to scroll sideways.
  function settle(btn?: HTMLElement) {
    // "instant", not "auto": auto defers to the site's CSS scroll-behavior,
    // which is smooth.
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "instant"
      : "smooth";
    const above = grid ? -grid.getBoundingClientRect().top : 0;
    if (grid && above > 0) {
      // Glide a short way; jump a long one rather than animate past hundreds
      // of photos (and trigger their lazy loads) on the way up.
      grid.scrollIntoView({
        behavior: above > window.innerHeight * 1.5 ? "instant" : behavior,
        block: "start",
      });
    }
    if (filter && btn) {
      filter.scrollTo({
        left: btn.offsetLeft - (filter.clientWidth - btn.offsetWidth) / 2,
        behavior,
      });
    }
  }

  // The pills (desktop) and the menu (phones) are two views of one choice;
  // both are kept current so crossing the breakpoint never shows a stale one.
  // The choice is mirrored in the URL fragment so any view can be linked to.
  function setActive(value: string, { updateUrl = true, scroll = true } = {}) {
    active = value;
    let activeBtn: HTMLElement | undefined;
    filterBtns.forEach((b) => {
      const on = (b.dataset.filter ?? "all") === value;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
      if (on) activeBtn = b;
    });
    menuOptions.forEach((o) => {
      const on = o.dataset.filter === value;
      o.classList.toggle("active", on);
      o.setAttribute("aria-selected", String(on));
      if (on) {
        const [label, count] = o.querySelectorAll("span");
        if (currentLabel) currentLabel.textContent = label?.textContent ?? "";
        if (currentCount) currentCount.textContent = count?.textContent ?? "";
      }
    });
    applyFilter();
    if (updateUrl) {
      // replaceState, not a new entry: Back should leave the gallery, not
      // replay every filter that was tapped.
      const hash = galleryHash(value);
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search + (hash ? `#${hash}` : ""),
      );
    }
    if (scroll) settle(activeBtn);
  }

  // The filter a fragment names, if it is one this page actually offers.
  function filterFromHash(): string | undefined {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (!hash) return "all";
    return [...filterBtns].find((b) => b.dataset.hash === hash)?.dataset.filter;
  }

  function setMenuOpen(open: boolean) {
    menu?.classList.toggle("open", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
  }

  [...filterBtns, ...menuOptions].forEach((btn) => {
    btn.addEventListener("click", () => {
      setActive(btn.dataset.filter ?? "all");
      setMenuOpen(false);
    });
  });

  sectionLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      setActive(link.dataset.filter ?? "all");
    });
  });

  menuToggle?.addEventListener("click", () =>
    setMenuOpen(!menu?.classList.contains("open")),
  );
  // Dismiss like the navbar dropdowns: tap elsewhere, or Escape.
  document.addEventListener(
    "click",
    (e) => {
      if (menu && !menu.contains(e.target as Node)) setMenuOpen(false);
    },
    sig,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Escape" || !menu?.classList.contains("open")) return;
      setMenuOpen(false);
      menuToggle?.focus();
    },
    sig,
  );

  // Arriving by link (/gallery#ceremony): open on that filter, from the top.
  const initial = filterFromHash();
  if (initial && initial !== "all") {
    setActive(initial, { updateUrl: false, scroll: false });
  }
  // Fragment edited by hand, or back/forward between two of them.
  window.addEventListener(
    "hashchange",
    () => setActive(filterFromHash() ?? "all", { updateUrl: false }),
    sig,
  );
});
