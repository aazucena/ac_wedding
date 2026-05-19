// rsvp-wizard.ts — client-side wizard logic for RsvpForm.astro
import { actions } from 'astro:actions';
import { buildReview } from './rsvp-review';

declare global {
  interface Window {
    onResponseChange: (guestId: string, value: string) => void;
    initDropzone:     (id: string, token: string) => void;
  }
}

// ── State ────────────────────────────────────────────────
var guestResponse: Record<string, string | null> = {};
var currentStep = 1;
// Populated on page-load; used by buildReview which runs after init
var _guestList: Array<{ id: string; name: string; firstName: string; lastName: string; type: string }> = [];
var _plusOnesAllowed = 0;
var _plusOnes: Array<{ tempId: string; firstName: string; lastName: string; gender: string; type: string }> = [];
var _blockedFirstNames: string[] = [];

function anyAttending() { return Object.values(guestResponse).some(v => v === 'attending'); }
function allResponded()  { return Object.values(guestResponse).every(v => v !== null); }

// ── Plus-one UI ──────────────────────────────────────────
function updatePlusOneUI() {
  var remaining = _plusOnesAllowed - _plusOnes.length;
  var badge  = document.getElementById('po-remaining');
  var addRow = document.getElementById('po-add-row');
  var zone = document.getElementById('plus-one-zone');
  if (badge)  badge.textContent = String(remaining);
  if (addRow) {
     addRow.style.display = remaining > 0 ? '' : 'none';
  }
  if (zone) {
     zone.style.display = remaining > 0 ? '' : 'none';
  }
}

function showPlusOneForm() {
  var backdrop = document.getElementById('po-modal-backdrop');
  if (!backdrop) return;
  backdrop.style.display = 'flex';
  backdrop.setAttribute('aria-hidden', 'false');
  (document.getElementById('po-first') as HTMLInputElement | null)?.focus();
}

function hidePlusOneForm() {
  var backdrop = document.getElementById('po-modal-backdrop');
  if (!backdrop) return;
  backdrop.style.display = 'none';
  backdrop.setAttribute('aria-hidden', 'true');
  var fi = document.getElementById('po-first')  as HTMLInputElement  | null;
  var la = document.getElementById('po-last')   as HTMLInputElement  | null;
  var ge = document.getElementById('po-gender') as HTMLSelectElement | null;
  var ty = document.getElementById('po-type')   as HTMLSelectElement | null;
  if (fi) fi.value = '';
  if (la) la.value = '';
  if (ge) ge.value = '';
  if (ty) ty.value = 'adult';
  var errEl = document.getElementById('po-error');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
}

function makeRadioOption(tempId: string, value: string, icon: string, label: string, checked: boolean): HTMLLabelElement {
  var lbl = document.createElement('label');
  lbl.className = 'card-option card-option--radio';
  var input = document.createElement('input');
  input.type = 'radio'; input.name = 'attendance_type_' + tempId; input.value = value;
  if (checked) input.checked = true;
  var iconSpan  = document.createElement('span'); iconSpan.className  = 'card-option-icon';  iconSpan.textContent = icon;
  var bodySpan  = document.createElement('span'); bodySpan.className  = 'card-option-body';
  var titleSpan = document.createElement('span'); titleSpan.className = 'card-option-title'; titleSpan.textContent = label;
  var checkSpan = document.createElement('span'); checkSpan.className = 'card-option-check'; checkSpan.textContent = '✓';
  bodySpan.appendChild(titleSpan);
  lbl.appendChild(input); lbl.appendChild(iconSpan); lbl.appendChild(bodySpan); lbl.appendChild(checkSpan);
  return lbl;
}

