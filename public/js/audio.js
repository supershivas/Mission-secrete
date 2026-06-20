// ══ AUDIO ENGINE — Web Audio API ══════════════════════
let audioCtx = null, ambientGain = null, _ambStop = true;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTypeSound() {
  try {
    const ctx = getAudioCtx(), buf = ctx.createBuffer(1, ctx.sampleRate * .04, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 400; f.Q.value = .8;
    const g = ctx.createGain(); g.gain.value = .15;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
  } catch(e) {}
}

function playRevealSound() {
  try {
    const ctx = getAudioCtx();
    [440, 554, 659].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      const t = ctx.currentTime + i * .12;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + .5);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .55);
    });
  } catch(e) {}
}

function playErrorSound() {
  try {
    const ctx = getAudioCtx();
    [220, 196].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = freq;
      const t = ctx.currentTime + i * .18;
      g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .25);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .3);
    });
  } catch(e) {}
}

function playTick(urgent) {
  try {
    const ctx = getAudioCtx(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = urgent ? 'square' : 'sine'; o.frequency.value = urgent ? 880 : 440;
    g.gain.setValueAtTime(.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .08);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .1);
  } catch(e) {}
}

function startAmbientMusic() {
  stopAmbientMusic();
  try {
    const ctx = getAudioCtx(), master = ctx.createGain();
    master.gain.value = 0; master.connect(ctx.destination); ambientGain = master;
    master.gain.setTargetAtTime(.28, ctx.currentTime, 1.5);
    [55, 82.4, 110].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = freq; g.gain.value = .08 / (i + 1); f.type = 'lowpass'; f.frequency.value = 200 + i * 80;
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value = .08 + i * .03; lfoG.gain.value = 1.5;
      lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start();
      o.connect(f); f.connect(g); g.connect(master); o.start();
    });
    const notes = [220, 233, 220, 196, 185, 196, 207, 220]; let ni = 0; _ambStop = false; const step = 60 / 160;
    function sched(t) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'square'; o.frequency.value = notes[ni++ % notes.length]; f.type = 'lowpass'; f.frequency.value = 800;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.04, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + step * .7);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + step);
      if (!_ambStop) setTimeout(() => sched(ctx.currentTime + .01), step * 1000 - 30);
    }
    sched(ctx.currentTime + .5);
  } catch(e) {}
}

function stopAmbientMusic() {
  _ambStop = true;
  if (ambientGain && audioCtx) { try { ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, .5); } catch(e) {} }
  ambientGain = null;
}

function playExplosion() {
  try {
    const ctx = getAudioCtx(), dur = 2.5, buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.5) * 1.2; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.value = 1;
    const sub = ctx.createOscillator(), subG = ctx.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(80, ctx.currentTime); sub.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1.2);
    subG.gain.setValueAtTime(.8, ctx.currentTime); subG.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 1.4);
    sub.connect(subG); subG.connect(ctx.destination); sub.start(); sub.stop(ctx.currentTime + 1.5);
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(); src.stop(ctx.currentTime + dur);
    setTimeout(() => { for (let i = 0; i < 6; i++) setTimeout(() => { try { const a = getAudioCtx(), o = a.createOscillator(), gv = a.createGain(); o.type = 'sawtooth'; o.frequency.value = i % 2 ? 800 : 960; gv.gain.setValueAtTime(.2, a.currentTime); gv.gain.exponentialRampToValueAtTime(.001, a.currentTime + .3); o.connect(gv); gv.connect(a.destination); o.start(); o.stop(a.currentTime + .35); } catch(e) {} }, i * 380); }, 600);
  } catch(e) {}
}

function playLaunchSound() {
  try {
    const ctx = getAudioCtx();
    // Trois notes descendantes
    [{f:440,t:0,d:.13},{f:330,t:.14,d:.13},{f:220,t:.28,d:.13}].forEach(({f,t,d}) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      const s = ctx.currentTime + t;
      g.gain.setValueAtTime(.14,s); g.gain.exponentialRampToValueAtTime(.001,s+d);
      o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s+d+.05);
    });
    // Impact grave
    const buf = ctx.createBuffer(1, ctx.sampleRate*.35, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i=0; i<d.length; i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.8);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const ff = ctx.createBiquadFilter(); ff.type='lowpass'; ff.frequency.value=140;
    const gv = ctx.createGain(); gv.gain.value=.75;
    src.connect(ff); ff.connect(gv); gv.connect(ctx.destination); src.start(ctx.currentTime+.42);
  } catch(e) {}
}

