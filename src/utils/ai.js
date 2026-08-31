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

// Web-search-capable chain for restaurant menus, real-world lookups
const SEARCH_CHAIN = [
  { provider: 'gemini-search', model: 'gemini-2.0-flash' },
  { provider: 'groq-search', model: 'compound-beta-mini' },
  // Fallback to regular text (will guess based on name, less accurate)
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
]

// --- Timeout wrapper ---
const API_TIMEOUT = 30000
function withTimeout(promise, ms = API_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('Request timed out — try again'), { isRateLimit: true })), ms)),
  ])
}

// --- Gemini ---
async function callGemini(apiKey, model, prompt, imageBase64 = null, images = null) {
  const parts = [{ text: prompt }]
  if (images && images.length > 0) {
    for (const img of images) parts.push({ inline_data: { mime_type: 'image/jpeg', data: img } })
  } else if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })
  }

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  }))

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

// --- Gemini with Google Search grounding ---
async function callGeminiSearch(apiKey, model, prompt) {
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1 },
    }),
  }))

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `Gemini search error: ${res.status}`
    const isRateLimit = res.status === 429 || msg.includes('quota') || msg.includes('rate')
    throw Object.assign(new Error(msg), { isRateLimit })
  }

  const data = await res.json()
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join('')
  return extractJson(text)
}

// --- Groq (compound models with built-in web search) ---
async function callGroqSearch(apiKey, model, messages) {
  const res = await withTimeout(fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 8192,
    }),
  }))

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (err.error?.failed_generation) {
      try { return extractJson(err.error.failed_generation) } catch { /* fall through */ }
    }
    const msg = err.error?.message || `Groq search error: ${res.status}`
    const isRateLimit = res.status === 429 || msg.includes('rate') || msg.includes('limit')
    throw Object.assign(new Error(msg), { isRateLimit })
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  return extractJson(content)
}

