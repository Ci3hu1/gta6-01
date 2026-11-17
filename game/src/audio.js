// Solmar Bay — sound. All WebAudio, synthesised, no audio files: a two-note siren,
// engine hum that follows speed, gunshot noise, pickup chimes, and a simple bass
// loop (Solmar FM) that starts on the first user gesture.
export function createAudio() {
  let ctx = null;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let enabled = true;
  const notes = [110, 130.81, 98, 146.83, 110, 164.81, 98, 130.81];
  let noteIndex = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (!ensure() || !enabled) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* audio is decoration, never fatal */ }
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    shoot() { beep(900, 0.09, 'square', 0.12, 180); },
    pickup() { beep(660, 0.12, 'sine', 0.1); setTimeout(() => beep(990, 0.16, 'sine', 0.1), 90); },
    siren() { beep(700, 0.35, 'sine', 0.05, 950); setTimeout(() => beep(950, 0.35, 'sine', 0.05, 700), 360); },
    crash() { beep(120, 0.25, 'sawtooth', 0.14, 50); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.1), i * 110)); },
    engine(speed01) {
      if (!ensure() || !engineOsc) return;
      try {
        engineGain.gain.value = speed01 > 0.02 ? 0.02 + speed01 * 0.03 : 0;
        engineOsc.frequency.value = 45 + speed01 * 90;
      } catch { /* ignore */ }
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = setInterval(() => {
        if (!enabled || document.hidden) return;
        beep(notes[noteIndex % notes.length], 0.5, 'triangle', 0.05);
        noteIndex += 1;
      }, 420);
    },
    toggle() { enabled = !enabled; return enabled; },
  };
}
