// apps/rsvp/src/scripts/rsvp.js
// All client-side logic for the RSVP page.
// Injected via <script> in RsvpCard.astro using define:vars for env vars.
// Expected globals injected by define:vars: webhookUrl, directusUrl

let attending = null;
let plusOneCount = 0;
let guestToken = null;

// ── Init: resolve token from URL ────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  guestToken = params.get('token');

  if (!guestToken) {
    showState('error');
    return;
  }

  try {
    const res = await fetch(
      `${directusUrl}/items/guests` +
      `?filter[rsvp_token][_eq]=${encodeURIComponent(guestToken)}` +
      `&fields=id,first_name,status,plus_ones_allowed&limit=1`
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { data } = await res.json();
    const guest = data?.[0];

    if (!guest) {
      showState('error');
      return;
    }

    // Already responded — show success state with appropriate message
    if (guest.status === 'confirmed' || guest.status === 'declined') {
      document.getElementById('guest-name-display').textContent = guest.first_name;
      showState('form');
      document.getElementById('rsvp-form').style.display = 'none';
      document.getElementById('state-success').classList.add('visible');
      document.getElementById('success-message').textContent =
        guest.status === 'confirmed'
          ? "You've already confirmed your attendance.\nWe can't wait to celebrate with you!"
          : "You've already let us know you won't be able to make it.\nWe'll miss you!";
      return;
    }

    window._maxPlusOnes = guest.plus_ones_allowed ?? 0;
    document.getElementById('guest-name-display').textContent = guest.first_name;
    showState('form');

  } catch (err) {
    console.error('RSVP init error:', err);
    showState('error');
  }
}

// ── State management ────────────────────────────────────────────────────────
function showState(state) {
  document.getElementById('state-loading').style.display = state === 'loading' ? 'block' : 'none';
  document.getElementById('state-error').style.display   = state === 'error'   ? 'block' : 'none';
  document.getElementById('state-form').style.display    = state === 'form'    ? 'block' : 'none';
}

// ── Attending toggle ─────────────────────────────────────────────────────────
window.setAttending = function(value) {
  attending = value;
  document.getElementById('btn-yes').className = value  ? 'toggle-btn active-yes' : 'toggle-btn';
  document.getElementById('btn-no').className  = !value ? 'toggle-btn active-no'  : 'toggle-btn';
  document.getElementById('expanded-form').classList.toggle('visible', value);
  document.getElementById('declined-msg').classList.toggle('visible', !value);
  document.getElementById('submit-wrap').style.display = 'block';
  document.getElementById('form-error').classList.remove('visible');
};

// ── Plus-one stepper ─────────────────────────────────────────────────────────
window.stepPlusOne = function(delta) {
  const max = window._maxPlusOnes ?? 0;
  plusOneCount = Math.max(0, Math.min(max, plusOneCount + delta));
  document.getElementById('plus-one-display').textContent = plusOneCount;
  document.getElementById('plus-ones').value = plusOneCount;
};

// ── Form submission ──────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  const errorBanner = document.getElementById('form-error');
  const submitBtn   = document.getElementById('submit-btn');

  if (attending === null) {
    errorBanner.textContent = "Please let us know if you'll be joining us.";
    errorBanner.classList.add('visible');
    return;
  }

  submitBtn.classList.add('loading');
  errorBanner.classList.remove('visible');

  const messageVal = attending
    ? document.getElementById('message').value
    : document.getElementById('message-declined').value;

  const payload = {
    token:                   guestToken,
    attending,
    plus_ones_confirmed:     attending ? plusOneCount : 0,
    meal_preference:         attending ? document.getElementById('meal').value : null,
    dietary_restrictions:    attending ? document.getElementById('dietary').value : null,
    hotel_required:          attending ? document.getElementById('hotel').checked : false,
    transportation_required: attending ? document.getElementById('transport').checked : false,
    song_request:            attending ? document.getElementById('song').value : null,
    message_to_couple:       messageVal || null,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    document.getElementById('rsvp-form').style.display = 'none';
    document.getElementById('state-success').classList.add('visible');

    if (!attending) {
      document.getElementById('success-message').textContent =
        "We'll miss you dearly.\nThank you for letting us know.";
    }

  } catch (err) {
    console.error('RSVP submit error:', err);
    submitBtn.classList.remove('loading');
    errorBanner.textContent = 'Something went wrong. Please try again or reach out to us directly.';
    errorBanner.classList.add('visible');
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('rsvp-form').addEventListener('submit', handleSubmit);
});