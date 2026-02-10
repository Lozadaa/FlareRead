import { PresetProps } from '../types'
import { ProgressRing } from './ProgressRing'

export function MonochromePreset({
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
    <div className="fw-container preset-monochrome">
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '60%' }}>
            <div
              style={{
                flex: 1,
                height: 2,
                background: 'var(--fw-accent)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progress * 100}%`,
                  background: 'var(--fw-fg)',
                  transition: 'width 1s linear'
                }}
              />
            </div>
            <div className="fw-progress-text">{elapsedMin}/{goalMin}</div>
          </div>
        )}

        {settings.showMetric && <div className="fw-metric">{metricDisplay}</div>}

        {isPaused && <div className="fw-paused">Paused — Are you still reading?</div>}
        {isBreak && <div className="fw-break-indicator">Break Time</div>}
      </div>
    </div>
  )
}
