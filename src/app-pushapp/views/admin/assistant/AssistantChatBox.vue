<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  expanded: { type: Boolean, default: false },
  title: { type: String, default: "Assistant" },
  subtitle: { type: String, default: "" },
  minimizedTitle: { type: String, default: "PushApp AI" },
  minimizedSubtitle: { type: String, default: "How can I help?" },
  placeholder: { type: String, default: "Ask anything…" },
  emptyMessage: {
    type: String,
    default: "Hi! How can I help you today?",
  },
  poweredBy: { type: String, default: "⚡ Powered by PushApp AI" },
  messages: { type: Array, default: () => [] },
  isBootstrapping: { type: Boolean, default: false },
  isSending: { type: Boolean, default: false },
  layoutOpenClass: { type: String, default: "assistant-chat-open" },
});

const emit = defineEmits(["update:expanded", "send"]);

const draft = ref("");
const messagesEl = ref(null);
const inputRef = ref(null);

const roleLabel = (role) => (role === "user" ? "You" : "AI");

const isThinking = computed(() => {
  if (props.isSending) return true;
  const last = props.messages[props.messages.length - 1];
  return last?.role === "user";
});

const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

const focusInput = async () => {
  await nextTick();
  inputRef.value?.focus?.();
};

const expand = () => emit("update:expanded", true);
const minimize = () => emit("update:expanded", false);

const submit = () => {
  const content = draft.value.trim();
  if (!content || props.isBootstrapping || props.isSending) return;
  draft.value = "";
  emit("send", content);
};

const onKeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
};

const syncLayoutClass = (open) => {
  if (!props.layoutOpenClass) return;
  document.documentElement.classList.toggle(props.layoutOpenClass, !!open);
};

watch(
  () => props.expanded,
  async (open) => {
    syncLayoutClass(open);
    if (open) {
      await scrollToBottom();
      await focusInput();
    }
  },
  { immediate: true },
);

watch(
  () => props.messages.length,
  () => {
    if (props.expanded) scrollToBottom();
  },
);

onBeforeUnmount(() => syncLayoutClass(false));

defineExpose({ scrollToBottom, focusInput });
</script>

