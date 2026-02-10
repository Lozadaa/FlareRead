import { TocItem } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface TocSidebarProps {
  toc: TocItem[]
  isOpen: boolean
  onClose: () => void
  onNavigate: (href: string) => void
  currentChapter: string
}

function TocEntry({
  item,
  depth,
  onNavigate,
  currentChapter
}: {
  item: TocItem
  depth: number
  onNavigate: (href: string) => void
  currentChapter: string
}) {
  const isActive = item.label === currentChapter

  return (
    <>
      <button
        onClick={() => onNavigate(item.href)}
        className={`w-full text-left px-4 py-2 text-sm transition-all relative
          ${isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-foreground/80 hover:bg-accent hover:text-foreground'}
        `}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
        title={item.label}
      >
        {isActive && (
          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />
        )}
        <span className="line-clamp-2">{item.label}</span>
      </button>
      {item.subitems?.map((sub) => (
        <TocEntry
          key={sub.id}
          item={sub}
          depth={depth + 1}
          onNavigate={onNavigate}
          currentChapter={currentChapter}
        />
      ))}
    </>
  )
}

export function TocSidebar({ toc, isOpen, onClose, onNavigate, currentChapter }: TocSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-card/95 backdrop-blur-xl z-40 shadow-xl flex flex-col border-r border-border"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="font-display italic text-foreground text-sm">
                Table of Contents
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                aria-label="Close table of contents"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-1">
              {toc.length === 0 ? (
                <p className="text-muted-foreground text-sm px-4 py-8 text-center italic">
                  No table of contents available
                </p>
              ) : (
                toc.map((item) => (
                  <TocEntry
                    key={item.id}
                    item={item}
                    depth={0}
                    onNavigate={(href) => {
                      onNavigate(href)
                      onClose()
                    }}
                    currentChapter={currentChapter}
                  />
                ))
              )}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
