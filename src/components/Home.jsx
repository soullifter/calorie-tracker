import { useMemo, useState } from 'react'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, getWeightLog } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'
import CalorieRing from './CalorieRing'
import WeeklyChart from './WeeklyChart'
import { WeeklyExerciseChart, MuscleGroupMap, ProgressiveOverload } from './ExerciseTrends'
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

function WeightMini({ weightLog, currentWeight, targetWeight, onOpenDetail }) {
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
    <button onClick={onOpenDetail} className="w-full text-left bg-surface-2 rounded-2xl p-5 animate-fade-in hover:bg-surface-3/50 transition">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          Weight
          <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </h3>
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
    </button>
  )
}

const WEIGHT_RANGE_OPTIONS = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '6M', days: 182 },
  { label: 'All', days: null },
]

function WeightDetail({ weightLog, targetWeight, onBack }) {
  const [rangeDays, setRangeDays] = useState(90)

  const filtered = useMemo(() => {
    if (!rangeDays) return weightLog
    const cutoff = getDateKey(new Date(Date.now() - rangeDays * 86400000))
    return weightLog.filter((e) => e.date >= cutoff)
  }, [weightLog, rangeDays])

  const entries = filtered.length > 0 ? filtered : weightLog

  const first = entries[0]
  const last = entries[entries.length - 1]
  const totalChange = Math.round((last.weight - first.weight) * 10) / 10
  const toGo = Math.round((last.weight - targetWeight) * 10) / 10
  const daysSpan = Math.max(1, (new Date(last.date) - new Date(first.date)) / 86400000)
  const weeklyRate = Math.round((totalChange / daysSpan) * 7 * 10) / 10
  const minAll = Math.min(...entries.map((e) => e.weight))
  const maxAll = Math.max(...entries.map((e) => e.weight))

  const minW = Math.min(...entries.map((e) => e.weight), targetWeight) - 0.5
  const maxW = Math.max(...entries.map((e) => e.weight), targetWeight) + 0.5
  const range = maxW - minW || 1

  const values = entries.map((e) => e.weight)
  const dateLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="space-y-5 animate-scale-in">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Back
      </button>

      <div>
        <h3 className="text-white font-semibold text-lg">Weight Trend</h3>
        <p className="text-xs text-gray-500 mt-0.5">{entries.length} entries logged</p>
      </div>

      {/* Range selector */}
      <div className="flex rounded-xl overflow-hidden border border-white/5">
        {WEIGHT_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setRangeDays(opt.days)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              rangeDays === opt.days ? 'bg-brand-500 text-white' : 'bg-surface-3 text-gray-500 hover:text-gray-300'
            }`}
          >{opt.label}</button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{last.weight}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Current</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className={`text-lg font-bold tabular-nums ${totalChange < 0 ? 'text-emerald-400' : totalChange > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {totalChange > 0 ? '+' : ''}{totalChange}
          </p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Change</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className={`text-lg font-bold tabular-nums ${weeklyRate < 0 ? 'text-emerald-400' : weeklyRate > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {weeklyRate > 0 ? '+' : ''}{weeklyRate}
          </p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Kg/week</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{toGo > 0 ? toGo : 0}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">To go</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface-2 rounded-2xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Weight Progression (kg)</p>
        <p className="text-[10px] text-gray-600 mb-2">Dashed line is your target weight</p>
        <div className="relative" style={{ height: '180px', paddingLeft: '28px' }}>
          <span className="absolute left-0 top-0 text-[9px] text-gray-500 tabular-nums">{Math.round(maxW * 10) / 10}</span>
          <span className="absolute left-0 text-[9px] text-gray-500 tabular-nums" style={{ top: 'calc(50% - 6px)' }}>{Math.round((minW + range / 2) * 10) / 10}</span>
          <span className="absolute left-0 text-[9px] text-gray-500 tabular-nums" style={{ bottom: '22px' }}>{Math.round(minW * 10) / 10}</span>

          <svg viewBox="0 0 100 40" className="absolute" style={{ left: '28px', right: 0, top: 0, height: 'calc(100% - 20px)' }} preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map((y) => (
              <line key={y} x1="0" x2="100" y1={y * 0.4} y2={y * 0.4} stroke="oklch(0.25 0.01 260)" strokeWidth="0.3" />
            ))}
            <line
              x1="0" x2="100"
              y1={40 - ((targetWeight - minW) / range) * 40}
              y2={40 - ((targetWeight - minW) / range) * 40}
              stroke="#6b7280" strokeWidth="0.4" strokeDasharray="2,2"
            />
            <polygon
              points={`0,40 ${entries.map((e, i) => {
                const x = (i / Math.max(1, entries.length - 1)) * 100
                const y = 40 - ((e.weight - minW) / range) * 40
                return `${x},${y}`
              }).join(' ')} 100,40`}
              fill="rgba(129,140,248,0.1)"
            />
            <polyline
              points={entries.map((e, i) => {
                const x = (i / Math.max(1, entries.length - 1)) * 100
                const y = 40 - ((e.weight - minW) / range) * 40
                return `${x},${y}`
              }).join(' ')}
              fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
            {entries.map((e, i) => {
              const x = (i / Math.max(1, entries.length - 1)) * 100
              const y = 40 - ((e.weight - minW) / range) * 40
              return <circle key={i} cx={x} cy={y} r="1.8" fill="#818cf8" />
            })}
          </svg>

          {/* Per-point weight labels (only PR-low, PR-high, first, last to avoid clutter on long ranges) */}
          {entries.map((e, i) => {
            const isEdge = i === 0 || i === entries.length - 1
            const isExtreme = e.weight === minAll || e.weight === maxAll
            if (entries.length > 12 && !isEdge && !isExtreme) return null
            const x = (i / Math.max(1, entries.length - 1)) * 100
            const yFrac = (40 - ((e.weight - minW) / range) * 40) / 40
            const showBelow = yFrac < 0.2
            return (
              <div key={i} className="absolute text-center pointer-events-none" style={{
                left: `calc(28px + (100% - 28px) * ${x / 100})`,
                top: `calc((100% - 20px) * ${yFrac} ${showBelow ? '+ 6px' : '- 16px'})`,
                transform: 'translateX(-50%)', width: '44px',
              }}>
                <p className="text-[10px] font-semibold text-white leading-tight tabular-nums">{e.weight}</p>
              </div>
            )
          })}

          {/* X-axis date labels */}
          <div className="absolute" style={{ left: '28px', right: 0, bottom: 0, height: '18px' }}>
            {entries.map((e, i) => {
              if (entries.length > 6 && i !== 0 && i !== entries.length - 1 && i % Math.ceil(entries.length / 5) !== 0) return null
              const x = (i / Math.max(1, entries.length - 1)) * 100
              return (
                <span key={i} className="absolute text-[8px] text-gray-600 whitespace-nowrap" style={{ left: `${x}%`, transform: 'translateX(-50%)' }}>
                  {dateLabel(e.date)}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* All entries */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">All Entries</p>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {entries.slice().reverse().map((e, i, arr) => {
            const prev = arr[i + 1]
            const delta = prev ? Math.round((e.weight - prev.weight) * 10) / 10 : 0
            return (
              <div key={e.date} className="flex items-center justify-between bg-surface-2 rounded-xl px-4 py-2.5">
                <span className="text-xs text-gray-400">{dateLabel(e.date)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white tabular-nums">{e.weight} kg</span>
                  {delta !== 0 && (
                    <span className={`text-[10px] tabular-nums ${delta < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Home({ profile, onSelectDay, onGoToday }) {
  const todayKey = getDateKey()
  const [viewingWeightDetail, setViewingWeightDetail] = useState(false)

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

  if (viewingWeightDetail) {
    return (
      <div className="min-h-screen bg-surface-1 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <WeightDetail weightLog={weightLog} targetWeight={profile.targetWeightKg} onBack={() => setViewingWeightDetail(false)} />
        </div>
      </div>
    )
  }

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

        {/* Exercise trends */}
        <WeeklyExerciseChart />
        <MuscleGroupMap />
        <ProgressiveOverload />

        {/* Weight trend */}
        <WeightMini
          weightLog={weightLog}
          currentWeight={profile.weightKg}
          targetWeight={profile.targetWeightKg}
          onOpenDetail={() => setViewingWeightDetail(true)}
        />

        {/* Calendar */}
        <CalendarPicker onSelectDay={onSelectDay} />
      </div>
    </div>
  )
}
