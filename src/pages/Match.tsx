import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuraGame } from "../hooks/useAuraGame";
import { useWebRTC } from "../hooks/useWebRTC";
import { useSound } from "../hooks/useSound";
import { Ghost, X, SkipForward, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppSettings } from "../hooks/useSettings";

interface MatchProps {
  onBack: () => void;
  settings: AppSettings;
}

const EMOJIS = ["🔥", "💀", "😎", "🧠", "😂"];

const CONFETTI_COLORS = [
  "#a855f7", "#ec4899", "#3b82f6", "#4ade80",
  "#facc15", "#f97316", "#06b6d4", "#ffffff",
];

interface Particle { id: number; x: number; color: string; size: number; duration: number; delay: number; rotation: number; shape: "rect" | "circle" | "star"; }
interface BurstEmoji { id: number; emoji: string; bx: string; by: string; br: string; delay: number; }
interface FloatingReaction { id: number; emoji: string; x: number; }

function WinCelebration() {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 10 + 6, duration: Math.random() * 2 + 2.5, delay: Math.random() * 1.2,
      rotation: Math.random() * 360, shape: (["rect", "circle", "star"] as const)[Math.floor(Math.random() * 3)],
    })), []);

  const bursts = useMemo<BurstEmoji[]>(() =>
    ["🔥", "🔥", "✨", "💥", "⚡", "🌟", "🔥", "✨"].map((emoji, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 140 + Math.random() * 80;
      return { id: i, emoji, bx: `calc(-50% + ${Math.cos(angle) * dist}px)`, by: `calc(-50% + ${Math.sin(angle) * dist}px)`, br: `${Math.random() * 360}deg`, delay: i * 0.06 };
    }), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.9) 0%, rgba(74,222,128,0.4) 40%, transparent 70%)", animation: "win-flash 1.2s ease-out forwards" }} />
      {particles.map((p) => (
        <div key={p.id} className="absolute top-0" style={{ left: `${p.x}%`, width: p.shape === "circle" ? p.size : p.size * 1.4, height: p.shape === "circle" ? p.size : p.size * 0.6, backgroundColor: p.color, borderRadius: p.shape === "circle" ? "50%" : "2px", clipPath: p.shape === "star" ? "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" : undefined, transform: `rotate(${p.rotation}deg)`, boxShadow: `0 0 6px ${p.color}`, animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards` }} />
      ))}
      <div className="absolute top-1/2 left-1/2">
        {bursts.map((b) => (
          <div key={b.id} className="absolute text-4xl" style={{ top: "50%", left: "50%", "--bx": b.bx, "--by": b.by, "--br": b.br, animation: `burst-out 0.9s ${b.delay}s cubic-bezier(0.22,1,0.36,1) forwards`, opacity: 0 } as React.CSSProperties}>{b.emoji}</div>
        ))}
      </div>
    </div>
  );
}

function LossCelebration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.7) 0%, transparent 65%)", animation: "win-flash 1s ease-out forwards" }} />
    </div>
  );
}

export default function Match({ onBack, settings }: MatchProps) {
  const { score, streak, title, recordResult } = useAuraGame();
  const { state, localStream, remoteStream, twist, battleTick, battleResult, joinQueue, skip, disconnect } = useWebRTC();
  const { play } = useSound(settings.soundEnabled);

  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [prevMyScore, setPrevMyScore] = useState(100);
  const [prevTheirScore, setPrevTheirScore] = useState(100);
  const [myScoreDelta, setMyScoreDelta] = useState(0);
  const [theirScoreDelta, setTheirScoreDelta] = useState(0);
  const [resultApplied, setResultApplied] = useState(false);
  const [matchOutcome, setMatchOutcome] = useState<{ result: "win" | "loss" | "steal"; delta: number } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const reactionIdRef = useRef(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const lastTimeLeft = useRef(30);

  useEffect(() => { joinQueue(); return () => { disconnect(); }; }, []);
  useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);

  // Match found sound
  useEffect(() => { if (state === "matched") play("match_found"); }, [state]);

  // Countdown beep sounds
  useEffect(() => {
    if (state !== "battle") return;
    const t = battleTick.timeLeft;
    const prev = lastTimeLeft.current;
    lastTimeLeft.current = t;
    if (t <= 0) return;

    const crossed = (threshold: number) => prev > threshold && t <= threshold;
    if (t <= 10 && Math.floor(prev) !== Math.floor(t)) {
      play(t <= 5 ? "countdown_urgent" : "countdown_beep");
    } else if (crossed(30) || crossed(20) || crossed(15)) {
      play("countdown_beep");
    }
  }, [battleTick.timeLeft, state, play]);

  useEffect(() => {
    if (state !== "battle") return;
    const myDelta = battleTick.myScore - prevMyScore;
    const theirDelta = battleTick.theirScore - prevTheirScore;
    if (myDelta !== 0) setMyScoreDelta(myDelta);
    if (theirDelta !== 0) setTheirScoreDelta(theirDelta);
    setPrevMyScore(battleTick.myScore);
    setPrevTheirScore(battleTick.theirScore);
    const t = setTimeout(() => { setMyScoreDelta(0); setTheirScoreDelta(0); }, 400);
    return () => clearTimeout(t);
  }, [battleTick]);

  useEffect(() => {
    if (battleResult && !resultApplied) {
      setResultApplied(true);
      const outcome = recordResult(battleResult.won ? "win" : "loss", twist);
      setMatchOutcome({ result: outcome.result, delta: outcome.delta });
      setShowCelebration(true);
      // Play result sound
      if (outcome.result === "steal") play("steal");
      else if (outcome.result === "win") play("win");
      else play("loss");
      setTimeout(() => setShowCelebration(false), 3500);
    }
  }, [battleResult, resultApplied, twist]);

  const addReaction = useCallback((emoji: string) => {
    const id = reactionIdRef.current++;
    play("reaction");
    setReactions((prev) => [...prev, { id, emoji, x: Math.random() * 75 + 10 }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 1200);
  }, [play]);

  const handleNext = useCallback(() => {
    setResultApplied(false);
    setMatchOutcome(null);
    setShowCelebration(false);
    setPrevMyScore(100);
    setPrevTheirScore(100);
    lastTimeLeft.current = 30;
    joinQueue();
  }, [joinQueue]);

  const handleSkip = useCallback(() => {
    setResultApplied(false);
    setMatchOutcome(null);
    skip();
    onBack();
  }, [skip, onBack]);

  const timePercent = Math.max(0, (battleTick.timeLeft / 30) * 100);
  const myLeading = battleTick.myScore > battleTick.theirScore;
  const isWin = matchOutcome?.result === "win" || matchOutcome?.result === "steal";

  // Floor warning during battle
  const nearFloor = score <= 30;

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col" data-testid="match-screen">

      {/* ── CONNECTING ── */}
      <AnimatePresence>
        {(state === "connecting" || state === "waiting") && (
          <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
            <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.6 }}
              className="w-28 h-28 rounded-full border-4 border-purple-500 flex items-center justify-center mb-8 shadow-[0_0_40px_#a855f7]">
              <Ghost className="w-12 h-12 text-purple-400" />
            </motion.div>
            <h2 className="text-2xl font-bold font-mono text-purple-400 mb-2 tracking-widest uppercase">Connecting to aura…</h2>
            <p className="text-zinc-500 text-sm font-mono">Scanning presence in the void</p>
            <Button variant="ghost" onClick={onBack} className="mt-12 text-zinc-400 hover:text-white" data-testid="btn-cancel">
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AURA SCAN ── */}
      <AnimatePresence>
        {state === "matched" && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_20px_#a855f7] animate-scan-line" />
            <motion.div animate={{ boxShadow: ["0 0 20px #a855f7", "0 0 60px #a855f7", "0 0 20px #a855f7"] }} transition={{ repeat: Infinity, duration: 1.2 }}
              className="bg-black border border-purple-500/60 rounded-2xl p-8 max-w-sm mx-6 text-center">
              <p className="text-purple-400 font-mono text-xs uppercase tracking-widest mb-3">Twist Rule</p>
              <p className="text-3xl font-bold text-white mb-6">{twist || "Vibe check"}</p>
              <p className="text-zinc-500 text-sm font-mono">Aura scan in progress…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESULT OVERLAY ── */}
      <AnimatePresence>
        {state === "result" && matchOutcome && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center px-6 overflow-hidden"
            data-testid="result-overlay">
            {showCelebration && settings.confettiEnabled && (isWin ? <WinCelebration /> : <LossCelebration />)}
            <div className={`absolute inset-0 animate-pulse-bg pointer-events-none ${isWin ? "bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,1)_0%,transparent_65%)]" : "bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,1)_0%,transparent_65%)]"}`} />
            <div className={`relative z-20 text-center mb-6 ${!isWin ? "animate-screen-shake" : ""}`}>
              <div className={`text-6xl md:text-8xl font-black font-mono uppercase tracking-tighter leading-none mb-3 ${isWin ? "text-green-400 animate-neon-glow-green animate-win-title" : "text-red-500 animate-loss-title"}`} data-testid="result-text">
                {matchOutcome.result === "win" && "AURA WON 🔥"}
                {matchOutcome.result === "loss" && "AURA LOST 💀"}
                {matchOutcome.result === "steal" && "AURA STOLEN 😈"}
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: "spring", bounce: 0.6 }}
                className={`text-4xl font-mono font-bold ${matchOutcome.delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {matchOutcome.delta >= 0 ? "+" : ""}{matchOutcome.delta} Aura
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="relative z-20 flex gap-4 mb-6 items-stretch">
              <div className={`text-center rounded-xl px-6 py-3 border ${isWin ? "bg-green-500/10 border-green-500/40 shadow-[0_0_16px_rgba(74,222,128,0.3)]" : "bg-zinc-900 border-zinc-700"}`}>
                <p className="text-[10px] font-mono text-zinc-400 uppercase mb-1">You</p>
                <p className="text-2xl font-mono font-bold text-white">{battleResult?.myFinalScore ?? 100}</p>
              </div>
              <div className="flex items-center text-zinc-600 font-mono font-bold text-lg">⚔️</div>
              <div className={`text-center rounded-xl px-6 py-3 border ${!isWin ? "bg-red-500/10 border-red-500/40" : "bg-zinc-900 border-zinc-700"}`}>
                <p className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Them</p>
                <p className="text-2xl font-mono font-bold text-white">{battleResult?.theirFinalScore ?? 100}</p>
              </div>
            </motion.div>
            {/* Twist recap */}
            {twist && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="relative z-20 mb-4">
                <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest text-center mb-1">Twist</p>
                <p className="text-sm text-zinc-300 text-center">{twist}</p>
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="relative z-20 mb-8 text-center">
              <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Your Aura Score</p>
              <p className={`text-3xl font-mono font-bold ${isWin ? "text-purple-400" : "text-zinc-300"}`}>{score}</p>
              <p className="text-zinc-400 text-sm mt-1">{title}</p>
              {streak > 1 && <p className="text-orange-400 text-sm font-mono font-bold mt-1">🔥 {streak} MATCH STREAK</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="relative z-20 flex gap-3 flex-wrap justify-center">
              <Button size="lg" onClick={handleNext} className="bg-purple-600 hover:bg-purple-500 text-white px-8 h-14 text-lg font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] transition-all" data-testid="btn-next-match">
                <Zap className="mr-2" /> Next Match
              </Button>
              <Button size="lg" variant="outline" onClick={onBack} className="border-zinc-700 text-white hover:bg-zinc-900 h-14 px-8" data-testid="btn-return-home">
                <RefreshCw className="mr-2" /> Home
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VIDEO ── */}
      <div className="absolute inset-0">
        <video ref={remoteVideoRef} autoPlay playsInline className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${remoteStream ? "opacity-100" : "opacity-0"}`} data-testid="video-remote" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />
      </div>

      {/* Local PiP — hidden if setting is off */}
      {settings.showLocalVideo && (
        <div className="absolute bottom-28 right-4 w-28 md:w-40 aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden border-2 border-purple-500/50 z-20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" data-testid="video-local" />
        </div>
      )}
      {/* Hidden video (always capture even if pip hidden) */}
      {!settings.showLocalVideo && <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />}

      {/* ── BATTLE HUD ── */}
      {(state === "battle" || state === "connected") && (() => {
        const total = battleTick.myScore + battleTick.theirScore || 1;
        const myBarPct = Math.round((battleTick.myScore / total) * 100);
        const theirBarPct = 100 - myBarPct;
        const secs = Math.ceil(battleTick.timeLeft);
        const urgent = secs <= 10;
        return (
          <div className="absolute top-0 left-0 right-0 z-30 px-3 pt-3 pb-1">
            <div className="flex items-end justify-between gap-3 mb-1">
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest leading-none mb-0.5">YOU</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-black font-mono leading-none text-white ${myLeading ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`} data-testid="score-mine">{battleTick.myScore}</span>
                  <AnimatePresence mode="popLayout">
                    {myScoreDelta !== 0 && (
                      <motion.span key={`my-${battleTick.myScore}`} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: myScoreDelta > 0 ? -22 : 22, scale: 1.3 }} transition={{ duration: 0.5 }}
                        className={`text-base font-mono font-black ${myScoreDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                        {myScoreDelta > 0 ? "+" : ""}{myScoreDelta}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {streak > 1 && <span className="text-[10px] font-mono text-orange-400 font-bold mt-0.5">🔥 x{streak}</span>}
                {/* Floor warning in HUD */}
                {nearFloor && <span className="text-[10px] font-mono text-red-400 font-bold mt-0.5 animate-pulse">⚠️ FLOOR</span>}
              </div>
              <div className="flex flex-col items-center shrink-0">
                <motion.div animate={urgent ? { scale: [1, 1.15, 1], textShadow: ["0 0 8px #ef4444", "0 0 24px #ef4444", "0 0 8px #ef4444"] } : {}} transition={{ repeat: Infinity, duration: 0.7 }}
                  className={`font-black font-mono leading-none tabular-nums ${urgent ? "text-red-500 text-4xl md:text-5xl" : "text-white text-3xl md:text-4xl"}`}>
                  {secs}
                </motion.div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">secs left</span>
              </div>
              <div className="flex flex-col items-end min-w-0">
                <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest leading-none mb-0.5">THEM</span>
                <div className="flex items-baseline gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {theirScoreDelta !== 0 && (
                      <motion.span key={`their-${battleTick.theirScore}`} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: theirScoreDelta > 0 ? -22 : 22, scale: 1.3 }} transition={{ duration: 0.5 }}
                        className={`text-base font-mono font-black ${theirScoreDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                        {theirScoreDelta > 0 ? "+" : ""}{theirScoreDelta}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className={`font-black font-mono leading-none text-white ${!myLeading ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"}`} data-testid="score-theirs">{battleTick.theirScore}</span>
                </div>
              </div>
            </div>

            {/* Dual aura bars */}
            <div className="flex items-center gap-1 h-4">
              <div className="flex-1 h-full bg-black/50 rounded-l-full overflow-hidden border border-white/5">
                <motion.div className="h-full rounded-l-full" animate={{ width: `${myBarPct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ background: myLeading ? "linear-gradient(90deg, #7e22ce, #a855f7, #c084fc)" : "linear-gradient(90deg, #4c1d95, #6d28d9)", boxShadow: myLeading ? "0 0 12px #a855f7, 0 0 24px #a855f7" : "none", marginLeft: "auto", width: `${myBarPct}%` }} />
              </div>
              <div className="shrink-0 text-base leading-none">⚡</div>
              <div className="flex-1 h-full bg-black/50 rounded-r-full overflow-hidden border border-white/5 flex justify-end">
                <motion.div className="h-full rounded-r-full" animate={{ width: `${theirBarPct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ background: !myLeading ? "linear-gradient(270deg, #9d174d, #ec4899, #f9a8d4)" : "linear-gradient(270deg, #831843, #be185d)", boxShadow: !myLeading ? "0 0 12px #ec4899, 0 0 24px #ec4899" : "none", width: `${theirBarPct}%` }} />
              </div>
            </div>

            {twist && (
              <div className="flex justify-center mt-1.5">
                <div className="bg-black/60 backdrop-blur-sm border border-purple-500/20 rounded-full px-3 py-0.5 text-[10px] font-mono text-purple-300/80">{twist}</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── BOTTOM CONTROLS ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 flex justify-between items-end bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex gap-2">
          {EMOJIS.map((emoji) => (
            <button key={emoji} onClick={() => addReaction(emoji)}
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xl hover:bg-white/10 hover:scale-110 transition-all active:scale-90"
              data-testid={`btn-reaction-${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>
        <Button size="lg" variant="destructive" onClick={handleSkip}
          className="rounded-full w-12 h-12 p-0 bg-red-600/80 hover:bg-red-500 backdrop-blur-md"
          data-testid="btn-skip">
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Floating reactions */}
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -120, scale: 1.4 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}
            className="absolute bottom-24 z-40 text-4xl pointer-events-none" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