function playBriefingSound() {
  try {
    const ctx = getAudioCtx();
    // Drone grave
    const drone = ctx.createOscillator(), dg = ctx.createGain();
    drone.type = 'sawtooth'; drone.frequency.value = 55;
    dg.gain.setValueAtTime(0, ctx.currentTime);
    dg.gain.linearRampToValueAtTime(.1, ctx.currentTime + .5);
    dg.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 3);
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 180;
    drone.connect(flt); flt.connect(dg); dg.connect(ctx.destination); drone.start(); drone.stop(ctx.currentTime + 3);
    // Notes montantes
    [{f:110,t:.6,d:.35},{f:138,t:1.1,d:.35},{f:165,t:1.6,d:.6},{f:220,t:2.2,d:.9}].forEach(({f,t,d}) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const s = ctx.currentTime + t;
      g.gain.setValueAtTime(0,s); g.gain.linearRampToValueAtTime(.18,s+.06); g.gain.exponentialRampToValueAtTime(.001,s+d);
      o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s+d+.1);
    });
  } catch(e) {}
}

function playDecodeSound() {
  try {
    const ctx = getAudioCtx();
    for (let i = 0; i < 14; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 300 + Math.random() * 900;
      const t = ctx.currentTime + i * 0.075;
      g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .08);
    }
  } catch(e) {}
}

function playAccessGranted() {
  try {
    const ctx = getAudioCtx();
    [{f:523,t:0,d:.1},{f:659,t:.09,d:.1},{f:784,t:.18,d:.1},{f:1047,t:.27,d:.55}].forEach(({f,t,d}) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const s = ctx.currentTime + t;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.32, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + d);
      o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + d + .05);
    });
  } catch(e) {}
}

function playStampSound() {
  try {
    const ctx = getAudioCtx(), dur = .18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5) * .9;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280;
    const g = ctx.createGain(); g.gain.value = .85;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
  } catch(e) {}
}

function playFanfare() {
  try {
    const ctx = getAudioCtx();
    [{f:523.25,t:0,d:.18},{f:659.25,t:.18,d:.18},{f:783.99,t:.36,d:.18},{f:1046.5,t:.54,d:.45},{f:783.99,t:.72,d:.12},{f:1046.5,t:.84,d:.7}]
    .forEach(({f, t, d}) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      const s = ctx.currentTime + t;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.25, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + d);
      o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + d + .05);
    });
    [523.25, 659.25, 783.99].forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.06, ctx.currentTime + .54); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 1.6);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + .54); o.stop(ctx.currentTime + 1.7);
    });
  } catch(e) {}
}

function playVocalCountdown(n) {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(String(n));
    u.lang = 'fr-FR'; u.rate = 1.1; u.pitch = 0.75; u.volume = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch(e) {}
}

// ── Tension layers (compte à rebours évolutif) ─────────
let _tensionGain1 = null, _tensionGain2 = null, _tensionCtx = null;

function _startTensionLayer1() {
  if (_tensionGain1) return;
  try {
    const ctx = _tensionCtx || getAudioCtx();
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); _tensionGain1 = master;
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 6);
    // Pulsation basse rapide (4Hz LFO sur bruit filtré)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 180; flt.Q.value = 4;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 4; lfoG.gain.value = 0.055;
    lfo.connect(lfoG); lfoG.connect(src.playbackRate);
    src.connect(flt); flt.connect(master); src.start(); lfo.start();
    // Pulsation métallique grave
    const pulse = ctx.createOscillator(), pg = ctx.createGain();
    pulse.type = 'sawtooth'; pulse.frequency.value = 55;
    const plfo = ctx.createOscillator(), plfoG = ctx.createGain();
    plfo.frequency.value = 2; plfoG.gain.value = 0.03;
    plfo.connect(plfoG); plfoG.connect(pg.gain); plfo.start();
    const pf = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 120;
    pg.gain.value = 0.04; pulse.connect(pf); pf.connect(pg); pg.connect(master); pulse.start();
  } catch(e) {}
}

