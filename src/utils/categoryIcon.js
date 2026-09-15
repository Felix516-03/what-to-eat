const exactCategoryIcons = {
  饭: "🍚",
  面: "🍜",
  粉: "🥣",
  炸鸡汉堡: "🍔",
  食堂: "🍽️",
  烧烤: "🍢",
  炸串: "🍡",
  卤味: "🍖",
  饺子: "🥟"
}

const keywordIcons = [
  [["炸鸡", "汉堡"], "🍔"],
  [["饺子", "馄饨", "抄手", "包子", "小笼包"], "🥟"],
  [["面包", "烘焙"], "🥐"],
  [["拉面", "小面", "拌面", "炒面", "意面", "面"], "🍜"],
  [["米线", "酸辣粉", "螺蛳粉", "河粉", "粉"], "🥣"],
  [["炒饭", "盖饭", "米饭", "饭", "便当", "套餐"], "🍚"],
  [["火锅", "麻辣烫", "冒菜", "汤锅"], "🍲"],
  [["炸串"], "🍡"],
  [["烧烤", "烤串", "串串"], "🍢"],
  [["卤味", "鸭脖", "卤菜"], "🍖"],
  [["披萨"], "🍕"],
  [["寿司", "日料"], "🍣"],
  [["蛋糕", "甜品", "甜点"], "🍰"],
  [["奶茶", "饮品", "果茶"], "🧋"],
  [["咖啡"], "☕"],
  [["粥"], "🥣"],
  [["沙拉", "轻食", "素食"], "🥗"],
  [["水果"], "🍎"],
  [["鱼", "海鲜"], "🐟"],
  [["鸡", "鸭", "鹅"], "🍗"],
  [["牛肉", "猪肉", "排骨", "肉"], "🥩"],
  [["餐厅", "食堂", "菜", "快餐"], "🍽️"]
]

export function getCategoryIcon(category) {
  const value = String(category || "").trim()
  if (!value) return "🍽️"
  if (exactCategoryIcons[value]) return exactCategoryIcons[value]

  const normalized = value.toLowerCase()
  const matched = keywordIcons.find(([keywords]) => (
    keywords.some(keyword => normalized.includes(keyword.toLowerCase()))
  ))

  return matched?.[1] || "🍽️"
}

export { exactCategoryIcons }
