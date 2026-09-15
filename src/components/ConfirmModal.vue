<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  shopName: { type: String, default: "" },
  description: { type: String, required: true },
  cancelText: { type: String, required: true },
  confirmText: { type: String, required: true }
})

defineEmits(["cancel", "confirm"])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-backdrop" @click.self="$emit('cancel')">
        <section
          class="modal-card"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="modal-icon" aria-hidden="true">👑</div>
          <h2>{{ title }}</h2>
          <strong v-if="shopName" class="modal-shop">{{ shopName }}</strong>
          <p>{{ description }}</p>
          <div class="modal-actions">
            <button class="cancel-button" @click="$emit('cancel')">{{ cancelText }}</button>
            <button class="confirm-button" @click="$emit('confirm')">{{ confirmText }}</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  padding: 16px;
  place-items: center;
  background: rgba(34, 27, 23, 0.44);
  backdrop-filter: blur(4px);
}

.modal-card {
  width: min(358px, calc(100vw - 32px));
  padding: 27px 22px 21px;
  border: 1px solid #f0ded3;
  border-radius: 24px;
  background: #fffaf6;
  box-shadow: 0 24px 60px rgba(43, 30, 24, 0.24);
  color: #2b2826;
  text-align: center;
}

.modal-icon { font-size: 30px; }

.modal-card h2 {
  margin: 10px 0 8px;
  font-size: 21px;
}

.modal-shop {
  display: block;
  overflow-wrap: anywhere;
  color: #df633f;
  font-size: 17px;
}

.modal-card p {
  margin: 16px auto 22px;
  max-width: 255px;
  color: #756b65;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.modal-actions button {
  min-width: 0;
  padding: 12px 8px;
  border-radius: 13px;
  cursor: pointer;
  font-weight: 700;
}

.cancel-button {
  border: 1px solid #e3d6cf;
  background: #fff;
  color: #665b55;
}

.confirm-button {
  border: 0;
  background: #ff765f;
  color: #fff;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 160ms ease; }
.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card { transition: transform 160ms ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-card,
.modal-fade-leave-to .modal-card { transform: translateY(8px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active,
  .modal-fade-enter-active .modal-card,
  .modal-fade-leave-active .modal-card { transition: none; }
}
</style>
