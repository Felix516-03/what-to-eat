import {
  appendHistory,
  getAllShops,
  getColdPalace,
  getHistory,
  getRatings
} from "../utils/storage.js"

export { getHistory, getRatings, saveRating } from "../utils/storage.js"


// 根据当前时间判断饭点
export function getMealInfo(date = new Date()) {

  const hour = date.getHours()

  if (hour < 10) {
    return {
      greeting: "早上好！",
      mealType: "早餐"
    }
  }

  if (hour < 14) {
    return {
      greeting: "中午好！",
      mealType: "午餐"
    }
  }

  if (hour < 18) {
    return {
      greeting: "下午好！",
      mealType: "晚餐"
    }
  }

  return {
    greeting: "晚上好！",
    mealType: "晚餐"
  }
}


// 保存“就它了”
export function saveChoice(shop) {
  const meal = getMealInfo()

  appendHistory({
    id: Date.now(),
    shopId: shop.id,
    shopName: shop.name,
    category: shop.category,
    location: shop.location || "",
    mealType: meal.mealType,
    time: new Date().toISOString()
  })
}


// 评分转换成概率倍率
function getRatingFactor(shopId, ratings) {
  const savedScore = ratings[shopId]

  if (savedScore === undefined) {
    return 1
  }

  const score = Number(savedScore)

  if (score === 5) return 1.5

  if (score === 4) return 1.3

  if (score === 3) return 1.0

  if (score === 2) return 0.75

  if (score === 1) return 0.5

  if (score === 0) return 0.1

  return 1
}


// 最近吃过的店降低概率
function getRecentFactor(shopId, history, now = new Date()) {
  const records = history
    .filter(item => String(item.shopId) === String(shopId))
    .sort(
      (a, b) =>
        new Date(b.time) - new Date(a.time)
    )

  if (records.length === 0) {
    return 1
  }

  const lastTime =
    new Date(records[0].time)

  const hours =
    (now - lastTime) /
    (1000 * 60 * 60)


  // 半天内刚吃过
  if (hours < 12) return 0.2

  // 昨天左右
  if (hours < 36) return 0.5

  // 两三天内
  if (hours < 72) return 0.75

  // 一周以内
  if (hours < 168) return 0.9

  return 1
}


// 自定义新店只在第一次真正宠幸前获得轻量探索奖励。
export function getExploreFactor(shop, history) {
  if (shop.source !== "custom") return 1

  const hasBeenChosen = history.some(
    record => String(record.shopId) === String(shop.id)
  )

  return hasBeenChosen ? 1 : 1.3
}


// 最终权重；同一次 lottery 共用已读取的 history / ratings。
export function calculateWeight(shop, history, ratings, now = new Date()) {
  return (
    (Number(shop.baseWeight) || 1) *
    getExploreFactor(shop, history) *
    getRatingFactor(shop.id, ratings) *
    getRecentFactor(shop.id, history, now)
  )
}


// 业务合法池：分类过滤后永久排除冷宫店铺。
export function getEligibleShops({ category = null } = {}) {
  let pool = getAllShops()

  if (category) {
    pool = pool.filter(shop => shop.category === category)
  }

  const coldPalaceIds = new Set(
    getColdPalace().map(item => String(item.shopId))
  )

  return pool.filter(
    shop => !coldPalaceIds.has(String(shop.id))
  )
}


// 本轮候选池：excludeIds 耗尽当前合法池时，只重开本轮池，不恢复冷宫店铺。
export function getCandidatePool({
  category = null,
  excludeIds = []
} = {}) {
  const pool = getEligibleShops({ category })
  const excluded = new Set(excludeIds.map(id => String(id)))
  const available = pool.filter(shop => !excluded.has(String(shop.id)))

  return available.length > 0 ? available : pool
}


// 抽卡
export function lottery({
  category = null,
  excludeIds = []
} = {}) {
  const available = getCandidatePool({ category, excludeIds })

  if (available.length === 0) {
    return null
  }

  const history = getHistory()
  const ratings = getRatings()
  const now = new Date()

  const weighted = available.map(shop => ({
    shop,
    weight: calculateWeight(shop, history, ratings, now)
  }))


  const totalWeight =
    weighted.reduce(
      (sum, item) =>
        sum + item.weight,
      0
    )


  let random =
    Math.random() * totalWeight


  for (const item of weighted) {

    random -= item.weight

    if (random <= 0) {
      return item.shop
    }

  }


  return weighted[weighted.length - 1].shop
}
