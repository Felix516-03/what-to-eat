<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue"
import { getCategoryIcon } from "../utils/categoryIcon.js"

const props = defineProps({
  finalShop: { type: Object, required: true },
  candidates: { type: Array, required: true },
  runId: { type: Number, required: true }
})

const emit = defineEmits(["finished"])
const cardElements = ref([])
const settled = ref(false)
const animations = []

let finishTimer = null
let firstFrame = null
let secondFrame = null

function setCardElement(element, index) {
  if (element) cardElements.value[index] = element
}

function motionFor(index) {
  const center = (props.candidates.length - 1) / 2
  const distance = index - center
  const spacing = props.candidates.length === 2 ? 104 : 64
  const spreadX = distance * spacing
  const spreadY = Math.abs(distance) * 10
  const shuffleX = distance * spacing * -0.82
  const shuffleY = (index % 2 === 0 ? -1 : 1) * 12
  const winner = String(props.candidates[index].id) === String(props.finalShop.id)

  return {
    winner,
    keyframes: [
      {
        offset: 0,
        transform: "translate3d(0, 18px, 0) rotate(0deg) scale(.86)",
        opacity: .9
      },
      {
        offset: .18,
        transform: `translate3d(${spreadX}px, ${spreadY}px, 0) rotate(${distance * 6}deg) scale(.92)`,
        opacity: .96,
        easing: "cubic-bezier(.45, 0, .55, 1)"
      },
      {
        offset: .42,
        transform: `translate3d(${shuffleX}px, ${shuffleY}px, 0) rotate(${distance * -7}deg) scale(.95)`,
        opacity: 1,
        easing: "cubic-bezier(.45, 0, .55, 1)"
      },
      {
        offset: .66,
        transform: `translate3d(${spreadX}px, ${spreadY}px, 0) rotate(${distance * 6}deg) scale(.92)`,
        opacity: .96,
        easing: "cubic-bezier(.45, 0, .55, 1)"
      },
      {
        offset: .79,
        transform: "translate3d(0, 12px, 0) rotate(0deg) scale(.9)",
        opacity: .92,
        easing: "cubic-bezier(.2, .78, .24, 1)"
      },
      winner
        ? {
            offset: 1,
            transform: "translate3d(0, -4px, 0) rotate(0deg) scale(1)",
            opacity: 1
          }
        : {
            offset: 1,
            transform: `translate3d(${spreadX * 1.12}px, 28px, 0) rotate(${distance * 5}deg) scale(.78)`,
            opacity: 0
          }
    ]
  }
}

async function startShuffle() {
  await nextTick()

  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      const activeAnimations = cardElements.value.map((element, index) => {
        const motion = motionFor(index)
        element.style.zIndex = motion.winner ? "20" : String(10 - index)

        const animation = element.animate(motion.keyframes, {
          duration: 2900,
          fill: "forwards"
        })
        animations.push(animation)
        return animation.finished
      })

      Promise.all(activeAnimations).then(() => {
        settled.value = true
        finishTimer = window.setTimeout(
          () => emit("finished", props.runId),
          190
        )
      }).catch(() => {})
    })
  })
}

onMounted(startShuffle)

onUnmounted(() => {
  cancelAnimationFrame(firstFrame)
  cancelAnimationFrame(secondFrame)
  animations.forEach(animation => animation.cancel())
  window.clearTimeout(finishTimer)
})
</script>

<template>
  <section class="shuffle-stage" aria-label="正在洗牌抽取店铺" aria-live="polite">
    <div class="stage-heading">
      <span class="live-dot" aria-hidden="true"></span>
      <p>在这几家里认真挑一张</p>
      <span>{{ candidates.length }} 家</span>
    </div>

    <div class="card-table" :class="{ settled }">
      <article
        v-for="(shop, index) in candidates"
        :key="shop.id"
        :ref="element => setCardElement(element, index)"
        class="shuffle-card"
        :class="{ 'winner-card': String(shop.id) === String(finalShop.id) }"
        :data-shop-id="shop.id"
      >
        <span aria-hidden="true">{{ getCategoryIcon(shop.category) }}</span>
        <strong>{{ shop.name }}</strong>
        <small>{{ shop.category }}</small>
      </article>
    </div>

    <span class="candidate-hint">先洗匀，再慢慢揭晓</span>
  </section>
</template>

<style scoped>
.shuffle-stage {
  width: min(100%, 340px);
  min-height: 330px;
  margin: 25px auto 0;
  padding: 18px 12px 17px;
  overflow: hidden;
  border: 1px solid #f0e1d8;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 15px 36px rgba(64, 41, 28, 0.09);
  text-align: center;
  animation: shuffle-enter 180ms ease-out both;
  contain: layout paint;
}

.stage-heading {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 7px;
  padding: 0 5px 8px;
  align-items: center;
}

.stage-heading p { margin: 0; color: #a17d6d; font-size: 12px; font-weight: 700; }
.stage-heading > span:last-child { color: #ad8d7e; font-size: 11px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff765f; box-shadow: 0 0 0 4px rgba(255, 118, 95, 0.12); }

.card-table {
  position: relative;
  height: 242px;
  perspective: 700px;
}

.shuffle-card {
  position: absolute;
  top: 55px;
  left: 50%;
  display: flex;
  width: 142px;
  height: 146px;
  margin-left: -71px;
  padding: 16px 11px;
  transform: translate3d(0, 18px, 0) rotate(0) scale(.86);
  transform-origin: 50% 100%;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #efd9cd;
  border-radius: 18px;
  background: #fffaf6;
  box-shadow: 0 12px 25px rgba(58, 39, 29, 0.11);
  opacity: .9;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.shuffle-card > span { font-size: 25px; }
.shuffle-card strong {
  display: -webkit-box;
  min-height: 39px;
  margin-top: 9px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #2e2926;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.shuffle-card small { margin-top: 7px; color: #a28b7f; font-size: 11px; }

.card-table.settled .winner-card {
  border-color: rgba(255, 112, 76, 0.58);
  box-shadow: 0 15px 30px rgba(255, 111, 85, 0.17);
}

.candidate-hint { color: #b39c90; font-size: 11px; }

@keyframes shuffle-enter {
  from { opacity: 0; transform: translateY(8px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
