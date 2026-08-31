import { useState, useEffect, useMemo } from 'react'
import { MEAL_LABELS, MEAL_TYPES, NUTRIENTS, getDailyRDA } from '../utils/constants'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, saveDayLog, getFoodLibrary } from '../utils/storage'
import { suggestMeals, suggestFromMenuPhoto } from '../utils/ai'
import CalorieRing from './CalorieRing'
import MacroBar from './MacroBar'
import NutrientDetails from './NutrientDetails'
import AddFood from './AddFood'

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

export default function Dashboard({ profile, onOpenSettings, initialDate, onBack, showBackButton }) {
  const [dateKey, setDateKey] = useState(initialDate || getDateKey())
  const [dayLog, setDayLog] = useState(getDayLog(initialDate || getDateKey()))
  const [addingMeal, setAddingMeal] = useState(null)
  const [showNutrients, setShowNutrients] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null) // { meal, logId, servings }
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestContext, setSuggestContext] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [suggestAddedMeal, setSuggestAddedMeal] = useState('snacks')

  const handleEditFood = (meal, logId, newServings) => {
    const updated = { ...dayLog, meals: { ...dayLog.meals } }
    updated.meals[meal] = updated.meals[meal].map((e) => {
      if (e.logId !== logId) return e
      // Recalculate nutrients based on new servings vs old
      const ratio = newServings / (e.servings || 1)
      const newNutrients = {}
      for (const [key, val] of Object.entries(e.nutrients)) {
        newNutrients[key] = val != null ? Math.round(val * ratio * 10) / 10 : null
      }
      return { ...e, servings: newServings, nutrients: newNutrients }
    })
    saveDayLog(dateKey, updated)
    setDayLog(updated)
    setEditingEntry(null)
  }

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

  const handleAddFood = (mealType, foodEntryOrEntries) => {
    const entries = Array.isArray(foodEntryOrEntries) ? foodEntryOrEntries : [foodEntryOrEntries]
    setDayLog((prev) => {
      const updated = { ...prev, meals: { ...prev.meals } }
      updated.meals[mealType] = [...(updated.meals[mealType] || []), ...entries]
      saveDayLog(dateKey, updated)
      return updated
    })
    setAddingMeal(null)
  }

  const handleRemoveFood = (mealType, logId) => {
    const updated = { ...dayLog }
    updated.meals = { ...updated.meals }
    updated.meals[mealType] = updated.meals[mealType].filter((e) => e.logId !== logId)
    saveDayLog(dateKey, updated)
    setDayLog(updated)
  }


  const handleGetSuggestions = async () => {
    setSuggestLoading(true)
    setSuggestError('')
    try {
      const rda = getDailyRDA(profile.gender, profile.targets.calories)
      const targets = { calories: profile.targets.calories, protein: profile.targets.protein, carbs: profile.targets.carbs, fat: profile.targets.fat, ...rda }

      const remaining = {}
      const gaps = []
      for (const n of NUTRIENTS) {
        const target = targets[n.key]
        if (!target) continue
        const consumed = totals[n.key] || 0
        const left = Math.max(0, Math.round((target - consumed) * 10) / 10)
        remaining[n.key] = left
        if (left > 0) {
          const pct = Math.round((left / target) * 100)
          gaps.push({ key: n.key, label: n.label, remaining: left, unit: n.unit, pct })
        }
      }
      gaps.sort((a, b) => b.pct - a.pct)

      const lib = getFoodLibrary().map((f) => ({
        name: f.name,
        calories: Math.round(f.nutrients?.calories || 0),
        protein: Math.round(f.nutrients?.protein || 0),
        carbs: Math.round(f.nutrients?.carbs || 0),
        fat: Math.round(f.nutrients?.fat || 0),
        serving: f.servingSize || '1 serving',
      }))

      const keys = { geminiKey: profile.geminiApiKey, groqKey: profile.groqApiKey }
      const result = await suggestMeals(keys, { remaining, gaps, foodLibrary: lib, context: suggestContext.trim() })
      setSuggestions(result)
    } catch (err) {
      setSuggestError(err.message || 'Failed to get suggestions')
    } finally {
      setSuggestLoading(false)
    }
  }

  const handleAddSuggestion = (item) => {
    const entry = {
      logId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${item.name} (${item.quantity})`,
      servingSize: item.quantity,
      servingWeightG: item.servingWeightG || null,
      servingUnit: 'serving',
      servingUnitAmount: 1,
      servings: 1,
      nutrients: item.nutrients || {},
      source: 'ai-suggestion',
      loggedAt: Date.now(),
    }
    handleAddFood(suggestAddedMeal, entry)
  }

  const compressImage = (file, maxDim = 768, quality = 0.6) =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })

  const handleMenuPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSuggestLoading(true)
    setSuggestError('')
    try {
      const base64 = await compressImage(file)

      const rda = getDailyRDA(profile.gender, profile.targets.calories)
      const targets = { calories: profile.targets.calories, protein: profile.targets.protein, carbs: profile.targets.carbs, fat: profile.targets.fat, ...rda }
      const remaining = {}
      const gaps = []
      for (const n of NUTRIENTS) {
        const target = targets[n.key]
        if (!target) continue
        const consumed = totals[n.key] || 0
        const left = Math.max(0, Math.round((target - consumed) * 10) / 10)
        remaining[n.key] = left
        if (left > 0) gaps.push({ key: n.key, label: n.label, remaining: left, unit: n.unit, pct: Math.round((left / target) * 100) })
      }
      gaps.sort((a, b) => b.pct - a.pct)

      const keys = { geminiKey: profile.geminiApiKey, groqKey: profile.groqApiKey }
      const result = await suggestFromMenuPhoto(keys, base64, { remaining, gaps })
      setSuggestions(result)
    } catch (err) {
      setSuggestError(err.message || 'Failed to read menu')
    } finally {
      setSuggestLoading(false)
    }
  }

  const isToday = dateKey === getDateKey()
  const displayDate = new Date(dateKey + 'T12:00:00')
  const greeting = isToday
    ? `Hey, ${profile.name?.split(' ')[0] || 'there'}`
    : displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      {/* Header */}
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {showBackButton ? (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          ) : (
            <button
              onClick={() => navigateDay(-1)}
              className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <div className="text-center">
            <p className="text-white font-semibold text-lg">
              {isToday ? 'Today' : displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500">
              {displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {showBackButton ? (
            <div className="w-9" />
          ) : (
            <button
              onClick={() => navigateDay(1)}
              disabled={isToday}
              className="w-9 h-9 rounded-xl bg-surface-3/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-3 transition disabled:opacity-20 disabled:hover:bg-transparent"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
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
        {showNutrients && <NutrientDetails totals={totals} targets={profile.targets} gender={profile.gender} />}

        {/* AI Meal Suggestions */}
        {isToday && (
          <div className="bg-surface-2 rounded-2xl overflow-hidden animate-fade-in">
            <button
              onClick={() => { setShowSuggest(!showSuggest); setSuggestions(null); setSuggestError('') }}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-3/30 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-indigo-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
                </span>
                <span className="text-white font-semibold">What should I eat?</span>
              </div>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showSuggest ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {showSuggest && (
              <div className="px-5 pb-5 space-y-4 animate-scale-in">
                {/* Remaining summary */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Cal', val: Math.max(0, Math.round(profile.targets.calories + totalBurned - (totals.calories || 0))), color: 'text-white' },
                    { label: 'Protein', val: Math.max(0, Math.round(profile.targets.protein - (totals.protein || 0))), u: 'g', color: 'text-blue-400' },
                    { label: 'Carbs', val: Math.max(0, Math.round(profile.targets.carbs - (totals.carbs || 0))), u: 'g', color: 'text-amber-400' },
                    { label: 'Fat', val: Math.max(0, Math.round(profile.targets.fat - (totals.fat || 0))), u: 'g', color: 'text-orange-400' },
                  ].map((m) => (
                    <div key={m.label} className="bg-surface-3 rounded-xl p-2">
                      <p className={`text-sm font-semibold tabular-nums ${m.color}`}>{m.val}{m.u || ''}</p>
                      <p className="text-[9px] text-gray-500 uppercase">{m.label} left</p>
                    </div>
                  ))}
                </div>

                {/* Context input */}
                <div>
                  <input
                    type="text"
                    value={suggestContext}
                    onChange={(e) => setSuggestContext(e.target.value)}
                    placeholder="Restaurant, cuisine, Google Maps link, or leave empty..."
                    className="w-full p-3 rounded-xl bg-surface-3 text-white text-sm placeholder-gray-600 border border-white/5 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleGetSuggestions}
                    disabled={suggestLoading}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {suggestLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" strokeLinecap="round" /></svg>
                        Analyzing...
                      </>
                    ) : 'Get Suggestions'}
                  </button>
                  <label className={`py-3 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition flex items-center justify-center gap-1.5 cursor-pointer ${suggestLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Scan Menu
                    <input type="file" accept="image/*" capture="environment" onChange={handleMenuPhoto} className="hidden" />
                  </label>
                </div>

                {suggestError && <p className="text-red-400 text-xs">{suggestError}</p>}

                {/* Results */}
                {suggestions && (
                  <div className="space-y-3">
                    {suggestions.menuName && (
                      <p className="text-xs text-white font-medium">{suggestions.menuName}</p>
                    )}
                    {suggestions.summary && (
                      <p className="text-xs text-gray-400 italic">{suggestions.summary}</p>
                    )}

                    {/* Meal selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase">Add to:</span>
                      {MEAL_TYPES.map((m) => (
                        <button
                          key={m}
                          onClick={() => setSuggestAddedMeal(m)}
                          className={`text-xs px-2.5 py-1 rounded-lg transition ${suggestAddedMeal === m ? 'bg-indigo-600 text-white' : 'bg-surface-3 text-gray-500 hover:text-gray-300'}`}
                        >{MEAL_LABELS[m]}</button>
                      ))}
                    </div>

                    {(suggestions.suggestions || []).map((item, i) => (
                      <div key={i} className="bg-surface-3 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity}</p>
                          </div>
                          <span className="text-sm font-semibold text-white tabular-nums shrink-0">{Math.round(item.nutrients?.calories || 0)} cal</span>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-blue-400">P: {Math.round(item.nutrients?.protein || 0)}g</span>
                          <span className="text-amber-400">C: {Math.round(item.nutrients?.carbs || 0)}g</span>
                          <span className="text-orange-400">F: {Math.round(item.nutrients?.fat || 0)}g</span>
                          {item.nutrients?.fiber > 0 && <span className="text-green-400">Fiber: {Math.round(item.nutrients.fiber)}g</span>}
                        </div>
                        {item.reasoning && <p className="text-[11px] text-gray-500">{item.reasoning}</p>}
                        <button
                          onClick={() => handleAddSuggestion(item)}
                          className="w-full py-2 rounded-lg bg-indigo-500/15 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition"
                        >
                          Add to {MEAL_LABELS[suggestAddedMeal]}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                {mealEntries.map((entry) => {
                  const isExpanded = expandedEntry === entry.logId
                  const n = entry.nutrients
                  return (
                    <div key={entry.logId} className="border-b border-white/5 last:border-0">
                      <div
                        className="flex items-center justify-between py-3 cursor-pointer"
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.logId)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-200 truncate">{entry.name}</p>
                            {entry.isSupplement && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 shrink-0">supp</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {entry.loggedAt && new Date(entry.loggedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {entry.loggedAt && ' \u00B7 '}
                            {entry.servings !== 1 ? `${entry.servings} servings` : '1 serving'}
                            {n.protein != null && ` \u00B7 P:${Math.round(n.protein)}g`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-sm font-medium text-gray-300 tabular-nums">{Math.round(n.calories)}</span>
                          <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="pb-3 animate-scale-in">
                          <div className="bg-surface-3 rounded-xl p-3 space-y-2">
                            {/* Main macros */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: 'Cal', val: n.calories, color: 'text-white' },
                                { label: 'Protein', val: n.protein, u: 'g', color: 'text-blue-400' },
                                { label: 'Carbs', val: n.carbs, u: 'g', color: 'text-amber-400' },
                                { label: 'Fat', val: n.fat, u: 'g', color: 'text-orange-400' },
                              ].map((m) => (
                                <div key={m.label}>
                                  <p className={`text-sm font-semibold tabular-nums ${m.color}`}>
                                    {m.val != null ? Math.round(m.val) : '-'}{m.u || ''}
                                  </p>
                                  <p className="text-[10px] text-gray-500 uppercase">{m.label}</p>
                                </div>
                              ))}
                            </div>
                            {/* Detailed breakdown */}
                            <div className="border-t border-white/5 pt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                              {[
                                { label: 'Saturated Fat', val: n.saturatedFat, u: 'g' },
                                { label: 'Trans Fat', val: n.transFat, u: 'g' },
                                { label: 'Polyunsat. Fat', val: n.polyunsaturatedFat, u: 'g' },
                                { label: 'Monounsat. Fat', val: n.monounsaturatedFat, u: 'g' },
                                { label: 'Fiber', val: n.fiber, u: 'g' },
                                { label: 'Sugar', val: n.sugar, u: 'g' },
                                { label: 'Sodium', val: n.sodium, u: 'mg' },
                                { label: 'Cholesterol', val: n.cholesterol, u: 'mg' },
                                { label: 'Potassium', val: n.potassium, u: 'mg' },
                                { label: 'Calcium', val: n.calcium, u: 'mg' },
                                { label: 'Iron', val: n.iron, u: 'mg' },
                                { label: 'Vitamin A', val: n.vitaminA, u: 'mcg' },
                                { label: 'Vitamin C', val: n.vitaminC, u: 'mg' },
                                { label: 'Vitamin D', val: n.vitaminD, u: 'mcg' },
                              ].filter((x) => x.val != null).map((x) => (
                                <div key={x.label} className="flex justify-between text-xs py-0.5">
                                  <span className="text-gray-500">{x.label}</span>
                                  <span className="text-gray-400 tabular-nums">{Math.round(x.val * 10) / 10}{x.u}</span>
                                </div>
                              ))}
                            </div>
                            {/* Edit servings */}
                            {editingEntry?.logId === entry.logId ? (
                              <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                <span className="text-xs text-gray-400">Servings:</span>
                                <input
                                  type="text" inputMode="decimal"
                                  defaultValue={entry.servings}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const v = parseFloat(e.target.value)
                                      if (v > 0) handleEditFood(meal, entry.logId, v)
                                    }
                                  }}
                                  className="w-16 text-center p-1.5 rounded-lg bg-gray-800 text-white border border-gray-700 text-xs focus:outline-none focus:border-blue-500"
                                />
                                <button
                                  onClick={(e2) => {
                                    const input = e2.target.closest('div').querySelector('input')
                                    const v = parseFloat(input.value)
                                    if (v > 0) handleEditFood(meal, entry.logId, v)
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs"
                                >Save</button>
                                <button onClick={() => setEditingEntry(null)} className="text-xs text-gray-500">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingEntry({ meal, logId: entry.logId }) }}
                                  className="flex-1 py-2 rounded-lg text-xs text-blue-400 hover:bg-blue-500/10 transition flex items-center justify-center gap-1.5"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveFood(meal, entry.logId); setExpandedEntry(null) }}
                                  className="flex-1 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition flex items-center justify-center gap-1.5"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2m-7 5v6m4-6v6M5 6l1 14h12l1-14"/></svg>
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

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


      </div>
    </div>
  )
}
