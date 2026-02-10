import { useEffect, useCallback, useState, useRef } from 'react'

interface ImageLightboxProps {
  src: string | null
  onClose: () => void
}

export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const posAtDragStart = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)

  // Fade-in on mount
  useEffect(() => {
    if (src) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      setZoomed(false)
      setPosition({ x: 0, y: 0 })
    }
  }, [src])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (zoomed) {
          setZoomed(false)
          setPosition({ x: 0, y: 0 })
        } else {
          handleClose()
        }
      }
    },
    [handleClose, zoomed]
  )

  useEffect(() => {
    if (!src) return
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [src, handleKeyDown])

  // Toggle zoom on image click (only if not dragging)
  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (hasMoved.current) return
      if (zoomed) {
        setZoomed(false)
        setPosition({ x: 0, y: 0 })
      } else {
        setZoomed(true)
      }
    },
    [zoomed]
  )

  // Drag to pan when zoomed
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!zoomed) return
      e.preventDefault()
      dragging.current = true
      hasMoved.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      posAtDragStart.current = { ...position }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [zoomed, position]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true
      setPosition({
        x: posAtDragStart.current.x + dx,
        y: posAtDragStart.current.y + dy
      })
    },
    []
  )

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // Reset zoom when closing via backdrop
  const handleBackdropClick = useCallback(() => {
    if (zoomed) {
      setZoomed(false)
      setPosition({ x: 0, y: 0 })
    } else {
      handleClose()
    }
  }, [zoomed, handleClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-200"
      style={{
        backgroundColor: visible ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
        cursor: zoomed ? 'grab' : 'zoom-out'
      }}
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 z-10"
        style={{ opacity: visible ? 1 : 0 }}
        aria-label="Close lightbox"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Zoom hint */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium tracking-wide transition-opacity duration-300 select-none pointer-events-none"
        style={{ opacity: visible && !zoomed ? 0.7 : 0 }}
      >
        Click to zoom
      </div>

      {/* Image */}
      <img
        src={src}
        alt=""
        className="select-none transition-transform duration-200 ease-out"
        style={{
          maxWidth: zoomed ? 'none' : '90vw',
          maxHeight: zoomed ? 'none' : '88vh',
          width: zoomed ? 'auto' : undefined,
          height: zoomed ? 'auto' : undefined,
          objectFit: 'contain',
          transform: zoomed
            ? `scale(2) translate(${position.x / 2}px, ${position.y / 2}px)`
            : `scale(${visible ? 1 : 0.92})`,
          opacity: visible ? 1 : 0,
          cursor: zoomed ? (dragging.current ? 'grabbing' : 'grab') : 'zoom-in',
          willChange: 'transform'
        }}
        onClick={handleImageClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        draggable={false}
      />
    </div>
  )
}
