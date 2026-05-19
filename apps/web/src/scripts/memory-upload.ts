const openBtn    = document.getElementById('mu-open')         as HTMLButtonElement   | null;
const cta        = document.getElementById('mu-cta')          as HTMLElement         | null;
const expand     = document.getElementById('mu-expand')       as HTMLElement         | null;
const form       = document.getElementById('mu-form')         as HTMLFormElement     | null;
const fileInput  = document.getElementById('mu-file')         as HTMLInputElement    | null;
const drop       = document.getElementById('mu-drop')         as HTMLElement         | null;
const dropPh     = document.getElementById('mu-drop-ph')      as HTMLElement         | null;
const dropPrev   = document.getElementById('mu-drop-preview') as HTMLElement         | null;
const previewImg = document.getElementById('mu-preview-img')  as HTMLImageElement    | null;
const removeBtn  = document.getElementById('mu-remove')       as HTMLButtonElement   | null;
const tokenInput = document.getElementById('mu-token')        as HTMLInputElement    | null;
const captionInput=document.getElementById('mu-caption')      as HTMLInputElement    | null;
const errorEl    = document.getElementById('mu-error')        as HTMLElement         | null;
const submitBtn  = document.getElementById('mu-submit')       as HTMLButtonElement   | null;
const cancelBtn  = document.getElementById('mu-cancel')       as HTMLButtonElement   | null;
const successEl  = document.getElementById('mu-success')      as HTMLElement         | null;
const anotherBtn = document.getElementById('mu-another')      as HTMLButtonElement   | null;

if (!openBtn || !cta || !expand || !form || !fileInput || !drop) {
  throw new Error('MemoryUpload: required elements missing');
}

let selectedFile: File | null = null;

// ── Open / close ─────────────────────────────────────────
function openForm() {
  cta!.hidden    = true;
  expand!.hidden = false;
  drop?.focus();
}

function closeForm() {
  expand!.hidden = false;
  resetForm();
  cta!.hidden    = false;
  expand!.hidden = true;
}

openBtn.addEventListener('click', openForm);
cancelBtn?.addEventListener('click', closeForm);

// ── File selection ────────────────────────────────────────
function showPreview(file: File) {
  selectedFile = file;
  const url = URL.createObjectURL(file);
  if (previewImg) { previewImg.src = url; previewImg.alt = file.name; }
  if (dropPh)     dropPh.hidden    = true;
  if (dropPrev)   dropPrev.hidden  = false;
  drop?.classList.add('has-file');
}

function clearFile() {
  if (previewImg?.src) URL.revokeObjectURL(previewImg.src);
  selectedFile       = null;
  fileInput!.value   = '';
  if (previewImg)  previewImg.src  = '';
  if (dropPh)      dropPh.hidden   = false;
  if (dropPrev)    dropPrev.hidden = true;
  drop?.classList.remove('has-file');
}

drop.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('#mu-remove')) return;
  fileInput.click();
});
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) showPreview(file);
});

removeBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });

drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag-over'); });
drop.addEventListener('dragleave', ()   => { drop.classList.remove('drag-over'); });
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    showPreview(file);
  } else if (file) {
    showError('Only image files are accepted.');
  }
});

// ── Error / loading helpers ───────────────────────────────
function showError(msg: string) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.hidden      = false;
}

function clearError() {
  if (!errorEl) return;
  errorEl.textContent = '';
  errorEl.hidden      = true;
}

function setLoading(on: boolean) {
  if (!submitBtn) return;
  submitBtn.disabled = on;
  submitBtn.classList.toggle('loading', on);
}

// ── Reset ────────────────────────────────────────────────
function resetForm() {
  clearFile();
  clearError();
  setLoading(false);
  if (captionInput) captionInput.value = '';
  if (successEl)    successEl.hidden   = true;
  if (form)         form.hidden        = false;
}

// ── Submit ────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const token   = tokenInput?.value.trim() ?? '';
  const caption = captionInput?.value.trim() || null;

  if (!selectedFile)  { showError('Please select a photo.');          return; }
  if (!token)         { showError('Please enter your invitation code.'); tokenInput?.focus(); return; }
  if (selectedFile.size > 10 * 1024 * 1024) {
    showError('Photo is too large. Maximum size is 10 MB.'); return;
  }

  const fd = new FormData();
  fd.append('file',  selectedFile);
  fd.append('token', token);
  if (caption) fd.append('caption', caption);

  setLoading(true);
  try {
    const res  = await fetch('/api/photo/upload', { method: 'POST', body: fd });
    const data = await res.json() as { success?: boolean; error?: string };

    if (!res.ok || !data.success) {
      showError(data.error ?? 'Upload failed. Please try again.');
      return;
    }

    form.hidden         = true;
    if (successEl) successEl.hidden = false;

  } catch {
    showError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

// ── Upload another ────────────────────────────────────────
anotherBtn?.addEventListener('click', () => {
  resetForm();
});
