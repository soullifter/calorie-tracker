import { useMemo } from 'react'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
const MUSCLE_COLORS = {
  Chest: 'bg-blue-500', Back: 'bg-indigo-500', Legs: 'bg-emerald-500',
  Shoulders: 'bg-amber-500', Arms: 'bg-rose-500', Core: 'bg-purple-500',
}

function getLast7DaysData() {
  const today = new Date()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = getDateKey(d)
    const log = getDayLog(key)
    days.push({
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      exercises: log.exercises || [],
      isToday: i === 0,
    })
  }
  return days
}

function getLast30DaysExercises() {
  const today = new Date()
  const all = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = getDateKey(d)
    const log = getDayLog(key)
    ;(log.exercises || []).forEach((ex) => all.push({ ...ex, dateKey: key }))
  }
  return all
}

// Weekly exercise frequency + calories burned chart
export function WeeklyExerciseChart() {
  const days = useMemo(getLast7DaysData, [])
  const maxBurned = Math.max(1, ...days.map((d) => d.exercises.reduce((s, e) => s + (e.caloriesBurned || 0), 0)))
  const totalSessions = days.reduce((s, d) => s + (d.exercises.length > 0 ? 1 : 0), 0)
  const totalBurned = days.reduce((s, d) => s + d.exercises.reduce((ss, e) => ss + (e.caloriesBurned || 0), 0), 0)

  if (totalBurned === 0) return null

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Exercise This Week</h3>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-2xl font-bold text-emerald-400">{totalBurned}</span>
          <span className="text-xs text-gray-500 ml-1">cal burned</span>
        </div>
        <div>
          <span className="text-2xl font-bold text-white">{totalSessions}</span>
          <span className="text-xs text-gray-500 ml-1">sessions</span>
        </div>
      </div>

      <div className="flex items-end gap-2 h-24">
        {days.map((day) => {
          const burned = day.exercises.reduce((s, e) => s + (e.caloriesBurned || 0), 0)
          const pct = Math.max(2, (burned / maxBurned) * 100)
          const hasExercise = burned > 0

          return (
            <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
              <span className={`text-[9px] tabular-nums ${hasExercise ? 'text-gray-400' : 'text-gray-700'}`}>
                {hasExercise ? burned : ''}
              </span>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${hasExercise ? 'bg-emerald-500/70' : 'bg-gray-800'}`}
                  style={{ height: `${hasExercise ? pct : 4}%`, minHeight: '4px' }}
                />
              </div>
              <span className={`text-[10px] ${day.isToday ? 'text-white font-semibold' : 'text-gray-600'}`}>
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Muscle group heatmap — which groups hit this week
export function MuscleGroupMap() {
  const days = useMemo(getLast7DaysData, [])

  const groupCounts = {}
  days.forEach((day) => {
    day.exercises.forEach((ex) => {
      ;(ex.muscleGroups || []).forEach((mg) => {
        // Normalize group names
        const normalized = MUSCLE_GROUPS.find((g) => mg.toLowerCase().includes(g.toLowerCase())) || mg
        groupCounts[normalized] = (groupCounts[normalized] || 0) + 1
      })
    })
  })

  const hasData = Object.keys(groupCounts).length > 0
  if (!hasData) return null

  const maxCount = Math.max(1, ...Object.values(groupCounts))

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Muscle Groups This Week</h3>
      <div className="grid grid-cols-3 gap-2">
        {MUSCLE_GROUPS.map((group) => {
          const count = groupCounts[group] || 0
          const opacity = count > 0 ? 0.3 + (count / maxCount) * 0.7 : 0.1
          const color = MUSCLE_COLORS[group] || 'bg-gray-500'

          return (
            <div
              key={group}
              className="rounded-xl p-3 text-center transition-all"
              style={{ backgroundColor: `oklch(0.21 0.01 260 / ${count > 0 ? 1 : 0.5})` }}
            >
              <div
                className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-xs font-bold text-white ${color}`}
                style={{ opacity }}
              >
                {count}
              </div>
              <p className={`text-[10px] mt-1.5 ${count > 0 ? 'text-gray-300' : 'text-gray-600'}`}>{group}</p>
              {count === 0 && <p className="text-[8px] text-gray-700">not hit</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Progressive overload — track weight/volume increase for repeated exercises
export function ProgressiveOverload() {
  const allExercises = useMemo(getLast30DaysExercises, [])

  // Group by exercise name
  const exerciseHistory = {}
  allExercises.forEach((ex) => {
    if (!ex.params?.weight) return // only track weighted exercises
    if (!exerciseHistory[ex.exercise]) exerciseHistory[ex.exercise] = []
    exerciseHistory[ex.exercise].push({
      date: ex.dateKey,
      weight: parseFloat(ex.params.weight) || 0,
      sets: parseInt(ex.params.sets) || 0,
      reps: parseInt(ex.params.reps) || 0,
      volume: (parseFloat(ex.params.weight) || 0) * (parseInt(ex.params.sets) || 1) * (parseInt(ex.params.reps) || 1),
    })
  })

  // Only show exercises done 2+ times
  const repeatedExercises = Object.entries(exerciseHistory)
    .filter(([_, sessions]) => sessions.length >= 2)
    .slice(0, 5) // top 5

  if (repeatedExercises.length === 0) return null

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Progressive Overload</h3>
      <div className="space-y-4">
        {repeatedExercises.map(([name, sessions]) => {
          const first = sessions[0]
          const last = sessions[sessions.length - 1]
          const weightDiff = last.weight - first.weight
          const volumeDiff = last.volume - first.volume
          const isUp = weightDiff > 0 || volumeDiff > 0

          // Mini sparkline
          const weights = sessions.map((s) => s.weight)
          const minW = Math.min(...weights)
          const maxW = Math.max(...weights)
          const range = maxW - minW || 1
          const points = sessions.map((s, i) => {
            const x = (i / Math.max(1, sessions.length - 1)) * 100
            const y = 100 - ((s.weight - minW) / range) * 100
            return `${x},${y}`
          }).join(' ')

          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-200 font-medium truncate flex-1">{name}</p>
                <span className={`text-xs font-medium ${isUp ? 'text-emerald-400' : weightDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {weightDiff > 0 ? '+' : ''}{weightDiff}kg
                </span>
              </div>
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 100 30" className="flex-1 h-8" preserveAspectRatio="none">
                  <polyline
                    points={points}
                    fill="none"
                    stroke={isUp ? '#34d399' : weightDiff < 0 ? '#f87171' : '#6b7280'}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {sessions.map((s, i) => {
                    const x = (i / Math.max(1, sessions.length - 1)) * 100
                    const y = 100 - ((s.weight - minW) / range) * 100
                    return <circle key={i} cx={x} cy={y} r="2" fill={isUp ? '#34d399' : '#6b7280'} />
                  })}
                </svg>
                <div className="text-right shrink-0">
                  <p className="text-xs text-white tabular-nums">{last.weight}kg</p>
                  <p className="text-[10px] text-gray-500">{sessions.length} sessions</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
