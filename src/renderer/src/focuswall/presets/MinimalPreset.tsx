import { PresetProps } from '../types'
import { ProgressRing } from './ProgressRing'

export function MinimalPreset({
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
    <div className="fw-container preset-minimal">
      <div className="fw-content">
        {settings.showTitle && (
          <>
            <div className="fw-title">{sessionData.bookTitle || 'Reading'}</div>
            {sessionData.bookAuthor && (
              <div className="fw-author">{sessionData.bookAuthor}</div>
            )}
          </>
        )}

        {settings.showProgress && (
          <ProgressRing progress={progress}>
            {settings.showTimer && <div className="fw-timer" style={{ fontSize: '2.5rem' }}>{timerDisplay}</div>}
            <div className="fw-progress-text">{elapsedMin}/{goalMin} min</div>
          </ProgressRing>
        )}

        {!settings.showProgress && settings.showTimer && (
          <div className="fw-timer">{timerDisplay}</div>
        )}

        {settings.showMetric && <div className="fw-metric">{metricDisplay}</div>}

        {isPaused && <div className="fw-paused">Paused — Are you still reading?</div>}
        {isBreak && <div className="fw-break-indicator">Break Time</div>}
      </div>
    </div>
  )
}
