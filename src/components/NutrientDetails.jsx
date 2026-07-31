import { NUTRIENTS, getDailyRDA } from '../utils/constants'

export default function NutrientDetails({ totals, targets, gender }) {
  const rda = getDailyRDA(gender, targets.calories)

  const allTargets = {
    calories: targets.calories,
    protein: targets.protein,
    carbs: targets.carbs,
    fat: targets.fat,
    ...rda,
  }

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-scale-in space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Detailed Nutrients</h3>
      {NUTRIENTS.map(({ key, label, unit }) => {
        const current = totals[key] || 0
        const target = allTargets[key]
        if (!target) return null

        const pct = Math.min(100, (current / target) * 100)
        const over = current > target
        const overIsBad = ['transFat', 'sodium', 'cholesterol', 'sugar', 'saturatedFat'].includes(key)

        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-28 text-xs text-gray-400 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  over && overIsBad ? 'bg-red-500' : over ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`w-24 text-right text-xs shrink-0 tabular-nums ${over && overIsBad ? 'text-red-400' : 'text-gray-500'}`}>
              {Math.round(current * 10) / 10}/{target}{unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
