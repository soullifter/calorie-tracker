import { useState, useEffect } from 'react'
import { getProfile, saveProfile } from './utils/storage'
import { calculateBMR, calculateTDEE, calculateDailyTargets, calculateDeficit } from './utils/calculations'
import { ACTIVITY_LEVELS } from './utils/constants'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'

// Migrate old profiles that are missing new fields
function migrateProfile(p) {
  if (!p) return null
  let changed = false

  // Add geminiApiKey if missing (old profiles only had groqApiKey)
  if (!('geminiApiKey' in p)) {
    p.geminiApiKey = ''
    changed = true
  }

  // Add gender if missing
  if (!p.gender) {
    p.gender = 'male'
    changed = true
  }

  // Recalculate targets if they seem like old format (missing deficit-based calc)
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
  const [view, setView] = useState('loading')

  useEffect(() => {
    const saved = migrateProfile(getProfile())
    if (saved) {
      setProfile(saved)
      setView('dashboard')
    } else {
      setView('onboarding')
    }
  }, [])

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (view === 'onboarding') {
    return (
      <Onboarding
        onComplete={(p) => {
          setProfile(p)
          setView('dashboard')
        }}
      />
    )
  }

  if (view === 'settings') {
    return (
      <Settings
        profile={profile}
        onUpdate={(p) => setProfile(p)}
        onClose={() => setView('dashboard')}
      />
    )
  }

  return (
    <Dashboard
      profile={profile}
      onOpenSettings={() => setView('settings')}
    />
  )
}

export default App
