import { NUTRIENTS, DAILY_RDA } from '../utils/constants'

export default function NutrientDetails({ totals, targets }) {
  // Combine macro targets + RDA for micronutrients
  const allTargets = {
    calories: targets.calories,
    protein: targets.protein,
    carbs: targets.carbs,
    fat: targets.fat,
    ...DAILY_RDA,
  }

  return (
    <div className="space-y-2">
      {NUTRIENTS.map(({ key, label, unit }) => {
        const current = totals[key] || 0
        const target = allTargets[key]
        if (!target) return null

        const pct = Math.min(100, (current / target) * 100)
        const over = current > target
        // Trans fat and sodium: being over is bad
        const overIsBad = ['transFat', 'sodium', 'cholesterol', 'sugar', 'saturatedFat'].includes(key)

        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-gray-400 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  over && overIsBad ? 'bg-red-500' : over ? 'bg-yellow-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`w-28 text-right shrink-0 ${over && overIsBad ? 'text-red-400' : 'text-gray-400'}`}>
              {Math.round(current * 10) / 10}/{target}{unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
