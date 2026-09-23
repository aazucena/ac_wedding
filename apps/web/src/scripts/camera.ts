// scripts/camera.ts — Roll Call (/camera)
//
// A real viewfinder: the page opens the camera with getUserMedia and shows a
// live preview, so shooting feels like a camera app rather than a file upload.
// The OS file picker stays as a fallback for the cases getUserMedia can't
// serve — permission denied, an old browser, or a non-HTTPS origin (which
// silently disables camera access everywhere but localhost).
//
// Shooters are identified by PERSON id, not guest id: seating lives on
// persons.table, so parents and other seated hosts can shoot too, while vendors
// are filtered out. That's why these keys are the camera's own — the reception
// game stores a guest id under gup-ls-*, and handing one of those to
// /api/camera/* would 403 every upload.

const LSK = {
  name: "pc-name",
  personId: "pc-person",
  token: "pc-token",
  /** Set once the camera has opened successfully on this device, so a return
   *  visit doesn't make the guest tap "Allow camera" again. */
  cameraOk: "pc-cam-ok",
  grid: "pc-grid",
} as const;

/** Long edge of the uploaded frame. ~1 MB of JPEG — sharp on any screen and
 *  well under Vercel's ~4.5 MB request body ceiling. */
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

import { coverSourceRect } from "@lib/camera-frame";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;

// ── Elements ────────────────────────────────────────────────────────────────
const gate = $("cam-gate");
const cameraView = $("camera-view");

const nameInput = $<HTMLInputElement>("name-input");
const nameSuggestions = $("name-suggestions");
// The camera view has its own identity chip, separate from the gate form:
// duplicate ids would resolve to whichever copy came first in the DOM.
const identityChip = $("cam-identity");
const identityName = $("cam-identity-name");

const gateClose = $<HTMLButtonElement>("gate-close");
const stepName = $("gate-name");
const stepTable = $("gate-table");
const tableInput = $<HTMLInputElement>("table-number-input");
const tableBtn = $<HTMLButtonElement>("table-verify-btn");
const tableBack = $<HTMLButtonElement>("table-back");
const tableError = $("table-verify-error");
const pendingNameDisplay = $("pending-name-display");

const viewfinder = $<HTMLVideoElement>("viewfinder");
const stage = $("cam-stage");
const permitBtn = $<HTMLButtonElement>("permit-btn");
const permitPanel = $("permit-panel");
const permitNote = $("permit-note");
const permitHint = $("permit-hint");
const flashEl = $("cam-flash");

const counter = $("shot-counter");
const shutter = $<HTMLButtonElement>("shutter");
const flipBtn = $<HTMLButtonElement>("flip-btn");
const pickerLabel = $("picker");
const pickerInput = $<HTMLInputElement>("picker-input");
const status = $("camera-status");
const sheet = $("cam-sheet");
const sheetPreview = $<HTMLImageElement>("sheet-preview");
const sheetSend = $<HTMLButtonElement>("sheet-send");
const sheetDiscard = $<HTMLButtonElement>("sheet-discard");
const sheetShare = $<HTMLButtonElement>("sheet-share");
const captionInput = $<HTMLTextAreaElement>("caption-input");
const captionCount = $("caption-count");

/** Keep in sync with CAPTION_MAX in lib/constants/camera.ts (the input's
 *  maxlength is rendered from it, so this only drives the readout). */
const CAPTION_MAX = Number(captionInput?.maxLength || 120);
const rollDone = $("roll-done");
const doneName = $("done-name");
const doneSwitch = $<HTMLButtonElement>("done-switch");

const gridEl = $("cam-grid");
const gridBtn = $<HTMLButtonElement>("grid-btn");
const flashBtn = $<HTMLButtonElement>("flash-btn");
const timerBtn = $<HTMLButtonElement>("timer-btn");
const timerLabel = $("timer-label");
const countdownEl = $("cam-countdown");
const toolsEl = $("cam-tools");
const zoomBtns = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".cam-zoom-btn"),
);

// ── State ───────────────────────────────────────────────────────────────────
let personId: string | null = null;
let personToken: string | null = null;
let guestName = "";
let pendingId: string | null = null;
let pendingName = "";
let remaining = Number(cameraView?.dataset.limit ?? 12);
let busy = false;

/** The shot waiting on a caption. Held only between the shutter and Send —
 *  one blob at a time, dropped as soon as it's sent or discarded. */
let pendingShot: Blob | null = null;
/** Object URL for the held shot's preview; revoked as soon as it's gone. */
let previewUrl: string | null = null;

let stream: MediaStream | null = null;
/** True once the guest has allowed the camera, so returning to the tab can
 *  resume the stream without asking again. Cleared only when they leave the
 *  camera for good (gate reopened, roll finished). */
let cameraWanted = false;
let facing: "environment" | "user" = "environment";
/** One canvas for the whole session — allocating a new one per shot is what
 *  fills iOS Safari's image memory and kills the tab. */
const frameCanvas = document.createElement("canvas");

/** Digital zoom, 1–4. Applied to the preview as a CSS transform and to the
 *  capture as a smaller source rect — unless the camera supports real zoom,
 *  in which case the hardware does it and the preview isn't touched. */
