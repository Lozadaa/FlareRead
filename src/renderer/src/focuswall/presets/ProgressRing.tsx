interface ProgressRingProps {
  progress: number // 0-1
  size?: number
  children?: React.ReactNode
}

export function ProgressRing({ progress, size = 240, children }: ProgressRingProps) {
  const center = size / 2
  const radius = center - 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="fw-progress-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={center} cy={center} r={radius} />
        <circle
          className="progress"
          cx={center}
          cy={center}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="fw-progress-inner">{children}</div>
    </div>
  )
}
