<script setup>
import { ref, computed, inject, onMounted, watch } from 'vue';
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
  contact: {
    type: Object,
    default: () => ({ name: '', phone: '', email: '' })
  }
});

const emit = defineEmits(['activity-added']);

const leadsStore = useLeadsStore();
const { show } = inject("snackbar");
const byUser = window.CONST?.USER?.user || 'dev';

const isAddingActivity = ref(false);
const isSaving = ref(false);
const newActivity = ref({
  title: '',
  description: '',
  dueDate: null,
});

const editingFollowupId = ref(null);
const editedFollowupData = ref({
  title: '',
  description: '',
  dueDate: null
});

const sortedFollowups = computed(() => {
  if (!props.followups) return [];
  return [...props.followups].sort((a, b) => b.addedAt.stamp - a.addedAt.stamp);
});

const formatTimestamp = (objOrIso) => {
  if (!objOrIso) return 'Date N/A';
  let date;
  if (typeof objOrIso === 'object' && objOrIso.stamp) {
    date = new Date(objOrIso.stamp);
  } else {
    date = new Date(objOrIso);
  }
  if (isNaN(date)) return 'Date N/A';
  const options = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

const formatActivityTimestamp = (item) => {
  const options = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const createdIso = item.details?.createdAt || item.details?.created_at;
  const updatedIso = item.details?.updatedAt || item.details?.updated_at;
  if (createdIso) {
    const createdDate = new Date(createdIso);
    if (isNaN(createdDate)) return '';
    const formatted = new Intl.DateTimeFormat('en-GB', options).format(createdDate).replace(',', ' ');
    const prefix = (updatedIso && updatedIso !== createdIso) ? 'Edited on' : 'Created on';
    const byUser = item.details?.creator?.name || item.addedAt?.byUser || item.details?.creator?.code || 'Unknown';
    return `${prefix} ${formatted} by ${byUser}`;
  }
  if (item.addedAt?.stamp) {
    const date = new Date(item.addedAt.stamp);
    if (isNaN(date)) return '';
    const formatted = new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', ' ');
    const byUser = item.addedAt?.byUser || 'Unknown';
    return `Created on ${formatted} by ${byUser}`;
  }
  return '';
};


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
    const payload = {
      title: newActivity.value.title,
      description: newActivity.value.description,
      dueDate: newActivity.value.dueDate.replace(' ', 'T'),
      timezone: getDomainTimezone(),
      leadId: props.leadId,
      leadName: props.contact.name,
      leadEmail: props.contact.email,
      leadPhone: props.contact.phone,
      byUser: byUser
    };
    
    await leadsStore.createLeadFollowup({ leadId: props.leadId, payload: payload });
    show({ message: 'Activity added successfully!', color: 'success' });
    resetAndCloseForm();
    emit('activity-added');
  } catch (error) {
    console.error("Failed to save activity:", error);
    show({ message: 'Failed to save activity.', color: 'error' });
  } finally {
    isSaving.value = false;
  }
};

const getDomainTimezone = () => {
  const offset = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET
  const index = offset?.indexOf(':')
  return (offset && index > -1 ? offset.slice(0, index) : null) || Intl.DateTimeFormat().resolvedOptions().timeZone
}