let zoom = 1;
const MAX_ZOOM = 4;
/** 1 unless the camera reports it can go wider (ultra-wide lens). Digital zoom
 *  can only crop, so below 1 is impossible without hardware. */
let minZoom = 1;
let hardwareZoom: { min: number; max: number } | null = null;
let torchCapable = false;
let torchOn = false;
/** 0 = off, otherwise seconds. */
let timerSeconds = 0;
const TIMER_STEPS = [0, 3, 5, 10];
let countdownTimer: number | undefined;

// ── Identity ────────────────────────────────────────────────────────────────
function saveIdentity() {
  try {
    localStorage.setItem(LSK.name, guestName);
    localStorage.setItem(LSK.personId, personId ?? "");
    localStorage.setItem(LSK.token, personToken ?? "");
  } catch {
    /* private mode — identity just won't persist across reloads */
  }
}

function restoreIdentity(): boolean {
  try {
    const id = localStorage.getItem(LSK.personId);
    const token = localStorage.getItem(LSK.token);
    const name = localStorage.getItem(LSK.name);
    if (!id || !token) return false;
    personId = id;
    personToken = token;
    guestName = name ?? "";
    return true;
  } catch {
    return false;
  }
}

function forgetIdentity() {
  personId = personToken = null;
  guestName = "";
  try {
    Object.values(LSK).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function showCamera() {
  gate?.classList.add("hidden");
  if (identityName) identityName.textContent = guestName;
  identityChip?.classList.toggle("hidden", !guestName);
  void refreshCount();
  // Open straight into the viewfinder when the browser has already granted the
  // camera; otherwise wait for a tap. A page that demands the camera from a
  // first-time visitor is hostile, but asking someone who already said yes on
  // every single reload is worse.
  void resumeOrPrompt();
}

/**
 * What the browser already knows about camera permission.
 *
 * Chrome/Android answers through the Permissions API. Safari throws on
 * `{ name: "camera" }`, so the stored flag is the fallback — written the first
 * time the camera opened successfully on this device.
 */
async function cameraPermission(): Promise<"granted" | "denied" | "unknown"> {
  try {
    const status = await navigator.permissions?.query({
      name: "camera" as PermissionName,
    });
    if (status) {
      // Revoking in another tab should take effect without a reload.
      status.onchange = () => {
        if (status.state === "denied") {
          forgetCameraGrant();
          stopCamera();
          fallbackToPicker(BLOCKED_MSG);
        }
      };
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
    }
  } catch {
    /* Safari: no camera permission descriptor. Use the flag below. */
  }
  try {
    if (localStorage.getItem(LSK.cameraOk) === "1") return "granted";
  } catch {
    /* private mode */
  }
  return "unknown";
}

const BLOCKED_MSG =
  "Camera access is blocked in your browser settings — you can still pick a photo.";

function rememberCameraGrant() {
  try {
    localStorage.setItem(LSK.cameraOk, "1");
  } catch {
    /* private mode — they'll tap once per session */
  }
}

function forgetCameraGrant() {
  try {
    localStorage.removeItem(LSK.cameraOk);
  } catch {
    /* ignore */
  }
}

async function resumeOrPrompt() {
  const perm = await cameraPermission();
  if (perm === "denied") {
    // Don't call getUserMedia just to be refused, and don't leave a stale
    // "they allowed it once" flag behind.
    forgetCameraGrant();
    fallbackToPicker(BLOCKED_MSG);
    return;
  }
  if (perm === "granted") {
    void openCamera();
    return;
  }
  showPermitPanel();
}

/** Ready state: camera not yet open, waiting for the guest to allow it. */
/** Times this panel has been shown in this session — the hint is for people
 *  being asked repeatedly, not for first-timers. */
function bumpPermitCount(): number {
  try {
    const n = Number(sessionStorage.getItem("pc-permit-shown") ?? "0") + 1;
    sessionStorage.setItem("pc-permit-shown", String(n));
    return n;
  } catch {
    return 1;
  }
}

function showPermitPanel() {
  cameraWanted = false;
  toolsEl?.classList.add("hidden");
  stage?.classList.remove("is-live");
  permitPanel?.classList.remove("hidden");
  permitHint?.classList.toggle("hidden", bumpPermitCount() < 2);
  shutter?.classList.add("hidden");
  flipBtn?.classList.add("hidden");
  pickerLabel?.classList.add("hidden");
}

/**
 * Put the sign-in card back on top and release the camera.
 *
 * The close button only appears when there's a confirmed identity to return to
 * — otherwise "Change" would strand the guest at a gate with no way out.
 */
function showGate() {
  stopCamera();
  gate?.classList.remove("hidden");
  gateClose?.classList.toggle("hidden", !personId || !personToken);
  stepTable?.classList.add("hidden");
  stepName?.classList.remove("hidden");
  identityChip?.classList.add("hidden");
  if (nameInput) nameInput.value = "";
  nameSuggestions?.classList.add("hidden");
  nameInput?.focus();
}

// ── Name search ─────────────────────────────────────────────────────────────
let searchTimer: number | undefined;

nameInput?.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  const q = nameInput.value.trim();
  if (q.length < 2) {
    nameSuggestions?.classList.add("hidden");
    return;
  }
  searchTimer = window.setTimeout(() => void search(q), 220);
});

