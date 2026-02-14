import { useState, useEffect, useCallback, useRef } from 'react'
import { audioEngine, type SoundscapeId, SOUNDSCAPES } from '@/lib/audioEngine'

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
    masterVolume: 0.5,
    sounds: { rain: 0.7 }
  },
  cafe_study: {
    name: 'Cafe Study',
    masterVolume: 0.5,
    sounds: { coffeeshop: 0.6 }
  },
  deep_focus: {
    name: 'Deep Focus',
    masterVolume: 0.5,
    sounds: { whitenoise: 0.5, rain: 0.3 }
  },
  cozy_reading: {
    name: 'Cozy Reading',
    masterVolume: 0.5,
    sounds: { fireplace: 0.6, rain: 0.3 }
  },
  nature_escape: {
    name: 'Nature Escape',
    masterVolume: 0.5,
    sounds: { forest: 0.7 }
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

// ─── AFK Detection ───────────────────────────────────

const AFK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes of inactivity

// ─── Hook ─────────────────────────────────────────────

export interface UseAmbientSoundsReturn {
  soundscapes: typeof SOUNDSCAPES
  activeSounds: SoundscapeId[]
  isOpen: boolean
  isExpanded: boolean
  isPaused: boolean
  masterVolume: number
  getVolume: (id: SoundscapeId) => number
  toggleSound: (id: SoundscapeId) => void
  setVolume: (id: SoundscapeId, volume: number) => void
  setMasterVolume: (volume: number) => void
  pause: () => void
  resume: () => void
  togglePause: () => void
  stopAll: () => void
  toggleOpen: () => void
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
  profiles: Record<string, VolumeProfile>
  activeProfileName: string | null
  applyProfile: (name: string) => void
  saveProfile: (name: string) => void
  deleteProfile: (name: string) => void
  toggleMute: () => void
  hasActiveSounds: boolean
  autoPauseOnAfk: boolean
  setAutoPauseOnAfk: (enabled: boolean) => void
}

export function useAmbientSounds(): UseAmbientSoundsReturn {
  const [activeSounds, setActiveSounds] = useState<SoundscapeId[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [masterVolume, setMasterVolumeState] = useState(0.5)
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [profiles, setProfiles] = useState<Record<string, VolumeProfile>>(loadProfiles)
  const [activeProfileName, setActiveProfileName] = useState<string | null>(loadActiveProfile)
  const [autoPauseOnAfk, setAutoPauseOnAfk] = useState(() => {
    try {
      return localStorage.getItem('soundscape:autoPauseAfk') !== 'false'
    } catch { return true }
  })

  const preMuteVolumeRef = useRef(0.5)
  const pausedByAfkRef = useRef(false)
  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist AFK preference
  useEffect(() => {
    localStorage.setItem('soundscape:autoPauseAfk', String(autoPauseOnAfk))
  }, [autoPauseOnAfk])

  // AFK detection - pause sounds after inactivity
  useEffect(() => {
    if (!autoPauseOnAfk) return

    const resetAfkTimer = (): void => {
      if (afkTimerRef.current) {
        clearTimeout(afkTimerRef.current)
      }

      // Resume if was paused by AFK
      if (pausedByAfkRef.current) {
        audioEngine.resume()
        setIsPaused(false)
        pausedByAfkRef.current = false
      }

      afkTimerRef.current = setTimeout(() => {
        if (audioEngine.getActiveSounds().length > 0 && !audioEngine.paused) {
          audioEngine.pause()
          setIsPaused(true)
          pausedByAfkRef.current = true
        }
      }, AFK_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetAfkTimer, { passive: true }))
    resetAfkTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetAfkTimer))
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current)
    }
  }, [autoPauseOnAfk])

  // Keyboard shortcut: M to toggle mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        if (masterVolume > 0) {
          preMuteVolumeRef.current = masterVolume
          audioEngine.masterVolume = 0
          setMasterVolumeState(0)
        } else {
          const vol = preMuteVolumeRef.current || 0.5
          audioEngine.masterVolume = vol
          setMasterVolumeState(vol)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [masterVolume])

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
      setIsOpen(true)
    }
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
      setMasterVolume(preMuteVolumeRef.current || 0.5)
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
    if (isPaused) resume()
    else pause()
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

    audioEngine.stopAll()
    audioEngine.masterVolume = profile.masterVolume
    setMasterVolumeState(profile.masterVolume)

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
    if (name in DEFAULT_PROFILES) return
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
    hasActiveSounds: activeSounds.length > 0,
    autoPauseOnAfk,
    setAutoPauseOnAfk
  }
}