// --- Groq ---
async function callGroq(apiKey, model, messages) {
  const allMessages = [
    { role: 'system', content: 'Respond with valid JSON only. No thinking, no explanation, no markdown. Output the JSON object directly.' },
    ...messages,
  ]

  const res = await withTimeout(fetch(GROQ_API_URL, {
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
  }))

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
    const isGemini = provider === 'gemini' || provider === 'gemini-search'
    const apiKey = isGemini ? keys.geminiKey : keys.groqKey
    if (!apiKey) continue

    try {
      const req = buildRequest(provider, model)
      if (provider === 'gemini-search') {
        return await callGeminiSearch(apiKey, model, req.prompt)
      } else if (provider === 'groq-search') {
        return await callGroqSearch(apiKey, model, req.messages)
      } else if (provider === 'gemini') {
        return await callGemini(apiKey, model, req.prompt, req.imageBase64, req.images)
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

export async function describeFood(keys, description) {
  const prompt = `The user describes food they ate: "${description}". Estimate the nutritional content. Return JSON: {"items":[{"name":"str","estimatedServingSize":"str","servingWeightG":num,"servingUnit":"g","servingUnitAmount":num,"isSupplement":false,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"polyunsaturatedFat":num_or_null,"monounsaturatedFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminB6":num_or_null,"vitaminB12":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null,"vitaminE":num_or_null,"zinc":num_or_null,"magnesium":num_or_null,"omega3":num_or_null,"biotin":num_or_null,"folate":num_or_null,"creatine":num_or_null,"caffeine":num_or_null},"confidence":"medium"}]}. Identify each item separately. Be realistic with portions and values.`

  return runWithFallback(TEXT_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt }
    }
    return {
      messages: [{ role: 'user', content: prompt }],
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

export async function suggestWorkoutProgression(keys, exerciseName, isStrength, history) {
  const sessionLines = history.slice(-8).map((h) => {
    if (h.sets && h.sets.length > 0) {
      return `${h.dateKey}: ${h.sets.map((s) => `${s.reps}x${s.weight}kg`).join(', ')}`
    }
    return `${h.dateKey}: ${h.summary || `${h.durationMin || 0} min, ${h.caloriesBurned || 0} cal`}`
  }).join('\n')

  const prompt = `You are an expert strength & conditioning coach applying evidence-based progressive overload methodology (double progression: increase reps to the top of the target rep range before adding weight; linear progression: add a small load increment, typically 2.5-5%, once all sets hit the top of the rep range; autoregulation: hold steady or reduce slightly if the last session showed a drop in reps or weight; deload: suggest a reduced-load session after signs of plateau or regression across multiple sessions).

Exercise: "${exerciseName}" (${isStrength ? 'strength/resistance' : 'cardio/duration-based'})

Recent session history (oldest to newest):
${sessionLines}

Based on this history, apply the appropriate progressive overload method and suggest today's target. Return JSON only:
{"targetWeight": number_or_null, "targetSets": number_or_null, "targetReps": number_or_null, "targetDurationMin": number_or_null, "method": "double progression|linear progression|maintain|deload", "reasoning": "1-2 sentences referencing the specific numbers from the history above"}
Use targetWeight/targetSets/targetReps for strength exercises, targetDurationMin for cardio (set the unused fields to null). Ground the suggestion in the actual numbers shown, not generic advice.`

  return runWithFallback(TEXT_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt }
    }
    return {
      messages: [{ role: 'user', content: prompt }],
    }
  })
}

export async function suggestMeals(keys, { remaining, gaps, foodLibrary, context, filters }) {
  const gapLines = gaps.slice(0, 10).map((g) =>
    `${g.label}: need ${g.remaining}${g.unit} more (${g.pct}% of daily target still missing)`
  ).join('\n')

  const hasContext = !!context
  const isUrl = hasContext && /https?:\/\//.test(context)

  const libraryLines = !hasContext && foodLibrary.length > 0
    ? foodLibrary.slice(0, 25).map((f) =>
        `${f.name}: ${f.calories}cal, P:${f.protein}g, C:${f.carbs}g, F:${f.fat}g per ${f.serving}`
      ).join('\n')
    : ''

  const filterLines = []
  if (filters?.quick) filterLines.push('Must be quick to prepare or order (under 15 minutes)')
  if (filters?.budget) filterLines.push('Must be budget-friendly')
  if (filters?.vegetarian) filterLines.push('Must be vegetarian (no meat, poultry, or fish)')
  if (filters?.highProtein) filterLines.push('Prioritize high-protein options')
  if (filters?.lowCarb) filterLines.push('Prioritize low-carb options')
  const filterSection = filterLines.length > 0 ? `\nCONSTRAINTS:\n${filterLines.join('\n')}\n` : ''

  let contextInstruction
  if (isUrl) {
    contextInstruction = `CONTEXT: The user provided this link: "${context}". This is likely a Google Maps or restaurant page URL. Search the web for this restaurant's menu. Find the actual restaurant name and their real menu items. Suggest specific dishes from their actual menu with realistic portion sizes and nutritional estimates.`
  } else if (hasContext) {
    contextInstruction = `CONTEXT: "${context}".
Interpret this intelligently:
- If it's a restaurant or food place name (e.g. "Chipotle", "Urban Biryanis"), search the web for their actual menu and suggest specific real menu items.
- If it describes a craving (e.g. "pizza", "something sweet", "biryani"), work WITH the craving — suggest the best version of what they want plus sides that fill nutrient gaps. Don't fight the craving, optimize around it.
- If it lists available ingredients (e.g. "chicken, rice, eggs, spinach"), suggest specific recipes using those ingredients with exact quantities to fill gaps.
- If it describes a situation (e.g. "airport", "vending machine", "hotel breakfast buffet"), suggest the best options typically available in that setting.`
  } else {
    contextInstruction = `USER'S FOOD HISTORY:\n${libraryLines || '(no history yet)'}\n\nPrefer suggesting from these familiar foods when possible. You can also suggest other common foods if needed to fill nutrient gaps.`
  }

  const prompt = `You are a sports nutrition coach. The user has already eaten today and needs to cover remaining nutritional gaps with their next meal(s).

REMAINING TARGETS TO HIT:
Calories: ${remaining.calories} kcal
Protein: ${remaining.protein}g | Carbs: ${remaining.carbs}g | Fat: ${remaining.fat}g

BIGGEST NUTRIENT GAPS TO PRIORITIZE:
${gapLines}
${filterSection}
${contextInstruction}

Suggest 2-4 food items with specific quantities that together best cover the remaining calories AND nutrient gaps. Return JSON only:
{"suggestions":[{"name":"str","quantity":"str (e.g. '1 bowl','200g','2 scoops')","servingWeightG":num_or_null,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null,"vitaminB12":num_or_null,"zinc":num_or_null,"magnesium":num_or_null,"omega3":num_or_null},"reasoning":"1 sentence: why this food and which gaps it fills"}],"summary":"1 sentence overall strategy"}`

  const chain = hasContext ? SEARCH_CHAIN : TEXT_CHAIN

  return runWithFallback(chain, keys, (provider) => {
    if (provider === 'gemini' || provider === 'gemini-search') return { prompt }
    return { messages: [{ role: 'user', content: prompt }] }
  })
}

// Multi-image support: menu photos (buffet stations, multi-page menus) or fridge/pantry photos
export async function suggestFromPhotos(keys, images, mode, { remaining, gaps }) {
  const gapLines = gaps.slice(0, 8).map((g) =>
    `${g.label}: need ${g.remaining}${g.unit} more (${g.pct}% of daily target still missing)`
  ).join('\n')

  const modeInstruction = mode === 'fridge'
    ? `The user photographed their fridge, pantry, or available ingredients (${images.length} photo(s)). Identify ALL food items and ingredients visible across all photos. Then suggest 2-4 meals or recipes they can make from these ingredients that best fill their remaining nutrient gaps. Include specific quantities and brief cooking method.`
    : `The user photographed a restaurant, buffet, or cafeteria menu (${images.length} photo(s) — they may have photographed different sections, stations, or pages). Read ALL menu items visible across ALL photos. Then pick 2-4 items that best fill the remaining calorie and nutrient gaps. For each suggestion, estimate realistic nutritional values for a standard portion.`

  const prompt = `You are a sports nutrition coach.

REMAINING TARGETS TO HIT:
Calories: ${remaining.calories} kcal
Protein: ${remaining.protein}g | Carbs: ${remaining.carbs}g | Fat: ${remaining.fat}g

BIGGEST NUTRIENT GAPS TO PRIORITIZE:
${gapLines}

${modeInstruction}

Return JSON only:
{"menuName":"str (restaurant name if visible, or 'Fridge' / 'Menu')","suggestions":[{"name":"str","quantity":"str (e.g. '1 plate','200g','2 eggs + 100g rice')","servingWeightG":num_or_null,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"saturatedFat":num_or_null,"transFat":num_or_null,"fiber":num_or_null,"sugar":num_or_null,"sodium":num_or_null,"cholesterol":num_or_null,"potassium":num_or_null,"calcium":num_or_null,"iron":num_or_null,"vitaminA":num_or_null,"vitaminC":num_or_null,"vitaminD":num_or_null,"vitaminB12":num_or_null,"zinc":num_or_null,"magnesium":num_or_null,"omega3":num_or_null},"reasoning":"1 sentence: why this and which gaps it fills"}],"summary":"1 sentence overall strategy"}`

  return runWithFallback(VISION_CHAIN, keys, (provider) => {
    if (provider === 'gemini') {
      return { prompt, images }
    }
    return {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map((img) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img}` } })),
        ],
      }],
    }
  })
}

// Plan all remaining meals for the day
export async function suggestFullDayPlan(keys, { remaining, gaps, foodLibrary, mealsLeft, filters }) {
  const gapLines = gaps.slice(0, 10).map((g) =>
    `${g.label}: need ${g.remaining}${g.unit} more (${g.pct}% of daily target still missing)`
  ).join('\n')

  const libraryLines = foodLibrary.slice(0, 25).map((f) =>
    `${f.name}: ${f.calories}cal, P:${f.protein}g, C:${f.carbs}g, F:${f.fat}g per ${f.serving}`
  ).join('\n')

  const filterLines = []
  if (filters?.quick) filterLines.push('Meals should be quick to prepare (under 15 minutes each)')
  if (filters?.budget) filterLines.push('Keep it budget-friendly')
  if (filters?.vegetarian) filterLines.push('All meals must be vegetarian')
  if (filters?.highProtein) filterLines.push('Prioritize high-protein in every meal')
  if (filters?.lowCarb) filterLines.push('Keep all meals low-carb')
  const filterSection = filterLines.length > 0 ? `\nCONSTRAINTS:\n${filterLines.join('\n')}\n` : ''

  const prompt = `You are a sports nutrition coach planning the user's remaining meals for today.

REMAINING TARGETS TO DISTRIBUTE ACROSS ALL REMAINING MEALS:
Calories: ${remaining.calories} kcal
Protein: ${remaining.protein}g | Carbs: ${remaining.carbs}g | Fat: ${remaining.fat}g

BIGGEST NUTRIENT GAPS TO PRIORITIZE:
${gapLines}
${filterSection}
MEALS STILL TO PLAN: ${mealsLeft.join(', ')}

USER'S FOOD HISTORY:
${libraryLines || '(no history yet)'}

Distribute the remaining calories and nutrients optimally across ${mealsLeft.length} meal(s). Suggest 1-3 items per meal. Use the user's familiar foods when possible. Return JSON only:
{"meals":{${mealsLeft.map((m) => `"${m}":[{"name":"str","quantity":"str","servingWeightG":num_or_null,"nutrients":{"calories":num,"protein":num,"carbs":num,"fat":num,"fiber":num_or_null,"sodium":num_or_null},"reasoning":"str"}]`).join(',')}},"summary":"1 sentence overall day strategy"}`

  return runWithFallback(TEXT_CHAIN, keys, (provider) => {
    if (provider === 'gemini') return { prompt }
    return { messages: [{ role: 'user', content: prompt }] }
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
