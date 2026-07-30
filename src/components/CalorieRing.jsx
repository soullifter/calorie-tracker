export default function CalorieRing({ consumed, target, burned = 0 }) {
  const adjusted = target + burned
  const remaining = Math.max(0, adjusted - consumed)
  const pct = Math.min(1, consumed / adjusted)
  const over = consumed > adjusted

  const radius = 70
  const stroke = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={stroke}
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={over ? '#ef4444' : '#3b82f6'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <p className={`text-3xl font-bold ${over ? 'text-red-400' : 'text-white'}`}>
          {Math.round(remaining)}
        </p>
        <p className="text-xs text-gray-400">
          {over ? 'over' : 'remaining'}
        </p>
      </div>
    </div>
  )
}
