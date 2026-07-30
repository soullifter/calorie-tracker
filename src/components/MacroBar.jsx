export default function MacroBar({ label, current, target, unit = 'g', color }) {
  const pct = Math.min(100, (current / target) * 100)
  const over = current > target

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className={over ? 'text-red-400' : 'text-gray-300'}>
          {Math.round(current)}/{target}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