function createPlusOneRow(tempId: string, displayName: string) {
  // ── Card shell ──
  var card = document.createElement('div');
  card.className = 'guest-card plus-one-row';
  card.id = 'guest-' + tempId;
  card.dataset.guestId = tempId;

  // ── Header ──
  var header = document.createElement('div');
  header.className = 'guest-card-header';

  var nameGroup = document.createElement('span');
  nameGroup.className = 'po-name-group';

  var nameSpan = document.createElement('span');
  nameSpan.className = 'guest-name';
  nameSpan.textContent = displayName;

  // Trash icon button (prefix, before the name)
  var removeBtn = document.createElement('button');
  removeBtn.type = 'button'; removeBtn.className = 'po-remove-btn'; removeBtn.title = 'Remove plus-one';
  removeBtn.setAttribute('aria-label', 'Remove plus-one');
  var ns = 'http://www.w3.org/2000/svg';
  var trashSvg = document.createElementNS(ns, 'svg');
  trashSvg.setAttribute('width', '15'); trashSvg.setAttribute('height', '15');
  trashSvg.setAttribute('viewBox', '0 0 24 24'); trashSvg.setAttribute('fill', 'none');
  trashSvg.setAttribute('stroke', 'currentColor'); trashSvg.setAttribute('stroke-width', '1.8');
  trashSvg.setAttribute('stroke-linecap', 'round'); trashSvg.setAttribute('stroke-linejoin', 'round');
  trashSvg.setAttribute('aria-hidden', 'true');
  function svgEl(tag: string, attr: string, val: string) {
    var el = document.createElementNS(ns, tag); el.setAttribute(attr, val); return el;
  }
  trashSvg.appendChild(svgEl('polyline', 'points', '3 6 5 6 21 6'));
  trashSvg.appendChild(svgEl('path', 'd', 'M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6'));
  trashSvg.appendChild(svgEl('path', 'd', 'M10 11v6M14 11v6'));
  trashSvg.appendChild(svgEl('path', 'd', 'M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2'));
  removeBtn.appendChild(trashSvg);
  removeBtn.addEventListener('click', function() { removePlusOne(tempId); });

  var seg = document.createElement('div');
  seg.className = 'response-seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Response');
  var yesBtn = document.createElement('button');
  yesBtn.type = 'button'; yesBtn.className = 'seg seg--yes'; yesBtn.id = 'yes-' + tempId; yesBtn.textContent = '✓ Attending';
  yesBtn.addEventListener('click', function() { window.onResponseChange(tempId, 'attending'); });
  var divider = document.createElement('span');
  divider.className = 'seg-divider'; divider.setAttribute('aria-hidden', 'true');
  var noBtn = document.createElement('button');
  noBtn.type = 'button'; noBtn.className = 'seg seg--no'; noBtn.id = 'no-' + tempId; noBtn.textContent = '✗ Declining';
  noBtn.addEventListener('click', function() { window.onResponseChange(tempId, 'declined'); });
  seg.appendChild(yesBtn); seg.appendChild(divider); seg.appendChild(noBtn);

  // Order: [trash + name] [response seg]
  nameGroup.appendChild(removeBtn); nameGroup.appendChild(nameSpan);
  header.appendChild(nameGroup); header.appendChild(seg);
  card.appendChild(header);

  // ── Attending panel ──
  var panel = document.createElement('div');
  panel.className = 'attending-panel'; panel.id = 'panel-' + tempId;
  var content = document.createElement('div'); content.className = 'attending-content';
  var inner   = document.createElement('div'); inner.className   = 'attending-inner';

  // Attendance choice field
  var attField = document.createElement('div'); attField.className = 'field';
  var attLabel = document.createElement('label'); attLabel.className = 'field-label'; attLabel.textContent = 'Attending';
  var optList  = document.createElement('div');  optList.className  = 'card-option-list';
  optList.appendChild(makeRadioOption(tempId, 'both',      '🎉', 'Ceremony & Reception', true));
  optList.appendChild(makeRadioOption(tempId, 'ceremony',  '⛪', 'Ceremony Only',         false));
  optList.appendChild(makeRadioOption(tempId, 'reception', '🥂', 'Reception Only',        false));
  attField.appendChild(attLabel); attField.appendChild(optList);

  // Dietary field
  var dietField = document.createElement('div'); dietField.className = 'field';
  var dietLabel = document.createElement('label');
  dietLabel.className = 'field-label'; dietLabel.htmlFor = 'dietary-' + tempId;
  var dietText = document.createTextNode('Dietary Restrictions ');
  var optional = document.createElement('span'); optional.className = 'optional'; optional.textContent = 'optional';
  dietLabel.appendChild(dietText); dietLabel.appendChild(optional);
  var dietArea = document.createElement('textarea');
  dietArea.id = 'dietary-' + tempId; dietArea.rows = 2;
  dietArea.placeholder = 'Allergies, intolerances, or other requirements…';

  dietField.appendChild(dietLabel); dietField.appendChild(dietArea);
  inner.appendChild(attField); inner.appendChild(dietField);
  content.appendChild(inner); panel.appendChild(content);
  card.appendChild(panel);

  // ── Append to the guest list (plus-one zone is a sibling outside it) ──
  var guestList = document.getElementById('guest-list');
  if (guestList) guestList.appendChild(card);

  initCardOptions(card);
  guestResponse[tempId] = null;
  window.onResponseChange(tempId, 'attending');
}

