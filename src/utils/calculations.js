import { CAL_PER_GRAM } from './constants'

// Mifflin-St Jeor equation
export function calculateBMR(gender, weightKg, heightCm, age) {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

// Small flat buffer above BMR for baseline daily movement (NEAT) not captured
// by logged exercise — no activity-level guessing, just a modest multiplier.
export const NEAT_FACTOR = 1.2

export function calculateBaseline(bmr) {
  return Math.round(bmr * NEAT_FACTOR)
}

// Calculate deficit from weight goal and timeline
// 1 kg of fat = ~7700 calories
export function calculateDeficit(currentKg, targetKg, targetDate) {
  const kgToLose = currentKg - targetKg
  if (kgToLose <= 0) return 0 // maintaining or gaining

  const today = new Date()
  const deadline = new Date(targetDate + 'T12:00:00')
  const daysLeft = Math.max(1, Math.round((deadline - today) / (1000 * 60 * 60 * 24)))
  const weeksLeft = daysLeft / 7

  const kgPerWeek = kgToLose / weeksLeft
  const dailyDeficit = Math.round((kgPerWeek * 7700) / 7)

  // Cap deficit: minimum 250, maximum 1000 cal/day (safe range)
  // 1000 cal/day = ~1kg/week, generally considered max safe rate
  return Math.min(1000, Math.max(250, dailyDeficit))
}

export function getWeeklyLossRate(deficit) {
  // deficit cal/day * 7 days / 7700 cal per kg
  return Math.round(deficit * 7 / 7700 * 100) / 100
}

export function calculateDailyTargets(tdee, deficit, weightKg) {
  const calories = Math.max(
    1200, // absolute minimum for safety
    Math.round(tdee - deficit)
  )

  // Protein: 1.6-2.2g per kg bodyweight when losing weight (higher to preserve muscle)
  // Use 2g/kg, capped at 35% of calories
  const proteinFromWeight = Math.round(weightKg * 2)
  const proteinFromCalories = Math.round((calories * 0.35) / CAL_PER_GRAM.protein)
  const protein = Math.min(proteinFromWeight, proteinFromCalories)

  // Fat: 25-30% of calories (essential for hormones)
  const fat = Math.round((calories * 0.27) / CAL_PER_GRAM.fat)

  // Carbs: whatever is left
  const proteinCal = protein * CAL_PER_GRAM.protein
  const fatCal = fat * CAL_PER_GRAM.fat
  const carbs = Math.round(Math.max(50, (calories - proteinCal - fatCal)) / CAL_PER_GRAM.carbs)

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
