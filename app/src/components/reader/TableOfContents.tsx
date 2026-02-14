import { useState } from 'react'
import type { NavItem } from 'epubjs'

interface TableOfContentsProps {
  toc: NavItem[]
  currentChapter: string | null
  onNavigate: (href: string) => void
  onClose: () => void
}

export function TableOfContents({ toc, currentChapter, onNavigate, onClose }: TableOfContentsProps) {
  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <h3 className="text-ui-sm font-body font-medium text-foreground">Contents</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* TOC items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {toc.length === 0 ? (
          <p className="px-4 py-3 text-ui-xs text-muted-foreground font-body">
            No table of contents available.
          </p>
        ) : (
          <TocList items={toc} currentChapter={currentChapter} onNavigate={onNavigate} depth={0} />
        )}
      </nav>
    </div>
  )
}

function TocList({
  items,
  currentChapter,
  onNavigate,
  depth,
}: {
  items: NavItem[]
  currentChapter: string | null
  onNavigate: (href: string) => void
  depth: number
}) {
  return (
    <ul>
      {items.map((item, i) => (
        <TocItem key={item.id || i} item={item} currentChapter={currentChapter} onNavigate={onNavigate} depth={depth} />
      ))}
    </ul>
  )
}

function TocItem({
  item,
  currentChapter,
  onNavigate,
  depth,
}: {
  item: NavItem
  currentChapter: string | null
  onNavigate: (href: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = item.subitems && item.subitems.length > 0
  const isActive = currentChapter === item.label?.trim()

  return (
    <li>
      <button
        onClick={() => {
          if (item.href) onNavigate(item.href)
        }}
        className={`
          w-full flex items-center gap-2 text-left px-4 py-2 text-ui-sm font-body
          transition-colors hover:bg-accent/60
          ${isActive ? 'text-primary font-medium bg-primary/5' : 'text-foreground'}
        `}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
        {!hasChildren && <span className="shrink-0 w-4" />}
        <span className="truncate">{item.label?.trim()}</span>
      </button>
      {hasChildren && expanded && (
        <TocList
          items={item.subitems!}
          currentChapter={currentChapter}
          onNavigate={onNavigate}
          depth={depth + 1}
        />
      )}
    </li>
  )
}
