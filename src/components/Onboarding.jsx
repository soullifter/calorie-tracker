import { useState } from 'react'
import { ACTIVITY_LEVELS } from '../utils/constants'
import { calculateBMR, calculateTDEE, calculateDailyTargets } from '../utils/calculations'
import { saveProfile } from '../utils/storage'

const STEP_TITLES = ['About You', 'Your Goals', 'AI Setup']
const STEP_SUBTITLES = [
  'Let\'s personalize your experience',
  'Set your targets and we\'ll calculate the rest',
  'Connect free AI to analyze your food',
]

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
    geminiApiKey: '',
    groqApiKey: '',
  })
  const [error, setError] = useState('')

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const inputClass = 'w-full p-3.5 rounded-xl bg-surface-3 text-white border border-white/5 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/30 placeholder-gray-500 transition'

  const steps = [
    // Step 0: Basic info
    <div key="basic" className="space-y-4 animate-fade-in">
      <input type="text" placeholder="Your name" value={form.name}
        onChange={(e) => update('name', e.target.value)} className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" placeholder="Age" value={form.age}
          onChange={(e) => update('age', e.target.value)} className={inputClass} />
        <div className="flex rounded-xl overflow-hidden border border-white/5">
          {['male', 'female'].map((g) => (
            <button key={g} onClick={() => update('gender', g)}
              className={`flex-1 py-3.5 text-sm font-medium transition capitalize ${
                form.gender === g ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-400'
              }`}
            >{g}</button>
          ))}
        </div>
      </div>
      <input type="number" placeholder="Height (cm)" value={form.heightCm}
        onChange={(e) => update('heightCm', e.target.value)} className={inputClass} />
    </div>,

    // Step 1: Weight & goal
    <div key="weight" className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Current</label>
          <input type="number" placeholder="kg" value={form.weightKg}
            onChange={(e) => update('weightKg', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Target</label>
          <input type="number" placeholder="kg" value={form.targetWeightKg}
            onChange={(e) => update('targetWeightKg', e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Activity Level</p>
        {ACTIVITY_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => update('activityLevel', level.id)}
            className={`w-full p-3.5 rounded-xl text-left border transition ${
              form.activityLevel === level.id
                ? 'border-brand-400 bg-brand-500/10 text-white shadow-[0_0_20px_-5px] shadow-brand-500/20'
                : 'border-white/5 bg-surface-3 text-gray-400 hover:border-white/10'
            }`}
          >
            <span className="font-medium text-sm">{level.label}</span>
            <span className="text-xs text-gray-500 ml-2">{level.desc}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 2: API Keys
    <div key="api" className="space-y-5 animate-fade-in">
      <div className="bg-surface-3 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Google Gemini</p>
            <p className="text-xs text-gray-500">For photo analysis</p>
          </div>
        </div>
        <input type="text" placeholder="Paste your Gemini API key" value={form.geminiApiKey}
          onChange={(e) => update('geminiApiKey', e.target.value)}
          className={`${inputClass} font-mono text-xs`} />
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
          className="text-brand-400 text-xs hover:underline inline-flex items-center gap-1">
          Get free key
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
      </div>

      <div className="bg-surface-3 rounded-xl p-4 space-y-3 opacity-70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Groq <span className="text-xs text-gray-500 font-normal ml-1">optional</span></p>
            <p className="text-xs text-gray-500">Faster text processing</p>
          </div>
        </div>
        <input type="text" placeholder="Paste your Groq API key (optional)" value={form.groqApiKey}
          onChange={(e) => update('groqApiKey', e.target.value)}
          className={`${inputClass} font-mono text-xs`} />
        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
          className="text-brand-400 text-xs hover:underline inline-flex items-center gap-1">
          Get free key
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
      </div>
    </div>,
  ]

  const canNext = () => {
    if (step === 0) return form.name && form.age && form.heightCm
    if (step === 1) return form.weightKg && form.targetWeightKg
    if (step === 2) return form.geminiApiKey
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
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-surface-3">
              <div className={`h-full rounded-full transition-all duration-500 bg-brand-500 ${
                i < step ? 'w-full' : i === step ? 'w-1/2' : 'w-0'
              }`} />
            </div>
          ))}
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{STEP_TITLES[step]}</h1>
          <p className="text-sm text-gray-500 mt-1">{STEP_SUBTITLES[step]}</p>
        </div>

        {steps[step]}

        {error && (
          <p className="text-red-400 text-sm mt-3 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => { setStep(step - 1); setError('') }}
              className="px-6 py-3.5 rounded-xl bg-surface-3 text-gray-300 hover:bg-surface-3/80 transition font-medium"
            >Back</button>
          )}
          <button
            onClick={() => {
              if (!canNext()) { setError('Please fill in all fields'); return }
              setError('')
              if (step < 2) setStep(step + 1)
              else handleFinish()
            }}
            className="flex-1 py-3.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition disabled:opacity-30 shadow-lg shadow-brand-500/20"
            disabled={!canNext()}
          >
            {step < 2 ? 'Continue' : 'Start Tracking'}
          </button>
        </div>
      </div>
    </div>
  )
}
