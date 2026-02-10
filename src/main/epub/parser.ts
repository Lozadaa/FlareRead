import AdmZip from 'adm-zip'
import { join, dirname } from 'path'

export interface EpubMetadata {
  title: string
  author: string | null
  description: string | null
  language: string | null
  coverImageData: Buffer | null
  coverImageExt: string | null
  estimatedWordCount: number
}

/**
 * Parse an EPUB file and extract metadata, cover image, and estimated word count.
 * EPUB is a ZIP archive containing:
 *   META-INF/container.xml -> points to the OPF file
 *   OPF file -> contains metadata and manifest
 */
export function parseEpub(filePath: string): EpubMetadata {
  let zip: AdmZip
  try {
    zip = new AdmZip(filePath)
  } catch {
    throw new Error('Invalid or corrupted EPUB file: could not read as ZIP archive')
  }

  // 1. Read container.xml to find the OPF path
  const containerEntry = zip.getEntry('META-INF/container.xml')
  if (!containerEntry) {
    throw new Error('Invalid EPUB: missing META-INF/container.xml')
  }

  const containerXml = containerEntry.getData().toString('utf-8')
  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/)
  if (!opfPathMatch) {
    throw new Error('Invalid EPUB: could not find OPF path in container.xml')
  }
  const opfPath = opfPathMatch[1]
  const opfDir = dirname(opfPath).replace(/\\/g, '/')

  // 2. Read the OPF file
  const opfEntry = zip.getEntry(opfPath)
  if (!opfEntry) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`)
  }
  const opfXml = opfEntry.getData().toString('utf-8')

  // 3. Extract metadata from OPF
  const title = extractTag(opfXml, 'dc:title') || extractTag(opfXml, 'title') || 'Untitled'
  const author = extractTag(opfXml, 'dc:creator') || extractTag(opfXml, 'creator') || null
  const description =
    extractTag(opfXml, 'dc:description') || extractTag(opfXml, 'description') || null
  const language = extractTag(opfXml, 'dc:language') || extractTag(opfXml, 'language') || null

  // 4. Extract cover image
  const { coverImageData, coverImageExt } = extractCoverImage(zip, opfXml, opfDir)

  // 5. Estimate word count from XHTML content
  const estimatedWordCount = estimateWordCount(zip, opfXml, opfDir)

  return {
    title,
    author,
    description,
    language,
    coverImageData,
    coverImageExt,
    estimatedWordCount
  }
}

function extractTag(xml: string, tag: string): string | null {
  // Match both self-closing variants and content between tags
  // Handle namespaced tags like <dc:title> and non-namespaced like <title>
  const regex = new RegExp(`<${escapeRegex(tag)}[^>]*>([\\s\\S]*?)</${escapeRegex(tag)}>`, 'i')
  const match = xml.match(regex)
  if (!match) return null
  // Strip any inner HTML tags and trim
  return match[1].replace(/<[^>]+>/g, '').trim() || null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractCoverImage(
  zip: AdmZip,
  opfXml: string,
  opfDir: string
): { coverImageData: Buffer | null; coverImageExt: string | null } {
  // Strategy 1: Look for <meta name="cover" content="cover-id"/>
  const coverMetaMatch = opfXml.match(
    /<meta[^>]+name=["']cover["'][^>]+content=["']([^"']+)["'][^>]*\/?>/i
  )
  if (!coverMetaMatch) {
    // Also try reversed attribute order
    const altMatch = opfXml.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']cover["'][^>]*\/?>/i
    )
    if (altMatch) {
      const result = getCoverById(zip, opfXml, opfDir, altMatch[1])
      if (result) return result
    }
  } else {
    const result = getCoverById(zip, opfXml, opfDir, coverMetaMatch[1])
    if (result) return result
  }

  // Strategy 2: Look for item with properties="cover-image" (EPUB 3)
  const coverItemMatch = opfXml.match(
    /<item[^>]+properties=["'][^"']*cover-image[^"']*["'][^>]*\/?>/i
  )
  if (coverItemMatch) {
    const hrefMatch = coverItemMatch[0].match(/href=["']([^"']+)["']/)
    if (hrefMatch) {
      const result = readImageEntry(zip, opfDir, hrefMatch[1])
      if (result) return result
    }
  }

  // Strategy 3: Look for any manifest item that looks like a cover image
  const coverHrefMatch = opfXml.match(
    /<item[^>]+id=["'][^"']*cover[^"']*["'][^>]+href=["']([^"']+)["'][^>]*\/?>/i
  )
  if (coverHrefMatch) {
    const result = readImageEntry(zip, opfDir, coverHrefMatch[1])
    if (result) return result
  }

  return { coverImageData: null, coverImageExt: null }
}

function getCoverById(
  zip: AdmZip,
  opfXml: string,
  opfDir: string,
  coverId: string
): { coverImageData: Buffer; coverImageExt: string } | null {
  // Find the manifest item with this ID
  const escapedId = escapeRegex(coverId)
  const itemRegex = new RegExp(
    `<item[^>]+id=["']${escapedId}["'][^>]*\\/?>`,
    'i'
  )
  const itemMatch = opfXml.match(itemRegex)
  if (!itemMatch) return null

  const hrefMatch = itemMatch[0].match(/href=["']([^"']+)["']/)
  if (!hrefMatch) return null

  return readImageEntry(zip, opfDir, hrefMatch[1])
}

