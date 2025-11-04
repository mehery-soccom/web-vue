<script setup>
import { ref, computed, inject } from 'vue';
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore'; 
import AppDateTimePicker from '@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue'; 
import { requiredValidator } from '@app-lead/@core/utils/validators';

const props = defineProps({
  leadId: {
    type: String,
    required: true,
  },
  followups: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['activity-added']);

const leadsStore = useLeadsStore();
const { show } = inject("snackbar");
const byUser = window.CONST?.USER?.user || 'dev'; // Get user or fallback

const isAddingActivity = ref(false);
const isSaving = ref(false);
const newActivity = ref({
  title: '',
  description: '',
  dueDate: null,
});

// Helper to format the timestamp
const formatTimestamp = (timestampObj) => {
  if (!timestampObj || !timestampObj.stamp) return 'Date N/A';
  const date = new Date(timestampObj.stamp);
  const options = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

// Sorts the existing followups by date
const sortedFollowups = computed(() => {
  return [...props.followups].sort((a, b) => b.addedAt.stamp - a.addedAt.stamp);
});

const resetAndCloseForm = () => {
  isAddingActivity.value = false;
  newActivity.value = { title: '', description: '', dueDate: null };
};

const handleSaveActivity = async () => {
  if (!newActivity.value.title || !newActivity.value.dueDate) {
    show({ message: 'Title and Due Date are required.', color: 'warning' });
    return;
  }

  isSaving.value = true;
  try {
    // 1. Create the Followup
    const createPayload = {
      title: newActivity.value.title,
      description: newActivity.value.description,
      dueDate: newActivity.value.dueDate, // Assumes AppDateTimePicker provides the correct format
      customerId: "wa919511803801_919619723759", // Hardcoded as requested
      timezone: "Asia/Kolkata",
      logType: "B"
    };

    const createResponse = await leadsStore.createFollowup(createPayload);
    const newFollowupId = createResponse.results?._id;

    if (!newFollowupId) {
      throw new Error('Failed to get followup ID from creation response.');
    }

    // 2. Link the Followup to the Lead
    const linkPayload = {
      followupId: newFollowupId,
      byUser: byUser
    };

    await leadsStore.linkFollowupToLead({ leadId: props.leadId, payload: linkPayload });

    show({ message: 'Activity added successfully!', color: 'success' });
    resetAndCloseForm();
    emit('activity-added'); // Tell the parent page to refresh
  } catch (error) {
    console.error("Failed to save activity:", error);
    show({ message: 'Failed to save activity.', color: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <VCard border elevation="2">
    <VCardItem>
      <VCardTitle>Activities</VCardTitle>
      <template #append v-if="!isAddingActivity">
        <VBtn 
          size="small" 
          variant="text" 
          icon="tabler-plus" 
          @click="isAddingActivity = true" 
        />
      </template>
    </VCardItem>

    <!-- New Activity Form -->
    <VCardText v-if="isAddingActivity">
      <VForm @submit.prevent="handleSaveActivity">
        <VTextField
          v-model="newActivity.title"
          label="Title"
          :rules="[requiredValidator]"
          variant="outlined"
          class="mb-4"
        />
        <AppDateTimePicker
          v-model="newActivity.dueDate"
          label="Due Date"
          :rules="[requiredValidator]"
          :config="{ enableTime: true, dateFormat: 'Y-m-d H:i' }"
          placeholder="Select date and time"
          class="mb-4"
        />
        <VTextarea
          v-model="newActivity.description"
          label="Description (Optional)"
          variant="outlined"
          rows="3"
        />
        <div class="d-flex gap-4 mt-4">
          <VSpacer />
          <VBtn
            variant="tonal"
            color="secondary"
            @click="resetAndCloseForm"
          >
            Cancel
          </VBtn>
          <VBtn
            type="submit"
            :loading="isSaving"
          >
            Save
          </VBtn>
        </div>
      </VForm>
    </VCardText>

    <VDivider v-if="sortedFollowups.length > 0" />
    
    <!-- List of Existing Follow-ups -->
    <VList v-if="sortedFollowups.length > 0" class="py-0">
      <template v-for="item in sortedFollowups" :key="item.followupId">
        <VListItem class="pa-4">
          <template #prepend>
            <VIcon icon="tabler-calendar-event" class="mt-1" />
          </template>
          <VListItemTitle class="mb-1">Follow-up: {{ item.followupId }}</VListItemTitle>
          <VListItemSubtitle>
            Added on {{ formatTimestamp(item.addedAt) }} by {{ item.addedAt.byUser }}
          </VListItemSubtitle>
        </VListItem>
        <VDivider />
      </template>
    </VList>
    
    <VCardText v-if="sortedFollowups.length === 0 && !isAddingActivity" class="text-center text-disabled">
      No activities found.
    </VCardText>
  </VCard>
</template>