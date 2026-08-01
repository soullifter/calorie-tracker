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
  const existing = lib.findIndex((e) => e.id === exercise.id)
  if (existing >= 0) {
    lib[existing] = { ...lib[existing], ...exercise, lastUsed: Date.now() }
  } else {
    lib.push({ ...exercise, lastUsed: Date.now() })
  }
  set(KEYS.exerciseLibrary, lib)
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
