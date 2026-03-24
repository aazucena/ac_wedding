function setSize(size) {
  document.getElementById('flip-container').className = 'flip-container size-' + size;
  document.getElementById('btn-5x7').classList.toggle('active', size === '5x7');
  document.getElementById('btn-a4').classList.toggle('active',  size === 'a4');
  syncHeight();
}
window.setSize = setSize;

let flipped = false;
let pointerStartY = 0;
const fc = document.getElementById('flip-container');

fc.addEventListener('pointerdown', e => { pointerStartY = e.clientY; });
fc.addEventListener('click', e => {
  if (Math.abs(e.clientY - pointerStartY) > 6) return;
  flipped = !flipped;
  document.getElementById('flipper').classList.toggle('is-flipped', flipped);
  syncFaceBtns(flipped);
});

function showFace(face) {
  flipped = face === 'back';
  document.getElementById('flipper').classList.toggle('is-flipped', flipped);
  syncFaceBtns(flipped);
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
}
window.addEventListener('load', syncHeight);
