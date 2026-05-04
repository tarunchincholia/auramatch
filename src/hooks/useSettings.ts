import { useState, useCallback } from "react";

export interface AppSettings {
  soundEnabled: boolean;
  confettiEnabled: boolean;
  showLocalVideo: boolean;
  preferredVideoDeviceId: string;
  preferredAudioDeviceId: string;
}

const DEFAULTS: AppSettings = {
  soundEnabled: true,
  confettiEnabled: true,
  showLocalVideo: true,
  preferredVideoDeviceId: "",
  preferredAudioDeviceId: "",
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem("auraSettings");
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function save(s: AppSettings) {
  localStorage.setItem("auraSettings", JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  return { settings, update };
}
