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

      <div className="flex items-end gap-2 h-36">
        {days.map((day) => {
          const pct = Math.max(2, (day.calories / maxVal) * 100)
          const overTarget = day.calories > target
          const hasData = day.calories > 0

          return (
            <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
              {/* Calorie label */}
              <span className={`text-[9px] tabular-nums ${hasData ? 'text-gray-400' : 'text-gray-700'}`}>
                {hasData ? day.calories : ''}
              </span>

              {/* Bar */}
              <div className="w-full flex-1 flex items-end">
                <div className="w-full relative">
                  {/* Target line */}
                  <div
                    className="absolute w-full border-t border-dashed border-gray-700"
                    style={{ bottom: `${(target / maxVal) * 100}%` }}
                  />
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      !hasData ? 'bg-gray-800' :
                      overTarget ? 'bg-red-500/70' : 'bg-indigo-500/70'
                    }`}
                    style={{ height: `${pct}%`, minHeight: '4px' }}
                  />
                </div>
              </div>

              {/* Day label */}
              <span className={`text-[10px] ${day.isToday ? 'text-white font-semibold' : 'text-gray-600'}`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500/70" />
          <span className="text-[10px] text-gray-500">Under target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="text-[10px] text-gray-500">Over target</span>
        </div>
      </div>
    </div>
  )
}
