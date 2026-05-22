var nameInput = document.getElementById("name-input");
var nameSuggestions = document.getElementById("name-suggestions");
var form = document.getElementById("upload-form");
var submitBtn = document.getElementById("submit-btn");
var submitLabel = document.getElementById("submit-label");
var errorText = document.getElementById("error-text");
var formCard = document.getElementById("form-card");
var successPanel = document.getElementById("success-panel");

// Modal elements
var modal = document.getElementById("upload-modal");
var modalTitle = document.getElementById("modal-title");
var modalDrop = document.getElementById("modal-drop");
var modalFile = document.getElementById("modal-file");
var modalPh = document.getElementById("modal-ph");
var modalPreview = document.getElementById("modal-preview");
var modalReplaceHint = document.getElementById("modal-replace-hint");
var modalClose = document.getElementById("modal-close");
var modalCancel = document.getElementById("modal-cancel");
var modalConfirm = document.getElementById("modal-confirm");
var modalConfirmLabel = document.getElementById("modal-confirm-label");
var modalMetaTitle = document.getElementById("modal-caption");
var modalMetaDesc = document.getElementById("modal-memo");

// ── Identity modal (RSVP-linked guests — pre-authenticated server-side) ──────
var identityModal = document.getElementById("identity-modal");
var nameConfirmed = document.getElementById("name-confirmed");
var nameConfirmedTxt = document.getElementById("name-confirmed-text");
var nameChangeBtn = document.getElementById("name-change-btn");

// ── Table verification UI (search-identified guests) ─────────────────────────
var tableVerify = document.getElementById("table-verify");
var pendingNameDisplay = document.getElementById("pending-name-display");
var tableNumberInput = document.getElementById("table-number-input");
var tableVerifyBtn = document.getElementById("table-verify-btn");
var tableVerifyCancel = document.getElementById("table-verify-cancel");
var tableVerifyError = document.getElementById("table-verify-error");

// ── State ─────────────────────────────────────────────────────────────────────
var squareFiles = new Map();
var squareDataURLs = new Map();
var squareTitles = new Map();
var squareDescs = new Map();
var submittedSquares = new Set();
var currentN = null;
var pendingFile = null;
var confirmedGuestId = null;
var confirmedToken = null;
var pendingGuest = null; // { id, name } — set while waiting for table verification

// ── Identity confirmation (final step — called after token is in hand) ────────
function confirmIdentity(name, guestId, token) {
  nameInput.value = name;
  confirmedGuestId = guestId || null;
  confirmedToken = token || null;
  pendingGuest = null;
  hideTableVerify();
  if (nameConfirmed) {
    nameConfirmedTxt.textContent = name;
    nameConfirmed.classList.remove("hidden");
    nameInput.classList.add("hidden");
  }
  if (identityModal) {
    identityModal.classList.add("hidden");
    document.body.style.overflow = "";
  }
  persist();
  saveIdentity();
  loadDoneSquares();
}

// ── Identity modal — RSVP guests have token baked in server-side ──────────────
if (identityModal) {
  identityModal.querySelectorAll(".identity-btn[data-name]").forEach((btn) => {
    btn.addEventListener("click", () =>
      confirmIdentity(
        btn.dataset.name,
        btn.dataset.id,
        btn.dataset.token || null,
      ),
    );
  });
  var otherBtn = document.getElementById("identity-other-btn");
  if (otherBtn) {
    otherBtn.addEventListener("click", () => {
      identityModal.classList.add("hidden");
      document.body.style.overflow = "";
      nameInput.focus();
    });
  }
  document.body.style.overflow = "hidden";
}

if (nameChangeBtn) {
  nameChangeBtn.addEventListener("click", () => {
    nameConfirmed.classList.add("hidden");
    nameInput.classList.remove("hidden");
    nameInput.value = "";
    confirmedGuestId = null;
    confirmedToken = null;
    nameInput.focus();
    persist();
    clearIdentity();
  });
}

// ── Table number verification ─────────────────────────────────────────────────
function showTableVerify(name, guestId) {
  pendingGuest = { id: guestId, name };
  if (pendingNameDisplay) pendingNameDisplay.textContent = name;
  if (tableVerify) tableVerify.classList.remove("hidden");
  if (tableVerifyError) {
    tableVerifyError.textContent = "";
    tableVerifyError.classList.add("hidden");
  }
  if (tableNumberInput) {
    tableNumberInput.value = "";
    tableNumberInput.focus();
  }
  document.body.style.overflow = "hidden";
}

function hideTableVerify() {
  pendingGuest = null;
  if (tableVerify) tableVerify.classList.add("hidden");
  if (tableNumberInput) tableNumberInput.value = "";
  if (tableVerifyError) {
    tableVerifyError.textContent = "";
    tableVerifyError.classList.add("hidden");
  }
  document.body.style.overflow = "";
}

