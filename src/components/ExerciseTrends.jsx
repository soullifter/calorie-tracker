import { useState, useMemo } from 'react'
import { getDateKey } from '../utils/calculations'
import { getDayLog } from '../utils/storage'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']
const MUSCLE_COLORS = {
  Chest: { bg: 'bg-blue-500', text: 'text-blue-400', light: 'bg-blue-500/15' },
  Back: { bg: 'bg-indigo-500', text: 'text-indigo-400', light: 'bg-indigo-500/15' },
  Legs: { bg: 'bg-emerald-500', text: 'text-emerald-400', light: 'bg-emerald-500/15' },
  Shoulders: { bg: 'bg-amber-500', text: 'text-amber-400', light: 'bg-amber-500/15' },
  Arms: { bg: 'bg-rose-500', text: 'text-rose-400', light: 'bg-rose-500/15' },
  Core: { bg: 'bg-purple-500', text: 'text-purple-400', light: 'bg-purple-500/15' },
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
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      exercises: log.exercises || [],
      isToday: i === 0,
    })
  }
  return days
}

function getExercisesForDays(numDays) {
  const today = new Date()
  const all = []
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = getDateKey(d)
    const log = getDayLog(key)
    ;(log.exercises || []).forEach((ex) => all.push({ ...ex, dateKey: key }))
  }
  return all
}

function normalizeGroup(mg) {
  return MUSCLE_GROUPS.find((g) => mg.toLowerCase().includes(g.toLowerCase())) || mg
}

// Derive session stats from raw per-set data when available, falling back to
// the (averaged) params for legacy entries logged before multi-set support.
function sessionStats(ex) {
  if (ex.sets && ex.sets.length > 0) {
    const weights = ex.sets.map((s) => parseFloat(s.weight) || 0)
    const reps = ex.sets.map((s) => parseInt(s.reps) || 0)
    const volume = ex.sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0)
    return {
      weight: Math.max(...weights),
      sets: ex.sets.length,
      reps: reps.reduce((a, b) => a + b, 0),
      volume,
    }
  }
  return {
    weight: parseFloat(ex.params?.weight) || 0,
    sets: parseInt(ex.params?.sets) || 0,
    reps: parseInt(ex.params?.reps) || 0,
    volume: (parseFloat(ex.params?.weight) || 0) * (parseInt(ex.params?.sets) || 1) * (parseInt(ex.params?.reps) || 1),
  }
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

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: 365 },
]

// Muscle group detail view
function MuscleGroupDetail({ group, onBack }) {
  const [rangeDays, setRangeDays] = useState(30)
  const days = useMemo(getLast7DaysData, [])
  const allExercises = useMemo(() => getExercisesForDays(rangeDays), [rangeDays])
  const colors = MUSCLE_COLORS[group] || MUSCLE_COLORS.Chest

  // This week's exercises for this group
  const weekExercises = []
  days.forEach((day) => {
    day.exercises.forEach((ex) => {
      const groups = (ex.muscleGroups || []).map(normalizeGroup)
      if (groups.includes(group)) {
        weekExercises.push({ ...ex, dayLabel: day.date })
      }
    })
  })

  // 30-day history for progressive overload
  const exerciseHistory = {}
  allExercises.forEach((ex) => {
    const groups = (ex.muscleGroups || []).map(normalizeGroup)
    if (!groups.includes(group)) return
    if (!exerciseHistory[ex.exercise]) exerciseHistory[ex.exercise] = []
    const stats = sessionStats(ex)
    exerciseHistory[ex.exercise].push({
      date: ex.dateKey,
      dateLabel: new Date(ex.dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...stats,
      caloriesBurned: ex.caloriesBurned || 0,
      summary: ex.summary || '',
    })
  })

  const totalBurned = weekExercises.reduce((s, e) => s + (e.caloriesBurned || 0), 0)

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-scale-in space-y-5">
      {/* Header */}
      <div>
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-3">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          All Groups
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">{group[0]}</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{group}</h3>
            <p className="text-xs text-gray-500">{weekExercises.length} exercises this week \u00B7 {totalBurned} cal</p>
          </div>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex rounded-xl overflow-hidden border border-white/5">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setRangeDays(opt.days)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              rangeDays === opt.days ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-500 hover:text-gray-300'
            }`}
          >{opt.label}</button>
        ))}
      </div>

      {/* This week's sessions */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This Week</h4>
        {weekExercises.length === 0 ? (
          <p className="text-gray-600 text-sm">No {group.toLowerCase()} exercises this week</p>
        ) : (
          <div className="space-y-2">
            {weekExercises.map((ex, i) => (
              <div key={i} className={`${colors.light} rounded-xl px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${colors.text}`}>{ex.exercise}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ex.summary || `${ex.durationMin || 0} min`} \u00B7 {ex.dayLabel}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">-{ex.caloriesBurned}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progressive overload per exercise */}
      {Object.entries(exerciseHistory).map(([name, sessions]) => {
        if (sessions.length < 1) return null

        const hasWeight = sessions.some((s) => s.weight > 0)

        // Volume chart data
        const chartData = hasWeight ? sessions : sessions.map((s) => ({ ...s, weight: s.caloriesBurned }))
        const values = chartData.map((s) => hasWeight ? s.weight : s.caloriesBurned)
        const minV = Math.min(...values)
        const maxV = Math.max(...values)
        const range = maxV - minV || 1

        const first = sessions[0]
        const last = sessions[sessions.length - 1]
        const weightDiff = hasWeight ? Math.round((last.weight - first.weight) * 10) / 10 : 0
        const isUp = weightDiff > 0

        return (
          <div key={name}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">{name}</h4>
              {sessions.length >= 2 && hasWeight && (
                <span className={`text-xs font-semibold ${isUp ? 'text-emerald-400' : weightDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {weightDiff > 0 ? '+' : ''}{weightDiff}kg
                </span>
              )}
            </div>

            {/* Chart */}
            <div className="bg-surface-3 rounded-xl p-3">
              <svg viewBox="0 0 100 40" className="w-full h-20" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((y) => (
                  <line key={y} x1="0" x2="100" y1={y * 0.4} y2={y * 0.4} stroke="oklch(0.25 0.01 260)" strokeWidth="0.3" />
                ))}
                {/* Area fill */}
                <polygon
                  points={`0,40 ${chartData.map((s, i) => {
                    const x = (i / Math.max(1, chartData.length - 1)) * 100
                    const y = 40 - ((values[i] - minV) / range) * 35
                    return `${x},${y}`
                  }).join(' ')} 100,40`}
                  fill={`${isUp ? 'rgba(52,211,153,0.1)' : 'rgba(107,114,128,0.1)'}`}
                />
                {/* Line */}
                <polyline
                  points={chartData.map((s, i) => {
                    const x = (i / Math.max(1, chartData.length - 1)) * 100
                    const y = 40 - ((values[i] - minV) / range) * 35
                    return `${x},${y}`
                  }).join(' ')}
                  fill="none"
                  stroke={isUp ? '#34d399' : '#6b7280'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Dots */}
                {chartData.map((s, i) => {
                  const x = (i / Math.max(1, chartData.length - 1)) * 100
                  const y = 40 - ((values[i] - minV) / range) * 35
                  return <circle key={i} cx={x} cy={y} r="2" fill={isUp ? '#34d399' : '#6b7280'} />
                })}
              </svg>

              {/* Session details */}
              <div className="space-y-1.5 mt-2">
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{s.dateLabel}</span>
                    <div className="flex items-center gap-3">
                      {s.summary && <span className="text-gray-400">{s.summary}</span>}
                      {hasWeight && <span className="text-white tabular-nums">{s.weight}kg</span>}
                      {s.volume > 0 && <span className="text-gray-500 tabular-nums">vol: {s.volume}</span>}
                      <span className="text-emerald-400 tabular-nums">-{s.caloriesBurned}cal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {Object.keys(exerciseHistory).length === 0 && (
        <p className="text-gray-600 text-sm text-center py-2">No {group.toLowerCase()} history in the last {rangeDays} days</p>
      )}
    </div>
  )
}