const handleEditFollowup = (followup) => {
  editingFollowupId.value = followup.followupId;
  
  let dateStr = null;
  const rawDate = followup.details?.startDate || followup.addedAt?.stamp;
  
  if (rawDate) {
    const d = new Date(rawDate);
    const pad = (n) => String(n).padStart(2, '0');
    dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  editedFollowupData.value = {
    title: followup.details?.title || '',
    description: followup.details?.description || '',
    dueDate: dateStr
  };
};

const cancelEdit = () => {
  editingFollowupId.value = null;
  editedFollowupData.value = { title: '', description: '', dueDate: null };
};

const handleUpdateFollowup = async () => {
  isSaving.value = true;
  try {
    const payload = {
      title: editedFollowupData.value.title,
      description: editedFollowupData.value.description,
      dueDate: editedFollowupData.value.dueDate.replace(' ', 'T'),
      timezone: getDomainTimezone(),
      byUser: byUser,
    };

    await leadsStore.updateLeadFollowup({ 
      leadId: props.leadId,
      followupId: editingFollowupId.value, 
      payload: payload 
    });
    
    show({ message: 'Activity updated successfully!', color: 'success' });
    cancelEdit();
    emit('activity-added');
  } catch (error) {
    show({ message: 'Failed to update activity.', color: 'error' });
  } finally {
    isSaving.value = false;
  }
};

const handleCancelFollowup = async (followupId, dialogActive) => {
  isSaving.value = true;
  try {
    await leadsStore.cancelLeadFollowup({ 
      leadId: props.leadId,
      followupId: followupId, 
      payload: { byUser: byUser }
    });
    show({ message: 'Activity cancelled successfully!', color: 'success' });
    if (dialogActive) dialogActive.value = false;
    emit('activity-added');
  } catch (error) {
    show({ message: 'Failed to cancel activity.', color: 'error' });
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
          :config="{ enableTime: true,time_24hr: true, dateFormat: 'Y-m-d H:i', minDate: 'today' }"
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
    
    <VList v-if="sortedFollowups.length > 0" class="py-0">
      <template v-for="item in sortedFollowups" :key="item.followupId">
        <VListItem
          class="pa-4 pb-4 list-item-hover"
          :class="{ 'cancelled-activity': item.details?.status === 'Cancelled' }"
          :disabled="item.details?.status === 'Cancelled'"
        >
          <template #prepend>
            <VIcon icon="tabler-calendar-event" class="mt-1" />
          </template>

          <div v-if="editingFollowupId === item.followupId" class="py-2" style="width: 100%;">
            <VTextField
              v-model="editedFollowupData.title"
              label="Title"
              :rules="[requiredValidator]"
              variant="outlined"
              density="compact"
              class="mb-4"
            />
            <AppDateTimePicker
              v-model="editedFollowupData.dueDate"
              label="Due Date"
              prepend-inner-icon="tabler-calendar"
              :rules="[requiredValidator]"
              :config="{ enableTime: true,time_24hr: true, dateFormat: 'Y-m-d H:i' }"
              placeholder="Select date and time"
              class="mb-4"
            />
            <VTextarea
              v-model="editedFollowupData.description"
              label="Description"
              variant="outlined"
              rows="2"
            />
            <div class="d-flex gap-4 mt-2">
              <VSpacer />
              <VBtn size="small" variant="text" @click="cancelEdit">Cancel</VBtn>
              <VBtn size="small" :loading="isSaving" @click="handleUpdateFollowup">Update</VBtn>
            </div>
          </div>
          
          <div v-else>
            <VListItemTitle class="mb-1 font-weight-medium d-flex align-center">
              <span>{{ item.details?.title || 'Activity' }}</span>
              <VChip
                v-if="item.details?.status === 'Cancelled'"
                color="error"
                variant="tonal"
                size="x-small"
                class="ms-2"
              >
                Cancelled
              </VChip>
            </VListItemTitle>
            <VListItemSubtitle v-if="item.details?.description" class="mb-2">
              {{ item.details.description }}
            </VListItemSubtitle>
            <VListItemSubtitle>
              <VIcon icon="tabler-clock" size="16" class="me-1" />
              Due: {{ formatTimestamp(item.details?.endDate) }}
            </VListItemSubtitle>
          </div>

          <div class="list-item-timestamp" v-if="editingFollowupId !== item.followupId">
            <VIcon icon="tabler-clock" size="16" class="me-1" />
            <span class="text-caption">{{ formatActivityTimestamp(item) }}</span>
          </div>

          <div
            class="list-item-actions"
            v-if="editingFollowupId !== item.followupId && item.details?.status !== 'Cancelled'"
          >
            <IconBtn size="x-small" @click="handleEditFollowup(item)">
              <VIcon icon="tabler-pencil" />
            </IconBtn>
            
            <IconBtn size="x-small">
              <VIcon icon="tabler-x" />
              <v-dialog activator="parent" max-width="400">
                <template v-slot:default="{ isActive }">
                  <v-card
                    title="Confirm Cancellation"
                    text="Are you sure you want to cancel this activity?"
                  >
                    <template v-slot:actions>
                      <VSpacer />
                      <v-btn text="Close" @click="isActive.value = false" />
                      <v-btn
                        color="error"
                        variant="tonal"
                        text="Cancel Activity"
                        :loading="isSaving"
                        @click="handleCancelFollowup(item.followupId, isActive)"
                      />
                    </template>
                  </v-card>
                </template>
              </v-dialog>
            </IconBtn>
          </div>
        </VListItem>
        <VDivider />
      </template>
    </VList>
    
    <VCardText v-if="sortedFollowups.length === 0 && !isAddingActivity" class="text-center text-disabled">
      No activities found.
    </VCardText>
  </VCard>
</template>

<style scoped>
.list-item-hover {
  position: relative; 
}
.list-item-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 0.25rem;
  background-color: rgb(var(--v-theme-surface));
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}
.list-item-hover:hover .list-item-actions {
  opacity: 1;
}

.list-item-timestamp {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}

/* .cancelled-activity {
  opacity: 0.6;
  filter: blur(0.5px);
  background-color: #f8f8f8;
} */
/* .v-theme--dark .cancelled-activity {
   background-color: #333333;
} */
</style>