function _startTensionLayer2() {
  if (_tensionGain2) return;
  try {
    const ctx = _tensionCtx || getAudioCtx();
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); _tensionGain2 = master;
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    // Alarme sweep rapide (8Hz LFO sur oscillateur 440-880Hz)
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    const slfo = ctx.createOscillator(), slfoG = ctx.createGain();
    slfo.frequency.value = 8; slfoG.gain.value = 220;
    o.frequency.value = 660; slfo.connect(slfoG); slfoG.connect(o.frequency); slfo.start();
    const glfo = ctx.createOscillator(), glfoG = ctx.createGain();
    glfo.frequency.value = 8; glfoG.gain.value = 0.04;
    glfo.connect(glfoG); glfoG.connect(g.gain); glfo.start();
    g.gain.value = 0.0;
    const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800; f.Q.value=2;
    o.connect(f); f.connect(g); g.connect(master); o.start();
  } catch(e) {}
}

function _stopTensionLayers() {
  const ctx = audioCtx;
  if (!ctx) return;
  [_tensionGain1, _tensionGain2].forEach(g => {
    if (g) try { g.gain.setTargetAtTime(0, ctx.currentTime, 0.6); } catch(e) {}
  });
  _tensionGain1 = _tensionGain2 = null;
}

function updateAmbientIntensity() {
  if (!ambientGain || !audioCtx || !totalSeconds) return;
  _tensionCtx = audioCtx;
  const ratio = secondsLeft / totalSeconds;
  // Volume de base qui monte au fil du temps
  const extra = Math.max(0, (0.3 - ratio) / 0.3);
  const gain  = 0.28 + extra * 0.34;
  try { ambientGain.gain.setTargetAtTime(gain, audioCtx.currentTime, 2.5); } catch(e) {}
  // Couche tension 1 : <5 min (ratio < 0.083 sur 60min ou <5min absolu)
  if (secondsLeft <= 300 && secondsLeft > 60) _startTensionLayer1();
  // Couche tension 2 : <1 min
  if (secondsLeft <= 60) { _startTensionLayer1(); _startTensionLayer2(); }
}

// ── Challenge ambient loop (boucle pendant l'épreuve) ──
let _chalMaster = null, _chalStop = false;

function stopChallengeAmbientLoop() {
  _chalStop = true;
  if (_chalMaster && audioCtx) {
    try { _chalMaster.gain.setTargetAtTime(0, audioCtx.currentTime, 0.8); } catch(e) {}
    _chalMaster = null;
  }
}

function startChallengeAmbientLoop(animName) {
  stopChallengeAmbientLoop();
  _chalStop = false;
  try {
    const ctx = getAudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    _chalMaster = master;
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);

    if (animName === 'skull') {
      // Battement de cœur grave : deux coups toutes les ~1.1s
      const hb = () => {
        if (_chalStop || !_chalMaster) return;
        [0, 0.23].forEach(off => {
          try {
            const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/d.length * 14);
            const src = ctx.createBufferSource(); src.buffer = buf;
            const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=110;
            const g = ctx.createGain(); g.gain.value = 0.28;
            src.connect(f); f.connect(g); g.connect(master);
            src.start(ctx.currentTime + off);
          } catch(e) {}
        });
        setTimeout(hb, 1100);
      };
      hb();
      // Drone grave
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type='sawtooth'; o.frequency.value=41; f.type='lowpass'; f.frequency.value=90; g.gain.value=0.06;
      o.connect(f); f.connect(g); g.connect(master); o.start();

    } else if (animName === 'laser') {
      // Bourdonnement électrique : sinus 880Hz + trémolo rapide
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type='sine'; o.frequency.value=880;
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value=28; lfoG.gain.value=0.035;
      lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
      g.gain.value=0.04; o.connect(g); g.connect(master); o.start();
      // Sifflement haute fréquence
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type='sawtooth'; o2.frequency.value=1760; g2.gain.value=0.012;
      const f2 = ctx.createBiquadFilter(); f2.type='highpass'; f2.frequency.value=1500;
      o2.connect(f2); f2.connect(g2); g2.connect(master); o2.start();

    } else if (animName === 'garden') {
      // Vent : bruit filtré passe-bande qui ondule
      const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random()*2-1;
      const src = ctx.createBufferSource(); src.buffer=buf; src.loop=true;
      const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=600; f.Q.value=1.5;
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value=0.07; lfoG.gain.value=200;
      lfo.connect(lfoG); lfoG.connect(f.frequency); lfo.start();
      const g = ctx.createGain(); g.gain.value=0.07;
      src.connect(f); f.connect(g); g.connect(master); src.start();
      // Note douce résonnante (insectes)
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type='sine'; o.frequency.value=523;
      const olfo = ctx.createOscillator(), olfoG = ctx.createGain();
      olfo.frequency.value=5.2; olfoG.gain.value=3;
      olfo.connect(olfoG); olfoG.connect(o.frequency); olfo.start();
      og.gain.value=0.018; o.connect(og); og.connect(master); o.start();

    } else if (animName === 'poison') {
      // Drone acide grave + bullles aléatoires
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type='sawtooth'; o.frequency.value=82; f.type='lowpass'; f.frequency.value=160; g.gain.value=0.07;
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value=0.2; lfoG.gain.value=18;
      lfo.connect(lfoG); lfoG.connect(f.frequency); lfo.start();
      o.connect(f); f.connect(g); g.connect(master); o.start();
      // Bulles : petits pops filtrés graves aléatoires
      const bubble = () => {
        if (_chalStop || !_chalMaster) return;
        try {
          const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i=0; i<d.length; i++) d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*18);
          const src=ctx.createBufferSource(); src.buffer=buf;
          const ff=ctx.createBiquadFilter(); ff.type='bandpass'; ff.frequency.value=200+Math.random()*150; ff.Q.value=5;
          const gg=ctx.createGain(); gg.gain.value=0.15;
          src.connect(ff); ff.connect(gg); gg.connect(master); src.start();
        } catch(e) {}
        setTimeout(bubble, 300 + Math.random()*900);
      };
      bubble();
    }
  } catch(e) {}
}

