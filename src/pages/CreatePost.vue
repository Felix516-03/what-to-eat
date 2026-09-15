<script setup>
import { computed, ref } from "vue"

import ShopPickerModal from "../components/circle/ShopPickerModal.vue"
import PostTypeChip from "../components/circle/PostTypeChip.vue"
import { createPost } from "../services/circleService.js"
import { getCategoryIcon } from "../utils/categoryIcon.js"

const props = defineProps({
  userId: { type: String, required: true }
})

const emit = defineEmits(["back", "published"])
const types = ["ask", "recommend", "warning", "chat"]
const postType = ref("ask")
const content = ref("")
const selectedShop = ref(null)
const pickerOpen = ref(false)
const submitting = ref(false)
const error = ref("")

const count = computed(() => content.value.length)
const canSubmit = computed(() => Boolean(content.value.trim()) && count.value <= 500 && !submitting.value)

function chooseShop(shop) {
  selectedShop.value = shop
  pickerOpen.value = false
}

async function publish() {
  if (!canSubmit.value) {
    error.value = "写点真实的吃饭想法再发布吧。"
    return
  }

  submitting.value = true
  error.value = ""
  try {
    const post = await createPost({
      userId: props.userId,
      content: content.value,
      postType: postType.value,
      shop: selectedShop.value
    })
    emit("published", post.id)
  } catch {
    error.value = "发布失败，请检查网络后重试。"
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="create-post-page">
    <button class="back-link" type="button" @click="$emit('back')">← 饭圈儿</button>
    <div class="page-heading">
      <span>分享这一口</span>
      <h1>发个帖子</h1>
      <p>校园吃饭讨论区，只聊今天这顿。</p>
    </div>

    <form class="post-form" @submit.prevent="publish">
      <fieldset>
        <legend>帖子类型</legend>
        <div class="type-row">
          <PostTypeChip
            v-for="type in types"
            :key="type"
            :type="type"
            :active="postType === type"
            interactive
            @select="postType = $event"
          />
        </div>
      </fieldset>

      <label class="content-field">
        <span>你想说点什么？</span>
        <textarea
          v-model="content"
          maxlength="500"
          rows="7"
          placeholder="今天不知道吃什么，大家有推荐吗？"
          @input="error = ''"
        ></textarea>
        <small :class="{ near: count >= 450 }">{{ count }} / 500</small>
      </label>

      <section class="shop-field">
        <div>
          <strong>关联店铺</strong>
          <span>可选</span>
        </div>
        <button v-if="!selectedShop" type="button" @click="pickerOpen = true">＋ 选择一家店</button>
        <div v-else class="selected-shop">
          <span aria-hidden="true">{{ getCategoryIcon(selectedShop.category) }}</span>
          <span><strong>{{ selectedShop.name }}</strong><small>{{ selectedShop.category }} · {{ selectedShop.location }}</small></span>
          <button type="button" @click="selectedShop = null">移除</button>
        </div>
      </section>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="publish-button" type="submit" :disabled="!canSubmit">
        {{ submitting ? "发布中…" : "发布" }}
      </button>
    </form>

    <ShopPickerModal
      :open="pickerOpen"
      title="关联一家店"
      @close="pickerOpen = false"
      @select="chooseShop"
    />
  </main>
</template>

<style scoped>
.create-post-page { padding-top: 18px; }
.back-link { padding: 5px 0; border: 0; background: transparent; color: #d85e39; cursor: pointer; font-size: 13px; font-weight: 700; }
.page-heading { margin-top: 18px; }
.page-heading > span { color: #df6a45; font-size: 11px; font-weight: 700; }
.page-heading h1 { margin: 5px 0 5px; font-size: 28px; }
.page-heading p { margin: 0; color: #857a73; font-size: 13px; }
.post-form { display: grid; gap: 22px; margin-top: 26px; }
fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
legend, .content-field > span, .shop-field > div:first-child strong { display: block; margin-bottom: 10px; color: #4d4642; font-size: 13px; font-weight: 700; }
.type-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 3px; scrollbar-width: none; }
.content-field { position: relative; display: block; }
textarea { width: 100%; min-height: 156px; padding: 15px 15px 35px; resize: vertical; border: 1px solid #e7dcd4; border-radius: 18px; outline: none; background: rgba(255, 255, 255, .96); color: #332e2b; font: inherit; font-size: 14px; line-height: 1.7; }
textarea:focus { border-color: #f19a7d; box-shadow: 0 0 0 4px rgba(255, 118, 95, .1); }
.content-field small { position: absolute; right: 13px; bottom: 11px; color: #aa9d95; font-size: 10px; }
.content-field small.near { color: #dc654a; }
.shop-field { padding: 16px; border: 1px solid #eee2da; border-radius: 18px; background: rgba(255, 255, 255, .85); }
.shop-field > div:first-child { display: flex; gap: 7px; align-items: center; }
.shop-field > div:first-child strong { margin: 0; }
.shop-field > div:first-child span { color: #a4968e; font-size: 10px; }
.shop-field > button { width: 100%; margin-top: 13px; padding: 12px; border: 1px dashed #e2c7b7; border-radius: 13px; background: #fff8f2; color: #d45e39; cursor: pointer; font-size: 12px; font-weight: 700; }
.selected-shop { display: grid; grid-template-columns: auto 1fr auto; gap: 9px; margin-top: 13px; padding: 11px; align-items: center; border-radius: 14px; background: #fff5ed; }
.selected-shop > span:first-child { font-size: 21px; }
.selected-shop strong, .selected-shop small { display: block; }
.selected-shop strong { overflow-wrap: anywhere; font-size: 13px; }
.selected-shop small { margin-top: 3px; color: #8c786d; font-size: 10px; }
.selected-shop button { border: 0; background: transparent; color: #c95c45; cursor: pointer; font-size: 11px; }
.form-error { margin: -7px 0 0; color: #cf5849; font-size: 12px; }
.publish-button { width: 100%; padding: 14px; border: 0; border-radius: 15px; background: #ff765f; box-shadow: 0 9px 22px rgba(255, 118, 95, .2); color: #fff; cursor: pointer; font-weight: 700; }
.publish-button:disabled { box-shadow: none; cursor: not-allowed; opacity: .5; }
</style>
