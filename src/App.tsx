import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home";
import Match from "./pages/Match";
import Settings from "./pages/Settings";
import StatsPage from "./pages/Stats";
import { useSettings } from "./hooks/useSettings";
import { useAuraGame } from "./hooks/useAuraGame";

const queryClient = new QueryClient();

type View = "home" | "match" | "settings" | "stats";

function AppInner() {
  const [view, setView] = useState<View>("home");
  const { settings, update } = useSettings();
  const { stats, history } = useAuraGame();

  return (
    <>
      {view === "home" && (
        <Home
          onStart={() => setView("match")}
          onSettings={() => setView("settings")}
          onStats={() => setView("stats")}
          settings={settings}
          onSettingsUpdate={update}
        />
      )}
      {view === "match" && (
        <Match onBack={() => setView("home")} settings={settings} />
      )}
      {view === "settings" && (
        <Settings settings={settings} onUpdate={update} onBack={() => setView("home")} />
      )}
      {view === "stats" && (
        <StatsPage stats={stats} history={history} onBack={() => setView("home")} />
      )}
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
