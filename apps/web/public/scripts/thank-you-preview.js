let currentFace = 'front';

function toggleFlip() {
  currentFace = currentFace === 'front' ? 'back' : 'front';
  syncUI();
}

function showFace(face) {
  currentFace = face;
  syncUI();
}

function setPaper(paper) {
  document.body.dataset.paper = paper;
  document.getElementById('btn5x7').classList.toggle('active',    paper === '5x7');
  document.getElementById('btnLetter').classList.toggle('active', paper === 'letter');
  document.getElementById('btnA4').classList.toggle('active',     paper === 'a4');
}

function syncUI() {
  const flipper  = document.getElementById('flipper');
  const btnFront = document.getElementById('btnFront');
  const btnBack  = document.getElementById('btnBack');
  if (!flipper || !btnFront || !btnBack) return;
  flipper.classList.toggle('is-flipped', currentFace === 'back');
  btnFront.classList.toggle('active', currentFace === 'front');
  btnBack.classList.toggle('active',  currentFace === 'back');
}
