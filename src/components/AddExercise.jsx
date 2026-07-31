import { useState, useRef } from 'react'
import { identifyExercise, calculateExerciseCalories, estimateExerciseCalories } from '../utils/ai'

const QUICK_EXERCISES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Jump Rope',
  'Yoga', 'HIIT', 'Stretching', 'Stair Climbing', 'Elliptical',
]

function DynamicFields({ fields, values, onChange }) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-xs text-gray-400 mb-1 block">
            {field.label}{field.unit ? ` (${field.unit})` : ''}
          </label>
          {field.type === 'select' && field.options ? (
            <select
              value={values[field.key] || field.options[0]}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              inputMode="decimal"
              value={values[field.key] ?? field.default ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.default != null ? String(field.default) : ''}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function AddExercise({ keys, weightKg, heightCm, onAdd, onClose }) {
  const [mode, setMode] = useState('choose') // choose | photo-result | quick | calculating
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [identified, setIdentified] = useState(null) // AI-identified exercise
  const [fieldValues, setFieldValues] = useState({})
  const [quickExercise, setQuickExercise] = useState('')
  const [quickDuration, setQuickDuration] = useState('30')
  const fileRef = useRef(null)

  const compressImage = (file, maxDim = 768, quality = 0.6) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const base64 = await compressImage(file)
      const result = await identifyExercise(keys, base64)
      setIdentified(result)
      // Pre-fill defaults
      const defaults = {}
      ;(result.fields || []).forEach((f) => {
        if (f.default != null) defaults[f.key] = f.default
        if (f.type === 'select' && f.options?.length) defaults[f.key] = f.options[0]
      })
      setFieldValues(defaults)
      setMode('photo-result')
    } catch (err) {
      setError(err.message || 'Failed to identify exercise')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleCalculate = async () => {
    if (!identified) return
    // Validate all fields have values
    const missingField = (identified.fields || []).find((f) => {
      const val = fieldValues[f.key]
      return val === undefined || val === ''
    })
    if (missingField) {
      setError(`Please fill in: ${missingField.label}`)
      return
    }

    setLoading(true)
    setError('')
    try {
      const params = {}
      ;(identified.fields || []).forEach((f) => {
        const val = fieldValues[f.key]
        params[f.key] = f.type === 'number' ? parseFloat(val) || 0 : val
      })

      const result = await calculateExerciseCalories(keys, {
        name: identified.name,
        type: identified.type,
        params,
      }, weightKg, heightCm)

      onAdd({
        id: `ex_${Date.now()}`,
        exercise: identified.name,
        type: identified.type,
        muscleGroups: identified.muscleGroups || [],
        params,
        summary: result.summary || '',
        durationMin: params.duration || params.sets ? Math.round((params.sets || 1) * (params.reps || 10) * 0.1) : 0,
        caloriesBurned: result.caloriesBurned || 0,
        intensity: result.intensity || 'moderate',
        loggedAt: Date.now(),
      })
    } catch (err) {
      setError(err.message || 'Failed to calculate calories')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSubmit = async () => {
    if (!quickExercise.trim()) return
    setLoading(true)
    setError('')
    try {
      const dur = parseInt(quickDuration) || 30
      const result = await estimateExerciseCalories(keys, quickExercise, dur, weightKg)
      onAdd({
        id: `ex_${Date.now()}`,
        exercise: result.exercise || quickExercise,
        type: 'cardio',
        muscleGroups: [],
        params: { duration: dur },
        summary: `${dur} min`,
        durationMin: dur,
        caloriesBurned: result.caloriesBurned || 0,
        intensity: result.intensity || 'moderate',
        loggedAt: Date.now(),
      })
    } catch (err) {
      setError(err.message || 'Failed to estimate calories')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (key, value) => {
    setFieldValues((v) => ({ ...v, [key]: value }))
  }

  // Photo result — show identified exercise + dynamic fields
  if (mode === 'photo-result' && identified) {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>

        {/* Identified exercise */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-white font-semibold">{identified.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              identified.type === 'strength' ? 'bg-blue-500/15 text-blue-400' :
              identified.type === 'cardio' ? 'bg-emerald-500/15 text-emerald-400' :
              identified.type === 'bodyweight' ? 'bg-amber-500/15 text-amber-400' :
              'bg-purple-500/15 text-purple-400'
            }`}>
              {identified.type}
            </span>
            {(identified.muscleGroups || []).slice(0, 3).map((mg) => (
              <span key={mg} className="text-xs text-gray-500">{mg}</span>
            ))}
          </div>
        </div>

        {/* Dynamic fields */}
        <DynamicFields
          fields={identified.fields || []}
          values={fieldValues}
          onChange={updateField}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Calculate & Log'}
        </button>
      </div>
    )
  }

  // Quick exercise mode (text-based)
  if (mode === 'quick') {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>

        <div className="flex flex-wrap gap-2">
          {QUICK_EXERCISES.map((ex) => (
            <button key={ex} onClick={() => setQuickExercise(ex)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                quickExercise === ex ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >{ex}</button>
          ))}
        </div>

        <input type="text" placeholder="Or type exercise name..." value={quickExercise}
          onChange={(e) => setQuickExercise(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none" />

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Duration (minutes)</label>
          <input type="text" inputMode="numeric" value={quickDuration}
            onChange={(e) => setQuickDuration(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none" />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={handleQuickSubmit} disabled={!quickExercise.trim() || loading}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50">
          {loading ? 'Estimating...' : 'Log Exercise'}
        </button>
      </div>
    )
  }

  // Choose mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Log Exercise</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 max-h-32 overflow-y-auto">
          <p className="text-red-400 text-sm whitespace-pre-wrap break-all">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 mt-3 text-sm">Identifying exercise...</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            onClick={() => fileRef.current.click()}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-emerald-500 text-left transition"
          >
            <p className="text-white font-medium">Snap Equipment Photo</p>
            <p className="text-xs text-gray-400 mt-1">AI identifies the machine and asks the right questions</p>
          </button>

          <button
            onClick={() => setMode('quick')}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 text-left transition"
          >
            <p className="text-white font-medium">Quick Log</p>
            <p className="text-xs text-gray-400 mt-1">Type exercise name and duration for a quick estimate</p>
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
    </div>
  )
}
