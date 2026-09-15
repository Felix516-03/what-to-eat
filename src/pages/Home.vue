<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"

import DrawReel from "../components/DrawReel.vue"
import SingleShopReveal from "../components/SingleShopReveal.vue"
import SmallPoolShuffle from "../components/SmallPoolShuffle.vue"
import {
  getCandidatePool,
  getEligibleShops,
  getMealInfo,
  lottery,
  saveChoice
} from "../algorithm/recommend.js"
import {
  CUSTOM_SHOPS_CHANGED_EVENT,
  CUSTOM_SHOPS_KEY,
  getAllShops,
  getColdPalace
} from "../utils/storage.js"
import { getCategoryIcon } from "../utils/categoryIcon.js"
import Circle from "./Circle.vue"
import Mine from "./Mine.vue"

const mode = ref("all")
const selectedCategory = ref("食堂")
const excludedIds = ref([])
const currentPage = ref("draw")
const now = ref(new Date())
const allShops = ref(getAllShops())

const drawState = ref("idle")
const animationPhase = ref("")
const drawOrigin = ref("idle")
const animationType = ref("")
const animationCandidates = ref([])
const pendingShop = ref(null)
const result = ref(null)
const drawMessage = ref("")
const drawRunId = ref(0)

let clockTimer = null
let sourceExitTimer = null

const categories = computed(() => [...new Set(allShops.value.map(shop => shop.category))])
const mealInfo = computed(() => getMealInfo(now.value))
const isDrawing = computed(() => drawState.value === "drawing")

