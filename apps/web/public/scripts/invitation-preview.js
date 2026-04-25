const fc           = document.getElementById('flip-container');
const insertCard   = document.getElementById('insert-container');
const btnInsert    = document.getElementById('btn-insert');

function setSize(size) {
  fc.className = 'flip-container size-' + size;
  if (insertCard) insertCard.className = 'insert-container size-' + size;
  document.body.classList.remove('size-5x7', 'size-a4');
  document.body.classList.add('size-' + size);
  document.getElementById('btn-5x7').classList.toggle('active', size === '5x7');
  document.getElementById('btn-a4').classList.toggle('active',  size === 'a4');
  syncHeight();
}
window.setSize = setSize;

let flipped = false;
let showingInsert = false;
let pointerStartY = 0;

fc.addEventListener('pointerdown', e => { pointerStartY = e.clientY; });
fc.addEventListener('click', e => {
  if (showingInsert) return;
  if (Math.abs(e.clientY - pointerStartY) > 6) return;
  flipped = !flipped;
  document.getElementById('flipper').classList.toggle('is-flipped', flipped);
  syncFaceBtns(flipped);
});

function showFace(face) {
  if (face === 'insert') {
    showingInsert = true;
    fc.style.display = 'none';
    if (insertCard) {
      insertCard.style.display = '';
      insertCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (btnInsert) btnInsert.classList.add('active');
    document.getElementById('btn-front').classList.remove('active');
    document.getElementById('btn-back').classList.remove('active');
    return;
  }
  // Showing front or back — restore the flip container
  showingInsert = false;
  fc.style.display = '';
  if (insertCard) insertCard.style.display = 'none';
  flipped = face === 'back';
  document.getElementById('flipper').classList.toggle('is-flipped', flipped);
  syncFaceBtns(flipped);
  if (btnInsert) btnInsert.classList.remove('active');
}
window.showFace = showFace;

function syncFaceBtns(f) {
  document.getElementById('btn-front').classList.toggle('active', !f);
  document.getElementById('btn-back').classList.toggle('active',   f);
}

function syncHeight() {
  const flipper = document.getElementById('flipper');
  const front   = flipper.querySelector('.face.front');
  const back    = flipper.querySelector('.face.back');
  const was = flipper.classList.contains('is-flipped');
  flipper.style.transition = 'none';
  flipper.classList.remove('is-flipped');
  back.style.transform = 'none';
  back.style.visibility = 'hidden';
  const h = Math.max(front.scrollHeight, back.scrollHeight);
  back.style.transform = '';
  back.style.visibility = '';
  if (was) flipper.classList.add('is-flipped');
  requestAnimationFrame(() => { flipper.style.transition = ''; });
  fc.style.height = h + 'px';
  if (insertCard) insertCard.style.height = h + 'px';
}

// On load: hide the insert card on screen (print will show all); init heights
window.addEventListener('load', () => {
  document.body.classList.add('size-5x7');
  if (insertCard && !window.matchMedia('print').matches) {
    insertCard.style.display = 'none';
  }
  syncHeight();
});