async function search(q: string) {
  if (!nameSuggestions) return;
  try {
    // Seated non-vendor persons only — see api/camera/search.ts.
    const res = await fetch(`/api/camera/search?q=${encodeURIComponent(q)}`);
    const { results } = (await res.json()) as {
      results: { id: string; name: string }[];
    };

    nameSuggestions.innerHTML = "";
    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "cam-suggestions-empty";
      empty.textContent = "No match — check the spelling on your place card.";
      nameSuggestions.append(empty);
    } else {
      for (const r of results) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cam-suggestion";
        const label = document.createElement("span");
        label.textContent = r.name;
        const hint = document.createElement("span");
        hint.className = "cam-suggestion-hint";
        hint.textContent = "Select";
        btn.append(label, hint);
        btn.addEventListener("click", () => openTableStep(r.id, r.name));
        nameSuggestions.append(btn);
      }
    }
    nameSuggestions.classList.remove("hidden");
  } catch {
    nameSuggestions.classList.add("hidden");
  }
}

// ── Table verification ──────────────────────────────────────────────────────
/** Second step of the same card — not a second modal on top of the gate. */
function openTableStep(id: string, name: string) {
  pendingId = id;
  pendingName = name;
  if (pendingNameDisplay) pendingNameDisplay.textContent = name;
  if (tableInput) tableInput.value = "";
  tableError?.classList.add("hidden");
  stepName?.classList.add("hidden");
  stepTable?.classList.remove("hidden");
  tableInput?.focus();
}

function backToNameStep() {
  stepTable?.classList.add("hidden");
  stepName?.classList.remove("hidden");
  pendingId = null;
  nameInput?.focus();
}

tableBack?.addEventListener("click", backToNameStep);

tableBtn?.addEventListener("click", () => void verifyTable());
tableInput?.addEventListener("keydown", (e) => {
  if ((e as KeyboardEvent).key === "Enter") void verifyTable();
});

async function verifyTable() {
  if (!pendingId || !tableBtn) return;
  const tableNumber = tableInput?.value.trim();
  if (!tableNumber) {
    showTableError("Please enter your table number.");
    return;
  }

  tableBtn.disabled = true;
  tableBtn.textContent = "Checking…";
  try {
    const res = await fetch("/api/camera/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: pendingId, tableNumber }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      token?: string;
      error?: string;
    };

    if (!data.ok || !data.token) {
      showTableError(data.error ?? "That didn't match. Try again.");
      return;
    }

    personId = pendingId;
    personToken = data.token;
    guestName = pendingName;
    saveIdentity();
    showCamera();
  } catch {
    showTableError("Connection problem. Try again.");
  } finally {
    tableBtn.disabled = false;
    tableBtn.textContent = "Confirm";
  }
}

function showTableError(msg: string) {
  if (!tableError) return;
  tableError.textContent = msg;
  tableError.classList.remove("hidden");
}

// Tapping your own name reopens the gate — it doesn't sign you out, so closing
// the gate puts you straight back behind the viewfinder. The identity is only
// replaced once a different person clears the table check.
identityChip?.addEventListener("click", showGate);

gateClose?.addEventListener("click", () => {
  if (!personId || !personToken) return; // nothing to go back to
  backToNameStep();
  showCamera();
});

// Escape is free on a desktop and costs nothing on a phone.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (gate?.classList.contains("hidden")) return;
  if (personId && personToken) {
    backToNameStep();
    showCamera();
  }
});

// ── Viewfinder ──────────────────────────────────────────────────────────────
/**
 * Open the live preview. Requires a secure context — on plain http over a LAN
 * IP the browser reports no camera at all, which is why the file-picker
 * fallback exists rather than a dead end.
 */
async function openCamera() {
  // Silent returns here read as "the button is broken". Every path below now
  // changes something on screen.
  if (remaining <= 0) {
    paintCounter(); // shows the finished panel instead of doing nothing
    return;
  }

  // getUserMedia only exists in a secure context. Over plain http on a LAN
  // address navigator.mediaDevices is undefined outright, which is the usual
  // reason "Allow camera" appears to do nothing while testing.
  if (!window.isSecureContext) {
    fallbackToPicker(
      "The camera needs a secure (https) connection — you can still pick a photo.",
    );
    setStatus("Camera needs https on this device", "error");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    fallbackToPicker("This browser can't open the camera here.");
    setStatus("This browser can't open the camera", "error");
    return;
  }

  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1920 } },
      audio: false,
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === "NotAllowedError") {
      // Permission was revoked since we last recorded it — stop auto-retrying
      // on every load, or the guest gets a prompt they can't escape.
      forgetCameraGrant();
    }
    fallbackToPicker(
      name === "NotAllowedError"
        ? BLOCKED_MSG
        : "Couldn't open the camera — you can still pick a photo.",
    );
    // Name the actual failure; "nothing happened" is the worst outcome.
    setStatus(
      name === "NotAllowedError"
        ? "Camera permission was declined"
        : `Camera didn't open (${name ?? "unknown error"})`,
      "error",
    );
    return;
  }

  if (viewfinder) {
    viewfinder.srcObject = stream;
    viewfinder.classList.toggle("is-mirrored", facing === "user");
    try {
      await viewfinder.play();
    } catch {
      /* autoplay policies — the stream still renders once visible */
    }
  }
  cameraWanted = true;
  readCapabilities();
  zoom = 1;
  paintZoom();
  rememberCameraGrant();
  permitPanel?.classList.add("hidden");
  stage?.classList.add("is-live");
  shutter?.classList.remove("hidden");
  pickerLabel?.classList.add("hidden");
  flipBtn?.classList.remove("hidden");
}

