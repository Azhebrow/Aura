import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuraDatabase, AuraRow } from '@/types/aura';

const AMBIENT_VOLUME_KEY = 'timer-ambient-volume';

export type AmbientTrack = {
  id: string;
  name: string;
  icon?: string;
  fileName: string;
};

export type AmbientDefaults = {
  timer: string;
  stopwatch: string;
  break: string;
};

export function readStoredVolume() {
  try {
    const raw = localStorage.getItem(AMBIENT_VOLUME_KEY);
    if (!raw) return 50;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(100, Math.max(0, Math.round(parsed * 100)));
  } catch {
    return 50;
  }
}

function storeVolume(value: number) {
  try { localStorage.setItem(AMBIENT_VOLUME_KEY, String(value / 100)); } catch { /* ignore */ }
}

const ambientBlobCache = new Map<string, string>();

export function resolveAmbientFileUrl(fileName: string): string | null {
  if (!fileName) return null;
  if (ambientBlobCache.has(fileName)) return ambientBlobCache.get(fileName)!;
  const userDataPath = window.__auraUserDataPath;
  const appPath = window.__auraAppPath;
  const runtimeRequire =
    typeof globalThis !== 'undefined' && typeof (globalThis as { require?: unknown }).require === 'function'
      ? ((globalThis as { require: (id: string) => unknown }).require as (id: string) => unknown)
      : typeof require === 'function' ? require : null;
  if (runtimeRequire) {
    try {
      const fs = runtimeRequire('fs') as {
        existsSync: (path: string) => boolean;
        readFileSync: (path: string) => Buffer;
      };
      const pathMod = runtimeRequire('path') as { join: (...parts: string[]) => string };
      const candidates: string[] = [];
      if (appPath) candidates.push(pathMod.join(appPath, 'public', 'ambient-stock', fileName));
      if (userDataPath) candidates.push(pathMod.join(userDataPath, 'ambient', fileName));
      const existing = candidates.find((c) => fs.existsSync(c));
      if (existing) {
        const buf = fs.readFileSync(existing);
        const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        const ab = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(ab).set(bytes);
        const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
        const mime =
          ext === 'mp3' ? 'audio/mpeg' : ext === 'm4a' ? 'audio/mp4' :
          ext === 'ogg' ? 'audio/ogg' : ext === 'wav' ? 'audio/wav' :
          ext === 'flac' ? 'audio/flac' : ext === 'aac' ? 'audio/aac' : 'audio/mpeg';
        const blob = new Blob([ab], { type: mime });
        const url = URL.createObjectURL(blob);
        ambientBlobCache.set(fileName, url);
        return url;
      }
    } catch { /* ignore */ }
  }
  return null;
}

export function parseAmbientTracks(db: AuraDatabase): AmbientTrack[] {
  return db
    .getAll('cfg_ambient_music')
    .map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? row.title ?? row.id ?? 'Ambient'),
      icon: typeof row.icon === 'string' && row.icon.trim() ? row.icon.trim() : undefined,
      fileName: typeof row.file_name === 'string' ? row.file_name.trim() : '',
    }))
    .filter((row) => row.id && row.fileName)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export function parseAmbientDefaults(row: AuraRow | null): AmbientDefaults {
  const pick = (v: unknown) => (v == null ? '' : String(v));
  return {
    timer: pick(row?.ambient_default_timer),
    stopwatch: pick(row?.ambient_default_stopwatch),
    break: pick(row?.ambient_default_break),
  };
}

export function formatAmbientTrackName(name: string): string {
  const base = name.replace(/\.(m4a|mp3|ogg|wav|flac|aac)$/i, '');
  return base.split(/[-_]+/g).filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type UseAmbientAudioParams = {
  open: boolean;
  db: AuraDatabase | null;
  timerType: 'timer' | 'stopwatch';
  shouldPlay: boolean;
};

export function useAmbientAudio({ open, db, timerType, shouldPlay }: UseAmbientAudioParams) {
  const [tracks, setTracks] = useState<AmbientTrack[]>([]);
  const [defaults, setDefaults] = useState<AmbientDefaults>({ timer: '', stopwatch: '', break: '' });
  const [trackId, setTrackId] = useState('');
  const [volume, setVolume] = useState(() => readStoredVolume());
  const [expanded, setExpanded] = useState(false);

  const userPickedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTrackRef = useRef('');

  const currentTrack = tracks.find((t) => t.id === trackId) ?? null;

  const dispose = useCallback((resetPosition: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); if (resetPosition) audio.currentTime = 0; audio.src = ''; } catch { /* ignore */ }
    audioRef.current = null;
    audioTrackRef.current = '';
  }, []);

  const seekRandomly = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const apply = () => {
      const d = audio.duration;
      if (!Number.isFinite(d) || d <= 1) return;
      audio.currentTime = Math.random() * Math.max(0, d - 0.25);
      if (shouldPlay) void audio.play().catch(() => {});
    };
    if (Number.isFinite(audio.duration) && audio.duration > 1) { apply(); return; }
    audio.addEventListener('loadedmetadata', apply, { once: true });
    try { audio.load(); } catch { /* ignore */ }
  }, [shouldPlay]);

  // Load or reset tracks when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTrackId('');
      setExpanded(false);
      userPickedRef.current = false;
      dispose(true);
      return;
    }
    if (!db) { setTracks([]); setDefaults({ timer: '', stopwatch: '', break: '' }); return; }
    setTracks(parseAmbientTracks(db));
    setDefaults(parseAmbientDefaults((db.getAppSettings() ?? null) as AuraRow | null));
  }, [db, dispose, open]);

  // Auto-select default track
  useEffect(() => {
    if (!open || trackId || userPickedRef.current) return;
    const next = timerType === 'timer' ? defaults.timer : defaults.stopwatch;
    if (next) setTrackId(next);
  }, [defaults.stopwatch, defaults.timer, open, timerType, trackId]);

  // Persist volume
  useEffect(() => {
    storeVolume(volume);
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Sync audio element playback
  useEffect(() => {
    if (!open) return;
    if (!trackId || !currentTrack) { dispose(false); return; }
    const nextUrl = resolveAmbientFileUrl(currentTrack.fileName);
    if (!nextUrl) { dispose(false); return; }
    if (!audioRef.current || audioTrackRef.current !== trackId || audioRef.current.src !== nextUrl) {
      dispose(true);
      const a = new Audio(nextUrl);
      a.loop = true; a.volume = volume / 100;
      audioRef.current = a; audioTrackRef.current = trackId;
    }
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
    if (shouldPlay) void audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [trackId, volume, currentTrack, dispose, open, shouldPlay]);

  return {
    tracks, defaults,
    trackId, setTrackId: (id: string, userPicked = false) => {
      if (userPicked) userPickedRef.current = true;
      setTrackId(id);
    },
    volume, setVolume,
    expanded, setExpanded,
    currentTrack, userPickedRef,
    dispose, seekRandomly,
    audioRef,
  };
}
