import { useState, useRef } from 'react'
import { identifyExercise, calculateExerciseCalories, estimateExerciseCalories } from '../utils/ai'

const QUICK_EXERCISES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Jump Rope',
  'Yoga', 'HIIT', 'Stretching', 'Stair Climbing', 'Elliptical',
]


function DynamicFields({ fields, values, onChange, weightDisplayValues }) {
  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const isWeight = field.unit === 'kg' || field.key === 'weight'

        if (isWeight) {
          return <WeightField key={field.key} field={field} value={values[field.key]} displayValue={weightDisplayValues?.[field.key]} onChange={onChange} />
        }

        return (
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
        )
      })}
    </div>
  )
}

function WeightField({ field, value, displayValue, onChange }) {
  const [unit, setUnit] = useState('kg')

  const handleInput = (raw) => {
    if (unit === 'lbs') {
      const lbs = parseFloat(raw)
      const kgVal = !isNaN(lbs) ? String(Math.round(lbs * 0.453592 * 10) / 10) : ''
      onChange(field.key, kgVal, raw)
    } else {
      onChange(field.key, raw)
    }
  }

  const toggleUnit = () => {
    const currentDisplay = unit === 'lbs' ? displayValue : value
    const num = parseFloat(currentDisplay)
    if (unit === 'kg') {
      setUnit('lbs')
      if (!isNaN(num)) {
        const lbs = String(Math.round(num * 2.20462))
        onChange(field.key, value, lbs)
      }
    } else {
      setUnit('kg')
      // value is already in kg
    }
  }

  const shown = unit === 'lbs' ? (displayValue || '') : (value ?? field.default ?? '')

  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{field.label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={field.default != null ? String(field.default) : ''}
          className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={toggleUnit}
          className="px-4 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-600 transition shrink-0"
        >
          {unit}
        </button>
      </div>
    </div>
  )
}

