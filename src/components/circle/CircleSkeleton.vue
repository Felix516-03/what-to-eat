<template>
  <div class="skeleton-list" aria-label="正在加载帖子" aria-busy="true">
    <article v-for="item in 3" :key="item" class="skeleton-card">
      <div class="skeleton-line short"></div>
      <div class="skeleton-pill"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line tiny"></div>
    </article>
  </div>
</template>

<style scoped>
.skeleton-list { display: grid; gap: 13px; margin-top: 16px; }
.skeleton-card { padding: 18px; border: 1px solid #f0e5dd; border-radius: 21px; background: rgba(255, 255, 255, .9); }
.skeleton-line, .skeleton-pill { background: linear-gradient(90deg, #f3ece7 25%, #fff8f3 50%, #f3ece7 75%); background-size: 200% 100%; animation: shimmer 1.25s infinite; }
.skeleton-line { height: 11px; margin-top: 10px; border-radius: 8px; }
.skeleton-line.short { width: 40%; margin-top: 0; }
.skeleton-line.medium { width: 72%; }
.skeleton-line.tiny { width: 30%; margin-top: 22px; }
.skeleton-pill { width: 58px; height: 23px; margin-top: 16px; border-radius: 999px; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton-line, .skeleton-pill { animation: none; } }
</style>