async function submitTableVerify() {
  if (!pendingGuest) return;
  var tableNumber = tableNumberInput ? tableNumberInput.value.trim() : "";
  if (!tableNumber) {
    showVerifyError("Please enter your table number.");
    return;
  }
  if (tableVerifyBtn) tableVerifyBtn.disabled = true;
  if (tableVerifyError) tableVerifyError.classList.add("hidden");

  try {
    var res = await fetch("/api/game/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestId: pendingGuest.id,
        tableNumber: Number(tableNumber),
      }),
    });
    var data = await res.json();
    if (data.ok) {
      confirmIdentity(pendingGuest.name, pendingGuest.id, data.token);
    } else {
      showVerifyError(data.error || "Verification failed. Please try again.");
    }
  } catch {
    showVerifyError("Something went wrong. Please try again.");
  } finally {
    if (tableVerifyBtn) tableVerifyBtn.disabled = false;
  }
}

function showVerifyError(msg) {
  if (!tableVerifyError) return;
  tableVerifyError.textContent = msg;
  tableVerifyError.classList.remove("hidden");
}

if (tableVerifyBtn) tableVerifyBtn.addEventListener("click", submitTableVerify);
function closeTableVerify() {
  hideTableVerify();
  hideSuggestions();
  if (nameInput) nameInput.focus();
}
if (tableVerifyCancel)
  tableVerifyCancel.addEventListener("click", closeTableVerify);
document.querySelectorAll(".js-table-cancel").forEach(function (btn) {
  btn.addEventListener("click", closeTableVerify);
});
if (tableVerify)
  tableVerify.addEventListener("click", function (e) {
    if (e.target === tableVerify) closeTableVerify();
  });
if (tableNumberInput) {
  tableNumberInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitTableVerify();
    }
  });
}

// ── Guest name search ─────────────────────────────────────────────────────────
var searchTimer = null;

function hideSuggestions() {
  if (nameSuggestions) nameSuggestions.classList.add("hidden");
}

function renderSuggestions(results) {
  if (!nameSuggestions) return;
  nameSuggestions.replaceChildren();
  if (!results.length) {
    var empty = document.createElement("div");
    empty.className = "name-suggestions-empty";
    empty.textContent = "No guests found — continue with your typed name.";
    nameSuggestions.appendChild(empty);
  } else {
    results.forEach(function (r) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "name-suggestion-item";
      btn.setAttribute("role", "option");
      btn.dataset.name = r.name;
      btn.dataset.id = r.id;
      var nameSpan = document.createElement("span");
      nameSpan.textContent = r.name;
      var hint = document.createElement("span");
      hint.className = "name-suggestion-confirm";
      hint.textContent = "That's me";
      btn.appendChild(nameSpan);
      btn.appendChild(hint);
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        hideSuggestions();
        showTableVerify(btn.dataset.name, btn.dataset.id);
      });
      nameSuggestions.appendChild(btn);
    });
  }
  nameSuggestions.classList.remove("hidden");
}

if (nameInput && nameSuggestions) {
  nameInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    confirmedGuestId = null;
    confirmedToken = null;
    var q = nameInput.value.trim();
    if (q.length < 2) {
      hideSuggestions();
      return;
    }
    searchTimer = setTimeout(function () {
      fetch("/api/guest/search?q=" + encodeURIComponent(q))
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          renderSuggestions(data.results ?? []);
        })
        .catch(hideSuggestions);
    }, 380);
  });

  nameInput.addEventListener("blur", function () {
    setTimeout(hideSuggestions, 180);
  });
}

// ── Confirm-submit modal ──────────────────────────────────────────────────────
var confirmModal = document.getElementById("confirm-modal");
var confirmDesc = document.getElementById("confirm-desc");
var confirmSquares = document.getElementById("confirm-squares");
var confirmCancel = document.getElementById("confirm-cancel");
var confirmOk = document.getElementById("confirm-ok");

confirmCancel.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  document.body.style.overflow = "";
});
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.add("hidden");
    document.body.style.overflow = "";
  }
});

// ── Persistence ───────────────────────────────────────────────────────────────
var SK = {
  name: "gup-name",
  squares: "gup-squares",
  confirmed: "gup-confirmed",
  submitted: "gup-submitted",
  guestId: "gup-guestid",
  token: "gup-token",
};
var photoKey = function (n) {
  return "gup-photo-" + n;
};

