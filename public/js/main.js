// ══ MAIN — init ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const tapEl = document.getElementById('splash-tap');
  if (tapEl) { tapEl.textContent = '· chargement ·'; tapEl.style.animation = 'blink2 .6s step-end infinite'; }
  await pullConfigRemote();
  applyCfgToSplash();
  initTestMode();
  startSplashRotation();
  initBgArtefacts();
  if (tapEl) { tapEl.textContent = '▶ appuyer pour commencer'; tapEl.style.animation = ''; }
  tryResume();
  document.body.classList.add('hue-cycle');
});

function applyCfgToSplash() {
  const name = document.getElementById('splash-name');
  if (name) name.textContent = cfg.missionName || 'HELIE10';
  const dur = document.getElementById('splash-duration');
  if (dur) {
    const m = Math.round(cfg.duration / 60);
    dur.textContent = `Durée mission : ${m} min`;
  }
}

// Poll remote toutes les 15s
let _lastRemoteCfgHash = '';

function _cfgHash(data) {
  // Hash stable : exclure runtimeAgents (injection admin interne), normaliser l'ordre des clés
  const { runtimeAgents: _, ...rest } = data;
  rest.challenges = (rest.challenges || []).map(c => {
    const { runtimeAgents: __, ...ch } = c;
    return ch;
  });
  return JSON.stringify(rest, Object.keys(rest).sort());
}

setInterval(async () => {
  if (currentPhase === 'phase-success' || currentPhase === 'phase-explosion') return;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.challenges) return;
    const hash = _cfgHash(data);
    const isFirst = _lastRemoteCfgHash === '';
    if (hash === _lastRemoteCfgHash) return;
    _lastRemoteCfgHash = hash;
    localStorage.setItem('agent_config', JSON.stringify(data));
    reloadCfg();
    applyCfgToSplash();
    onCfgSync();
    if (!isFirst) showAdminSyncBanner();
  } catch(e) {}
}, 15000);

window.addEventListener('storage', e => {
  if (e.key === 'agent_config') {
    reloadCfg();
    applyCfgToSplash();
    onCfgSync();
    showAdminSyncBanner();
  }
});

function showAdminSyncBanner() {
  let b = document.getElementById('admin-sync-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'admin-sync-banner';
    b.textContent = '⬛ Config mise à jour depuis le backoffice';
    document.body.appendChild(b);
  }
  b.classList.add('visible');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('visible'), 3000);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
