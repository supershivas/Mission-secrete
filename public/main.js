// ══ MAIN — init ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  startSplashRotation();
  initBgArtefacts();
  tryResume();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