function persist() {
  try {
    sessionStorage.setItem(SK.name, nameInput.value.trim());
    sessionStorage.setItem(
      SK.confirmed,
      nameConfirmed && !nameConfirmed.classList.contains("hidden") ? "1" : "",
    );
    sessionStorage.setItem(SK.guestId, confirmedGuestId || "");
    sessionStorage.setItem(SK.token, confirmedToken || "");
    sessionStorage.setItem(
      SK.squares,
      JSON.stringify([...squareDataURLs.keys()]),
    );
    sessionStorage.setItem(SK.submitted, JSON.stringify([...submittedSquares]));
    for (var [n, url] of squareDataURLs)
      sessionStorage.setItem(photoKey(n), url);
  } catch (_) {}
}

function clearStorage() {
  try {
    [
      SK.name,
      SK.confirmed,
      SK.squares,
      SK.submitted,
      SK.guestId,
      SK.token,
    ].forEach((k) => sessionStorage.removeItem(k));
    for (var i = 1; i <= 15; i++)
      sessionStorage.removeItem(photoKey(String(i)));
  } catch (_) {}
}

var LSK = {
  name: "gup-ls-name",
  guestId: "gup-ls-guestid",
  token: "gup-ls-token",
};

function saveIdentity() {
  try {
    localStorage.setItem(LSK.name, nameInput.value.trim());
    localStorage.setItem(LSK.guestId, confirmedGuestId || "");
    localStorage.setItem(LSK.token, confirmedToken || "");
  } catch (_) {}
}

function clearIdentity() {
  try {
    [LSK.name, LSK.guestId, LSK.token].forEach((k) =>
      localStorage.removeItem(k),
    );
  } catch (_) {}
}

function restoreIdentity() {
  try {
    var name = localStorage.getItem(LSK.name);
    var guestId = localStorage.getItem(LSK.guestId) || null;
    var token = localStorage.getItem(LSK.token) || null;
    if (name) confirmIdentity(name, guestId, token);
  } catch (_) {}
}

// ── Duplicate square prevention ───────────────────────────────────────────────
function loadDoneSquares() {
  if (!confirmedGuestId || !confirmedToken) return;
  var params = new URLSearchParams({
    guestId: confirmedGuestId,
    token: confirmedToken,
  });
  fetch("/api/game/squares?" + params.toString())
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || !data.squares) return;
      data.squares.forEach(function (n) {
        if (submittedSquares.has(n)) return;
        submittedSquares.add(n);
        var btn = document.querySelector('.sq-btn[data-n="' + n + '"]');
        if (btn) {
          btn.classList.add("submitted");
          btn.disabled = true;
        }
      });
      syncSubmitBtn();
    })
    .catch(function () {});
}

function markSubmitted(ns) {
  ns.forEach(function (n) {
    submittedSquares.add(n);
    squareFiles.delete(n);
    squareDataURLs.delete(n);
    squareTitles.delete(n);
    squareDescs.delete(n);
    sessionStorage.removeItem(photoKey(n));
    var btn = document.querySelector('.sq-btn[data-n="' + n + '"]');
    if (btn) {
      btn.classList.remove("done");
      btn.classList.add("submitted");
      btn.disabled = true;
    }
  });
  syncSubmitBtn();
  persist();
}

function restore() {
  try {
    var name = sessionStorage.getItem(SK.name);
    var confirmed = sessionStorage.getItem(SK.confirmed);
    var savedGuestId = sessionStorage.getItem(SK.guestId) || null;
    var savedToken = sessionStorage.getItem(SK.token) || null;

    if (name) {
      if (confirmed && nameConfirmed) {
        confirmIdentity(name, savedGuestId, savedToken);
      } else {
        nameInput.value = name;
        if (identityModal) {
          identityModal.classList.add("hidden");
          document.body.style.overflow = "";
        }
      }
    }

    var rawSubmitted = sessionStorage.getItem(SK.submitted);
    if (rawSubmitted) {
      JSON.parse(rawSubmitted).forEach(function (n) {
        submittedSquares.add(n);
        var btn = document.querySelector('.sq-btn[data-n="' + n + '"]');
        if (btn) {
          btn.classList.add("submitted");
          btn.disabled = true;
        }
      });
    }

    var raw = sessionStorage.getItem(SK.squares);
    if (!raw) return;
    JSON.parse(raw).forEach(function (n) {
      if (submittedSquares.has(n)) return;
      var url = sessionStorage.getItem(photoKey(n));
      if (!url) return;
      squareDataURLs.set(n, url);
      fetch(url)
        .then(function (r) {
          return r.blob();
        })
        .then(function (blob) {
          squareFiles.set(n, blob);
          var el = document.querySelector('.sq-btn[data-n="' + n + '"]');
          if (el) el.classList.add("done");
          syncSubmitBtn();
        });
    });
  } catch (_) {}
}
