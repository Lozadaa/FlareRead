import { useAmbientSoundsContext } from '@/contexts/AmbientSoundsContext'
import { SoundscapeMiniPlayer } from './SoundscapeMiniPlayer'

export function GlobalSoundscapePlayer() {
  const sounds = useAmbientSoundsContext()

  // Only render when the mini-player is open (has been activated at least once)
  if (!sounds.isOpen) return null

  return <SoundscapeMiniPlayer sounds={sounds} />
}
