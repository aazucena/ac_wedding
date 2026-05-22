let currentFace = "front";

function toggleFlip() {
  currentFace = currentFace === "front" ? "back" : "front";
  syncUI();
}

function showFace(face) {
  currentFace = face;
  syncUI();
}

function syncUI() {
  const flipper = document.getElementById("flipper");
  const btnFront = document.getElementById("btnFront");
  const btnBack = document.getElementById("btnBack");
  if (!flipper || !btnFront || !btnBack) return;
  flipper.classList.toggle("is-flipped", currentFace === "back");
  btnFront.classList.toggle("active", currentFace === "front");
  btnBack.classList.toggle("active", currentFace === "back");
}