function playChallengeAmbient(animName) {
  try {
    const ctx = getAudioCtx();
    const C = {
      skull:  { freqs:[55,73.4],      type:'sawtooth', dur:5.5, filterHz:160,  g:.07 },
      laser:  { freqs:[880,1320],     type:'sine',     dur:4,   filterHz:3000, g:.04 },
      garden: { freqs:[330,415,523],  type:'triangle', dur:5.5, filterHz:4000, g:.055 },
      poison: { freqs:[82,110,138.6], type:'sawtooth', dur:5.5, filterHz:260,  g:.07 },
      creeper:{ freqs:[110,138.6],    type:'square',   dur:4,   filterHz:400,  g:.05 },
      bloc:   { freqs:[220,277.2],    type:'triangle', dur:4.5, filterHz:1500, g:.055 },
    };
    const c = C[animName] || C.skull;
    c.freqs.forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      o.type = c.type; o.frequency.value = freq;
      f.type = 'lowpass'; f.frequency.value = c.filterHz;
      lfo.frequency.value = 0.1 + i * 0.06; lfoG.gain.value = freq * 0.035;
      lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start(); lfo.stop(ctx.currentTime + c.dur);
      const gl = c.g / (i + 1);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(gl, ctx.currentTime + 1.2);
      g.gain.setValueAtTime(gl, ctx.currentTime + c.dur - 1);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + c.dur);
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + c.dur);
    });
  } catch(e) {}
}

function playMorse(word) {
  try {
    const MORSE = {
      A:'·─',B:'─···',C:'─·─·',D:'─··',E:'·',F:'··─·',G:'──·',H:'····',
      I:'··',J:'·───',K:'─·─',L:'·─··',M:'──',N:'─·',O:'───',P:'·──·',
      Q:'──·─',R:'·─·',S:'···',T:'─',U:'··─',V:'···─',W:'·──',X:'─··─',
      Y:'─·──',Z:'──··',
      '0':'─────','1':'·────','2':'··───','3':'···──','4':'····─',
      '5':'·····','6':'─····','7':'──···','8':'───··','9':'────·'
    };
    const ctx = getAudioCtx();
    const freq = 660, dot = .08, dash = dot * 3, gap = dot, letterGap = dot * 3, wordGap = dot * 7;
    let t = ctx.currentTime + .1;
    word.toUpperCase().split('').forEach(ch => {
      if (ch === ' ') { t += wordGap; return; }
      const code = MORSE[ch]; if (!code) return;
      code.split('').forEach((sym, si) => {
        if (si > 0) t += gap;
        const dur = sym === '─' ? dash : dot;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(.4, t + .008);
        g.gain.setValueAtTime(.4, t + dur - .008);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + dur + .01);
        t += dur;
      });
      t += letterGap;
    });
  } catch(e) {}
}
