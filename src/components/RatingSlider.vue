<script setup>
import { computed } from "vue"

const props = defineProps({
  modelValue: { type: Number, default: 3 },
  shopName: { type: String, required: true },
  saved: { type: Boolean, default: false }
})

const emit = defineEmits(["update:modelValue", "commit"])

const label = computed(() => {
  if (props.modelValue === 0) return "🤮"
  if (props.modelValue === 5) return "😋"
  return String(props.modelValue)
})

const position = computed(() => `${props.modelValue * 20}%`)

function update(event) {
  emit("update:modelValue", Number(event.target.value))
}

function commit(event) {
  emit("commit", Number(event.target.value))
}
</script>

<template>
  <div class="rating-block">
    <div class="rating-heading">
      <span>我的评价</span>
      <span class="saved-feedback" :class="{ visible: saved }">已记录</span>
    </div>
    <div class="range-value-track" aria-hidden="true">
      <output class="range-value" :style="{ left: position }">{{ label }}</output>
    </div>
    <div class="rating-slider-row">
      <span aria-hidden="true">🤮</span>
      <input
        :value="modelValue"
        type="range"
        min="0"
        max="5"
        step="1"
        :aria-label="`给${shopName}评分`"
        @input="update"
        @change="commit"
      >
      <span aria-hidden="true">😋</span>
    </div>
  </div>
</template>

<style scoped>
.rating-block { margin-top: 20px; }

.rating-heading {
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  color: #555;
  font-size: 13px;
  font-weight: 700;
}

.saved-feedback {
  color: #df6a45;
  font-size: 12px;
  font-weight: 400;
  opacity: 0;
  transition: opacity 180ms ease;
}

.saved-feedback.visible { opacity: 1; }

.range-value-track {
  position: relative;
  height: 29px;
  margin: 4px 31px 0;
}

.range-value {
  position: absolute;
  top: 1px;
  min-width: 24px;
  padding: 2px 5px;
  transform: translateX(-50%);
  border-radius: 8px;
  background: #2d2926;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.rating-slider-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 24px;
  gap: 7px;
  align-items: center;
  font-size: 19px;
}

.rating-slider-row input {
  width: 100%;
  height: 5px;
  margin: 0;
  accent-color: #ff765f;
  cursor: pointer;
}
</style>