function addPlusOne(firstName: string, lastName: string, gender: string, type: string) {
  var tempId = 'po_' + Math.random().toString(36).slice(2, 10);
  _plusOnes.push({ tempId, firstName, lastName, gender, type });
  createPlusOneRow(tempId, lastName ? firstName + ' ' + lastName : firstName);
  updatePlusOneUI();
}

function removePlusOne(tempId: string) {
  _plusOnes = _plusOnes.filter(p => p.tempId !== tempId);
  delete guestResponse[tempId];
  document.getElementById('guest-' + tempId)?.remove();
  updatePlusOneUI();
}

// ── Progress bar ─────────────────────────────────────────
function getVisibleStep() {
  if (anyAttending()) return currentStep;
  // Declined path: 1 → 4 → 5  maps to visible  1 → 2 → 3
  if (currentStep === 1) return 1;
  if (currentStep === 4) return 2;
  return 3;
}
function getTotalSteps() { return anyAttending() ? 5 : 3; }

function updateProgress() {
  var total   = getTotalSteps();
  var visible = getVisibleStep();
  var pct     = Math.round(visible / total * 100);
  var fill    = document.getElementById('wizard-fill');
  var label   = document.getElementById('wizard-label');
  if (fill)  fill.style.width  = pct + '%';
  if (label) label.textContent = 'Step ' + visible + ' of ' + total;
}

// ── Step show/hide ───────────────────────────────────────
function showStep(step: number) {
  document.querySelectorAll<HTMLElement>('.wizard-step').forEach(el => el.classList.remove('active'));
  document.getElementById('step-' + step)?.classList.add('active');
  currentStep = step;
  updateProgress();
  if (step === 2) refreshRepOptions();
  if (step === 4) {
    var isAttending = anyAttending();
    var msgA = document.getElementById('msg-attending-wrap');
    var msgD = document.getElementById('msg-declined-wrap');
    if (msgA) msgA.style.display = isAttending ? '' : 'none';
    if (msgD) msgD.style.display = isAttending ? 'none' : '';
  }
  if (step === 5) buildReview(_guestList, _plusOnes, guestResponse, anyAttending, showStep);
  document.getElementById('rsvp-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(step: number, msg: string) {
  var el = document.getElementById('error-' + step);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}
function clearError(step: number) {
  document.getElementById('error-' + step)?.classList.remove('visible');
}

// ── Response segments ─────────────────────────────────────
// Attending: opens detail panel (closes others). Re-clicking toggles panel.
// Declining: closes panel, deselects attending.
window.onResponseChange = function(guestId, value) {
  var yesBtn = document.getElementById('yes-' + guestId);
  var noBtn  = document.getElementById('no-'  + guestId);
  var panel  = document.getElementById('panel-' + guestId);

  if (value === 'attending') {
    // Close every other open panel first
    document.querySelectorAll<HTMLElement>('.attending-panel.open').forEach(function(p) {
      if (p.id !== 'panel-' + guestId) p.classList.remove('open');
    });
    yesBtn?.classList.add('active');
    noBtn?.classList.remove('active');
    panel?.classList.add('open');
    guestResponse[guestId] = 'attending';
  } else {
    yesBtn?.classList.remove('active');
    noBtn?.classList.add('active');
    panel?.classList.remove('open');
    guestResponse[guestId] = 'declined';
  }

  clearError(1);
};

// ── Card option visual state ─────────────────────────────
function initCardOptions(root: Document | HTMLElement) {
  root.querySelectorAll<HTMLInputElement>('.card-option input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      var list = radio.closest('.card-option-list');
      list?.querySelectorAll('.card-option').forEach(o => o.classList.remove('selected'));
      radio.closest('.card-option')?.classList.add('selected');
    });
    if (radio.checked) radio.closest('.card-option')?.classList.add('selected');
  });
  root.querySelectorAll<HTMLInputElement>('.card-option input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.card-option')?.classList.toggle('selected', cb.checked);
    });
  });
}

