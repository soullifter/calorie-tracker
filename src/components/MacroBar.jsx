const ICONS = {
  Protein: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zM6 21v-2a6 6 0 0 1 12 0v2" />
    </svg>
  ),
  Carbs: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3c-1.5 0-3 .5-4 2-1 1.5-1 3.5 0 5l4 6 4-6c1-1.5 1-3.5 0-5-1-1.5-2.5-2-4-2z" />
    </svg>
  ),
  Fat: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" />
    </svg>
  ),
}

export default function MacroBar({ label, current, target, unit = 'g', color, gradient }) {
  const pct = Math.min(100, (current / target) * 100)
  const over = current > target

  return (
    <div className="bg-surface-2 rounded-2xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${gradient}`}>
            {ICONS[label]}
          </div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold ${over ? 'text-red-400' : 'text-white'}`}>
            {Math.round(current)}
          </span>
          <span className="text-xs text-gray-500">/{target}{unit}</span>
        </div>
      </div>
      <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${over ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
