<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"

import ConfirmModal from "../components/ConfirmModal.vue"
import CustomShopsManager from "../components/CustomShopsManager.vue"
import PrivacyPolicy from "../components/PrivacyPolicy.vue"
import ProfileModuleCard from "../components/ProfileModuleCard.vue"
import ShopPreferenceCard from "../components/ShopPreferenceCard.vue"
import {
  getFavoriteShops,
  getMonthlyShopStats,
  getMonthlySummary,
  getRecentHistory
} from "../utils/stats.js"
import {
  CUSTOM_SHOPS_CHANGED_EVENT,
  addToColdPalace,
  getAllShops,
  getColdPalace,
  getHistory,
  getRatings,
  isInColdPalace,
  removeFromColdPalace,
  saveRating
} from "../utils/storage.js"

const props = defineProps({
  now: { type: Date, default: () => new Date() }
})

defineEmits(["go-draw"])

const activeModule = ref("home")
const history = ref([])
const ratings = ref({})
const coldPalace = ref([])
const allShops = ref([])
const scoreValues = ref({})
const savedShopId = ref(null)
const pendingAction = ref(null)

let feedbackTimer = null

const monthlyShops = computed(() => getMonthlyShopStats(history.value, props.now, allShops.value))
const summary = computed(() => getMonthlySummary(history.value, props.now, allShops.value))
const favoriteShops = computed(() => getFavoriteShops(ratings.value, history.value, props.now, allShops.value))
const recentHistory = computed(() => getRecentHistory(history.value, 3, allShops.value))

const coldPalaceShops = computed(() => coldPalace.value
  .map(record => {
    const shop = allShops.value.find(item => String(item.id) === String(record.shopId))

    if (!shop) return null

    return {
      ...shop,
      location: shop.location || "位置未记录",
      addedAt: record.addedAt
    }
  })
  .filter(Boolean)
  .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)))

const overviewText = computed(() => {
  if (!summary.value.total) {
    return "这个月还没开饭，去抽一顿吧。"
  }

  return `本月已宠幸 ${summary.value.total} 次 · 吃过 ${summary.value.shopCount} 家 · 最常吃「${summary.value.favoriteCategory}」`
})

const moduleCards = computed(() => [
  {
    id: "monthly",
    icon: "🍚",
    title: "本月宠幸",
    meta: `本月 ${monthlyShops.value.length} 家`
  },
  {
    id: "favorites",
    icon: "❤️",
    title: "心头好",
    meta: `${favoriteShops.value.length} 家`
  },
  {
    id: "cold-palace",
    icon: "❄️",
    title: "冷宫",
    meta: `${coldPalaceShops.value.length} 家`
  },
  {
    id: "stats",
    icon: "📊",
    title: "宠幸统计",
    meta: `本月 ${summary.value.total} 次`
  }
])

const moduleTitle = computed(() => ({
  monthly: "本月宠幸",
  favorites: "心头好",
  "cold-palace": "冷宫",
  "custom-shops": "我的店铺",
  privacy: "隐私说明",
  stats: "宠幸统计"
})[activeModule.value] || "我的")

const moduleDescription = computed(() => ({
  monthly: "这个月真正选中过的味道。",
  favorites: "评分 4 分及以上，都是你认真偏爱的店。",
  "cold-palace": "被朕暂时遗忘的味道。",
  "custom-shops": "把你私藏的饭点，也加进抽卡池。",
  privacy: "了解哪些数据保存在本机，哪些会进入饭圈云端。",
  stats: "看看这个月的胃都去了哪里。"
})[activeModule.value] || "")

const modalOpen = computed(() => Boolean(pendingAction.value))
const modalTitle = computed(() => {
  if (pendingAction.value?.type === "remove") {
    return `确定让「${pendingAction.value.shop.name}」重获圣宠吗？`
  }

  return "要把它打入冷宫吗？"
})
const modalShopName = computed(() => (
  pendingAction.value?.type === "add" ? pendingAction.value.shop.name : ""
))
const modalDescription = computed(() => (
  pendingAction.value?.type === "remove"
    ? "移出后将恢复中性评分，并重新参与以后的抽卡。"
    : "打入冷宫后，\n以后抽卡将不会再抽到它。"
))
const modalCancelText = computed(() => (
  pendingAction.value?.type === "remove" ? "再关一阵" : "朕再想想"
))
const modalConfirmText = computed(() => (
  pendingAction.value?.type === "remove" ? "移出冷宫" : "确认"
))

function refreshData() {
  allShops.value = getAllShops()
  history.value = getHistory()
  ratings.value = getRatings()
  coldPalace.value = getColdPalace()

  const values = {}
  for (const shop of allShops.value) {
    const score = Number(ratings.value[shop.id])
    values[shop.id] = Number.isInteger(score) && score >= 0 && score <= 5 ? score : 3
  }
  scoreValues.value = values
}