function readImageEntry(
  zip: AdmZip,
  opfDir: string,
  href: string
): { coverImageData: Buffer; coverImageExt: string } | null {
  // Resolve relative path from OPF directory
  const decodedHref = decodeURIComponent(href)
  const imagePath =
    opfDir === '.' ? decodedHref : join(opfDir, decodedHref).replace(/\\/g, '/')

  const entry = zip.getEntry(imagePath)
  if (!entry) return null

  const data = entry.getData()
  if (!data || data.length === 0) return null

  // Determine extension from the href
  const ext = decodedHref.split('.').pop()?.toLowerCase() || 'jpg'
  const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'jpg'

  return { coverImageData: data, coverImageExt: validExt }
}

function estimateWordCount(zip: AdmZip, opfXml: string, opfDir: string): number {
  // Find all XHTML/HTML items in the spine
  const spineItemRefs: string[] = []
  const spineMatch = opfXml.match(/<spine[^>]*>([\s\S]*?)<\/spine>/i)
  if (spineMatch) {
    const itemRefRegex = /idref=["']([^"']+)["']/gi
    let m: RegExpExecArray | null
    while ((m = itemRefRegex.exec(spineMatch[1])) !== null) {
      spineItemRefs.push(m[1])
    }
  }

  // Build a map of manifest items
  const manifestItems = new Map<string, string>()
  const itemRegex = /<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*\/?>/gi
  let im: RegExpExecArray | null
  while ((im = itemRegex.exec(opfXml)) !== null) {
    manifestItems.set(im[1], im[2])
  }

  let totalWords = 0

  // Count words in spine items
  const refs = spineItemRefs.length > 0 ? spineItemRefs : Array.from(manifestItems.keys())
  for (const ref of refs) {
    const href = manifestItems.get(ref)
    if (!href) continue

    // Only process XHTML/HTML files
    const lower = href.toLowerCase()
    if (!lower.endsWith('.xhtml') && !lower.endsWith('.html') && !lower.endsWith('.htm')) continue

    const decodedHref = decodeURIComponent(href)
    const filePath = opfDir === '.' ? decodedHref : join(opfDir, decodedHref).replace(/\\/g, '/')
    const entry = zip.getEntry(filePath)
    if (!entry) continue

    const text = entry.getData().toString('utf-8')
    // Strip all HTML tags
    const plainText = text.replace(/<[^>]+>/g, ' ')
    // Count words (split on whitespace, filter empty)
    const words = plainText.split(/\s+/).filter((w) => w.length > 0)
    totalWords += words.length
  }

  return totalWords
}
