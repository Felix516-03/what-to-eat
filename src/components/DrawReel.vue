<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue"
import { getCategoryIcon } from "../utils/categoryIcon.js"

const props = defineProps({
  finalShop: { type: Object, required: true },
  candidates: { type: Array, required: true },
  runId: { type: Number, required: true }
})

const emit = defineEmits(["finished"])

const cardWidth = 126
const cardGap = 12
const cardStep = cardWidth + cardGap
const startIndex = 2
const targetIndex = 25
const track = ref(null)
const rolling = ref(false)
const settled = ref(false)

let reelAnimation = null
let finishTimer = null
let firstFrame = null
let secondFrame = null

function buildSequence() {
  const visualCandidates = props.candidates.filter(
    shop => String(shop.id) !== String(props.finalShop.id)
  )
  const source = visualCandidates.length ? visualCandidates : props.candidates
  const items = []

  for (let index = 0; index < 28; index += 1) {
    let next = source[Math.floor(Math.random() * source.length)]

    if (source.length > 1 && items[index - 1]?.id === next?.id) {
      const currentIndex = source.findIndex(shop => shop.id === next.id)
      next = source[(currentIndex + 1) % source.length]
    }

    items.push(next)
  }

  // 目标仅放入最终槽位，前段高速滑行不会反复剧透中奖店铺。
  items[targetIndex] = props.finalShop
  return items
}

const sequence = buildSequence()
const startX = -(startIndex * cardStep + cardWidth / 2)
const endX = -(targetIndex * cardStep + cardWidth / 2)
const trackX = ref(startX)

async function startReel() {
  await nextTick()

  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      if (!track.value) return

      rolling.value = true
      reelAnimation = track.value.animate(
        [
          { transform: `translate3d(${startX}px, 0, 0)` },
          { transform: `translate3d(${endX}px, 0, 0)` }
        ],
        {
          duration: 3500,
          // 两端斜率都为 0：先自然提速，再用更长的尾段柔和减速。
          easing: "cubic-bezier(0.16, 0, 0.16, 1)",
          fill: "forwards"
        }
      )

      reelAnimation.finished.then(async () => {
        if (!track.value) return

        // 先让 Vue 把最终位置写入内联样式，再移除填充动画，避免结束帧闪回起点。
        trackX.value = endX
        settled.value = true
        await nextTick()
        reelAnimation.cancel()
        finishTimer = window.setTimeout(
          () => emit("finished", props.runId),
          230
        )
      }).catch(() => {})
    })
  })
}

onMounted(startReel)

onUnmounted(() => {
  cancelAnimationFrame(firstFrame)
  cancelAnimationFrame(secondFrame)
  reelAnimation?.cancel()
  window.clearTimeout(finishTimer)
})
</script>

<template>
  <section class="reel-stage" aria-label="正在抽取店铺" aria-live="polite">
    <div class="stage-heading">
      <span class="live-dot" aria-hidden="true"></span>
      <p>今日候选正在揭晓</p>
      <span>{{ candidates.length }} 家</span>
    </div>

    <div class="reel-shell">
      <div class="center-pointer" aria-hidden="true"></div>
      <div class="focus-window" aria-hidden="true"></div>
      <div class="edge-shade left" aria-hidden="true"></div>
      <div class="edge-shade right" aria-hidden="true"></div>

      <div
        ref="track"
        class="reel-track"
        :class="{ rolling, settled }"
        :style="{ transform: `translate3d(${trackX}px, 0, 0)` }"
      >
        <article
          v-for="(shop, index) in sequence"
          :key="`${index}-${shop.id}`"
          class="reel-card"
          :class="{ winner: settled && index === targetIndex }"
          :data-shop-id="shop.id"
          :data-category="shop.category"
        >
          <span class="category-icon" aria-hidden="true">{{ getCategoryIcon(shop.category) }}</span>
          <strong>{{ shop.name }}</strong>
          <small>{{ shop.category }}</small>
        </article>
      </div>
    </div>

    <p class="stage-tip">慢慢停下来的，才是今天的答案</p>
  </section>
