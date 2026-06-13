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
