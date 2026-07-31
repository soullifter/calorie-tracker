import { useState, useEffect } from 'react'
import { MEAL_LABELS, MEAL_TYPES } from '../utils/constants'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, saveDayLog } from '../utils/storage'
import CalorieRing from './CalorieRing'
import MacroBar from './MacroBar'
import NutrientDetails from './NutrientDetails'
import AddFood from './AddFood'
import AddExercise from './AddExercise'

const MEAL_ICONS = {
  breakfast: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zm0-3h16" />
    </svg>
  ),
  lunch: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 13h18M5 17h14a2 2 0 0 0 2-2H3a2 2 0 0 0 2 2zM5 13l1-7h12l1 7M12 3v3" />
    </svg>
  ),
  dinner: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" />
    </svg>
  ),
  snacks: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2L9 7H3l5 4-2 7 6-4 6 4-2-7 5-4h-6z" />
    </svg>
  ),
}

const MEAL_GRADIENTS = {
  breakfast: 'from-amber-500/20 to-orange-500/20',
  lunch: 'from-emerald-500/20 to-teal-500/20',
  dinner: 'from-indigo-500/20 to-purple-500/20',
  snacks: 'from-pink-500/20 to-rose-500/20',
}

const MEAL_ACCENTS = {
  breakfast: 'text-amber-400 border-amber-500/30',
  lunch: 'text-emerald-400 border-emerald-500/30',
  dinner: 'text-indigo-400 border-indigo-500/30',
  snacks: 'text-pink-400 border-pink-500/30',
}

