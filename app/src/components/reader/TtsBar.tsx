import { useState, useRef, useEffect } from 'react'

interface TtsBarProps {
  supported: boolean
  playing: boolean
  paused: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  rate: number
  onPlay: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onVoiceChange: (voice: SpeechSynthesisVoice) => void
  onRateChange: (rate: number) => void
  onClose: () => void
}

const RATE_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2]

export function TtsBar({
  supported,
  playing,
  paused,
  voices,
  selectedVoice,
  rate,
  onPlay,
  onPause,
  onResume,
  onStop,
  onVoiceChange,
  onRateChange,
  onClose,
}: TtsBarProps) {
  const [showVoices, setShowVoices] = useState(false)
  const [showSpeed, setShowSpeed] = useState(false)
  const voiceDropdownRef = useRef<HTMLDivElement>(null)
  const speedDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target as Node)) {
        setShowVoices(false)
      }
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(e.target as Node)) {
        setShowSpeed(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!supported) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border-t border-border">
        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <span className="text-ui-xs font-body text-muted-foreground">
          Text-to-speech is not supported in this browser
        </span>
        <button
          onClick={onClose}
          className="ml-auto w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  const isActive = playing || paused

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-card border-t border-border shrink-0 animate-fade-in">
      {/* Play / Pause */}
      {!isActive ? (
        <button
          onClick={onPlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Read aloud"
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      ) : paused ? (
        <button
          onClick={onResume}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Resume"
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onPause}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Pause"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>
      )}

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={!isActive}
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
        title="Stop"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z" />
        </svg>
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Speed selector */}
      <div className="relative" ref={speedDropdownRef}>
        <button
          onClick={() => { setShowSpeed(!showSpeed); setShowVoices(false) }}
          className={`
            h-7 px-2 flex items-center gap-1 rounded-md text-ui-xs font-body font-medium transition-colors
            ${showSpeed ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
          `}
          title="Playback speed"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          {rate}x
        </button>

        {showSpeed && (
          <div className="absolute bottom-full left-0 mb-1 py-1 w-24 bg-popover border border-border rounded-lg shadow-lg z-50">
            {RATE_PRESETS.map((r) => (
              <button
                key={r}
                onClick={() => { onRateChange(r); setShowSpeed(false) }}
                className={`
                  w-full px-3 py-1.5 text-ui-xs font-body text-left transition-colors
                  ${rate === r ? 'text-primary font-medium bg-primary/5' : 'text-foreground hover:bg-accent'}
                `}
              >
                {r}x{r === 1 ? ' (Normal)' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice selector */}
      <div className="relative" ref={voiceDropdownRef}>
        <button
          onClick={() => { setShowVoices(!showVoices); setShowSpeed(false) }}
          className={`
            h-7 px-2 flex items-center gap-1 rounded-md text-ui-xs font-body transition-colors max-w-[160px]
            ${showVoices ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
          `}
          title="Select voice"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
          <span className="truncate">{selectedVoice?.name ?? 'Default'}</span>
        </button>

        {showVoices && (
          <div className="absolute bottom-full left-0 mb-1 py-1 w-64 max-h-56 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
            {voices.map((v) => (
              <button
                key={v.voiceURI}
                onClick={() => { onVoiceChange(v); setShowVoices(false) }}
                className={`
                  w-full px-3 py-1.5 text-ui-xs font-body text-left transition-colors flex items-center gap-2
                  ${selectedVoice?.voiceURI === v.voiceURI ? 'text-primary font-medium bg-primary/5' : 'text-foreground hover:bg-accent'}
                `}
              >
                <span className="truncate">{v.name}</span>
                <span className="text-muted-foreground shrink-0 text-[10px]">{v.lang}</span>
              </button>
            ))}
            {voices.length === 0 && (
              <div className="px-3 py-2 text-ui-xs text-muted-foreground font-body">No voices available</div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Playing indicator */}
      {playing && !paused && (
        <div className="flex items-center gap-1 mr-1">
          <div className="flex items-end gap-[2px] h-3">
            <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
            <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
            <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
            <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '80%', animationDelay: '100ms' }} />
          </div>
          <span className="text-ui-xs font-body text-primary font-medium ml-1">Reading</span>
        </div>
      )}

      {paused && (
        <span className="text-ui-xs font-body text-muted-foreground mr-1">Paused</span>
      )}

      {/* Close TTS bar */}
      <button
        onClick={() => { onStop(); onClose() }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Close read aloud"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
