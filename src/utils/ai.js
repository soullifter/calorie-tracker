// Multi-provider AI layer with automatic fallback
// Vision: Gemini Flash Lite → Gemini Flash Lite 3.1 → Groq qwen
// Text: Groq llama → Gemini Flash Lite

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const VISION_CHAIN = [
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
  { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
  { provider: 'groq', model: 'qwen/qwen3.6-27b' },
]

const TEXT_CHAIN = [
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
]

// --- Gemini ---
async function callGemini(apiKey, model, prompt, imageBase64 = null) {
  const parts = [{ text: prompt }]
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })
  }

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `Gemini error: ${res.status}`
    const isRateLimit = res.status === 429 || msg.includes('quota') || msg.includes('rate')
    throw Object.assign(new Error(msg), { isRateLimit })
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return extractJson(text)
}

// --- Groq ---
async function callGroq(apiKey, model, messages) {
  const allMessages = [
    { role: 'system', content: 'Respond with valid JSON only. No thinking, no explanation, no markdown. Output the JSON object directly.' },
    ...messages,
  ]

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: allMessages,
      temperature: 0.1,
      max_tokens: 8192,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (err.error?.failed_generation) {
      try { return extractJson(err.error.failed_generation) } catch { /* fall through */ }
    }
    const msg = err.error?.message || `Groq error: ${res.status}`
    const isRateLimit = res.status === 429 || msg.includes('rate') || msg.includes('limit') || msg.includes('too large')
    throw Object.assign(new Error(msg), { isRateLimit })
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  return extractJson(content)
}

// --- JSON extraction ---
function extractJson(text) {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      throw new Error(`JSON parse error: ${e.message}\n\nExtracted: ${jsonMatch[0].slice(0, 300)}`)
    }
  }
  const preview = cleaned.slice(0, 500) || text.slice(0, 500) || '(empty response)'
  throw new Error(`Could not find JSON in AI response.\n\nResponse preview: ${preview}`)
}

// --- Fallback runner ---
async function runWithFallback(chain, keys, buildRequest) {
  const errors = []

  for (const { provider, model } of chain) {
    const apiKey = provider === 'gemini' ? keys.geminiKey : keys.groqKey
    if (!apiKey) continue

    try {
      const req = buildRequest(provider, model)
      if (provider === 'gemini') {
        return await callGemini(apiKey, model, req.prompt, req.imageBase64)
      } else {
        return await callGroq(apiKey, model, req.messages)
      }
    } catch (err) {
      errors.push(`${model}: ${err.message}`)
      if (err.isRateLimit) continue // try next model
      // Non-rate-limit error on first model — still try fallbacks
      continue
    }
  }

  throw new Error(`All models failed:\n\n${errors.join('\n\n')}`)
}

// --- Public API ---

const LABEL_PROMPT = `Extract nutrition from this label. Return JSON: {"name":"str","servingSize":"str","servingWeightG":num_or_null,"servingUnit":"g|ml|oz|pieces|serving","servingUnitAmount":num,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null}}. Values per serving, numbers only, null if not shown.`

const FOOD_PHOTO_PROMPT = `Identify each food item in this photo. Return JSON: {"items":[{"name":"str","estimatedServingSize":"str","servingWeightG":num,"servingUnit":"g","servingUnitAmount":num,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null},"confidence":"low|medium|high"}]}. One entry per food item. Numbers only, null if unknown.`

export async function analyzeNutritionLabel(keys, imageBase64) {
  return runWithFallback(VISION_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt: LABEL_PROMPT, imageBase64 }
    }
    return {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: LABEL_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
    }
  })
}

export async function analyzeFoodPhoto(keys, imageBase64) {
  return runWithFallback(VISION_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt: FOOD_PHOTO_PROMPT, imageBase64 }
    }
    return {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: FOOD_PHOTO_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
    }
  })
}

export async function estimateExerciseCalories(keys, exercise, durationMin, weightKg) {
  const prompt = `Estimate calories burned. Return JSON: {"exercise":"${exercise}","durationMin":${durationMin},"caloriesBurned":number,"intensity":"low|moderate|high"}. Person: ${weightKg}kg, ${durationMin} min of ${exercise}. Be realistic.`

  return runWithFallback(TEXT_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt }
    }
    return {
      messages: [{ role: 'user', content: prompt }],
    }
  })
}

const EXERCISE_PHOTO_PROMPT = `Identify the exercise equipment, machine, or activity in this photo. Return JSON:
{"name":"str (e.g. 'Lat Pulldown Machine', 'Treadmill', 'Barbell Bench Press', 'Yoga Mat')","type":"strength|cardio|bodyweight|flexibility|sport","muscleGroups":["str"],"fields":[{"key":"str","label":"str","type":"number|select","unit":"str_or_null","options":["str"]_or_null,"default":num_or_null}]}
The "fields" array must contain the SPECIFIC inputs needed to calculate calories for THIS exercise. Examples:
- Weight machine: [{"key":"weight","label":"Weight","type":"number","unit":"kg"},{"key":"sets","label":"Sets","type":"number"},{"key":"reps","label":"Reps per set","type":"number"}]
- Treadmill: [{"key":"speed","label":"Speed","type":"number","unit":"km/h"},{"key":"duration","label":"Duration","type":"number","unit":"min"},{"key":"incline","label":"Incline","type":"number","unit":"%","default":0}]
- Swimming: [{"key":"duration","label":"Duration","type":"number","unit":"min"},{"key":"stroke","label":"Stroke","type":"select","options":["freestyle","backstroke","breaststroke","butterfly"]}]
- Bodyweight: [{"key":"sets","label":"Sets","type":"number"},{"key":"reps","label":"Reps per set","type":"number"}]
Always include a duration or sets/reps field. Be specific to the identified exercise.`

export async function identifyExercise(keys, imageBase64) {
  return runWithFallback(VISION_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt: EXERCISE_PHOTO_PROMPT, imageBase64 }
    }
    return {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: EXERCISE_PHOTO_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
    }
  })
}

export async function calculateExerciseCalories(keys, exerciseData, userWeightKg, userHeightCm) {
  const params = Object.entries(exerciseData.params).map(([k, v]) => `${k}: ${v}`).join(', ')
  const prompt = `Calculate calories burned. Return JSON: {"caloriesBurned":number,"intensity":"low|moderate|high","summary":"str (brief description like '3x12 @ 50kg' or '20 min @ 8km/h')"}. Exercise: ${exerciseData.name} (${exerciseData.type}). Parameters: ${params}. Person: ${userWeightKg}kg, ${userHeightCm}cm. Use MET values and exercise science. Be realistic and accurate.`

  return runWithFallback(TEXT_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt }
    }
    return {
      messages: [{ role: 'user', content: prompt }],
    }
  })
}
