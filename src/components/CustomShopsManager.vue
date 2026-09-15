<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"

import {
  CUSTOM_SHOPS_CHANGED_EVENT,
  addCustomShop,
  deleteCustomShop,
  getAllShops,
  getCustomShops,
  getHistory,
  updateCustomShop
} from "../utils/storage.js"
import ConfirmModal from "./ConfirmModal.vue"

const view = ref("list")
const customShops = ref([])
const allShops = ref([])
const history = ref([])
const editingId = ref(null)
const form = ref({ name: "", location: "", category: "" })
const errors = ref({})
const pendingDialog = ref(null)
const toast = ref("")

let toastTimer = null

const locations = computed(() => (
  [...new Set(allShops.value.map(shop => shop.location).filter(Boolean))]
))
const categories = computed(() => (
  [...new Set(allShops.value.map(shop => shop.category).filter(Boolean))]
))
const isEditing = computed(() => Boolean(editingId.value))
const dialogOpen = computed(() => Boolean(pendingDialog.value))
const dialogTitle = computed(() => (
  pendingDialog.value?.type === "delete"
    ? `要删除「${pendingDialog.value.shop.name}」吗？`
    : "这个地点已经有同名店铺了。"
))
const dialogDescription = computed(() => (
  pendingDialog.value?.type === "delete"
    ? "删除后，它将不再参与以后抽卡。\n已有的宠幸记录不会被删除。"
    : "同名同地点的店铺已经存在。确实是另一家店时，你仍然可以继续添加。"
))
const dialogCancelText = computed(() => (
  pendingDialog.value?.type === "delete" ? "算了" : "返回修改"
))
const dialogConfirmText = computed(() => (
  pendingDialog.value?.type === "delete" ? "删除" : "继续添加"
))

function refresh() {
  customShops.value = getCustomShops()
  allShops.value = getAllShops()
  history.value = getHistory()
}

function hasBeenChosen(shopId) {
  return history.value.some(record => String(record.shopId) === String(shopId))
}

function clearForm() {
  editingId.value = null
  form.value = { name: "", location: "", category: "" }
  errors.value = {}
}

function openAdd() {
  clearForm()
  view.value = "form"
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function openEdit(shop) {
  editingId.value = shop.id
  form.value = {
    name: shop.name,
    location: shop.location,
    category: shop.category
  }
  errors.value = {}
  view.value = "form"
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function closeForm() {
  clearForm()
  view.value = "list"
}

function clearError(field) {
  if (!errors.value[field]) return
  errors.value = { ...errors.value, [field]: "" }
}

function validateForm() {
  const nextErrors = {}
  const values = {
    name: form.value.name.trim(),
    location: form.value.location.trim(),
    category: form.value.category.trim()
  }

  if (!values.name) nextErrors.name = "请输入店铺名"
  if (!values.location) nextErrors.location = "请输入地点"
  if (!values.category) nextErrors.category = "请输入分类"
  errors.value = nextErrors

  return Object.keys(nextErrors).length ? null : values
}

function isDuplicate(values) {
  const normalizedName = values.name.toLowerCase()
  const normalizedLocation = values.location.toLowerCase()

  return allShops.value.some(shop => (
    String(shop.id) !== String(editingId.value) &&
    shop.name.trim().toLowerCase() === normalizedName &&
    shop.location.trim().toLowerCase() === normalizedLocation
  ))
}

function showToast(message) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ""
  }, 1350)
}

function persist(values) {
  const saved = isEditing.value
    ? updateCustomShop(editingId.value, values)
    : addCustomShop(values)

  if (!saved) return
  const message = isEditing.value ? "店铺信息已更新 ✓" : "已加入抽卡池 ✓"
  closeForm()
  refresh()
  showToast(message)
}

function submitForm() {
  const values = validateForm()
  if (!values) return

  if (isDuplicate(values)) {
    pendingDialog.value = { type: "duplicate", values }
    return
  }

  persist(values)
}

function requestDelete(shop) {
  pendingDialog.value = { type: "delete", shop }
}

function cancelDialog() {
  pendingDialog.value = null
}

