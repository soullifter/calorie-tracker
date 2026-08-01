import { useState, useEffect } from 'react'
import { getProfile, saveProfile, migrateExercisesToLibrary } from './utils/storage'
import { calculateBMR, calculateTDEE, calculateDailyTargets, calculateDeficit, getDateKey } from './utils/calculations'
import { ACTIVITY_LEVELS } from './utils/constants'
import Onboarding from './components/Onboarding'
import Home from './components/Home'
import Dashboard from './components/Dashboard'
import ExercisePage from './components/ExercisePage'
import Settings from './components/Settings'
import BottomNav from './components/BottomNav'

// Migrate old profiles that are missing new fields
function migrateProfile(p) {
  if (!p) return null
  let changed = false

  if (!('geminiApiKey' in p)) {
    p.geminiApiKey = ''
    changed = true
  }

  if (!p.gender) {
    p.gender = 'male'
    changed = true
  }

  if (!('deficit' in p)) {
    const weight = parseFloat(p.weightKg)
    const height = parseFloat(p.heightCm)
    const age = parseInt(p.age)
    const activity = ACTIVITY_LEVELS.find((l) => l.id === p.activityLevel) || ACTIVITY_LEVELS[0]
    const targetWeight = parseFloat(p.targetWeightKg)

    const bmr = calculateBMR(p.gender, weight, height, age)
    const tdee = calculateTDEE(bmr, activity.factor)
    const deficit = weight > targetWeight
      ? (p.targetDate ? calculateDeficit(weight, targetWeight, p.targetDate) : 500)
      : 0
    const targets = calculateDailyTargets(tdee, deficit, weight)

    p.bmr = Math.round(bmr)
    p.tdee = tdee
    p.deficit = deficit
    p.targets = targets
    changed = true
  }

  if (changed) saveProfile(p)
  return p
}

function App() {
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('home') // home | today | settings
  const [selectedDate, setSelectedDate] = useState(null) // date key for day view from calendar
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = migrateProfile(getProfile())
    if (saved) setProfile(saved)
    migrateExercisesToLibrary()
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <Onboarding
        onComplete={(p) => {
          setProfile(p)
          setTab('home')
        }}
      />
    )
  }

  // Day view from calendar selection
  if (selectedDate) {
    return (
      <Dashboard
        profile={profile}
        initialDate={selectedDate}
        onBack={() => setSelectedDate(null)}
        showBackButton
      />
    )
  }

  return (
    <>
      {tab === 'home' && (
        <Home
          profile={profile}
          onSelectDay={(dateKey) => setSelectedDate(dateKey)}
          onGoToday={() => setTab('food')}
        />
      )}
      {tab === 'food' && (
        <Dashboard
          profile={profile}
          onOpenSettings={() => setTab('settings')}
        />
      )}
      {tab === 'exercise' && (
        <ExercisePage profile={profile} />
      )}
      {tab === 'settings' && (
        <Settings
          profile={profile}
          onUpdate={(p) => setProfile(p)}
          onClose={() => setTab('home')}
        />
      )}
      <BottomNav active={tab} onChange={setTab} />
    </>
  )
}

export default App
