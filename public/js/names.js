// ══ NAMES — recrutement des agents ═════════════════════

const ADJ_ALL = [
  "ACIER","AIGLE","ARGENT","BLIZZARD","BRONZE","COBRA","CYCLONE","DAUPHIN",
  "DRAGON","ÉCLAIR","FANTÔME","FURTIF","GLACIAL","GRIFFON","HIBOU","INVINCIBLE",
  "JADE","KRAKEN","LOUP","LYNX","MERCURE","MYSTÈRE","NOIR","OMBRE","PYTHON",
  "PUMA","RAPIDE","RENARD","ROUGE","SILENCIEUX","SPECTRE","TITAN","TORNADE",
  "URANIUM","VIPÈRE","ZÉNITH",
  // Clins d'œil Minecraft
  "CREEPER","ENDERMAN","WARDEN","BLAZE","GHAST","HEROBRINE","ZOMBIE","SKELETON",
  "ENDER","NETHER","OBSIDIAN","REDSTONE","DIAMOND","LICH"
];

function normalizeChar(c) {
  return c.normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
}

function proposalsForLetter(letter) {
  const l = normalizeChar(letter);
  const matching = ADJ_ALL.filter(a => normalizeChar(a[0]) === l);
  const adjPool = matching.length >= 1
    ? [...matching.sort(() => Math.random()-.5), ...ADJ_ALL.filter(a => normalizeChar(a[0]) !== l).sort(() => Math.random()-.5)]
    : ADJ_ALL.slice().sort(() => Math.random()-.5);
  const used = new Set(agents.map(a => a.agentName));
  const result = [];
  let tries = 0;
  while (result.length < 3 && tries < 300) {
    tries++;
    const adj = adjPool[tries % adjPool.length];
    const name = `AGENT ${adj}`;
    if (!used.has(name) && !result.includes(name)) result.push(name);
  }
  return result;
}

function showProposals() {
  const input = document.getElementById('recruit-input');
  const name = input.value.trim();
  if (!name) return;
  currentRealName = name;
  currentProposals = proposalsForLetter(name[0]);
  const container = document.getElementById('recruit-proposals');
  document.getElementById('recruit-hint').textContent = 'Scan identité en cours…';
  if (scanTmr) { clearInterval(scanTmr); scanTmr = null; }
  container.innerHTML = `<div class="proposals-label">Analyse : <strong>${esc(name)}</strong></div><div class="scan-names" id="scan-names">—</div>`;
  let sc = 0; const max = 22;
  scanTmr = setInterval(() => {
    const adj = ADJ_ALL[Math.floor(Math.random()*ADJ_ALL.length)];
    const el = document.getElementById('scan-names'); if (el) el.textContent = `AGENT ${adj}`;
    playTypeSound(); sc++;
    if (sc >= max) {
      clearInterval(scanTmr); scanTmr = null;
      container.innerHTML = `<div class="proposals-label">Choisir un nom de code pour <strong>${esc(name)}</strong> :</div>` +
        currentProposals.map(p => `<button class="proposal-btn" onclick="pickProposal('${p}')">${p}</button>`).join('') +
        `<button class="btn dim" style="font-size:11px;padding:.35rem .9rem;margin-top:.3rem;letter-spacing:.15em" onclick="cancelProposal()">← changer de prénom</button>`;
      document.getElementById('recruit-hint').textContent = 'Choisissez un nom de code.';
    }
  }, 72);
}

function pickProposal(agentName) {
  const realName = currentRealName;
  agents.push({ realName, agentName, team: null });
  resetRecruitForm();
  showAgentReveal(realName, agentName, () => {
    renderRecruitList();
    const badges = document.querySelectorAll('.recruit-badge');
    if (badges.length) badges[badges.length-1].classList.add('stamp-in');
  });
}

function showAgentReveal(realName, agentName, onDone) {
  let ov = document.getElementById('agent-reveal-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'agent-reveal-overlay';
    ov.innerHTML = '<div id="aro-badge">⬛ Agent recruté</div><div id="aro-name">—</div><div id="aro-sep"></div><div id="aro-real"></div>';
    document.body.appendChild(ov);
  }
  document.getElementById('aro-real').textContent = realName.toUpperCase();
  const nameEl = document.getElementById('aro-name');
  nameEl.textContent = '—';
  ov.classList.remove('show', 'fade-out');
  void ov.offsetWidth;
  ov.classList.add('show');
  playStampSound();
  setTimeout(() => matrixName(nameEl, agentName, () => playRevealSound()), 250);
  setTimeout(() => {
    ov.classList.add('fade-out');
    setTimeout(() => { ov.classList.remove('show', 'fade-out'); if (onDone) onDone(); }, 420);
  }, 2900);
}

function matrixName(el, finalName, onDone) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const len = finalName.length;
  let frame = 0; const total = 32;
  const tmr = setInterval(() => {
    let r = '';
    for (let i = 0; i < len; i++) {
      if (finalName[i] === ' ') { r += ' '; continue; }
      r += frame >= Math.floor(total * 0.45 + i * 0.85) ? finalName[i] : alpha[Math.floor(Math.random() * alpha.length)];
    }
    el.textContent = r; frame++;
    if (frame >= total + len) { clearInterval(tmr); el.textContent = finalName; if (onDone) onDone(); }
  }, 58);
}

function cancelProposal() {
  if (scanTmr) { clearInterval(scanTmr); scanTmr = null; }
  currentRealName = '';
  currentProposals = [];
  document.getElementById('recruit-proposals').innerHTML = '';
  document.getElementById('recruit-input').value = '';
  document.getElementById('recruit-input').focus();
  document.getElementById('recruit-hint').textContent =
    agents.length === 0 ? 'Entrez un prénom pour générer des noms de code.' : 'Ajoutez un autre agent ou formez les équipes.';
}

function resetRecruitForm() {
  currentRealName = '';
  currentProposals = [];
  document.getElementById('recruit-input').value = '';
  document.getElementById('recruit-proposals').innerHTML = '';
  document.getElementById('recruit-hint').textContent =
    agents.length === 0 ? 'Entrez un prénom pour générer des noms de code.' : 'Ajoutez un autre agent ou formez les équipes.';
  document.getElementById('recruit-input').blur();
}

function renderRecruitList() {
  const wrap = document.getElementById('recruit-list-wrap');
  const list = document.getElementById('recruit-list');
  if (agents.length === 0) { wrap.style.display = 'none'; }
  else {
    wrap.style.display = 'block';
    list.innerHTML = agents.map((a,i) =>
      `<div class="recruit-badge">
        <div class="badge-initial">${esc(a.realName[0].toUpperCase())}</div>
        <div class="badge-info">
          <div class="badge-real">${esc(a.realName)}</div>
          <div class="badge-agent">${esc(a.agentName)}</div>
        </div>
        <button class="recruit-del" onclick="removeAgent(${i})" title="Supprimer">✕</button>
      </div>`
    ).join('') + (agents.length >= 2
      ? `<div class="dossier-complet">✓ ${agents.length} agent${agents.length>1?'s':''} recrutés — dossier complet</div>`
      : '');
  }
  document.getElementById('add-agent-btn').style.display  = agents.length > 0 ? 'inline-block' : 'none';
  document.getElementById('form-teams-btn').style.display = agents.length >= 2 ? 'inline-block' : 'none';
}

function removeAgent(i) {
  agents.splice(i, 1);
  renderRecruitList();
}
