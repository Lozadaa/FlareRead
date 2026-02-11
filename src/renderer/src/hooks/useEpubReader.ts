import { useState, useRef, useCallback, useEffect } from 'react'
import ePub, { Book, Rendition, NavItem } from 'epubjs'
import { TocItem, ReadingProgress, ReadingSettings, Highlight } from '@/types'
import { fileUrl } from '@/lib/utils'

// Google Fonts for premium epub typography — loaded into each iframe
const READING_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;1,7..72,400;1,7..72,500;1,7..72,600;1,7..72,700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&display=swap'

interface UseEpubReaderOptions {
  bookId: string
  filePath: string
  settings: ReadingSettings
  resolvedTheme?: string
  onImageClick?: (src: string) => void
}

export function useEpubReader({ bookId, filePath, settings, resolvedTheme, onImageClick }: UseEpubReaderOptions) {
  // Keep a ref to the latest settings so initBook doesn't depend on them
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const onImageClickRef = useRef(onImageClick)
  onImageClickRef.current = onImageClick
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const viewerRef = useRef<HTMLDivElement | null>(null)

  const [toc, setToc] = useState<TocItem[]>([])
  const [currentChapter, setCurrentChapter] = useState<string>('')
  const [bookTitle, setBookTitle] = useState<string>('')
  const [percent, setPercent] = useState(0)
  const [currentCfi, setCurrentCfi] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // Save position to DB (throttled externally)
  const savePosition = useCallback(
    (cfi: string, pct: number, chapter: string) => {
      window.api.progress.upsert({
        book_id: bookId,
        cfi_position: cfi,
        percent_complete: pct,
        current_chapter: chapter
      })
    },
    [bookId]
  )

  // Convert epubjs NavItem[] to our TocItem[]
  const mapNavItems = useCallback((items: NavItem[]): TocItem[] => {
    return items.map((item) => ({
      id: item.id,
      href: item.href,
      label: item.label.trim(),
      subitems: item.subitems ? mapNavItems(item.subitems) : undefined
    }))
  }, [])

  // Find current chapter label from TOC based on href
  const findChapterLabel = useCallback(
    (href: string, items: TocItem[]): string => {
      for (const item of items) {
        // Match by href (strip fragment identifier for comparison)
        const itemHref = item.href.split('#')[0]
        const checkHref = href.split('#')[0]
        if (itemHref === checkHref || checkHref.endsWith(itemHref)) {
          return item.label
        }
        if (item.subitems) {
          const found = findChapterLabel(href, item.subitems)
          if (found) return found
        }
      }
      return ''
    },
    []
  )

  // Build CSS string to inject into epub iframes
  const buildThemeCss = useCallback((s: ReadingSettings): string => {
    const style = getComputedStyle(document.documentElement)
    const rawBg = style.getPropertyValue('--reading-bg').trim()
    const rawFg = style.getPropertyValue('--reading-fg').trim()
    const rawLink = style.getPropertyValue('--reading-link').trim()
    const rawBorder = style.getPropertyValue('--border').trim()
    const bg = rawBg ? `hsl(${rawBg})` : '#fffdf9'
    const fg = rawFg ? `hsl(${rawFg})` : '#2d2418'
    const link = rawLink ? `hsl(${rawLink})` : '#3b82f6'
    const border = rawBorder ? `hsl(${rawBorder})` : '#e5e5e5'

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
        padding: 0 24px !important;
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
      /* Many EPUBs wrap each paragraph/heading in its own <div>.
         Their CSS often adds margins/widths that push content off-center.
         Reset these so content fills the available reading column. */
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
      /* Subtle decorative rule below chapter headings */
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

      /* Small headings — body font */
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

      /* Book-style indent: consecutive sibling paragraphs (flat EPUB structure) */
      p + p {
        text-indent: 1.5em !important;
        margin-top: 0 !important;
        margin-bottom: 0.15em !important;
      }

      /* Reset indent after non-paragraph elements */
      :not(p) + p {
        text-indent: 0 !important;
        margin-top: 0.3em !important;
      }

      /* Div-wrapped EPUB support: many EPUBs wrap each <p> in its own <div>.
         The p+p selector can't match across divs, so use the EPUB's own
         indent class patterns (Manning "intended-text", generic "indent", etc.) */
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
      /* Footnote references */
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

      /* === Footnote/endnote sections (common EPUB patterns) === */
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme])

  // Keep a ref to the latest CSS so the content hook always reads fresh values
  const themeCssRef = useRef('')

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
      const contents = rendition.getContents() as Array<{ document: Document }>
      contents.forEach((c) => injectThemeCss(c.document, css))
    } catch {
      // rendition not ready yet
    }
  }, [injectThemeCss])

  // Initialize the epub book
  const initBook = useCallback(async () => {
    if (!viewerRef.current) return

    setIsLoading(true)

    // Clean up previous
    if (renditionRef.current) {
      renditionRef.current.destroy()
    }
    if (bookRef.current) {
      bookRef.current.destroy()
    }

    const book = ePub(fileUrl(filePath))
    bookRef.current = book

    const currentSettings = settingsRef.current
    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: currentSettings.scrollMode ? 'scrolled-doc' : 'paginated',
      manager: currentSettings.scrollMode ? 'continuous' : 'default'
    })

    renditionRef.current = rendition

    // Build and store initial theme CSS
    themeCssRef.current = buildThemeCss(currentSettings)

    // Hook: inject theme CSS into every new section loaded by epub.js
    rendition.hooks.content.register((contents: { document: Document }) => {
      injectThemeCss(contents.document, themeCssRef.current)
    })

    // Load saved position or start from beginning
    const progress = (await window.api.progress.get(bookId)) as ReadingProgress | null

    if (progress?.cfi_position) {
      await rendition.display(progress.cfi_position)
      setPercent(progress.percent_complete || 0)
      setCurrentCfi(progress.cfi_position)
      if (progress.current_chapter) {
        setCurrentChapter(progress.current_chapter)
      }
    } else {
      await rendition.display()
    }

    // Get metadata
    const metadata = await book.loaded.metadata
    setBookTitle(metadata.title || 'Untitled')

    // Get TOC
    const navigation = await book.loaded.navigation
    const tocItems = mapNavItems(navigation.toc)
    setToc(tocItems)

    // Track location changes
    rendition.on('relocated', (location: { start: { cfi: string; href: string; percentage: number }; atStart: boolean; atEnd: boolean }) => {
      const cfi = location.start.cfi
      const pct = Math.round((location.start.percentage || 0) * 100)
      setCurrentCfi(cfi)
      setPercent(pct)
      setAtStart(location.atStart)
      setAtEnd(location.atEnd)

      // Find and set current chapter
      const chapter = findChapterLabel(location.start.href, tocItems)
      if (chapter) {
        setCurrentChapter(chapter)
      }
    })

    // Handle keyboard navigation inside the epub iframe (disabled in scroll mode)
    rendition.on('keydown', (e: KeyboardEvent) => {
      if (settingsRef.current.scrollMode) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        rendition.next()
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        rendition.prev()
      }
    })

    // Handle click navigation inside the epub iframe (disabled in scroll mode)
    rendition.on('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Handle image clicks — works in both paginated and scroll modes
      const imgEl = target.closest('img') as HTMLImageElement | null
      if (imgEl && onImageClickRef.current) {
        e.preventDefault()
        e.stopPropagation()
        onImageClickRef.current(imgEl.src)
        return
      }

      if (settingsRef.current.scrollMode) return
      // Ignore clicks on links
      if (target.closest('a')) return

      const iframe = viewerRef.current?.querySelector('iframe')
      const width = iframe?.clientWidth ?? window.innerWidth
      const x = e.clientX

      if (x < width * 0.3) {
        rendition.prev()
      } else if (x > width * 0.7) {
        rendition.next()
      }
    })

    setIsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, bookId, buildThemeCss, injectThemeCss, mapNavItems, findChapterLabel])

  // Navigation
  const goNext = useCallback(() => {
    renditionRef.current?.next()
  }, [])

  const goPrev = useCallback(() => {
    renditionRef.current?.prev()
  }, [])

  const goToHref = useCallback((href: string) => {
    renditionRef.current?.display(href)
  }, [])

  const goToCfi = useCallback((cfi: string) => {
    renditionRef.current?.display(cfi)
  }, [])

  // Apply highlight annotations to the rendition
  const applyHighlights = useCallback((highlightsList: Highlight[]) => {
    const rendition = renditionRef.current
    if (!rendition) return

    // Remove existing annotations first
    for (const h of highlightsList) {
      try {
        rendition.annotations.remove(h.cfi_range, 'highlight')
      } catch {
        // ignore if not found
      }
    }

    // Add all highlights
    for (const h of highlightsList) {
      try {
        rendition.annotations.highlight(
          h.cfi_range,
          { id: h.id },
          undefined,
          undefined,
          { fill: h.color, 'fill-opacity': '0.4', 'mix-blend-mode': 'multiply' }
        )
      } catch {
        // ignore invalid CFI ranges
      }
    }
  }, [])

  // Remove a single highlight annotation
  const removeHighlightAnnotation = useCallback((cfiRange: string) => {
    try {
      renditionRef.current?.annotations.remove(cfiRange, 'highlight')
    } catch {
      // ignore
    }
  }, [])

  // Get the rendition ref (for text selection handling in the component)
  const getRendition = useCallback(() => renditionRef.current, [])

  // Re-initialize book when scrollMode changes
  const prevScrollModeRef = useRef(settings.scrollMode)
  useEffect(() => {
    if (settings.scrollMode !== prevScrollModeRef.current) {
      prevScrollModeRef.current = settings.scrollMode
      initBook()
    }
  }, [settings.scrollMode, initBook])

  // Update settings / theme on the fly — rebuild CSS, push to all iframes
  useEffect(() => {
    const css = buildThemeCss(settings)
    themeCssRef.current = css
    applyThemeToAllContents()

    // Force epub.js to re-layout after style change
    // Skip resize when scrollMode changed — initBook() handles full re-init
    if (renditionRef.current && settings.scrollMode === prevScrollModeRef.current) {
      try {
        renditionRef.current.resize(
          viewerRef.current?.clientWidth ?? window.innerWidth,
          viewerRef.current?.clientHeight ?? window.innerHeight
        )
      } catch {
        // Rendition manager not ready yet, safe to ignore
      }
    }
  }, [settings, resolvedTheme, buildThemeCss, applyThemeToAllContents])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renditionRef.current) renditionRef.current.destroy()
      if (bookRef.current) bookRef.current.destroy()
    }
  }, [])

  return {
    viewerRef,
    renditionRef,
    toc,
    currentChapter,
    bookTitle,
    percent,
    currentCfi,
    isLoading,
    atStart,
    atEnd,
    initBook,
    goNext,
    goPrev,
    goToHref,
    goToCfi,
    savePosition,
    applyHighlights,
    removeHighlightAnnotation,
    getRendition
  }
}
