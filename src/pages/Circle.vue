<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue"

import CircleSkeleton from "../components/circle/CircleSkeleton.vue"
import PostCard from "../components/circle/PostCard.vue"
import PostTypeChip from "../components/circle/PostTypeChip.vue"
import ConfirmModal from "../components/ConfirmModal.vue"
import {
  POST_PAGE_SIZE,
  createReport,
  deletePost,
  ensureAnonymousIdentity,
  fetchPosts,
  getProfile,
  toggleLike,
  updateProfile
} from "../services/circleService.js"
import CreatePost from "./CreatePost.vue"
import PostDetail from "./PostDetail.vue"

const user = ref(null)
const profile = ref(null)
const identityLoading = ref(true)
const identityError = ref("")
const nickname = ref("")
const nicknameError = ref("")
const savingNickname = ref(false)

const view = ref("feed")
const activePostId = ref("")
const posts = ref([])
const filter = ref("all")
const loading = ref(false)
const loadingMore = ref(false)
const feedError = ref("")
const page = ref(0)
const hasMore = ref(true)
const likingIds = ref(new Set())
const pendingDelete = ref(null)
const toast = ref("")

const types = ["all", "ask", "recommend", "warning", "chat"]
let toastTimer = null

function showToast(message) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = "" }, 1800)
}

async function initialize() {
  identityLoading.value = true
  identityError.value = ""
  try {
    user.value = await ensureAnonymousIdentity()
    profile.value = await getProfile(user.value.id)
    if (profile.value) await loadPosts(true)
  } catch (error) {
    identityError.value = error?.message || "饭圈好像没连上 😵"
  } finally {
    identityLoading.value = false
  }
}

async function saveNickname() {
  const value = nickname.value.trim()
  if (!value) {
    nicknameError.value = "先给自己取个昵称吧。"
    return
  }
  if (value.length > 30) {
    nicknameError.value = "昵称最多 30 个字。"
    return
  }

  savingNickname.value = true
  nicknameError.value = ""
  try {
    profile.value = await updateProfile(user.value.id, value)
    await loadPosts(true)
  } catch {
    nicknameError.value = "昵称保存失败，请检查网络后重试。"
  } finally {
    savingNickname.value = false
  }
}

