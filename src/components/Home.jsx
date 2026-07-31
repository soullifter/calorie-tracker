import { useMemo } from 'react'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, getWeightLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'
import CalorieRing from './CalorieRing'
import WeeklyChart from './WeeklyChart'
import CalendarPicker from './CalendarPicker'

function QuickStat({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-surface-2 rounded-2xl p-3 text-center animate-fade-in">
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function WeightMini({ weightLog, currentWeight, targetWeight }) {
  if (weightLog.length === 0) return null

  const recent = weightLog.slice(-7)
  const first = weightLog[0]
  const last = recent[recent.length - 1]
  const totalLost = Math.round((first.weight - last.weight) * 10) / 10
  const toGo = Math.round((last.weight - targetWeight) * 10) / 10

  const minW = Math.min(...recent.map((e) => e.weight), targetWeight) - 1
  const maxW = Math.max(...recent.map((e) => e.weight)) + 1
  const range = maxW - minW

  const points = recent.map((e, i) => {
    const x = (i / Math.max(1, recent.length - 1)) * 100
    const y = 100 - ((e.weight - minW) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-surface-2 rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Weight</h3>
        <span className="text-xs text-gray-500">{last.weight} kg</span>
      </div>

      {/* Mini line chart */}
      <svg viewBox="0 0 100 50" className="w-full h-16" preserveAspectRatio="none">
        {/* Target line */}
        <line
          x1="0" x2="100"
          y1={100 - ((targetWeight - minW) / range) * 100}
          y2={100 - ((targetWeight - minW) / range) * 100}
          stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2"
        />
        <polyline
          points={points}
          fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        />
        {recent.map((e, i) => {
          const x = (i / Math.max(1, recent.length - 1)) * 100
          const y = 100 - ((e.weight - minW) / range) * 100
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#818cf8" />
        })}
      </svg>

      <div className="flex justify-between mt-2 text-xs">
        <span className={`${totalLost > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
          {totalLost > 0 ? `-${totalLost} kg total` : 'No change yet'}
        </span>
        <span className="text-gray-500">
          {toGo > 0 ? `${toGo} kg to go` : 'Target reached!'}
        </span>
      </div>
    </div>
  )
}

export default function Home({ profile, onSelectDay, onGoToday }) {
  const todayKey = getDateKey()

  const todayData = useMemo(() => {
    const log = getDayLog(todayKey)
    const entries = MEAL_TYPES.flatMap((m) => log.meals[m] || [])
    const totals = sumNutrients(entries)
    const burned = (log.exercises || []).reduce((s, e) => s + (e.caloriesBurned || 0), 0)
    return { totals, burned, mealCount: entries.length }
  }, [todayKey])

  // Calculate streak
  const streak = useMemo(() => {
    let count = 0
    const d = new Date()
    d.setDate(d.getDate() - 1) // start from yesterday
    while (true) {
      const key = getDateKey(d)
      const log = getDayLog(key)
      const entries = MEAL_TYPES.flatMap((m) => log.meals[m] || [])
      if (entries.length === 0) break
      count++
      d.setDate(d.getDate() - 1)
    }
    // Count today if has entries
    if (todayData.mealCount > 0) count++
    return count
  }, [todayData.mealCount])

  const weightLog = getWeightLog()
  const greeting = `Hey, ${profile.name?.split(' ')[0] || 'there'}`
  const now = new Date()
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 max-w-lg mx-auto">
        <p className="text-gray-500 text-sm">Good {timeOfDay}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{greeting}</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-4">
        {/* Today's summary card */}
        <div
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/40 transition"
          onClick={onGoToday}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Today</p>
              <p className="text-white font-semibold mt-1">
                {todayData.mealCount > 0
                  ? `${Math.round(todayData.totals.calories || 0)} cal eaten`
                  : 'No meals logged yet'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.max(0, profile.targets.calories + todayData.burned - Math.round(todayData.totals.calories || 0))} cal remaining
                {todayData.burned > 0 && ` (+${todayData.burned} burned)`}
              </p>
            </div>
            <CalorieRing
              consumed={todayData.totals.calories || 0}
              target={profile.targets.calories}
              burned={todayData.burned}
            />
          </div>
          <div className="flex items-center justify-end mt-2">
            <span className="text-xs text-indigo-400 flex items-center gap-1">
              Tap to log
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </span>
          </div>
        </div>

        {/* Quick stats */}
        {(() => {
          const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1].weight : profile.weightKg
          const heightM = profile.heightCm / 100
          const bmi = Math.round(latestWeight / (heightM * heightM) * 10) / 10
          const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
          const bmiColor = bmi < 18.5 ? 'text-amber-400' : bmi < 25 ? 'text-emerald-400' : bmi < 30 ? 'text-amber-400' : 'text-red-400'

          return (
            <div className="grid grid-cols-4 gap-2">
              <QuickStat
                label="Streak"
                value={`${streak}d`}
                color={streak > 0 ? 'text-amber-400' : 'text-gray-600'}
              />
              <QuickStat
                label="BMI"
                value={bmi}
                sub={bmiCategory}
                color={bmiColor}
              />
              <QuickStat
                label="Target"
                value={profile.targets.calories}
                sub="cal/day"
              />
              <QuickStat
                label="Deficit"
                value={profile.deficit || 500}
                sub="cal/day"
              />
            </div>
          )
        })()}

        {/* Weekly chart */}
        <WeeklyChart target={profile.targets.calories} />

        {/* Weight trend */}
        <WeightMini
          weightLog={weightLog}
          currentWeight={profile.weightKg}
          targetWeight={profile.targetWeightKg}
        />

        {/* Calendar */}
        <CalendarPicker onSelectDay={onSelectDay} />
      </div>
    </div>
  )
}
