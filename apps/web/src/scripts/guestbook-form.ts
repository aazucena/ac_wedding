import { actions } from 'astro:actions';

const LS_KEY = 'gb_submitted';

const priorSubmit = localStorage.getItem(LS_KEY);
if (priorSubmit) {
  const formEl    = document.getElementById('gb-form');
  const successEl = document.getElementById('gb-success');
  const titleEl   = document.getElementById('gb-success-title');
  const bodyEl    = document.getElementById('gb-success-body');
  if (formEl)    formEl.style.display    = 'none';
  if (successEl) successEl.style.display = '';
  if (titleEl)   titleEl.textContent     = 'Message received!';
  if (bodyEl)    bodyEl.textContent      = "You've already left a message. Thank you!";
}

const form         = document.getElementById('gb-form')          as HTMLFormElement     | null;
const msgTextarea  = document.getElementById('gb-message')       as HTMLTextAreaElement | null;
const errorEl      = document.getElementById('gb-error')         as HTMLElement         | null;
const submitBtn    = document.getElementById('gb-submit')        as HTMLButtonElement   | null;
const successEl    = document.getElementById('gb-success')       as HTMLElement         | null;
const successTitle = document.getElementById('gb-success-title') as HTMLElement         | null;
const successBody  = document.getElementById('gb-success-body')  as HTMLElement         | null;

const nameInput      = document.getElementById('name-input')          as HTMLInputElement  | null;
const nameConfirmed  = document.getElementById('name-confirmed')      as HTMLElement       | null;
const nameConfirmTxt = document.getElementById('name-confirmed-text') as HTMLElement       | null;
const nameChangeBtn  = document.getElementById('name-change-btn')     as HTMLButtonElement | null;
const nameSuggestions= document.getElementById('name-suggestions')    as HTMLElement       | null;

if (!form || !nameInput || !msgTextarea) throw new Error('GuestbookForm: missing elements');

let confirmedName: string | null = null;
let searchTimer: ReturnType<typeof setTimeout>;

function confirmIdentity(name: string) {
  confirmedName = name;
  hideSuggestions();
  if (nameConfirmTxt) nameConfirmTxt.textContent = name;
  nameConfirmed?.classList.remove('hidden');
  nameInput!.classList.add('hidden');
}

function resetName() {
  confirmedName = null;
  nameConfirmed?.classList.add('hidden');
  nameInput!.classList.remove('hidden');
  nameInput!.value = '';
  nameInput!.focus();
  hideSuggestions();
}

nameChangeBtn?.addEventListener('click', resetName);

function hideSuggestions() { nameSuggestions?.classList.add('hidden'); }

function renderSuggestions(results: { id: string; name: string }[]) {
  if (!nameSuggestions) return;
  nameSuggestions.replaceChildren();

  if (!results.length) {
    const empty = document.createElement('div');
    empty.className   = 'name-suggestions-empty';
    empty.textContent = 'No guests found — continue with your typed name.';
    nameSuggestions.appendChild(empty);
  } else {
    results.forEach(r => {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'name-suggestion-item';
      btn.setAttribute('role', 'option');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = r.name;
      const hint = document.createElement('span');
      hint.className   = 'name-suggestion-confirm';
      hint.textContent = "That's me";
      btn.appendChild(nameSpan);
      btn.appendChild(hint);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        confirmIdentity(r.name);
      });
      nameSuggestions.appendChild(btn);
    });
  }
  nameSuggestions.classList.remove('hidden');
}

nameInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  confirmedName = null;
  const q = nameInput.value.trim();
  if (q.length < 2) { hideSuggestions(); return; }
  searchTimer = setTimeout(async () => {
    try {
      const res  = await fetch(`/api/guest/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { results: { id: string; name: string }[] };
      renderSuggestions(data.results ?? []);
    } catch {
      hideSuggestions();
    }
  }, 380);
});

nameInput.addEventListener('blur', () => { setTimeout(hideSuggestions, 180); });

function setLoading(on: boolean) {
  if (!submitBtn) return;
  submitBtn.disabled = on;
  submitBtn.classList.toggle('loading', on);
}

function showError(msg: string) {
  if (!errorEl) return;
  errorEl.textContent   = msg;
  errorEl.style.display = msg ? '' : 'none';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');

  const name    = confirmedName ?? nameInput.value.trim();
  const message = msgTextarea.value.trim();

  if (!name)    { showError('Please enter your name.');  nameInput.focus(); return; }
  if (!message) { showError('Please write a message.'); return; }

  setLoading(true);
  const { data, error } = await actions.submitGuestbookEntry({ name, message });
  setLoading(false);

  if (error) {
    if (error.code === 'CONFLICT') {
      showError("You've already left a message in the guestbook.");
    } else {
      showError('Something went wrong. Please try again.');
    }
    return;
  }

  localStorage.setItem(LS_KEY, '1');
  form.style.display = 'none';
  if (successEl)    successEl.style.display = '';
  if (successTitle) successTitle.textContent = data.verified ? 'Message published!' : 'Message received!';
  if (successBody) {
    successBody.textContent = data.verified
      ? 'Your message is now live on the guestbook. Thank you!'
      : 'Your message will appear after a quick review. Thank you!';
  }
});
