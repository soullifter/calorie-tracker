import { useState } from 'react'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'

export default function CalendarPicker({ onSelectDay }) {
  const [monthOffset, setMonthOffset] = useState(0)

  const today = new Date()
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = getDateKey()

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Build grid
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Get calorie data for the month
  const dayData = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const key = getDateKey(new Date(year, month, d))
    if (key > todayKey) continue
    const log = getDayLog(key)
    const entries = MEAL_TYPES.flatMap((m) => log.meals[m] || [])
    const cal = Math.round(sumNutrients(entries).calories || 0)
    if (cal > 0) dayData[d] = cal
  }

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthOffset(monthOffset - 1)}
          className="w-8 h-8 rounded-lg bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h3 className="text-sm font-semibold text-white">{monthLabel}</h3>
        <button
          onClick={() => setMonthOffset(monthOffset + 1)}
          disabled={monthOffset >= 0}
          className="w-8 h-8 rounded-lg bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white transition disabled:opacity-20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-600 font-medium">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />

          const key = getDateKey(new Date(year, month, day))
          const isToday = key === todayKey
          const isFuture = key > todayKey
          const hasCal = dayData[day]

          return (
            <button
              key={day}
              onClick={() => !isFuture && onSelectDay(key)}
              disabled={isFuture}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition relative ${
                isToday
                  ? 'bg-brand-500 text-white font-bold'
                  : isFuture
                    ? 'text-gray-700 cursor-default'
                    : hasCal
                      ? 'bg-surface-3 text-gray-200 hover:bg-surface-3/80'
                      : 'text-gray-500 hover:bg-surface-3/50'
              }`}
            >
              {day}
              {hasCal && !isToday && (
                <div className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