function stopCamera() {
  // Leaving the torch on after the stream stops would leave the light burning.
  if (torchOn) void setTorch(false);
  torchOn = false;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (viewfinder) viewfinder.srcObject = null;
  stage?.classList.remove("is-live");
}

/** No live preview available — show the OS picker path instead of nothing. */
function fallbackToPicker(note: string) {
  toolsEl?.classList.add("hidden");
  stage?.classList.remove("is-live");
  permitPanel?.classList.remove("hidden");
  if (permitNote) permitNote.textContent = note;
  shutter?.classList.add("hidden");
  flipBtn?.classList.add("hidden");
  pickerLabel?.classList.remove("hidden");
}

permitBtn?.addEventListener("click", () => void openCamera());

flipBtn?.addEventListener("click", () => {
  facing = facing === "environment" ? "user" : "environment";
  void openCamera();
});

// Release the camera when the tab is hidden — iOS Safari kills a backgrounded
// tab that keeps a live stream, and nobody wants the lens warm all night.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopCamera();
  } else if (
    gate?.classList.contains("hidden") &&
    remaining > 0 &&
    cameraWanted
  ) {
    // Only resume a stream the guest had already allowed.
    void openCamera();
  }
});
window.addEventListener("pagehide", stopCamera);

/**
 * The server refused our token. That happens if the signing secret rotated
 * between deploys, so the stored identity is dead rather than wrong — clear it
 * and send the guest back through the gate instead of failing every shot.
 */
function rejectIdentity() {
  forgetIdentity();
  showGate();
  setStatus("Please confirm your name again", "error");
}

// ── Film counter ────────────────────────────────────────────────────────────
function paintCounter() {
  if (counter) counter.textContent = String(remaining);

  const done = remaining <= 0;
  rollDone?.classList.toggle("hidden", !done);
  // One class hides the bar, stage, tools, controls and toast (see camera.css).
  // Toggling each of them here is how the tool strip ended up showing through.
  cameraView?.classList.toggle("is-finished", done);
  if (done) {
    stopCamera();
    if (doneName) doneName.textContent = guestName.split(" ")[0] || "friend";
  }
}

// Not the same as the pencil beside the name: that keeps you signed in, this
// signs the finished guest out so the next person gets a clean, full roll.
doneSwitch?.addEventListener("click", () => {
  forgetIdentity();
  remaining = Number(cameraView?.dataset.limit ?? 12);
  paintCounter();
  showGate();
});

async function refreshCount() {
  if (!personId || !personToken) return;
  try {
    const res = await fetch(
      `/api/camera/upload?personId=${encodeURIComponent(personId)}&personToken=${encodeURIComponent(personToken)}`,
    );
    if (res.status === 403) return rejectIdentity();
    const data = (await res.json()) as { ok: boolean; remaining?: number };
    if (data.ok && typeof data.remaining === "number") {
      remaining = data.remaining;
      paintCounter();
    }
  } catch {
    /* keep whatever the page rendered with */
  }
}

// ── Capture ─────────────────────────────────────────────────────────────────
/**
 * Grab what the guest can actually see.
 *
 * The viewfinder is `object-fit: cover`, so the visible region is a centre crop
 * of the video — capturing the raw frame would save the edges they never
 * framed. coverSourceRect() works out that region, narrowed by digital zoom.
 * When the camera does the zooming in hardware the stream is already zoomed, so
 * only the cover crop applies.
 */
