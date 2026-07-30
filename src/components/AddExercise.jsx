import { useState } from 'react'
import { estimateExerciseCalories } from '../utils/ai'

const QUICK_EXERCISES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Weight Training',
  'Yoga', 'Jump Rope', 'HIIT', 'Elliptical', 'Stair Climbing',
]

export default function AddExercise({ keys, weightKg, onAdd, onClose }) {
  const [exercise, setExercise] = useState('')
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!exercise.trim()) return
    setLoading(true)
    setError('')

    try {
      const result = await estimateExerciseCalories(keys, exercise, duration, weightKg)
      onAdd({
        id: `ex_${Date.now()}`,
        exercise: result.exercise || exercise,
        durationMin: duration,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Add Exercise</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_EXERCISES.map((ex) => (
          <button
            key={ex}
            onClick={() => setExercise(ex)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              exercise === ex
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {ex}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Or type your exercise..."
        value={exercise}
        onChange={(e) => setExercise(e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-green-500 focus:outline-none"
      />

      <div className="space-y-2">
        <label className="text-sm text-gray-400">Duration (minutes)</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDuration(Math.max(5, duration - 5))}
            className="w-10 h-10 rounded-lg bg-gray-800 text-white text-xl hover:bg-gray-700"
          >-</button>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 5))}
            className="w-20 text-center p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
          />
          <button
            onClick={() => setDuration(duration + 5)}
            className="w-10 h-10 rounded-lg bg-gray-800 text-white text-xl hover:bg-gray-700"
          >+</button>
          <span className="text-gray-400 text-sm">min</span>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!exercise.trim() || loading}
        className="w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 transition disabled:opacity-50"
      >
        {loading ? 'Estimating...' : 'Add Exercise'}
      </button>
    </div>
  )
}
