import { useState, useEffect } from 'react'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, saveDayLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'
import AddExercise from './AddExercise'

export default function ExercisePage({ profile }) {
  const [dateKey, setDateKey] = useState(getDateKey())
  const [dayLog, setDayLog] = useState(getDayLog(dateKey))
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setDayLog(getDayLog(dateKey))
  }, [dateKey])

  const exercises = dayLog.exercises || []
  const totalBurned = exercises.reduce((s, e) => s + (e.caloriesBurned || 0), 0)

  // Today's food calories for context
  const foodEntries = MEAL_TYPES.flatMap((m) => dayLog.meals[m] || [])
  const foodCal = Math.round(sumNutrients(foodEntries).calories || 0)
  const netCal = foodCal - totalBurned

  const navigateDay = (offset) => {
    const d = new Date(dateKey + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    const newKey = getDateKey(d)
    if (newKey <= getDateKey()) setDateKey(newKey)
  }

  const handleAdd = (exercise) => {
    const updated = { ...dayLog, exercises: [...exercises, exercise] }
    saveDayLog(dateKey, updated)
    setDayLog(updated)
    setAdding(false)
  }

  const handleRemove = (id) => {
    const updated = { ...dayLog, exercises: exercises.filter((e) => e.id !== id) }
    saveDayLog(dateKey, updated)
    setDayLog(updated)
  }

  const isToday = dateKey === getDateKey()
  const displayDate = new Date(dateKey + 'T12:00:00')

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigateDay(-1)}
            className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">
              {isToday ? 'Today' : displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500">Exercise</p>
          </div>
          <button onClick={() => navigateDay(1)} disabled={isToday}
            className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition disabled:opacity-20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-2 rounded-2xl p-4 text-center animate-fade-in">
            <p className="text-2xl font-bold tabular-nums text-emerald-400">{totalBurned}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">Burned</p>
            <p className="text-[10px] text-gray-600 mt-0.5">cal</p>
          </div>
          <div className="bg-surface-2 rounded-2xl p-4 text-center animate-fade-in">
            <p className="text-2xl font-bold tabular-nums text-white">{foodCal}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">Eaten</p>
            <p className="text-[10px] text-gray-600 mt-0.5">cal</p>
          </div>
          <div className="bg-surface-2 rounded-2xl p-4 text-center animate-fade-in">
            <p className={`text-2xl font-bold tabular-nums ${netCal > profile.targets.calories ? 'text-red-400' : 'text-indigo-400'}`}>{netCal}</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">Net</p>
            <p className="text-[10px] text-gray-600 mt-0.5">cal</p>
          </div>
        </div>

        {/* Exercise list */}
        <div className="bg-surface-2 rounded-2xl overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M13 4v16M7 4v16M3 8h4m-4 8h4m6-8h8m-8 8h8M7 4h6M7 20h6" />
                  </svg>
                </span>
                <h3 className="text-white font-semibold">Workouts</h3>
              </div>
              <span className="text-sm font-medium text-gray-400 tabular-nums">
                {exercises.length} session{exercises.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="px-5 pb-4">
            {exercises.length === 0 && !adding && (
              <p className="text-gray-600 text-sm text-center py-6">No exercises logged today</p>
            )}

            {exercises.map((ex, i) => (
              <div key={ex.id} className="py-3 border-b border-white/5 last:border-0 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{ex.exercise}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        {ex.durationMin} min
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ex.intensity === 'high' ? 'bg-red-500/15 text-red-400' :
                        ex.intensity === 'moderate' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {ex.intensity}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400 tabular-nums">-{ex.caloriesBurned}</p>
                      <p className="text-[10px] text-gray-600">cal</p>
                    </div>
                    <button
                      onClick={() => handleRemove(ex.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {adding ? (
              <div className="mt-3 animate-scale-in">
                <AddExercise
                  keys={{ geminiKey: profile.geminiApiKey, groqKey: profile.groqApiKey }}
                  weightKg={profile.weightKg}
                  onAdd={handleAdd}
                  onClose={() => setAdding(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="mt-3 w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
                Log Exercise
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
