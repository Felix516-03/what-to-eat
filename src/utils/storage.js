import officialShops from "../data/shops.js"

const HISTORY_KEY = "wte_history"
const RATINGS_KEY = "wte_ratings"
const COLD_PALACE_KEY = "wte_cold_palace"
const CUSTOM_SHOPS_KEY = "wte_custom_shops"
const CUSTOM_SHOPS_CHANGED_EVENT = "wte:custom-shops-changed"

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

function sameShopId(left, right) {
  return String(left) === String(right)
}

function notifyCustomShopsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOM_SHOPS_CHANGED_EVENT))
  }
}

function writeCustomShops(customShops) {
  localStorage.setItem(CUSTOM_SHOPS_KEY, JSON.stringify(customShops))
  notifyCustomShopsChanged()
  return customShops
}

function normalizeCustomShop(shop) {
  if (
    !shop ||
    shop.id == null ||
    typeof shop.name !== "string" ||
    typeof shop.location !== "string" ||
    typeof shop.category !== "string"
  ) return null

  const name = shop.name.trim()
  const location = shop.location.trim()
  const category = shop.category.trim()
  if (!name || !location || !category) return null

  return {
    ...shop,
    id: String(shop.id),
    name,
    location,
    category,
    baseWeight: 1,
    source: "custom",
    createdAt: typeof shop.createdAt === "string" ? shop.createdAt : ""
  }
}

export function createCustomShopId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `custom_${crypto.randomUUID()}`
  }

  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function getCustomShops() {
  const stored = readJson(CUSTOM_SHOPS_KEY, [])
  if (!Array.isArray(stored)) return []

  const seen = new Set()
  return stored
    .map(normalizeCustomShop)
    .filter(shop => {
      if (!shop || seen.has(shop.id)) return false
      seen.add(shop.id)
      return true
    })
}

export function getAllShops() {
  const official = officialShops.map(shop => ({
    ...shop,
    source: shop.source || "official"
  }))

  return [...official, ...getCustomShops()]
}

export function addCustomShop(input) {
  const customShops = getCustomShops()
  const occupiedIds = new Set(
    [...officialShops, ...customShops].map(shop => String(shop.id))
  )
  let id = createCustomShopId()
  while (occupiedIds.has(id)) id = createCustomShopId()
  const shop = normalizeCustomShop({
    ...input,
    id,
    baseWeight: 1,
    source: "custom",
    createdAt: new Date().toISOString()
  })

  if (!shop) return null
  writeCustomShops([...customShops, shop])
  return shop
}

export function normalizeShopIdentity(shop) {
  return [shop?.name, shop?.location]
    .map(value => String(value || "").trim().toLowerCase())
    .join("\n")
}

export function findMatchingShop(input, shops = getAllShops()) {
  const identity = normalizeShopIdentity(input)
  if (identity === "\n") return null
  return shops.find(shop => normalizeShopIdentity(shop) === identity) || null
}

export function addRecommendedShop(input) {
  const normalized = {
    name: String(input?.name || "").trim(),
    location: String(input?.location || "").trim(),
    category: String(input?.category || "未分类").trim() || "未分类"
  }

  if (!normalized.name || !normalized.location) {
    return { status: "invalid", shop: null }
  }

  const existing = findMatchingShop(normalized)
  if (existing) return { status: "exists", shop: existing }

  const shop = addCustomShop(normalized)
  return shop
    ? { status: "added", shop }
    : { status: "invalid", shop: null }
}

export function updateCustomShop(id, updates) {
  let updatedShop = null
  const customShops = getCustomShops().map(shop => {
    if (!sameShopId(shop.id, id)) return shop

    updatedShop = normalizeCustomShop({
      ...shop,
      name: updates?.name ?? shop.name,
      location: updates?.location ?? shop.location,
      category: updates?.category ?? shop.category,
      id: shop.id,
      baseWeight: 1,
      source: "custom",
      createdAt: shop.createdAt
    })

    return updatedShop || shop
  })

  if (!updatedShop) return null
  writeCustomShops(customShops)
  return updatedShop
}

export function deleteCustomShop(id) {
  const customShops = getCustomShops()
  const remaining = customShops.filter(shop => !sameShopId(shop.id, id))
  if (remaining.length === customShops.length) return false

  // 历史是已经发生的事实，只清理当前偏好数据。
  const ratings = getRatings()
  delete ratings[id]
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings))

  const coldPalace = getColdPalace().filter(item => !sameShopId(item.shopId, id))
  localStorage.setItem(COLD_PALACE_KEY, JSON.stringify(coldPalace))
  writeCustomShops(remaining)
  return true
}

export function getHistory() {
  const history = readJson(HISTORY_KEY, [])
  return Array.isArray(history) ? history : []
}

export function appendHistory(record) {
  const history = getHistory()
  history.push(record)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function getRatings() {
  const ratings = readJson(RATINGS_KEY, {})
  return ratings && typeof ratings === "object" && !Array.isArray(ratings)
    ? ratings
    : {}
}

export function saveRating(shopId, score) {
  const normalizedScore = Number(score)

  if (
    shopId == null ||
    !Number.isInteger(normalizedScore) ||
    normalizedScore < 0 ||
    normalizedScore > 5
  ) {
    return
  }

  const ratings = getRatings()
  ratings[shopId] = normalizedScore
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings))
}

export function getColdPalace() {
  const stored = readJson(COLD_PALACE_KEY, [])

  if (!Array.isArray(stored)) return []

  const seen = new Set()

  return stored.filter(item => {
    if (!item || item.shopId == null) return false

    const key = String(item.shopId)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function isInColdPalace(shopId) {
  return getColdPalace().some(item => sameShopId(item.shopId, shopId))
}

export function addToColdPalace(shopId) {
  if (shopId == null) return getColdPalace()

  const coldPalace = getColdPalace()

  if (!coldPalace.some(item => sameShopId(item.shopId, shopId))) {
    coldPalace.push({
      shopId,
      addedAt: new Date().toISOString()
    })
    localStorage.setItem(COLD_PALACE_KEY, JSON.stringify(coldPalace))
  }

  return coldPalace
}

export function removeFromColdPalace(shopId) {
  const coldPalace = getColdPalace().filter(
    item => !sameShopId(item.shopId, shopId)
  )

  localStorage.setItem(COLD_PALACE_KEY, JSON.stringify(coldPalace))
  return coldPalace
}

export {
  COLD_PALACE_KEY,
  CUSTOM_SHOPS_CHANGED_EVENT,
  CUSTOM_SHOPS_KEY,
  HISTORY_KEY,
  RATINGS_KEY
}
