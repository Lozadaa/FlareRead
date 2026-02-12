import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Volume2,
  Volume1,
  VolumeX,
  Pause,
  Play,
  ChevronUp,
  ChevronDown,
  X,
  CloudRain,
  Coffee,
  Radio,
  Flame,
  TreePine,
  Save,
  Trash2,
  Check,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseAmbientSoundsReturn } from '@/hooks/useAmbientSounds'
import type { SoundscapeId } from '@/lib/audioEngine'

interface SoundscapeMiniPlayerProps {
  sounds: UseAmbientSoundsReturn
}

const STORAGE_KEY = 'flareread-soundscape-position'

const SOUND_ICONS: Record<SoundscapeId, typeof CloudRain> = {
  rain: CloudRain,
  coffeeshop: Coffee,
  whitenoise: Radio,
  fireplace: Flame,
  forest: TreePine
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

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed
      }
    }
  } catch {
    // ignore
  }
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

export function SoundscapeMiniPlayer({ sounds }: SoundscapeMiniPlayerProps): JSX.Element {
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
    hasActiveSounds
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

  // Load saved position on mount
  useEffect(() => {
    const saved = loadPosition()
    if (saved) {
      setPosition(saved)
    }
  }, [])

  // Re-clamp when panel expands/collapses (size changes)
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
    // Save position
    setPosition((prev) => {
      if (prev) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prev))
        } catch {
          // ignore
        }
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
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      // If position wasn't set yet (using default CSS position), initialize from current rect
      if (!position) {
        setPosition({ x: rect.left, y: rect.top })
      }
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [position, handleMouseMove, handleMouseUp]
  )

  // Cleanup listeners on unmount
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

  const MuteIcon = isMuted ? VolumeX : masterVolume < 0.5 ? Volume1 : Volume2

  // When position is set, use absolute left/top; otherwise fall back to bottom-right via CSS
  const positionStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
    : { right: 16, bottom: 16 }

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-40',
        'bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)]',
        'transition-[width] duration-300 ease-out',
        isExpanded ? 'w-80' : 'w-auto'
      )}
      style={positionStyle}
    >
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-b border-border/40">
          {/* Header with drag handle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                onMouseDown={handleDragStart}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title="Drag to move"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <h3 className="text-ui-sm font-semibold text-foreground">Soundscapes</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowProfiles(!showProfiles)}
                className={cn(
                  'p-1 rounded text-muted-foreground hover:text-foreground transition-colors text-ui-xs',
                  showProfiles && 'text-primary'
                )}
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
                  const isDefault = ['silent', 'rain_focus', 'cafe_study', 'deep_focus', 'cozy_reading', 'nature_escape'].includes(key)
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-ui-xs',
                        activeProfileName === key
                          ? 'bg-primary/8 text-primary'
                          : 'hover:bg-muted/30 text-foreground'
                      )}
                      onClick={() => applyProfile(key)}
                    >
                      <span className="flex items-center gap-1.5">
                        {activeProfileName === key && <Check className="h-3 w-3" />}
                        {profile.name}
                      </span>
                      {!isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteProfile(key)
                          }}
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
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
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingProfile(true)}
                  disabled={!hasActiveSounds}
                  className="flex items-center gap-1.5 text-ui-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  <Save className="h-3 w-3" />
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
                    {/* Toggle button */}
                    <button
                      onClick={() => toggleSound(soundscape.id)}
                      className={cn(
                        'flex items-center gap-2 flex-1 px-2.5 py-2 rounded-lg border transition-all text-left',
                        isActive
                          ? SOUND_BG_ACTIVE[soundscape.id]
                          : 'border-transparent hover:bg-muted/50'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? SOUND_COLORS[soundscape.id] : 'text-muted-foreground'
                        )}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-ui-xs font-medium transition-colors',
                            isActive ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {soundscape.name}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Volume slider - visible only when active */}
                  {isActive && (
                    <div className="flex items-center gap-2 pl-2 pr-1">
                      <VolumeX className="h-3 w-3 text-muted-foreground shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(e) => setVolume(soundscape.id, Number(e.target.value) / 100)}
                        className="flex-1 h-1 rounded-full appearance-none bg-input accent-primary cursor-pointer"
                      />
                      <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
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
        </div>
      )}

      {/* Collapsed mini-bar */}
      <div className="flex items-center gap-1 p-2">
        {/* Drag handle for collapsed state */}
        <div
          onMouseDown={handleDragStart}
          className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          title="Drag to move"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Active sound indicators or idle speaker icon */}
        <div className="flex items-center gap-0.5 px-1">
          {hasActiveSounds ? (
            activeSounds.map((id) => {
              const Icon = SOUND_ICONS[id]
              return (
                <Icon
                  key={id}
                  className={cn('h-3.5 w-3.5', isPaused || isMuted ? 'text-muted-foreground' : SOUND_COLORS[id])}
                />
              )
            })
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              title="Open soundscapes"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mute toggle + inline volume slider — visible when sounds are active */}
        {hasActiveSounds && (
          <>
            <button
              onClick={toggleMute}
              className={cn(
                'p-1 rounded hover:bg-muted transition-colors',
                isMuted ? 'text-destructive/70 hover:text-destructive' : 'text-muted-foreground hover:text-foreground'
              )}
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
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Expand/collapse */}
        <button
          onClick={toggleExpanded}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Stop all */}
        {hasActiveSounds && (
          <button
            onClick={stopAll}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            title="Stop all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
