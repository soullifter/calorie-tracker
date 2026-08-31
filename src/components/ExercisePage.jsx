import { useState, useEffect } from 'react'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, saveDayLog, getWeightLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'
import AddExercise from './AddExercise'
import { ExerciseDetail } from './ExerciseTrends'

export default function ExercisePage({ profile }) {
  const [dateKey, setDateKey] = useState(getDateKey())
  const [dayLog, setDayLog] = useState(getDayLog(dateKey))
  const [adding, setAdding] = useState(false)
  const [viewingExercise, setViewingExercise] = useState(null)

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
    const removed = exercises.find((e) => e.id === id)
    const updated = { ...dayLog, exercises: exercises.filter((e) => e.id !== id) }
    saveDayLog(dateKey, updated)
    setDayLog(updated)
    if (undoItem?.timer) clearTimeout(undoItem.timer)
    const timer = setTimeout(() => setUndoItem(null), 5000)
    setUndoItem({ entry: removed, timer })
  }

  const handleUndoRemove = () => {
    if (!undoItem) return
    clearTimeout(undoItem.timer)
    handleAdd(undoItem.entry)
    setUndoItem(null)
  }

  const [editingId, setEditingId] = useState(null)
  const [undoItem, setUndoItem] = useState(null)

  const handleEditExercise = (id, newParams) => {
    // Recalculate proportionally based on param changes
    const updated = { ...dayLog, exercises: exercises.map((e) => {
      if (e.id !== id) return e
      const oldWeight = parseFloat(e.params?.weight) || 1
      const newWeight = parseFloat(newParams.weight) || oldWeight
      const oldSets = parseInt(e.params?.sets) || 1
      const newSets = parseInt(newParams.sets) || oldSets
      const oldReps = parseInt(e.params?.reps) || 1
      const newReps = parseInt(newParams.reps) || oldReps
      const ratio = (newWeight * newSets * newReps) / (oldWeight * oldSets * oldReps)
      const newCalories = Math.round(e.caloriesBurned * ratio)
      return {
        ...e,
        params: { ...e.params, ...newParams },
        caloriesBurned: newCalories,
        summary: newParams.sets && newParams.reps && newParams.weight
          ? `${newParams.sets}x${newParams.reps} @ ${newParams.weight}kg`
          : e.summary,
      }
    })}
    saveDayLog(dateKey, updated)
    setDayLog(updated)
    setEditingId(null)
  }

  const isToday = dateKey === getDateKey()
  const displayDate = new Date(dateKey + 'T12:00:00')

  if (viewingExercise) {
    return (
      <div className="min-h-screen bg-surface-1 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <ExerciseDetail exerciseName={viewingExercise} onBack={() => setViewingExercise(null)} />
        </div>
      </div>
    )
  }

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
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setViewingExercise(ex.exercise)}
                      className="text-sm font-medium text-gray-200 hover:text-emerald-400 transition text-left flex items-center gap-1"
                    >
                      {ex.exercise}
                      <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>
                    </button>
                    {ex.sets && ex.sets.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {ex.sets.map((s, si) => (
                          <span key={si} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-gray-400">
                            {s.reps}x{s.weight}kg
                          </span>
                        ))}
                      </div>
                    ) : ex.summary ? (
                      <p className="text-xs text-gray-400 mt-0.5">{ex.summary}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {ex.loggedAt && (
                        <span className="text-[10px] text-gray-600">
                          {new Date(ex.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      {ex.type && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          ex.type === 'strength' ? 'bg-blue-500/15 text-blue-400' :
                          ex.type === 'cardio' ? 'bg-emerald-500/15 text-emerald-400' :
                          ex.type === 'bodyweight' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-purple-500/15 text-purple-400'
                        }`}>{ex.type}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        ex.intensity === 'high' ? 'bg-red-500/15 text-red-400' :
                        ex.intensity === 'moderate' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>{ex.intensity}</span>
                      {(ex.muscleGroups || []).slice(0, 2).map((mg) => (
                        <span key={mg} className="text-[10px] text-gray-600">{mg}</span>
                      ))}
                      {ex.durationMin > 0 && (
                        <span className="text-[10px] text-gray-500">{ex.durationMin} min</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400 tabular-nums">-{ex.caloriesBurned}</p>
                      <p className="text-[10px] text-gray-600">cal</p>
                    </div>
                    <button
                      onClick={() => setEditingId(editingId === ex.id ? null : ex.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleRemove(ex.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                {editingId === ex.id && (
                  <div className="pb-3 animate-scale-in">
                    <div className="bg-surface-3 rounded-xl p-3 space-y-2">
                      {Object.entries(ex.params || {}).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <label className="text-xs text-gray-400 w-16 capitalize shrink-0">{key}</label>
                          <input
                            type="text" inputMode="decimal"
                            defaultValue={val}
                            id={`edit-${ex.id}-${key}`}
                            className="flex-1 p-2 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const newParams = {}
                            Object.keys(ex.params || {}).forEach((key) => {
                              const input = document.getElementById(`edit-${ex.id}-${key}`)
                              newParams[key] = input?.value || ex.params[key]
                            })
                            handleEditExercise(ex.id, newParams)
                          }}
                          className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                        >Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-xs">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {adding ? (
              <div className="mt-3 animate-scale-in">
                <AddExercise
                  keys={{ geminiKey: profile.geminiApiKey, groqKey: profile.groqApiKey }}
                  weightKg={(() => { const wl = getWeightLog(); return wl.length > 0 ? wl[wl.length - 1].weight : profile.weightKg })()}
                  heightCm={profile.heightCm}
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
        {undoItem && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-gray-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl z-50 animate-scale-in">
            <p className="text-sm text-gray-300">Removed {undoItem.entry?.exercise?.slice(0, 25)}</p>
            <button onClick={handleUndoRemove} className="text-sm font-semibold text-emerald-400 hover:text-emerald-300">Undo</button>
          </div>
        )}
      </div>
    </div>
  )
}
