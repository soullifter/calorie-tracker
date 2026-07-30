import { useState } from 'react'
import { ACTIVITY_LEVELS } from '../utils/constants'
import { calculateBMR, calculateTDEE, calculateDailyTargets } from '../utils/calculations'
import { saveProfile, getWeightLog, addWeightEntry } from '../utils/storage'
import { getDateKey } from '../utils/calculations'

export default function Settings({ profile, onUpdate, onClose }) {
  const [form, setForm] = useState({ ...profile })
  const [weightInput, setWeightInput] = useState('')
  const [saved, setSaved] = useState(false)
  const weightLog = getWeightLog()

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSave = () => {
    const weight = parseFloat(form.weightKg)
    const height = parseFloat(form.heightCm)
    const age = parseInt(form.age)
    const activity = ACTIVITY_LEVELS.find((l) => l.id === form.activityLevel)

    const bmr = calculateBMR(form.gender, weight, height, age)
    const tdee = calculateTDEE(bmr, activity.factor)
    const targets = calculateDailyTargets(tdee, 'lose')

    const updated = { ...form, bmr: Math.round(bmr), tdee, targets }
    saveProfile(updated)
    onUpdate(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogWeight = () => {
    const w = parseFloat(weightInput)
    if (!w) return
    addWeightEntry(getDateKey(), w)
    update('weightKg', w)
    setWeightInput('')
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-6">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={onClose} className="text-gray-400 hover:text-white">&larr; Back</button>
          <h2 className="text-white font-medium">Settings</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 mt-4">
        {/* Profile */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium">Profile</h3>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Name"
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <input type="number" value={form.age} onChange={(e) => update('age', e.target.value)} placeholder="Age"
              className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none" />
            <input type="number" value={form.heightCm} onChange={(e) => update('heightCm', e.target.value)} placeholder="Height cm"
              className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none" />
            <input type="number" value={form.weightKg} onChange={(e) => update('weightKg', e.target.value)} placeholder="Weight kg"
              className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none" />
          </div>
          <input type="number" value={form.targetWeightKg} onChange={(e) => update('targetWeightKg', e.target.value)}
            placeholder="Target weight (kg)"
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none" />

          <select value={form.activityLevel} onChange={(e) => update('activityLevel', e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none">
            {ACTIVITY_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>{l.label} - {l.desc}</option>
            ))}
          </select>
        </div>

        {/* Daily Targets Display */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-2">
          <h3 className="text-white font-medium">Your Daily Targets</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-400">TDEE: <span className="text-white">{form.tdee} cal</span></div>
            <div className="text-gray-400">Target: <span className="text-white">{form.targets?.calories} cal</span></div>
            <div className="text-gray-400">Protein: <span className="text-blue-400">{form.targets?.protein}g</span></div>
            <div className="text-gray-400">Carbs: <span className="text-yellow-400">{form.targets?.carbs}g</span></div>
            <div className="text-gray-400">Fat: <span className="text-orange-400">{form.targets?.fat}g</span></div>
          </div>
        </div>

        {/* Weight Log */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium">Log Weight</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Today's weight (kg)"
              step="0.1"
              className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
            />
            <button
              onClick={handleLogWeight}
              className="px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
            >Log</button>
          </div>
          {weightLog.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {weightLog.slice(-10).reverse().map((e) => (
                <div key={e.date} className="flex justify-between text-sm text-gray-400">
                  <span>{e.date}</span>
                  <span className="text-white">{e.weight} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-medium">Groq API Key</h3>
          <input
            type="text"
            value={form.groqApiKey}
            onChange={(e) => update('groqApiKey', e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none font-mono text-sm"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition"
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>

        {/* Danger zone */}
        <button
          onClick={() => {
            if (confirm('Clear all data? This cannot be undone.')) {
              localStorage.clear()
              window.location.reload()
            }
          }}
          className="w-full py-3 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition text-sm"
        >
          Clear All Data
        </button>
      </div>
    </div>
  )
}
