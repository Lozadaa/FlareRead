import { PresetProps } from '../types'

/** Geometric SVG that fills proportionally with session progress */
function GeometricIllustration({ progress }: { progress: number }) {
  // 12 geometric shapes that progressively appear
  const totalShapes = 12
  const visibleCount = Math.floor(progress * totalShapes)
  const partialOpacity = (progress * totalShapes) - visibleCount

  const shapes = [
    // Outer ring segments
    <polygon key="s1" points="250,40 300,100 200,100" />,
    <polygon key="s2" points="400,120 460,200 340,200" />,
    <polygon key="s3" points="460,300 460,400 380,350" />,
    <polygon key="s4" points="400,460 300,460 350,380" />,
    <polygon key="s5" points="200,460 100,460 150,380" />,
    <polygon key="s6" points="40,400 40,300 120,350" />,
    // Inner ring segments
    <polygon key="s7" points="100,120 40,200 160,200" />,
    <polygon key="s8" points="250,160 310,230 190,230" />,
    <polygon key="s9" points="370,250 370,330 310,290" />,
    <polygon key="s10" points="310,370 250,370 280,310" />,
    <polygon key="s11" points="190,370 130,370 160,310" />,
    <polygon key="s12" points="130,250 130,330 190,290" />
  ]

  return (
    <div className="fw-geo-container">
      <svg className="fw-geo-svg" viewBox="0 0 500 500">
        {/* Stroke outlines for all shapes */}
        {shapes.map((shape, i) => (
          <polygon
            key={`stroke-${i}`}
            className="geo-stroke"
            points={(shape.props as { points: string }).points}
          />
        ))}
        {/* Filled shapes based on progress */}
        {shapes.map((shape, i) => {
          let opacity = 0
          if (i < visibleCount) {
            opacity = 1
          } else if (i === visibleCount) {
            opacity = partialOpacity
          }
          return (
            <polygon
              key={`fill-${i}`}
              className="geo-fill"
              points={(shape.props as { points: string }).points}
              style={{ opacity, transition: 'opacity 0.5s ease' }}
            />
          )
        })}
      </svg>
    </div>
  )
}

export function IllustrationPreset({
  session,
  sessionData,
  settings,
  progress,
  timerDisplay,
  metricDisplay
}: PresetProps) {
  const isPaused = session.state === 'paused_afk'
  const isBreak = session.state === 'break'
  const goalMin = sessionData.sessionGoalMinutes
  const elapsedMin = Math.floor(session.activeMs / 60000)

  return (
    <div className="fw-container preset-illustration">
      <GeometricIllustration progress={progress} />
      <div className="fw-content">
        {settings.showTitle && (
          <>
            <div className="fw-title">{sessionData.bookTitle || 'Reading'}</div>
            {sessionData.bookAuthor && (
              <div className="fw-author">{sessionData.bookAuthor}</div>
            )}
          </>
        )}

        {settings.showTimer && <div className="fw-timer">{timerDisplay}</div>}

        {settings.showProgress && (
          <div className="fw-progress-text">
            {elapsedMin}/{goalMin} min ({Math.round(progress * 100)}%)
          </div>
        )}

        {settings.showMetric && <div className="fw-metric">{metricDisplay}</div>}

        {isPaused && <div className="fw-paused">Paused — Are you still reading?</div>}
        {isBreak && <div className="fw-break-indicator">Break Time</div>}
      </div>
    </div>
  )
}
