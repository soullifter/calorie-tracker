import { GROQ_VISION_MODEL, GROQ_TEXT_MODEL, GROQ_API_URL } from './constants'

async function callGroq(apiKey, model, messages, jsonMode = true) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 2048,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Groq API error: ${res.status}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''

  if (jsonMode) {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  }
  return content
}

export async function analyzeNutritionLabel(apiKey, imageBase64) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this nutrition label image. Extract ALL nutritional information and return JSON in this exact format:
{
  "name": "food product name if visible, otherwise describe the food",
  "servingSize": "serving size as shown on label (e.g. '1 cup (240ml)' or '30g')",
  "nutrients": {
    "calories": number,
    "protein": number (grams),
    "carbs": number (grams),
    "fat": number (grams),
    "saturatedFat": number (grams) or null,
    "transFat": number (grams) or null,
    "fiber": number (grams) or null,
    "sugar": number (grams) or null,
    "sodium": number (mg) or null,
    "cholesterol": number (mg) or null,
    "potassium": number (mg) or null,
    "calcium": number (mg) or null,
    "iron": number (mg) or null,
    "vitaminA": number (mcg) or null,
    "vitaminC": number (mg) or null,
    "vitaminD": number (mcg) or null
  }
}
All values should be per serving. Use numbers only, no units in values. If a nutrient is not visible on the label, use null.`,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ]

  return callGroq(apiKey, GROQ_VISION_MODEL, messages)
}

export async function analyzeFoodPhoto(apiKey, imageBase64) {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Look at this food photo and identify EACH individual food item visible. For each item, estimate its portion size and nutritional content separately. Return JSON:
{
  "items": [
    {
      "name": "item name (e.g. 'Scrambled Eggs')",
      "estimatedServingSize": "your estimate (e.g. '2 eggs' or '150g')",
      "nutrients": {
        "calories": number,
        "protein": number (grams),
        "carbs": number (grams),
        "fat": number (grams),
        "saturatedFat": number or null,
        "transFat": number or null,
        "fiber": number or null,
        "sugar": number or null,
        "sodium": number (mg) or null,
        "cholesterol": number (mg) or null,
        "potassium": number (mg) or null,
        "calcium": number (mg) or null,
        "iron": number (mg) or null,
        "vitaminA": number (mcg) or null,
        "vitaminC": number (mg) or null,
        "vitaminD": number (mcg) or null
      },
      "confidence": "low" | "medium" | "high"
    }
  ]
}
Return each food item as a separate entry in the items array. Be realistic with estimates. Use numbers only, no units in values.`,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ]

  return callGroq(apiKey, GROQ_VISION_MODEL, messages)
}

export async function estimateExerciseCalories(apiKey, exercise, durationMin, weightKg) {
  const messages = [
    {
      role: 'user',
      content: `Estimate calories burned for this exercise. Return JSON only:
{
  "exercise": "${exercise}",
  "durationMin": ${durationMin},
  "caloriesBurned": number,
  "intensity": "low" | "moderate" | "high"
}
Person weighs ${weightKg}kg, exercised for ${durationMin} minutes doing: ${exercise}. Be realistic.`,
    },
  ]

  return callGroq(apiKey, GROQ_TEXT_MODEL, messages)
}