export default function AddExercise({ keys, weightKg, heightCm, onAdd, onClose }) {
  // Steps: choose → (photo: pick-group → pick-exercise → fill-fields) or (quick)
  const [step, setStep] = useState('choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Photo flow state
  const [equipment, setEquipment] = useState(null) // AI result
  const [selectedGroup, setSelectedGroup] = useState(null) // muscle group object
  const [selectedExercise, setSelectedExercise] = useState(null) // exercise object
  const [fieldValues, setFieldValues] = useState({})
  const [weightDisplayValues, setWeightDisplayValues] = useState({}) // lbs display values

  // Quick flow state
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

  const reset = () => {
    setStep('choose')
    setEquipment(null)
    setSelectedGroup(null)
    setSelectedExercise(null)
    setFieldValues({})
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const base64 = await compressImage(file)
      const result = await identifyExercise(keys, base64)
      setEquipment(result)

      // If cardio equipment with only one group, skip group selection
      if (result.isCardio && result.muscleGroupOptions?.length === 1) {
        const group = result.muscleGroupOptions[0]
        setSelectedGroup(group)
        if (group.exercises?.length === 1) {
          selectExercise(group.exercises[0])
          setStep('fill-fields')
        } else {
          setStep('pick-exercise')
        }
      } else {
        setStep('pick-group')
      }
    } catch (err) {
      setError(err.message || 'Failed to identify equipment')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const selectExercise = (exercise) => {
    setSelectedExercise(exercise)
    const defaults = {}
    ;(exercise.fields || []).forEach((f) => {
      if (f.default != null) defaults[f.key] = f.default
      if (f.type === 'select' && f.options?.length) defaults[f.key] = f.options[0]
    })
    setFieldValues(defaults)
  }

  const handleGroupSelect = (group) => {
    setSelectedGroup(group)
    if (group.exercises?.length === 1) {
      selectExercise(group.exercises[0])
      setStep('fill-fields')
    } else {
      setStep('pick-exercise')
    }
  }

  const handleExerciseSelect = (exercise) => {
    selectExercise(exercise)
    setStep('fill-fields')
  }

  const handleCalculate = async () => {
    const missingField = (selectedExercise.fields || []).find((f) => {
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
      ;(selectedExercise.fields || []).forEach((f) => {
        const val = fieldValues[f.key]
        params[f.key] = f.type === 'number' ? parseFloat(val) || 0 : val
      })

      const result = await calculateExerciseCalories(keys, {
        name: selectedExercise.name,
        type: selectedGroup?.group || 'strength',
        params,
      }, weightKg, heightCm)

      onAdd({
        id: `ex_${Date.now()}`,
        exercise: selectedExercise.name,
        equipment: equipment?.equipment,
        type: selectedGroup?.group?.toLowerCase() || 'strength',
        muscleGroups: [selectedGroup?.group].filter(Boolean),
        params,
        summary: result.summary || '',
        durationMin: params.duration || (params.sets ? Math.round((params.sets || 1) * (params.reps || 10) * 0.1) : 0),
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

  const updateField = (key, value, lbsDisplay) => {
    setFieldValues((v) => ({ ...v, [key]: value }))
    if (lbsDisplay !== undefined) {
      setWeightDisplayValues((v) => ({ ...v, [key]: lbsDisplay }))
    }
  }

  const BackButton = ({ to }) => (
    <button onClick={() => to ? setStep(to) : reset()} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-3">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
      Back
    </button>
  )

  const EquipmentBadge = () => equipment && (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
      <p className="text-emerald-400 text-sm font-medium">{equipment.equipment}</p>
    </div>
  )

  // Step: Pick muscle group
  if (step === 'pick-group' && equipment) {
    return (
      <div className="space-y-3">
        <BackButton />
        <EquipmentBadge />
        <p className="text-sm text-gray-400">What are you targeting?</p>
        <div className="grid grid-cols-2 gap-2">
          {(equipment.muscleGroupOptions || []).map((group) => (
            <button
              key={group.group}
              onClick={() => handleGroupSelect(group)}
              className="p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500/50 text-left transition"
            >
              <p className="text-white text-sm font-medium">{group.group}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {(group.exercises || []).map((e) => e.name).join(', ')}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step: Pick exercise
  if (step === 'pick-exercise' && selectedGroup) {
    return (
      <div className="space-y-3">
        <BackButton to="pick-group" />
        <EquipmentBadge />
        <p className="text-sm text-gray-400">{selectedGroup.group} exercises:</p>
        <div className="space-y-2">
          {(selectedGroup.exercises || []).map((exercise) => (
            <button
              key={exercise.name}
              onClick={() => handleExerciseSelect(exercise)}
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500/50 text-left transition"
            >
              <p className="text-white text-sm font-medium">{exercise.name}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step: Fill fields
  if (step === 'fill-fields' && selectedExercise) {
    return (
      <div className="space-y-4">
        <BackButton to={selectedGroup?.exercises?.length > 1 ? 'pick-exercise' : 'pick-group'} />
        <EquipmentBadge />
        <div className="bg-surface-3 rounded-xl px-4 py-3">
          <p className="text-white font-semibold text-sm">{selectedExercise.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{selectedGroup?.group}</p>
        </div>

        <DynamicFields
          fields={selectedExercise.fields || []}
          values={fieldValues}
          onChange={updateField}
          weightDisplayValues={weightDisplayValues}
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

  // Quick exercise mode
  if (step === 'quick') {
    return (
      <div className="space-y-4">
        <BackButton />
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

  // Choose mode (default)
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
          <p className="text-gray-400 mt-3 text-sm">Identifying equipment...</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            onClick={() => fileRef.current.click()}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-emerald-500 text-left transition"
          >
            <p className="text-white font-medium">Snap Equipment Photo</p>
            <p className="text-xs text-gray-400 mt-1">AI identifies the machine and suggests exercises</p>
          </button>

          <button
            onClick={() => setStep('quick')}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 text-left transition"
          >
            <p className="text-white font-medium">Quick Log</p>
            <p className="text-xs text-gray-400 mt-1">Type exercise name and duration</p>
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
    </div>
  )
}
