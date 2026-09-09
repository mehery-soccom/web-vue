<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { mapAiFormStateToCampaignState, extractAiFormState, formStateSignature } from "@/app-pushapp/utils/mapAiFormState";
import AssistantChatBox from "@app-pushapp/views/admin/assistant/AssistantChatBox.vue";
import { usePushNotificationStore } from "./usePushNotificationStore";

const props = defineProps({
  expanded: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:expanded",
  "campaign-state",
  "bot-status",
]);

const { show } = inject("snackbar");
const store = usePushNotificationStore();
const chatBoxRef = ref(null);

const POLL_MS = 10000;

const isBootstrapping = ref(false);
const isSending = ref(false);
const hasBootstrapped = ref(false);
const hasFormStateInitialized = ref(false);
const sessionId = ref(null);
const messages = ref([]);
let pollTimer = null;
let lastMessageSig = "";
let lastFormStateSig = "";

const normalizeMessages = (list = []) =>
  list.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp:
      typeof m.timestamp === "object"
        ? Number(m.timestamp)
        : Number(m.timestamp || Date.now()),
  }));

const messageSignature = (list = []) =>
  list.map((m) => `${m.role}:${m.content}:${m.timestamp}`).join("|");

const extractSessionId = (payload) => {
  if (!payload) return null;
  const session = payload.data || payload;
  return session.sessionId || session._id || null;
};

const applyPollPayload = (payload, { forceScroll = false } = {}) => {
  if (!payload) return;
  const session = payload.data || payload;

  const nextId = extractSessionId(payload);
  if (nextId) sessionId.value = nextId;

  if (Array.isArray(session.messages)) {
    const next = normalizeMessages(session.messages);
    const sig = messageSignature(next);
    const changed = sig !== lastMessageSig;
    if (changed) {
      messages.value = next;
      lastMessageSig = sig;
      chatBoxRef.value?.scrollToBottom();
    } else if (forceScroll) {
      chatBoxRef.value?.scrollToBottom();
    }
  }

  if (session.botStatus) emit("bot-status", session.botStatus);
};

const applyFormStatePayload = (payload) => {
  if (!payload) return;

  const formState = extractAiFormState(payload);
  if (!formState?.sections) return;

  const sig = formStateSignature(formState);
  if (sig && sig === lastFormStateSig) return;

  const campaignState = mapAiFormStateToCampaignState(formState);
  if (!campaignState) return;

  lastFormStateSig = sig;
  emit("campaign-state", campaignState);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const pollSession = async () => {
  if (!sessionId.value) return;
  try {
    const res = await store.fetchCampaignAssistantSession(sessionId.value);
    applyPollPayload(res?.data ?? res);
  } catch (error) {
    console.warn("[CampaignAssistant] poll failed", error);
  }
};

const pollFormState = async () => {
  if (!sessionId.value || !hasFormStateInitialized.value) return;
  try {
    const res = await store.fetchCampaignAiFormState(sessionId.value);
    applyFormStatePayload(res?.data ?? res);
  } catch (error) {
    console.warn("[CampaignAssistant] form-state poll failed", error);
  }
};

const pollAll = async () => {
  await Promise.all([pollSession(), pollFormState()]);
};

const startPolling = () => {
  stopPolling();
  if (!sessionId.value) return;
  pollTimer = setInterval(pollAll, POLL_MS);
};

const initFormState = async () => {
  if (!sessionId.value || hasFormStateInitialized.value) return;
  try {
    const res = await store.initCampaignAiFormState(sessionId.value);
    applyFormStatePayload(res?.data ?? res);
    hasFormStateInitialized.value = true;
  } catch (error) {
    console.warn("[CampaignAssistant] form-state init failed", error);
  }
};

const bootstrapSession = async () => {
  if (hasBootstrapped.value || isBootstrapping.value) return;
  isBootstrapping.value = true;
  try {
    const res = await store.postCampaignAssistantMessage({
      sessionId: null,
      text: "hi",
    });
    const body = res?.data ?? res;
    const id = extractSessionId(body);
    if (id) sessionId.value = id;

    if (sessionId.value) {
      await initFormState();
      await pollAll();
      startPolling();
    } else if (Array.isArray(body?.messages) || Array.isArray(body?.data?.messages)) {
      applyPollPayload(body, { forceScroll: true });
    }

    hasBootstrapped.value = true;
  } catch (error) {
    const apiErr = error.response?.data;
    show({
      message:
        apiErr?.error?.message ||
        apiErr?.message ||
        "Failed to start campaign assistant",
      color: "error",
    });
  } finally {
    isBootstrapping.value = false;
  }
};

const sendMessage = async (content) => {
  if (!content || isSending.value) return;

  messages.value.push({
    role: "user",
    content,
    timestamp: Date.now(),
  });
  lastMessageSig = messageSignature(messages.value);

  isSending.value = true;
  try {
    if (!sessionId.value) await bootstrapSession();

    await store.postCampaignAssistantMessage({
      sessionId: sessionId.value,
      text: content,
    });

    await pollAll();
    startPolling();
  } catch (error) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === "user" && last.content === content) {
      messages.value.pop();
      lastMessageSig = messageSignature(messages.value);
    }
    const apiErr = error.response?.data;
    show({
      message:
        apiErr?.error?.message ||
        apiErr?.message ||
        "Failed to send message",
      color: "error",
    });
  } finally {
    isSending.value = false;
    chatBoxRef.value?.focusInput();
  }
};

watch(
  () => props.expanded,
  async (open) => {
    if (open) {
      await bootstrapSession();
      if (sessionId.value) {
        await initFormState();
        await pollAll();
        startPolling();
      }
    } else {
      stopPolling();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => stopPolling());
</script>

<template>
  <AssistantChatBox
    ref="chatBoxRef"
    :expanded="expanded"
    title="Campaign Assistant"
    subtitle="Ask me to build your campaign"
    minimized-title="PushApp AI"
    minimized-subtitle="How can I help you build your campaign?"
    placeholder="Ask anything about your campaign…"
    empty-message="Hi! I'm your AI campaign assistant. How can I help you today?"
    :messages="messages"
    :is-bootstrapping="isBootstrapping"
    :is-sending="isSending"
    @update:expanded="emit('update:expanded', $event)"
    @send="sendMessage"
  />
</template>
