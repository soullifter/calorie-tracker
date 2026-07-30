import { useState, useEffect } from 'react'
import { MEAL_LABELS, MEAL_TYPES } from '../utils/constants'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, saveDayLog } from '../utils/storage'
import CalorieRing from './CalorieRing'
import MacroBar from './MacroBar'
import NutrientDetails from './NutrientDetails'
import AddFood from './AddFood'
import AddExercise from './AddExercise'

export default function Dashboard({ profile, onOpenSettings }) {
  const [dateKey, setDateKey] = useState(getDateKey())
  const [dayLog, setDayLog] = useState(getDayLog(dateKey))
  const [addingMeal, setAddingMeal] = useState(null) // meal type or null
  const [addingExercise, setAddingExercise] = useState(false)
  const [showNutrients, setShowNutrients] = useState(false)

  useEffect(() => {
    setDayLog(getDayLog(dateKey))
  }, [dateKey])

  const allEntries = MEAL_TYPES.flatMap((m) => dayLog.meals[m] || [])
  const totals = sumNutrients(allEntries)
  const totalBurned = (dayLog.exercises || []).reduce((sum, e) => sum + (e.caloriesBurned || 0), 0)

  const navigateDay = (offset) => {
    const d = new Date(dateKey)
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

  return (
    <div className="min-h-screen bg-gray-950 pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigateDay(-1)} className="text-gray-400 hover:text-white p-1">&larr;</button>
          <div className="text-center">
            <p className="text-white font-medium">
              {isToday ? 'Today' : displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => navigateDay(1)}
            disabled={isToday}
            className="text-gray-400 hover:text-white p-1 disabled:opacity-30"
          >&rarr;</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 mt-4">
        {/* Calorie Ring */}
        <div className="text-center">
          <CalorieRing consumed={totals.calories || 0} target={profile.targets.calories} burned={totalBurned} />
          <div className="flex justify-center gap-6 mt-3 text-sm text-gray-400">
            <span>Target: {profile.targets.calories + totalBurned}</span>
            <span>Eaten: {Math.round(totals.calories || 0)}</span>
            {totalBurned > 0 && <span className="text-green-400">Burned: {totalBurned}</span>}
          </div>
        </div>

        {/* Macro Bars */}
        <div className="space-y-3">
          <MacroBar label="Protein" current={totals.protein || 0} target={profile.targets.protein} color="bg-blue-500" />
          <MacroBar label="Carbs" current={totals.carbs || 0} target={profile.targets.carbs} color="bg-yellow-500" />
          <MacroBar label="Fat" current={totals.fat || 0} target={profile.targets.fat} color="bg-orange-500" />
        </div>

        {/* Detailed Nutrients Toggle */}
        <button
          onClick={() => setShowNutrients(!showNutrients)}
          className="w-full text-sm text-gray-400 hover:text-white py-2"
        >
          {showNutrients ? 'Hide' : 'Show'} detailed nutrients
        </button>
        {showNutrients && <NutrientDetails totals={totals} targets={profile.targets} />}

        {/* Meals */}
        {MEAL_TYPES.map((meal) => (
          <div key={meal} className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">{MEAL_LABELS[meal]}</h3>
              <span className="text-sm text-gray-400">
                {Math.round(sumNutrients(dayLog.meals[meal] || []).calories || 0)} cal
              </span>
            </div>

            {(dayLog.meals[meal] || []).map((entry) => (
              <div key={entry.logId} className="flex items-center justify-between py-2 border-t border-gray-800">
                <div>
                  <p className="text-sm text-gray-300">{entry.name}</p>
                  <p className="text-xs text-gray-500">{entry.servings} serving{entry.servings !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{Math.round(entry.nutrients.calories)} cal</span>
                  <button
                    onClick={() => handleRemoveFood(meal, entry.logId)}
                    className="text-gray-600 hover:text-red-400 text-xs"
                  >&times;</button>
                </div>
              </div>
            ))}

            {addingMeal === meal ? (
              <div className="mt-3">
                <AddFood
                  mealType={meal}
                  apiKey={profile.groqApiKey}
                  onAdd={(food) => handleAddFood(meal, food)}
                  onClose={() => setAddingMeal(null)}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingMeal(meal)}
                className="mt-2 w-full py-2 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:border-blue-500 hover:text-blue-400 text-sm transition"
              >
                + Add Food
              </button>
            )}
          </div>
        ))}

        {/* Exercise Section */}
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Exercise</h3>
            <span className="text-sm text-green-400">
              {totalBurned > 0 ? `+${totalBurned} cal burned` : ''}
            </span>
          </div>

          {(dayLog.exercises || []).map((ex) => (
            <div key={ex.id} className="flex items-center justify-between py-2 border-t border-gray-800">
              <div>
                <p className="text-sm text-gray-300">{ex.exercise}</p>
                <p className="text-xs text-gray-500">{ex.durationMin} min</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-400">-{ex.caloriesBurned} cal</span>
                <button
                  onClick={() => handleRemoveExercise(ex.id)}
                  className="text-gray-600 hover:text-red-400 text-xs"
                >&times;</button>
              </div>
            </div>
          ))}

          {addingExercise ? (
            <div className="mt-3">
              <AddExercise
                apiKey={profile.groqApiKey}
                weightKg={profile.weightKg}
                onAdd={handleAddExercise}
                onClose={() => setAddingExercise(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingExercise(true)}
              className="mt-2 w-full py-2 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:border-green-500 hover:text-green-400 text-sm transition"
            >
              + Add Exercise
            </button>
          )}
        </div>

        {/* Settings link */}
        <button
          onClick={onOpenSettings}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 transition"
        >
          Settings
        </button>
      </div>
    </div>
  )
}
