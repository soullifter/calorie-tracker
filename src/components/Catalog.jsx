import { useState } from 'react'
import { NUTRIENTS } from '../utils/constants'
import {
  getFoodLibrary, removeFoodFromLibrary, updateFoodInLibrary, saveFoodToLibrary,
  getExerciseLibrary, removeExerciseFromLibrary, saveExerciseToLibrary,
} from '../utils/storage'
import { ExerciseDetail } from './ExerciseTrends'

export function FoodCatalog({ onClose }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(getFoodLibrary())
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newFood, setNewFood] = useState({ name: '', servingSize: '1 serving', nutrients: {} })

  const refresh = () => setItems(getFoodLibrary())

  const filtered = items
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))

  const handleDelete = (id) => {
    if (confirm('Delete this food?')) { removeFoodFromLibrary(id); refresh() }
  }

  const handleUpdateNutrient = (id, key, value) => {
    const item = items.find((f) => f.id === id)
    if (!item) return
    updateFoodInLibrary(id, { nutrients: { ...item.nutrients, [key]: parseFloat(value) || 0 } })
    refresh()
  }

  const handleAddNew = () => {
    if (!newFood.name.trim()) return
    saveFoodToLibrary({
      id: `food_${Date.now()}`,
      ...newFood,
      source: 'manual',
      servingUnit: 'serving',
      servingUnitAmount: 1,
    })
    setNewFood({ name: '', servingSize: '1 serving', nutrients: {} })
    setAdding(false)
    refresh()
  }

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <h2 className="text-white font-medium">Food Library</h2>
          <button onClick={() => setAdding(!adding)} className="text-brand-400 text-sm font-medium">
            {adding ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
        {/* Add new food form */}
        {adding && (
          <div className="bg-surface-2 rounded-xl p-4 space-y-3 animate-scale-in border border-brand-400/20">
            <h3 className="text-sm font-semibold text-white">Add New Food</h3>
            <input type="text" placeholder="Food name" value={newFood.name}
              onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-brand-400 focus:outline-none text-sm" />
            <input type="text" placeholder="Serving size (e.g. 1 cup, 100g)" value={newFood.servingSize}
              onChange={(e) => setNewFood({ ...newFood, servingSize: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none text-sm" />
            <div className="grid grid-cols-4 gap-2">
              {['calories', 'protein', 'carbs', 'fat'].map((k) => (
                <div key={k}>
                  <label className="text-[10px] text-gray-500 capitalize">{k}</label>
                  <input type="text" inputMode="decimal" placeholder="0"
                    value={newFood.nutrients[k] || ''}
                    onChange={(e) => setNewFood({ ...newFood, nutrients: { ...newFood.nutrients, [k]: e.target.value } })}
                    className="w-full p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none text-xs text-center" />
                </div>
              ))}
            </div>
            <button onClick={handleAddNew} disabled={!newFood.name.trim()}
              className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition disabled:opacity-50">
              Save to Library
            </button>
          </div>
        )}

        <input type="text" placeholder="Search foods..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-brand-400 focus:outline-none" />

        <p className="text-xs text-gray-500">{items.length} items saved</p>

        {filtered.map((food) => {
          const isExpanded = expandedId === food.id
          const n = food.nutrients || {}

          return (
            <div key={food.id} className="bg-surface-2 rounded-xl overflow-hidden animate-fade-in">
              <button
                onClick={() => setExpandedId(isExpanded ? null : food.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{food.name}</p>
                      {food.isSupplement && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">supp</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {food.servingSize} | {Math.round(n.calories || 0)} cal | P:{Math.round(n.protein || 0)}g C:{Math.round(n.carbs || 0)}g F:{Math.round(n.fat || 0)}g
                    </p>
                  </div>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 animate-scale-in">
                  <div className="bg-surface-3 rounded-xl p-3 space-y-2">
                    {/* All nutrients - editable */}
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Nutrients per serving (tap to edit)</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {NUTRIENTS.map(({ key, label, unit }) => {
                        const val = n[key]
                        if (val == null && !isExpanded) return null
                        return (
                          <div key={key} className="flex items-center justify-between py-1">
                            <span className="text-xs text-gray-400">{label}</span>
                            <input
                              type="text" inputMode="decimal"
                              defaultValue={val != null ? Math.round(val * 10) / 10 : ''}
                              placeholder="-"
                              onBlur={(e) => {
                                const v = parseFloat(e.target.value)
                                if (!isNaN(v)) handleUpdateNutrient(food.id, key, v)
                              }}
                              className="w-16 text-right p-1 text-xs rounded bg-gray-800 text-white border border-transparent hover:border-gray-700 focus:border-brand-400 focus:outline-none"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(food.id)}
                    className="w-full mt-2 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition">
                    Delete from Library
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">
            {items.length === 0 ? 'No foods saved yet. Tap + Add to create one.' : 'No matches'}
          </p>
        )}
      </div>
    </div>
  )
}

export function ExerciseCatalog({ onClose }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(getExerciseLibrary())
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newEx, setNewEx] = useState({ name: '', type: 'strength', equipment: '', muscleGroups: '' })
  const [viewingHistory, setViewingHistory] = useState(null)

  const refresh = () => setItems(getExerciseLibrary())

  const filtered = items
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))

  const handleDelete = (id) => {
    if (confirm('Delete this exercise?')) { removeExerciseFromLibrary(id); refresh() }
  }

  const handleAddNew = () => {
    if (!newEx.name.trim()) return
    saveExerciseToLibrary({
      id: `exlib_${Date.now()}`,
      name: newEx.name,
      type: newEx.type,
      equipment: newEx.equipment || null,
      muscleGroups: newEx.muscleGroups ? newEx.muscleGroups.split(',').map((s) => s.trim()).filter(Boolean) : [],
      fields: newEx.type === 'cardio'
        ? [{ key: 'duration', label: 'Duration', type: 'number', unit: 'min' }]
        : [
          { key: 'weight', label: 'Weight', type: 'number', unit: 'kg' },
          { key: 'sets', label: 'Sets', type: 'number' },
          { key: 'reps', label: 'Reps', type: 'number' },
        ],
      defaultParams: {},
    })
    setNewEx({ name: '', type: 'strength', equipment: '', muscleGroups: '' })
    setAdding(false)
    refresh()
  }

  if (viewingHistory) {
    return (
      <div className="min-h-screen bg-surface-1 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <ExerciseDetail exerciseName={viewingHistory} onBack={() => setViewingHistory(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <h2 className="text-white font-medium">Exercise Library</h2>
          <button onClick={() => setAdding(!adding)} className="text-emerald-400 text-sm font-medium">
            {adding ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
        {/* Add new exercise form */}
        {adding && (
          <div className="bg-surface-2 rounded-xl p-4 space-y-3 animate-scale-in border border-emerald-500/20">
            <h3 className="text-sm font-semibold text-white">Add New Exercise</h3>
            <input type="text" placeholder="Exercise name" value={newEx.name}
              onChange={(e) => setNewEx({ ...newEx, name: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 focus:outline-none text-sm" />
            <select value={newEx.type} onChange={(e) => setNewEx({ ...newEx, type: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none text-sm">
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="flexibility">Flexibility</option>
            </select>
            <input type="text" placeholder="Equipment (optional)" value={newEx.equipment}
              onChange={(e) => setNewEx({ ...newEx, equipment: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none text-sm" />
            <input type="text" placeholder="Muscle groups (comma separated)" value={newEx.muscleGroups}
              onChange={(e) => setNewEx({ ...newEx, muscleGroups: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none text-sm" />
            <button onClick={handleAddNew} disabled={!newEx.name.trim()}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-50">
              Save to Library
            </button>
          </div>
        )}

        <input type="text" placeholder="Search exercises..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-brand-400 focus:outline-none" />

        <p className="text-xs text-gray-500">{items.length} exercises saved</p>

        {filtered.map((ex) => {
          const isExpanded = expandedId === ex.id

          return (
            <div key={ex.id} className="bg-surface-2 rounded-xl overflow-hidden animate-fade-in">
              <button
                onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {ex.type && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          ex.type === 'strength' ? 'bg-blue-500/15 text-blue-400' :
                          ex.type === 'cardio' ? 'bg-emerald-500/15 text-emerald-400' :
                          ex.type === 'bodyweight' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-purple-500/15 text-purple-400'
                        }`}>{ex.type}</span>
                      )}
                      {ex.equipment && <span className="text-[10px] text-gray-500">{ex.equipment}</span>}
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 animate-scale-in">
                  <div className="bg-surface-3 rounded-xl p-3 space-y-2">
                    {/* Muscle groups */}
                    {(ex.muscleGroups || []).length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Muscle Groups</p>
                        <div className="flex flex-wrap gap-1">
                          {ex.muscleGroups.map((mg) => (
                            <span key={mg} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{mg}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fields */}
                    {(ex.fields || []).length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Input Fields</p>
                        <div className="space-y-1">
                          {ex.fields.map((f) => (
                            <p key={f.key} className="text-xs text-gray-400">
                              {f.label}{f.unit ? ` (${f.unit})` : ''}{f.type === 'select' ? ` — ${(f.options || []).join(', ')}` : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last used params */}
                    {ex.defaultParams && Object.keys(ex.defaultParams).length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Last Used</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ex.defaultParams).map(([k, v]) => (
                            <span key={k} className="text-xs text-gray-300 bg-gray-800 px-2 py-0.5 rounded">{k}: {v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setViewingHistory(ex.name)}
                    className="w-full mt-2 py-2 rounded-lg text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>
                    View History & Trends
                  </button>
                  <button onClick={() => handleDelete(ex.id)}
                    className="w-full mt-2 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition">
                    Delete from Library
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">
            {items.length === 0 ? 'No exercises saved yet. Tap + Add to create one.' : 'No matches'}
          </p>
        )}
      </div>
    </div>
  )
}
