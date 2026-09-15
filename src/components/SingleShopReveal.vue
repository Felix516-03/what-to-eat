<script setup>
import { onMounted, onUnmounted, ref } from "vue"
import { getCategoryIcon } from "../utils/categoryIcon.js"

const props = defineProps({
  finalShop: { type: Object, required: true },
  runId: { type: Number, required: true }
})

const emit = defineEmits(["finished"])
const revealed = ref(false)
let revealTimer = null
let finishTimer = null

onMounted(() => {
  revealTimer = window.setTimeout(() => { revealed.value = true }, 120)
  finishTimer = window.setTimeout(() => emit("finished", props.runId), 2050)
})

onUnmounted(() => {
  window.clearTimeout(revealTimer)
  window.clearTimeout(finishTimer)
})
</script>

<template>
  <section class="single-stage" aria-label="正在揭晓唯一店铺" aria-live="polite">
    <p>这类今天就它啦</p>
    <div class="single-card" :class="{ revealed }">
      <div class="card-face card-back"><span aria-hidden="true">🎴</span></div>
      <div class="card-face card-front">
        <span aria-hidden="true">{{ getCategoryIcon(finalShop.category) }}</span>
        <strong>{{ finalShop.name }}</strong>
        <small>{{ finalShop.category }}<template v-if="finalShop.location"> · {{ finalShop.location }}</template></small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.single-stage {
  width: min(100%, 340px);
  min-height: 330px;
  margin: 25px auto 0;
  padding: 22px 16px;
  overflow: hidden;
  border: 1px solid #f0e1d8;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 15px 36px rgba(64, 41, 28, 0.09);
  text-align: center;
  perspective: 800px;
  animation: single-enter 180ms ease-out both;
}

.single-stage > p { margin: 0 0 22px; color: #a17d6d; font-size: 13px; }

.single-card {
  position: relative;
  width: min(210px, 70vw);
  height: 218px;
  margin: 0 auto;
  transform: translate3d(0, 30px, 0) rotateY(0) scale(.92);
  transform-style: preserve-3d;
  opacity: .55;
  transition: transform 1700ms cubic-bezier(.18, .8, .24, 1), opacity 500ms ease;
  will-change: transform, opacity;
}

.single-card.revealed {
  transform: translate3d(0, 0, 0) rotateY(180deg) scale(1);
  opacity: 1;
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  padding: 20px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #efdbcf;
  border-radius: 22px;
  background: #fff9f5;
  box-shadow: 0 16px 30px rgba(62, 41, 29, 0.12);
  backface-visibility: hidden;
}

.card-back {
  background: repeating-linear-gradient(135deg, #fff3eb 0 10px, #ffe6d8 10px 20px);
}
.card-back span { font-size: 52px; }
.card-front { transform: rotateY(180deg); }
.card-front > span { font-size: 42px; }
.card-front strong { margin-top: 14px; overflow-wrap: anywhere; font-size: clamp(18px, 5vw, 22px); line-height: 1.35; }
.card-front small { margin-top: 10px; color: #937b6f; font-size: 12px; }

@keyframes single-enter {
  from { opacity: 0; transform: translateY(9px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