function openModule(moduleId) {
  activeModule.value = moduleId
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function updateScore(shopId, score) {
  scoreValues.value[shopId] = Number(score)
}

function showSaved(shopId) {
  savedShopId.value = shopId
  window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    savedShopId.value = null
  }, 1100)
}

function commitRating(shop, score) {
  saveRating(shop.shopId, score)
  ratings.value = getRatings()
  showSaved(shop.shopId)

  if (score === 0 && !isInColdPalace(shop.shopId)) {
    pendingAction.value = { type: "add", shop }
  }
}

function requestRemoval(shop) {
  pendingAction.value = {
    type: "remove",
    shop: { ...shop, shopId: shop.id }
  }
}

function cancelModal() {
  pendingAction.value = null
}

function confirmModal() {
  const action = pendingAction.value
  if (!action) return

  if (action.type === "add") {
    coldPalace.value = addToColdPalace(action.shop.shopId)
  } else {
    removeFromColdPalace(action.shop.shopId)

    // 移出冷宫代表用户愿意重新考虑，因此恢复中性评分。
    saveRating(action.shop.shopId, 3)
    scoreValues.value[action.shop.shopId] = 3
    ratings.value = getRatings()
    coldPalace.value = getColdPalace()
  }

  pendingAction.value = null
}

function formatRecentTime(date) {
  const current = props.now
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round((today - target) / 86400000)
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

  if (dayDifference === 0) return `今天 ${time}`
  if (dayDifference === 1) return `昨天 ${time}`
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

function formatAddedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "时间未记录"

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
}

onMounted(() => {
  refreshData()
  window.addEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refreshData)
})

onUnmounted(() => {
  window.removeEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refreshData)
  window.clearTimeout(feedbackTimer)
})
</script>

