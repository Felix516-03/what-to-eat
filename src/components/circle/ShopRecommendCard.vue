<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"

import { getCategoryIcon } from "../../utils/categoryIcon.js"
import {
  CUSTOM_SHOPS_CHANGED_EVENT,
  addRecommendedShop,
  findMatchingShop
} from "../../utils/storage.js"

const props = defineProps({
  name: { type: String, required: true },
  location: { type: String, default: "" },
  category: { type: String, default: "" },
  compact: { type: Boolean, default: false }
})

const open = ref(false)
const feedback = ref("")
const matchedShop = ref(null)
const snapshot = computed(() => ({
  name: props.name,
  location: props.location,
  category: props.category
}))
const categoryIcon = computed(() => getCategoryIcon(props.category))

function refresh() {
  matchedShop.value = findMatchingShop(snapshot.value)
}

function addToPool() {
  const result = addRecommendedShop(snapshot.value)
  refresh()
  feedback.value = result.status === "added"
    ? "已加入你的抽卡池 ✓"
    : result.status === "exists"
      ? "已经在你的抽卡池里啦。"
      : "店铺信息不完整，暂时无法添加。"
}

onMounted(() => {
  refresh()
  window.addEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refresh)
})
onUnmounted(() => window.removeEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refresh))
</script>

<template>
  <button type="button" class="shop-card" :class="{ compact }" @click.stop="open = true">
    <span class="shop-icon" aria-hidden="true">{{ categoryIcon }}</span>
    <span class="shop-copy">
      <strong>{{ name }}</strong>
      <small>{{ category || "未分类" }} · {{ location || "地点未知" }}</small>
    </span>
    <span class="shop-status">{{ matchedShop ? "已加入 ✓" : "查看 ›" }}</span>
  </button>

  <Teleport to="body">
    <Transition name="shop-modal">
      <div v-if="open" class="shop-backdrop" @click.self="open = false">
        <section class="shop-detail" role="dialog" aria-modal="true" :aria-label="`${name}店铺详情`">
          <button class="close-detail" type="button" aria-label="关闭" @click="open = false">×</button>
          <span class="detail-icon" aria-hidden="true">{{ categoryIcon }}</span>
          <h2>{{ name }}</h2>
          <p>{{ category || "未分类" }} · {{ location || "地点未知" }}</p>
          <div v-if="feedback" class="shop-feedback" role="status">{{ feedback }}</div>
          <div v-if="matchedShop" class="already-added">已在你的抽卡池 ✓</div>
          <button v-else class="add-pool" type="button" @click="addToPool">加入我的抽卡池</button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.shop-card { display: grid; width: 100%; grid-template-columns: auto 1fr auto; gap: 10px; margin-top: 14px; padding: 13px; align-items: center; border: 1px solid #f1dccc; border-radius: 16px; background: #fff8f1; color: #342e2a; cursor: pointer; text-align: left; }
.shop-card.compact { margin-top: 10px; padding: 10px 11px; }
.shop-icon { display: grid; width: 35px; height: 35px; place-items: center; border-radius: 11px; background: #ffe8d9; }
.shop-copy { min-width: 0; }
.shop-copy strong, .shop-copy small { display: block; }
.shop-copy strong { overflow-wrap: anywhere; font-size: 14px; }
.shop-copy small { margin-top: 4px; color: #8a7468; font-size: 11px; }
.shop-status { color: #d96642; font-size: 10px; font-weight: 700; white-space: nowrap; }
.shop-backdrop { position: fixed; z-index: 130; inset: 0; display: grid; padding: 18px; place-items: center; background: rgba(37, 29, 25, .43); backdrop-filter: blur(4px); }
.shop-detail { position: relative; width: min(350px, 100%); padding: 30px 24px 23px; border-radius: 25px; background: #fffaf6; box-shadow: 0 25px 65px rgba(48, 32, 25, .25); text-align: center; }
.close-detail { position: absolute; top: 12px; right: 13px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: #f3ebe6; color: #75675f; cursor: pointer; font-size: 21px; }
.detail-icon { display: grid; width: 58px; height: 58px; margin: 0 auto; place-items: center; border-radius: 18px; background: #fff0e6; font-size: 29px; }
.shop-detail h2 { margin: 14px 0 6px; overflow-wrap: anywhere; font-size: 22px; }
.shop-detail p { margin: 0; color: #84766e; font-size: 13px; }
.add-pool, .already-added { width: 100%; margin-top: 22px; padding: 13px; border-radius: 14px; font-weight: 700; }
.add-pool { border: 0; background: #ff765f; color: #fff; cursor: pointer; }
.already-added { background: #edf6ef; color: #4f7659; }
.shop-feedback { margin-top: 16px; color: #d9613d; font-size: 12px; }
.shop-modal-enter-active, .shop-modal-leave-active { transition: opacity 160ms ease; }
.shop-modal-enter-from, .shop-modal-leave-to { opacity: 0; }
</style>
