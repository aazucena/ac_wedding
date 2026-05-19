import confetti from 'canvas-confetti';

function launchConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confetti({
    particleCount: 160,
    spread: 90,
    origin: { y: 0.4 },
    colors: ['#A8D4B8', '#C5B8E0', '#fdfaf7', '#f4c2c2', '#fde68a'],
  });
}

window.addEventListener('astro:page-load', () => setTimeout(() => launchConfetti(), 600));
(window as any).__launchConfetti = launchConfetti;
