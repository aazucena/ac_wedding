// rsvp-wizard.ts — client-side wizard logic for RsvpForm.astro
import { actions } from 'astro:actions';

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
var _guestList: Array<{ id: string; name: string; type: string }> = [];

function anyAttending() { return Object.values(guestResponse).some(v => v === 'attending'); }
function allResponded()  { return Object.values(guestResponse).every(v => v !== null); }

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
  if (step === 5) buildReview();
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

// ── Review builder (DOM-safe — no innerHTML for user content) ──
function buildReview() {
  var content = document.getElementById('review-content');
  if (!content) return;
  while (content.firstChild) content.removeChild(content.firstChild);

  function makeEditBtn(step: number): HTMLButtonElement {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'review-edit';
    btn.textContent = 'Edit';
    btn.addEventListener('click', function() { showStep(step); });
    return btn;
  }

  function makeSectionHeader(title: string, step: number): HTMLElement {
    var header = document.createElement('div');
    header.className = 'review-section-header';
    var titleEl = document.createElement('p');
    titleEl.className = 'review-section-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
    header.appendChild(makeEditBtn(step));
    return header;
  }

  function makeReviewItem(key: string, val: string): HTMLElement {
    var row = document.createElement('div');
    row.className = 'review-item';
    var keyEl = document.createElement('span');
    keyEl.className = 'review-key';
    keyEl.textContent = key;
    var valEl = document.createElement('span');
    valEl.className = 'review-val';
    valEl.textContent = val;
    row.appendChild(keyEl);
    row.appendChild(valEl);
    return row;
  }

  function makeEmpty(text: string): HTMLElement {
    var p = document.createElement('p');
    p.className = 'review-empty';
    p.textContent = text;
    return p;
  }

  // ── Guests ──
  var guestsSec = document.createElement('div');
  guestsSec.className = 'review-section';
  guestsSec.appendChild(makeSectionHeader('Guests', 1));
  var guestCards = document.createElement('div');
  guestCards.className = 'review-guest-cards';

  _guestList.forEach(function(g) {
    var card = document.createElement('div');
    card.className = 'review-guest-card';

    var header = document.createElement('div');
    header.className = 'review-guest-header';

    var nameEl = document.createElement('span');
    nameEl.className = 'review-guest-name';
    nameEl.textContent = g.name;

    var isAttending = guestResponse[g.id] === 'attending';
    var badge = document.createElement('span');
    badge.className = 'review-badge ' + (isAttending ? 'review-badge--yes' : 'review-badge--no');
    badge.textContent = isAttending ? 'Attending' : 'Not attending';

    header.appendChild(nameEl);
    header.appendChild(badge);
    card.appendChild(header);

    if (isAttending) {
      var atTypeEl = document.querySelector<HTMLInputElement>('input[name="attendance_type_' + g.id + '"]:checked');
      var atType   = atTypeEl?.value ?? 'both';
      var atLabel  = atType === 'both' ? 'Ceremony & Reception' : atType === 'ceremony' ? 'Ceremony Only' : 'Reception Only';
      var dietary  = ((document.getElementById('dietary-' + g.id) as HTMLTextAreaElement | null)?.value ?? '').trim();

      var detailRow = document.createElement('div');
      detailRow.className = 'review-guest-details';

      var atPill = document.createElement('span');
      atPill.className = 'review-guest-pill';
      atPill.textContent = atLabel;

      detailRow.appendChild(atPill);
      card.appendChild(detailRow);

      if (dietary) {
        var dietEl = document.createElement('p');
        dietEl.className = 'review-guest-dietary';
        dietEl.textContent = dietary;
        card.appendChild(dietEl);
      }
    }

    guestCards.appendChild(card);
  });

  guestsSec.appendChild(guestCards);
  content.appendChild(guestsSec);

  if (anyAttending()) {
    // ── Contact ──
    var repInput  = document.querySelector<HTMLInputElement>('input[name="representative"]:checked');
    var repName   = repInput ? (document.getElementById('rep-option-' + repInput.value)?.querySelector('.card-option-title')?.textContent ?? '').trim() : '';
    var phone     = ((document.getElementById('contact-phone') as HTMLInputElement | null)?.value ?? '').trim();
    var email     = ((document.getElementById('contact-email') as HTMLInputElement | null)?.value ?? '').trim();

    var contactSec = document.createElement('div');
    contactSec.className = 'review-section';
    contactSec.appendChild(makeSectionHeader('Contact', 2));
    var contactItems = document.createElement('div');
    contactItems.className = 'review-items';
    var hasContact = false;
    if (repName)  { contactItems.appendChild(makeReviewItem('Representative', repName)); hasContact = true; }
    if (phone)    { contactItems.appendChild(makeReviewItem('Phone', phone));            hasContact = true; }
    if (email)    { contactItems.appendChild(makeReviewItem('Email', email));            hasContact = true; }
    if (!hasContact) contactItems.appendChild(makeEmpty('No contact details provided.'));
    contactSec.appendChild(contactItems);
    content.appendChild(contactSec);

    // ── Extras ──
    var hotel     = (document.getElementById('hotel')     as HTMLInputElement | null)?.checked ?? false;
    var transport = (document.getElementById('transport') as HTMLInputElement | null)?.checked ?? false;
    var song      = ((document.getElementById('song')     as HTMLInputElement | null)?.value ?? '').trim();

    var extrasSec = document.createElement('div');
    extrasSec.className = 'review-section';
    extrasSec.appendChild(makeSectionHeader('Extras', 3));
    var extrasItems = document.createElement('div');
    extrasItems.className = 'review-items';
    var hasExtras = false;
    if (hotel)     { extrasItems.appendChild(makeReviewItem('Hotel', 'Requested'));      hasExtras = true; }
    if (transport) { extrasItems.appendChild(makeReviewItem('Transport', 'Requested')); hasExtras = true; }
    if (song)      { extrasItems.appendChild(makeReviewItem('Song request', song));      hasExtras = true; }
    if (!hasExtras) extrasItems.appendChild(makeEmpty('None requested.'));
    extrasSec.appendChild(extrasItems);
    content.appendChild(extrasSec);
  }

  // ── Message ──
  var msgId  = anyAttending() ? 'message' : 'message-declined';
  var msgVal = ((document.getElementById(msgId) as HTMLTextAreaElement | null)?.value ?? '').trim();

  var msgSec = document.createElement('div');
  msgSec.className = 'review-section';
  msgSec.appendChild(makeSectionHeader('Message', 4));
  if (msgVal) {
    var msgEl = document.createElement('p');
    msgEl.className = 'review-message';
    msgEl.textContent = msgVal;
    msgSec.appendChild(msgEl);
  } else {
    msgSec.appendChild(makeEmpty('No message provided.'));
  }
  content.appendChild(msgSec);
}

document.addEventListener('astro:page-load', () => {
  const dataEl = document.getElementById('rsvp-data');
  if (!dataEl) return;
  const { partyId, guestList, rsvpToken } = JSON.parse(dataEl.textContent!) as {
    partyId:   string;
    guestList: Array<{ id: string; personId: string | null; name: string; type: string }>;
    rsvpToken: string;
  };
  _guestList = guestList;

  guestList.forEach(g => { guestResponse[g.id] = null; });

  // No auto-open needed — response buttons are always visible

  initCardOptions(document);

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
    var anyMinorAttending = guestList.some(g => guestResponse[g.id] === 'attending' && g.type !== 'adult');
    var anyAdultAttending = guestList.some(g => guestResponse[g.id] === 'attending' && g.type === 'adult');
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
