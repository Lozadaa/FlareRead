import { useState, useEffect, useRef, useCallback } from 'react'
import ePub, { type Book, type Rendition, type NavItem } from 'epubjs'
import type { ReadingSettings } from '@/types'
import type { HighlightDoc } from '@/types'

export type ViewMode = 'paginated' | 'scrolled'

export interface SelectionInfo {
  cfiRange: string
  text: string
  /** Bounding rect relative to the reader container */
  rect: { x: number; y: number; width: number; height: number }
}

export interface ReaderState {
  loading: boolean
  error: string | null
  currentCfi: string | null
  currentChapter: string | null
  percentComplete: number
  toc: NavItem[]
  totalPages: number
  currentPage: number
}

interface UseReaderOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  epubUrl: string | null
  initialCfi: string | null
  settings: ReadingSettings
  viewMode: ViewMode
  onLocationChange?: (cfi: string, percent: number, chapter: string | null) => void
  onImageClick?: (src: string) => void
  onTextSelected?: (info: SelectionInfo) => void
  onHighlightClicked?: (highlightId: string, cfiRange: string, rect: { x: number; y: number; width: number; height: number }) => void
}

export function useReader({
  containerRef,
  epubUrl,
  initialCfi,
  settings,
  viewMode,
  onLocationChange,
  onImageClick,
  onTextSelected,
  onHighlightClicked,
}: UseReaderOptions) {
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)

  const [state, setState] = useState<ReaderState>({
    loading: true,
    error: null,
    currentCfi: initialCfi,
    currentChapter: null,
    percentComplete: 0,
    toc: [],
    totalPages: 0,
    currentPage: 0,
  })

  // Track latest callbacks in refs to avoid re-rendering the rendition
  const onLocationChangeRef = useRef(onLocationChange)
  onLocationChangeRef.current = onLocationChange
  const onImageClickRef = useRef(onImageClick)
  onImageClickRef.current = onImageClick
  const onTextSelectedRef = useRef(onTextSelected)
  onTextSelectedRef.current = onTextSelected
  const onHighlightClickedRef = useRef(onHighlightClicked)
  onHighlightClickedRef.current = onHighlightClicked
  const viewModeRef = useRef(viewMode)
  viewModeRef.current = viewMode

  // Track registered highlight annotations for cleanup
  const registeredHighlightsRef = useRef<Set<string>>(new Set())

  // Helper: register content hooks (images, selection)
  function registerContentHooks(rendition: Rendition) {
    rendition.hooks.content.register((contents: { document: Document; documentElement: HTMLElement; content: HTMLElement }) => {
      const doc = contents.document

      // Image click hooks
      const images = doc.querySelectorAll('img')
      images.forEach((img) => {
        img.style.cursor = 'zoom-in'
        img.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const src = (e.target as HTMLImageElement).src
          if (src) onImageClickRef.current?.(src)
        })
      })
    })

    // Text selection handler via epub.js 'selected' event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rendition.on('selected', (cfiRange: string, contents: any) => {
      if (!onTextSelectedRef.current) return
      try {
        const range = contents.range(cfiRange)
        if (!range) return
        const text = range.toString().trim()
        if (!text) return

        // Get bounding rect and convert to container-relative coordinates
        const rangeRect = range.getBoundingClientRect()
        const containerEl = containerRef.current
        if (!containerEl) return
        const containerRect = containerEl.getBoundingClientRect()

        // epub.js renders in an iframe; the contents.document is inside that iframe.
        // We need to find the iframe element to get proper offset
        const iframe = containerEl.querySelector('iframe')
        const iframeRect = iframe ? iframe.getBoundingClientRect() : containerRect

        const rect = {
          x: rangeRect.left + (iframeRect.left - containerRect.left),
          y: rangeRect.top + (iframeRect.top - containerRect.top),
          width: rangeRect.width,
          height: rangeRect.height,
        }

        onTextSelectedRef.current({ cfiRange, text, rect })
      } catch {
        // Ignore selection errors
      }
    })

    // Mark/click handler for highlights
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rendition.on('markClicked', (cfiRange: string, _data: any, _contents: any) => {
      if (!onHighlightClickedRef.current) return
      try {
        const containerEl = containerRef.current
        if (!containerEl) return
        const containerRect = containerEl.getBoundingClientRect()
        const iframe = containerEl.querySelector('iframe')
        const iframeRect = iframe ? iframe.getBoundingClientRect() : containerRect

        // Try to get the range rect from the annotation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const annotations = (rendition as any).annotations
        if (annotations && annotations._annotations) {
          const annotation = annotations._annotations[cfiRange]
          if (annotation && annotation.mark) {
            const element = annotation.mark.element
            if (element) {
              const elemRect = element.getBoundingClientRect()
              const rect = {
                x: elemRect.left + (iframeRect.left - containerRect.left),
                y: elemRect.top + (iframeRect.top - containerRect.top),
                width: elemRect.width,
                height: elemRect.height,
              }
              // Find highlight ID from data attribute
              const highlightId = element.dataset?.highlightId || ''
              onHighlightClickedRef.current(highlightId, cfiRange, rect)
              return
            }
          }
        }

        // Fallback: provide center of container
        onHighlightClickedRef.current('', cfiRange, {
          x: containerRect.width / 2,
          y: containerRect.height / 3,
          width: 0,
          height: 0,
        })
      } catch {
        // Ignore errors
      }
    })
  }

  // Helper: register location change handler
  function registerLocationHandler(rendition: Rendition, toc: NavItem[], book: Book, cancelled: { value: boolean }) {
    rendition.on('relocated', (location: { start: { cfi: string }; end: { cfi: string } }) => {
      if (cancelled.value) return

      const cfi = location.start.cfi

      // Calculate percentage
      const loc = book.locations
      let percent = 0
      if (loc && typeof loc.percentageFromCfi === 'function') {
        percent = Math.round((loc.percentageFromCfi(cfi) || 0) * 100)
      }

      // Find current chapter
      const chapter = findChapter(toc, cfi, book)

      setState((s) => ({
        ...s,
        currentCfi: cfi,
        percentComplete: percent,
        currentChapter: chapter,
      }))

      onLocationChangeRef.current?.(cfi, percent, chapter)
    })
  }

  // Initialize book and rendition
  useEffect(() => {
    if (!epubUrl || !containerRef.current) return

    let cancelled = false
    const cancelledObj = { value: false }
    const container = containerRef.current

    setState((s) => ({ ...s, loading: true, error: null }))

    const book = ePub(epubUrl)
    bookRef.current = book

    book.ready
      .then(async () => {
        if (cancelled) return

        // Get TOC
        const nav = await book.loaded.navigation
        const toc = nav.toc || []

        setState((s) => ({ ...s, toc }))

        // Create rendition
        const rendition = book.renderTo(container, {
          width: '100%',
          height: '100%',
          flow: viewMode === 'paginated' ? 'paginated' : 'scrolled-doc',
          spread: 'none',
          snap: viewMode === 'paginated',
        })

        renditionRef.current = rendition
        registeredHighlightsRef.current.clear()

        // Apply initial styles
        applyStyles(rendition, settings)

        // Register hooks
        registerContentHooks(rendition)
        registerLocationHandler(rendition, toc, book, cancelledObj)

        // Generate locations for percentage tracking
        await book.locations.generate(1024)

        // Display initial location
        if (initialCfi) {
          await rendition.display(initialCfi)
        } else {
          await rendition.display()
        }

        if (!cancelled) {
          setState((s) => ({ ...s, loading: false }))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load EPUB',
          }))
        }
      })

    return () => {
      cancelled = true
      cancelledObj.value = true
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
      registeredHighlightsRef.current.clear()
      // Clear the container
      container.innerHTML = ''
    }
    // Only re-init when the EPUB URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epubUrl])

  // Update styles when settings change
  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition) return
    applyStyles(rendition, settings)
  }, [settings])

  // Handle view mode changes by re-creating rendition
  useEffect(() => {
    const rendition = renditionRef.current
    const book = bookRef.current
    const container = containerRef.current
    if (!rendition || !book || !container) return

    // Get current location before destroying
    const currentCfi = state.currentCfi

    rendition.destroy()
    container.innerHTML = ''

    const newRendition = book.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: viewMode === 'paginated' ? 'paginated' : 'scrolled-doc',
      spread: 'none',
      snap: viewMode === 'paginated',
    })
    renditionRef.current = newRendition
    registeredHighlightsRef.current.clear()

    applyStyles(newRendition, settings)

    // Re-register hooks
    registerContentHooks(newRendition)
    const toc = state.toc
    const cancelledObj = { value: false }
    registerLocationHandler(newRendition, toc, book, cancelledObj)

    if (currentCfi) {
      newRendition.display(currentCfi)
    } else {
      newRendition.display()
    }

    return () => {
      cancelledObj.value = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  // Render highlights on the rendition
  const renderHighlights = useCallback((highlights: HighlightDoc[]) => {
    const rendition = renditionRef.current
    if (!rendition) return

    // Remove previously registered annotations that are no longer present
    const currentIds = new Set(highlights.map((h) => h.cfiRange))
    for (const cfi of registeredHighlightsRef.current) {
      if (!currentIds.has(cfi)) {
        try {
          rendition.annotations.remove(cfi, 'highlight')
        } catch {
          // Ignore removal errors
        }
        registeredHighlightsRef.current.delete(cfi)
      }
    }

    // Add new highlight annotations
    for (const h of highlights) {
      if (registeredHighlightsRef.current.has(h.cfiRange)) continue
      try {
        rendition.annotations.add(
          'highlight',
          h.cfiRange,
          { id: h.id },
          undefined,
          'epubjs-hl',
          { fill: h.color, 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' }
        )
        registeredHighlightsRef.current.add(h.cfiRange)
      } catch {
        // Ignore if CFI range is not valid for current section
      }
    }
  }, [])

  // Clear text selection in the epub iframe
  const clearSelection = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const iframe = container.querySelector('iframe')
    if (iframe?.contentWindow) {
      iframe.contentWindow.getSelection()?.removeAllRanges()
    }
  }, [containerRef])

  // Navigation
  const goNext = useCallback(() => {
    renditionRef.current?.next()
  }, [])

  const goPrev = useCallback(() => {
    renditionRef.current?.prev()
  }, [])

  const goToCfi = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi)
  }, [])

  const goToChapter = useCallback((href: string) => {
    renditionRef.current?.display(href)
  }, [])

  // ─── TTS helpers ───────────────────────────────────

  /** Get all readable paragraph elements from the current EPUB iframe */
  const getContentParagraphs = useCallback((): HTMLElement[] => {
    const container = containerRef.current
    if (!container) return []
    const iframe = container.querySelector('iframe')
    if (!iframe?.contentDocument) return []
    const doc = iframe.contentDocument
    const elements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td')
    return Array.from(elements).filter((el) => {
      const text = el.textContent?.trim()
      return text && text.length > 0
    }) as HTMLElement[]
  }, [containerRef])

  /** Extract text content of all paragraphs in the current section */
  const getChapterParagraphs = useCallback((): string[] => {
    return getContentParagraphs().map((el) => el.textContent?.trim() ?? '').filter(Boolean)
  }, [getContentParagraphs])

  /** Highlight a specific paragraph by index (add a visual highlight class) */
  const highlightTtsParagraph = useCallback((index: number | null) => {
    const container = containerRef.current
    if (!container) return
    const iframe = container.querySelector('iframe')
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument

    // Remove previous TTS highlights
    doc.querySelectorAll('.flareread-tts-active').forEach((el) => {
      el.classList.remove('flareread-tts-active')
    })

    if (index === null) return

    const paragraphs = getContentParagraphs()
    const target = paragraphs[index]
    if (!target) return

    // Inject TTS highlight style if not present
    if (!doc.getElementById('flareread-tts-style')) {
      const style = doc.createElement('style')
      style.id = 'flareread-tts-style'
      style.textContent = `
        .flareread-tts-active {
          background: rgba(59, 130, 246, 0.12) !important;
          border-radius: 4px !important;
          outline: 2px solid rgba(59, 130, 246, 0.3) !important;
          outline-offset: 2px !important;
          transition: background 0.2s ease, outline 0.2s ease !important;
        }
        .flareread-tts-play-btn {
          position: absolute;
          left: -28px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(30, 60, 42, 0.08);
          border: 1px solid rgba(30, 60, 42, 0.15);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 10;
        }
        .flareread-tts-play-btn svg {
          width: 10px;
          height: 10px;
          fill: rgba(30, 60, 42, 0.6);
          margin-left: 1px;
        }
        .flareread-tts-para-wrap {
          position: relative;
        }
        .flareread-tts-para-wrap:hover .flareread-tts-play-btn {
          opacity: 1;
        }
      `
      doc.head.appendChild(style)
    }

    target.classList.add('flareread-tts-active')

    // Scroll the highlighted paragraph into view within the iframe
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [containerRef, getContentParagraphs])

  /** Inject inline play buttons on paragraphs inside the EPUB iframe */
  const injectTtsPlayButtons = useCallback((onPlayFromIndex: (index: number) => void) => {
    const container = containerRef.current
    if (!container) return
    const iframe = container.querySelector('iframe')
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument

    // Clean up previously injected buttons
    doc.querySelectorAll('.flareread-tts-play-btn').forEach((el) => el.remove())
    doc.querySelectorAll('.flareread-tts-para-wrap').forEach((el) => {
      const parent = el.parentNode
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
      }
    })

    // Inject TTS styles if not present
    if (!doc.getElementById('flareread-tts-style')) {
      const style = doc.createElement('style')
      style.id = 'flareread-tts-style'
      style.textContent = `
        .flareread-tts-active {
          background: rgba(59, 130, 246, 0.12) !important;
          border-radius: 4px !important;
          outline: 2px solid rgba(59, 130, 246, 0.3) !important;
          outline-offset: 2px !important;
          transition: background 0.2s ease, outline 0.2s ease !important;
        }
        .flareread-tts-play-btn {
          position: absolute;
          left: -28px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(30, 60, 42, 0.08);
          border: 1px solid rgba(30, 60, 42, 0.15);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 10;
        }
        .flareread-tts-play-btn svg {
          width: 10px;
          height: 10px;
          fill: rgba(30, 60, 42, 0.6);
          margin-left: 1px;
        }
        .flareread-tts-para-wrap {
          position: relative;
        }
        .flareread-tts-para-wrap:hover .flareread-tts-play-btn {
          opacity: 1;
        }
      `
      doc.head.appendChild(style)
    }

    const paragraphs = getContentParagraphs()
    paragraphs.forEach((el, idx) => {
      // Wrap in relative container
      const wrapper = doc.createElement('span')
      wrapper.className = 'flareread-tts-para-wrap'
      wrapper.style.display = el.tagName === 'LI' ? 'list-item' : 'block'
      el.parentNode?.insertBefore(wrapper, el)
      wrapper.appendChild(el)

      // Create play button
      const btn = doc.createElement('button')
      btn.className = 'flareread-tts-play-btn'
      btn.setAttribute('aria-label', 'Read from here')
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        onPlayFromIndex(idx)
      })
      wrapper.insertBefore(btn, el)
    })
  }, [containerRef, getContentParagraphs])

  /** Remove all injected TTS play buttons */
  const removeTtsPlayButtons = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const iframe = container.querySelector('iframe')
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument

    // Remove play buttons
    doc.querySelectorAll('.flareread-tts-play-btn').forEach((el) => el.remove())

    // Unwrap paragraphs
    doc.querySelectorAll('.flareread-tts-para-wrap').forEach((el) => {
      const parent = el.parentNode
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
      }
    })

    // Remove highlight
    doc.querySelectorAll('.flareread-tts-active').forEach((el) => {
      el.classList.remove('flareread-tts-active')
    })
  }, [containerRef])

  return {
    ...state,
    goNext,
    goPrev,
    goToCfi,
    goToChapter,
    renderHighlights,
    clearSelection,
    rendition: renditionRef.current,
    // TTS helpers
    getChapterParagraphs,
    highlightTtsParagraph,
    injectTtsPlayButtons,
    removeTtsPlayButtons,
  }
}

