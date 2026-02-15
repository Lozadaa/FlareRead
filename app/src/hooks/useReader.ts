import { useState, useEffect, useRef, useCallback } from 'react'
import ePub, { type Book, type Rendition, type NavItem } from 'epubjs'
import type { ReadingSettings } from '@/types'
import type { HighlightDoc } from '@/types'

// Google Fonts for premium epub typography — loaded into each iframe
const READING_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;1,7..72,400;1,7..72,500;1,7..72,600;1,7..72,700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&display=swap'

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

  // Keep a ref to the latest theme CSS so the content hook always reads fresh values
  const themeCssRef = useRef('')
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Build CSS string to inject into epub iframes — ported from Electron app
  const buildThemeCss = useCallback((s: ReadingSettings): string => {
    // Read CSS variables from the web app's theme system
    // The web app uses Tailwind HSL variables: --background, --foreground, --primary, --border
    const style = getComputedStyle(document.documentElement)
    const rawBg = style.getPropertyValue('--background').trim()
    const rawFg = style.getPropertyValue('--foreground').trim()
    const rawLink = style.getPropertyValue('--primary').trim()
    const bg = rawBg ? `hsl(${rawBg})` : '#fffdf9'
    const fg = rawFg ? `hsl(${rawFg})` : '#2d2418'
    const link = rawLink ? `hsl(${rawLink})` : '#3b82f6'

    // Derived colors
    const mutedFg = rawFg ? `hsl(${rawFg} / 0.55)` : 'rgba(45,36,24,0.55)'
    const subtleBg = rawFg ? `hsl(${rawFg} / 0.05)` : 'rgba(45,36,24,0.05)'
    const subtleBorder = rawFg ? `hsl(${rawFg} / 0.14)` : 'rgba(45,36,24,0.14)'
    const faintBorder = rawFg ? `hsl(${rawFg} / 0.07)` : 'rgba(45,36,24,0.07)'

    return `
      /* ═══════════════════════════════════════════════════
         FlareRead — Premium Reading Typography
         ═══════════════════════════════════════════════════ */

      /* === Base — Optimized text rendering === */
      html, body {
        background-color: ${bg} !important;
        color: ${fg} !important;
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize}px !important;
        line-height: ${s.lineHeight} !important;
        padding: 0 ${s.margin}px !important;
        box-sizing: border-box !important;
        text-rendering: optimizeLegibility !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        font-kerning: normal !important;
        font-feature-settings: "kern" 1, "liga" 1, "calt" 1 !important;
        font-variant-ligatures: common-ligatures contextual !important;
        -webkit-hyphens: auto !important;
        hyphens: auto !important;
        hanging-punctuation: first last !important;
        word-spacing: 0.02em !important;
      }

      /* Warm gold text selection */
      ::selection {
        background: hsl(38 65% 78% / 0.5) !important;
        color: inherit !important;
      }
      ::-moz-selection {
        background: hsl(38 65% 78% / 0.5) !important;
        color: inherit !important;
      }

      body * {
        color: inherit !important;
        background-color: transparent !important;
      }

      /* === EPUB content wrapper overrides === */
      body > div,
      body > section,
      body > article {
        width: auto !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        box-sizing: border-box !important;
        float: none !important;
      }

      /* === Pagination control === */
      p, li, dd, dt, blockquote {
        orphans: 3 !important;
        widows: 3 !important;
      }
      h1, h2, h3, h4, h5, h6 {
        break-after: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      blockquote, figure, pre, table, img {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      [class*="title"], [class*="chapter"], [class*="section"],
      [class*="half"], [class*="part"], [class*="dedication"],
      [class*="epigraph"] {
        min-height: unset !important;
        height: auto !important;
        padding-top: 2em !important;
        padding-bottom: 1em !important;
      }

      /* === Headings — Editorial display typography === */
      h1, h2, h3, h4, h5, h6 {
        font-family: "Cormorant Garamond", "Playfair Display", Georgia, serif !important;
        color: ${fg} !important;
        line-height: 1.2 !important;
        letter-spacing: -0.015em !important;
        margin-bottom: 0.6em !important;
        font-weight: 600 !important;
      }

      h1 {
        font-size: ${s.fontSize * 2}px !important;
        font-weight: 700 !important;
        margin-top: 0.5em !important;
        margin-bottom: 0.5em !important;
        letter-spacing: -0.025em !important;
        font-style: italic !important;
      }
      h1::after {
        content: '' !important;
        display: block !important;
        width: 2.5em !important;
        height: 1px !important;
        background: linear-gradient(to right, transparent, ${subtleBorder}, transparent) !important;
        margin: 0.5em 0 0 !important;
      }

      h2 {
        font-size: ${s.fontSize * 1.55}px !important;
        font-weight: 600 !important;
        margin-top: 1.5em !important;
        letter-spacing: -0.02em !important;
      }

      h3 {
        font-size: ${s.fontSize * 1.3}px !important;
        font-weight: 600 !important;
        margin-top: 1.3em !important;
        font-style: italic !important;
      }

      h4 {
        font-size: ${s.fontSize * 1.12}px !important;
        font-weight: 600 !important;
        margin-top: 1.2em !important;
      }

      h5 {
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize * 0.88}px !important;
        font-weight: 600 !important;
        margin-top: 1em !important;
      }

      h6 {
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize * 0.82}px !important;
        font-weight: 600 !important;
        margin-top: 1em !important;
        color: ${mutedFg} !important;
      }

      /* === Paragraphs — Book-style typesetting === */
      p {
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize}px !important;
        line-height: ${s.lineHeight} !important;
        margin-top: 0 !important;
        margin-bottom: 0.5em !important;
        text-align: justify !important;
        text-justify: inter-word !important;
        text-indent: 0 !important;
      }

      p + p {
        text-indent: 1.5em !important;
        margin-top: 0 !important;
        margin-bottom: 0.15em !important;
      }

      :not(p) + p {
        text-indent: 0 !important;
        margin-top: 0.3em !important;
      }

      [class*="intended"] > p,
      [class*="indent"]:not([class*="indent-"]) > p {
        text-indent: 1.5em !important;
      }

      /* === Inline emphasis === */
      em, i {
        letter-spacing: 0.01em !important;
      }
      strong, b {
        font-weight: 700 !important;
      }
      abbr[title] {
        text-decoration: underline dotted !important;
        text-decoration-color: ${subtleBorder} !important;
        text-underline-offset: 3px !important;
        cursor: help !important;
      }
      mark {
        background-color: hsl(38 75% 80% / 0.4) !important;
        color: inherit !important;
        padding: 0.05em 0.15em !important;
        border-radius: 2px !important;
      }

      /* === Links === */
      a, a:link, a:visited {
        color: ${link} !important;
        text-decoration: underline !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
        text-decoration-color: ${link}55 !important;
      }

      /* === Inline elements === */
      span, li, cite, em, strong, b, i, small, dt, dd {
        font-family: ${s.fontFamily} !important;
        font-size: inherit !important;
        line-height: ${s.lineHeight} !important;
      }

      /* === Blockquotes — Refined editorial styling === */
      blockquote {
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize * 0.96}px !important;
        line-height: ${s.lineHeight} !important;
        font-style: italic !important;
        color: ${mutedFg} !important;
        border-left: 2px solid ${subtleBorder} !important;
        margin: 1.4em 0 1.4em 0.5em !important;
        padding: 0.2em 0 0.2em 1.3em !important;
      }
      blockquote p {
        color: ${mutedFg} !important;
        text-align: left !important;
        text-indent: 0 !important;
        margin-bottom: 0.4em !important;
      }
      blockquote p + p {
        text-indent: 0 !important;
      }
      blockquote blockquote {
        border-left-color: ${faintBorder} !important;
        font-size: inherit !important;
      }

      /* === Epigraph sections === */
      [class*="epigraph"] p {
        text-align: right !important;
        text-indent: 0 !important;
        font-style: italic !important;
        color: ${mutedFg} !important;
      }

      /* === Lists === */
      ul, ol {
        padding-left: 1.8em !important;
        margin-top: 0.5em !important;
        margin-bottom: 0.8em !important;
      }
      ul { list-style-type: disc !important; }
      ol { list-style-type: decimal !important; }
      li {
        margin-bottom: 0.3em !important;
        padding-left: 0.2em !important;
        text-align: justify !important;
        text-justify: inter-word !important;
      }
      li > ul, li > ol {
        margin-top: 0.3em !important;
        margin-bottom: 0.3em !important;
      }

      /* === Code — Refined monospace === */
      pre, code {
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
        font-size: ${s.fontSize * 0.85}px !important;
        line-height: 1.55 !important;
        font-feature-settings: "liga" 1, "calt" 1 !important;
      }
      code {
        background-color: ${subtleBg} !important;
        padding: 0.15em 0.4em !important;
        border-radius: 3px !important;
        font-size: 0.88em !important;
      }
      pre {
        background-color: ${subtleBg} !important;
        padding: 1.2em 1.4em !important;
        border-radius: 6px !important;
        overflow-x: auto !important;
        margin: 1.2em 0 !important;
        border: 1px solid ${faintBorder} !important;
      }
      pre code {
        background-color: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
        font-size: inherit !important;
      }

      /* === Images === */
      img {
        max-width: 100% !important;
        max-height: calc(100vh - 3em) !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0.8em auto !important;
        cursor: pointer !important;
        border-radius: 2px !important;
      }
      img[width], img[height] {
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
      }
      img:only-child {
        margin-top: 1.5em !important;
        margin-bottom: 1.5em !important;
      }
      img[src*="bullet"], img[src*="icon"], img[src*="dingbat"],
      img[class*="inline"], img[class*="icon"] {
        display: inline !important;
        max-height: 1.2em !important;
        width: auto !important;
        height: auto !important;
        margin: 0 0.15em !important;
        vertical-align: middle !important;
        cursor: default !important;
        border-radius: 0 !important;
      }
      svg {
        max-width: 100% !important;
        height: auto !important;
      }
      svg:not([class*="icon"]):not([width="1em"]):not([height="1em"]) {
        display: block !important;
        margin: 0.8em auto !important;
        max-height: calc(100vh - 3em) !important;
      }

      /* === Figures & Captions === */
      figure {
        margin: 1em 0 !important;
        text-align: center !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      figure img {
        margin: 0 auto 0.4em !important;
      }
      figcaption {
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize * 0.82}px !important;
        line-height: 1.4 !important;
        font-style: italic !important;
        color: ${mutedFg} !important;
        text-align: center !important;
        margin-top: 0.4em !important;
        letter-spacing: 0.01em !important;
      }

      /* === Scene breaks — Typographic ornament (dinkus) === */
      hr {
        border: none !important;
        overflow: visible !important;
        text-align: center !important;
        height: auto !important;
        margin: 1.8em auto !important;
        background: transparent !important;
      }
      hr::after {
        content: '\\2022\\2002\\2022\\2002\\2022' !important;
        display: block !important;
        color: ${mutedFg} !important;
        font-size: ${s.fontSize * 0.65}px !important;
        letter-spacing: 0.4em !important;
        line-height: 1 !important;
      }

      /* === Tables — Clean editorial style === */
      table {
        max-width: 100% !important;
        width: auto !important;
        border-collapse: collapse !important;
        margin: 1.2em 0 !important;
        font-size: ${s.fontSize * 0.9}px !important;
      }
      th {
        border-bottom: 2px solid ${subtleBorder} !important;
        border-top: none !important;
        border-left: none !important;
        border-right: none !important;
        padding: 8px 14px !important;
        font-weight: 600 !important;
        text-align: left !important;
        font-size: ${s.fontSize * 0.82}px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
        color: ${mutedFg} !important;
      }
      td {
        border-bottom: 1px solid ${faintBorder} !important;
        border-top: none !important;
        border-left: none !important;
        border-right: none !important;
        padding: 8px 14px !important;
      }
      tr:last-child td {
        border-bottom: 2px solid ${subtleBorder} !important;
      }

      /* === Sup / Sub === */
      sup {
        font-size: 0.72em !important;
        vertical-align: super !important;
        line-height: 0 !important;
      }
      sub {
        font-size: 0.72em !important;
        vertical-align: sub !important;
        line-height: 0 !important;
      }
      sup a {
        text-decoration: none !important;
        font-weight: 500 !important;
      }

      /* === Definition Lists === */
      dl {
        margin: 1em 0 !important;
      }
      dt {
        font-weight: 600 !important;
        margin-top: 1em !important;
        font-family: "Cormorant Garamond", Georgia, serif !important;
        font-size: ${s.fontSize * 1.05}px !important;
      }
      dd {
        margin-left: 1.5em !important;
        margin-bottom: 0.5em !important;
      }

      /* === Footnote/endnote sections === */
      [class*="footnote"], [class*="endnote"] {
        font-size: ${s.fontSize * 0.85}px !important;
        line-height: 1.5 !important;
        color: ${mutedFg} !important;
      }
      [class*="footnote"] p, [class*="endnote"] p {
        font-size: inherit !important;
        margin-bottom: 0.4em !important;
        text-indent: 0 !important;
      }

      /* === Custom scrollbar (scroll mode) === */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: ${rawFg ? `hsl(${rawFg} / 0.15)` : 'rgba(45,36,24,0.15)'};
        border-radius: 999px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${rawFg ? `hsl(${rawFg} / 0.3)` : 'rgba(45,36,24,0.3)'};
      }
    `
  }, [])

  // Inject a <style> tag and Google Fonts <link> into an epub iframe document
  const injectThemeCss = useCallback((doc: Document, css: string) => {
    // Inject Google Fonts for premium heading & body typography
    if (!doc.getElementById('flareread-fonts')) {
      const link = doc.createElement('link')
      link.id = 'flareread-fonts'
      link.rel = 'stylesheet'
      link.href = READING_FONTS_URL
      doc.head.appendChild(link)
    }

    let el = doc.getElementById('flareread-theme')
    if (!el) {
      el = doc.createElement('style')
      el.id = 'flareread-theme'
      doc.head.appendChild(el)
    }
    el.textContent = css
  }, [])

  // Push the current CSS into every loaded iframe
  const applyThemeToAllContents = useCallback(() => {
    const rendition = renditionRef.current
    if (!rendition) return
    const css = themeCssRef.current
    try {
      const contents = rendition.getContents() as unknown as Array<{ document: Document }>
      contents.forEach((c) => injectThemeCss(c.document, css))
    } catch {
      // rendition not ready yet
    }
  }, [injectThemeCss])

  // Helper: register content hooks (images, selection, theme injection)
  function registerContentHooks(rendition: Rendition) {
    rendition.hooks.content.register((contents: { document: Document; documentElement: HTMLElement; content: HTMLElement }) => {
      const doc = contents.document

      // Inject premium theme CSS into this iframe
      injectThemeCss(doc, themeCssRef.current)

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

        // Build and store initial theme CSS
        themeCssRef.current = buildThemeCss(settings)

        // Register hooks (content hook will inject theme CSS into each iframe)
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

  // Update styles when settings change — rebuild CSS and push to all iframes
  useEffect(() => {
    if (!renditionRef.current) return
    themeCssRef.current = buildThemeCss(settings)
    applyThemeToAllContents()
  }, [settings, buildThemeCss, applyThemeToAllContents])

  // Re-apply theme when dark/light mode changes (detects .dark class toggle on <html>)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!renditionRef.current) return
      themeCssRef.current = buildThemeCss(settingsRef.current)
      applyThemeToAllContents()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [buildThemeCss, applyThemeToAllContents])

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

    // Rebuild theme CSS and register hooks (content hook injects CSS)
    themeCssRef.current = buildThemeCss(settings)
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
