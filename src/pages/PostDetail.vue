<script setup>
import { computed, onMounted, ref } from "vue"

import CommentItem from "../components/circle/CommentItem.vue"
import PostCard from "../components/circle/PostCard.vue"
import ShopPickerModal from "../components/circle/ShopPickerModal.vue"
import ConfirmModal from "../components/ConfirmModal.vue"
import {
  COMMENT_PAGE_SIZE,
  createComment,
  createReport,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPost,
  toggleLike
} from "../services/circleService.js"
import { getCategoryIcon } from "../utils/categoryIcon.js"

const props = defineProps({
  postId: { type: String, required: true },
  userId: { type: String, required: true }
})

const emit = defineEmits(["back", "post-deleted"])
const post = ref(null)
const comments = ref([])
const loading = ref(true)
const error = ref("")
const commentText = ref("")
const selectedShop = ref(null)
const pickerOpen = ref(false)
const sending = ref(false)
const liking = ref(false)
const commentsPage = ref(0)
const hasMoreComments = ref(false)
const loadingMore = ref(false)
const pendingDelete = ref(null)
const toast = ref("")

let toastTimer = null

const commentCount = computed(() => Number(post.value?.comment_count) || comments.value.length)
const canSend = computed(() => Boolean(commentText.value.trim()) && commentText.value.length <= 300 && !sending.value)

function showToast(message) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = "" }, 1700)
}

async function loadDetail() {
  loading.value = true
  error.value = ""
  try {
    const [nextPost, nextComments] = await Promise.all([
      fetchPost(props.postId),
      fetchComments({ postId: props.postId, page: 0 })
    ])
    if (!nextPost) throw new Error("帖子不存在")
    post.value = nextPost
    comments.value = nextComments
    commentsPage.value = 0
    hasMoreComments.value = nextComments.length === COMMENT_PAGE_SIZE
  } catch {
    error.value = "饭圈好像没连上 😵"
  } finally {
    loading.value = false
  }
}

async function loadMoreComments() {
  if (!hasMoreComments.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const nextPage = commentsPage.value + 1
    const items = await fetchComments({ postId: props.postId, page: nextPage })
    comments.value.push(...items)
    commentsPage.value = nextPage
    hasMoreComments.value = items.length === COMMENT_PAGE_SIZE
  } catch {
    showToast("评论加载失败，请稍后重试。")
  } finally {
    loadingMore.value = false
  }
}

async function handleLike() {
  if (!post.value || liking.value) return
  const previousLiked = Boolean(post.value.liked_by_me)
  const previousCount = Number(post.value.like_count) || 0
  post.value = {
    ...post.value,
    liked_by_me: !previousLiked,
    like_count: Math.max(0, previousCount + (previousLiked ? -1 : 1))
  }
  liking.value = true
  try {
    const result = await toggleLike(props.postId)
    post.value = {
      ...post.value,
      liked_by_me: Boolean(result?.liked),
      like_count: Number(result?.like_count) || 0
    }
  } catch {
    post.value = { ...post.value, liked_by_me: previousLiked, like_count: previousCount }
    showToast("点赞失败，已经恢复原状态。")
  } finally {
    liking.value = false
  }
}

async function sendComment() {
  if (!canSend.value) return
  sending.value = true
  try {
    await createComment({
      postId: props.postId,
      userId: props.userId,
      content: commentText.value,
      shop: selectedShop.value
    })
    commentText.value = ""
    selectedShop.value = null
    const firstPage = await fetchComments({ postId: props.postId, page: 0 })
    comments.value = firstPage
    commentsPage.value = 0
    hasMoreComments.value = firstPage.length === COMMENT_PAGE_SIZE
    post.value = { ...post.value, comment_count: commentCount.value + 1 }
    showToast("回复成功 ✓")
  } catch {
    showToast("评论失败，请检查网络后重试。")
  } finally {
    sending.value = false
  }
}

function chooseShop(shop) {
  selectedShop.value = shop
  pickerOpen.value = false
}

async function confirmDelete() {
  const target = pendingDelete.value
  pendingDelete.value = null
  if (!target) return
  try {
    if (target.kind === "post") {
      await deletePost(target.item.id)
      emit("post-deleted")
      return
    }
    await deleteComment(target.item.id)
    comments.value = comments.value.filter(item => item.id !== target.item.id)
    post.value = { ...post.value, comment_count: Math.max(0, commentCount.value - 1) }
    showToast("评论已删除")
  } catch {
    showToast("删除失败，请检查网络后重试。")
  }
}

async function report(targetType, item) {
  try {
    await createReport({ userId: props.userId, targetType, targetId: item.id, reason: "不当内容" })
    showToast("已收到举报，我们会认真处理。")
  } catch {
    showToast("举报提交失败，请稍后重试。")
  }
}

onMounted(loadDetail)
</script>

