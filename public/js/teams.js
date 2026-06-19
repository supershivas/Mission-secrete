// ══ TEAMS — formation des équipes ══════════════════════

function _activateTeamsPhase() {
  const shuffled = agents.slice().sort(() => Math.random() - .5);
  shuffled.forEach((a, i) => { a.team = i % 2 === 0 ? 'ombre' : 'cobra'; });
  _upgradeTeamHeaders();
  showTeamsFormationOverlay(() => {
    renderTeams();
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    document.getElementById('phase-teams').classList.add('active');
    currentPhase = 'phase-teams';
    animateTeamCards();
  });
}

function _upgradeTeamHeaders() {
  [['ombre','ÉQUIPE OMBRE','#00ff41'],['cobra','ÉQUIPE COBRA','#ff6b00']].forEach(([team, label, color]) => {
    const col = document.getElementById('team-' + team);
    if (!col || col.querySelector('.team-name')) return;
    const hdr = col.querySelector('.team-header');
    if (hdr) hdr.innerHTML = `<div class="team-name">${label}</div><div class="team-count" style="color:${color}">—</div>`;
  });
}

function showTeamsFormationOverlay(onDone) {
  let ov = document.getElementById('teams-formation-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'teams-formation-overlay';
    ov.innerHTML = `
      <div id="tfo-title">⬛ Formation des équipes</div>
      <div id="tfo-bar-track"><div id="tfo-bar-fill"></div></div>
      <div id="tfo-status">Assignation en cours…</div>`;
    document.body.appendChild(ov);
  }
  const fill = ov.querySelector('#tfo-bar-fill');
  const status = ov.querySelector('#tfo-status');
  fill.style.width = '0';
  ov.classList.remove('tfo-out');
  void ov.offsetWidth;
  ov.classList.add('show');
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = '100%'; }));
  const msgs = ['Analyse des profils…', 'Équilibrage des forces…', 'Assignation en cours…', 'Équipes constituées.'];
  let mi = 0;
  const mTmr = setInterval(() => { if (++mi < msgs.length) status.textContent = msgs[mi]; }, 380);
  setTimeout(() => {
    clearInterval(mTmr);
    status.textContent = '✓ Équipes prêtes.';
    setTimeout(() => {
      ov.classList.add('tfo-out');
      setTimeout(() => { ov.classList.remove('show', 'tfo-out'); onDone(); }, 380);
    }, 300);
  }, 1600);
}

function renderTeams() {
  ['ombre','cobra'].forEach(team => {
    const container = document.getElementById('cards-' + team);
    const teamAgents = agents.filter(a => a.team === team);
    const col = document.getElementById('team-' + team);
    const hdr = col && col.querySelector('.team-count');
    if (hdr) hdr.textContent = `${teamAgents.length} agent${teamAgents.length > 1 ? 's' : ''}`;
    container.innerHTML = teamAgents.map((a) => {
      const idx = agents.indexOf(a);
      return `<div class="agent-card" draggable="true"
        data-idx="${idx}"
        ondragstart="onDragStart(event,${idx})"
        ondragend="onDragEnd(event)"
        ontouchstart="onCardTouchStart(event,${idx})"
        ontouchmove="onCardTouchMove(event)"
        ontouchend="onCardTouchEnd(event,${idx})"
        onclick="onCardClick(event,${idx})">
        <div class="card-initial">${esc(a.realName[0].toUpperCase())}</div>
        <div class="card-info">
          <div class="card-real">${esc(a.realName)}</div>
          <div class="card-agent">${esc(a.agentName)}</div>
        </div>
      </div>`;
    }).join('');
  });
}

function animateTeamCards() {
  const PRE = 1800;
  const DELAY = 550;
  const cards = document.querySelectorAll('.agent-card');
  document.querySelectorAll('.team-header').forEach(h => h.classList.add('header-flash'));
  cards.forEach((c, i) => {
    c.style.opacity = '0';
    setTimeout(() => {
      c.style.opacity = '';
      c.classList.add('dropping');
      playStampSound();
    }, PRE + i * DELAY);
  });
  setTimeout(() => {
    document.querySelectorAll('.team-header').forEach(h => h.classList.remove('header-flash'));
    playRevealSound();
  }, PRE + cards.length * DELAY + 200);
}

// ── Drag & drop (mouse) ────────────────────────────────
function onDragStart(e, idx) {
  draggedAgent = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
function onDrop(e, team) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (draggedAgent === null) return;
  agents[draggedAgent].team = team;
  draggedAgent = null;
  playTypeSound(); renderTeams();
}

// ── Touch drag & drop (iPad) ───────────────────────────
let touchStartX = 0, touchStartY = 0, touchMoved = false, touchDragIdx = null;
let touchGhost = null;

function onCardTouchStart(e, idx) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchMoved = false;
  touchDragIdx = idx;
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  touchGhost = card.cloneNode(true);
  touchGhost.style.cssText = `position:fixed;z-index:100;pointer-events:none;opacity:0.85;width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;transition:none`;
  touchGhost.classList.add('dragging');
  document.body.appendChild(touchGhost);
}
function onCardTouchMove(e) {
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) { touchMoved = true; e.preventDefault(); }
  if (touchGhost) {
    touchGhost.style.left = (e.touches[0].clientX - touchGhost.offsetWidth/2) + 'px';
    touchGhost.style.top  = (e.touches[0].clientY - touchGhost.offsetHeight/2) + 'px';
  }
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
  const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
  const col = el && el.closest('.team-col');
  if (col) col.classList.add('drag-over');
}
function onCardTouchEnd(e, idx) {
  if (touchGhost) { touchGhost.remove(); touchGhost = null; }
  document.querySelectorAll('.team-col').forEach(c => c.classList.remove('drag-over'));
  if (!touchMoved) return;
  const touch = e.changedTouches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const col = el && el.closest('.team-col');
  if (col && touchDragIdx !== null) {
    agents[touchDragIdx].team = col.dataset.team;
    renderTeams();
  }
  touchDragIdx = null;
}
function onColTouchEnd(e, team) { /* handled by card touch end */ }

function onCardClick(e, idx) {
  if (touchMoved) return;
  agents[idx].team = agents[idx].team === 'ombre' ? 'cobra' : 'ombre';
  playTypeSound(); renderTeams();
}
