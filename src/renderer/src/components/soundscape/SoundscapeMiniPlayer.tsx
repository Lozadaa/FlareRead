import { useState, useRef, useEffect } from 'react'
import {
  Volume2,
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
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseAmbientSoundsReturn } from '@/hooks/useAmbientSounds'
import type { SoundscapeId } from '@/lib/audioEngine'

interface SoundscapeMiniPlayerProps {
  sounds: UseAmbientSoundsReturn
}

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

export function SoundscapeMiniPlayer({ sounds }: SoundscapeMiniPlayerProps): JSX.Element | null {
  const {
    soundscapes,
    activeSounds,
    isOpen,
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
    profiles,
    activeProfileName,
    applyProfile,
    saveProfile,
    deleteProfile,
    hasActiveSounds
  } = sounds

  const [showProfiles, setShowProfiles] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const profileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (savingProfile && profileInputRef.current) {
      profileInputRef.current.focus()
    }
  }, [savingProfile])

  if (!isOpen) return null

  const handleSaveProfile = (): void => {
    if (newProfileName.trim()) {
      saveProfile(newProfileName.trim())
      setNewProfileName('')
      setSavingProfile(false)
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-40',
        'bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-xl',
        'transition-all duration-300 ease-out',
        isExpanded ? 'w-80' : 'w-auto'
      )}
    >
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-b border-border">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-ui-sm font-semibold text-foreground">Soundscapes</h3>
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
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-ui-xs text-muted-foreground font-medium">Volume Profiles</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {Object.entries(profiles).map(([key, profile]) => {
                  const isDefault = ['silent', 'rain_focus', 'cafe_study', 'deep_focus', 'cozy_reading', 'nature_escape'].includes(key)
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-ui-xs',
                        activeProfileName === key
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted text-foreground'
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
          <div className="pt-2 border-t border-border">
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
        {/* Active sound indicators */}
        <div className="flex items-center gap-0.5 px-1">
          {hasActiveSounds ? (
            activeSounds.map((id) => {
              const Icon = SOUND_ICONS[id]
              return (
                <Icon
                  key={id}
                  className={cn('h-3.5 w-3.5', isPaused ? 'text-muted-foreground' : SOUND_COLORS[id])}
                />
              )
            })
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

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
