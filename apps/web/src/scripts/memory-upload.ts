const openBtn = document.getElementById("mu-open") as HTMLButtonElement | null;
const cta = document.getElementById("mu-cta") as HTMLElement | null;
const expand = document.getElementById("mu-expand") as HTMLElement | null;
const form = document.getElementById("mu-form") as HTMLFormElement | null;
const fileInput = document.getElementById("mu-file") as HTMLInputElement | null;
const drop = document.getElementById("mu-drop") as HTMLElement | null;
const dropPh = document.getElementById("mu-drop-ph") as HTMLElement | null;
const dropPrev = document.getElementById(
  "mu-drop-preview",
) as HTMLElement | null;
const previewImg = document.getElementById(
  "mu-preview-img",
) as HTMLImageElement | null;
const removeBtn = document.getElementById(
  "mu-remove",
) as HTMLButtonElement | null;
const nameInput = document.getElementById("mu-name") as HTMLInputElement | null;
const suggestionsEl = document.getElementById("mu-suggestions");
const tableField = document.getElementById("mu-table-field");
const tableInput = document.getElementById(
  "mu-table",
) as HTMLInputElement | null;

const captionInput = document.getElementById(
  "mu-caption",
) as HTMLInputElement | null;
const errorEl = document.getElementById("mu-error") as HTMLElement | null;
const submitBtn = document.getElementById(
  "mu-submit",
) as HTMLButtonElement | null;
const cancelBtn = document.getElementById(
  "mu-cancel",
) as HTMLButtonElement | null;
const successEl = document.getElementById("mu-success") as HTMLElement | null;
const anotherBtn = document.getElementById(
  "mu-another",
) as HTMLButtonElement | null;
const doneBtn = document.getElementById("mu-done") as HTMLButtonElement | null;
const successThumb = document.getElementById(
  "mu-success-thumb",
) as HTMLImageElement | null;
const successTitle = document.getElementById("mu-success-title");
const successCaption = document.getElementById("mu-success-caption");
const successCount = document.getElementById("mu-success-count");

/** Chosen person, and the HMAC the server issues once the table matches. */
let personId: string | null = null;
let personToken: string | null = null;
/** How many this guest has added since opening the form. */
let uploadCount = 0;
/** Object URL behind the success thumbnail; revoked when replaced. */
let successThumbUrl: string | null = null;

if (!openBtn || !cta || !expand || !form || !fileInput || !drop) {
  throw new Error("MemoryUpload: required elements missing");
}

let selectedFile: File | null = null;

// ── Open / close ─────────────────────────────────────────
function openForm() {
  cta!.hidden = true;
  expand!.hidden = false;
  drop?.focus();
}

function closeForm() {
  expand!.hidden = false;
  resetForm();
  cta!.hidden = false;
  expand!.hidden = true;
}

openBtn.addEventListener("click", openForm);
cancelBtn?.addEventListener("click", closeForm);

// ── File selection ────────────────────────────────────────
function showPreview(file: File) {
  selectedFile = file;
  const url = URL.createObjectURL(file);
  if (previewImg) {
    previewImg.src = url;
    previewImg.alt = file.name;
  }
  if (dropPh) dropPh.hidden = true;
  if (dropPrev) dropPrev.hidden = false;
  drop?.classList.add("has-file");
}

function clearFile() {
  if (previewImg?.src) URL.revokeObjectURL(previewImg.src);
  selectedFile = null;
  fileInput!.value = "";
  if (previewImg) previewImg.src = "";
  if (dropPh) dropPh.hidden = false;
  if (dropPrev) dropPrev.hidden = true;
  drop?.classList.remove("has-file");
}

drop.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("#mu-remove")) return;
  fileInput.click();
});
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) showPreview(file);
});

removeBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});

drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("drag-over");
});
drop.addEventListener("dragleave", () => {
  drop.classList.remove("drag-over");
});
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith("image/")) {
    showPreview(file);
  } else if (file) {
    showError("Only image files are accepted.");
  }
});

// ── Error / loading helpers ───────────────────────────────
function showError(msg: string) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function clearError() {
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.hidden = true;
}

function setLoading(on: boolean) {
  if (!submitBtn) return;
  submitBtn.disabled = on;
  submitBtn.classList.toggle("loading", on);
}

// ── Reset ────────────────────────────────────────────────
/**
 * Clear the photo and caption, but keep who the guest is.
 *
 * "Add another" used to run the full reset, which meant searching your name
 * and re-entering your table number for every single photo — the one thing
 * guaranteed to stop someone at two.
 */
function resetForPhoto() {
  clearFile();
  clearError();
  setLoading(false);
  if (captionInput) captionInput.value = "";
  if (successEl) successEl.hidden = true;
  if (form) form.hidden = false;
}

/** Full reset, including identity — for closing the form entirely. */
function resetForm() {
  resetForPhoto();
  personId = null;
  personToken = null;
  uploadCount = 0;
  if (nameInput) nameInput.value = "";
  if (tableInput) tableInput.value = "";
  if (tableField) tableField.hidden = true;
  if (suggestionsEl) suggestionsEl.hidden = true;
}