async function captureFrame(): Promise<Blob | null> {
  if (!viewfinder || !viewfinder.videoWidth) return null;
  const rect = viewfinder.getBoundingClientRect();
  const { sx, sy, sw, sh } = coverSourceRect({
    videoW: viewfinder.videoWidth,
    videoH: viewfinder.videoHeight,
    viewW: rect.width,
    viewH: rect.height,
    zoom: hardwareZoom ? 1 : zoom,
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  frameCanvas.width = Math.round(sw * scale);
  frameCanvas.height = Math.round(sh * scale);

  const ctx = frameCanvas.getContext("2d");
  if (!ctx) return null;

  // The front camera preview is mirrored (.is-mirrored) because an unmirrored
  // selfie feels wrong to everyone — so the capture has to be mirrored too, or
  // the photo comes out flipped from what the guest framed. Reset afterwards:
  // this canvas is reused for every shot, and a leftover transform would flip
  // the next rear-camera photo.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (facing === "user") {
    ctx.translate(frameCanvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    viewfinder,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    frameCanvas.width,
    frameCanvas.height,
  );
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return new Promise<Blob | null>((resolve) =>
    frameCanvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
}

/**
 * Fallback path: shrink a file from the OS picker. Also normalises two
 * phone-specific problems — HEIC becomes JPEG, and EXIF rotation is baked in
 * via `imageOrientation`, so portrait shots don't arrive sideways.
 */
async function shrinkFile(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // unsupported codec — send as-is and let Directus deal with it
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  frameCanvas.width = Math.round(bitmap.width * scale);
  frameCanvas.height = Math.round(bitmap.height * scale);

  const ctx = frameCanvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, frameCanvas.width, frameCanvas.height);
  bitmap.close(); // free the decoded image immediately

  const blob = await new Promise<Blob | null>((resolve) =>
    frameCanvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob ?? file;
}

function flash() {
  if (!flashEl || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  flashEl.classList.remove("is-firing");
  void flashEl.offsetWidth; // restart the animation
  flashEl.classList.add("is-firing");
}

// ── Capabilities ────────────────────────────────────────────────────────────
/**
 * What this camera can actually do. Chrome/Android reports zoom and torch;
 * iOS Safari reports neither, so those controls stay hidden there rather than
 * sitting on screen doing nothing.
 */
function readCapabilities() {
  const track = stream?.getVideoTracks()[0];
  hardwareZoom = null;
  torchCapable = false;
  try {
    const caps = track?.getCapabilities?.() as
      | (MediaTrackCapabilities & {
          zoom?: { min: number; max: number };
          torch?: boolean;
        })
      | undefined;
    if (caps?.zoom && caps.zoom.max > caps.zoom.min) {
      hardwareZoom = { min: caps.zoom.min, max: caps.zoom.max };
    }
    torchCapable = caps?.torch === true;
  } catch {
    /* getCapabilities is optional; treat absence as "can't" */
  }

  // 0.5x is an ultra-wide LENS, not a crop, so it only exists where the camera
  // says it can go below 1. Shown only then — never a pill that does nothing.
  minZoom = hardwareZoom ? Math.max(0.5, Math.min(1, hardwareZoom.min)) : 1;
  for (const b of zoomBtns) {
    if ((Number(b.dataset.zoom) || 1) < 1) {
      b.classList.toggle("hidden", minZoom >= 1);
    }
  }

  // Flash: the torch when the hardware has one, otherwise a white screen — but
  // a white screen only lights a face on the FRONT camera, so on a rear-facing
  // iPhone there's nothing honest to offer and the button stays hidden.
  const screenFlashUseful = facing === "user";
  const canFlash = torchCapable || screenFlashUseful;
  flashBtn?.classList.toggle("hidden", !canFlash);
  // Armed must mean "this will fire". Arming on the front camera and flipping
  // to the rear used to leave it armed behind a hidden button.
  if (!canFlash && flashArmed) {
    flashArmed = false;
    flashBtn?.setAttribute("aria-pressed", "false");
    flashBtn?.classList.remove("is-on");
  }
  toolsEl?.classList.remove("hidden");
}

async function applyHardwareZoom() {
  const track = stream?.getVideoTracks()[0];
  if (!track || !hardwareZoom) return;
  const { min, max } = hardwareZoom;
  // The capability values ARE multipliers, so pass the factor straight through
  // and just clamp it. The old code stretched our 1–4 scale across the device
  // range, which made "2x" mean 4x on a phone that could reach 10x — and made
  // "1x" mean 0.5x on one with an ultra-wide.
  const target = Math.min(max, Math.max(min, zoom));
  try {
    await track.applyConstraints({
      advanced: [{ zoom: target } as MediaTrackConstraintSet],
    });
  } catch {
    // Hardware refused — fall back to cropping so the button still does
    // something.
    hardwareZoom = null;
    paintZoom();
  }
}

function paintZoom() {
  if (viewfinder) {
    // Hardware zoom already changed the stream; scaling again would double it.
    // Without it, never scale below 1 — cropping can't widen a field of view.
    viewfinder.style.transform = hardwareZoom
      ? ""
      : `scale(${Math.max(1, zoom)})`;
  }
  // A pinch lands between the presets, so highlight the nearest one and let it
  // show the real factor — otherwise pinching to 1.7x left both pills looking
  // inactive and the guest with no idea how far they'd zoomed.
  let nearest: HTMLButtonElement | undefined;
  let best = Infinity;
  for (const b of zoomBtns) {
    const v = Number(b.dataset.zoom) || 1;
    const d = Math.abs(v - zoom);
    if (d < best) {
      best = d;
      nearest = b;
    }
  }
  for (const b of zoomBtns) {
    const v = Number(b.dataset.zoom) || 1;
    const on = b === nearest;
    b.classList.toggle("is-on", on);
    const exact = Math.abs(v - zoom) < 0.05;
    b.textContent = on && !exact ? `${zoom.toFixed(1)}×` : `${v}×`;
  }
}

function setZoom(next: number) {
  zoom = Math.min(MAX_ZOOM, Math.max(minZoom, next));
  if (hardwareZoom) void applyHardwareZoom();
  paintZoom();
}

for (const b of zoomBtns) {
  b.addEventListener("click", () => {
    const v = Number(b.dataset.zoom) || 1;
    // Tapping the level you're already on goes back to 1x, so the pill is a
    // toggle rather than a button that sometimes does nothing.
    setZoom(Math.abs(zoom - v) < 0.05 && v !== 1 ? 1 : v);
  });
}

// iOS Safari ignores user-scalable=no and drives pinch through its own gesture
// recogniser, which `touch-action` and pointermove preventDefault don't stop.
// These non-standard gesture* events are the only way to keep a pinch inside
// the viewfinder from zooming the whole page. Scoped to the camera view, so the
// sign-in card can still be pinched like any other page.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  cameraView?.addEventListener(type, (e) => e.preventDefault());
}
// Android/Chrome path: a multi-touch move inside the stage is ours, not the
// browser's. Must be passive: false or preventDefault is ignored.
stage?.addEventListener(
  "touchmove",
  (e) => {
    if ((e as TouchEvent).touches.length > 1) e.preventDefault();
  },
  { passive: false },
);

// Pinch: track two pointers and scale by the change in their distance.
const pointers = new Map<number, { x: number; y: number }>();
let pinchStart = 0;
let pinchZoomStart = 1;
const spread = () => {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
};
stage?.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    pinchStart = spread();
    pinchZoomStart = zoom;
  }
});
stage?.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinchStart > 0) {
    e.preventDefault();
    setZoom(pinchZoomStart * (spread() / pinchStart));
  }
});
const endPointer = (e: PointerEvent) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = 0;
};
stage?.addEventListener("pointerup", endPointer);
stage?.addEventListener("pointercancel", endPointer);

