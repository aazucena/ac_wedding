// ── Auth ──────────────────────────────────────────────────
const SK = "mc_auth";
const overlay = document.getElementById("auth-overlay")!;
const dashboard = document.getElementById("dashboard")!;
const authInput = document.getElementById("auth-input") as HTMLInputElement;
const authBtn = document.getElementById("auth-submit")!;
const authError = document.getElementById("auth-error")!;

function unlock() {
  overlay.remove();
  dashboard.removeAttribute("hidden");
}

if (sessionStorage.getItem(SK)) {
  unlock();
}

authBtn.addEventListener("click", attemptAuth);
authInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptAuth();
});

async function attemptAuth() {
  const passcode = authInput.value.trim();
  if (!passcode) return;

  authBtn.setAttribute("disabled", "");
  authBtn.textContent = "…";
  authError.classList.add("hidden");

  try {
    const res = await fetch("/api/mc/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json()) as { ok: boolean };

    if (data.ok) {
      sessionStorage.setItem(SK, "1");
      unlock();
    } else {
      authError.classList.remove("hidden");
      authInput.value = "";
      authInput.focus();
    }
  } catch {
    authError.textContent = "Something went wrong. Try again.";
    authError.classList.remove("hidden");
  } finally {
    authBtn.removeAttribute("disabled");
    authBtn.textContent = "Continue";
  }
}

// ── Guest card collapse ───────────────────────────────────
document.getElementById("guest-list")?.addEventListener("click", (e) => {
  const header = (e.target as HTMLElement).closest<HTMLElement>(
    ".guest-card-header",
  );
  if (!header) return;
  const photos = header.nextElementSibling as HTMLElement;
  const open = header.getAttribute("aria-expanded") === "true";
  header.setAttribute("aria-expanded", String(!open));
  photos.hidden = open;
});
document.getElementById("guest-list")?.addEventListener("keydown", (e) => {
  if ((e as KeyboardEvent).key !== "Enter") return;
  const header = (e.target as HTMLElement).closest<HTMLElement>(
    ".guest-card-header",
  );
  if (header) header.click();
});

// ── Guest name search ─────────────────────────────────────
document.getElementById("guest-search")?.addEventListener("input", (e) => {
  const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>(".guest-card").forEach((card) => {
    const name =
      card.querySelector(".guest-name")?.textContent?.toLowerCase() ?? "";
    card.hidden = q.length > 0 && !name.includes(q);
  });
});

// ── Auto-refresh ──────────────────────────────────────────
const tsEl = document.getElementById("refresh-ts")!;
const refreshBtn = document.getElementById("refresh-btn")!;
const INTERVAL = 30_000;
let lastReload = Date.now();

function formatAge(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

setInterval(() => {
  tsEl.textContent = formatAge(Date.now() - lastReload);
}, 10_000);

setInterval(() => {
  location.reload();
}, INTERVAL);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") location.reload();
});

refreshBtn.addEventListener("click", () => {
  location.reload();
});