// ── Representative picker ────────────────────────────────
function refreshRepOptions() {
  var firstVisibleLabel: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>('[id^="rep-option-"]').forEach(label => {
    var guestId = label.id.replace('rep-option-', '');
    var visible  = guestResponse[guestId] === 'attending' && label.dataset.type === 'adult';
    label.style.display = visible ? '' : 'none';
    if (visible && !firstVisibleLabel) firstVisibleLabel = label;
  });
  var checked = document.querySelector<HTMLInputElement>('input[name="representative"]:checked');
  if (checked) {
    var checkedLabel = document.getElementById('rep-option-' + checked.value);
    var target = firstVisibleLabel as HTMLElement | null;
    if (checkedLabel?.style.display === 'none' && target) {
      var inputA = target.querySelector<HTMLInputElement>('input[type="radio"]');
      if (inputA) {
        inputA.checked = true;
        document.querySelectorAll<HTMLElement>('#rep-list .card-option').forEach(o => o.classList.remove('selected'));
        target.classList.add('selected');
      }
    }
  } else if (firstVisibleLabel) {
    var target2 = firstVisibleLabel as HTMLElement;
    var inputB  = target2.querySelector<HTMLInputElement>('input[type="radio"]');
    if (inputB) { inputB.checked = true; target2.classList.add('selected'); }
  }
}


