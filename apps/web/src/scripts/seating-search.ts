import { actions } from 'astro:actions';

type SeatPerson = { id: string; person: { first_name: string; last_name: string; preferred_name?: string | null } };
type SeatResult = {
  table:   { id: string; number: number; name?: string | null; section?: string | null };
  matched: SeatPerson[];
  others:  SeatPerson[];
};

declare global {
  interface Window {
    handleSeatSearch: () => Promise<void>;
  }
}

function displayName(person: SeatPerson['person']) {
  return `${person.preferred_name ?? person.first_name} ${person.last_name}`.trim();
}

function makeGuestRow(person: SeatPerson['person'], isMatch: boolean, showYouBadge: boolean) {
  const li = document.createElement('li');
  li.className = 'table-guest' + (isMatch ? ' table-guest--match' : '');

  if (isMatch) {
    const sym = document.createElement('span');
    sym.className = 'match-symbol';
    sym.textContent = '✦';
    sym.setAttribute('aria-hidden', 'true');
    li.appendChild(sym);
  }

  const nameEl = document.createElement('span');
  nameEl.className = 'guest-name';
  nameEl.textContent = displayName(person);
  li.appendChild(nameEl);

  if (isMatch && showYouBadge) {
    const badge = document.createElement('span');
    badge.className = 'you-badge';
    badge.textContent = 'you';
    li.appendChild(badge);
  }

  return li;
}

function renderTableCard(seat: SeatResult) {
  const card = document.createElement('div');
  card.className = 'table-card';

  const header = document.createElement('div');
  header.className = 'table-card-header';

  const numBlock = document.createElement('div');
  numBlock.className = 'table-num-block';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'table-eyebrow';
  eyebrow.textContent = 'Table';

  const num = document.createElement('span');
  num.className = 'table-num';
  num.textContent = String(seat.table.number);

  numBlock.append(eyebrow, num);
  header.appendChild(numBlock);

  if (seat.table.name || seat.table.section) {
    const infoBlock = document.createElement('div');
    infoBlock.className = 'table-info-block';
    if (seat.table.section) {
      const pill = document.createElement('span');
      pill.className = 'table-section-pill';
      pill.textContent = seat.table.section;
      infoBlock.appendChild(pill);
    }

    if (seat.table.name) {
      const nameEl = document.createElement('span');
      nameEl.className = 'table-name';
      nameEl.textContent = seat.table.name ?? '';
      infoBlock.appendChild(nameEl);
    }

    header.appendChild(infoBlock);
  }

  card.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'table-guest-list';

  const showYouBadge = seat.matched.length === 1;

  for (const m of seat.matched) {
    list.appendChild(makeGuestRow(m.person, true, showYouBadge));
  }

  for (const o of seat.others) {
    list.appendChild(makeGuestRow(o.person, false, false));
  }

  card.appendChild(list);
  return card;
}

function renderResults(seats: SeatResult[]) {
  const list    = document.getElementById('results-list')!;
  const section = document.getElementById('results-section')!;
  const label   = document.getElementById('results-label')!;

  list.replaceChildren();
  label.textContent = seats.length === 1
    ? "Here's your table assignment:"
    : `Found ${seats.length} tables — find your name below:`;

  seats.forEach(seat => list.appendChild(renderTableCard(seat)));
  section.style.display = 'block';
}

window.handleSeatSearch = async function () {
  const name    = (document.getElementById('name-input') as HTMLInputElement).value.trim();
  const btn     = document.getElementById('search-btn')!;
  const err     = document.getElementById('error-banner')!;
  const section = document.getElementById('results-section')!;

  err.textContent = '';
  err.classList.remove('visible');
  section.style.display = 'none';

  if (!name) {
    err.textContent = 'Please enter your name to search.';
    err.classList.add('visible');
    return;
  }

  btn.classList.add('loading');

  try {
    const { data, error } = await actions.findSeat({ name });

    if (error || !data?.seats?.length) {
      err.textContent = "We couldn't find your name in the seating chart. Try your first / last name only, or check with the couple.";
      err.classList.add('visible');
    } else {
      renderResults(data.seats);
    }
  } catch {
    err.textContent = 'Something went wrong. Please try again.';
    err.classList.add('visible');
  } finally {
    btn.classList.remove('loading');
  }
};

document.addEventListener('astro:page-load', () => {
  document.getElementById('name-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.handleSeatSearch();
  });
});
