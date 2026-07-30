export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', factor: 1.2 },
  { id: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week', factor: 1.375 },
  { id: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week', factor: 1.55 },
  { id: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week', factor: 1.725 },
]

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks']

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

// Macro split for weight loss: 30% protein, 40% carbs, 30% fat
export const MACRO_SPLIT = { protein: 0.3, carbs: 0.4, fat: 0.3 }

// Calories per gram
export const CAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 }

// Full nutrient list we track
export const NUTRIENTS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Total Fat', unit: 'g' },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g' },
  { key: 'transFat', label: 'Trans Fat', unit: 'g' },
  { key: 'polyunsaturatedFat', label: 'Polyunsaturated Fat', unit: 'g' },
  { key: 'monounsaturatedFat', label: 'Monounsaturated Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg' },
]

// Daily recommended values (adult male, general guidelines)
export const DAILY_RDA = {
  fiber: 30,
  sugar: 36,
  sodium: 2300,
  cholesterol: 300,
  potassium: 3400,
  calcium: 1000,
  iron: 8,
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 15,
  saturatedFat: 22, // ~10% of 2000 cal
  transFat: 0,
  polyunsaturatedFat: 22,
  monounsaturatedFat: 22,
}