// ── Grid ────────────────────────────────────────────────────────────────────
function paintGrid(on: boolean) {
  gridEl?.classList.toggle("hidden", !on);
  gridBtn?.setAttribute("aria-pressed", String(on));
}
gridBtn?.addEventListener("click", () => {
  const on = gridEl?.classList.contains("hidden") ?? true;
  paintGrid(on);
  try {
    localStorage.setItem(LSK.grid, on ? "1" : "0");
  } catch {
    /* ignore */
  }
});

// ── Flash ───────────────────────────────────────────────────────────────────
// The button ARMS the flash; it doesn't switch a light on. Holding the torch
// lit between shots is a flashlight — it blinds the people you're pointing at,
// eats battery, and gets left on by accident. A flash belongs around the
// shutter and nowhere else.

/** Armed, not lit. Applies to both the torch and the front-camera screen. */
let flashArmed = false;

/** Caps, not delays. applyConstraints resolves when the constraint is ACCEPTED,
 *  not when the LED is on — the camera HAL queues it and the light follows
 *  300–600ms later on Android. Waiting a fixed guess meant grabbing the frame
 *  while the lamp was still dark, so the flash appeared to happen after the
 *  photo. These bound the waiting; the signals below end it. */
const TORCH_WAIT_CAP_MS = 900;
const EXPOSURE_FRAMES = 3;
const EXPOSURE_CAP_MS = 150;
const SCREEN_FLASH_MS = 350;

async function setTorch(on: boolean) {
  const track = stream?.getVideoTracks()[0];
  if (!track || !torchCapable) return;
  try {
    await track.applyConstraints({
      advanced: [{ torch: on } as MediaTrackConstraintSet],
    });
    torchOn = on;
  } catch {
    torchOn = false;
  }
}

flashBtn?.addEventListener("click", () => {
  flashArmed = !flashArmed;
  flashBtn.setAttribute("aria-pressed", String(flashArmed));
  flashBtn.classList.toggle("is-on", flashArmed);
});

/**
 * Fire the flash for this one shot: the LED where there is one, otherwise a
 * white screen, which only lights a face on the front camera. Resolves once
 * there's enough light to take the picture.
 */
/** Resolves once the device reports the torch actually lit, or the cap expires. */
async function torchLit(): Promise<void> {
  const track = stream?.getVideoTracks()[0];
  if (!track?.getSettings) return;
  const deadline = Date.now() + TORCH_WAIT_CAP_MS;
  while (Date.now() < deadline) {
    const on = (track.getSettings() as MediaTrackSettings & { torch?: boolean })
      .torch;
    if (on === true) return;
    if (on === undefined) return; // device never reports it; don't stall here
    await new Promise((r) => window.setTimeout(r, 50));
  }
}

/**
 * Wait for frames that were actually exposed with the light on. Even once the
 * LED reports lit, auto-exposure needs a few frames to adapt, or the photo
 * comes out as dark as one taken without any flash at all.
 */
function exposedFrames(): Promise<void> {
  const v = viewfinder as
    | (HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      })
    | null;
  if (!v?.requestVideoFrameCallback) {
    return new Promise((r) => window.setTimeout(r, EXPOSURE_CAP_MS));
  }
  return new Promise((resolve) => {
    let left = EXPOSURE_FRAMES;
    const bail = window.setTimeout(resolve, EXPOSURE_CAP_MS * 3); // never hang
    const step = () => {
      if (--left <= 0) {
        window.clearTimeout(bail);
        resolve();
      } else {
        v.requestVideoFrameCallback!(step);
      }
    };
    v.requestVideoFrameCallback!(step);
  });
}

