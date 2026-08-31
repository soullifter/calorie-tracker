import { useState, useRef } from 'react'
import { identifyExercise, calculateExerciseCalories, estimateExerciseCalories, describeExercise, suggestWorkoutProgression } from '../utils/ai'
import { getExerciseLibrary, saveExerciseToLibrary, getExerciseHistory } from '../utils/storage'
import { ExerciseDetail } from './ExerciseTrends'

function LastWorkoutPreview({ exerciseName, onViewHistory }) {
  const history = getExerciseHistory(exerciseName)
  if (history.length === 0) return null
  const last = history[history.length - 1]
  const daysAgo = Math.max(0, Math.round((Date.now() - new Date(last.dateKey + 'T12:00:00').getTime()) / 86400000))
  const when = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`

  return (
    <div className="bg-surface-3 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last workout · {when}</p>
        <button onClick={onViewHistory} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          Full history
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>
        </button>
      </div>
      {last.sets && last.sets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {last.sets.map((s, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-300">{s.reps}x{s.weight}kg</span>
          ))}
        </div>
      ) : last.summary ? (
        <p className="text-sm text-gray-300">{last.summary}</p>
      ) : (
        <p className="text-sm text-gray-300">{last.caloriesBurned} cal burned</p>
      )}
    </div>
  )
}

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
  const [quickSteps, setQuickSteps] = useState('')

  // Multi-set state
  const [multiSets, setMultiSets] = useState([]) // [{weight, reps}, ...]

  // Describe flow state
  const [describeText, setDescribeText] = useState('')

  // History flow state
  const [historySearch, setHistorySearch] = useState('')
  const [viewingHistoryFor, setViewingHistoryFor] = useState(null)

  // AI progression suggestion state
  const [suggestion, setSuggestion] = useState(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')

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
    setMultiSets([])
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
    const isStrength = (selectedExercise.fields || []).some((f) => f.key === 'weight' || f.key === 'sets' || f.key === 'reps')

    // For strength with multi-sets, validate we have at least one set OR field values
    let setsToUse = multiSets
    if (isStrength && multiSets.length === 0) {
      const w = fieldValues.weight
      const r = fieldValues.reps
      if (!w || !r) {
        setError('Enter weight and reps, or add sets first')
        return
      }
      setsToUse = [{ weight: w, reps: r }]
      setMultiSets(setsToUse)
    }

    // For non-strength, validate required fields
    if (!isStrength) {
      const missingField = (selectedExercise.fields || []).find((f) => {
        const val = fieldValues[f.key]
        return val === undefined || val === ''
      })
      if (missingField) {
        setError(`Please fill in: ${missingField.label}`)
        return
      }
    }

    setLoading(true)
    setError('')
    try {
      let params = {}
      let summary = ''

      if (isStrength && setsToUse.length > 0) {
        // Build params from multi-sets
        const totalSets = setsToUse.length
        const totalReps = setsToUse.reduce((s, set) => s + (parseInt(set.reps) || 0), 0)
        const avgWeight = setsToUse.reduce((s, set) => s + (parseFloat(set.weight) || 0), 0) / totalSets
        const maxWeight = Math.max(...setsToUse.map((set) => parseFloat(set.weight) || 0))
        params = {
          sets: totalSets,
          reps: Math.round(totalReps / totalSets),
          weight: Math.round(avgWeight * 10) / 10,
          totalVolume: setsToUse.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0),
        }
        summary = setsToUse.map((set) => `${set.reps}x${set.weight}kg`).join(', ')
      } else {
        ;(selectedExercise.fields || []).forEach((f) => {
          const val = fieldValues[f.key]
          params[f.key] = f.type === 'number' ? parseFloat(val) || 0 : val
        })
      }

      const result = await calculateExerciseCalories(keys, {
        name: selectedExercise.name,
        type: selectedGroup?.group || 'strength',
        params,
      }, weightKg, heightCm)

      const entry = {
        id: `ex_${Date.now()}`,
        exercise: selectedExercise.name,
        equipment: equipment?.equipment,
        type: selectedGroup?.group?.toLowerCase() || 'strength',
        muscleGroups: [selectedGroup?.group].filter(Boolean),
        params,
        sets: setsToUse.length > 0 ? [...setsToUse] : null,
        fields: selectedExercise.fields,
        summary: summary || result.summary || '',
        durationMin: params.duration || (params.sets ? Math.round((params.sets || 1) * (params.reps || 10) * 0.1) : 0),
        caloriesBurned: result.caloriesBurned || 0,
        intensity: result.intensity || 'moderate',
        loggedAt: Date.now(),
      }
      // Save to exercise library for reuse
      saveExerciseToLibrary({
        id: `exlib_${selectedExercise.name.replace(/\s+/g, '_').toLowerCase()}`,
        name: selectedExercise.name,
        equipment: equipment?.equipment,
        type: entry.type,
        muscleGroups: entry.muscleGroups,
        fields: selectedExercise.fields,
        defaultParams: params,
      })
      onAdd(entry)
    } catch (err) {
      setError(err.message || 'Failed to calculate calories')
    } finally {
      setLoading(false)
    }
  }

  const isWalking = quickExercise.toLowerCase().includes('walk')

  const handleQuickSubmit = async () => {
    if (!quickExercise.trim()) return
    const steps = parseInt(quickSteps) || 0
    const dur = parseInt(quickDuration) || 0
    if (!steps && !dur) { setError('Please enter steps or duration'); return }
    setLoading(true)
    setError('')
    try {
      const parts = []
      if (steps > 0) parts.push(`${steps} steps`)
      if (dur > 0) parts.push(`${dur} minutes`)
      const exerciseDesc = `${quickExercise} (${parts.join(', ')})`
      const estDur = dur || Math.round(steps / 100) // ~100 steps/min as fallback
      const result = await estimateExerciseCalories(keys, exerciseDesc, estDur, weightKg)
      const summaryParts = []
      if (steps > 0) summaryParts.push(`${steps.toLocaleString()} steps`)
      if (dur > 0) summaryParts.push(`${dur} min`)
      onAdd({
        id: `ex_${Date.now()}`,
        exercise: result.exercise || quickExercise,
        type: 'cardio',
        muscleGroups: isWalking ? ['Legs'] : [],
        params: { ...(dur > 0 ? { duration: dur } : {}), ...(steps > 0 ? { steps } : {}) },
        summary: summaryParts.join(' \u00B7 '),
        durationMin: estDur,
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

  const handleDescribeSubmit = async () => {
    if (!describeText.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await describeExercise(keys, describeText, weightKg)
      setEquipment(result)
      const defaults = {}
      if (result.isCardio && result.muscleGroupOptions?.length === 1) {
        const group = result.muscleGroupOptions[0]
        setSelectedGroup(group)
        if (group.exercises?.length === 1) {
          const ex = group.exercises[0]
          setSelectedExercise(ex)
          ;(ex.fields || []).forEach((f) => {
            if (f.default != null) defaults[f.key] = f.default
            if (f.type === 'select' && f.options?.length) defaults[f.key] = f.options[0]
          })
          setFieldValues(defaults)
          setStep('fill-fields')
        } else {
          setStep('pick-exercise')
        }
      } else {
        setStep('pick-group')
      }
    } catch (err) {
      setError(err.message || 'Failed to process description')
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

  const handleGetSuggestion = async (isStrength) => {
    setSuggestionLoading(true)
    setSuggestionError('')
    try {
      const history = getExerciseHistory(selectedExercise.name)
      const result = await suggestWorkoutProgression(keys, selectedExercise.name, isStrength, history)
      setSuggestion({ ...result, _exercise: selectedExercise.name })
    } catch (err) {
      setSuggestionError(err.message || 'Failed to get suggestion')
    } finally {
      setSuggestionLoading(false)
    }
  }

  const handleUseSuggestion = (isStrength) => {
    if (!suggestion) return
    if (isStrength && suggestion.targetWeight != null) {
      const sets = suggestion.targetSets || 1
      updateField('weight', String(suggestion.targetWeight))
      updateField('reps', String(suggestion.targetReps || ''))
      setMultiSets(Array.from({ length: sets }, () => ({ weight: String(suggestion.targetWeight), reps: String(suggestion.targetReps || '') })))
    } else if (suggestion.targetDurationMin != null) {
      updateField('duration', String(suggestion.targetDurationMin))
    }
    setSuggestion(null)
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

  if (viewingHistoryFor) {
    return <ExerciseDetail exerciseName={viewingHistoryFor} onBack={() => setViewingHistoryFor(null)} />
  }

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
    const isStrength = (selectedExercise.fields || []).some((f) => f.key === 'weight' || f.key === 'sets' || f.key === 'reps')

    return (
      <div className="space-y-4">
        <BackButton to={selectedGroup?.exercises?.length > 1 ? 'pick-exercise' : 'pick-group'} />
        <EquipmentBadge />
        <div className="bg-surface-3 rounded-xl px-4 py-3">
          <p className="text-white font-semibold text-sm">{selectedExercise.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{selectedGroup?.group}</p>
        </div>

        {/* Multi-set mode for strength exercises */}
        {isStrength && multiSets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Sets logged</p>
            {multiSets.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-3 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-300">Set {i + 1}: {s.reps} reps @ {s.weight}kg</span>
                <button onClick={() => setMultiSets(multiSets.filter((_, j) => j !== i))}
                  className="text-gray-600 hover:text-red-400 text-xs">&times;</button>
              </div>
            ))}
          </div>
        )}

        {/* Non-strength fields (duration, speed, etc.) */}
        <DynamicFields
          fields={(selectedExercise.fields || []).filter((f) => !isStrength || (f.key !== 'sets'))}
          values={fieldValues}
          onChange={updateField}
          weightDisplayValues={weightDisplayValues}
        />

        <LastWorkoutPreview exerciseName={selectedExercise.name} onViewHistory={() => setViewingHistoryFor(selectedExercise.name)} />

        {getExerciseHistory(selectedExercise.name).length > 0 && (
          suggestion && suggestion._exercise === selectedExercise.name ? (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-2 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">Today's Suggestion · {suggestion.method}</span>
                <button onClick={() => setSuggestion(null)} className="text-gray-500 hover:text-gray-300 text-xs">&times;</button>
              </div>
              <p className="text-white text-sm font-medium">
                {isStrength
                  ? `${suggestion.targetSets}x${suggestion.targetReps} @ ${suggestion.targetWeight}kg`
                  : `${suggestion.targetDurationMin} min`}
              </p>
              {suggestion.reasoning && <p className="text-xs text-gray-400">{suggestion.reasoning}</p>}
              <button
                onClick={() => handleUseSuggestion(isStrength)}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition"
              >
                Use This
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleGetSuggestion(isStrength)}
              disabled={suggestionLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {suggestionLoading ? 'Thinking like a coach...' : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
                  Get AI Suggestion for Today
                </>
              )}
            </button>
          )
        )}
        {suggestionError && <p className="text-red-400 text-xs">{suggestionError}</p>}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2">
          {isStrength && (
            <button
              onClick={() => {
                const w = fieldValues.weight
                const r = fieldValues.reps
                if (!w || !r) { setError('Enter weight and reps first'); return }
                setMultiSets([...multiSets, { weight: w, reps: r }])
                setError('')
              }}
              className="flex-1 py-3 rounded-xl bg-surface-3 text-gray-300 font-medium hover:bg-surface-3/80 transition text-sm"
            >
              + Add Set
            </button>
          )}
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Calculate & Log'}
          </button>
        </div>
      </div>
    )
  }

  // Exercise history mode
  if (step === 'history') {
    const library = getExerciseLibrary().sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    const filtered = library.filter((e) =>
      e.name.toLowerCase().includes(historySearch.toLowerCase())
    )

    const selectFromHistory = (ex) => {
      setEquipment({ equipment: ex.equipment || ex.name })
      // Generate default fields if missing
      let fields = ex.fields && ex.fields.length > 0 ? ex.fields : null
      if (!fields) {
        if (ex.type === 'cardio') {
          fields = [{ key: 'duration', label: 'Duration', type: 'number', unit: 'min' }]
        } else {
          fields = [
            { key: 'weight', label: 'Weight', type: 'number', unit: 'kg' },
            { key: 'sets', label: 'Sets', type: 'number' },
            { key: 'reps', label: 'Reps per set', type: 'number' },
          ]
        }
      }
      setSelectedGroup({ group: ex.muscleGroups?.[0] || 'General', exercises: [{ name: ex.name, fields }] })
      const defaults = {}
      fields.forEach((f) => {
        const defVal = ex.defaultParams?.[f.key]
        if (defVal != null) defaults[f.key] = String(defVal)
        else if (f.default != null) defaults[f.key] = String(f.default)
        else if (f.type === 'select' && f.options?.length) defaults[f.key] = f.options[0]
      })
      setSelectedExercise({ name: ex.name, fields })
      setFieldValues(defaults)
      setMultiSets([])
      setStep('fill-fields')
    }

    return (
      <div className="space-y-3">
        <BackButton />
        <input type="text" placeholder="Search exercises..." value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none" />
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">
            {library.length === 0 ? 'No saved exercises yet.' : 'No matches.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filtered.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500/50 transition">
                <button onClick={() => selectFromHistory(ex)} className="flex-1 p-3 text-left min-w-0">
                  <p className="text-white text-sm font-medium truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {ex.type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{ex.type}</span>}
                    {ex.equipment && <span className="text-[10px] text-gray-500">{ex.equipment}</span>}
                  </div>
                </button>
                <button
                  onClick={() => setViewingHistoryFor(ex.name)}
                  title="View history & trends"
                  className="shrink-0 w-9 h-9 mr-2 rounded-lg flex items-center justify-center text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Describe exercise mode
  if (step === 'describe') {
    return (
      <div className="space-y-4">
        <BackButton />
        <p className="text-sm text-gray-400">Describe what you're doing and AI will figure out the rest</p>
        <textarea
          value={describeText}
          onChange={(e) => setDescribeText(e.target.value)}
          placeholder="e.g. 'Playing basketball with friends', 'Walking in the park', 'Doing pushups and planks at home', 'Swimming laps at the pool'..."
          rows={3}
          className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={handleDescribeSubmit} disabled={!describeText.trim() || loading}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition disabled:opacity-50">
          {loading ? 'Analyzing...' : 'Identify Exercise'}
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

        {isWalking && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Steps</label>
            <input type="text" inputMode="numeric" value={quickSteps}
              onChange={(e) => setQuickSteps(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none" />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Duration (minutes){isWalking ? ' — optional' : ''}</label>
          <input type="text" inputMode="numeric" value={quickDuration}
            onChange={(e) => setQuickDuration(e.target.value)}
            placeholder={isWalking ? 'Optional if steps entered' : '30'}
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
            onClick={() => setStep('history')}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-amber-500 text-left transition"
          >
            <p className="text-white font-medium">Pick from History</p>
            <p className="text-xs text-gray-400 mt-1">Re-do a previously logged exercise</p>
          </button>

          <button
            onClick={() => setStep('describe')}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-purple-500 text-left transition"
          >
            <p className="text-white font-medium">Describe Activity</p>
            <p className="text-xs text-gray-400 mt-1">Tell AI what you're doing — playing, walking, swimming...</p>
          </button>

          <button
            onClick={() => setStep('quick')}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 text-left transition"
          >
            <p className="text-white font-medium">Quick Log</p>
            <p className="text-xs text-gray-400 mt-1">Pick exercise, enter steps or duration</p>
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
    </div>
  )
}
