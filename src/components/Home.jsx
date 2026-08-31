import { useMemo, useState } from 'react'
import { smoothPath, smoothAreaPath, toChartPoints, ChartGradient } from '../utils/chart'
import { getDateKey, sumNutrients } from '../utils/calculations'
import { getDayLog, getWeightLog, getLoggedDates } from '../utils/storage'
import { MEAL_TYPES } from '../utils/constants'
import CalorieRing from './CalorieRing'
import WeeklyChart from './WeeklyChart'
import { WeeklyExerciseChart, MuscleGroupMap, ProgressiveOverload } from './ExerciseTrends'
import CalendarPicker from './CalendarPicker'

function QuickStat({ label, value, sub, color = 'text-white', onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`bg-surface-2 rounded-2xl p-3 text-center animate-fade-in ${onClick ? 'hover:bg-surface-3/50 transition' : ''}`}>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </Tag>
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
      {(() => {
        const vals = recent.map((e) => e.weight)
        const pts = toChartPoints(vals, { width: 100, height: 50, padding: 4 })
        const targetY = 4 + ((Math.max(...vals) - targetWeight) / range) * 42
        return (
          <svg viewBox="0 0 100 50" className="w-full h-16" preserveAspectRatio="none">
            <defs><ChartGradient id="wmGrad" color="#818cf8" /></defs>
            <line x1="0" x2="100" y1={targetY} y2={targetY} stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />
            <path d={smoothAreaPath(pts, 50)} fill="url(#wmGrad)" />
            <path d={smoothPath(pts)} fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="#818cf8" stroke="#1a1a2e" strokeWidth="0.5" />)}
          </svg>
        )
      })()}

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

          {(() => {
            const pts = toChartPoints(values, { width: 100, height: 40, padding: 2.5 })
            const targetY = 2.5 + ((maxW - targetWeight) / range) * 35
            return (
              <svg viewBox="0 0 100 40" className="absolute" style={{ left: '28px', right: 0, top: 0, height: 'calc(100% - 20px)' }} preserveAspectRatio="none">
                <defs><ChartGradient id="wdGrad" color="#818cf8" /></defs>
                {[0, 50, 100].map((y) => (
                  <line key={y} x1="0" x2="100" y1={y * 0.4} y2={y * 0.4} stroke="oklch(0.22 0.01 260)" strokeWidth="0.3" />
                ))}
                <line x1="0" x2="100" y1={targetY} y2={targetY} stroke="#6b7280" strokeWidth="0.4" strokeDasharray="2,2" />
                <path d={smoothAreaPath(pts, 40)} fill="url(#wdGrad)" />
                <path d={smoothPath(pts)} fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
                {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill="#818cf8" stroke="#1a1a2e" strokeWidth="0.6" />)}
              </svg>
            )
          })()}

          {/* Per-point weight labels */}
          {entries.map((e, i) => {
            const isEdge = i === 0 || i === entries.length - 1
            const isExtreme = e.weight === minAll || e.weight === maxAll
            if (entries.length > 12 && !isEdge && !isExtreme) return null
            const x = (i / Math.max(1, entries.length - 1)) * 100
            const vArr = entries.map((en) => en.weight)
            const mn = Math.min(...vArr); const mx = Math.max(...vArr); const rng = mx - mn || 1
            const yFrac = (2.5 + ((mx - e.weight) / rng) * 35) / 40
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

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function computeLongestStreak(loggedDates) {
  if (loggedDates.length === 0) return 0
  let longest = 1
  let current = 1
  for (let i = 1; i < loggedDates.length; i++) {
    const diff = daysBetween(loggedDates[i - 1], loggedDates[i])
    current = diff === 1 ? current + 1 : 1
    if (current > longest) longest = current
  }
  return longest
}

const HEATMAP_WEEKS = 14

function StreakDetail({ loggedDates, currentStreak, onBack }) {
  const loggedSet = useMemo(() => new Set(loggedDates), [loggedDates])
  const longestStreak = useMemo(() => computeLongestStreak(loggedDates), [loggedDates])
  const totalDays = loggedDates.length

  const weeks = useMemo(() => {
    const totalCells = HEATMAP_WEEKS * 7
    const days = []
    const today = new Date()
    for (let i = totalCells - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = getDateKey(d)
      days.push({ key, logged: loggedSet.has(key) })
    }
    const chunks = []
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7))
    return chunks
  }, [loggedSet])

  return (
    <div className="space-y-5 animate-scale-in">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Back
      </button>

      <div>
        <h3 className="text-white font-semibold text-lg">Logging Streak</h3>
        <p className="text-xs text-gray-500 mt-0.5">{totalDays} days logged total</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400 tabular-nums">{currentStreak}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Current</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{longestStreak}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Longest</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{totalDays}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Total days</p>
        </div>
      </div>

      <div className="bg-surface-2 rounded-2xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Last {HEATMAP_WEEKS} Weeks</p>
        <div className="flex gap-1 justify-between overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((d) => (
                <div key={d.key} title={d.key} className={`w-3 h-3 rounded-sm ${d.logged ? 'bg-amber-400' : 'bg-surface-3'}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
          <div className="w-2.5 h-2.5 rounded-sm bg-surface-3" /> No log
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-400 ml-2" /> Logged
        </div>
      </div>
    </div>
  )
}

const BMI_CATEGORIES = [
  { max: 18.5, label: 'Underweight', color: 'text-amber-400' },
  { max: 25, label: 'Normal', color: 'text-emerald-400' },
  { max: 30, label: 'Overweight', color: 'text-amber-400' },
  { max: Infinity, label: 'Obese', color: 'text-red-400' },
]
function bmiCategoryFor(bmi) {
  return BMI_CATEGORIES.find((c) => bmi < c.max) || BMI_CATEGORIES[BMI_CATEGORIES.length - 1]
}

function BMIDetail({ weightLog, heightCm, currentWeight, onBack }) {
  const heightM = heightCm / 100
  const entries = useMemo(() => {
    if (weightLog.length > 0) {
      return weightLog.map((e) => ({ date: e.date, bmi: Math.round((e.weight / (heightM * heightM)) * 10) / 10 }))
    }
    return [{ date: getDateKey(), bmi: Math.round((currentWeight / (heightM * heightM)) * 10) / 10 }]
  }, [weightLog, heightM, currentWeight])

  const last = entries[entries.length - 1]
  const first = entries[0]
  const change = Math.round((last.bmi - first.bmi) * 10) / 10
  const cat = bmiCategoryFor(last.bmi)

  const minB = Math.min(...entries.map((e) => e.bmi), 18.5) - 0.5
  const maxB = Math.max(...entries.map((e) => e.bmi), 30) + 0.5
  const range = maxB - minB || 1
  const yFor = (bmi) => 40 - ((bmi - minB) / range) * 40
  const dateLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="space-y-5 animate-scale-in">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Back
      </button>

      <div>
        <h3 className="text-white font-semibold text-lg">BMI Trend</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {weightLog.length > 0 ? `Based on ${entries.length} weight entries` : 'Log weight entries to track BMI over time'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{last.bmi}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Current</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className={`text-lg font-bold tabular-nums ${change < 0 ? 'text-emerald-400' : change > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {change > 0 ? '+' : ''}{change}
          </p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Change</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className={`text-sm font-bold tabular-nums ${cat.color}`}>{cat.label}</p>
          <p className="text-[9px] text-gray-500 uppercase mt-0.5">Category</p>
        </div>
      </div>

      <div className="bg-surface-2 rounded-2xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">BMI Progression</p>
        <p className="text-[10px] text-gray-600 mb-2">Dashed lines mark Normal range (18.5–25)</p>
        <div className="relative" style={{ height: '180px', paddingLeft: '28px' }}>
          <span className="absolute left-0 top-0 text-[9px] text-gray-500 tabular-nums">{Math.round(maxB * 10) / 10}</span>
          <span className="absolute left-0 text-[9px] text-gray-500 tabular-nums" style={{ top: 'calc(50% - 6px)' }}>{Math.round((minB + range / 2) * 10) / 10}</span>
          <span className="absolute left-0 text-[9px] text-gray-500 tabular-nums" style={{ bottom: '22px' }}>{Math.round(minB * 10) / 10}</span>

          {(() => {
            const bmiVals = entries.map((e) => e.bmi)
            const pts = toChartPoints(bmiVals, { width: 100, height: 40, padding: 2.5 })
            return (
              <svg viewBox="0 0 100 40" className="absolute" style={{ left: '28px', right: 0, top: 0, height: 'calc(100% - 20px)' }} preserveAspectRatio="none">
                <defs><ChartGradient id="bmiGrad" color="#818cf8" /></defs>
                {[0, 50, 100].map((y) => (
                  <line key={y} x1="0" x2="100" y1={y * 0.4} y2={y * 0.4} stroke="oklch(0.22 0.01 260)" strokeWidth="0.3" />
                ))}
                {[18.5, 25].map((threshold) => threshold >= minB && threshold <= maxB && (
                  <line key={threshold} x1="0" x2="100" y1={yFor(threshold)} y2={yFor(threshold)} stroke="#6b7280" strokeWidth="0.4" strokeDasharray="2,2" />
                ))}
                <path d={smoothAreaPath(pts, 40)} fill="url(#bmiGrad)" />
                <path d={smoothPath(pts)} fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
                {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill="#818cf8" stroke="#1a1a2e" strokeWidth="0.6" />)}
              </svg>
            )
          })()}

          {entries.map((e, i) => {
            const isEdge = i === 0 || i === entries.length - 1
            if (entries.length > 12 && !isEdge) return null
            const x = (i / Math.max(1, entries.length - 1)) * 100
            const yFrac = yFor(e.bmi) / 40
            const showBelow = yFrac < 0.2
            return (
              <div key={i} className="absolute text-center pointer-events-none" style={{
                left: `calc(28px + (100% - 28px) * ${x / 100})`,
                top: `calc((100% - 20px) * ${yFrac} ${showBelow ? '+ 6px' : '- 16px'})`,
                transform: 'translateX(-50%)', width: '44px',
              }}>
                <p className="text-[10px] font-semibold text-white leading-tight tabular-nums">{e.bmi}</p>
              </div>
            )
          })}

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
    </div>
  )
}

export default function Home({ profile, onSelectDay, onGoToday }) {
  const todayKey = getDateKey()
  const [viewingWeightDetail, setViewingWeightDetail] = useState(false)
  const [viewingStreakDetail, setViewingStreakDetail] = useState(false)
  const [viewingBMIDetail, setViewingBMIDetail] = useState(false)

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

  if (viewingStreakDetail) {
    return (
      <div className="min-h-screen bg-surface-1 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <StreakDetail loggedDates={getLoggedDates()} currentStreak={streak} onBack={() => setViewingStreakDetail(false)} />
        </div>
      </div>
    )
  }

  if (viewingBMIDetail) {
    return (
      <div className="min-h-screen bg-surface-1 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <BMIDetail weightLog={weightLog} heightCm={profile.heightCm} currentWeight={profile.weightKg} onBack={() => setViewingBMIDetail(false)} />
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
                onClick={() => setViewingStreakDetail(true)}
              />
              <QuickStat
                label="BMI"
                value={bmi}
                sub={bmiCategory}
                color={bmiColor}
                onClick={() => setViewingBMIDetail(true)}
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
