import { getAllShops } from "./storage.js"

function findShop(shopId, allShops) {
  return allShops.find(shop => String(shop.id) === String(shopId))
}

function safeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function mostCommon(values) {
  const counts = new Map()

  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "暂无"
}

export function normalizeHistoryRecord(record, allShops = getAllShops()) {
  const matchedShop = findShop(record?.shopId, allShops)
  const date = safeDate(record?.time)

  if (!record || !date) return null

  return {
    ...record,
    shopId: record.shopId ?? matchedShop?.id,
    shopName: matchedShop?.name || record.shopName || "未知店铺",
    category: matchedShop?.category || record.category || "未分类",
    location: matchedShop?.location || record.location || "位置未记录",
    date,
    timestamp: date.getTime()
  }
}

export function getMonthlyHistory(history, now = new Date(), allShops = getAllShops()) {
  return history
    .map(record => normalizeHistoryRecord(record, allShops))
    .filter(record => (
      record &&
      record.date.getFullYear() === now.getFullYear() &&
      record.date.getMonth() === now.getMonth()
    ))
}

export function getMonthlyShopStats(history, now = new Date(), allShops = getAllShops()) {
  const grouped = new Map()

  for (const record of getMonthlyHistory(history, now, allShops)) {
    const key = record.shopId == null
      ? `name:${record.shopName}`
      : `shop:${record.shopId}`

    if (!grouped.has(key)) {
      grouped.set(key, {
        shopId: record.shopId,
        name: record.shopName,
        category: record.category,
        location: record.location,
        count: 0,
        lastTime: record.timestamp
      })
    }

    const item = grouped.get(key)
    item.count += 1
    item.lastTime = Math.max(item.lastTime, record.timestamp)
  }

  return [...grouped.values()].sort(
    (a, b) => b.count - a.count || b.lastTime - a.lastTime
  )
}

export function getMonthlySummary(history, now = new Date(), allShops = getAllShops()) {
  const records = getMonthlyHistory(history, now, allShops)
  const shopStats = getMonthlyShopStats(history, now, allShops)

  return {
    total: records.length,
    shopCount: shopStats.length,
    favoriteCategory: mostCommon(records.map(record => record.category)),
    favoriteLocation: mostCommon(records.map(record => record.location)),
    topShops: shopStats.slice(0, 3)
  }
}

export function getFavoriteShops(ratings, history, now = new Date(), allShops = getAllShops()) {
  const monthlyByShop = new Map(
    getMonthlyShopStats(history, now, allShops).map(item => [String(item.shopId), item])
  )

  return allShops
    .map(shop => {
      const score = Number(ratings[shop.id])
      const monthly = monthlyByShop.get(String(shop.id))

      return {
        shopId: shop.id,
        name: shop.name,
        category: shop.category,
        location: shop.location || "位置未记录",
        score,
        count: monthly?.count || 0,
        lastTime: monthly?.lastTime || 0
      }
    })
    .filter(shop => shop.score >= 4 && shop.score <= 5)
    .sort((a, b) => (
      b.score - a.score ||
      b.count - a.count ||
      b.lastTime - a.lastTime
    ))
}

export function getRecentHistory(history, limit = 3, allShops = getAllShops()) {
  return history
    .map(record => normalizeHistoryRecord(record, allShops))
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}