export default function Dashboard({ profile, onOpenSettings }) {
  const [dateKey, setDateKey] = useState(getDateKey())
  const [dayLog, setDayLog] = useState(getDayLog(dateKey))
  const [addingMeal, setAddingMeal] = useState(null)
  const [addingExercise, setAddingExercise] = useState(false)
  const [showNutrients, setShowNutrients] = useState(false)

  useEffect(() => {
    setDayLog(getDayLog(dateKey))
  }, [dateKey])

  const allEntries = MEAL_TYPES.flatMap((m) => dayLog.meals[m] || [])
  const totals = sumNutrients(allEntries)
  const totalBurned = (dayLog.exercises || []).reduce((sum, e) => sum + (e.caloriesBurned || 0), 0)

  const navigateDay = (offset) => {
    const d = new Date(dateKey + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    const newKey = getDateKey(d)
    if (newKey <= getDateKey()) setDateKey(newKey)
  }

  const handleAddFood = (mealType, foodEntry) => {
    const updated = { ...dayLog }
    updated.meals = { ...updated.meals }
    updated.meals[mealType] = [...(updated.meals[mealType] || []), foodEntry]
    saveDayLog(dateKey, updated)
    setDayLog(updated)
    setAddingMeal(null)
  }

  const handleRemoveFood = (mealType, logId) => {
    const updated = { ...dayLog }
    updated.meals = { ...updated.meals }
    updated.meals[mealType] = updated.meals[mealType].filter((e) => e.logId !== logId)
    saveDayLog(dateKey, updated)
    setDayLog(updated)
  }

  const handleAddExercise = (exercise) => {
    const updated = { ...dayLog, exercises: [...(dayLog.exercises || []), exercise] }
    saveDayLog(dateKey, updated)
    setDayLog(updated)
    setAddingExercise(false)
  }

  const handleRemoveExercise = (id) => {
    const updated = { ...dayLog, exercises: (dayLog.exercises || []).filter((e) => e.id !== id) }
    saveDayLog(dateKey, updated)
    setDayLog(updated)
  }

  const isToday = dateKey === getDateKey()
  const displayDate = new Date(dateKey + 'T12:00:00')
  const greeting = isToday
    ? `Hey, ${profile.name?.split(' ')[0] || 'there'}`
    : displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-surface-1 pb-8">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={() => navigateDay(-1)}
            className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">{greeting}</p>
            {isToday && (
              <p className="text-xs text-gray-500">
                {displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
          <button
            onClick={() => navigateDay(1)}
            disabled={isToday}
            className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition disabled:opacity-20 disabled:hover:bg-transparent"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-6">
        {/* Calorie Ring Section */}
        <div className="text-center animate-fade-in">
          <CalorieRing consumed={totals.calories || 0} target={profile.targets.calories} burned={totalBurned} />
          <div className="flex justify-center gap-5 mt-4">
            {[
              { label: 'Target', value: profile.targets.calories + totalBurned, color: 'text-gray-400' },
              { label: 'Eaten', value: Math.round(totals.calories || 0), color: 'text-white' },
              ...(totalBurned > 0 ? [{ label: 'Burned', value: totalBurned, color: 'text-emerald-400' }] : []),
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className={`text-lg font-semibold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div className="bg-surface-2 rounded-2xl p-5 space-y-5">
          <MacroBar label="Protein" current={totals.protein || 0} target={profile.targets.protein} color="bg-blue-500" iconColor="text-blue-400" />
          <MacroBar label="Carbs" current={totals.carbs || 0} target={profile.targets.carbs} color="bg-amber-500" iconColor="text-amber-400" />
          <MacroBar label="Fat" current={totals.fat || 0} target={profile.targets.fat} color="bg-orange-500" iconColor="text-orange-400" />
        </div>

        {/* Detailed Nutrients */}
        <button
          onClick={() => setShowNutrients(!showNutrients)}
          className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 py-1 transition"
        >
          <span>{showNutrients ? 'Hide' : 'View'} all nutrients</span>
          <svg className={`w-3 h-3 transition-transform ${showNutrients ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showNutrients && <NutrientDetails totals={totals} targets={profile.targets} />}

        {/* Meals */}
        {MEAL_TYPES.map((meal, i) => {
          const mealEntries = dayLog.meals[meal] || []
          const mealCal = Math.round(sumNutrients(mealEntries).calories || 0)
          const accent = MEAL_ACCENTS[meal]

          return (
            <div
              key={meal}
              className="bg-surface-2 rounded-2xl overflow-hidden animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Meal header with gradient strip */}
              <div className={`bg-gradient-to-r ${MEAL_GRADIENTS[meal]} px-5 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={accent.split(' ')[0]}>{MEAL_ICONS[meal]}</span>
                    <h3 className="text-white font-semibold">{MEAL_LABELS[meal]}</h3>
                  </div>
                  <span className="text-sm font-medium text-gray-400 tabular-nums">
                    {mealCal > 0 ? `${mealCal} cal` : ''}
                  </span>
                </div>
              </div>

              <div className="px-5 pb-4">
                {mealEntries.map((entry) => (
                  <div key={entry.logId} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200 truncate">{entry.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {entry.servings !== 1 ? `${entry.servings} servings` : '1 serving'}
                        {entry.nutrients.protein != null && ` \u00B7 P:${Math.round(entry.nutrients.protein)}g`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-medium text-gray-300 tabular-nums">{Math.round(entry.nutrients.calories)}</span>
                      <button
                        onClick={() => handleRemoveFood(meal, entry.logId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                ))}

                {addingMeal === meal ? (
                  <div className="mt-3 animate-scale-in">
                    <AddFood
                      mealType={meal}
                      keys={{ geminiKey: profile.geminiApiKey, groqKey: profile.groqApiKey }}
                      onAdd={(food) => handleAddFood(meal, food)}
                      onClose={() => setAddingMeal(null)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingMeal(meal)}
                    className={`mt-3 w-full py-2.5 rounded-xl border border-dashed ${accent.split(' ')[1] || 'border-gray-700'} text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition flex items-center justify-center gap-2`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
                    Add Food
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Exercise Section */}
        <div className="bg-surface-2 rounded-2xl overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M13 4v16M7 4v16M3 8h4m-4 8h4m6-8h8m-8 8h8M7 4h6M7 20h6" />
                  </svg>
                </span>
                <h3 className="text-white font-semibold">Exercise</h3>
              </div>
              {totalBurned > 0 && (
                <span className="text-sm font-medium text-emerald-400 tabular-nums">-{totalBurned} cal</span>
              )}
            </div>
          </div>

          <div className="px-5 pb-4">
            {(dayLog.exercises || []).map((ex) => (
              <div key={ex.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-gray-200">{ex.exercise}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ex.durationMin} min \u00B7 {ex.intensity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-400 tabular-nums">-{ex.caloriesBurned}</span>
                  <button
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}

            {addingExercise ? (
              <div className="mt-3 animate-scale-in">
                <AddExercise
                  keys={{ geminiKey: profile.geminiApiKey, groqKey: profile.groqApiKey }}
                  weightKg={profile.weightKg}
                  onAdd={handleAddExercise}
                  onClose={() => setAddingExercise(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingExercise(true)}
                className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
                Add Exercise
              </button>
            )}
          </div>
        </div>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-full py-3 rounded-xl bg-surface-2 text-sm text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </div>
  )
}
