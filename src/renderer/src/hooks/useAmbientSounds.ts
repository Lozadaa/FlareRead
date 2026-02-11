import { useState, useEffect, useCallback, useRef } from 'react'
import { audioEngine, type SoundscapeId, SOUNDSCAPES } from '@/lib/audioEngine'
import type { SessionSnapshot } from '@/types'

// ─── Volume Profile ───────────────────────────────────

export interface VolumeProfile {
  name: string
  masterVolume: number
  sounds: Partial<Record<SoundscapeId, number>>
}

const DEFAULT_PROFILES: Record<string, VolumeProfile> = {
  silent: { name: 'Silent', masterVolume: 0, sounds: {} },
  rain_focus: {
    name: 'Rain Focus',
    masterVolume: 0.4,
    sounds: { rain: 0.6 }
  },
  cafe_study: {
    name: 'Cafe Study',
    masterVolume: 0.35,
    sounds: { coffeeshop: 0.5 }
  },
  deep_focus: {
    name: 'Deep Focus',
    masterVolume: 0.35,
    sounds: { whitenoise: 0.4, rain: 0.25 }
  },
  cozy_reading: {
    name: 'Cozy Reading',
    masterVolume: 0.4,
    sounds: { fireplace: 0.5, rain: 0.25 }
  },
  nature_escape: {
    name: 'Nature Escape',
    masterVolume: 0.4,
    sounds: { forest: 0.6 }
  }
}

// ─── Persistence ──────────────────────────────────────

const PROFILES_STORAGE_KEY = 'soundscape:profiles'
const ACTIVE_PROFILE_KEY = 'soundscape:activeProfile'

function loadProfiles(): Record<string, VolumeProfile> {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, VolumeProfile>
      return { ...DEFAULT_PROFILES, ...parsed }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_PROFILES }
}

function saveCustomProfiles(profiles: Record<string, VolumeProfile>): void {
  // Only save user-created profiles (not defaults)
  const custom: Record<string, VolumeProfile> = {}
  for (const [key, profile] of Object.entries(profiles)) {
    if (!(key in DEFAULT_PROFILES)) {
      custom[key] = profile
    }
  }
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(custom))
}

function loadActiveProfile(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY)
}

function saveActiveProfile(name: string | null): void {
  if (name) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, name)
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY)
  }
}

// ─── Hook ─────────────────────────────────────────────

export interface UseAmbientSoundsReturn {
  /** List of available soundscapes */
  soundscapes: typeof SOUNDSCAPES
  /** Currently active (playing) soundscape IDs */
  activeSounds: SoundscapeId[]
  /** Whether the mini-player is visible */
  isOpen: boolean
  /** Whether the panel is expanded */
  isExpanded: boolean
  /** Whether all sounds are paused */
  isPaused: boolean
  /** Master volume (0-1) */
  masterVolume: number
  /** Get volume for a specific sound */
  getVolume: (id: SoundscapeId) => number
  /** Toggle a soundscape on/off */
  toggleSound: (id: SoundscapeId) => void
  /** Set volume for a specific sound */
  setVolume: (id: SoundscapeId, volume: number) => void
  /** Set master volume */
  setMasterVolume: (volume: number) => void
  /** Pause all sounds */
  pause: () => void
  /** Resume all sounds */
  resume: () => void
  /** Toggle pause state */
  togglePause: () => void
  /** Stop all sounds */
  stopAll: () => void
  /** Toggle mini-player visibility */
  toggleOpen: () => void
  /** Toggle expanded panel */
  toggleExpanded: () => void
  /** Set expanded state */
  setExpanded: (expanded: boolean) => void
  /** Volume profiles */
  profiles: Record<string, VolumeProfile>
  /** Currently active profile name */
  activeProfileName: string | null
  /** Apply a volume profile */
  applyProfile: (name: string) => void
  /** Save current state as a new profile */
  saveProfile: (name: string) => void
  /** Delete a custom profile */
  deleteProfile: (name: string) => void
  /** Toggle mute (master volume 0 ↔ previous value) */
  toggleMute: () => void
  /** Whether any sounds are active */
  hasActiveSounds: boolean
}