<template>
  <div class="mine-page">
    <template v-if="activeModule === 'home'">
      <header class="profile-header">
        <h1>民以食为天>.<</h1>
        <p>认真吃饭，也认真记住喜欢的味道。</p>
        <div class="monthly-overview">{{ overviewText }}</div>
      </header>

      <section class="module-grid" aria-label="个人饮食模块">
        <ProfileModuleCard
          v-for="module in moduleCards"
          :key="module.id"
          :icon="module.icon"
          :title="module.title"
          :meta="module.meta"
          @open="openModule(module.id)"
        />Eat
      </section>

      <button class="custom-shops-entry" @click="openModule('custom-shops')">
        <span class="custom-entry-icon" aria-hidden="true">＋</span>
        <span>
          <strong>我的店铺</strong>
          <small>添加自己的店铺</small>
        </span>
        <span class="custom-entry-arrow" aria-hidden="true">›</span>
      </button>

      <button class="privacy-entry" @click="openModule('privacy')">
        <span class="privacy-entry-icon" aria-hidden="true">🛡️</span>
        <span>
          <strong>隐私说明</strong>
          <small>查看数据如何保存和使用</small>
        </span>
        <span class="custom-entry-arrow" aria-hidden="true">›</span>
      </button>

      <section class="recent-section">
        <div class="section-title-row">
          <div>
            <span class="eyebrow">最近记录</span>
            <h2>最近宠幸</h2>
          </div>
          <button v-if="recentHistory.length" @click="openModule('monthly')">查看本月</button>
        </div>

        <div v-if="recentHistory.length" class="recent-list">
          <article v-for="record in recentHistory" :key="record.id ?? record.timestamp" class="recent-item">
            <time>{{ formatRecentTime(record.date) }}</time>
            <strong>{{ record.shopName }}</strong>
            <span>{{ record.category }} · {{ record.location }}</span>
          </article>
        </div>

        <div v-else class="compact-empty">
          <span aria-hidden="true">🍽️</span>
          <p>还没有最近记录，今天先宠幸一家吧。</p>
          <button @click="$emit('go-draw')">去抽卡</button>
        </div>
      </section>
    </template>

    <template v-else>
      <header class="module-header">
        <button class="back-button" @click="activeModule = 'home'">← 我的</button>
        <h1>{{ moduleTitle }}</h1>
        <p>{{ moduleDescription }}</p>
      </header>

      <section v-if="activeModule === 'monthly'" class="module-content">
        <div v-if="monthlyShops.length" class="shop-list">
          <ShopPreferenceCard
            v-for="shop in monthlyShops"
            :key="shop.shopId ?? shop.name"
            :shop="shop"
            :score="scoreValues[shop.shopId]"
            :saved="savedShopId === shop.shopId"
            @update:score="updateScore(shop.shopId, $event)"
            @rate="commitRating(shop, $event)"
          />
        </div>
        <div v-else class="empty-state">
          <span aria-hidden="true">🍚</span>
          <h2>这个月还没宠幸过谁</h2>
          <p>去抽一张，把今天想吃的店收进这里。</p>
          <button @click="$emit('go-draw')">去抽卡</button>
        </div>
      </section>

      <section v-else-if="activeModule === 'favorites'" class="module-content">
        <div v-if="favoriteShops.length" class="shop-list">
          <ShopPreferenceCard
            v-for="shop in favoriteShops"
            :key="shop.shopId"
            :shop="shop"
            :score="scoreValues[shop.shopId]"
            :saved="savedShopId === shop.shopId"
            variant="favorite"
            @update:score="updateScore(shop.shopId, $event)"
            @rate="commitRating(shop, $event)"
          />
        </div>
        <div v-else class="empty-state">
          <span aria-hidden="true">❤️</span>
          <h2>还没有心头好</h2>
          <p>把喜欢的店评为 4 或 5 分，它就会出现在这里。</p>
        </div>
      </section>

      <section v-else-if="activeModule === 'cold-palace'" class="module-content">
        <div v-if="coldPalaceShops.length" class="cold-list">
          <article v-for="shop in coldPalaceShops" :key="shop.id" class="cold-card">
            <div class="cold-copy">
              <h3>{{ shop.name }}</h3>
              <p>{{ shop.category }} · {{ shop.location }}</p>
              <time>入宫于 {{ formatAddedAt(shop.addedAt) }}</time>
            </div>
            <button @click="requestRemoval(shop)">移出冷宫</button>
          </article>
        </div>
        <div v-else class="empty-state">
          <span aria-hidden="true">❄️</span>
          <h2>冷宫空空如也</h2>
          <p>说明最近吃得还挺满意。</p>
        </div>
      </section>

      <section v-else-if="activeModule === 'custom-shops'" class="module-content">
        <CustomShopsManager />
      </section>

      <section v-else-if="activeModule === 'privacy'" class="module-content">
        <PrivacyPolicy />
      </section>

      <section v-else class="module-content stats-content">
        <div v-if="summary.total" class="stats-grid">
          <article>
            <span>本月宠幸</span>
            <strong>{{ summary.total }}<small>次</small></strong>
          </article>
          <article>
            <span>吃过</span>
            <strong>{{ summary.shopCount }}<small>家</small></strong>
          </article>
          <article>
            <span>最常吃</span>
            <strong class="text-stat">{{ summary.favoriteCategory }}</strong>
          </article>
          <article>
            <span>最常去</span>
            <strong class="text-stat">{{ summary.favoriteLocation }}</strong>
          </article>
        </div>

        <section v-if="summary.total" class="top-section">
          <span class="eyebrow">本月榜单</span>
          <h2>本月 Top 3</h2>
          <ol>
            <li v-for="(shop, index) in summary.topShops" :key="shop.shopId ?? shop.name">
              <span class="rank">{{ index + 1 }}</span>
              <span class="top-shop-name">{{ shop.name }}</span>
              <strong>{{ shop.count }}次</strong>
            </li>
          </ol>
        </section>

        <div v-else class="empty-state">
          <span aria-hidden="true">📊</span>
          <h2>还没有可统计的记录</h2>
          <p>本月第一次“就它了”之后，这里就会开始记录。</p>
          <button @click="$emit('go-draw')">去抽卡</button>
        </div>
      </section>
    </template>

    <ConfirmModal
      :open="modalOpen"
      :title="modalTitle"
      :shop-name="modalShopName"
      :description="modalDescription"
      :cancel-text="modalCancelText"
      :confirm-text="modalConfirmText"
      @cancel="cancelModal"
      @confirm="confirmModal"
    />
  </div>
</template>

<style scoped>
.mine-page { margin-top: 20px; }

.profile-header h1,
.module-header h1 {
  margin: 0;
  font-size: clamp(29px, 8vw, 32px);
}

.profile-header > p,
.module-header > p {
  margin: 4px 0 0;
  color: #777;
  font-size: 14px;
  line-height: 1.6;
}

.monthly-overview {
  margin-top: 13px;
  color: #9a654f;
  font-size: 13px;
  line-height: 1.55;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 25px;
}

.custom-shops-entry {
  display: grid;
  width: 100%;
  margin-top: 13px;
  padding: 15px 16px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  border: 1px solid #f0e3da;
  border-radius: 18px;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 8px 21px rgba(65, 42, 29, .05);
  color: #2b2826;
  cursor: pointer;
  text-align: left;
}

