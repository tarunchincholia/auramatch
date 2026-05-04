import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, Sparkles, Video, VideoOff, Mic, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppSettings } from "../hooks/useSettings";

interface SettingsProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onBack: () => void;
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

export default function Settings({ settings, onUpdate, onBack }: SettingsProps) {
  const [videoDevices, setVideoDevices] = useState<DeviceOption[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceOption[]>([]);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permission briefly so labels are populated
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((t) => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videos = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
        const audios = devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));

        setVideoDevices(videos);
        setAudioDevices(audios);
      } catch {
        setPermissionError(true);
      }
    }
    loadDevices();
  }, []);

  const ToggleRow = ({
    icon: Icon,
    label,
    description,
    value,
    onChange,
    onIcon: OnIcon,
    offIcon: OffIcon,
  }: {
    icon: React.ElementType;
    label: string;
    description: string;
    value: boolean;
    onChange: (v: boolean) => void;
    onIcon?: React.ElementType;
    offIcon?: React.ElementType;
  }) => {
    const ActiveIcon = value ? (onIcon ?? Icon) : (offIcon ?? Icon);
    return (
      <div className="flex items-center justify-between py-4 border-b border-white/5">
        <div className="flex items-start gap-3">
          <ActiveIcon className={`w-5 h-5 mt-0.5 shrink-0 ${value ? "text-purple-400" : "text-zinc-500"}`} />
          <div>
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
            value ? "bg-purple-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              value ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 bg-black text-white overflow-y-auto">
      <div className="w-full max-w-md pt-10 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
        </div>

        {/* Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950/80 border border-purple-500/20 rounded-2xl px-5 mb-5 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
        >
          <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest pt-4 pb-2">
            Experience
          </p>
          <ToggleRow
            icon={Volume2}
            onIcon={Volume2}
            offIcon={VolumeX}
            label="Sound Effects"
            description="Beeps, win/loss stings, and reaction pops"
            value={settings.soundEnabled}
            onChange={(v) => onUpdate("soundEnabled", v)}
          />
          <ToggleRow
            icon={Sparkles}
            label="Confetti & Celebrations"
            description="Particle effects on win/loss results"
            value={settings.confettiEnabled}
            onChange={(v) => onUpdate("confettiEnabled", v)}
          />
          <ToggleRow
            icon={Video}
            onIcon={Video}
            offIcon={VideoOff}
            label="Show My Camera"
            description="Your picture-in-picture preview during a match"
            value={settings.showLocalVideo}
            onChange={(v) => onUpdate("showLocalVideo", v)}
          />
        </motion.div>

        {/* Device selectors */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-zinc-950/80 border border-purple-500/20 rounded-2xl px-5 pb-5 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
        >
          <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest pt-4 pb-3">
            Devices
          </p>

          {permissionError ? (
            <p className="text-sm text-zinc-500 pb-4">
              Camera/mic permission denied. Grant access in your browser to choose devices.
            </p>
          ) : (
            <>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-2">
                  <Camera className="w-3.5 h-3.5" /> Camera
                </label>
                <select
                  value={settings.preferredVideoDeviceId}
                  onChange={(e) => onUpdate("preferredVideoDeviceId", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-purple-500/60 transition-colors"
                >
                  <option value="">Default camera</option>
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-2">
                  <Mic className="w-3.5 h-3.5" /> Microphone
                </label>
                <select
                  value={settings.preferredAudioDeviceId}
                  onChange={(e) => onUpdate("preferredAudioDeviceId", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-purple-500/60 transition-colors"
                >
                  <option value="">Default microphone</option>
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {videoDevices.length === 0 && audioDevices.length === 0 && (
                <p className="text-xs text-zinc-600 mt-3">
                  No devices detected. Make sure your camera and microphone are connected.
                </p>
              )}
            </>
          )}
        </motion.div>

        <p className="text-xs text-zinc-600 text-center mt-4 font-mono">
          Device preferences apply to your next match
        </p>
      </div>
    </div>
  );
}
