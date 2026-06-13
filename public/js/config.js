// ══ CONFIG PAR DÉFAUT ══════════════════════════════════
const DEFAULT_CFG = {
  missionName: "HELIE10",
  duration: 3600,
  message: `AGENTS, VOUS RECEVEZ UNE TRANSMISSION D'URGENCE.

Un des nôtres a été éliminé dans le QG.
Le corps a été retrouvé. La scène est intacte.

Un dispositif explosif a été activé par les
ennemis. Vous disposez d'une heure pour
résoudre l'affaire et le désamorcer.

Chaque épreuve vous révèlera un chiffre
du code de désarmement.

Ne perdez pas de temps, agents.

Bonne chance. Ce message s'autodétruira.`,
  challenges: [
    {
      title: "ÉPREUVE 1 — La scène de crime",
      brief: `Un agent a été éliminé. Son corps est marqué au sol.\n\nExaminez la scène à la lampe UV.\nUn message invisible a été laissé sur le scotch.\n\nDéchiffrez-le et entrez le code découvert.`,
      code: "TRAHISON", digit: "3",
      hint: "Le message est écrit directement sur le scotch. Éclairez de près avec la lampe UV en inclinant l'angle.",
      poison: false, teamPlay: false
    },
    {
      title: "ÉPREUVE 2 — Le couloir laser",
      brief: `Un couloir est protégé par un système laser.\n\nTraversez sans déclencher l'alarme.\nUne enveloppe vous attend de l'autre côté.\n\nRécupérez le code et entrez-le ici.`,
      code: "COBRA", digit: "7",
      hint: "Commencez par observer tous les fils avant de bouger. Passez le plus grand d'abord, puis enjambez les autres.",
      poison: false, teamPlay: false
    },
    {
      title: "ÉPREUVE 3 — L'agent de liaison",
      brief: `Un contact vous attend dans le jardin.\n\nIl a caché un message quelque part dehors.\nTrouvez-le, déchiffrez-le avec votre carnet.\n\nEntrez le code obtenu pour continuer.`,
      code: "JARDIN", digit: "1",
      hint: "Le message est caché près d'un endroit où les agents se cachent naturellement. Regardez sous les pots et derrière les plantes.",
      poison: false, teamPlay: false
    },
    {
      title: "ÉPREUVE 4 — Le poison",
      brief: `L'ennemi a élaboré un poison pour neutraliser nos agents.\n\nVous devez créer l'antidote en mélangeant les ingrédients dans le bon ordre.\n\nLa recette secrète est dans votre sachet.\nMélangez, goûtez, et entrez le code de validation.`,
      code: "ANTIDOTE", digit: "9",
      hint: "Relisez bien la recette dans l'ordre. Le code de validation est écrit en bas de la fiche recette.",
      poison: true, teamPlay: false
    }
  ]
};

function getCfg() {
  try {
    const s = localStorage.getItem('agent_config');
    if (!s) return DEFAULT_CFG;
    const stored = JSON.parse(s);
    const chs = (stored.challenges || DEFAULT_CFG.challenges).map((c, i) => ({
      ...(DEFAULT_CFG.challenges[i] || {}), ...c
    }));
    return { missionName: stored.missionName || DEFAULT_CFG.missionName, duration: stored.duration || DEFAULT_CFG.duration, message: stored.message || DEFAULT_CFG.message, challenges: chs };
  } catch(e) { return DEFAULT_CFG; }
}

let cfg = getCfg();
function reloadCfg() { cfg = getCfg(); }

// ── Remote sync (via /api/config) ──────────────────────
async function pullConfigRemote() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return false;
    const data = await res.json();
    if (!data?.challenges) return false;
    localStorage.setItem('agent_config', JSON.stringify(data));
    reloadCfg();
    return true;
  } catch(e) { return false; }
}

async function pushConfigRemote(cfgData) {
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfgData)
    });
    return res.ok;
  } catch(e) { return false; }
}
