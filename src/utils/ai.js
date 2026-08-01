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

const LABEL_PROMPT = `Extract nutrition from this label. Detect if this is a supplement (protein powder, multivitamin, creatine, BCAA, fish oil, pre-workout, etc.) or regular food. Return JSON: {"name":"str","servingSize":"str","servingWeightG":num_or_null,"servingUnit":"g|ml|oz|pieces|serving|scoop|capsule|tablet","servingUnitAmount":num,"isSupplement":bool,"supplementType":"str_or_null (e.g. 'protein','multivitamin','creatine','fish_oil','pre_workout','bcaa')","nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminB6":num_or_null,"vitaminB12":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null,"vitaminE":num_or_null,"zinc":num_or_null,"magnesium":num_or_null,"omega3":num_or_null,"biotin":num_or_null,"folate":num_or_null,"creatine":num_or_null,"caffeine":num_or_null}}. Values per serving, numbers only, null if not shown.`

const FOOD_PHOTO_PROMPT = `Identify each food item or supplement in this photo. If it's a supplement container/bottle/packet, identify it as such. Return JSON: {"items":[{"name":"str","estimatedServingSize":"str","servingWeightG":num,"servingUnit":"g|scoop|capsule|tablet","servingUnitAmount":num,"isSupplement":bool,"supplementType":"str_or_null","nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminB6":num_or_null,"vitaminB12":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null,"vitaminE":num_or_null,"zinc":num_or_null,"magnesium":num_or_null,"omega3":num_or_null,"biotin":num_or_null,"folate":num_or_null,"creatine":num_or_null,"caffeine":num_or_null},"confidence":"low|medium|high"}]}. One entry per item. Numbers only, null if unknown.`

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

const EXERCISE_PHOTO_PROMPT = `Identify the exercise equipment or setup in this photo. The same equipment can be used for many different exercises, so list ALL possible exercises grouped by muscle group. Return JSON:
{"equipment":"str (e.g. 'Flat Bench', 'Cable Machine', 'Treadmill', 'Pull-up Bar')","isCardio":bool,"muscleGroupOptions":[{"group":"str (e.g. 'Chest','Back','Legs','Shoulders','Arms','Core','Full Body','Cardio')","exercises":[{"name":"str","fields":[{"key":"str","label":"str","type":"number|select","unit":"str_or_null","options":["str"]_or_null,"default":num_or_null}]}]}]}
Each exercise must have the SPECIFIC input fields needed to calculate calories:
- Strength: weight(kg), sets, reps
- Cardio: speed(km/h), duration(min), incline(%)
- Bodyweight: sets, reps
List ALL possible exercises for each muscle group — be comprehensive, not minimal. A flat bench alone can do 10+ chest exercises. Only include muscle groups relevant to the equipment.`

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

export async function describeExercise(keys, description, weightKg) {
  const prompt = `The user describes an activity: "${description}". Identify what exercise/activity this is, then return JSON with all possible exercises matching their description, grouped by muscle group:
{"equipment":"str (what they described)","isCardio":bool,"muscleGroupOptions":[{"group":"str","exercises":[{"name":"str","fields":[{"key":"str","label":"str","type":"number|select","unit":"str_or_null","options":["str"]_or_null,"default":num_or_null}]}]}]}
Fields must be the specific inputs needed. For walking/running: include steps and distance(km) fields, duration optional. For sports: include duration. For gym: include weight/sets/reps. Person weighs ${weightKg}kg. Be comprehensive with exercise options.`

  return runWithFallback(TEXT_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt }
    }
    return {
      messages: [{ role: 'user', content: prompt }],
    }
  })
}
