<script setup>
import RatingSlider from "./RatingSlider.vue"

defineProps({
  shop: { type: Object, required: true },
  score: { type: Number, default: 3 },
  saved: { type: Boolean, default: false },
  variant: { type: String, default: "monthly" }
})

defineEmits(["update:score", "rate"])
</script>

<template>
  <article class="preference-card">
    <div class="card-top">
      <div class="shop-copy">
        <span v-if="variant === 'favorite'" class="favorite-label">❤️ 心头好</span>
        <h3>{{ shop.name }}</h3>
        <p>{{ shop.category }} · {{ shop.location }}</p>
      </div>

      <div v-if="variant === 'monthly'" class="visit-count">
        <strong>{{ shop.count }}</strong>
        <span>次宠幸</span>
      </div>
      <div v-else class="favorite-score">
        <span>当前评分</span>
        <strong>{{ score === 5 ? "😋" : score }}</strong>
      </div>
    </div>

    <p v-if="variant === 'favorite'" class="monthly-visits">
      本月宠幸 {{ shop.count }} 次
    </p>

    <RatingSlider
      :model-value="score"
      :shop-name="shop.name"
      :saved="saved"
      @update:model-value="$emit('update:score', $event)"
      @commit="$emit('rate', $event)"
    />
  </article>
</template>

<style scoped>
.preference-card {
  padding: 20px 18px 18px;
  border: 1px solid #f0e6de;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 9px 24px rgba(53, 37, 28, 0.06);
}

.card-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.shop-copy { min-width: 0; }

.preference-card h3 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 18px;
  line-height: 1.35;
}

.preference-card p {
  margin: 7px 0 0;
  color: #777;
  font-size: 13px;
}

.favorite-label {
  display: block;
  margin-bottom: 7px;
  color: #d85d55;
  font-size: 12px;
  font-weight: 700;
}

.visit-count,
.favorite-score {
  flex: 0 0 auto;
  min-width: 62px;
  padding: 8px 7px;
  border-radius: 13px;
  background: #fff5ef;
  color: #e1643f;
  text-align: center;
}

.visit-count strong,
.visit-count span,
.favorite-score strong,
.favorite-score span { display: block; }
.visit-count strong,
.favorite-score strong { font-size: 20px; }
.visit-count span,
.favorite-score span { margin-top: 1px; font-size: 11px; }

.monthly-visits { color: #a56c55 !important; }

@media (max-width: 389px) {
  .preference-card { padding-inline: 15px; }
}
</style>
