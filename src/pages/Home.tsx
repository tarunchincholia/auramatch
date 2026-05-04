import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuraGame } from "../hooks/useAuraGame";
import { Copy, Zap, History, Target, Trophy, Pencil, Check, RefreshCw, Settings, BarChart2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { AppSettings } from "../hooks/useSettings";
import { useSound } from "../hooks/useSound";

interface HomeProps {
  onStart: () => void;
  onSettings: () => void;
  onStats: () => void;
  settings: AppSettings;
  onSettingsUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  title: string;
  updatedAt: number;
}

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem("auraPlayerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("auraPlayerId", id);
  }
  return id;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function Home({ onStart, onSettings, onStats, settings }: HomeProps) {
  const { score, title, history, missions } = useAuraGame();
  const { play } = useSound(settings.soundEnabled);

  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem("auraPlayerName") ?? "");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const playerId = useRef(getOrCreatePlayerId());
  const lastSubmittedScore = useRef<number | null>(null);

  // Floor warning: score <= 30
  const nearFloor = score <= 30;

  const fetchLeaderboard = useCallback(async () => {
    setLoadingBoard(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data: LeaderboardEntry[] = await res.json();
        setLeaderboard(data);
      }
    } catch {}
    finally { setLoadingBoard(false); }
  }, []);

  const submitScore = useCallback(async (name: string, currentScore: number) => {
    if (!name.trim() || lastSubmittedScore.current === currentScore) return;
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: playerId.current, name: name.trim(), score: currentScore }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyRank(data.rank);
        lastSubmittedScore.current = currentScore;
        fetchLeaderboard();
      }
    } catch {}
  }, [fetchLeaderboard]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);
  useEffect(() => {
    if (playerName) submitScore(playerName, score);
  }, [score, playerName, submitScore]);

  // Floor warning sound
  const prevScore = useRef(score);
  useEffect(() => {
    if (score <= 30 && prevScore.current > 30) play("floor_warning");
    prevScore.current = score;
  }, [score, play]);

  const saveName = useCallback(() => {
    const trimmed = draftName.trim().slice(0, 24);
    if (!trimmed) return;
    setPlayerName(trimmed);
    localStorage.setItem("auraPlayerName", trimmed);
    setEditingName(false);
    submitScore(trimmed, score);
  }, [draftName, score, submitScore]);

  const startEditing = () => {
    setDraftName(playerName);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleShare = () => {
    const rankText = myRank ? ` (Rank #${myRank})` : "";
    navigator.clipboard.writeText(
      `I have ${score} Aura${rankText} on AuraMatch! 🔥 Try it: auramatch.replit.app`
    );
    toast({ title: "Copied!", description: "Aura flex copied to clipboard 🔥" });
  };

  const handleStart = () => {
    play("button_click");
    onStart();
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 bg-black text-white selection:bg-purple-500/30 overflow-y-auto">
      {/* Logo + nav row */}
      <div className="w-full max-w-md pt-10 pb-6 flex flex-col items-center relative">
        {/* Nav icons top-right */}
        <div className="absolute top-10 right-0 flex items-center gap-1">
          <button
            onClick={onStats}
            className="p-2 text-zinc-500 hover:text-purple-400 transition-colors"
            title="Stats"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={onSettings}
            className="p-2 text-zinc-500 hover:text-purple-400 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-purple-500 to-pink-500 animate-neon-glow mb-1">
          AuraMatch
        </h1>
        <p className="text-purple-300 font-mono text-xs uppercase tracking-widest opacity-70">
          Vibe Check The World
        </p>
      </div>

      {/* Stats card */}
      <motion.div
        className={`w-full max-w-md bg-zinc-950/80 border rounded-2xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.1)] mb-4 backdrop-blur-sm transition-all duration-500 ${
          nearFloor
            ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            : "border-purple-500/20"
        }`}
        animate={nearFloor ? { boxShadow: ["0 0 20px rgba(239,68,68,0.15)", "0 0 40px rgba(239,68,68,0.3)", "0 0 20px rgba(239,68,68,0.15)"] } : {}}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        {/* Floor warning banner */}
        <AnimatePresence>
          {nearFloor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-center">
                <p className="text-red-400 text-xs font-mono font-bold uppercase tracking-wider">
                  ⚠️ Aura floor warning — score critically low
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name row */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {editingName ? (
            <div className="flex items-center gap-2 w-full">
              <input
                ref={nameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                maxLength={24}
                placeholder="Enter your name…"
                className="flex-1 bg-zinc-900 border border-purple-500/50 rounded-lg px-3 py-1.5 text-white font-mono text-sm outline-none focus:border-purple-400"
                data-testid="input-player-name"
              />
              <button onClick={saveName} className="text-green-400 hover:text-green-300 p-1" data-testid="btn-save-name">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors group"
              data-testid="btn-edit-name"
            >
              <span className="font-mono text-sm">
                {playerName || <span className="text-zinc-500 italic">Set your name to appear on leaderboard</span>}
              </span>
              <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-purple-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Score display */}
        <div className="text-center mb-5">
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-1">Current Aura</p>
          <div className={`text-6xl font-bold font-mono mb-2 transition-colors duration-500 ${nearFloor ? "text-red-400" : "text-white"}`}>
            {score}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors duration-500 ${
            nearFloor
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-purple-500/10 border border-purple-500/30 text-purple-400"
          }`}>
            {title}
          </div>
          {myRank && (
            <p className="text-zinc-400 font-mono text-xs mt-2">
              {MEDAL[myRank] ?? "🏅"} Global Rank <span className="text-white font-bold">#{myRank}</span>
            </p>
          )}
        </div>

        <Button
          onClick={handleStart}
          className="w-full h-14 text-xl font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300"
          data-testid="button-start"
        >
          <Zap className="mr-2 h-5 w-5" /> START MATCH
        </Button>

        <Button variant="ghost" onClick={handleShare}
          className="w-full mt-3 text-zinc-400 hover:text-white hover:bg-white/5 text-sm"
          data-testid="button-share">
          <Copy className="mr-2 h-4 w-4" /> Share your Aura
        </Button>
      </motion.div>

      {/* Leaderboard */}
      <div className="w-full max-w-md mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span>Global Leaderboard</span>
          </div>
          <button onClick={fetchLeaderboard} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1" data-testid="btn-refresh-leaderboard">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBoard ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="py-8 text-center text-zinc-600 text-sm font-mono">
              {loadingBoard ? "Loading…" : "No players yet — be the first! 🔥"}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.map((entry, i) => {
                const rank = i + 1;
                const isMe = entry.id === playerId.current;
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? "bg-purple-500/10 border-l-2 border-purple-500" : "hover:bg-white/2"}`}
                    data-testid={`leaderboard-row-${rank}`}>
                    <div className="w-8 text-center shrink-0">
                      {MEDAL[rank] ? <span className="text-xl">{MEDAL[rank]}</span> : <span className="text-zinc-500 font-mono text-sm font-bold">#{rank}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm truncate ${isMe ? "text-purple-300" : "text-white"}`}>{entry.name}</span>
                        {isMe && <span className="text-[10px] font-mono text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-full shrink-0">YOU</span>}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">{entry.title}</div>
                    </div>
                    <div className={`font-black font-mono text-lg shrink-0 ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-zinc-300" : rank === 3 ? "text-orange-400" : isMe ? "text-purple-400" : "text-zinc-400"}`}>
                      {entry.score.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {!playerName && (
            <div className="px-4 py-3 border-t border-white/5 text-center">
              <button onClick={startEditing} className="text-purple-400 hover:text-purple-300 text-sm font-mono underline underline-offset-2" data-testid="btn-prompt-set-name">
                + Set your name to join the leaderboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History + Missions grid */}
      <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
        {/* Recent Vibes — now with twist + timestamp */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-300 font-medium mb-3">
            <History className="h-4 w-4" />
            <h3>Recent Vibes</h3>
          </div>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.slice(0, 5).map((h, i) => {
                const isWin = h.result === "win" || h.result === "steal";
                return (
                  <div key={i} className="text-sm">
                    <div className="flex justify-between items-center">
                      <span className={`font-mono text-xs font-bold uppercase ${
                        h.result === "steal" ? "text-yellow-300" : isWin ? "text-green-400" : "text-red-400"
                      }`}>
                        {h.result.toUpperCase()}
                      </span>
                      <span className={`font-mono text-sm font-bold ${isWin ? "text-green-400" : "text-red-400"}`}>
                        {h.delta > 0 ? "+" : ""}{h.delta}
                      </span>
                    </div>
                    {h.twist && (
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{h.twist}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-zinc-700" />
                      <span className="text-[10px] text-zinc-700 font-mono">{formatTime(h.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-zinc-600 text-sm text-center py-4">No matches yet</div>
          )}
        </div>

        {/* Daily Missions */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-300 font-medium mb-3">
            <Target className="h-4 w-4" />
            <h3>Daily Missions</h3>
          </div>
          <div className="space-y-3">
            {missions.map((m) => (
              <div key={m.id} className="text-sm">
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>{m.title}</span>
                  <span className="font-mono">{m.progress}/{m.target}</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence />
    </div>
  );
}
