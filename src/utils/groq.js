import { GROQ_VISION_MODEL, GROQ_TEXT_MODEL, GROQ_API_URL } from './constants'

async function callGroq(apiKey, model, messages, jsonMode = true) {
  // Prepend system message to suppress thinking and get direct JSON
  const allMessages = [
    { role: 'system', content: 'You are a nutrition analysis assistant. Respond with JSON only. Do NOT include any thinking, reasoning, or explanation — output the JSON object directly. No <think> tags.' },
    ...messages,
  ]

  const body = {
    model,
    messages: allMessages,
    temperature: 0.1,
    max_tokens: 8192,
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // If there's a failed_generation, try to extract JSON from it
    if (err.error?.failed_generation) {
      try {
        return extractJson(err.error.failed_generation)
      } catch {
        // fall through to throw
      }
    }
    throw new Error(err.error?.message || `Groq API error: ${res.status}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''

  if (jsonMode) {
    return extractJson(content)
  }
  return content
}

function extractJson(text) {
  // Strip thinking tags if present
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  // Strip markdown code fences
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  // Try to find JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      throw new Error(`JSON parse error: ${e.message}\n\nExtracted: ${jsonMatch[0].slice(0, 300)}`)
    }
  }
  // Show what we got so user can report the issue
  const preview = cleaned.slice(0, 500) || text.slice(0, 500) || '(empty response)'
  throw new Error(`Could not find JSON in AI response.\n\nResponse preview: ${preview}`)
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
  "servingSize": "serving size exactly as shown on label (e.g. '1 cup (240ml)' or '2 cookies (30g)')",
  "servingWeightG": number or null (the weight in grams of one serving, e.g. 30 for '30g' or 240 for '1 cup (240g)'),
  "servingVolumeML": number or null (the volume in ml if applicable, e.g. 240 for '1 cup (240ml)'),
  "servingUnit": "the unit type: 'g', 'ml', 'oz', 'pieces', or 'serving'",
  "servingUnitAmount": number (how many grams/ml/oz/pieces in one serving),
  "nutrients": {
    "calories": number,
    "protein": number (grams),
    "carbs": number (grams),
    "fat": number (grams),
    "saturatedFat": number (grams) or null,
    "transFat": number (grams) or null,
    "polyunsaturatedFat": number (grams) or null,
    "monounsaturatedFat": number (grams) or null,
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
All nutrient values should be per serving. Use numbers only, no units in values. If a nutrient is not visible on the label, use null. For servingWeightG, convert oz to grams if needed (1 oz = 28.35g).`,
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
      "estimatedServingSize": "your estimate in natural language (e.g. '2 eggs' or '1 bowl (150g)')",
      "servingWeightG": number (estimated weight in grams of the portion shown),
      "servingUnit": "g",
      "servingUnitAmount": number (same as servingWeightG for photo estimates),
      "nutrients": {
        "calories": number,
        "protein": number (grams),
        "carbs": number (grams),
        "fat": number (grams),
        "saturatedFat": number or null,
        "transFat": number or null,
        "polyunsaturatedFat": number or null,
        "monounsaturatedFat": number or null,
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