function confirmDialog() {
  const action = pendingDialog.value
  if (!action) return
  pendingDialog.value = null

  if (action.type === "delete") {
    if (deleteCustomShop(action.shop.id)) {
      refresh()
      showToast("已从抽卡池移除")
    }
    return
  }

  persist(action.values)
}

onMounted(() => {
  refresh()
  window.addEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refresh)
})

onUnmounted(() => {
  window.removeEventListener(CUSTOM_SHOPS_CHANGED_EVENT, refresh)
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="custom-shops-manager">
    <template v-if="view === 'list'">
      <div class="list-toolbar">
        <span>{{ customShops.length }} 家自定义店铺</span>
        <button class="add-compact" @click="openAdd">＋ 添加店铺</button>
      </div>

      <div v-if="customShops.length" class="custom-shop-list">
        <article v-for="shop in customShops" :key="shop.id" class="custom-shop-card">
          <div class="custom-shop-copy">
            <div class="shop-name-row">
              <h2>{{ shop.name }}</h2>
              <span v-if="!hasBeenChosen(shop.id)" class="new-label">新加入</span>
            </div>
            <p>{{ shop.category }} · {{ shop.location }}</p>
          </div>
          <div class="shop-actions">
            <button @click="openEdit(shop)">编辑</button>
            <button class="delete-button" @click="requestDelete(shop)">删除</button>
          </div>
        </article>
      </div>

      <div v-else class="custom-empty">
        <span aria-hidden="true">🏪</span>
        <h2>还没有自己添加的店铺</h2>
        <p>把你私藏的饭点，也加进抽卡池。</p>
        <button @click="openAdd">＋ 添加店铺</button>
      </div>
    </template>

    <template v-else>
      <button class="form-back" type="button" @click="closeForm">← 我的店铺</button>
      <div class="form-heading">
        <span>{{ isEditing ? "编辑饭点" : "新增饭点" }}</span>
        <h2>{{ isEditing ? "修改店铺信息" : "添加自己的店铺" }}</h2>
        <p>三个信息就够了，之后会和官方店铺一起参与抽卡。</p>
      </div>

      <form class="shop-form" novalidate @submit.prevent="submitForm">
        <label>
          <span>店铺名 <b>*</b></span>
          <input
            v-model="form.name"
            maxlength="30"
            autocomplete="organization"
            placeholder="例如：麻辣香锅"
            :aria-invalid="Boolean(errors.name)"
            @input="clearError('name')"
          >
          <small v-if="errors.name" class="field-error">{{ errors.name }}</small>
        </label>

        <label>
          <span>地点 <b>*</b></span>
          <input
            v-model="form.location"
            list="shop-location-options"
            maxlength="30"
            autocomplete="off"
            placeholder="例如：新综"
            :aria-invalid="Boolean(errors.location)"
            @input="clearError('location')"
          >
          <datalist id="shop-location-options">
            <option v-for="location in locations" :key="location" :value="location"></option>
          </datalist>
          <small v-if="errors.location" class="field-error">{{ errors.location }}</small>
        </label>

        <label>
          <span>分类 <b>*</b></span>
          <input
            v-model="form.category"
            list="shop-category-options"
            maxlength="20"
            autocomplete="off"
            placeholder="可选择或输入新分类"
            :aria-invalid="Boolean(errors.category)"
            @input="clearError('category')"
          >
          <datalist id="shop-category-options">
            <option v-for="category in categories" :key="category" :value="category"></option>
          </datalist>
          <small v-if="errors.category" class="field-error">{{ errors.category }}</small>
        </label>

        <div class="form-actions">
          <button class="cancel-form" type="button" @click="closeForm">取消</button>
          <button class="submit-form" type="submit">
            {{ isEditing ? "保存修改" : "添加到抽卡池" }}
          </button>
        </div>
      </form>
    </template>

    <Transition name="toast">
      <div v-if="toast" class="shop-toast" role="status">{{ toast }}</div>
    </Transition>

    <ConfirmModal
      :open="dialogOpen"
      :title="dialogTitle"
      :description="dialogDescription"
      :cancel-text="dialogCancelText"
      :confirm-text="dialogConfirmText"
      @cancel="cancelDialog"
      @confirm="confirmDialog"
    />
  </section>
</template>

<style scoped>
.custom-shops-manager { min-height: 330px; padding-bottom: 24px; }

.list-toolbar {
  display: flex;
  margin-bottom: 14px;
  align-items: center;
  justify-content: space-between;
  color: #95857c;
  font-size: 12px;
}

.add-compact,
.custom-empty button {
  border: 0;
  border-radius: 12px;
  background: #ff765f;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

.add-compact { padding: 9px 12px; font-size: 12px; }
.custom-shop-list { display: grid; gap: 12px; }

.custom-shop-card {
  padding: 18px 17px 15px;
  border: 1px solid #f0e3da;
  border-radius: 20px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 9px 24px rgba(53, 37, 28, .055);
}

.custom-shop-copy { min-width: 0; }
.shop-name-row { display: flex; gap: 8px; align-items: center; }
.shop-name-row h2 { min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: 18px; }
.new-label { flex: 0 0 auto; padding: 3px 7px; border-radius: 9px; background: #fff0e8; color: #dc6541; font-size: 10px; font-weight: 700; }
.custom-shop-copy p { margin: 7px 0 0; color: #7f7772; font-size: 12px; }

.shop-actions { display: flex; gap: 9px; margin-top: 15px; justify-content: flex-end; }
.shop-actions button { padding: 8px 15px; border: 1px solid #e2d8d2; border-radius: 11px; background: #fff; color: #645b56; cursor: pointer; font-size: 12px; }
.shop-actions .delete-button { border-color: #f0d2ca; color: #cf5e4e; }

.custom-empty {
  padding: 53px 20px;
  border: 1px dashed #eadcd2;
  border-radius: 21px;
  background: rgba(255, 255, 255, .66);
  text-align: center;
}
.custom-empty > span { font-size: 42px; }
.custom-empty h2 { margin: 15px 0 7px; font-size: 18px; }
.custom-empty p { margin: 0; color: #7e7772; font-size: 13px; line-height: 1.6; }
.custom-empty button { margin-top: 20px; padding: 11px 20px; font-size: 13px; }

.form-back { margin: 0 0 17px; padding: 4px 0; border: 0; background: transparent; color: #d85d38; cursor: pointer; font-size: 13px; font-weight: 700; }
.form-heading > span { color: #df6a45; font-size: 11px; font-weight: 700; }
.form-heading h2 { margin: 5px 0 6px; font-size: 22px; }
.form-heading p { margin: 0; color: #837a75; font-size: 13px; line-height: 1.6; }

.shop-form { display: grid; gap: 18px; margin-top: 23px; padding-bottom: 36px; }
.shop-form label > span { display: block; margin-bottom: 8px; color: #4e4844; font-size: 13px; font-weight: 700; }
.shop-form label b { color: #e35f43; }
.shop-form input {
  width: 100%;
  padding: 14px 15px;
  border: 1px solid #e7ddd7;
  border-radius: 15px;
  outline: none;
  background: rgba(255, 255, 255, .96);
  color: #302b28;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.shop-form input:focus { border-color: #f3a082; box-shadow: 0 0 0 4px rgba(255, 118, 95, .1); }
.shop-form input[aria-invalid="true"] { border-color: #db6e5c; }
.field-error { display: block; margin: 6px 2px 0; color: #cf5645; font-size: 11px; }

.form-actions { display: grid; grid-template-columns: 1fr 1.45fr; gap: 10px; margin-top: 5px; }
.form-actions button { min-width: 0; padding: 13px 8px; border-radius: 14px; cursor: pointer; font-weight: 700; }
.cancel-form { border: 1px solid #e2d8d2; background: #fff; color: #655c57; }
.submit-form { border: 0; background: #ff765f; color: #fff; }

.shop-toast { position: fixed; z-index: 80; bottom: calc(82px + env(safe-area-inset-bottom)); left: 50%; width: max-content; max-width: calc(100vw - 40px); padding: 10px 17px; transform: translateX(-50%); border-radius: 13px; background: #302b28; box-shadow: 0 9px 25px rgba(42, 31, 26, .22); color: #fff; font-size: 13px; }
.toast-enter-active, .toast-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 7px); }

@media (prefers-reduced-motion: reduce) {
  .shop-form input,
  .toast-enter-active,
  .toast-leave-active { transition: none; }
}
</style>