document.addEventListener('astro:page-load', () => {
  const dataEl = document.getElementById('rsvp-data');
  if (!dataEl) return;
  const { partyId, guestList, rsvpToken, plusOnesAllowed, blockedFirstNames } = JSON.parse(dataEl.textContent!) as {
    partyId:           string;
    guestList:         Array<{ id: string; personId: string | null; name: string; firstName: string; lastName: string; type: string }>;
    rsvpToken:         string;
    plusOnesAllowed:   number;
    blockedFirstNames: string[];
  };
  _guestList = guestList;
  _plusOnesAllowed = plusOnesAllowed ?? 0;
  _blockedFirstNames = blockedFirstNames ?? [];
  _plusOnes = [];

  guestList.forEach(g => { guestResponse[g.id] = null; });

  // No auto-open needed — response buttons are always visible

  initCardOptions(document);

  // ── Plus-one controls ──
  if (_plusOnesAllowed > 0) {
    updatePlusOneUI();
    document.getElementById('po-add-btn')?.addEventListener('click', showPlusOneForm);
    document.getElementById('po-cancel')?.addEventListener('click', hidePlusOneForm);
    // Close on backdrop click (outside the modal panel)
    document.getElementById('po-modal-backdrop')?.addEventListener('click', function(e) {
      if (e.target === e.currentTarget) hidePlusOneForm();
    });
    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('po-modal-backdrop')?.style.display === 'flex') hidePlusOneForm();
    });
    document.getElementById('po-confirm')?.addEventListener('click', async function() {
      var firstName  = ((document.getElementById('po-first')  as HTMLInputElement | null)?.value ?? '').trim();
      var lastName   = ((document.getElementById('po-last')   as HTMLInputElement | null)?.value ?? '').trim();
      var gender     = (document.getElementById('po-gender')  as HTMLSelectElement | null)?.value ?? '';
      var type       = (document.getElementById('po-type')    as HTMLSelectElement | null)?.value ?? 'adult';
      var errEl      = document.getElementById('po-error');
      var confirmBtn = document.getElementById('po-confirm') as HTMLButtonElement | null;
      function norm(s: string) { return s.trim().toLowerCase(); }

      if (!firstName) {
        if (errEl) { errEl.textContent = 'First name is required.'; errEl.classList.add('visible'); }
        return;
      }
      if (!lastName) {
        if (errEl) { errEl.textContent = 'Last name is required.'; errEl.classList.add('visible'); }
        return;
      }
      if (!gender) {
        if (errEl) { errEl.textContent = 'Please select a gender.'; errEl.classList.add('visible'); }
        return;
      }

      var displayName = firstName + ' ' + lastName;
      var errMsg = '';

      // Blocked names — bride, groom, and their parents
      if (_blockedFirstNames.includes(norm(firstName))) {
        errMsg = displayName + ' cannot be added as a plus-one.';
      }

      // Duplicate against already-added plus-ones and pre-registered guests (client-side)
      if (!errMsg) {
        var fullNew = norm(firstName + ' ' + lastName);
        if (_plusOnes.some(function(po) { return norm(po.firstName + ' ' + po.lastName) === fullNew; })) {
          errMsg = displayName + ' has already been added.';
        } else if (_guestList.some(function(g) { return norm(g.firstName + ' ' + g.lastName) === fullNew; })) {
          errMsg = displayName + ' is already in your party\'s invitation.';
        }
      }

      if (errMsg) {
        if (errEl) { errEl.textContent = errMsg; errEl.classList.add('visible'); }
        return;
      }

      // Server-side check: query Directus to see if this person is already in the party
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Checking…'; }
      const { error: checkError } = await actions.checkPlusOne({ token: rsvpToken, partyId, firstName, lastName });
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Add Guest'; }

      if (checkError) {
        if (errEl) { errEl.textContent = checkError.message; errEl.classList.add('visible'); }
        return;
      }

      addPlusOne(firstName, lastName, gender, type);
      hidePlusOneForm();
    });
  }

  // Dismiss loader once JS is fully initialised
  const loader = document.getElementById('form-loader');
  if (loader) {
    loader.classList.add('form-loader--done');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  }

  // ── Navigation wiring ────────────────────────────────
  document.getElementById('next-1')?.addEventListener('click', () => {
    if (!allResponded()) {
      showError(1, 'Please select a response for each guest.');
      return;
    }
    var anyMinorAttending = guestList.some(g => guestResponse[g.id] === 'attending' && g.type !== 'adult')
      || _plusOnes.some(p => guestResponse[p.tempId] === 'attending' && p.type !== 'adult');
    var anyAdultAttending = guestList.some(g => guestResponse[g.id] === 'attending' && g.type === 'adult')
      || _plusOnes.some(p => guestResponse[p.tempId] === 'attending' && p.type === 'adult');
    if (anyMinorAttending && !anyAdultAttending) {
      showError(1, 'Guests under 18 cannot attend without at least one adult.');
      return;
    }
    clearError(1);
    showStep(anyAttending() ? 2 : 4);
  });

  document.getElementById('back-2')?.addEventListener('click', () => showStep(1));
  document.getElementById('next-2')?.addEventListener('click', () => {
    var phone = ((document.getElementById('contact-phone') as HTMLInputElement | null)?.value ?? '').trim();
    var email = ((document.getElementById('contact-email') as HTMLInputElement | null)?.value ?? '').trim();
    if (!phone && !email) {
      showError(2, 'Please provide at least a phone number or email address.');
      return;
    }
    clearError(2);
    showStep(3);
  });

  document.getElementById('back-3')?.addEventListener('click', () => showStep(2));
  document.getElementById('next-3')?.addEventListener('click', () => showStep(4));

  document.getElementById('back-4')?.addEventListener('click', () => {
    showStep(anyAttending() ? 3 : 1);
  });
  document.getElementById('next-4')?.addEventListener('click', () => {
    if (anyAttending()) {
      var msgVal = (document.getElementById('message') as HTMLTextAreaElement | null)?.value?.trim();
      if (!msgVal) {
        showError(4, 'Please write a message to the couple.');
        document.getElementById('message-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    clearError(4);
    showStep(5);
  });

  document.getElementById('back-5')?.addEventListener('click', () => showStep(4));

  // ── Submit ────────────────────────────────────────────
  document.getElementById('rsvp-form')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.target as HTMLElement).id !== 'submit-btn') {
      e.preventDefault();
    }
  });

  document.getElementById('rsvp-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    var errorEl   = document.getElementById('error-5');
    var submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null;

    submitBtn!.classList.add('loading');
    submitBtn!.disabled = true;
    if (errorEl) errorEl.classList.remove('visible');

    var messageVal = anyAttending()
      ? (document.getElementById('message')          as HTMLTextAreaElement | null)?.value
      : (document.getElementById('message-declined') as HTMLTextAreaElement | null)?.value;

    var guestPayloads = guestList.map(g => {
      var isAttending    = guestResponse[g.id] === 'attending';
      var attendanceType = isAttending
        ? (document.querySelector<HTMLInputElement>(`input[name="attendance_type_${g.id}"]:checked`)?.value ?? 'both')
        : '';
      var attendance = [
        ...(['ceremony', 'both'].includes(attendanceType) ? ['ceremony'] : []),
        ...(['reception', 'both'].includes(attendanceType) ? ['reception'] : []),
      ];
      return {
        id:                   g.id,
        attending:            isAttending,
        attendance:           attendance as ('ceremony' | 'reception')[],
        dietary_restrictions: isAttending ? (document.getElementById('dietary-' + g.id) as HTMLTextAreaElement | null)?.value || null : null,
      };
    });

    const selectedGuestId = (document.querySelector<HTMLInputElement>('input[name="representative"]:checked'))?.value ?? null;
    const selectedGuest   = selectedGuestId ? guestList.find(g => g.id === selectedGuestId) ?? null : null;
    const contactPhone    = ((document.getElementById('contact-phone') as HTMLInputElement | null)?.value ?? '').trim() || null;
    const contactEmail    = ((document.getElementById('contact-email') as HTMLInputElement | null)?.value ?? '').trim() || null;

    try {
      const attending = anyAttending();

      if (attending && (!selectedGuest || !selectedGuest?.personId || !(contactPhone || contactEmail))) {
        throw new Error('RSVP failed: Guest representative is required with either the email or phone.');
      }

      const representativeId = selectedGuest?.personId ?? guestList[0]?.personId ?? '';

      var plusOnePayloads = _plusOnes.map(function(po) {
        var isAttending    = guestResponse[po.tempId] === 'attending';
        var attendanceType = isAttending
          ? (document.querySelector<HTMLInputElement>('input[name="attendance_type_' + po.tempId + '"]:checked')?.value ?? 'both')
          : '';
        var attendance = [
          ...(['ceremony', 'both'].includes(attendanceType) ? ['ceremony' as const] : []),
          ...(['reception', 'both'].includes(attendanceType) ? ['reception' as const] : []),
        ];
        return {
          firstName:            po.firstName,
          lastName:             po.lastName,
          gender:               po.gender as 'male' | 'female',
          type:                 po.type as 'adult' | 'teen' | 'child' | 'infant',
          attending:            isAttending,
          attendance,
          dietary_restrictions: isAttending ? (document.getElementById('dietary-' + po.tempId) as HTMLTextAreaElement | null)?.value || null : null,
        };
      });

      const submitPayload = {
        token:  rsvpToken,
        partyId,
        partyPayload: {
          status:              (attending ? 'confirmed' : 'declined') as 'confirmed' | 'declined',
          representative:      representativeId,
          hotel:               (document.getElementById('hotel')     as HTMLInputElement | null)?.checked ?? false,
          transportation:      (document.getElementById('transport') as HTMLInputElement | null)?.checked ?? false,
          song_request:        (document.getElementById('song')      as HTMLInputElement | null)?.value || null,
          message_to_couple:   messageVal || null,
          date_rsvp_submitted: new Date().toISOString(),
        },
        guestPayloads,
      };
      const { error: rsvpError } = await actions.submitRsvp(submitPayload);
      if (rsvpError) throw new Error(rsvpError.message ?? 'RSVP failed');

      if (plusOnePayloads.length > 0) {
        const { error: plusOneError } = await actions.submitPlusOnes({
          token:  rsvpToken,
          partyId,
          plusOnePayloads,
        });
        if (plusOneError) throw new Error(plusOneError.message ?? 'Failed to add plus-one(s).');
      }

      // Only update contact details when at least one guest is attending
      if (attending && selectedGuest?.personId) {
        const { error: contactDetailsError } = await actions.submitContactDetails({
          token:          rsvpToken,
          partyId,
          guestId:        selectedGuest.id,
          representative: selectedGuest.personId,
          phone:          contactPhone,
          email:          contactEmail,
        });
        if (contactDetailsError) throw new Error(contactDetailsError.message ?? 'RSVP failed');
      }

      document.getElementById('rsvp-form')!.style.display = 'none';
      document.getElementById('state-success')!.classList.add('visible');

      if (!anyAttending()) {
        document.getElementById('success-message')!.textContent =
          "We'll miss you dearly.\nThank you for letting us know.";
        (document.getElementById('success-home-btn') as HTMLElement).style.display = '';
      } else {
        var uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
          uploadSection.classList.add('visible');
          window.initDropzone('dz-new', rsvpToken);
        }
      }
    } catch (err) {
      console.error('RSVP submit error:', err);
      submitBtn!.classList.remove('loading');
      submitBtn!.disabled = false;
      if (errorEl) {
        errorEl.textContent = 'Something went wrong. Please try again or reach out to us directly.';
        errorEl.classList.add('visible');
      }
    }
  });
});
