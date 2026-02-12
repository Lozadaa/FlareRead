import { useState } from 'react'
import { TtsSnapshot, TtsVoice, TTS_RATES, TtsRate } from '@/types'
import type { UseTtsReturn } from '@/hooks/useTts'

interface TtsBarProps {
  tts: UseTtsReturn
  visible: boolean
  onClose: () => void
}

export function TtsBar({ tts, visible, onClose }: TtsBarProps) {
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const { snapshot, voices, installed, installing, downloadProgress, error, volume } = tts

  if (!visible) return null

  // Not installed — show setup card (floating bottom-right)
  if (installed === false) {
    return (
      <div className="fixed bottom-14 right-4 z-50 w-80 bg-popover/95 backdrop-blur-xl rounded-xl shadow-lg border border-border px-4 py-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
        {/* Install error */}
        {error && !installing && (
          <div className="mb-2 px-2 py-1.5 rounded bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <SpeakerIcon size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Lectura en voz alta</p>
            <p className="text-xs text-muted-foreground">
              {installing
                ? downloadProgress?.label || 'Preparando instalación...'
                : error
                  ? 'Haz clic en reintentar para intentar de nuevo'
                  : 'Instala Kokoro TTS para leer en voz alta (offline)'}
            </p>
            {installing && (
              <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress?.percent ?? 0}%` }}
                />
              </div>
            )}
          </div>
          {!installing && (
            <button
              onClick={tts.install}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              {error ? 'Reintentar' : 'Instalar'}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Cerrar"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (installed === null) return null

  const isActive = snapshot && snapshot.state !== 'idle'
  const isSpeaking = snapshot?.state === 'speaking'
  const isPaused = snapshot?.state === 'paused'
  const isLoading = snapshot?.state === 'loading'

  const currentVoice = voices.find((v) => v.id === snapshot?.voiceId) || voices[0]

  return (
    <div className="fixed bottom-14 right-4 z-50 bg-popover/95 backdrop-blur-xl rounded-xl shadow-lg border border-border px-3 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
      {/* Error toast */}
      {error && (
        <div className="mb-1.5 px-2 py-1 rounded bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Prev chunk */}
        <button
          onClick={tts.prevChunk}
          disabled={!isActive || (snapshot?.currentChunkIndex ?? 0) <= 0}
          className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20 transition-all"
          aria-label="Chunk anterior"
          title="Anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => {
            if (isSpeaking) tts.pause()
            else if (isPaused) tts.resume()
          }}
          disabled={!isActive && !isLoading}
          className="p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
          aria-label={isSpeaking ? 'Pausar' : 'Reproducir'}
        >
          {isLoading ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : isSpeaking ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Next chunk */}
        <button
          onClick={tts.nextChunk}
          disabled={!isActive || (snapshot?.currentChunkIndex ?? 0) >= (snapshot?.totalChunks ?? 1) - 1}
          className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20 transition-all"
          aria-label="Siguiente chunk"
          title="Siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        {/* Stop */}
        <button
          onClick={tts.stop}
          disabled={!isActive}
          className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-20 transition-all"
          aria-label="Detener"
          title="Detener"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Chunk counter */}
        {isActive && (
          <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
            {(snapshot?.currentChunkIndex ?? 0) + 1}/{snapshot?.totalChunks ?? 0}
          </span>
        )}

        {/* Separator */}
        {isActive && <div className="w-px h-5 bg-border mx-0.5" />}

        {/* Voice selector */}
        <div className="relative">
          <button
            onClick={() => setShowVoiceMenu(!showVoiceMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Cambiar voz"
          >
            <SpeakerIcon size={12} />
            <span className="max-w-[80px] truncate">{currentVoice?.name || 'Voz'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showVoiceMenu && (
            <>
              <div className="fixed inset-0 z-[999]" onClick={() => setShowVoiceMenu(false)} />
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-popover border border-border rounded-lg shadow-lg z-[1000] py-1 animate-in fade-in zoom-in-95 duration-100">
                {voices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      tts.setVoice(voice.id)
                      setShowVoiceMenu(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
                      voice.id === snapshot?.voiceId ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    <span className="flex-1 truncate">{voice.name}</span>
                    <span className="text-muted-foreground text-[10px]">{voice.language}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Rate buttons */}
        <div className="flex items-center gap-0.5">
          {TTS_RATES.map((rate) => (
            <button
              key={rate}
              onClick={() => tts.setRate(rate)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                (snapshot?.rate ?? 1) === rate
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              title={`Velocidad ${rate}x`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Volume slider */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => tts.setVolume(volume === 0 ? 1 : 0)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          >
            {volume === 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => tts.setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 accent-primary cursor-pointer"
            title={`Volumen: ${Math.round(volume * 100)}%`}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Close button */}
        <button
          onClick={() => {
            if (isActive) tts.stop()
            onClose()
          }}
          className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
          aria-label="Cerrar TTS"
          title="Cerrar"
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Icon Components ─────────────────────────────────

function SpeakerIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