</template>

<style scoped>
.reel-stage {
  width: min(100%, 350px);
  min-height: 314px;
  margin: 22px auto 0;
  padding: 18px 0 16px;
  overflow: hidden;
  border: 1px solid #eedfd6;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 38px rgba(63, 42, 30, 0.09);
  animation: stage-enter 180ms ease-out both;
  contain: layout paint;
}

.stage-heading {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 7px;
  padding: 0 17px 14px;
  align-items: center;
}

.stage-heading p { margin: 0; color: #5f554f; font-size: 12px; font-weight: 700; }
.stage-heading > span:last-child { color: #ad8d7e; font-size: 11px; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff765f; box-shadow: 0 0 0 4px rgba(255, 118, 95, 0.12); }

.reel-shell {
  position: relative;
  height: 190px;
  overflow: hidden;
  border-top: 1px solid #f4ebe5;
  border-bottom: 1px solid #f4ebe5;
  background: #fffaf7;
}

.reel-track {
  position: absolute;
  top: 20px;
  left: 50%;
  display: flex;
  gap: 12px;
  width: max-content;
  will-change: transform;
  backface-visibility: hidden;
}

.reel-card {
  flex: 0 0 126px;
  display: flex;
  width: 126px;
  height: 150px;
  padding: 14px 10px 12px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #eee2da;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(61, 42, 31, 0.08);
  color: #302a27;
  text-align: center;
  transform: translateZ(0) scale(.91);
  opacity: .68;
  transition: transform 210ms ease-out, opacity 180ms ease-out, border-color 180ms ease-out, box-shadow 180ms ease-out;
}

.category-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: #fff2ea;
  font-size: 23px;
}

.reel-card strong {
  display: -webkit-box;
  min-height: 37px;
  margin-top: 10px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.reel-card small { margin-top: 7px; color: #ae9487; font-size: 10px; }

.reel-track.settled .reel-card.winner {
  border-color: rgba(255, 112, 76, 0.58);
  box-shadow: 0 12px 25px rgba(255, 111, 85, 0.16);
  opacity: 1;
  animation: winner-pop 220ms ease-out both;
}

.focus-window {
  position: absolute;
  z-index: 3;
  top: 14px;
  left: 50%;
  width: 138px;
  height: 162px;
  transform: translateX(-50%);
  border: 1.5px solid rgba(255, 111, 78, 0.72);
  border-radius: 20px;
  background: rgba(255, 131, 91, 0.035);
  box-shadow: inset 0 0 20px rgba(255, 126, 87, 0.05);
  pointer-events: none;
}

.center-pointer {
  position: absolute;
  z-index: 5;
  top: 5px;
  left: 50%;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-right: 7px solid transparent;
  border-left: 7px solid transparent;
  border-top: 10px solid #ff704d;
  filter: drop-shadow(0 2px 2px rgba(146, 67, 45, 0.18));
}

.edge-shade {
  position: absolute;
  z-index: 4;
  top: 0;
  bottom: 0;
  width: 28%;
  pointer-events: none;
}
.edge-shade.left { left: 0; background: linear-gradient(90deg, #fffaf7 12%, rgba(255, 250, 247, 0)); }
.edge-shade.right { right: 0; background: linear-gradient(-90deg, #fffaf7 12%, rgba(255, 250, 247, 0)); }

.stage-tip { margin: 14px 0 0; color: #b09486; font-size: 11px; text-align: center; }

@keyframes winner-pop {
  0% { transform: translateZ(0) scale(.91); }
  60% { transform: translateZ(0) scale(1.035); }
  100% { transform: translateZ(0) scale(1); }
}

@keyframes stage-enter {
  from { opacity: 0; transform: translateY(7px) scale(.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 389px) {
  .reel-stage { width: 100%; }
}
</style>
