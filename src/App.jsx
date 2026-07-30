import { useState, useEffect } from 'react'
import { getProfile } from './utils/storage'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'

function App() {
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('loading') // loading | onboarding | dashboard | settings

  useEffect(() => {
    const saved = getProfile()
    if (saved) {
      setProfile(saved)
      setView('dashboard')
    } else {
      setView('onboarding')
    }
  }, [])

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
