import type { TextChunk } from '@/types'

// Block elements to extract text from
const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'DIV', 'FIGCAPTION', 'DT', 'DD'
])

// Abbreviations that end with a period but don't end a sentence
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
  'dept', 'est', 'fig', 'inc', 'ltd', 'vs', 'etc', 'approx', 'govt',
  'vol', 'no', 'op', 'ed', 'rev', 'gen', 'col', 'sgt', 'cpl', 'pvt',
  'capt', 'lt', 'cmdr', 'adm', 'maj', 'i.e', 'e.g', 'cf', 'al'
])

/**
 * Extract readable text from the epub rendition's current chapter iframe.
 * Walks DOM block elements to preserve paragraph structure.
 */
export function extractChapterText(rendition: unknown): string {
  const rend = rendition as { manager?: { container?: HTMLElement } }
  const container = rend?.manager?.container
  if (!container) return ''

  const iframe = container.querySelector('iframe')
  if (!iframe?.contentDocument?.body) return ''

  const paragraphs: string[] = []

  function walkNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName

      // Skip hidden elements, scripts, styles, footnote references
      if (
        el.hidden ||
        tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SUP' || tag === 'NAV' ||
        el.getAttribute('role') === 'doc-noteref' ||
        el.classList.contains('footnote') ||
        el.getAttribute('aria-hidden') === 'true'
      ) {
        return
      }

      if (BLOCK_TAGS.has(tag)) {
        const text = el.textContent?.trim()
        if (text) {
          paragraphs.push(text)
        }
      } else {
        // Recurse into non-block containers (e.g. <section>, <article>)
        for (const child of el.childNodes) {
          walkNode(child)
        }
      }
    }
  }

  walkNode(iframe.contentDocument.body)
  return paragraphs.join('\n\n')
}

/**
 * Clean raw extracted text for TTS consumption.
 */
export function cleanTextForTts(raw: string): string {
  let text = raw

  // Replace smart quotes with plain quotes
  text = text.replace(/[\u2018\u2019\u201A]/g, "'")
  text = text.replace(/[\u201C\u201D\u201E]/g, '"')

  // Replace em-dashes and en-dashes with pauses
  text = text.replace(/[\u2013\u2014]/g, ', ')

  // Replace ellipsis character with periods
  text = text.replace(/\u2026/g, '...')

  // Collapse multiple whitespace/newlines into single space within paragraphs
  // but preserve paragraph breaks (double newlines)
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[^\S\n]+/g, ' ')

  // Strip footnote markers like [1], [*], etc.
  text = text.replace(/\[\d+\]/g, '')
  text = text.replace(/\[\*+\]/g, '')

  // Trim each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n')

  return text.trim()
}

/**
 * Split text into sentences, respecting abbreviations.
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = []
  let current = ''

  // Split on sentence-ending punctuation followed by whitespace and uppercase
  const parts = text.split(/(?<=[.!?])\s+/)

  for (const part of parts) {
    if (!part.trim()) continue

    if (current) {
      // Check if the previous "sentence" actually ended with an abbreviation
      const lastWord = current.split(/\s+/).pop()?.replace(/\.$/, '').toLowerCase() || ''
      if (ABBREVIATIONS.has(lastWord)) {
        // Not a real sentence break — merge
        current += ' ' + part
        continue
      }

      // Check if next part starts with uppercase (real sentence start)
      const firstChar = part.charAt(0)
      if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
        sentences.push(current.trim())
        current = part
      } else {
        current += ' ' + part
      }
    } else {
      current = part
    }
  }

  if (current.trim()) {
    sentences.push(current.trim())
  }

  return sentences
}

/**
 * Split a single large sentence at clause boundaries.
 */
function splitAtClauseBoundaries(sentence: string, maxChars: number): string[] {
  const parts: string[] = []
  let remaining = sentence

  while (remaining.length > maxChars) {
    // Try splitting at clause boundaries: semicolons, colons, commas
    let splitIdx = -1
    for (const sep of [';', ':', ',']) {
      const idx = remaining.lastIndexOf(sep, maxChars)
      if (idx > maxChars * 0.3) {
        splitIdx = idx + 1
        break
      }
    }

    // Fallback: split at word boundary
    if (splitIdx === -1) {
      splitIdx = remaining.lastIndexOf(' ', maxChars)
      if (splitIdx <= 0) splitIdx = maxChars
    }

    parts.push(remaining.slice(0, splitIdx).trim())
    remaining = remaining.slice(splitIdx).trim()
  }

  if (remaining) {
    parts.push(remaining)
  }

  return parts
}

/**
 * Chunk cleaned text into TTS-sized pieces.
 * Target: 800-1800 characters per chunk.
 */
export function chunkText(
  text: string,
  minChars: number = 800,
  maxChars: number = 1800
): TextChunk[] {
  const chunks: TextChunk[] = []
  const paragraphs = text.split(/\n\n+/)

  let currentText = ''
  let currentOffset = 0
  let chunkStartOffset = 0

  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph)

    for (const sentence of sentences) {
      // Handle very long single sentences
      if (sentence.length > maxChars) {
        // Flush current chunk first
        if (currentText.trim()) {
          chunks.push({
            index: chunks.length,
            text: currentText.trim(),
            startOffset: chunkStartOffset
          })
          currentText = ''
        }

        // Split the long sentence into sub-chunks
        const subParts = splitAtClauseBoundaries(sentence, maxChars)
        for (const part of subParts) {
          chunks.push({
            index: chunks.length,
            text: part,
            startOffset: currentOffset
          })
          currentOffset += part.length + 1
        }
        chunkStartOffset = currentOffset
        continue
      }

      const combined = currentText ? currentText + ' ' + sentence : sentence

      if (combined.length <= maxChars) {
        currentText = combined
      } else if (currentText.length >= minChars) {
        // Flush current chunk
        chunks.push({
          index: chunks.length,
          text: currentText.trim(),
          startOffset: chunkStartOffset
        })
        currentText = sentence
        chunkStartOffset = currentOffset
      } else {
        // Current chunk is small but adding sentence would exceed max
        // Add it anyway if it brings us closer to min
        currentText = combined
      }

      currentOffset += sentence.length + 1
    }

    // Add paragraph break to offset tracking
    currentOffset += 1
  }

  // Flush remaining text
  if (currentText.trim()) {
    chunks.push({
      index: chunks.length,
      text: currentText.trim(),
      startOffset: chunkStartOffset
    })
  }

  return chunks
}
