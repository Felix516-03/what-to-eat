<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  meta: { type: String, required: true }
})

defineEmits(["open"])
</script>

<template>
  <button class="module-card" @click="$emit('open')">
    <span class="module-icon" aria-hidden="true">{{ icon }}</span>
    <span class="module-title">{{ title }}</span>
    <span class="module-meta">{{ meta }}</span>
    <span class="module-arrow" aria-hidden="true">›</span>
  </button>
</template>

<style scoped>
.module-card {
  position: relative;
  min-width: 0;
  min-height: 126px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid #f0e3da;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 9px 23px rgba(65, 42, 29, 0.055);
  color: #2b2826;
  cursor: pointer;
  text-align: left;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
}

.module-card:hover {
  border-color: #f2cbb9;
  box-shadow: 0 12px 26px rgba(65, 42, 29, 0.085);
  transform: translateY(-2px);
}

.module-card:active {
  transform: scale(0.975);
}

.module-icon,
.module-title,
.module-meta {
  display: block;
}

.module-icon {
  margin-bottom: 13px;
  font-size: 24px;
}

.module-title {
  font-size: 16px;
  font-weight: 700;
}

.module-meta {
  margin-top: 5px;
  overflow: hidden;
  color: #8a817b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-arrow {
  position: absolute;
  right: 14px;
  bottom: 12px;
  color: #d7c7bc;
  font-size: 22px;
}

@media (prefers-reduced-motion: reduce) {
  .module-card { transition: none; }
}
</style>
