import { MACRO_SPLIT, CAL_PER_GRAM } from './constants'

// Mifflin-St Jeor equation
export function calculateBMR(gender, weightKg, heightCm, age) {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

export function calculateTDEE(bmr, activityFactor) {
  return Math.round(bmr * activityFactor)
}

// 500 cal deficit for ~0.5kg/week loss, 250 for mild
export function calculateDailyTargets(tdee, goal = 'lose') {
  const deficit = goal === 'lose' ? 500 : goal === 'mild_lose' ? 250 : 0
  const calories = Math.max(1200, Math.round(tdee - deficit))

  const protein = Math.round((calories * MACRO_SPLIT.protein) / CAL_PER_GRAM.protein)
  const carbs = Math.round((calories * MACRO_SPLIT.carbs) / CAL_PER_GRAM.carbs)
  const fat = Math.round((calories * MACRO_SPLIT.fat) / CAL_PER_GRAM.fat)

  return { calories, protein, carbs, fat }
}

export function getDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function sumNutrients(entries) {
  const totals = {}
  for (const entry of entries) {
    for (const [key, val] of Object.entries(entry.nutrients || {})) {
      totals[key] = (totals[key] || 0) + (val || 0)
    }
  }
  return totals
}
