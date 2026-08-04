export default function CalorieRing({ consumed, target }) {
  const remaining = Math.max(0, target - consumed)
  const pct = Math.min(1, consumed / target)
  const over = consumed > target

  const size = 200
  const radius = 82
  const stroke = 12
  const circumference = 2 * Math.PI * radius
  const offset = circumference - pct * circumference
  const center = size / 2
  const gradientId = 'ring-gradient'

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect */}
      <div
        className="absolute rounded-full blur-2xl opacity-20 transition-all duration-700"
        style={{
          width: size - 30,
          height: size - 30,
          background: over
            ? 'radial-gradient(circle, #ef4444, transparent 70%)'
            : 'radial-gradient(circle, #818cf8, transparent 70%)',
        }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={over ? '#ef4444' : '#818cf8'} />
            <stop offset="100%" stopColor={over ? '#f87171' : '#6366f1'} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="oklch(0.21 0.01 260)" strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ '--ring-circumference': circumference }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={`text-4xl font-bold tracking-tight ${over ? 'text-red-400' : 'text-white'}`}>
          {Math.round(remaining)}
        </p>
        <p className="text-[11px] uppercase tracking-widest text-gray-500 mt-0.5">
          {over ? 'over' : 'cal left'}
        </p>
      </div>
    </div>
  )
}