<template>
  <main class="detail-page">
    <button class="back-link" type="button" @click="$emit('back')">← 饭圈儿</button>

    <div v-if="loading" class="detail-loading">正在端上这条帖子…</div>
    <section v-else-if="error" class="state-card">
      <span aria-hidden="true">📡</span>
      <h2>{{ error }}</h2>
      <button type="button" @click="loadDetail">重试</button>
    </section>

    <template v-else-if="post">
      <PostCard
        :post="post"
        :current-user-id="userId"
        :liking="liking"
        detail
        @like="handleLike"
        @delete="pendingDelete = { kind: 'post', item: $event }"
        @report="report('post', $event)"
      />

      <section class="comments-section">
        <h2>评论 <span>{{ commentCount }}</span></h2>
        <div v-if="comments.length">
          <CommentItem
            v-for="comment in comments"
            :key="comment.id"
            :comment="comment"
            :current-user-id="userId"
            @delete="pendingDelete = { kind: 'comment', item: $event }"
            @report="report('comment', $event)"
          />
          <button
            v-if="hasMoreComments"
            class="load-comments"
            type="button"
            :disabled="loadingMore"
            @click="loadMoreComments"
          >
            {{ loadingMore ? "加载中…" : "加载更多评论" }}
          </button>
        </div>
        <p v-else class="no-comments">还没有评论，来接第一句话吧。</p>
      </section>

      <form class="reply-box" @submit.prevent="sendComment">
        <textarea
          v-model="commentText"
          rows="2"
          maxlength="300"
          placeholder="写个回复吧……"
        ></textarea>
        <div v-if="selectedShop" class="reply-shop">
          <span>{{ getCategoryIcon(selectedShop.category) }} {{ selectedShop.name }}</span>
          <button type="button" @click="selectedShop = null">移除</button>
        </div>
        <div class="reply-actions">
          <button type="button" class="recommend-shop" @click="pickerOpen = true">＋ 推荐店铺</button>
          <span>{{ commentText.length }} / 300</span>
          <button type="submit" class="send-button" :disabled="!canSend">{{ sending ? "发送中" : "发送" }}</button>
        </div>
      </form>
    </template>

    <ShopPickerModal
      :open="pickerOpen"
      title="在评论中推荐"
      @close="pickerOpen = false"
      @select="chooseShop"
    />

    <ConfirmModal
      :open="Boolean(pendingDelete)"
      :title="pendingDelete?.kind === 'post' ? '确定删除这条帖子吗？' : '确定删除这条评论吗？'"
      description="删除后无法恢复。"
      cancel-text="取消"
      confirm-text="删除"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />

    <Transition name="toast">
      <div v-if="toast" class="detail-toast" role="status">{{ toast }}</div>
    </Transition>
  </main>
</template>

<style scoped>
.detail-page { padding-top: 18px; }
.back-link { margin-bottom: 18px; padding: 5px 0; border: 0; background: transparent; color: #d85e39; cursor: pointer; font-size: 13px; font-weight: 700; }
.detail-loading { padding: 80px 10px; color: #8e827a; font-size: 13px; text-align: center; }
.state-card { padding: 55px 20px; border: 1px dashed #e7d8cf; border-radius: 21px; background: rgba(255,255,255,.7); text-align: center; }
.state-card > span { font-size: 35px; }
.state-card h2 { margin: 13px 0; font-size: 17px; }
.state-card button { padding: 9px 20px; border: 0; border-radius: 11px; background: #ff765f; color: #fff; cursor: pointer; font-weight: 700; }
.comments-section { margin-top: 24px; padding: 19px 17px 8px; border: 1px solid #f0e4dc; border-radius: 22px; background: rgba(255,255,255,.9); }
.comments-section > h2 { margin: 0; font-size: 16px; }
.comments-section > h2 span { color: #e06b48; }
.no-comments { padding: 30px 4px; color: #93877f; font-size: 12px; text-align: center; }
.load-comments { display: block; margin: 14px auto; padding: 8px 15px; border: 1px solid #eadbd2; border-radius: 11px; background: #fff; color: #d36040; cursor: pointer; font-size: 11px; }
.reply-box { position: relative; z-index: 1; margin: 18px -5px 0; padding: 11px; border: 1px solid #eadfd8; border-radius: 18px; background: rgba(255,250,246,.96); box-shadow: 0 10px 28px rgba(48,34,27,.12); }
.reply-box textarea { width: 100%; min-height: 55px; padding: 8px 9px; resize: none; border: 0; outline: none; background: transparent; color: #37312d; font: inherit; font-size: 13px; line-height: 1.55; }
.reply-actions { display: flex; gap: 8px; align-items: center; }
.reply-actions > span { margin-left: auto; color: #a4968e; font-size: 9px; }
.reply-actions button { border: 0; cursor: pointer; font-size: 11px; font-weight: 700; }
.recommend-shop { padding: 7px 4px; background: transparent; color: #d56342; }
.send-button { padding: 8px 15px; border-radius: 10px; background: #ff765f; color: #fff; }
.send-button:disabled { cursor: not-allowed; opacity: .5; }
.reply-shop { display: flex; margin: 3px 5px 8px; padding: 8px 10px; align-items: center; justify-content: space-between; border-radius: 10px; background: #fff0e6; color: #79594a; font-size: 11px; }
.reply-shop button { border: 0; background: transparent; color: #cc5e43; cursor: pointer; font-size: 10px; }
.detail-toast { position: fixed; z-index: 150; bottom: calc(86px + env(safe-area-inset-bottom)); left: 50%; max-width: calc(100vw - 36px); padding: 10px 16px; transform: translateX(-50%); border-radius: 13px; background: #302b28; color: #fff; font-size: 12px; text-align: center; }
.toast-enter-active,.toast-leave-active { transition: opacity 150ms ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; }
</style>