async function fireFlash(): Promise<boolean> {
  if (!flashArmed) return false;

  if (torchCapable) {
    await setTorch(true);
    await torchLit(); // the LED is on per the device, not per our guess
    await exposedFrames(); // ...and the sensor has seen it
    return true;
  }

  if (facing === "user" && flashEl) {
    // The page can't touch screen brightness — no browser exposes it — so the
    // most light we can give a selfie is every pixel white, with nothing dark
    // sitting on top of it.
    cameraView?.classList.add("is-flashing");
    await new Promise<void>((resolve) => {
      flashEl.classList.add("is-holding");
      window.setTimeout(resolve, SCREEN_FLASH_MS);
    });
    return true;
  }
  return false;
}

/** Always called after the frame is grabbed, including on failure. */
function endFlash() {
  flashEl?.classList.remove("is-holding");
  cameraView?.classList.remove("is-flashing");
  // Not awaited: switching the LED off is another queued constraint, and the
  // review sheet shouldn't wait on the lamp. Light lingering a moment after the
  // photo is fine; light arriving then is not.
  if (torchOn) void setTorch(false);
}

// ── Self-timer ──────────────────────────────────────────────────────────────
function paintTimer() {
  if (timerLabel) {
    timerLabel.textContent = timerSeconds ? `${timerSeconds}s` : "";
    timerLabel.classList.toggle("hidden", timerSeconds === 0);
  }
  timerBtn?.classList.toggle("is-on", timerSeconds > 0);
}
timerBtn?.addEventListener("click", () => {
  const i = TIMER_STEPS.indexOf(timerSeconds);
  timerSeconds = TIMER_STEPS[(i + 1) % TIMER_STEPS.length] ?? 0;
  paintTimer();
});

function cancelCountdown() {
  window.clearInterval(countdownTimer);
  countdownTimer = undefined;
  countdownEl?.classList.add("hidden");
}
countdownEl?.addEventListener("click", () => {
  cancelCountdown();
  setStatus("Timer cancelled", "info");
});

/** Resolves when the countdown finishes; rejects nothing — a cancel just never
 *  resolves, and the shutter is re-enabled by the caller. */
function runCountdown(): Promise<boolean> {
  if (!timerSeconds || !countdownEl) return Promise.resolve(true);
  return new Promise((resolve) => {
    let left = timerSeconds;
    countdownEl.textContent = String(left);
    countdownEl.classList.remove("hidden");
    countdownTimer = window.setInterval(() => {
      left -= 1;
      if (!countdownTimer) return resolve(false); // cancelled
      if (left <= 0) {
        cancelCountdown();
        resolve(true);
      } else {
        countdownEl.textContent = String(left);
      }
    }, 1000);
  });
}

shutter?.addEventListener("click", () => {
  if (busy || pendingShot || countdownTimer) return;
  void takeShot();
});

/** Countdown (if armed) → screen flash (if armed) → capture. */
async function takeShot() {
  if (shutter) shutter.disabled = true;
  try {
    if (!(await runCountdown())) return; // cancelled

    // Light first, grab while it's lit, then dim — a flash, not a blink after
    // the fact. The decorative shutter blink is skipped when a real flash
    // fired: is-firing animates opacity to 0, and a CSS animation overrides
    // is-holding's opacity: 1, so it used to black out the screen flash in the
    // instant before the frame was grabbed.
    const fired = await fireFlash();
    if (!fired) flash();
    const blob = await captureFrame();
    endFlash(); // light goes out only once the frame is in hand
    if (blob) openSheet(blob);
    else setStatus("That didn't catch — try once more", "error");
  } finally {
    endFlash(); // the LED must never outlive the shot, even on an error
    if (shutter) shutter.disabled = remaining <= 0 || !!pendingShot;
  }
}

pickerInput?.addEventListener("change", () => {
  const file = pickerInput.files?.[0];
  pickerInput.value = ""; // so the same photo can be picked twice
  if (file) void shrinkFile(file).then(openSheet);
});

/** The shot as a File, for the OS share sheet. Built lazily — most shots are
 *  never shared, and the blob is already in memory either way. */
