import { useState, useEffect, useCallback } from "react";

export type MatchHistory = {
  result: "win" | "loss" | "steal";
  delta: number;
  timestamp: number;
  twist?: string;
};

type DailyMission = {
  id: string;
  title: string;
  target: number;
  progress: number;
};

export interface AuraStats {
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  longestStreak: number;
  totalAuraGained: number;
  totalAuraLost: number;
}

const TITLES = [
  { min: 0,   label: "Void Dweller 💀" },
  { min: 30,  label: "Low Aura Civilian 😶" },
  { min: 80,  label: "Rising Aura 😎" },
  { min: 150, label: "Sigma Initiate 🧠" },
  { min: 250, label: "Elite Mogger 🔥" },
  { min: 400, label: "Aura Overlord 👑" },
  { min: 600, label: "Mythic Presence ✨" },
  { min: 900, label: "Final Boss 🌌" },
];

export const getAuraTitle = (score: number) =>
  [...TITLES].reverse().find((t) => score >= t.min)?.label ?? TITLES[0].label;

const EMPTY_STATS: AuraStats = {
  totalMatches: 0,
  totalWins: 0,
  totalLosses: 0,
  longestStreak: 0,
  totalAuraGained: 0,
  totalAuraLost: 0,
};

export function useAuraGame() {
  const [score, setScore] = useState(100);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [stats, setStats] = useState<AuraStats>(EMPTY_STATS);
  const [missions, setMissions] = useState<DailyMission[]>([
    { id: "win3",    title: "Win 3 matches today",  target: 3, progress: 0 },
    { id: "streak2", title: "Get a streak of 2",    target: 2, progress: 0 },
  ]);

  useEffect(() => {
    const savedScore   = localStorage.getItem("auraScore");
    const savedStreak  = localStorage.getItem("auraStreak");
    const savedHistory = localStorage.getItem("auraHistory");
    const savedStats   = localStorage.getItem("auraStats");

    if (savedScore)   setScore(parseInt(savedScore, 10));
    if (savedStreak)  setStreak(parseInt(savedStreak, 10));
    if (savedHistory) { try { setHistory(JSON.parse(savedHistory)); } catch {} }
    if (savedStats)   { try { setStats({ ...EMPTY_STATS, ...JSON.parse(savedStats) }); } catch {} }
  }, []);

  const persist = useCallback(
    (newScore: number, newStreak: number, newHistory: MatchHistory[], newStats: AuraStats) => {
      setScore(newScore);
      setStreak(newStreak);
      setHistory(newHistory);
      setStats(newStats);
      localStorage.setItem("auraScore",   newScore.toString());
      localStorage.setItem("auraStreak",  newStreak.toString());
      localStorage.setItem("auraHistory", JSON.stringify(newHistory));
      localStorage.setItem("auraStats",   JSON.stringify(newStats));
    },
    []
  );

  const recordResult = useCallback(
    (result: "win" | "loss", twist?: string) => {
      let delta = 0;
      let finalResult: "win" | "loss" | "steal" = result;

      if (result === "win") {
        const isSteal = Math.random() < 0.33;
        delta = isSteal
          ? Math.floor(Math.random() * 8) + 15
          : Math.floor(Math.random() * 8) + 8;
        finalResult = isSteal ? "steal" : "win";
        const newStreak = streak + 1;
        const newScore  = score + delta;
        const newHistory: MatchHistory[] = [
          { result: finalResult, delta, timestamp: Date.now(), twist },
          ...history,
        ].slice(0, 10);
        const newStats: AuraStats = {
          totalMatches:    stats.totalMatches + 1,
          totalWins:       stats.totalWins + 1,
          totalLosses:     stats.totalLosses,
          longestStreak:   Math.max(stats.longestStreak, newStreak),
          totalAuraGained: stats.totalAuraGained + delta,
          totalAuraLost:   stats.totalAuraLost,
        };
        persist(newScore, newStreak, newHistory, newStats);
        return { result: finalResult, delta, newScore, newStreak };
      } else {
        delta = -(Math.floor(Math.random() * 8) + 5);
        const newStreak = 0;
        const newScore  = Math.max(0, score + delta);
        const newHistory: MatchHistory[] = [
          { result: finalResult, delta, timestamp: Date.now(), twist },
          ...history,
        ].slice(0, 10);
        const newStats: AuraStats = {
          totalMatches:    stats.totalMatches + 1,
          totalWins:       stats.totalWins,
          totalLosses:     stats.totalLosses + 1,
          longestStreak:   stats.longestStreak,
          totalAuraGained: stats.totalAuraGained,
          totalAuraLost:   stats.totalAuraLost + Math.abs(delta),
        };
        persist(newScore, newStreak, newHistory, newStats);
        return { result: finalResult, delta, newScore, newStreak };
      }
    },
    [score, streak, history, stats, persist]
  );

  return { score, streak, history, missions, stats, title: getAuraTitle(score), recordResult };
}
