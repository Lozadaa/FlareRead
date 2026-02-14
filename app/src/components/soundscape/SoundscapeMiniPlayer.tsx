import { useState, useRef, useEffect, useCallback } from 'react'
import type { UseAmbientSoundsReturn } from '@/hooks/useAmbientSounds'
import type { SoundscapeId } from '@/lib/audioEngine'

interface SoundscapeMiniPlayerProps {
  sounds: UseAmbientSoundsReturn
}

const STORAGE_KEY = 'flareread-soundscape-position'

// ─── Inline SVG Icons ─────────────────────────────────

function CloudRainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 14.5A4.5 4.5 0 0 1 6.5 10a5.5 5.5 0 0 1 10.785 1.003A3.5 3.5 0 0 1 20.5 14.5a3.5 3.5 0 0 1-3.5 3.5H6.5A4.5 4.5 0 0 1 2 14.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 19v2m4-2v2m4-2v2" />
    </svg>
  )
}

function CoffeeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Zm5-5v3m4-3v3" />
    </svg>
  )
}

function RadioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1M12 12h.01" />
    </svg>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c1 3 6 7 6 12a6 6 0 1 1-12 0c0-5 5-9 6-12Zm0 18a2.5 2.5 0 0 0 2.5-2.5c0-2-2.5-3.5-2.5-3.5s-2.5 1.5-2.5 3.5A2.5 2.5 0 0 0 12 20Z" />
    </svg>
  )
}

function TreePineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14l-3-3.3a1 1 0 0 1 .7-1.7h3.4L12 4l3.9 5h3.4a1 1 0 0 1 .7 1.7L17 14ZM12 22v-3" />
    </svg>
  )
}

function VolumeXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H2v6h4l5 4V5ZM22 9l-6 6M16 9l6 6" />
    </svg>
  )
}

function Volume1Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H2v6h4l5 4V5ZM15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function Volume2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H2v6h4l5 4V5ZM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 4.25l13 7.75-13 7.75V4.25Z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 4H6v16h4V4ZM18 4h-4v16h4V4Z" />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 15-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6m4-6v6" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" />
    </svg>
  )
}

// ─── Icon/Color Maps ──────────────────────────────────

const SOUND_ICONS: Record<SoundscapeId, React.FC<{ className?: string }>> = {
  rain: CloudRainIcon,
  coffeeshop: CoffeeIcon,
  whitenoise: RadioIcon,
  fireplace: FlameIcon,
  forest: TreePineIcon
}

const SOUND_COLORS: Record<SoundscapeId, string> = {
  rain: 'text-blue-400',
  coffeeshop: 'text-amber-500',
  whitenoise: 'text-slate-400',
  fireplace: 'text-orange-500',
  forest: 'text-emerald-500'
}

const SOUND_BG_ACTIVE: Record<SoundscapeId, string> = {
  rain: 'bg-blue-500/10 border-blue-500/30',
  coffeeshop: 'bg-amber-500/10 border-amber-500/30',
  whitenoise: 'bg-slate-500/10 border-slate-500/30',
  fireplace: 'bg-orange-500/10 border-orange-500/30',
  forest: 'bg-emerald-500/10 border-emerald-500/30'
}

// ─── Position Helpers ─────────────────────────────────

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return null
}

function clampPosition(
  x: number,
  y: number,
  elWidth: number,
  elHeight: number
): { x: number; y: number } {
  const maxX = window.innerWidth - elWidth
  const maxY = window.innerHeight - elHeight
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY))
  }
}

// ─── Component ────────────────────────────────────────

