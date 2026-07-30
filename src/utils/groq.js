import { GROQ_VISION_MODEL, GROQ_TEXT_MODEL, GROQ_API_URL } from './constants'

async function callGroq(apiKey, model, messages, jsonMode = true) {
  // Prepend system message to suppress thinking and get direct JSON
  const allMessages = [
    { role: 'system', content: 'Respond with valid JSON only. No thinking, no explanation, no markdown. Output the JSON object directly.' },
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
          text: `Extract nutrition from this label. Return JSON: {"name":"str","servingSize":"str","servingWeightG":num_or_null,"servingUnit":"g|ml|oz|pieces|serving","servingUnitAmount":num,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null}}. Values per serving, numbers only, null if not shown.`,
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
          text: `Identify each food item in this photo. Return JSON: {"items":[{"name":"str","estimatedServingSize":"str","servingWeightG":num,"servingUnit":"g","servingUnitAmount":num,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null},"confidence":"low|medium|high"}]}. One entry per food item. Numbers only, null if unknown.`,
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
