import { createContext, useContext } from 'react'
import { useAmbientSounds, type UseAmbientSoundsReturn } from '@/hooks/useAmbientSounds'

const AmbientSoundsContext = createContext<UseAmbientSoundsReturn | null>(null)

export function AmbientSoundsProvider({ children }: { children: React.ReactNode }) {
  const sounds = useAmbientSounds()

  return (
    <AmbientSoundsContext.Provider value={sounds}>
      {children}
    </AmbientSoundsContext.Provider>
  )
}

export function useAmbientSoundsContext(): UseAmbientSoundsReturn {
  const ctx = useContext(AmbientSoundsContext)
  if (!ctx) throw new Error('useAmbientSoundsContext must be used within AmbientSoundsProvider')
  return ctx
}
