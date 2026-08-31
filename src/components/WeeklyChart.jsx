import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'

export default function WeeklyChart({ target }) {
  const today = new Date()
  const days = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = getDateKey(d)
    const log = getDayLog(key)
    const entries = MEAL_TYPES.flatMap((m) => log.meals[m] || [])
    const totals = sumNutrients(entries)
    const burned = (log.exercises || []).reduce((s, e) => s + (e.caloriesBurned || 0), 0)
    days.push({
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      calories: Math.round(totals.calories || 0),
      burned,
      isToday: i === 0,
    })
  }

  const maxVal = Math.max(target, ...days.map((d) => d.calories)) * 1.1

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">This Week</h3>
        <span className="text-xs text-gray-500">Target: {target} cal</span>
      </div>

      <div className="flex items-end gap-2 h-40">
        {days.map((day) => {
          const pct = Math.max(3, (day.calories / maxVal) * 100)
          const targetPct = (target / maxVal) * 100
          const overTarget = day.calories > target
          const hasData = day.calories > 0

          return (
            <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
              <span className={`text-[9px] tabular-nums font-medium ${hasData ? (overTarget ? 'text-red-400' : 'text-gray-300') : 'text-gray-700'}`}>
                {hasData ? day.calories : ''}
              </span>

              <div className="w-full flex-1 flex items-end relative">
                {/* Target marker */}
                <div
                  className="absolute w-full border-t border-dashed border-gray-600/50"
                  style={{ bottom: `${targetPct}%` }}
                />
                <div
                  className={`w-full rounded-lg transition-all duration-700 ${
                    !hasData ? 'bg-white/[0.03]' :
                    overTarget ? 'bg-gradient-to-t from-red-600/60 to-red-400/40' : 'bg-gradient-to-t from-indigo-600/60 to-indigo-400/40'
                  }`}
                  style={{ height: `${hasData ? pct : 3}%`, minHeight: '4px' }}
                />
              </div>

              <span className={`text-[10px] ${day.isToday ? 'text-white font-bold' : 'text-gray-600'}`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-indigo-600/60 to-indigo-400/40" />
          <span className="text-[10px] text-gray-500">Under</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-red-600/60 to-red-400/40" />
          <span className="text-[10px] text-gray-500">Over</span>
        </div>
      </div>
    </div>
  )
}
