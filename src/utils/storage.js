const KEYS = {
  profile: 'ct_profile',
  foodLibrary: 'ct_food_library',
  exerciseLibrary: 'ct_exercise_library',
  dailyLogs: 'ct_daily_logs',
  weightLog: 'ct_weight_log',
}

function get(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Profile
export function getProfile() {
  return get(KEYS.profile)
}
export function saveProfile(profile) {
  set(KEYS.profile, profile)
}

// Food Library
export function getFoodLibrary() {
  return get(KEYS.foodLibrary) || []
}
export function saveFoodToLibrary(food) {
  const lib = getFoodLibrary()
  const existing = lib.findIndex((f) => f.id === food.id)
  if (existing >= 0) {
    lib[existing] = { ...lib[existing], ...food, lastUsed: Date.now() }
  } else {
    lib.push({ ...food, lastUsed: Date.now() })
  }
  set(KEYS.foodLibrary, lib)
}
export function removeFoodFromLibrary(foodId) {
  const lib = getFoodLibrary().filter((f) => f.id !== foodId)
  set(KEYS.foodLibrary, lib)
}

// Exercise Library
export function getExerciseLibrary() {
  return get(KEYS.exerciseLibrary) || []
}
export function saveExerciseToLibrary(exercise) {
  const lib = getExerciseLibrary()
  // Match by name (case-insensitive) to avoid duplicates
  const nameKey = (exercise.name || '').toLowerCase().trim()
  const existing = lib.findIndex((e) => (e.name || '').toLowerCase().trim() === nameKey)
  if (existing >= 0) {
    // Merge: update with latest data but keep the original id
    lib[existing] = { ...lib[existing], ...exercise, id: lib[existing].id, lastUsed: Date.now() }
  } else {
    lib.push({ ...exercise, id: exercise.id || `exlib_${Date.now()}`, lastUsed: Date.now() })
  }
  set(KEYS.exerciseLibrary, lib)
}

// Migrate all exercises from daily logs into the library
export function migrateExercisesToLibrary() {
  const logs = get(KEYS.dailyLogs) || {}
  const lib = getExerciseLibrary()
  const existingNames = new Set(lib.map((e) => (e.name || '').toLowerCase().trim()))
  let added = 0

  for (const dayLog of Object.values(logs)) {
    for (const ex of (dayLog.exercises || [])) {
      const nameKey = (ex.exercise || '').toLowerCase().trim()
      if (!nameKey || existingNames.has(nameKey)) continue
      existingNames.add(nameKey)
      lib.push({
        id: `exlib_${nameKey.replace(/\s+/g, '_')}`,
        name: ex.exercise,
        equipment: ex.equipment || null,
        type: ex.type || 'cardio',
        muscleGroups: ex.muscleGroups || [],
        fields: ex.fields || [],
        defaultParams: ex.params || {},
        lastUsed: ex.loggedAt || Date.now(),
      })
      added++
    }
  }

  if (added > 0) set(KEYS.exerciseLibrary, lib)
  return added
}
export function removeExerciseFromLibrary(exerciseId) {
  const lib = getExerciseLibrary().filter((e) => e.id !== exerciseId)
  set(KEYS.exerciseLibrary, lib)
}
export function updateFoodInLibrary(foodId, updates) {
  const lib = getFoodLibrary()
  const idx = lib.findIndex((f) => f.id === foodId)
  if (idx >= 0) { lib[idx] = { ...lib[idx], ...updates }; set(KEYS.foodLibrary, lib) }
}
export function updateExerciseInLibrary(exerciseId, updates) {
  const lib = getExerciseLibrary()
  const idx = lib.findIndex((e) => e.id === exerciseId)
  if (idx >= 0) { lib[idx] = { ...lib[idx], ...updates }; set(KEYS.exerciseLibrary, lib) }
}

// Daily Logs
export function getDayLog(dateKey) {
  const logs = get(KEYS.dailyLogs) || {}
  return logs[dateKey] || { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, exercises: [] }
}
export function saveDayLog(dateKey, dayLog) {
  const logs = get(KEYS.dailyLogs) || {}
  logs[dateKey] = dayLog
  set(KEYS.dailyLogs, logs)
}

// Weight Log
export function getWeightLog() {
  return get(KEYS.weightLog) || []
}
export function addWeightEntry(dateKey, weight) {
  const log = getWeightLog()
  const existing = log.findIndex((e) => e.date === dateKey)
  if (existing >= 0) {
    log[existing].weight = weight
  } else {
    log.push({ date: dateKey, weight })
  }
  log.sort((a, b) => a.date.localeCompare(b.date))
  set(KEYS.weightLog, log)
}