// ─── Helpers ─────────────────────────────────────────

function applyStyles(rendition: Rendition, settings: ReadingSettings) {
  rendition.themes.default({
    'body, p, div, span, li, td, th, blockquote, cite, em, strong, a': {
      'font-family': `${settings.fontFamily} !important`,
      'font-size': `${settings.fontSize}px !important`,
      'line-height': `${settings.lineHeight} !important`,
    },
    body: {
      padding: `0 ${settings.margin}px !important`,
      'max-width': `${settings.contentWidth}ch`,
      margin: '0 auto !important',
    },
    img: {
      'max-width': '100% !important',
      height: 'auto !important',
    },
  })
}

function findChapter(toc: NavItem[], cfi: string, book: Book): string | null {
  // Walk TOC items and find the one whose href range contains the CFI
  // This is a best-effort approach
  try {
    const spineItem = book.spine.get(cfi)
    if (!spineItem) return null
    const href = spineItem.href

    // Find matching TOC entry
    const flat = flattenToc(toc)
    for (const item of flat) {
      // Compare base href (without fragment)
      const tocHref = item.href?.split('#')[0]
      const spineHref = href?.split('#')[0]
      if (tocHref && spineHref && tocHref === spineHref) {
        return item.label?.trim() || null
      }
    }
    // If no exact match, try partial matching
    for (const item of flat) {
      const base = item.href?.split('#')[0]
      if (base && href && href.includes(base)) {
        return item.label?.trim() || null
      }
    }
  } catch {
    // Ignore errors in chapter detection
  }
  return null
}

function flattenToc(items: NavItem[]): NavItem[] {
  const result: NavItem[] = []
  for (const item of items) {
    result.push(item)
    if (item.subitems && item.subitems.length > 0) {
      result.push(...flattenToc(item.subitems))
    }
  }
  return result
}