// ── Who's uploading ───────────────────────────────────────
// Same two steps as the camera gate: find the name, then prove it with the
// table number from the place card.
let searchTimer: number | undefined;

nameInput?.addEventListener("input", () => {
  // Typing again invalidates a previous confirmation.
  personId = null;
  personToken = null;
  if (tableField) tableField.hidden = true;

  window.clearTimeout(searchTimer);
  const q = nameInput.value.trim();
  if (q.length < 2) {
    if (suggestionsEl) suggestionsEl.hidden = true;
    return;
  }
  searchTimer = window.setTimeout(() => void searchNames(q), 220);
});

async function searchNames(q: string) {
  if (!suggestionsEl) return;
  try {
    const res = await fetch(`/api/camera/search?q=${encodeURIComponent(q)}`);
    const { results } = (await res.json()) as {
      results: { id: string; name: string }[];
    };

    suggestionsEl.innerHTML = "";
    if (!results.length) {
      const empty = document.createElement("p");
      empty.className = "mu-suggestion-empty";
      empty.textContent = "No match — check the spelling on your place card.";
      suggestionsEl.append(empty);
    } else {
      for (const r of results) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mu-suggestion";
        btn.textContent = r.name;
        btn.addEventListener("click", () => pickPerson(r.id, r.name));
        suggestionsEl.append(btn);
      }
    }
    suggestionsEl.hidden = false;
  } catch {
    suggestionsEl.hidden = true;
  }
}

function pickPerson(id: string, name: string) {
  personId = id;
  personToken = null; // not proven until the table number matches
  if (nameInput) nameInput.value = name;
  if (suggestionsEl) suggestionsEl.hidden = true;
  if (tableField) tableField.hidden = false;
  tableInput?.focus();
}

/** Exchange the table number for an upload token. */
async function confirmTable(): Promise<boolean> {
  if (!personId) return false;
  const tableNumber = tableInput?.value.trim();
  if (!tableNumber) {
    showError("Please enter your table number.");
    tableInput?.focus();
    return false;
  }
  try {
    const res = await fetch("/api/camera/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, tableNumber }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      token?: string;
      error?: string;
    };
    if (!data.ok || !data.token) {
      showError(data.error ?? "That didn't match. Check your place card.");
      return false;
    }
    personToken = data.token;
    return true;
  } catch {
    showError("Connection problem. Please try again.");
    return false;
  }
}

// ── Submit ────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const caption = captionInput?.value.trim() || null;

  if (!selectedFile) {
    showError("Please select a photo.");
    return;
  }
  if (!personId) {
    showError("Please find your name in the list first.");
    nameInput?.focus();
    return;
  }
  if (selectedFile.size > 10 * 1024 * 1024) {
    showError("Photo is too large. Maximum size is 10 MB.");
    return;
  }

  setLoading(true);

  // Verify the table number on submit, so the guest fills the form once.
  if (!personToken && !(await confirmTable())) {
    setLoading(false);
    return;
  }

  const fd = new FormData();
  fd.append("file", selectedFile);
  fd.append("personId", personId);
  fd.append("personToken", personToken ?? "");
  if (caption) fd.append("caption", caption);
  try {
    const res = await fetch("/api/photo/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { success?: boolean; error?: string };

    if (!res.ok || !data.success) {
      showError(data.error ?? "Upload failed. Please try again.");
      return;
    }

    showSuccess(selectedFile, caption);
  } catch {
    showError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});

// ── Success ───────────────────────────────────────────────
/** First name only — "Thank you, Maria" reads better than the full name. */
function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

function showSuccess(file: File, caption: string | null) {
  uploadCount += 1;

  // Show the photo back. A fresh object URL, because clearFile() revokes the
  // one the form preview was using.
  if (successThumb) {
    if (successThumbUrl) URL.revokeObjectURL(successThumbUrl);
    successThumbUrl = URL.createObjectURL(file);
    successThumb.src = successThumbUrl;
  }

  // The guest verified their name to get here, so use it.
  const first = firstNameOf(nameInput?.value ?? "");
  if (successTitle)
    successTitle.textContent = first
      ? `Thank you, ${first} 💛`
      : "Thank you 💛";

  if (successCaption) {
    successCaption.textContent = caption ? `“${caption}”` : "";
    successCaption.hidden = !caption;
  }

  if (successCount) {
    successCount.textContent =
      uploadCount > 1 ? `That's ${uploadCount} photos from you so far.` : "";
    successCount.hidden = uploadCount < 2;
  }

  if (form) form.hidden = true;
  if (successEl) successEl.hidden = false;
}

// ── Add another / done ────────────────────────────────────
anotherBtn?.addEventListener("click", () => {
  resetForPhoto();
  drop?.focus();
});

doneBtn?.addEventListener("click", closeForm);