export function useAmbientSounds(
  session: SessionSnapshot | null,
  autoPauseOnAfk: boolean
): UseAmbientSoundsReturn {
  const [activeSounds, setActiveSounds] = useState<SoundscapeId[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [masterVolume, setMasterVolumeState] = useState(0.4)
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [profiles, setProfiles] = useState<Record<string, VolumeProfile>>(loadProfiles)
  const [activeProfileName, setActiveProfileName] = useState<string | null>(loadActiveProfile)

  // Track previous session state for auto-pause/resume
  const prevSessionStateRef = useRef<string | null>(null)
  // Track if paused by AFK (to distinguish from user pause)
  const pausedByAfkRef = useRef(false)
  // Store pre-mute volume for toggle
  const preMuteVolumeRef = useRef(0.4)

  // Auto-pause on AFK, auto-resume on session resume
  useEffect(() => {
    const prevState = prevSessionStateRef.current
    const currentState = session?.state ?? null
    prevSessionStateRef.current = currentState

    if (!autoPauseOnAfk) return
    if (activeSounds.length === 0) return

    // Session went AFK → pause
    if (currentState === 'paused_afk' && prevState === 'running') {
      if (!isPaused) {
        audioEngine.pause()
        setIsPaused(true)
        pausedByAfkRef.current = true
      }
    }

    // Session resumed from AFK → resume (only if we paused it)
    if (currentState === 'running' && prevState === 'paused_afk') {
      if (isPaused && pausedByAfkRef.current) {
        audioEngine.resume()
        setIsPaused(false)
        pausedByAfkRef.current = false
      }
    }

    // Session completed → stop all
    if (currentState === 'completed' && prevState !== null && prevState !== 'completed') {
      // Don't stop sounds on session end - user might want to keep listening
      // Just resume if paused by AFK
      if (pausedByAfkRef.current) {
        audioEngine.resume()
        setIsPaused(false)
        pausedByAfkRef.current = false
      }
    }
  }, [session?.state, autoPauseOnAfk, activeSounds.length, isPaused])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine.destroy()
    }
  }, [])

  const toggleSound = useCallback((id: SoundscapeId) => {
    if (audioEngine.isPlaying(id)) {
      audioEngine.stop(id)
      setActiveSounds((prev) => prev.filter((s) => s !== id))
    } else {
      const vol = volumes[id] ?? 0.5
      audioEngine.play(id, vol)
      setActiveSounds((prev) => [...prev, id])
      // Auto-show mini-player when first sound activated
      setIsOpen(true)
    }
    // Clear active profile since user manually changed sounds
    setActiveProfileName(null)
    saveActiveProfile(null)
  }, [volumes])

  const setVolume = useCallback((id: SoundscapeId, volume: number) => {
    audioEngine.setVolume(id, volume)
    setVolumes((prev) => ({ ...prev, [id]: volume }))
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    audioEngine.masterVolume = volume
    setMasterVolumeState(volume)
    if (volume > 0) {
      preMuteVolumeRef.current = volume
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (masterVolume > 0) {
      preMuteVolumeRef.current = masterVolume
      setMasterVolume(0)
    } else {
      setMasterVolume(preMuteVolumeRef.current || 0.4)
    }
  }, [masterVolume, setMasterVolume])

  const pause = useCallback(() => {
    audioEngine.pause()
    setIsPaused(true)
    pausedByAfkRef.current = false
  }, [])

  const resume = useCallback(() => {
    audioEngine.resume()
    setIsPaused(false)
    pausedByAfkRef.current = false
  }, [])

  const togglePause = useCallback(() => {
    if (isPaused) {
      resume()
    } else {
      pause()
    }
  }, [isPaused, pause, resume])

  const stopAll = useCallback(() => {
    audioEngine.stopAll()
    setActiveSounds([])
    setIsPaused(false)
    pausedByAfkRef.current = false
  }, [])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const getVolume = useCallback((id: SoundscapeId) => {
    return volumes[id] ?? 0.5
  }, [volumes])

  const applyProfile = useCallback((name: string) => {
    const profile = profiles[name]
    if (!profile) return

    // Stop all current sounds
    audioEngine.stopAll()

    // Set master volume
    audioEngine.masterVolume = profile.masterVolume
    setMasterVolumeState(profile.masterVolume)

    // Start sounds from profile
    const newActive: SoundscapeId[] = []
    const newVolumes: Record<string, number> = { ...volumes }

    for (const [soundId, volume] of Object.entries(profile.sounds)) {
      const id = soundId as SoundscapeId
      audioEngine.play(id, volume)
      newActive.push(id)
      newVolumes[id] = volume
    }

    setActiveSounds(newActive)
    setVolumes(newVolumes)
    setIsPaused(false)
    pausedByAfkRef.current = false
    setActiveProfileName(name)
    saveActiveProfile(name)

    if (newActive.length > 0) {
      setIsOpen(true)
    }
  }, [profiles, volumes])

  const saveProfile = useCallback((name: string) => {
    const key = name.toLowerCase().replace(/\s+/g, '_')
    const profile: VolumeProfile = {
      name,
      masterVolume,
      sounds: {}
    }
    for (const id of activeSounds) {
      profile.sounds[id] = volumes[id] ?? 0.5
    }

    const updated = { ...profiles, [key]: profile }
    setProfiles(updated)
    setActiveProfileName(key)
    saveActiveProfile(key)
    saveCustomProfiles(updated)
  }, [masterVolume, activeSounds, volumes, profiles])

  const deleteProfile = useCallback((name: string) => {
    if (name in DEFAULT_PROFILES) return // Can't delete defaults
    const updated = { ...profiles }
    delete updated[name]
    setProfiles(updated)
    if (activeProfileName === name) {
      setActiveProfileName(null)
      saveActiveProfile(null)
    }
    saveCustomProfiles(updated)
  }, [profiles, activeProfileName])

  return {
    soundscapes: SOUNDSCAPES,
    activeSounds,
    isOpen,
    isExpanded,
    isPaused,
    masterVolume,
    getVolume,
    toggleSound,
    setVolume,
    setMasterVolume,
    pause,
    resume,
    togglePause,
    stopAll,
    toggleOpen,
    toggleExpanded,
    setExpanded: setIsExpanded,
    profiles,
    activeProfileName,
    applyProfile,
    saveProfile,
    deleteProfile,
    toggleMute,
    hasActiveSounds: activeSounds.length > 0
  }
}