async function loadPosts(reset = false) {
  if (!user.value) return
  if (reset) {
    loading.value = true
    feedError.value = ""
    page.value = 0
  } else {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
  }

  try {
    const targetPage = reset ? 0 : page.value + 1
    const items = await fetchPosts({ type: filter.value, page: targetPage })
    posts.value = reset ? items : [...posts.value, ...items]
    page.value = targetPage
    hasMore.value = items.length === POST_PAGE_SIZE
  } catch {
    if (reset) feedError.value = "饭圈好像没连上 😵"
    else showToast("加载更多失败，请稍后重试。")
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function changeFilter(type) {
  if (filter.value === type || loading.value) return
  filter.value = type
  await loadPosts(true)
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function openPost(postId) {
  activePostId.value = postId
  view.value = "detail"
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function openCreate() {
  view.value = "create"
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function handlePublished(postId) {
  await loadPosts(true)
  openPost(postId)
}

async function returnToFeed(refresh = false) {
  view.value = "feed"
  activePostId.value = ""
  if (refresh) await loadPosts(true)
  await nextTick()
  window.scrollTo({ top: 0, behavior: "smooth" })
}

async function handleLike(post) {
  if (likingIds.value.has(post.id)) return
  const previousLiked = Boolean(post.liked_by_me)
  const previousCount = Number(post.like_count) || 0
  post.liked_by_me = !previousLiked
  post.like_count = Math.max(0, previousCount + (previousLiked ? -1 : 1))
  likingIds.value = new Set([...likingIds.value, post.id])
  try {
    const result = await toggleLike(post.id)
    post.liked_by_me = Boolean(result?.liked)
    post.like_count = Number(result?.like_count) || 0
  } catch {
    post.liked_by_me = previousLiked
    post.like_count = previousCount
    showToast("点赞失败，已经恢复原状态。")
  } finally {
    const next = new Set(likingIds.value)
    next.delete(post.id)
    likingIds.value = next
  }
}

async function confirmDelete() {
  const post = pendingDelete.value
  pendingDelete.value = null
  if (!post) return
  try {
    await deletePost(post.id)
    posts.value = posts.value.filter(item => item.id !== post.id)
    showToast("帖子已删除")
  } catch {
    showToast("删除失败，请检查网络后重试。")
  }
}

async function reportPost(post) {
  try {
    await createReport({
      userId: user.value.id,
      targetType: "post",
      targetId: post.id,
      reason: "不当内容"
    })
    showToast("已收到举报，我们会认真处理。")
  } catch {
    showToast("举报提交失败，请稍后重试。")
  }
}

function handleScroll() {
  if (
    view.value === "feed" &&
    !loading.value &&
    !loadingMore.value &&
    hasMore.value &&
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 180
  ) {
    loadPosts(false)
  }
}

onMounted(() => {
  initialize()
  window.addEventListener("scroll", handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll)
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="circle-root">
    <div v-if="identityLoading" class="identity-loading">
      <span aria-hidden="true">🍚</span>
      <p>正在加入饭圈儿…</p>
    </div>

    <section v-else-if="identityError" class="connection-state">
      <span aria-hidden="true">📡</span>
      <h2>饭圈好像没连上 😵</h2>
      <p>{{ identityError }}</p>
      <button type="button" @click="initialize">重试</button>
    </section>

    <section v-else-if="!profile" class="nickname-card">
      <span class="welcome-tag">第一次来饭圈儿</span>
      <div class="nickname-icon" aria-hidden="true">👋</div>
      <h1>先认识一下吧</h1>
      <p>匿名身份已经创建。取个昵称，以后大家就这样叫你。</p>
      <form @submit.prevent="saveNickname">
        <label>
          <span>你的昵称</span>
          <input
            v-model="nickname"
            maxlength="30"
            autocomplete="nickname"
            placeholder="例如：干饭小王"
            @input="nicknameError = ''"
          >
        </label>
        <small v-if="nicknameError" role="alert">{{ nicknameError }}</small>
        <button type="submit" :disabled="savingNickname">
          {{ savingNickname ? "保存中…" : "进入饭圈儿" }}
        </button>
      </form>
    </section>

    <CreatePost
      v-else-if="view === 'create'"
      :user-id="user.id"
      @back="returnToFeed(false)"
      @published="handlePublished"
    />

    <PostDetail
      v-else-if="view === 'detail'"
      :post-id="activePostId"
      :user-id="user.id"
      @back="returnToFeed(true)"
      @post-deleted="returnToFeed(true)"
    />

    <main v-else class="circle-feed">
      <header class="circle-heading">
        <div>
          <span class="circle-eyebrow">校园吃饭讨论区</span>
          <h1>饭圈儿</h1>
          <p>看看大家今天都在吃什么。</p>
        </div>
        <span class="profile-pill">{{ profile.nickname }}</span>
      </header>

      <div class="feed-tools">
        <button class="create-button" type="button" @click="openCreate">＋ 发个帖子</button>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadPosts(true)" aria-label="刷新帖子">↻</button>
      </div>

      <nav class="filter-row" aria-label="帖子类型筛选">
        <PostTypeChip
          v-for="type in types"
          :key="type"
          :type="type"
          :active="filter === type"
          interactive
          @select="changeFilter"
        />
      </nav>

      <CircleSkeleton v-if="loading" />

      <section v-else-if="feedError" class="connection-state compact-state">
        <span aria-hidden="true">📡</span>
        <h2>{{ feedError }}</h2>
        <button type="button" @click="loadPosts(true)">重试</button>
      </section>

      <section v-else-if="!posts.length" class="empty-state">
        <span aria-hidden="true">🥢</span>
        <h2>暂时还没人发帖</h2>
        <p>要不要来当第一个干饭人？</p>
        <button type="button" @click="openCreate">发个帖子</button>
      </section>

      <div v-else class="post-list">
        <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          :current-user-id="user.id"
          :liking="likingIds.has(post.id)"
          @open="openPost"
          @like="handleLike"
          @delete="pendingDelete = $event"
          @report="reportPost"
        />
        <div class="pagination-state">
          <button v-if="hasMore" type="button" :disabled="loadingMore" @click="loadPosts(false)">
            {{ loadingMore ? "加载中…" : "加载更多" }}
          </button>
          <span v-else>已经看到圈底啦</span>
        </div>
      </div>
    </main>

    <ConfirmModal
      :open="Boolean(pendingDelete)"
      title="确定删除这条帖子吗？"
      description="删除后无法恢复。"
      cancel-text="取消"
      confirm-text="删除"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />

    <Transition name="toast">
      <div v-if="toast" class="circle-toast" role="status">{{ toast }}</div>
    </Transition>
  </section>
</template>

<style scoped>
.circle-root { min-height: 520px; }
.identity-loading { display: grid; min-height: 430px; place-items: center; align-content: center; color: #8d8078; font-size: 13px; }
.identity-loading span { font-size: 39px; animation: bob 1s ease-in-out infinite alternate; }
.identity-loading p { margin: 12px 0 0; }
.connection-state, .empty-state { margin-top: 28px; padding: 55px 20px; border: 1px dashed #e8d9d0; border-radius: 22px; background: rgba(255,255,255,.7); text-align: center; }
.connection-state > span, .empty-state > span { font-size: 39px; }
.connection-state h2, .empty-state h2 { margin: 14px 0 6px; font-size: 18px; }
.connection-state p, .empty-state p { margin: 0; color: #887c74; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.connection-state button, .empty-state button { margin-top: 18px; padding: 10px 22px; border: 0; border-radius: 12px; background: #ff765f; color: #fff; cursor: pointer; font-weight: 700; }
.compact-state { padding-block: 45px; }
.nickname-card { margin-top: 28px; padding: 28px 23px 24px; border: 1px solid #f0dfd4; border-radius: 25px; background: rgba(255,255,255,.94); box-shadow: 0 15px 38px rgba(61,41,30,.08); text-align: center; }
.welcome-tag { color: #db6744; font-size: 11px; font-weight: 700; }
.nickname-icon { margin-top: 15px; font-size: 39px; }
.nickname-card h1 { margin: 10px 0 7px; font-size: 25px; }
.nickname-card > p { margin: 0 auto; max-width: 270px; color: #82766f; font-size: 13px; line-height: 1.65; }
.nickname-card form { margin-top: 23px; text-align: left; }
.nickname-card label span { display: block; margin-bottom: 8px; color: #554d48; font-size: 12px; font-weight: 700; }
.nickname-card input { width: 100%; padding: 13px 14px; border: 1px solid #e7dbd3; border-radius: 14px; outline: none; background: #fffaf7; }
.nickname-card input:focus { border-color: #ee9b80; box-shadow: 0 0 0 4px rgba(255,118,95,.1); }
.nickname-card form small { display: block; margin: 7px 2px 0; color: #ce5748; font-size: 11px; }
.nickname-card form button { width: 100%; margin-top: 14px; padding: 13px; border: 0; border-radius: 14px; background: #ff765f; color: #fff; cursor: pointer; font-weight: 700; }
.circle-feed { padding-top: 20px; }
.circle-heading { display: flex; gap: 14px; align-items: flex-start; justify-content: space-between; }
.circle-eyebrow { color: #dc6743; font-size: 11px; font-weight: 700; }
.circle-heading h1 { margin: 5px 0 3px; font-size: 30px; }
.circle-heading p { margin: 0; color: #7e746e; font-size: 13px; }
.profile-pill { max-width: 108px; margin-top: 8px; padding: 7px 10px; overflow: hidden; border-radius: 999px; background: #fff0e6; color: #c85a38; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.feed-tools { display: grid; grid-template-columns: 1fr auto; gap: 9px; margin-top: 22px; }
.create-button { padding: 12px; border: 0; border-radius: 14px; background: #ff765f; box-shadow: 0 8px 20px rgba(255,118,95,.18); color: #fff; cursor: pointer; font-weight: 700; }
.refresh-button { width: 44px; border: 1px solid #eaded6; border-radius: 14px; background: #fff; color: #d86543; cursor: pointer; font-size: 21px; }
.filter-row { display: flex; gap: 8px; margin: 17px -22px 0; padding: 0 22px 4px; overflow-x: auto; scrollbar-width: none; }
.post-list { display: grid; gap: 13px; margin-top: 16px; }
.pagination-state { padding: 14px 0 2px; color: #aa9a91; font-size: 11px; text-align: center; }
.pagination-state button { padding: 9px 18px; border: 1px solid #e7d9d0; border-radius: 12px; background: #fff; color: #d35f3e; cursor: pointer; font-size: 11px; font-weight: 700; }
.circle-toast { position: fixed; z-index: 150; bottom: calc(84px + env(safe-area-inset-bottom)); left: 50%; max-width: calc(100vw - 36px); padding: 10px 16px; transform: translateX(-50%); border-radius: 13px; background: #302b28; color: #fff; font-size: 12px; text-align: center; }
.toast-enter-active,.toast-leave-active { transition: opacity 150ms ease; }
.toast-enter-from,.toast-leave-to { opacity: 0; }
@keyframes bob { to { transform: translateY(-5px); } }
@media (max-width: 389px) { .filter-row { margin-inline: -16px; padding-inline: 16px; } }
@media (prefers-reduced-motion: reduce) { .identity-loading span { animation: none; } }
</style>
