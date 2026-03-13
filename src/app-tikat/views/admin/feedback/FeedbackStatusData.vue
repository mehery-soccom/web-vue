<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useFeedbackStore } from '@/app-tikat/views/admin/feedback/useFeedbackStore';
import { useStatusStore } from '@/app-tikat/views/setup/status/useStatusStore';

const props = defineProps({
  feedbackId: { type: String, required: true },
  initialStatusId: { type: String, default: null },
  initialAgentId: { type: String, default: null }
});

const emit = defineEmits(['updated']);

const feedbackStore = useFeedbackStore();
const statusStore = useStatusStore();
const { show } = inject("snackbar");

const allStatuses = ref([]);
const allAgents = ref([]);
const isLoading = ref(true);
const isUpdating = ref(false);
const isAgentLoading = ref(false);
const byUser = window.CONST?.USER?.user || 'system';
const userRoles = window.CONST?.USER?.role || [];
const isAgentDisabled = userRoles.includes('MODERATOR') || userRoles.includes('USER');

const form = ref({
  status: props.initialStatusId,
  agentId: props.initialAgentId,
});

const originalForm = ref({
  status: props.initialStatusId,
  agentId: props.initialAgentId,
});

const fetchAgentOptions = async () => {
  isAgentLoading.value = true;
  try {
    const response = await feedbackStore.fetchAgents();
    allAgents.value = Array.isArray(response.results) ? response.results : [];
  } finally {
    isAgentLoading.value = false;
  }
};

onMounted(async () => {
  fetchAgentOptions();
  try {
    const response = await statusStore.fetchStatuses();
    allStatuses.value = response.results || [];
  } catch (error) {
    show({ message: 'Could not load statuses.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
});

watch(() => props.initialAgentId, (val) => { form.value.agentId = val; originalForm.value.agentId = val; });
watch(() => props.initialStatusId, (val) => { form.value.status = val; originalForm.value.status = val; });

const isFormEdited = computed(() => {
  return form.value.status !== originalForm.value.status || form.value.agentId !== originalForm.value.agentId;
});

const handleCancel = () => {
  form.value.status = originalForm.value.status;
  form.value.agentId = originalForm.value.agentId;
};

const handleSubmit = async () => {
  if (!isFormEdited.value) return;
  isUpdating.value = true;

  try {
    if (form.value.status !== originalForm.value.status) {
      const selectedStatus = allStatuses.value.find(s => s.label === form.value.status);
      
      await feedbackStore.updateFeedback({
        id: props.feedbackId,
        data: { 
          status: form.value.status, 
          closure: selectedStatus ? !!selectedStatus.closure : false,
          byUser 
        }
      });
    }

    if (form.value.agentId !== originalForm.value.agentId) {
        const agent = allAgents.value.find(a => a.agent_code === form.value.agentId);
        if (agent) {
            await feedbackStore.assignFeedback({
            assignee: { code: agent.agent_code, name: agent.agent_name },
            byUser,
            tikatIds: [props.feedbackId]
            });
        }
    }

    show({ message: 'Updated successfully!', color: 'success' });
    originalForm.value = { ...form.value };
    emit('updated');
  } catch (error) {
    show({ message: 'Failed to update feedback.', color: 'error' });
  } finally {
    isUpdating.value = false;
  }
};

const filteredStatuses = computed(() => {
  return allStatuses.value
    .filter(s => s.isActive === true)
    .sort((a, b) => a.label.localeCompare(b.label));
});

</script>

<template>
  <VCard border elevation="2" class="mb-4">
    <VCardText>
      <p class="text-h6 mb-4">Status & Assignment</p>
      
      <VForm @submit.prevent="handleSubmit">
        <VRow align="center">
          <VCol cols="12" md="6">
            <AppSelect
                v-model="form.status"
                :items="filteredStatuses"
                item-title="label"
                item-value="label"
                label="Status"
                placeholder="Change status"
                :loading="isLoading"
            />
          </VCol>

          <VCol cols="12" md="6">
            <AppSelect
                v-model="form.agentId"
                :items="allAgents"
                item-title="agent_name"
                item-value="agent_code" 
                label="Assigned To"
                placeholder="Assign an agent"
                :loading="isAgentLoading"
                clearable
                :disabled="isAgentDisabled"
            />
          </VCol>

          <VCol cols="12" class="d-flex gap-4 mt-2">
            <VSpacer />
            <VBtn color="secondary" variant="tonal" :disabled="!isFormEdited" @click="handleCancel">Cancel</VBtn>
            <VBtn type="submit" :loading="isUpdating" :disabled="!isFormEdited">Update</VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>
</template>