<template>
  <div class="ca-root" v-bind="$attrs">
    <Teleport to="body">
      <Transition name="ca-fade">
        <div
          v-if="!expanded"
          class="ca-minimized-wrap"
          role="button"
          tabindex="0"
          @click="expand"
          @keydown.enter="expand"
        >
          <div class="ca-minimized">
            <div class="ca-minimized__icon">
              <VIcon icon="tabler-sparkles" size="22" />
            </div>
            <div class="ca-minimized__body">
              <div class="ca-minimized__title-row">
                <span class="ca-minimized__title">{{ minimizedTitle }}</span>
                <span class="ca-minimized__online">
                  <span class="ca-dot" />
                  Online
                </span>
              </div>
              <div class="ca-minimized__subtitle">{{ minimizedSubtitle }}</div>
            </div>
            <VBtn
              icon
              size="small"
              color="primary"
              class="ca-minimized__open"
              @click.stop="expand"
            >
              <VIcon icon="tabler-chevron-up" size="20" />
            </VBtn>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <div v-if="expanded" class="ca-panel-wrap">
        <aside class="ca-panel ca-panel--docked">
          <header class="ca-panel__header">
            <div class="ca-panel__brand">
              <div class="ca-panel__avatar">
                <VIcon icon="tabler-robot" size="20" />
              </div>
              <div>
                <div class="ca-panel__title">{{ title }}</div>
                <div v-if="subtitle" class="ca-panel__subtitle">{{ subtitle }}</div>
              </div>
            </div>
            <div class="d-flex align-center gap-1">
              <span class="ca-minimized__online ca-panel__online">
                <span class="ca-dot" />
                Online
              </span>
              <VBtn
                icon
                variant="text"
                size="small"
                title="Minimize"
                @click="minimize"
              >
                <VIcon icon="tabler-chevron-down" size="20" />
              </VBtn>
            </div>
          </header>

          <div ref="messagesEl" class="ca-panel__messages">
            <div
              v-if="isBootstrapping && messages.length === 0"
              class="ca-panel__loading"
            >
              <VProgressCircular indeterminate color="primary" size="28" />
              <span>Starting assistant…</span>
            </div>

            <template v-else>
              <div v-if="messages.length === 0" class="ca-empty">
                <div class="ca-msg ca-msg--assistant">
                  <div class="ca-msg__body">
                    <div class="ca-msg__row">
                      <div class="ca-msg__avatar ca-msg__avatar--bot">
                        <VIcon icon="tabler-robot" size="16" />
                      </div>
                      <div class="ca-msg__bubble">{{ emptyMessage }}</div>
                    </div>
                    <div class="ca-msg__meta">
                      <span class="ca-msg__role">{{ roleLabel("assistant") }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-for="(msg, idx) in messages"
                :key="`${msg.role}-${msg.timestamp}-${idx}`"
                class="ca-msg"
                :class="msg.role === 'user' ? 'ca-msg--user' : 'ca-msg--assistant'"
              >
                <div class="ca-msg__body">
                  <div class="ca-msg__row">
                    <div
                      v-if="msg.role === 'assistant'"
                      class="ca-msg__avatar ca-msg__avatar--bot"
                    >
                      <VIcon icon="tabler-robot" size="16" />
                    </div>

                    <div class="ca-msg__bubble">{{ msg.content }}</div>

                    <div
                      v-if="msg.role === 'user'"
                      class="ca-msg__avatar ca-msg__avatar--user"
                    >
                      <VIcon icon="tabler-user" size="16" />
                    </div>
                  </div>

                  <div class="ca-msg__meta">
                    <span v-if="msg.timestamp" class="ca-msg__time mt-1">
                      {{ formatMessageTime(msg.timestamp) }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="isThinking" class="ca-msg ca-msg--assistant">
                <div class="ca-msg__body">
                  <div class="ca-msg__row">
                    <div class="ca-msg__avatar ca-msg__avatar--bot">
                      <VIcon icon="tabler-robot" size="16" />
                    </div>
                    <div class="ca-msg__bubble ca-msg__bubble--thinking">
                      <span class="ca-msg__thinking-text">Thinking</span>
                      <span class="ca-msg__thinking-dots" aria-hidden="true">
                        <span /><span /><span />
                      </span>
                    </div>
                  </div>
                  <div class="ca-msg__meta">
                    <span class="ca-msg__role">{{ roleLabel("assistant") }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <footer class="ca-panel__footer">
            <div class="ca-input-wrap">
              <input
                ref="inputRef"
                v-model="draft"
                class="ca-input"
                type="text"
                :placeholder="placeholder"
                :disabled="isBootstrapping || isSending"
                @keydown="onKeydown"
              />
              <VBtn
                icon
                size="small"
                color="primary"
                class="ca-send"
                :loading="isSending"
                :disabled="!draft.trim() || isBootstrapping"
                @click="submit"
              >
                <VIcon icon="tabler-send" size="18" />
              </VBtn>
            </div>
            <div class="ca-powered">{{ poweredBy }}</div>
          </footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ca-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
}

@property --ca-border-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.ca-minimized-wrap {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1005;
  padding: 2px;
  border-radius: 18px;
  cursor: pointer;
  overflow: hidden;
  background: conic-gradient(
    from var(--ca-border-angle),
    rgba(var(--v-theme-primary), 0.15) 0deg,
    rgb(var(--v-theme-primary)) 90deg,
    rgba(var(--v-theme-primary), 0.35) 180deg,
    rgb(var(--v-theme-primary)) 270deg,
    rgba(var(--v-theme-primary), 0.15) 360deg
  );
  animation: ca-border-spin 3.5s linear infinite;
  box-shadow:
    0 8px 28px rgba(var(--v-theme-primary), 0.18),
    0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.ca-minimized-wrap:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 32px rgba(var(--v-theme-primary), 0.24),
    0 2px 8px rgba(0, 0, 0, 0.1);
}
.ca-minimized-wrap:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.55);
  outline-offset: 2px;
}
@keyframes ca-border-spin {
  to {
    --ca-border-angle: 360deg;
  }
}

.ca-minimized {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 320px;
  max-width: 380px;
  padding: 12px 12px 12px 14px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}
.ca-minimized__icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
}
.ca-minimized__body {
  flex: 1;
  min-width: 0;
}
.ca-minimized__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ca-minimized__title {
  font-weight: 700;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.9);
}
.ca-minimized__online {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #22c55e;
}
.ca-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}
.ca-minimized__subtitle {
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ca-minimized__open {
  flex-shrink: 0;
}

.ca-panel-wrap {
  position: fixed;
  z-index: 11;
  top: 1rem;
  right: 1.5rem;
  bottom: 1rem;
  width: calc((100vw - 260px) * 0.34 - 1.5rem);
  padding: 2px;
  border-radius: 14px;
  overflow: hidden;
  background: conic-gradient(
    from var(--ca-border-angle),
    rgba(var(--v-theme-primary), 0.15) 0deg,
    rgb(var(--v-theme-primary)) 90deg,
    rgba(var(--v-theme-primary), 0.35) 180deg,
    rgb(var(--v-theme-primary)) 270deg,
    rgba(var(--v-theme-primary), 0.15) 360deg
  );
  animation: ca-border-spin 3.5s linear infinite;
  box-shadow:
    0 8px 28px rgba(var(--v-theme-primary), 0.18),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

.ca-panel--docked {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  overflow: hidden;
}
.ca-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 14px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-primary), 0.04);
  flex-shrink: 0;
}
.ca-panel__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.ca-panel__avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}
.ca-panel__title {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;
}
.ca-panel__subtitle {
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-top: 2px;
}
.ca-panel__online {
  margin-right: 2px;
}

