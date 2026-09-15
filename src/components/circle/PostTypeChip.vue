<script setup>
const labels = {
  all: "全部",
  ask: "求推荐",
  recommend: "安利",
  warning: "避雷",
  chat: "随便聊聊"
}

defineProps({
  type: { type: String, required: true },
  active: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false }
})

defineEmits(["select"])
</script>

<template>
  <button
    v-if="interactive"
    type="button"
    class="type-chip"
    :class="[`type-${type}`, { active }]"
    @click="$emit('select', type)"
  >
    {{ labels[type] }}
  </button>
  <span v-else class="type-chip" :class="`type-${type}`">{{ labels[type] }}</span>
</template>

<style scoped>
.type-chip {
  flex: 0 0 auto;
  padding: 6px 11px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #f4f0ed;
  color: #746a64;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
button.type-chip { cursor: pointer; }
.type-chip.active { border-color: #302b28; background: #302b28; color: #fff; }
.type-ask:not(.active) { background: #fff0e8; color: #d95d34; }
.type-recommend:not(.active) { background: #fff4d9; color: #a76900; }
.type-warning:not(.active) { background: #fff0ef; color: #cf514b; }
.type-chat:not(.active) { background: #eef4f1; color: #527467; }
.type-all:not(.active) { border-color: #e9dfd9; background: #fff; }
</style>
