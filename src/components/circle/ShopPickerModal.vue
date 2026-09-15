<script setup>
import { computed, ref, watch } from "vue"

import { getCategoryIcon } from "../../utils/categoryIcon.js"
import { getAllShops } from "../../utils/storage.js"

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "选择一家店" }
})

const emit = defineEmits(["close", "select"])
const keyword = ref("")
const shops = ref([])

const filteredShops = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  if (!value) return shops.value
  return shops.value.filter(shop => [shop.name, shop.location, shop.category]
    .some(field => String(field || "").toLowerCase().includes(value)))
})

watch(() => props.open, open => {
  if (!open) return
  shops.value = getAllShops()
  keyword.value = ""
})
</script>

<template>
  <Teleport to="body">
    <Transition name="picker-fade">
      <div v-if="open" class="picker-backdrop" @click.self="$emit('close')">
        <section class="picker-sheet" role="dialog" aria-modal="true" :aria-label="title">
          <div class="picker-handle"></div>
          <div class="picker-heading">
            <div>
              <span>来自你的抽卡池</span>
              <h2>{{ title }}</h2>
            </div>
            <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
          </div>
          <label class="search-box">
            <span aria-hidden="true">⌕</span>
            <input v-model="keyword" maxlength="40" placeholder="搜索店名、地点或分类">
          </label>
          <div v-if="filteredShops.length" class="picker-list">
            <button
              v-for="shop in filteredShops"
              :key="shop.id"
              type="button"
              class="picker-shop"
              @click="$emit('select', shop)"
            >
              <span aria-hidden="true">{{ getCategoryIcon(shop.category) }}</span>
              <span><strong>{{ shop.name }}</strong><small>{{ shop.category }} · {{ shop.location }}</small></span>
              <b aria-hidden="true">›</b>
            </button>
          </div>
          <p v-else class="picker-empty">没有找到这家店，先去“我的店铺”添加吧。</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.picker-backdrop { position: fixed; z-index: 120; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgba(38, 30, 26, .4); backdrop-filter: blur(3px); }
.picker-sheet { width: min(430px, 100%); max-height: min(72vh, 650px); padding: 9px 20px calc(20px + env(safe-area-inset-bottom)); overflow: hidden; border-radius: 25px 25px 0 0; background: #fffaf6; box-shadow: 0 -20px 50px rgba(46, 31, 24, .18); }
.picker-handle { width: 42px; height: 4px; margin: 0 auto 15px; border-radius: 4px; background: #ddd0c8; }
.picker-heading { display: flex; align-items: flex-start; justify-content: space-between; }
.picker-heading span { color: #df6a45; font-size: 11px; font-weight: 700; }
.picker-heading h2 { margin: 4px 0 0; font-size: 21px; }
.picker-heading button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #f4ece7; color: #786a62; cursor: pointer; font-size: 23px; line-height: 1; }
.search-box { display: flex; gap: 8px; margin: 18px 0 12px; padding: 0 13px; align-items: center; border: 1px solid #e9ddd5; border-radius: 14px; background: #fff; color: #a7978e; }
.search-box input { width: 100%; padding: 12px 0; border: 0; outline: none; background: transparent; }
.picker-list { max-height: calc(72vh - 150px); overflow-y: auto; }
.picker-shop { display: grid; width: 100%; grid-template-columns: auto 1fr auto; gap: 11px; padding: 13px 5px; align-items: center; border: 0; border-bottom: 1px solid #f0e6df; background: transparent; color: #302b28; cursor: pointer; text-align: left; }
.picker-shop > span:first-child { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: #fff0e8; }
.picker-shop strong, .picker-shop small { display: block; }
.picker-shop strong { overflow-wrap: anywhere; font-size: 14px; }
.picker-shop small { margin-top: 4px; color: #8c817a; font-size: 11px; }
.picker-shop b { color: #c7b5aa; font-size: 21px; }
.picker-empty { padding: 35px 10px; color: #95877e; font-size: 13px; text-align: center; }
.picker-fade-enter-active, .picker-fade-leave-active { transition: opacity 160ms ease; }
.picker-fade-enter-active .picker-sheet, .picker-fade-leave-active .picker-sheet { transition: transform 180ms ease; }
.picker-fade-enter-from, .picker-fade-leave-to { opacity: 0; }
.picker-fade-enter-from .picker-sheet, .picker-fade-leave-to .picker-sheet { transform: translateY(20px); }
</style>
