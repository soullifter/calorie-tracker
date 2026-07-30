import { useState } from 'react'
import { ACTIVITY_LEVELS } from '../utils/constants'
import { calculateBMR, calculateTDEE, calculateDailyTargets } from '../utils/calculations'
import { saveProfile } from '../utils/storage'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    activityLevel: 'sedentary',
    groqApiKey: '',
  })
  const [error, setError] = useState('')

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const steps = [
    // Step 0: Basic info
    <div key="basic" className="space-y-4">
      <h2 className="text-xl font-semibold text-white">About You</h2>
      <input
        type="text"
        placeholder="Your name"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={(e) => update('age', e.target.value)}
          className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={form.gender}
          onChange={(e) => update('gender', e.target.value)}
          className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
      <input
        type="number"
        placeholder="Height (cm)"
        value={form.heightCm}
        onChange={(e) => update('heightCm', e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
    </div>,

    // Step 1: Weight & goal
    <div key="weight" className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Your Goals</h2>
      <input
        type="number"
        placeholder="Current weight (kg)"
        value={form.weightKg}
        onChange={(e) => update('weightKg', e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="number"
        placeholder="Target weight (kg)"
        value={form.targetWeightKg}
        onChange={(e) => update('targetWeightKg', e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <div className="space-y-2">
        <p className="text-sm text-gray-400">Activity Level</p>
        {ACTIVITY_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => update('activityLevel', level.id)}
            className={`w-full p-3 rounded-lg text-left border transition ${
              form.activityLevel === level.id
                ? 'border-blue-500 bg-blue-500/10 text-white'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
            }`}
          >
            <span className="font-medium">{level.label}</span>
            <span className="text-sm text-gray-400 ml-2">{level.desc}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 2: API Key
    <div key="api" className="space-y-4">
      <h2 className="text-xl font-semibold text-white">AI Setup</h2>
      <p className="text-sm text-gray-400">
        We use Groq AI to analyze food photos and nutrition labels. It's free.
      </p>
      <input
        type="text"
        placeholder="Groq API Key"
        value={form.groqApiKey}
        onChange={(e) => update('groqApiKey', e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none font-mono text-sm"
      />
      <a
        href="https://console.groq.com/keys"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 text-sm hover:underline inline-block"
      >
        Get a free API key from Groq
      </a>
    </div>,
  ]

  const canNext = () => {
    if (step === 0) return form.name && form.age && form.heightCm
    if (step === 1) return form.weightKg && form.targetWeightKg
    if (step === 2) return form.groqApiKey
    return false
  }

  const handleFinish = () => {
    const weight = parseFloat(form.weightKg)
    const height = parseFloat(form.heightCm)
    const age = parseInt(form.age)
    const activity = ACTIVITY_LEVELS.find((l) => l.id === form.activityLevel)

    const bmr = calculateBMR(form.gender, weight, height, age)
    const tdee = calculateTDEE(bmr, activity.factor)
    const targets = calculateDailyTargets(tdee, 'lose')

    const profile = {
      ...form,
      age,
      heightCm: height,
      weightKg: weight,
      targetWeightKg: parseFloat(form.targetWeightKg),
      bmr: Math.round(bmr),
      tdee,
      targets,
      createdAt: Date.now(),
    }

    saveProfile(profile)
    onComplete(profile)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-blue-500' : i < step ? 'w-2 bg-blue-500' : 'w-2 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {steps[step]}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              onClick={() => { setStep(step - 1); setError('') }}
              className="px-6 py-3 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (!canNext()) {
                setError('Please fill in all fields')
                return
              }
              setError('')
              if (step < 2) setStep(step + 1)
              else handleFinish()
            }}
            className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition disabled:opacity-50"
            disabled={!canNext()}
          >
            {step < 2 ? 'Next' : 'Start Tracking'}
          </button>
        </div>
      </div>
    </div>
  )
}
