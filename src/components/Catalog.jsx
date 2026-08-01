import { useState } from 'react'
import { getFoodLibrary, removeFoodFromLibrary, updateFoodInLibrary, getExerciseLibrary, removeExerciseFromLibrary, updateExerciseInLibrary } from '../utils/storage'

function EditableField({ label, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input type="text" value={val} onChange={(e) => setVal(e.target.value)}
          className="w-20 p-1 text-xs rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
          autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { onSave(val); setEditing(false) } }} />
        <button onClick={() => { onSave(val); setEditing(false) }} className="text-[10px] text-emerald-400">ok</button>
      </div>
    )
  }
  return (
    <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-white transition">
      {label}: <span className="text-gray-300">{value ?? '-'}</span>
    </button>
  )
}

export function FoodCatalog({ onClose }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(getFoodLibrary())

  const filtered = items
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))

  const handleDelete = (id) => {
    removeFoodFromLibrary(id)
    setItems(getFoodLibrary())
  }

  const handleUpdate = (id, field, value) => {
    if (field.startsWith('nutrients.')) {
      const nutrientKey = field.split('.')[1]
      const item = items.find((f) => f.id === id)
      if (item) {
        const updated = { ...item.nutrients, [nutrientKey]: parseFloat(value) || 0 }
        updateFoodInLibrary(id, { nutrients: updated })
      }
    } else {
      updateFoodInLibrary(id, { [field]: value })
    }
    setItems(getFoodLibrary())
  }

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <h2 className="text-white font-medium">Food Catalog</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
        <input type="text" placeholder="Search foods..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-brand-400 focus:outline-none" />

        <p className="text-xs text-gray-500">{items.length} items saved</p>

        {filtered.map((food) => (
          <div key={food.id} className="bg-surface-2 rounded-xl p-4 space-y-2 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{food.name}</p>
                  {food.isSupplement && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">supp</span>}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {food.servingSize} | {food.source || 'manual'}
                </p>
              </div>
              <button onClick={() => { if (confirm(`Delete "${food.name}"?`)) handleDelete(food.id) }}
                className="text-gray-600 hover:text-red-400 p-1 transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2m-7 5v6m4-6v6M5 6l1 14h12l1-14"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { k: 'calories', l: 'Cal' },
                { k: 'protein', l: 'Prot', u: 'g' },
                { k: 'carbs', l: 'Carb', u: 'g' },
                { k: 'fat', l: 'Fat', u: 'g' },
              ].map((m) => (
                <div key={m.k}>
                  <EditableField
                    label={m.l}
                    value={food.nutrients?.[m.k] != null ? `${Math.round(food.nutrients[m.k])}${m.u || ''}` : '-'}
                    onSave={(v) => handleUpdate(food.id, `nutrients.${m.k}`, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">
            {items.length === 0 ? 'No foods saved yet' : 'No matches'}
          </p>
        )}
      </div>
    </div>
  )
}

export function ExerciseCatalog({ onClose }) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(getExerciseLibrary())

  const filtered = items
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))

  const handleDelete = (id) => {
    removeExerciseFromLibrary(id)
    setItems(getExerciseLibrary())
  }

  return (
    <div className="min-h-screen bg-surface-1 pb-24">
      <div className="sticky top-0 glass border-b border-white/5 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <h2 className="text-white font-medium">Exercise Catalog</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-3">
        <input type="text" placeholder="Search exercises..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-brand-400 focus:outline-none" />

        <p className="text-xs text-gray-500">{items.length} exercises saved</p>

        {filtered.map((ex) => (
          <div key={ex.id} className="bg-surface-2 rounded-xl p-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {ex.type && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      ex.type === 'strength' ? 'bg-blue-500/15 text-blue-400' :
                      ex.type === 'cardio' ? 'bg-emerald-500/15 text-emerald-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>{ex.type}</span>
                  )}
                  {ex.equipment && <span className="text-[10px] text-gray-500">{ex.equipment}</span>}
                  {(ex.muscleGroups || []).map((mg) => (
                    <span key={mg} className="text-[10px] text-gray-600">{mg}</span>
                  ))}
                </div>
                {ex.defaultParams && Object.keys(ex.defaultParams).length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Last: {Object.entries(ex.defaultParams).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </p>
                )}
              </div>
              <button onClick={() => { if (confirm(`Delete "${ex.name}"?`)) handleDelete(ex.id) }}
                className="text-gray-600 hover:text-red-400 p-1 transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2m-7 5v6m4-6v6M5 6l1 14h12l1-14"/></svg>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">
            {items.length === 0 ? 'No exercises saved yet' : 'No matches'}
          </p>
        )}
      </div>
    </div>
  )
}