const currentTime = computed(() => {
  const hours = String(now.value.getHours()).padStart(2, "0")
  const minutes = String(now.value.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
})

function currentCategory() {
  return mode.value === "category" ? selectedCategory.value : null
}

function resolveCandidatePool(category) {
  const eligible = getEligibleShops({ category })
  const excluded = new Set(excludedIds.value.map(id => String(id)))
  const remaining = eligible.filter(shop => !excluded.has(String(shop.id)))

  if (eligible.length > 0 && remaining.length === 0) {
    const eligibleIds = new Set(eligible.map(shop => String(shop.id)))
    excludedIds.value = excludedIds.value.filter(
      id => !eligibleIds.has(String(id))
    )
  }

  return getCandidatePool({ category, excludeIds: excludedIds.value })
}

function chooseAnimationType(candidateCount) {
  if (candidateCount >= 6) return "reel"
  if (candidateCount >= 2) return "shuffle"
  return "single"
}

function finishDraw(runId = drawRunId.value) {
  if (
    runId !== drawRunId.value ||
    drawState.value !== "drawing" ||
    !pendingShop.value
  ) return

  const finalShop = pendingShop.value
  result.value = finalShop

  if (!excludedIds.value.some(id => String(id) === String(finalShop.id))) {
    excludedIds.value.push(finalShop.id)
  }

  pendingShop.value = null
  animationPhase.value = ""
  drawState.value = "result"
}

function runDrawAnimation() {
  if (isDrawing.value) return

  const category = currentCategory()
  const candidates = resolveCandidatePool(category)
  drawMessage.value = ""

  if (candidates.length === 0) {
    result.value = null
    drawState.value = "idle"
    drawMessage.value = mode.value === "category"
      ? "这个分类已经全被你打入冷宫啦。\n换个分类看看吧。"
      : "所有店铺都在冷宫里歇着啦 😅"
    return
  }

  // 每次交互仅在这里调用一次真实加权抽卡；后续动画只展示已确定的结果。
  const finalShop = lottery({ category, excludeIds: excludedIds.value })
  if (!finalShop) return

  drawOrigin.value = drawState.value === "idle" ? "idle" : "result"
  animationCandidates.value = candidates
  animationType.value = chooseAnimationType(candidates.length)
  pendingShop.value = finalShop
  drawRunId.value += 1
  const activeRunId = drawRunId.value
  animationPhase.value = "source-exit"
  drawState.value = "drawing"

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  sourceExitTimer = window.setTimeout(() => {
    if (reduceMotion) {
      finishDraw(activeRunId)
      return
    }

    result.value = null
    animationPhase.value = "playing"
  }, 210)
}

function confirmShop() {
  if (drawState.value !== "result" || !result.value) return
  saveChoice(result.value)
  resetDraw()
}

function resetDraw() {
  window.clearTimeout(sourceExitTimer)
  drawState.value = "idle"
  animationPhase.value = ""
  animationType.value = ""
  animationCandidates.value = []
  pendingShop.value = null
  result.value = null
  excludedIds.value = []
  drawMessage.value = ""
}

function switchMode(nextMode) {
  if (isDrawing.value) return
  mode.value = nextMode
  drawMessage.value = ""
}

function selectCategory(category) {
  if (isDrawing.value) return
  selectedCategory.value = category
  drawMessage.value = ""
}

function returnToAll() {
  mode.value = "all"
  drawMessage.value = ""
}

function navigate(page) {
  if (isDrawing.value) return

  if (
    page === "draw" &&
    result.value &&
    getColdPalace().some(item => String(item.shopId) === String(result.value.id))
  ) {
    resetDraw()
  }

  currentPage.value = page
}

function refreshAllShops() {
  const nextShops = getAllShops()
  const nextCategories = [...new Set(nextShops.map(shop => shop.category))]
  allShops.value = nextShops

  if (!nextCategories.includes(selectedCategory.value)) {
    selectedCategory.value = nextCategories[0] || ""
  }
}

function handleStorage(event) {
  if (event.key === CUSTOM_SHOPS_KEY) refreshAllShops()
}

onMounted(() => {
  window.addEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refreshAllShops)
  window.addEventListener("storage", handleStorage)
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  window.removeEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refreshAllShops)
  window.removeEventListener("storage", handleStorage)
  window.clearInterval(clockTimer)
  window.clearTimeout(sourceExitTimer)
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="top-line">
        <time class="system-time">{{ currentTime }}</time>
        <div class="brand">What to eat</div>
      </div>

      <template v-if="currentPage === 'draw'">
        <h1>{{ mealInfo.greeting }}</h1>
        <p class="question">吃点啥嘞？</p>
      </template>

    </header>

    <main v-if="currentPage === 'draw'" class="draw-page">
      <section class="mode-box" aria-label="抽卡模式">
        <button
          class="mode-button"
          :class="{ active: mode === 'all' }"
          :disabled="isDrawing"
          @click="switchMode('all')"
        >
          全部抽
        </button>
        <button
          class="mode-button"
          :class="{ active: mode === 'category' }"
          :disabled="isDrawing"
          @click="switchMode('category')"
        >
          分类抽
        </button>
      </section>

      <section v-if="mode === 'category'" class="categories" aria-label="店铺分类">
        <button
          v-for="category in categories"
          :key="category"
          class="category-button"
          :class="{ selected: selectedCategory === category }"
          :disabled="isDrawing"
          @click="selectCategory(category)"
        >
          <span aria-hidden="true">{{ getCategoryIcon(category) }}</span>
          {{ category }}
        </button>
      </section>

      <div class="draw-stage-area">
        <section
          v-if="drawState === 'idle' || (isDrawing && animationPhase === 'source-exit' && drawOrigin === 'idle')"
          class="start-area"
        >
          <div v-if="drawMessage && drawState === 'idle'" class="draw-empty" role="status">
            <span aria-hidden="true">🥶</span>
            <p>{{ drawMessage }}</p>
            <button v-if="mode === 'category'" @click="returnToAll">返回全部抽</button>
          </div>
          <button
            class="draw-button"
            :class="{ 'source-exit': isDrawing }"
            :disabled="isDrawing"
            @click="runDrawAnimation"
          >
            <span class="card-icon">🎴</span>
            <span>开始抽卡</span>
          </button>
        </section>

        <section
          v-else-if="isDrawing && animationPhase === 'playing'"
          class="animation-host"
          aria-live="polite"
        >
          <DrawReel
            v-if="animationType === 'reel'"
            :key="`reel-${drawRunId}`"
            :final-shop="pendingShop"
            :candidates="animationCandidates"
            :run-id="drawRunId"
            @finished="finishDraw"
          />
          <SmallPoolShuffle
            v-else-if="animationType === 'shuffle'"
            :key="`shuffle-${drawRunId}`"
            :final-shop="pendingShop"
            :candidates="animationCandidates"
            :run-id="drawRunId"
            @finished="finishDraw"
          />
          <SingleShopReveal
            v-else
            :key="`single-${drawRunId}`"
            :final-shop="pendingShop"
            :run-id="drawRunId"
            @finished="finishDraw"
          />
        </section>

        <section
          v-else-if="result"
          class="result-card"
          :class="{
            'source-leaving': isDrawing && animationPhase === 'source-exit',
            'final-result': drawState === 'result'
          }"
          aria-live="polite"
        >
          <div class="small-title">这顿要不吃——</div>
          <div class="food-icon">{{ getCategoryIcon(result.category) }}</div>
          <h2>{{ result.name }}</h2>
          <div class="tags">
            <span>{{ result.category }}</span>
            <span v-if="result.location">📍 {{ result.location }}</span>
          </div>

          <div v-if="drawState === 'result'" class="actions">
            <button class="again-button" @click="runDrawAnimation">下一家</button>
            <button class="confirm-button" @click="confirmShop">就它了！</button>
          </div>

          <div v-else class="actions" aria-hidden="true">
            <button class="again-button" disabled>下一家</button>
            <button class="confirm-button" disabled>就它了！</button>
          </div>
        </section>
      </div>
    </main>

    <Mine
      v-else-if="currentPage === 'mine'"
      :now="now"
      @go-draw="navigate('draw')"
    />

    <Circle v-else />

    <footer>
      <button class="nav" aria-label="抽卡" :class="{ 'active-nav': currentPage === 'draw' }" :disabled="isDrawing" @click="navigate('draw')">
        <span class="nav-icon" aria-hidden="true">🎴</span><span>抽卡</span>
      </button>
      <button class="nav" aria-label="饭圈儿" :class="{ 'active-nav': currentPage === 'circle' }" :disabled="isDrawing" @click="navigate('circle')">
        <span class="nav-icon" aria-hidden="true">💬</span><span>饭圈儿</span>
      </button>
      <button class="nav" aria-label="我的" :class="{ 'active-nav': currentPage === 'mine' }" :disabled="isDrawing" @click="navigate('mine')">
        <span class="nav-icon" aria-hidden="true">👤</span><span>我的</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: 24px 22px calc(96px + env(safe-area-inset-bottom));
  overflow-x: hidden;
  background: linear-gradient(180deg, #fff8eb 0%, #fff 45%);
  position: relative;
}
.top-line { display: flex; align-items: center; justify-content: space-between; }
.system-time { color: #7d7d7d; font-size: 14px; font-variant-numeric: tabular-nums; }
.brand { color: #ff7a45; font-size: 15px; font-weight: 700; letter-spacing: 1px; }
.app-header h1 { margin: 22px 0 3px; font-size: clamp(29px, 8vw, 32px); }
.question { margin: 0; color: #555; font-size: 23px; }
.page-subtitle { margin: 4px 0 0; color: #777; font-size: 14px; line-height: 1.6; }

.mode-box { display: flex; gap: 10px; margin-top: 30px; }
.mode-button {
  flex: 1;
  padding: 12px;
  border: 0;
  border-radius: 14px;
  background: #f1f1f1;
  color: #555;
  cursor: pointer;
}
.mode-button.active { background: #282522; box-shadow: 0 6px 16px rgba(40, 37, 34, 0.16); color: #fff; font-weight: 700; }
button:disabled { cursor: not-allowed; opacity: 0.55; }

.categories { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
.category-button {
  padding: 8px 14px;
  border: 1px solid #dedede;
  border-radius: 20px;
  background: #fff;
  color: #555;
  cursor: pointer;
}
.category-button.selected { border-color: #ff8b5c; background: #fff0e8; color: #d95628; font-weight: 700; }

.draw-stage-area { min-height: 390px; }
.start-area,
.animation-host { display: flex; min-height: 370px; padding: 20px 0; align-items: center; flex-direction: column; justify-content: center; }

.draw-empty {
  max-width: 300px;
  margin-bottom: 18px;
  padding: 14px 18px;
  border: 1px solid #eadfd9;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.78);
  text-align: center;
}
.draw-empty > span { font-size: 25px; }
.draw-empty p { margin: 7px 0 0; color: #746a64; font-size: 13px; line-height: 1.6; white-space: pre-line; }
.draw-empty button { margin-top: 10px; padding: 7px 13px; border: 0; border-radius: 9px; background: #fff0e8; color: #d65d36; cursor: pointer; font-size: 12px; font-weight: 700; }

.draw-button {
  width: min(190px, 52vw);
  aspect-ratio: 1;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffad72, #ff6f61);
  box-shadow: 0 18px 40px rgba(255, 111, 97, 0.28);
  color: #fff;
  cursor: pointer;
  font-size: 21px;
  font-weight: 700;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.draw-button:active { transform: scale(.97); box-shadow: 0 10px 24px rgba(255, 111, 97, 0.24); }
.draw-button.source-exit { animation: source-button-exit 210ms ease-in forwards; }
.card-icon { display: block; margin-bottom: 10px; font-size: 48px; }

.result-card {
  min-height: 355px;
  margin-top: 28px;
  padding: 30px 24px;
  border: 1px solid rgba(255, 122, 69, 0.08);
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 35px rgba(53, 37, 28, 0.08);
  text-align: center;
}
.result-card.source-leaving { animation: source-result-exit 210ms ease-in forwards; }
.result-card.final-result { animation: result-enter 250ms cubic-bezier(.2, .75, .25, 1) both; }
.small-title { color: #888; font-size: 14px; }
.food-icon { margin-top: 18px; font-size: 56px; }
.result-card h2 { min-height: 41px; margin: 14px 0; overflow-wrap: anywhere; font-size: clamp(24px, 7vw, 29px); }
.tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.tags span { padding: 6px 12px; border-radius: 20px; background: #f5f5f5; color: #555; font-size: 13px; }
.actions { display: flex; gap: 10px; margin-top: 30px; }
.actions button,
.reset-button { flex: 1; padding: 14px; border-radius: 14px; cursor: pointer; font-size: 16px; }
.again-button { border: 1px solid #ddd; background: #fff; color: #444; }
.confirm-button { border: 0; background: #ff765f; color: #fff; font-weight: 700; }
.confirmed-area { margin-top: 32px; }
.confirmed-text { color: #df5b39; font-size: 17px; font-weight: 700; }
.reset-button { width: 100%; margin-top: 22px; border: 1px solid #e6ddd7; background: #fff9f5; color: #7d4a36; }

.circle-page {
  margin-top: 30px;
  padding: 52px 22px;
  border: 1px dashed #eadcd2;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.68);
  text-align: center;
}
.construction-icon { font-size: 46px; }
.circle-page h2 { margin: 16px 0 7px; font-size: 19px; }
.circle-page p { margin: 0; color: #777; font-size: 14px; line-height: 1.6; }
.circle-page button { margin-top: 22px; padding: 11px 24px; border: 0; border-radius: 12px; background: #ff765f; color: #fff; cursor: pointer; font-weight: 700; }

footer {
  position: fixed;
  z-index: 10;
  bottom: 0;
  left: 50%;
  display: flex;
  width: 100%;
  max-width: 430px;
  height: calc(68px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateX(-50%);
  border-top: 1px solid #eee;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 -5px 22px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(14px);
}
.nav { flex: 1; display: flex; min-width: 0; border: 0; background: transparent; color: #999; align-items: center; flex-direction: column; justify-content: center; gap: 3px; cursor: pointer; font-size: 12px; }
.nav-icon { filter: grayscale(.85); font-size: 18px; }
.active-nav { color: #ff704d; font-weight: 700; }
.active-nav .nav-icon { filter: none; }

@keyframes source-button-exit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(.92); }
}
@keyframes source-result-exit {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-5px) scale(.985); }
}
@keyframes result-enter {
  from { opacity: 0; transform: translateY(10px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 389px) {
  .app-shell { padding-inline: 16px; }
  .result-card { padding-inline: 18px; }
  .category-button { padding-inline: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .draw-button.source-exit,
  .result-card.source-leaving { animation-duration: 180ms; }
  .result-card.final-result { animation-duration: 100ms; }
}
</style>