// Interactive muscle group map
export function MuscleGroupMap() {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const days = useMemo(getLast7DaysData, [])

  const groupCounts = {}
  days.forEach((day) => {
    day.exercises.forEach((ex) => {
      ;(ex.muscleGroups || []).forEach((mg) => {
        const normalized = normalizeGroup(mg)
        groupCounts[normalized] = (groupCounts[normalized] || 0) + 1
      })
    })
  })

  const hasData = Object.keys(groupCounts).length > 0
  if (!hasData) return null

  if (selectedGroup) {
    return <MuscleGroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} />
  }

  const maxCount = Math.max(1, ...Object.values(groupCounts))

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Muscle Groups This Week</h3>
      <p className="text-[10px] text-gray-600 mb-4">Tap a group for details</p>
      <div className="grid grid-cols-3 gap-2">
        {MUSCLE_GROUPS.map((group) => {
          const count = groupCounts[group] || 0
          const colors = MUSCLE_COLORS[group]
          const opacity = count > 0 ? 0.3 + (count / maxCount) * 0.7 : 0.1

          return (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`rounded-xl p-3 text-center transition-all hover:ring-1 hover:ring-white/10 ${count > 0 ? 'bg-surface-3' : 'bg-surface-3/50'}`}
            >
              <div
                className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-sm font-bold text-white ${colors.bg}`}
                style={{ opacity }}
              >
                {count}x
              </div>
              <p className={`text-[11px] mt-2 font-medium ${count > 0 ? 'text-gray-200' : 'text-gray-600'}`}>{group}</p>
              {count === 0 && <p className="text-[9px] text-gray-700">not hit</p>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Keep progressive overload as standalone for home page summary
export function ProgressiveOverload() {
  const allExercises = useMemo(() => getExercisesForDays(30), [])

  const exerciseHistory = {}
  allExercises.forEach((ex) => {
    const hasSets = ex.sets && ex.sets.length > 0
    if (!hasSets && !ex.params?.weight) return
    if (!exerciseHistory[ex.exercise]) exerciseHistory[ex.exercise] = []
    exerciseHistory[ex.exercise].push({
      date: ex.dateKey,
      ...sessionStats(ex),
    })
  })

  const repeatedExercises = Object.entries(exerciseHistory)
    .filter(([_, sessions]) => sessions.length >= 2)
    .slice(0, 5)

  if (repeatedExercises.length === 0) return null

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Progressive Overload</h3>
      <div className="space-y-4">
        {repeatedExercises.map(([name, sessions]) => {
          const first = sessions[0]
          const last = sessions[sessions.length - 1]
          const weightDiff = Math.round((last.weight - first.weight) * 10) / 10
          const isUp = weightDiff > 0

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
                  <polyline points={points} fill="none"
                    stroke={isUp ? '#34d399' : weightDiff < 0 ? '#f87171' : '#6b7280'}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