function pendingShotFile(): File | null {
  if (!pendingShot) return null;
  return new File([pendingShot], "rollcall.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Share the shot to whatever the phone offers — a story, Messages, the camera
 * roll. Deliberately does NOT send or discard: the guest still chooses after.
 *
 * The point is that Roll Call shouldn't compete with the native camera. A
 * guest who wants a photo for themselves can have one without taking it
 * outside the album.
 */
async function shareShot() {
  const file = pendingShotFile();
  if (!file || !navigator.canShare?.({ files: [file] })) return;
  try {
    await navigator.share({ files: [file] });
  } catch {
    // AbortError when they back out of the share sheet — not worth a toast.
  }
}
sheetShare?.addEventListener("click", () => void shareShot());

/** Hold the shot, show it, ask for a caption. Nothing is uploaded yet. */
function openSheet(blob: Blob) {
  pendingShot = blob;
  // Exactly one object URL alive at a time, revoked in closeSheet — the same
  // discipline the homepage hero needs to stay alive on iOS Safari.
  if (sheetPreview) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    sheetPreview.src = previewUrl;
  }
  if (captionInput) captionInput.value = "";
  paintCaptionCount();
  // Feature-detected per shot: canShare() needs the actual file, and a phone
  // that can't share one should never be shown the button.
  const file = pendingShotFile();
  sheetShare?.classList.toggle(
    "hidden",
    !file || !navigator.canShare?.({ files: [file] }),
  );
  clearStatus();
  sheet?.classList.remove("hidden");
  if (shutter) shutter.disabled = true;
}

function closeSheet() {
  pendingShot = null;
  sheet?.classList.add("hidden");
  if (sheetPreview) sheetPreview.removeAttribute("src");
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  if (captionInput) captionInput.value = "";
  if (shutter) shutter.disabled = remaining <= 0;
}

sheetSend?.addEventListener("click", () => {
  if (!pendingShot) return;
  const blob = pendingShot;
  const caption = captionInput?.value.trim() || "";
  closeSheet();
  void send(blob, caption);
});

// Discarding costs nothing: the shot was never uploaded, so the count on the
// server is untouched and the roll is unaffected.
sheetDiscard?.addEventListener("click", () => {
  closeSheet();
  // Discarding *feels* like it should cost a shot; it doesn't, because the
  // count comes from the server and nothing was uploaded. Say so.
  setStatus("Gone. No shot used.", "info");
});

// Enter now writes a newline, as it should in a textarea; ⌘/Ctrl+Enter sends
// for anyone on a keyboard.
captionInput?.addEventListener("keydown", (e) => {
  const ev = e as KeyboardEvent;
  if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
    ev.preventDefault();
    sheetSend?.click();
  }
});

/** Characters left, turning warm near the end. maxlength already stops typing;
 *  this just makes the ceiling visible instead of silent. */
function paintCaptionCount() {
  if (!captionCount) return;
  const left = CAPTION_MAX - (captionInput?.value.length ?? 0);
  captionCount.textContent = String(left);
  captionCount.dataset.low = String(left <= 20);
}
captionInput?.addEventListener("input", paintCaptionCount);

async function send(blob: Blob, caption: string) {
  if (busy || !personId || !personToken) return;
  busy = true;
  setStatus("Sending your shot…", "working");
  shutter?.classList.add("is-busy");
  if (shutter) shutter.disabled = true;

  try {
    const form = new FormData();
    form.append("file", blob, "partycam.jpg");
    form.append("personId", personId);
    form.append("personToken", personToken);
    if (guestName) form.append("name", guestName);
    if (caption) form.append("caption", caption);

    const res = await fetch("/api/camera/upload", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      ok: boolean;
      remaining?: number;
      error?: string;
    };

    if (res.status === 403) return rejectIdentity();
    if (typeof data.remaining === "number") remaining = data.remaining;

    if (!data.ok) {
      setStatus(data.error ?? "That didn't send. Try again.", "error");
    } else {
      // The count is the only thing a guest really wants back, and the small
      // [11] box is easy to miss mid-party — so say it in words.
      setStatus(
        remaining > 0
          ? `Thank you! ${remaining} shot${remaining === 1 ? "" : "s"} left`
          : "That's your last — thank you 💛",
        "ok",
      );
    }
    paintCounter();
  } catch {
    // The shot isn't spent — the count comes from the server, so a failed
    // upload simply never happened.
    setStatus("That didn't send — try once more", "error");
  } finally {
    busy = false;
    shutter?.classList.remove("is-busy");
    if (shutter) shutter.disabled = remaining <= 0;
  }
}

let statusTimer: number | undefined;
let statusFade: number | undefined;

/** Take the toast down with a fade, so it reads as dismissed rather than
 *  blinking out of existence. */
function clearStatus() {
  if (!status) return;
  window.clearTimeout(statusTimer);
  window.clearTimeout(statusFade);
  if (status.classList.contains("hidden")) return;
  status.classList.add("is-leaving");
  statusFade = window.setTimeout(() => {
    status.classList.add("hidden");
    status.classList.remove("is-leaving");
  }, 260);
}

/**
 * Toast. Everything dismisses — "working" just gets a long leash because an
 * upload is genuinely in flight, and a stuck pill over the picture is worse
 * than a stale one.
 */
function setStatus(msg: string, kind: "ok" | "error" | "working" | "info") {
  if (!status) return;
  window.clearTimeout(statusTimer);
  window.clearTimeout(statusFade);
  status.textContent = msg;
  status.dataset.kind = kind;
  status.classList.remove("hidden", "is-leaving");

  const life = kind === "working" ? 12000 : kind === "error" ? 6000 : 3500;
  statusTimer = window.setTimeout(clearStatus, life);
}

// ── Boot ────────────────────────────────────────────────────────────────────
// Desktop never wires anything up: no listeners, no counter fetch, and above
// all no getUserMedia, so a laptop is never even asked for camera permission.
if (document.documentElement.dataset.device === "handheld") {
  try {
    paintGrid(localStorage.getItem(LSK.grid) === "1");
  } catch {
    /* private mode — the grid just starts off */
  }
  paintTimer();
  paintZoom();

  if (restoreIdentity()) showCamera();
  else showGate();
  paintCounter();
}
