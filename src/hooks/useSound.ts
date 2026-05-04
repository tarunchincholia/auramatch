import { useCallback, useRef } from "react";

// All sounds synthesized with Web Audio API — no external files needed

function createCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

type SoundName =
  | "countdown_beep"
  | "countdown_urgent"
  | "win"
  | "loss"
  | "steal"
  | "reaction"
  | "floor_warning"
  | "match_found"
  | "button_click";

export function useSound(enabled: boolean = true) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (!enabled) return null;
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = createCtx();
    }
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, [enabled]);

  const play = useCallback(
    (name: SoundName) => {
      const ctx = getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (name) {
        case "countdown_beep": {
          // Soft tick: 880 Hz, short sine
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }

        case "countdown_urgent": {
          // Urgent double-beep: higher pitch, louder
          [0, 0.12].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "square";
            osc.frequency.setValueAtTime(1200, now + offset);
            gain.gain.setValueAtTime(0.12, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
            osc.start(now + offset);
            osc.stop(now + offset + 0.07);
          });
          break;
        }

        case "win": {
          // Ascending arpeggio: C-E-G-C
          const freqs = [523.25, 659.25, 783.99, 1046.5];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.22, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.35);
          });
          break;
        }

        case "steal": {
          // Playful swoop up + sparkle
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
          // sparkle on top
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          osc2.connect(g2);
          g2.connect(ctx.destination);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(2000, now + 0.3);
          g2.gain.setValueAtTime(0.1, now + 0.3);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc2.start(now + 0.3);
          osc2.stop(now + 0.55);
          break;
        }

        case "loss": {
          // Descending minor: sad wah-wah
          const freqs = [523.25, 415.3, 349.23, 261.63];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.18, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.28);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.3);
          });
          break;
        }

        case "reaction": {
          // Quick pop: short noise burst
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }

        case "floor_warning": {
          // Low rumble pulse
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(80, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.setValueAtTime(0.2, now + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }

        case "match_found": {
          // Dramatic two-tone hit
          [220, 440].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.45);
          });
          break;
        }

        case "button_click": {
          // Subtle UI click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
      }
    },
    [getCtx]
  );

  return { play };
}
