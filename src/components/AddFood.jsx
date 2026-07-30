import { useState, useRef } from 'react'
import { analyzeNutritionLabel, analyzeFoodPhoto } from '../utils/ai'
import { getFoodLibrary, saveFoodToLibrary } from '../utils/storage'
import { NUTRIENTS } from '../utils/constants'

function FoodHistoryList({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const library = getFoodLibrary().sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
  const filtered = library.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Food History</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>
      <input
        type="text"
        placeholder="Search saved foods..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          {library.length === 0 ? 'No saved foods yet. Add your first food!' : 'No matches found.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((food) => (
            <button
              key={food.id}
              onClick={() => onSelect(food)}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 text-left transition"
            >
              <p className="text-white font-medium">{food.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {food.nutrients.calories} cal | P: {food.nutrients.protein}g | C: {food.nutrients.carbs}g | F: {food.nutrients.fat}g
              </p>
              <p className="text-xs text-gray-500">per serving ({food.servingSize})</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const UNIT_LABELS = { g: 'grams', ml: 'ml', oz: 'oz', pieces: 'pcs', serving: 'servings' }
const UNIT_STEPS = { g: 10, ml: 10, oz: 0.5, pieces: 1, serving: 0.25 }

function ServingAdjuster({ food, onConfirm, onBack, confirmLabel }) {
  const hasUnit = food.servingUnit && food.servingUnitAmount
  const [inputMode, setInputMode] = useState('servings') // 'servings' or 'unit'
  const [servings, setServings] = useState(1)
  const [unitQty, setUnitQty] = useState(food.servingUnitAmount || 100)

  const unitLabel = hasUnit ? (UNIT_LABELS[food.servingUnit] || food.servingUnit) : 'g'
  const unitStep = hasUnit ? (UNIT_STEPS[food.servingUnit] || 1) : 10

  // Calculate multiplier based on input mode
  const multiplier = inputMode === 'servings'
    ? servings
    : hasUnit ? unitQty / food.servingUnitAmount : 1

  const adjusted = {}
  for (const [key, val] of Object.entries(food.nutrients)) {
    adjusted[key] = val != null ? Math.round(val * multiplier * 10) / 10 : null
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">&larr; Back</button>
      <h3 className="text-lg font-semibold text-white">{food.name}</h3>
      <p className="text-sm text-gray-400">
        Per serving: {food.servingSize}
        {food.servingWeightG && ` (${food.servingWeightG}g)`}
      </p>

      {/* Input mode toggle */}
      {hasUnit && (
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setInputMode('servings')}
            className={`flex-1 py-2 text-sm transition ${
              inputMode === 'servings' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >Servings</button>
          <button
            onClick={() => setInputMode('unit')}
            className={`flex-1 py-2 text-sm transition ${
              inputMode === 'unit' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >{unitLabel}</button>
        </div>
      )}

      {inputMode === 'servings' ? (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">How many servings?</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setServings(Math.max(0.1, +(servings - 0.25).toFixed(2)))}
              className="w-10 h-10 rounded-lg bg-gray-800 text-white text-xl hover:bg-gray-700"
            >-</button>
            <input
              type="number"
              value={servings}
              onChange={(e) => setServings(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              step="0.1"
              min="0.1"
              className="w-24 text-center p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
            />
            <button
              onClick={() => setServings(+(servings + 0.25).toFixed(2))}
              className="w-10 h-10 rounded-lg bg-gray-800 text-white text-xl hover:bg-gray-700"
            >+</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm text-gray-400">How much ({unitLabel})?</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUnitQty(Math.max(unitStep, +(unitQty - unitStep).toFixed(1)))}
              className="w-10 h-10 rounded-lg bg-gray-800 text-white text-xl hover:bg-gray-700"
            >-</button>
            <input
              type="number"
              value={unitQty}
              onChange={(e) => setUnitQty(Math.max(1, parseFloat(e.target.value) || 1))}
              step={unitStep}
              min="1"
              className="w-24 text-center p-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
            />
            <button
              onClick={() => setUnitQty(+(unitQty + unitStep).toFixed(1))}
              className="w-10 h-10 rounded-lg bg-gray-800 text-white text-xl hover:bg-gray-700"
            >+</button>
            <span className="text-gray-400 text-sm">{unitLabel}</span>
          </div>
          <p className="text-xs text-gray-500">= {multiplier.toFixed(2)} servings</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 space-y-2">
        <p className="text-white font-medium">{Math.round(adjusted.calories)} calories</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-blue-400">P: {adjusted.protein}g</div>
          <div className="text-yellow-400">C: {adjusted.carbs}g</div>
          <div className="text-orange-400">F: {adjusted.fat}g</div>
        </div>
        {NUTRIENTS.slice(4).map(({ key, label, unit }) =>
          adjusted[key] != null ? (
            <div key={key} className="flex justify-between text-xs text-gray-400">
              <span>{label}</span>
              <span>{adjusted[key]}{unit}</span>
            </div>
          ) : null
        )}
      </div>

      <button
        onClick={() => onConfirm({ ...food, servings: multiplier, nutrients: adjusted })}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition"
      >
        {confirmLabel || 'Add to Meal'}
      </button>
    </div>
  )
}

// Multi-item picker from a meal photo — lets you toggle items on/off and adjust each
function MultiItemPicker({ items, onConfirm, onBack }) {
  const [selected, setSelected] = useState(() => items.map(() => true))
  const [servingsMap, setServingsMap] = useState(() => items.map(() => 1))

  const toggleItem = (i) => {
    setSelected((s) => s.map((v, j) => (j === i ? !v : v)))
  }

  const updateServings = (i, val) => {
    setServingsMap((s) => s.map((v, j) => (j === i ? Math.max(0.25, val) : v)))
  }

  const getAdjusted = (item, servings) => {
    const adj = {}
    for (const [key, val] of Object.entries(item.nutrients)) {
      adj[key] = val != null ? Math.round(val * servings * 10) / 10 : null
    }
    return adj
  }

  const handleConfirm = () => {
    const foods = items
      .map((item, i) => {
        if (!selected[i]) return null
        const nutrients = getAdjusted(item, servingsMap[i])
        return {
          ...item,
          servings: servingsMap[i],
          nutrients,
          logId: `log_${Date.now()}_${i}`,
          loggedAt: Date.now(),
        }
      })
      .filter(Boolean)
    onConfirm(foods)
  }

  const totalCal = items.reduce(
    (sum, item, i) => sum + (selected[i] ? Math.round((item.nutrients.calories || 0) * servingsMap[i]) : 0),
    0
  )

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">&larr; Back</button>
      <h3 className="text-lg font-semibold text-white">Items Found</h3>
      <p className="text-sm text-gray-400">Toggle items and adjust portions</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.map((item, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border transition ${
              selected[i] ? 'bg-gray-800 border-blue-500/50' : 'bg-gray-800/50 border-gray-700 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <button onClick={() => toggleItem(i)} className="flex items-center gap-2 text-left flex-1">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  selected[i] ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                }`}>
                  {selected[i] && <span className="text-white text-xs">&#10003;</span>}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.estimatedServingSize} | {item.nutrients.calories} cal</p>
                </div>
              </button>
            </div>
            {selected[i] && (
              <div className="flex items-center gap-2 mt-2 ml-7">
                <span className="text-xs text-gray-400">Qty:</span>
                <button onClick={() => updateServings(i, servingsMap[i] - 0.5)}
                  className="w-7 h-7 rounded bg-gray-700 text-white text-sm hover:bg-gray-600">-</button>
                <span className="text-white text-sm w-8 text-center">{servingsMap[i]}</span>
                <button onClick={() => updateServings(i, servingsMap[i] + 0.5)}
                  className="w-7 h-7 rounded bg-gray-700 text-white text-sm hover:bg-gray-600">+</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{items.filter((_, i) => selected[i]).length} items selected</span>
        <span className="text-white font-medium">{totalCal} cal total</span>
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected.some(Boolean)}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition disabled:opacity-50"
      >
        Add All to Meal
      </button>
    </div>
  )
}

export default function AddFood({ mealType, keys, onAdd, onClose }) {
  const [mode, setMode] = useState('choose') // choose | history | adjust | multi | added
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scannedFood, setScannedFood] = useState(null)
  const [multiItems, setMultiItems] = useState([])
  const [addedCount, setAddedCount] = useState(0)
  const fileRef = useRef(null)

  const resetForAnother = () => {
    setScannedFood(null)
    setMultiItems([])
    setError('')
    setMode('choose')
    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

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
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        // Get base64 without the data:image/jpeg;base64, prefix
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl.split(',')[1])
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleCapture = async (e, isLabel) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const base64 = await compressImage(file)

      if (isLabel) {
        const result = await analyzeNutritionLabel(keys, base64)
        const food = {
          id: `food_${Date.now()}`,
          name: result.name || 'Unknown Food',
          servingSize: result.servingSize || '1 serving',
          servingWeightG: result.servingWeightG || null,
          servingVolumeML: result.servingVolumeML || null,
          servingUnit: result.servingUnit || 'serving',
          servingUnitAmount: result.servingUnitAmount || 1,
          nutrients: result.nutrients,
          source: 'label',
        }
        saveFoodToLibrary(food)
        setScannedFood(food)
        setMode('adjust')
      } else {
        const result = await analyzeFoodPhoto(keys, base64)
        const items = (result.items || []).map((item, i) => ({
          id: `food_${Date.now()}_${i}`,
          name: item.name || 'Unknown Item',
          servingSize: item.estimatedServingSize || '1 serving',
          estimatedServingSize: item.estimatedServingSize || '1 serving',
          servingWeightG: item.servingWeightG || null,
          servingUnit: item.servingUnit || 'g',
          servingUnitAmount: item.servingUnitAmount || item.servingWeightG || 100,
          nutrients: item.nutrients,
          confidence: item.confidence,
          source: 'photo',
        }))
        // Save each item to library
        items.forEach((item) => saveFoodToLibrary(item))

        if (items.length === 1) {
          setScannedFood(items[0])
          setMode('adjust')
        } else if (items.length > 1) {
          setMultiItems(items)
          setMode('multi')
        } else {
          setError('Could not identify any food items in the photo')
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image')
    } finally {
      setLoading(false)
    }
  }

  const handleHistorySelect = (food) => {
    setScannedFood(food)
    setMode('adjust')
  }

  const handleConfirmSingle = (foodWithServings) => {
    onAdd({
      ...foodWithServings,
      logId: `log_${Date.now()}`,
      loggedAt: Date.now(),
    })
    setAddedCount((c) => c + 1)
    setMode('added')
  }

  const handleConfirmMulti = (foods) => {
    foods.forEach((food) => onAdd(food))
    setAddedCount((c) => c + foods.length)
    setMode('added')
  }

  // "Added" confirmation with "Add Another" option
  if (mode === 'added') {
    return (
      <div className="bg-gray-900 rounded-xl p-5 space-y-4 text-center">
        <div className="text-green-400 text-4xl">&#10003;</div>
        <p className="text-white font-medium">
          {addedCount} item{addedCount !== 1 ? 's' : ''} added to {mealType}
        </p>
        <div className="flex gap-3">
          <button
            onClick={resetForAnother}
            className="flex-1 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition"
          >
            Add Another
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'multi' && multiItems.length > 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <MultiItemPicker
          items={multiItems}
          onConfirm={handleConfirmMulti}
          onBack={resetForAnother}
        />
      </div>
    )
  }

  if (mode === 'adjust' && scannedFood) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <ServingAdjuster
          food={scannedFood}
          onConfirm={handleConfirmSingle}
          onBack={resetForAnother}
        />
      </div>
    )
  }

  if (mode === 'history') {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <FoodHistoryList
          onSelect={handleHistorySelect}
          onClose={() => setMode('choose')}
        />
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white capitalize">Add to {mealType}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>

      {addedCount > 0 && (
        <p className="text-sm text-green-400">{addedCount} item{addedCount !== 1 ? 's' : ''} added so far</p>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 max-h-48 overflow-y-auto">
          <p className="text-red-400 text-sm whitespace-pre-wrap break-all">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 mt-3 text-sm">Analyzing your food...</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            onClick={() => {
              fileRef.current.dataset.mode = 'label'
              fileRef.current.click()
            }}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 text-left transition"
          >
            <p className="text-white font-medium">Scan Nutrition Label</p>
            <p className="text-xs text-gray-400 mt-1">Take a photo of the nutrition facts</p>
          </button>

          <button
            onClick={() => {
              fileRef.current.dataset.mode = 'photo'
              fileRef.current.click()
            }}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-green-500 text-left transition"
          >
            <p className="text-white font-medium">Snap Food Photo</p>
            <p className="text-xs text-gray-400 mt-1">AI identifies each item on your plate</p>
          </button>

          <button
            onClick={() => setMode('history')}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-purple-500 text-left transition"
          >
            <p className="text-white font-medium">Pick from History</p>
            <p className="text-xs text-gray-400 mt-1">Re-add a previously logged food</p>
          </button>
        </div>
      )}

      {addedCount > 0 && (
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-400 hover:text-white transition"
        >
          Done adding
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleCapture(e, fileRef.current.dataset.mode === 'label')}
      />
    </div>
  )
}
