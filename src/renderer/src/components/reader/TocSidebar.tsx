import { TocItem } from '@/types'

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
        className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-100
          ${isActive ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600' : 'text-gray-700'}
        `}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
        title={item.label}
      >
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
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white z-40 shadow-xl flex flex-col border-r border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">
            Table of Contents
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close table of contents"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {toc.length === 0 ? (
            <p className="text-gray-400 text-sm px-4 py-8 text-center">
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
      </aside>
    </>
  )
}
