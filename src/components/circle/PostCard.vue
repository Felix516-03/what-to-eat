<script setup>
import { ref } from "vue"

import { formatRelativeTime } from "../../utils/time.js"
import PostTypeChip from "./PostTypeChip.vue"
import ShopRecommendCard from "./ShopRecommendCard.vue"

defineProps({
  post: { type: Object, required: true },
  currentUserId: { type: String, default: "" },
  detail: { type: Boolean, default: false },
  liking: { type: Boolean, default: false }
})

const emit = defineEmits(["open", "like", "delete", "report"])
const menuOpen = ref(false)
</script>

<template>
  <article
    class="post-card"
    :class="{ clickable: !detail }"
    @click="!detail && $emit('open', post.id)"
  >
    <header class="post-meta">
      <div class="author">
        <span class="avatar" aria-hidden="true">{{ (post.nickname || "饭").slice(0, 1) }}</span>
        <span><strong>{{ post.nickname || "匿名干饭人" }}</strong><time>{{ formatRelativeTime(post.created_at) }}</time></span>
      </div>
      <div class="post-menu-wrap">
        <button class="more-button" type="button" aria-label="帖子操作" @click.stop="menuOpen = !menuOpen">•••</button>
        <div v-if="menuOpen" class="post-menu">
          <button
            v-if="post.user_id === currentUserId"
            type="button"
            class="danger-action"
            @click.stop="menuOpen = false; $emit('delete', post)"
          >
            删除帖子
          </button>
          <button
            v-else
            type="button"
            @click.stop="menuOpen = false; $emit('report', post)"
          >
            举报
          </button>
        </div>
      </div>
    </header>

    <PostTypeChip :type="post.post_type" />
    <p class="post-content">{{ post.content }}</p>

    <ShopRecommendCard
      v-if="post.shop_name"
      :name="post.shop_name"
      :location="post.shop_location || ''"
      :category="post.shop_category || ''"
    />

    <footer class="post-actions">
      <button
        type="button"
        class="like-button"
        :class="{ liked: post.liked_by_me }"
        :disabled="liking"
        @click.stop="$emit('like', post)"
      >
        <span aria-hidden="true">{{ post.liked_by_me ? "♥" : "♡" }}</span>
        {{ Number(post.like_count) || 0 }}
      </button>
      <button type="button" @click.stop="$emit('open', post.id)">
        <span aria-hidden="true">💬</span> {{ Number(post.comment_count) || 0 }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.post-card { position: relative; padding: 17px 17px 14px; border: 1px solid #f0e4dc; border-radius: 22px; background: rgba(255, 255, 255, .96); box-shadow: 0 9px 25px rgba(62, 42, 31, .055); }
.post-card.clickable { cursor: pointer; }
.post-meta { display: flex; margin-bottom: 14px; align-items: flex-start; justify-content: space-between; }
.author { display: flex; gap: 10px; align-items: center; }
.avatar { display: grid; width: 37px; height: 37px; place-items: center; border-radius: 13px; background: linear-gradient(145deg, #ffe1ce, #fff2e9); color: #dc6743; font-size: 15px; font-weight: 800; }
.author strong, .author time { display: block; }
.author strong { max-width: 190px; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.author time { margin-top: 4px; color: #a0938b; font-size: 10px; }
.post-menu-wrap { position: relative; }
.more-button { padding: 4px 2px 7px 10px; border: 0; background: transparent; color: #a99a91; cursor: pointer; letter-spacing: 1px; }
.post-menu { position: absolute; z-index: 3; top: 27px; right: 0; width: 92px; padding: 5px; border: 1px solid #ebdfd7; border-radius: 12px; background: #fff; box-shadow: 0 10px 25px rgba(46, 32, 26, .14); }
.post-menu button { width: 100%; padding: 8px; border: 0; border-radius: 8px; background: transparent; color: #655a54; cursor: pointer; font-size: 12px; text-align: left; }
.post-menu .danger-action { color: #d45649; }
.post-content { margin: 13px 1px 0; color: #332e2b; font-size: 15px; line-height: 1.72; overflow-wrap: anywhere; white-space: pre-wrap; }
.post-actions { display: flex; gap: 8px; margin-top: 15px; padding-top: 12px; border-top: 1px solid #f2ebe6; }
.post-actions button { display: flex; min-width: 72px; gap: 6px; padding: 5px 9px; align-items: center; border: 0; background: transparent; color: #8b7d75; cursor: pointer; font-size: 12px; }
.post-actions button:disabled { opacity: .55; }
.post-actions .liked { color: #ee664e; font-weight: 700; }
.like-button span { font-size: 18px; line-height: 1; }
</style>
