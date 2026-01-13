<script setup>
import { ref, computed, inject } from 'vue';
import { useFeedbackStore } from '@/app-tikat/views/admin/feedback/useFeedbackStore';
import AppDateTimePicker from '@/app-tikat/@core/components/app-form-elements/AppDateTimePicker.vue';

const props = defineProps({
  feedbackId: { type: String, required: true },
  followups: { type: Array, default: () => [] },
  contact: { type: Object, default: () => ({ name: '', phone: '', email: '' }) }
});

const emit = defineEmits(['refresh']);
const feedbackStore = useFeedbackStore();
const { show } = inject("snackbar");
const byUser = window.CONST?.USER?.user || 'dev';

const isAdding = ref(false);
const isSaving = ref(false);
const editingId = ref(null);

const form = ref({ title: '', description: '', dueDate: null });

const sortedFollowups = computed(() => {
  if (!props.followups) return [];
  return [...props.followups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

const getDomainTimezone = () => {
  const offset = window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET;
  return offset?.split(':')?.[0] || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const formatTimestamp = (dateIso) => {
  if (!dateIso) return 'Date N/A';
  const date = new Date(dateIso);
  if (isNaN(date)) return 'Date N/A';
  const options = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
};

const formatActivityTimestamp = (item) => {
  const options = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const createdDate = new Date(item.createdAt);
  if (isNaN(createdDate)) return '';
  
  const formatted = new Intl.DateTimeFormat('en-GB', options).format(createdDate).replace(',', ' ');
  const creatorName = item.creator?.name || item.creator?.code || 'Unknown';
  
  const isEdited = !!item.updatedAt;
  const prefix = isEdited ? 'Updated on' : 'Created on';

  return `${prefix} ${formatted} by ${creatorName}`;
};

const handleSave = async () => {
  if (!form.value.title || !form.value.dueDate) return;
  isSaving.value = true;
  try {
    const payload = {
      title: form.value.title,
      description: form.value.description,
      dueDate: form.value.dueDate.replace(' ', 'T'),
      timezone: getDomainTimezone(),
      byUser
    };
    
    if (editingId.value) {
      await feedbackStore.updateFollowup({ feedbackId: props.feedbackId, followupId: editingId.value, payload });
    } else {
      const createPayload = {
        ...payload,
        tikatName: props.contact.name,
        tikatEmail: props.contact.email,
        tikatPhone: props.contact.phone,
      };
      await feedbackStore.createFollowup({ feedbackId: props.feedbackId, payload: createPayload });
    }
    
    show({ message: `Followup ${editingId.value ? 'updated' : 'added'}`, color: 'success' });
    isAdding.value = false;
    editingId.value = null;
    emit('refresh');
  } catch (error) {
    show({ message: 'Failed to save followup.', color: 'error' });
  } finally {
    isSaving.value = false;
  }
};

const handleEdit = (item) => {
  editingId.value = item._id; 
  isAdding.value = true;
  const d = new Date(item.startDate || item.createdAt);
  const pad = (n) => String(n).padStart(2, '0');
  form.value = {
    title: item.title,
    description: item.description,
    dueDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
};

const handleDelete = async (followupId) => {
  isSaving.value = true;
  try {
    await feedbackStore.deleteFollowup({ feedbackId: props.feedbackId, followupId });
    show({ message: 'Followup deleted', color: 'success' });
    emit('refresh');
  } finally { isSaving.value = false; }
};
</script>

<template>
  <VCard border elevation="2">
    <VCardItem>
      <VCardTitle>Follow Ups</VCardTitle>
      <template #append v-if="!isAdding">
        <VBtn size="small" variant="text" icon="tabler-plus" @click="isAdding = true; form = {title:'', description:'', dueDate:null}" />
      </template>
    </VCardItem>

    <VCardText v-if="isAdding">
      <VTextField v-model="form.title" label="Title" variant="outlined" class="mb-4" density="compact" />
      <AppDateTimePicker v-model="form.dueDate" label="Due Date" :config="{ enableTime: true, time_24hr: true, dateFormat: 'Y-m-d H:i' }" class="mb-4" />
      <VTextarea v-model="form.description" label="Description" variant="outlined" rows="2" />
      <div class="d-flex gap-4 mt-4">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="isAdding = false; editingId = null">Cancel</VBtn>
        <VBtn :loading="isSaving" @click="handleSave">{{ editingId ? 'Update' : 'Save' }}</VBtn>
      </div>
    </VCardText>

    <VDivider v-if="sortedFollowups.length > 0" />
    
    <VList class="py-0">
      <template v-for="item in sortedFollowups" :key="item._id">
        <VListItem
          class="pa-4 pb-4 list-item-hover"
          :class="{ 'cancelled-activity': item.status === 'Cancelled' }"
        >
          <template #prepend>
            <VIcon icon="tabler-calendar-event" class="mt-1" />
          </template>

          <div>
            <VListItemTitle class="font-weight-bold d-flex align-center">
              <span>{{ item.title }}</span>
              <VChip
                v-if="item.status === 'Cancelled'"
                color="error"
                variant="tonal"
                size="x-small"
                class="ms-2"
              >
                Cancelled
              </VChip>
            </VListItemTitle>
            <VListItemSubtitle v-if="item.description" class="mb-2">{{ item.description }}</VListItemSubtitle>
            <VListItemSubtitle class="text-caption">
              <VIcon icon="tabler-clock" size="14" class="me-1" />
              Due: {{ formatTimestamp(item.endDate) }}
            </VListItemSubtitle>
          </div>

          <div class="list-item-timestamp">
            <VIcon icon="tabler-clock" size="16" class="me-1" />
            <span class="text-caption">{{ formatActivityTimestamp(item) }}</span>
          </div>

          <div v-if="item.status !== 'Cancelled'" class="list-item-actions">
            <IconBtn size="x-small" @click="handleEdit(item)">
              <VIcon icon="tabler-pencil" />
            </IconBtn>
            <IconBtn size="x-small" color="error">
              <VIcon icon="tabler-trash" />
              <VDialog activator="parent" max-width="400">
                <template #default="{ isActive }">
                  <VCard title="Confirm Deletion" text="Are you sure you want to delete this followup?">
                    <template #actions>
                      <VSpacer />
                      <VBtn text="Cancel" @click="isActive.value = false" />
                      <VBtn color="error" variant="tonal" text="Delete" :loading="isSaving" @click="handleDelete(item._id)" />
                    </template>
                  </VCard>
                </template>
              </VDialog>
            </IconBtn>
          </div>
        </VListItem>
        <VDivider />
      </template>
    </VList>
    
    <VCardText v-if="!sortedFollowups.length && !isAdding" class="text-center text-disabled">
      No activities found.
    </VCardText>
  </VCard>
</template>

<style scoped>
.list-item-hover { position: relative; }

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

.cancelled-activity {
  opacity: 0.6;
}
</style>