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
  { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg' },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg' },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'omega3', label: 'Omega-3', unit: 'mg' },
  { key: 'biotin', label: 'Biotin', unit: 'mcg' },
  { key: 'folate', label: 'Folate', unit: 'mcg' },
  { key: 'creatine', label: 'Creatine', unit: 'g' },
  { key: 'caffeine', label: 'Caffeine', unit: 'mg' },
]

// Gender-aware RDA values (sources: FDA, NIH, AHA)
// Returns daily targets based on gender and calorie target
export function getDailyRDA(gender, dailyCalories) {
  const isMale = gender === 'male'

  return {
    // Fat sub-targets derived from actual calorie target
    saturatedFat: Math.round(dailyCalories * 0.10 / 9),  // <10% of calories (AHA)
    transFat: 0,                                           // as low as possible (WHO)
    polyunsaturatedFat: Math.round(dailyCalories * 0.08 / 9), // 6-10% of calories
    monounsaturatedFat: Math.round(dailyCalories * 0.12 / 9), // remainder of fat budget

    // Fiber: 14g per 1000 cal (IOM)
    fiber: Math.round(dailyCalories * 14 / 1000),

    // Sugar: AHA recommends 36g men, 25g women
    sugar: isMale ? 36 : 25,

    // Minerals
    sodium: 2300,                    // FDA, same for both
    cholesterol: 300,                // FDA, same for both
    potassium: isMale ? 3400 : 2600, // NIH
    calcium: 1000,                   // NIH (19-50 age)
    iron: isMale ? 8 : 18,          // NIH (women need more due to menstruation)

    // Vitamins
    vitaminA: isMale ? 900 : 700,   // NIH (mcg RAE)
    vitaminC: isMale ? 90 : 75,     // NIH
    vitaminD: 15,                    // NIH (600 IU = 15mcg, same for both)
    vitaminE: 15,                    // NIH
    vitaminB6: isMale ? 1.3 : 1.3,  // NIH (19-50)
    vitaminB12: 2.4,                 // NIH
    zinc: isMale ? 11 : 8,          // NIH
    magnesium: isMale ? 420 : 320,  // NIH
    omega3: 1600,                    // NIH (ALA, mg)
    biotin: 30,                      // NIH (mcg)
    folate: 400,                     // NIH (mcg DFE)
  }
}
