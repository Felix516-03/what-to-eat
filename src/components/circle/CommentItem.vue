<script setup>
import { ref } from "vue"

import { formatRelativeTime } from "../../utils/time.js"
import ShopRecommendCard from "./ShopRecommendCard.vue"

defineProps({
  comment: { type: Object, required: true },
  currentUserId: { type: String, default: "" }
})

defineEmits(["delete", "report"])
const menuOpen = ref(false)
</script>

<template>
  <article class="comment-item">
    <span class="comment-avatar" aria-hidden="true">{{ (comment.profiles?.nickname || "饭").slice(0, 1) }}</span>
    <div class="comment-body">
      <div class="comment-head">
        <span><strong>{{ comment.profiles?.nickname || "匿名干饭人" }}</strong><time>{{ formatRelativeTime(comment.created_at) }}</time></span>
        <div class="comment-menu-wrap">
          <button type="button" aria-label="评论操作" @click="menuOpen = !menuOpen">•••</button>
          <div v-if="menuOpen" class="comment-menu">
            <button
              v-if="comment.user_id === currentUserId"
              class="danger"
              type="button"
              @click="menuOpen = false; $emit('delete', comment)"
            >
              删除评论
            </button>
            <button v-else type="button" @click="menuOpen = false; $emit('report', comment)">举报</button>
          </div>
        </div>
      </div>
      <p>{{ comment.content }}</p>
      <ShopRecommendCard
        v-if="comment.recommended_shop_name"
        compact
        :name="comment.recommended_shop_name"
        :location="comment.recommended_shop_location || ''"
        :category="comment.recommended_shop_category || ''"
      />
    </div>
  </article>
</template>

<style scoped>
.comment-item { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 17px 0; border-bottom: 1px solid #f0e7e1; }
.comment-avatar { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 12px; background: #f7e9df; color: #d46643; font-size: 13px; font-weight: 800; }
.comment-body { min-width: 0; }
.comment-head { display: flex; align-items: flex-start; justify-content: space-between; }
.comment-head strong, .comment-head time { display: block; }
.comment-head strong { font-size: 12px; }
.comment-head time { margin-top: 3px; color: #a2958d; font-size: 9px; }
.comment-menu-wrap { position: relative; }
.comment-menu-wrap > button { padding: 0 0 5px 9px; border: 0; background: transparent; color: #ad9f97; cursor: pointer; font-size: 11px; letter-spacing: 1px; }
.comment-menu { position: absolute; z-index: 3; top: 21px; right: 0; width: 92px; padding: 5px; border: 1px solid #ebdfd7; border-radius: 11px; background: #fff; box-shadow: 0 9px 22px rgba(46, 32, 26, .14); }
.comment-menu button { width: 100%; padding: 7px; border: 0; border-radius: 7px; background: transparent; color: #685d57; cursor: pointer; font-size: 11px; text-align: left; }
.comment-menu .danger { color: #d45649; }
.comment-body > p { margin: 10px 0 0; color: #3c3632; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; white-space: pre-wrap; }
</style>
