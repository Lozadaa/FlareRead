import { useState, useRef, useCallback, useEffect } from 'react'
import ePub, { Book, Rendition, NavItem } from 'epubjs'
import { TocItem, ReadingProgress, ReadingSettings, Highlight } from '@/types'
import { fileUrl } from '@/lib/utils'

interface UseEpubReaderOptions {
  bookId: string
  filePath: string
  settings: ReadingSettings
  resolvedTheme?: string
}

export function useEpubReader({ bookId, filePath, settings, resolvedTheme }: UseEpubReaderOptions) {
  // Keep a ref to the latest settings so initBook doesn't depend on them
  const settingsRef = useRef(settings)
  settingsRef.current = settings
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

    return `
      html, body {
        background-color: ${bg} !important;
        color: ${fg} !important;
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize}px !important;
        line-height: ${s.lineHeight} !important;
        padding: 0 ${s.margin}px !important;
        box-sizing: border-box !important;
      }
      body * {
        color: inherit !important;
        background-color: transparent !important;
      }
      h1, h2, h3, h4, h5, h6 { color: ${fg} !important; }
      a, a:link, a:visited { color: ${link} !important; }
      p, div, span, li, blockquote, figcaption, cite, em, strong, b, i, small, dt, dd, pre, code {
        font-family: ${s.fontFamily} !important;
        font-size: ${s.fontSize}px !important;
        line-height: ${s.lineHeight} !important;
      }
      img, svg { max-width: 100% !important; height: auto !important; }
      table { max-width: 100% !important; border-collapse: collapse !important; }
      td, th { border: 1px solid ${border} !important; padding: 4px 8px !important; }
    `
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme])

  // Keep a ref to the latest CSS so the content hook always reads fresh values
  const themeCssRef = useRef('')

  // Inject a <style> tag into an epub iframe document
  const injectThemeCss = useCallback((doc: Document, css: string) => {
    let el = doc.getElementById('justread-theme')
    if (!el) {
      el = doc.createElement('style')
      el.id = 'justread-theme'
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

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: 'paginated',
      manager: 'continuous'
    })

    renditionRef.current = rendition

    // Build and store initial theme CSS
    const currentSettings = settingsRef.current
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

    // Handle keyboard navigation inside the epub iframe
    rendition.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        rendition.next()
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        rendition.prev()
      }
    })

    // Handle click navigation inside the epub iframe (left/right thirds)
    rendition.on('click', (e: MouseEvent) => {
      // Ignore clicks on links
      const target = e.target as HTMLElement
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

  // Update settings / theme on the fly — rebuild CSS, push to all iframes
  useEffect(() => {
    const css = buildThemeCss(settings)
    themeCssRef.current = css
    applyThemeToAllContents()

    // Force epub.js to re-layout after style change
    if (renditionRef.current) {
      renditionRef.current.resize(
        viewerRef.current?.clientWidth ?? window.innerWidth,
        viewerRef.current?.clientHeight ?? window.innerHeight
      )
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
