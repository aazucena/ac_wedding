const BATCH = 12;

const list = document.getElementById("letters-list") as HTMLElement | null;
const listWrap = document.getElementById("letters-wrap") as HTMLElement | null;
const loadWrap = document.getElementById(
  "load-more-wrap",
) as HTMLElement | null;
const loadBtn = document.getElementById(
  "load-more-btn",
) as HTMLButtonElement | null;
const countEl = document.getElementById(
  "load-more-count",
) as HTMLElement | null;
const sortBtn = document.getElementById(
  "guestbook-sort",
) as HTMLButtonElement | null;
const pageSizeEl = document.getElementById(
  "guestbook-pagesize",
) as HTMLSelectElement | null;
const sortLabel = document.getElementById("sort-label") as HTMLElement | null;
const sortArrow = document.getElementById("sort-arrow") as HTMLElement | null;
const dataEl = document.getElementById("all-messages");

if (list && listWrap && dataEl) {
  type Entry = {
    name: string;
    messageHtml: string | null;
    date: string | null;
    dateFormatted: string;
  };
  const allMessages: Entry[] = JSON.parse(dataEl.textContent ?? "[]");

  let sortOrder: "desc" | "asc" = "desc";
  let offset = BATCH;

  function mkEl<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  // messageHtml is pre-rendered server-side by parseMarkdown (strips raw HTML);
  // DOMParser is used here to insert it without an innerHTML assignment.
  function setServerHtml(el: HTMLElement, html: string) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    Array.from(doc.body.childNodes).forEach((n) =>
      el.appendChild(n.cloneNode(true)),
    );
  }

  function buildCard(entry: Entry, delay: number): HTMLElement {
    const article = mkEl("article", "letter");
    article.style.animationDelay = `${delay}s`;

    const header = mkEl("header", "letter-header");
    const from = mkEl("div", "letter-from");
    const symbol = mkEl("span", "letter-symbol");
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = "✦";
    const name = mkEl("span", "letter-name");
    name.textContent = entry.name;
    from.append(symbol, name);
    header.appendChild(from);

    if (entry.date) {
      const time = mkEl("time", "letter-date");
      time.setAttribute("datetime", entry.date);
      time.textContent = entry.dateFormatted;
      header.appendChild(time);
    }

    const rule = mkEl("div", "letter-rule");
    rule.setAttribute("aria-hidden", "true");

    const quote = mkEl("div", "letter-message");
    setServerHtml(quote, entry.messageHtml ?? "");

    article.append(header, rule, quote);
    return article;
  }

  function getFiltered(): Entry[] {
    const base = [...allMessages];
    return sortOrder === "asc" ? base.reverse() : base;
  }

  function showFadeHint(active: boolean) {
    listWrap!.classList.toggle("faded", active);
  }

  function render() {
    const filtered = getFiltered();

    list!.replaceChildren();
    filtered.slice(0, offset).forEach((entry, i) => {
      list!.appendChild(buildCard(entry, 0.03 + i * 0.04));
    });

    if (loadWrap) {
      const left = filtered.length - offset;
      loadWrap.classList.toggle("hidden-wrap", left <= 0);
      if (left > 0 && countEl) countEl.textContent = `${left} remaining`;
    }

    list!.scrollTop = 0;
    const hasOverflow = list!.scrollHeight > list!.clientHeight;
    showFadeHint(hasOverflow);
  }

  function onScroll() {
    const nearBottom =
      list!.scrollTop + list!.clientHeight >= list!.scrollHeight - 40;
    if (loadWrap)
      nearBottom
        ? loadWrap.classList.add("visible")
        : loadWrap.classList.remove("visible");
    showFadeHint(!nearBottom);
  }

  function loadMore() {
    const filtered = getFiltered();
    const batch = filtered.slice(offset, offset + BATCH);
    let firstNew: Element | null = null;
    batch.forEach((entry, i) => {
      const card = buildCard(entry, 0.05 + i * 0.06);
      if (i === 0) firstNew = card;
      list!.appendChild(card);
    });
    offset += batch.length;

    if (loadWrap) loadWrap.classList.remove("visible");
    (firstNew as Element | null)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    const left = filtered.length - offset;
    if (left <= 0) {
      loadWrap?.remove();
      showFadeHint(false);
      list!.removeEventListener("scroll", onScroll);
    } else if (countEl) {
      countEl.textContent = `${left} remaining`;
    }
  }

  pageSizeEl?.addEventListener("change", () => {
    const val = parseInt(pageSizeEl.value, 10);
    if (!isNaN(val)) {
      (window as any).__GUESTBOOK_BATCH = val;
      offset = val;
      render();
    }
  });

  function getBatch(): number {
    return (window as any).__GUESTBOOK_BATCH ?? BATCH;
  }

  sortBtn?.addEventListener("click", () => {
    sortOrder = sortOrder === "desc" ? "asc" : "desc";
    if (sortLabel)
      sortLabel.textContent = sortOrder === "desc" ? "Newest" : "Oldest";
    if (sortArrow) sortArrow.textContent = sortOrder === "desc" ? "↓" : "↑";
    offset = getBatch();
    render();
  });

  list.addEventListener("scroll", onScroll);
  loadBtn?.addEventListener("click", loadMore);
  listWrap.classList.add("faded");
} // end guard
