export type GuestEntry = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  type: string;
};

export type PlusOneEntry = {
  tempId: string;
  firstName: string;
  lastName: string;
};

export function buildReview(
  guestList: GuestEntry[],
  plusOnes: PlusOneEntry[],
  guestResponse: Record<string, string | null>,
  anyAttending: () => boolean,
  onEdit: (step: number) => void,
): void {
  var content = document.getElementById('review-content');
  if (!content) return;
  content.replaceChildren();

  function makeEditBtn(step: number): HTMLButtonElement {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'review-edit';
    btn.textContent = 'Edit';
    btn.addEventListener('click', function() { onEdit(step); });
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

  guestList.forEach(function(g) {
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

  // Plus-one guests
  plusOnes.forEach(function(po) {
    var poCard = document.createElement('div');
    poCard.className = 'review-guest-card';

    var poHeader = document.createElement('div');
    poHeader.className = 'review-guest-header';

    var poName = document.createElement('span');
    poName.className = 'review-guest-name';
    poName.textContent = (po.lastName ? po.firstName + ' ' + po.lastName : po.firstName) + ' ✦';

    var isAttending = guestResponse[po.tempId] === 'attending';
    var poBadge = document.createElement('span');
    poBadge.className = 'review-badge ' + (isAttending ? 'review-badge--yes' : 'review-badge--no');
    poBadge.textContent = isAttending ? 'Attending' : 'Not attending';

    poHeader.appendChild(poName); poHeader.appendChild(poBadge);
    poCard.appendChild(poHeader);

    if (isAttending) {
      var atTypeEl = document.querySelector<HTMLInputElement>('input[name="attendance_type_' + po.tempId + '"]:checked');
      var atType   = atTypeEl?.value ?? 'both';
      var atLabel  = atType === 'both' ? 'Ceremony & Reception' : atType === 'ceremony' ? 'Ceremony Only' : 'Reception Only';
      var dietary  = ((document.getElementById('dietary-' + po.tempId) as HTMLTextAreaElement | null)?.value ?? '').trim();

      var detailRow = document.createElement('div');
      detailRow.className = 'review-guest-details';
      var atPill = document.createElement('span');
      atPill.className = 'review-guest-pill'; atPill.textContent = atLabel;
      detailRow.appendChild(atPill);
      poCard.appendChild(detailRow);

      if (dietary) {
        var dietEl = document.createElement('p');
        dietEl.className = 'review-guest-dietary'; dietEl.textContent = dietary;
        poCard.appendChild(dietEl);
      }
    }

    guestCards.appendChild(poCard);
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