.custom-entry-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  background: #fff0e8;
  color: #df633f;
  font-size: 22px;
}
.custom-shops-entry strong,
.custom-shops-entry small { display: block; }
.custom-shops-entry strong { font-size: 15px; }
.custom-shops-entry small { margin-top: 4px; color: #8a817b; font-size: 11px; }
.custom-entry-arrow { color: #d7c7bc; font-size: 23px; }

.privacy-entry {
  display: grid;
  width: 100%;
  margin-top: 10px;
  padding: 13px 16px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  border: 1px solid #f0e3da;
  border-radius: 18px;
  background: rgba(255, 255, 255, .82);
  color: #2b2826;
  cursor: pointer;
  text-align: left;
}

.privacy-entry-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  background: #f3f1ff;
  font-size: 17px;
}

.privacy-entry strong,
.privacy-entry small { display: block; }
.privacy-entry strong { font-size: 14px; }
.privacy-entry small { margin-top: 3px; color: #8a817b; font-size: 11px; }

.recent-section { margin-top: 30px; }

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 13px;
}

.eyebrow {
  color: #a09690;
  font-size: 12px;
}

.section-title-row h2,
.top-section h2 {
  margin: 3px 0 0;
  font-size: 21px;
}

.section-title-row button {
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #df673f;
  cursor: pointer;
  font-size: 12px;
}

.recent-list {
  overflow: hidden;
  border: 1px solid #f0e6de;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.88);
}

.recent-item {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 3px 12px;
  padding: 15px 16px;
}

.recent-item + .recent-item { border-top: 1px solid #f2ebe6; }
.recent-item time { grid-row: 1 / 3; color: #aa7b67; font-size: 11px; line-height: 1.5; }
.recent-item strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.recent-item span { color: #85807c; font-size: 12px; }

.module-header { margin-bottom: 22px; }

.back-button {
  margin: 0 0 14px;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #d85d38;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.module-content { padding-bottom: 4px; }
.shop-list,
.cold-list { display: grid; gap: 14px; }

.cold-card {
  display: flex;
  gap: 14px;
  padding: 19px 17px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e8e8eb;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 22px rgba(53, 37, 28, 0.05);
}

.cold-copy { min-width: 0; }
.cold-card h3 { margin: 0; overflow-wrap: anywhere; font-size: 17px; }
.cold-card p { margin: 6px 0; color: #777; font-size: 12px; }
.cold-card time { color: #aaa; font-size: 11px; }

.cold-card button {
  flex: 0 0 auto;
  padding: 9px 10px;
  border: 1px solid #ddd8d5;
  border-radius: 11px;
  background: #fff;
  color: #665d58;
  cursor: pointer;
  font-size: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stats-grid article {
  min-height: 112px;
  padding: 16px;
  border: 1px solid #f0e3da;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
}

.stats-grid article > span {
  display: block;
  color: #8b827d;
  font-size: 12px;
}

.stats-grid strong {
  display: block;
  margin-top: 15px;
  color: #e1653f;
  font-size: 29px;
  line-height: 1.15;
}

.stats-grid small { margin-left: 3px; font-size: 12px; }
.stats-grid .text-stat { overflow-wrap: anywhere; color: #302b28; font-size: 21px; }

.top-section {
  margin-top: 20px;
  padding: 20px 17px 10px;
  border: 1px solid #f0e3da;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.94);
}

.top-section ol { margin: 14px 0 0; padding: 0; list-style: none; }

.top-section li {
  display: grid;
  grid-template-columns: 27px minmax(0, 1fr) auto;
  gap: 9px;
  padding: 12px 0;
  align-items: center;
  border-top: 1px solid #f1e9e4;
  font-size: 13px;
}

.rank {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #fff0e8;
  color: #df633f;
  font-size: 11px;
  font-weight: 700;
}

.top-shop-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-section li > strong { color: #e16640; font-size: 12px; }

.empty-state,
.compact-empty {
  padding: 49px 20px;
  border: 1px dashed #eadcd2;
  border-radius: 21px;
  background: rgba(255, 255, 255, 0.66);
  text-align: center;
}

.empty-state > span,
.compact-empty > span { font-size: 41px; }
.empty-state h2 { margin: 15px 0 7px; font-size: 18px; }
.empty-state p,
.compact-empty p { margin: 9px 0 0; color: #7e7772; font-size: 13px; line-height: 1.6; }

.empty-state button,
.compact-empty button {
  margin-top: 19px;
  padding: 10px 22px;
  border: 0;
  border-radius: 11px;
  background: #ff765f;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 389px) {
  .module-grid { gap: 10px; }
  .recent-item { grid-template-columns: 69px minmax(0, 1fr); padding-inline: 13px; }
  .cold-card { padding-inline: 14px; }
}
</style>
