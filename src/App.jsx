import { useState, useEffect, Component } from 'react'
import { getProfile, saveProfile, migrateExercisesToLibrary } from './utils/storage'
import { calculateBMR, calculateBaseline, calculateDailyTargets, calculateDeficit, getDateKey } from './utils/calculations'
import Onboarding from './components/Onboarding'
import Home from './components/Home'
import Dashboard from './components/Dashboard'
import ExercisePage from './components/ExercisePage'
import Settings from './components/Settings'
import { FoodCatalog, ExerciseCatalog } from './components/Catalog'
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
    const targetWeight = parseFloat(p.targetWeightKg)

    const bmr = calculateBMR(p.gender, weight, height, age)
    const deficit = weight > targetWeight
      ? (p.targetDate ? calculateDeficit(weight, targetWeight, p.targetDate) : 500)
      : 0
    const targets = calculateDailyTargets(calculateBaseline(bmr), deficit, weight)

    p.bmr = Math.round(bmr)
    p.deficit = deficit
    p.targets = targets
    changed = true
  }

  // Drop activity-level based TDEE in favor of BMR + flat NEAT buffer + logged exercise
  const expectedTdee = calculateBaseline(p.bmr)
  if ('activityLevel' in p || p.tdee !== expectedTdee) {
    delete p.activityLevel
    p.tdee = expectedTdee
    p.targets = calculateDailyTargets(expectedTdee, p.deficit, parseFloat(p.weightKg))
    changed = true
  }

  if (changed) saveProfile(p)
  return p
}

function App() {
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('home') // home | today | settings
  const [selectedDate, setSelectedDate] = useState(null)
  const [catalog, setCatalog] = useState(null) // 'food' | 'exercise' | null
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

  // Catalog views
  if (catalog === 'food') return <FoodCatalog onClose={() => setCatalog(null)} />
  if (catalog === 'exercise') return <ExerciseCatalog onClose={() => setCatalog(null)} />

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
          onOpenCatalog={setCatalog}
        />
      )}
      <BottomNav active={tab} onChange={setTab} />
    </>
  )
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface-1 flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <p className="text-red-400 text-lg font-semibold">Something went wrong</p>
            <p className="text-gray-500 text-sm">{this.state.error.message}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium">Reload App</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function WrappedApp() {
  return <ErrorBoundary><App /></ErrorBoundary>
}
