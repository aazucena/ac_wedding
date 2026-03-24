// Persist name as guest types
nameInput.addEventListener('input', persist);

// ── Square grid ──────────────────────────────────────────
document.querySelectorAll('.sq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!btn.disabled) openModal(btn.dataset.n);
  });
});

// ── Modal open/close ─────────────────────────────────────
function openModal(n) {
  currentN = n;
  pendingFile = null;
  modalTitle.textContent = 'Square ' + n;
  modalFile.value = '';
  var savedURL = squareDataURLs.get(n);
  if (savedURL) {
    modalPreview.src = savedURL;
    modalPreview.classList.remove('hidden');
    modalReplaceHint.classList.remove('hidden');
    modalPh.classList.add('hidden');
    modalConfirm.disabled = true;
    modalConfirmLabel.textContent = 'Replace Photo';
  } else {
    modalPreview.src = '';
    modalPreview.classList.add('hidden');
    modalReplaceHint.classList.add('hidden');
    modalPh.classList.remove('hidden');
    modalConfirm.disabled = true;
    modalConfirmLabel.textContent = 'Add Photo';
  }
  if (modalMetaTitle) modalMetaTitle.value = squareTitles.get(n) ?? '';
  if (modalMetaDesc)  modalMetaDesc.value  = squareDescs.get(n)  ?? '';
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  currentN = null;
  pendingFile = null;
}

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// ── File selection inside modal ──────────────────────────
modalDrop.addEventListener('click', () => modalFile.click());
modalFile.addEventListener('change', () => {
  var file = modalFile.files && modalFile.files[0];
  if (!file) return;
  pendingFile = file;
  modalPreview.src = URL.createObjectURL(file);
  modalPreview.classList.remove('hidden');
  modalReplaceHint.classList.remove('hidden');
  modalPh.classList.add('hidden');
  modalConfirm.disabled = false;
});

// ── Confirm photo modal ───────────────────────────────────
modalConfirm.addEventListener('click', () => {
  if (!currentN) return;
  if (pendingFile) {
    var n = currentN;
    squareFiles.set(n, pendingFile);
    squareTitles.set(n, modalMetaTitle ? modalMetaTitle.value.trim() : '');
    squareDescs.set(n,  modalMetaDesc  ? modalMetaDesc.value.trim()  : '');
    document.querySelector('.sq-btn[data-n="' + n + '"]').classList.add('done');
    syncSubmitBtn();
    var reader = new FileReader();
    reader.onload = (e) => { squareDataURLs.set(n, e.target.result); persist(); };
    reader.readAsDataURL(pendingFile);
  }
  closeModal();
});

// ── Submit button state ──────────────────────────────────
function syncSubmitBtn() {
  var count = squareFiles.size;
  submitBtn.disabled = count === 0;
  submitLabel.textContent = count === 0
    ? 'Tap a square to get started'
    : count === 1 ? 'Submit 1 Photo' : 'Submit ' + count + ' Photos';
}

// ── Form submit — show confirmation first ────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();
  var name = nameInput.value.trim();
  if (!name) { showError('Please enter your name before submitting.'); nameInput.focus(); return; }
  if (squareFiles.size === 0) { showError('Please upload at least one photo.'); return; }
  var entries = [...squareFiles.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  var count = entries.length;
  confirmDesc.textContent = 'You\'re about to send ' + count + ' photo' + (count !== 1 ? 's' : '') + ' for:';
  while (confirmSquares.firstChild) confirmSquares.removeChild(confirmSquares.firstChild);
  entries.forEach(([n]) => {
    var badge = document.createElement('span');
    badge.className = 'confirm-badge';
    badge.textContent = 'Square ' + n;
    confirmSquares.appendChild(badge);
  });
  hideError();
  confirmModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

// ── Confirmed — do the actual upload ─────────────────────
confirmOk.addEventListener('click', async () => {
  confirmModal.classList.add('hidden');
  document.body.style.overflow = '';
  var name = nameInput.value.trim();
  var entries = [...squareFiles.entries()];
  setLoading(true);
  // Upload 3 at a time — avoids spiking Directus with 10+ concurrent multipart requests
  var results = [];
  for (var i = 0; i < entries.length; i += 3) {
    var batch = entries.slice(i, i + 3).map(([n, blob]) => {
      var data = new FormData();
      data.append('file', blob, blob.name ?? 'proof.jpg');
      data.append('name', name);
      data.append('prompt', n);
      if (confirmedGuestId) data.append('guestId',    confirmedGuestId);
      if (confirmedToken)   data.append('guestToken', confirmedToken);
      var t = squareTitles.get(n); if (t) data.append('title', t);
      var d = squareDescs.get(n);  if (d) data.append('memo',  d);
      return fetch('/api/game/upload', { method: 'POST', body: data }).then(r => r.json());
    });
    var batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  setLoading(false);
  var succeeded = entries.filter((_, i) => results[i].status === 'fulfilled' && results[i].value?.ok).map(([n]) => n);
  var failed    = entries.length - succeeded.length;
  if (succeeded.length > 0) markSubmitted(succeeded);
  if (failed === 0) {
    clearStorage();
    var count = succeeded.length;
    document.getElementById('success-count').textContent =
      count === 1 ? 'Your photo has been received!' : 'All ' + count + ' photos have been received!';
    formCard.classList.add('hidden');
    successPanel.classList.remove('hidden');
  } else if (succeeded.length > 0) {
    showError(failed + ' of ' + entries.length + ' photos failed. The rest were saved. Please retry the remaining squares.');
  } else {
    showError('Upload failed. Please check your connection and try again.');
  }
});

function setLoading(on) {
  submitBtn.disabled = on;
  if (on) submitLabel.textContent = 'Uploading…';
  else syncSubmitBtn();
}

function showError(msg) {
  errorText.textContent = msg;
  errorText.classList.remove('hidden');
}

function hideError() { errorText.classList.add('hidden'); }

function resetForm() {
  form.reset();
  squareFiles.clear();
  squareDataURLs.clear();
  squareTitles.clear();
  squareDescs.clear();
  clearStorage();
  document.querySelectorAll('.sq-btn.done').forEach(b => b.classList.remove('done'));
  hideError();
  restoreIdentity();
  syncSubmitBtn();
  formCard.classList.remove('hidden');
  successPanel.classList.add('hidden');
}
window.resetForm = resetForm;

// ── Restore on load ──────────────────────────────────────
restore();
