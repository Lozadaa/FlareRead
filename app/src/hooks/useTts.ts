import { useState, useEffect, useRef, useCallback } from 'react'

export interface TtsState {
  supported: boolean
  playing: boolean
  paused: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  rate: number
  /** Index of the paragraph currently being spoken (0-based) */
  currentParagraphIndex: number | null
  /** The sentence offset within the current utterance (character index) */
  currentCharIndex: number | null
}

export interface UseTtsOptions {
  onParagraphStart?: (index: number) => void
  onParagraphEnd?: (index: number) => void
  onEnd?: () => void
}

export function useTts(options?: UseTtsOptions) {
  const [state, setState] = useState<TtsState>({
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    playing: false,
    paused: false,
    voices: [],
    selectedVoice: null,
    rate: 1,
    currentParagraphIndex: null,
    currentCharIndex: null,
  })

  const optionsRef = useRef(options)
  optionsRef.current = options

  // Queue of paragraphs to speak
  const paragraphsRef = useRef<string[]>([])
  const startIndexRef = useRef(0)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const queueIndexRef = useRef(0)
  const stoppedRef = useRef(false)

  // Load available voices
  useEffect(() => {
    if (!state.supported) return

    function loadVoices() {
      const available = speechSynthesis.getVoices()
      if (available.length === 0) return

      // Prefer English voices, put them first
      const sorted = [...available].sort((a, b) => {
        const aEn = a.lang.startsWith('en')
        const bEn = b.lang.startsWith('en')
        if (aEn && !bEn) return -1
        if (!aEn && bEn) return 1
        // Prefer default voice
        if (a.default && !b.default) return -1
        if (!a.default && b.default) return 1
        return a.name.localeCompare(b.name)
      })

      setState((s) => ({
        ...s,
        voices: sorted,
        selectedVoice: s.selectedVoice || sorted.find((v) => v.default) || sorted[0] || null,
      }))
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [state.supported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
    }
  }, [])

  const speakParagraph = useCallback((text: string, paragraphIndex: number) => {
    const utterance = new SpeechSynthesisUtterance(text)
    currentUtteranceRef.current = utterance

    // Apply settings from current state
    setState((s) => {
      utterance.voice = s.selectedVoice
      utterance.rate = s.rate
      return s
    })

    utterance.onstart = () => {
      setState((s) => ({
        ...s,
        playing: true,
        paused: false,
        currentParagraphIndex: paragraphIndex,
        currentCharIndex: 0,
      }))
      optionsRef.current?.onParagraphStart?.(paragraphIndex)
    }

    utterance.onboundary = (e) => {
      if (e.name === 'word' || e.name === 'sentence') {
        setState((s) => ({ ...s, currentCharIndex: e.charIndex }))
      }
    }

    utterance.onend = () => {
      if (stoppedRef.current) return
      optionsRef.current?.onParagraphEnd?.(paragraphIndex)

      // Speak next paragraph in queue
      const nextQueueIdx = queueIndexRef.current + 1
      const nextText = paragraphsRef.current[nextQueueIdx]
      if (nextQueueIdx < paragraphsRef.current.length && nextText) {
        queueIndexRef.current = nextQueueIdx
        const nextParagraphIdx = startIndexRef.current + nextQueueIdx
        speakParagraph(nextText, nextParagraphIdx)
      } else {
        // All done
        setState((s) => ({
          ...s,
          playing: false,
          paused: false,
          currentParagraphIndex: null,
          currentCharIndex: null,
        }))
        optionsRef.current?.onEnd?.()
      }
    }

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return
      setState((s) => ({
        ...s,
        playing: false,
        paused: false,
        currentParagraphIndex: null,
        currentCharIndex: null,
      }))
    }

    speechSynthesis.speak(utterance)
  }, [])

  /** Start speaking from a list of paragraphs, beginning at startIndex */
  const speak = useCallback(
    (paragraphs: string[], startIndex: number = 0) => {
      if (!state.supported || paragraphs.length === 0) return

      // Stop any current speech
      speechSynthesis.cancel()
      stoppedRef.current = false

      paragraphsRef.current = paragraphs
      startIndexRef.current = startIndex
      queueIndexRef.current = 0

      const firstText = paragraphs[0]
      if (!firstText) return
      speakParagraph(firstText, startIndex)
    },
    [state.supported, speakParagraph]
  )

  /** Speak a single paragraph by index */
  const speakFromIndex = useCallback(
    (paragraphs: string[], index: number) => {
      const remaining = paragraphs.slice(index)
      speak(remaining, index)
    },
    [speak]
  )

  const pause = useCallback(() => {
    if (!state.supported) return
    speechSynthesis.pause()
    setState((s) => ({ ...s, paused: true }))
  }, [state.supported])

  const resume = useCallback(() => {
    if (!state.supported) return
    speechSynthesis.resume()
    setState((s) => ({ ...s, paused: false }))
  }, [state.supported])

  const stop = useCallback(() => {
    if (!state.supported) return
    stoppedRef.current = true
    speechSynthesis.cancel()
    currentUtteranceRef.current = null
    paragraphsRef.current = []
    queueIndexRef.current = 0
    setState((s) => ({
      ...s,
      playing: false,
      paused: false,
      currentParagraphIndex: null,
      currentCharIndex: null,
    }))
  }, [state.supported])

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setState((s) => ({ ...s, selectedVoice: voice }))
  }, [])

  const setRate = useCallback((rate: number) => {
    setState((s) => ({ ...s, rate: Math.max(0.5, Math.min(2, rate)) }))
  }, [])

  return {
    ...state,
    speak,
    speakFromIndex,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
  }
}
