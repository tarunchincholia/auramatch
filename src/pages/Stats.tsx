import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Target, BarChart2, Clock } from "lucide-react";
import type { AuraStats, MatchHistory } from "../hooks/useAuraGame";

interface StatsProps {
  stats: AuraStats;
  history: MatchHistory[];
  onBack: () => void;
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, sub, color = "text-purple-400" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col gap-1"
    >
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-3xl font-black font-mono ${color}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </motion.div>
  );
}

export default function StatsPage({ stats, history, onBack }: StatsProps) {
  const winRate = stats.totalMatches > 0
    ? Math.round((stats.totalWins / stats.totalMatches) * 100)
    : 0;

  const avgGained = stats.totalWins > 0
    ? Math.round(stats.totalAuraGained / stats.totalWins)
    : 0;

  const netAura = stats.totalAuraGained - stats.totalAuraLost;

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 bg-black text-white overflow-y-auto">
      <div className="w-full max-w-md pt-10 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Your Stats</h2>
        </div>

        {stats.totalMatches === 0 ? (
          <div className="text-center text-zinc-600 text-sm font-mono py-12">
            No matches played yet. Get in there! 🔥
          </div>
        ) : (
          <>
            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                icon={BarChart2}
                label="Win Rate"
                value={`${winRate}%`}
                sub={`${stats.totalWins}W / ${stats.totalLosses}L`}
                color={winRate >= 50 ? "text-green-400" : "text-red-400"}
              />
              <StatCard
                icon={Zap}
                label="Longest Streak"
                value={stats.longestStreak}
                sub="consecutive wins"
                color="text-orange-400"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg Aura / Win"
                value={`+${avgGained}`}
                sub="per winning match"
                color="text-purple-400"
              />
              <StatCard
                icon={Target}
                label="Total Matches"
                value={stats.totalMatches}
                sub="lifetime"
                color="text-zinc-300"
              />
            </div>

            {/* Net aura bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-950 border border-white/5 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Net Aura Flow</span>
                <span className={`text-sm font-mono font-bold ${netAura >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {netAura >= 0 ? "+" : ""}{netAura}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600 mb-1">
                    <span className="text-green-400">+{stats.totalAuraGained} gained</span>
                    <span className="text-red-400">-{stats.totalAuraLost} lost</span>
                  </div>
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden flex">
                    {stats.totalAuraGained + stats.totalAuraLost > 0 && (
                      <>
                        <div
                          className="h-full bg-green-500 rounded-l-full"
                          style={{
                            width: `${(stats.totalAuraGained / (stats.totalAuraGained + stats.totalAuraLost)) * 100}%`,
                          }}
                        />
                        <div className="h-full bg-red-500 rounded-r-full flex-1" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Full match history */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2 text-zinc-300 font-semibold mb-3">
                <Clock className="h-4 w-4" />
                <span>Match History</span>
                <span className="text-zinc-600 text-xs font-normal ml-1">last {history.length}</span>
              </div>

              <div className="bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden">
                {history.length === 0 ? (
                  <div className="py-8 text-center text-zinc-600 text-sm font-mono">No matches yet</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {history.map((h, i) => {
                      const isWin = h.result === "win" || h.result === "steal";
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          {/* Result badge */}
                          <div
                            className={`shrink-0 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                              h.result === "steal"
                                ? "text-yellow-300 border-yellow-500/40 bg-yellow-500/10"
                                : isWin
                                ? "text-green-400 border-green-500/40 bg-green-500/10"
                                : "text-red-400 border-red-500/30 bg-red-500/10"
                            }`}
                          >
                            {h.result === "steal" ? "STEAL" : isWin ? "WIN" : "LOSS"}
                          </div>

                          {/* Twist */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-400 truncate">
                              {h.twist || "—"}
                            </p>
                          </div>

                          {/* Delta + time */}
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-mono font-bold ${isWin ? "text-green-400" : "text-red-400"}`}>
                              {h.delta > 0 ? "+" : ""}{h.delta}
                            </p>
                            <p className="text-[10px] text-zinc-600 font-mono">{formatTime(h.timestamp)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
