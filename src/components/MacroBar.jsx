export default function MacroBar({ label, current, target, unit = 'g', color, iconColor }) {
  const pct = Math.min(100, (current / target) * 100)
  const over = current > target
  const remaining = Math.max(0, target - current)

  return (
    <div className="flex items-center gap-4 animate-fade-in">
      {/* Circular mini progress */}
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="oklch(0.21 0.01 260)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" fill="none"
            stroke={over ? '#ef4444' : 'currentColor'}
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 20}
            strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
            className={`transition-all duration-700 ${iconColor}`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${over ? 'text-red-400' : iconColor}`}>
          {Math.round(pct)}%
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-200">{label}</span>
          <span className="text-xs text-gray-500 tabular-nums">
            {over
              ? <span className="text-red-400">+{Math.round(current - target)}{unit} over</span>
              : `${Math.round(remaining)}${unit} left`
            }
          </span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${over ? 'bg-red-500' : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={`text-xs font-medium tabular-nums ${over ? 'text-red-400' : 'text-white'}`}>
            {Math.round(current)}{unit}
          </span>
          <span className="text-xs text-gray-600 tabular-nums">{target}{unit}</span>
        </div>
      </div>
    </div>
  )
}