export function SoundscapeMiniPlayer({ sounds }: SoundscapeMiniPlayerProps) {
  const {
    soundscapes,
    activeSounds,
    isExpanded,
    isPaused,
    masterVolume,
    getVolume,
    toggleSound,
    setVolume,
    setMasterVolume,
    togglePause,
    stopAll,
    toggleExpanded,
    setExpanded,
    profiles,
    activeProfileName,
    applyProfile,
    saveProfile,
    deleteProfile,
    toggleMute,
    hasActiveSounds,
    autoPauseOnAfk,
    setAutoPauseOnAfk
  } = sounds

  const [showProfiles, setShowProfiles] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const profileInputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const saved = loadPosition()
    if (saved) setPosition(saved)
  }, [])

  useEffect(() => {
    if (position && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect()
      const clamped = clampPosition(position.x, position.y, rect.width, rect.height)
      if (clamped.x !== position.x || clamped.y !== position.y) {
        setPosition(clamped)
      }
    }
  }, [isExpanded]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const newX = e.clientX - dragOffsetRef.current.x
    const newY = e.clientY - dragOffsetRef.current.y
    const clamped = clampPosition(newX, newY, rect.width, rect.height)
    setPosition(clamped)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    document.body.style.userSelect = ''
    setPosition((prev) => {
      if (prev) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prev)) } catch { /* ignore */ }
      }
      return prev
    })
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!panelRef.current) return
      e.preventDefault()
      isDraggingRef.current = true
      document.body.style.userSelect = 'none'
      const rect = panelRef.current.getBoundingClientRect()
      dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (!position) {
        setPosition({ x: rect.left, y: rect.top })
      }
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [position, handleMouseMove, handleMouseUp]
  )

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (savingProfile && profileInputRef.current) {
      profileInputRef.current.focus()
    }
  }, [savingProfile])

  const handleSaveProfile = (): void => {
    if (newProfileName.trim()) {
      saveProfile(newProfileName.trim())
      setNewProfileName('')
      setSavingProfile(false)
    }
  }

  const isMuted = masterVolume === 0

  const MuteIcon = isMuted ? VolumeXIcon : masterVolume < 0.5 ? Volume1Icon : Volume2Icon

  const positionStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : { right: 16, bottom: 16 }

  const DEFAULT_PROFILE_KEYS = ['silent', 'rain_focus', 'cafe_study', 'deep_focus', 'cozy_reading', 'nature_escape']

  return (
    <div
      ref={panelRef}
      className={`
        fixed z-40
        bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)]
        transition-[width] duration-300 ease-out
        ${isExpanded ? 'w-80' : 'w-auto'}
      `}
      style={positionStyle}
    >
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-b border-border/40">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                onMouseDown={handleDragStart}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title="Drag to move"
              >
                <GripIcon className="h-4 w-4" />
              </div>
              <h3 className="text-ui-sm font-semibold text-foreground">Soundscapes</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowProfiles(!showProfiles)}
                className={`p-1 rounded text-ui-xs transition-colors ${
                  showProfiles ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Volume profiles"
              >
                Profiles
              </button>
            </div>
          </div>

          {/* Profiles Panel */}
          {showProfiles && (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
              <p className="text-ui-xs text-muted-foreground/70 font-medium uppercase tracking-wider">Volume Profiles</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {Object.entries(profiles).map(([key, profile]) => {
                  const isDefault = DEFAULT_PROFILE_KEYS.includes(key)
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-ui-xs ${
                        activeProfileName === key
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/30 text-foreground'
                      }`}
                      onClick={() => applyProfile(key)}
                    >
                      <span className="flex items-center gap-1.5">
                        {activeProfileName === key && <CheckIcon className="h-3 w-3" />}
                        {profile.name}
                      </span>
                      {!isDefault && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProfile(key) }}
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Save new profile */}
              {savingProfile ? (
                <div className="flex items-center gap-1.5">
                  <input
                    ref={profileInputRef}
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveProfile()
                      if (e.key === 'Escape') setSavingProfile(false)
                    }}
                    placeholder="Profile name..."
                    className="flex-1 h-6 rounded border border-input bg-background px-2 text-ui-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={!newProfileName.trim()}
                    className="p-1 text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                  >
                    <CheckIcon className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingProfile(true)}
                  disabled={!hasActiveSounds}
                  className="flex items-center gap-1.5 text-ui-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  <SaveIcon className="h-3 w-3" />
                  Save current as profile
                </button>
              )}
            </div>
          )}

          {/* Sound grid */}
          <div className="space-y-2">
            {soundscapes.map((soundscape) => {
              const Icon = SOUND_ICONS[soundscape.id]
              const isActive = activeSounds.includes(soundscape.id)
              const volume = getVolume(soundscape.id)

              return (
                <div key={soundscape.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSound(soundscape.id)}
                      className={`flex items-center gap-2 flex-1 px-2.5 py-2 rounded-lg border transition-all text-left ${
                        isActive
                          ? SOUND_BG_ACTIVE[soundscape.id]
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? SOUND_COLORS[soundscape.id] : 'text-muted-foreground'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className={`text-ui-xs font-medium transition-colors ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {soundscape.name}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Volume slider */}
                  {isActive && (
                    <div className="flex items-center gap-2 pl-2 pr-1">
                      <VolumeXIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(e) => setVolume(soundscape.id, Number(e.target.value) / 100)}
                        className="flex-1 h-1 rounded-full appearance-none bg-input accent-primary cursor-pointer"
                      />
                      <Volume2Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-ui-xs text-muted-foreground tabular-nums w-8 text-right">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Master volume */}
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-ui-xs text-muted-foreground font-medium w-14">Master</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(masterVolume * 100)}
                onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
                className="flex-1 h-1 rounded-full appearance-none bg-input accent-primary cursor-pointer"
              />
              <span className="text-ui-xs text-muted-foreground tabular-nums w-8 text-right">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </div>

          {/* AFK auto-pause toggle */}
          <div className="pt-2 border-t border-border/40">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-ui-xs text-muted-foreground">Auto-pause on AFK</span>
              <button
                onClick={() => setAutoPauseOnAfk(!autoPauseOnAfk)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoPauseOnAfk ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    autoPauseOnAfk ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      )}

      {/* Collapsed mini-bar */}
      <div className="flex items-center gap-1 p-2">
        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          title="Drag to move"
        >
          <GripIcon className="h-3.5 w-3.5" />
        </div>

        {/* Active sound indicators */}
        <div className="flex items-center gap-0.5 px-1">
          {hasActiveSounds ? (
            activeSounds.map((id) => {
              const Icon = SOUND_ICONS[id]
              return (
                <Icon
                  key={id}
                  className={`h-3.5 w-3.5 ${isPaused || isMuted ? 'text-muted-foreground' : SOUND_COLORS[id]}`}
                />
              )
            })
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Open soundscapes"
            >
              <Volume2Icon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mute + volume slider */}
        {hasActiveSounds && (
          <>
            <button
              onClick={toggleMute}
              className={`p-1 rounded hover:bg-muted transition-colors ${
                isMuted ? 'text-destructive/70 hover:text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              <MuteIcon className="h-3.5 w-3.5" />
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(masterVolume * 100)}
              onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
              className="w-20 h-1 rounded-full appearance-none bg-input accent-primary cursor-pointer"
              title={`Volume: ${Math.round(masterVolume * 100)}%`}
            />
          </>
        )}

        {/* Play/Pause */}
        {hasActiveSounds && (
          <button
            onClick={togglePause}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <PlayIcon className="h-3.5 w-3.5" /> : <PauseIcon className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Expand/collapse */}
        <button
          onClick={toggleExpanded}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Stop all */}
        {hasActiveSounds && (
          <button
            onClick={stopAll}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            title="Stop all"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