.ca-panel__messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
  background: rgba(var(--v-theme-on-surface), 0.025);
  min-height: 0;
  scroll-behavior: smooth;
}
.ca-panel__loading {
  height: 100%;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.85rem;
}

.ca-empty {
  margin-bottom: 8px;
}

.ca-msg {
  display: flex;
  margin-bottom: 14px;
  animation: ca-msg-in 0.18s ease-out both;
}
@keyframes ca-msg-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.ca-msg--user {
  justify-content: flex-end;
}
.ca-msg--assistant {
  justify-content: flex-start;
}
.ca-msg__body {
  max-width: 88%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ca-msg--user .ca-msg__body {
  align-items: flex-end;
}
.ca-msg--assistant .ca-msg__body {
  align-items: flex-start;
}
.ca-msg__row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  max-width: 100%;
}
.ca-msg__bubble {
  max-width: min(100%, 300px);
  padding: 8px 11px;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
  border-radius: 14px;
}
.ca-msg--user .ca-msg__bubble {
  background: rgb(var(--v-theme-primary));
  color: #fff;
  box-shadow: 0 1px 4px rgba(var(--v-theme-primary), 0.22);
  border-bottom-right-radius: 0;
}
.ca-msg--assistant .ca-msg__bubble {
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.9);
  border: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) + 0.06));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border-bottom-left-radius: 0;
}
.ca-msg__meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 2px;
  font-size: 0.65rem;
  line-height: 1;
  color: rgba(var(--v-theme-on-surface), 0.4);
}
.ca-msg--assistant .ca-msg__meta {
  margin-left: 34px;
}
.ca-msg--user .ca-msg__meta {
  margin-right: 34px;
}
.ca-msg__role {
  font-weight: 600;
  letter-spacing: 0.01em;
}
.ca-msg__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 1px;
}
.ca-msg__avatar--bot {
  background: rgb(var(--v-theme-primary));
  color: #fff;
}
.ca-msg__avatar--user {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.65);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ca-msg__bubble--thinking {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ca-msg__thinking-text {
  font-size: 0.8rem;
  font-weight: 550;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.ca-msg__thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ca-msg__thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.55);
  animation: ca-bounce 1.2s infinite ease-in-out;
}
.ca-msg__thinking-dots span:nth-child(2) {
  animation-delay: 0.15s;
}
.ca-msg__thinking-dots span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes ca-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.ca-panel__footer {
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  flex-shrink: 0;
}
.ca-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 12px;
  border-radius: 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  transition: border-color 0.15s ease;
}
.ca-input-wrap:focus-within {
  border-color: rgba(var(--v-theme-primary), 0.4);
}
.ca-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.9);
  min-height: 36px;
}
.ca-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}
.ca-send {
  flex-shrink: 0;
}
.ca-powered {
  margin-top: 8px;
  text-align: center;
  font-size: 0.68rem;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.ca-fade-enter-active,
.ca-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.ca-fade-enter-from,
.ca-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 960px) {
  .ca-panel-wrap {
    top: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    left: 0.75rem;
    width: auto;
  }
}
</style>

<style lang="scss">
html.assistant-chat-open {
  @media (min-width: 961px) {
    .layout-wrapper.layout-nav-type-vertical {
      .layout-navbar {
        inline-size: 100%;
        max-inline-size: none;
        margin-inline: 0;
      }

      .navbar-content-container {
        inline-size: 65%;
        max-inline-size: 100%;
        margin-inline: 0 auto;
        transition: inline-size 0.2s ease, max-inline-size 0.2s ease;
      }

      .layout-page-content,
      .layout-footer {
        inline-size: 66%;
        max-inline-size: 66%;
        margin-inline: 0 auto;
        transition: inline-size 0.2s ease, max-inline-size 0.2s ease;
      }

      .page-content-container,
      .footer-content-container {
        inline-size: 100%;
        max-inline-size: none;
      }
    }

    &:has(.layout-vertical-nav-collapsed) .ca-panel-wrap {
      width: calc((100vw - 84px) * 0.34 - 1.5rem);
    }

    &:has(.layout-overlay-nav) .ca-panel-wrap {
      width: calc(34vw - 1.5rem);
    }
  }
}
</style>
