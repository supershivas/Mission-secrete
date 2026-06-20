// ══ SESSION — persistance au refresh et fermeture PWA ═══
// Utilise localStorage avec TTL 4h (survit à la fermeture de l'app iPad)

const SESSION_KEY = 'agent_mission_state';
const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 heures

function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      phase:            currentPhase,
      currentChallenge: currentChallenge,
      revealedDigits:   revealedDigits,
      challengeRoles:   _challengeRoles,
      agents:           agents,
      secondsLeft:      secondsLeft,
      totalSeconds:     totalSeconds,
      missionStart:     missionStart,
      savedAt:          Date.now(),
    }));
  } catch(e) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Expirer après 4h (session trop vieille = plus pertinente)
    if (!s.savedAt || Date.now() - s.savedAt > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    // Compenser le temps écoulé depuis la sauvegarde
    if (s.missionStart && s.secondsLeft > 0) {
      const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
      s.secondsLeft = Math.max(0, s.secondsLeft - elapsed);
    }
    return s;
  } catch(e) { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
}

// Phases où la session a du sens (pas splash, pas names)
const RESUMABLE_PHASES = ['phase-challenge', 'phase-reveal', 'phase-countdown', 'phase-message', 'phase-pause'];
