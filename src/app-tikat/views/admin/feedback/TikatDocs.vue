<script setup>
import { ref, computed, inject } from 'vue';
import TikatDocUpload from '@/app-tikat/views/admin/feedback/TikatDocUpload.vue';
import { useFeedbackStore } from '@/app-tikat/views/admin/feedback/useFeedbackStore';

const props = defineProps({
  feedbackId: { type: String, required: true },
  formId: { type: String, default: null }, 
  notes: { type: Array, default: () => [] },
  documents: { type: Array, default: () => [] }
});

const emit = defineEmits(['refresh']);
const feedbackStore = useFeedbackStore();
const { show } = inject("snackbar");

const isLoading = ref(false);
const byUser = window.CONST?.USER?.code || 'system';

const isAddingNote = ref(false);
const isAddingDoc = ref(false);
const newNote = ref({ title: '', content: '' });
const newDoc = ref({ title: '', url: '', fileDetails: null });

const editingNoteId = ref(null);
const editedNoteData = ref({ title: '', content: '' });
const editingDocId = ref(null);
const editedDocData = ref({ title: '' });

const maxDocSize = 5 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  return bytes < 1024 * 1024 
    ? `${Math.round(bytes / 1024)} KB` 
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatTimestamp = (item) => {
  const timestampObj = item.updatedAt || item.createdAt;
  if (!timestampObj || !timestampObj.stamp) return '';

  const date = new Date(timestampObj.stamp);
  const options = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const formattedDate = new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', ' ');
  
  const prefix = (item.updatedAt && item.updatedAt.stamp !== item.createdAt?.stamp) ? 'Edited on' : 'Created on';
  const userName = typeof timestampObj.byUser === 'object' ? timestampObj.byUser.name : timestampObj.byUser;

  return `${prefix} ${formattedDate} by ${userName || 'N/A'}`;
};

const handleSaveNote = async () => {
  if (!newNote.value.content) return;
  isLoading.value = true;
  try {
    await feedbackStore.addNoteOrDoc({ id: props.feedbackId, payload: { note: newNote.value } });
    show({ message: 'Note saved successfully!', color: 'success' });
    isAddingNote.value = false;
    newNote.value = { title: '', content: '' };
    emit('refresh');
  } finally { isLoading.value = false; }
};

const handleUpdateNote = async () => {
  isLoading.value = true;
  try {
    await feedbackStore.updateSubResource({
      feedbackId: props.feedbackId, type: 'note', resourceId: editingNoteId.value,
      payload: { ...editedNoteData.value, byUser }
    });
    editingNoteId.value = null;
    emit('refresh');
  } finally { isLoading.value = false; }
};

const handleSaveDoc = async () => {
  if (!newDoc.value.url) return;
  isLoading.value = true;
  try {
    const docObj = {
      name: newDoc.value.fileDetails.name,
      url: newDoc.value.url,
      mime: newDoc.value.fileDetails.contentType,
      size: newDoc.value.fileDetails.contentLength,
      title: newDoc.value.title || newDoc.value.fileDetails.name
    };
    await feedbackStore.addNoteOrDoc({ id: props.feedbackId, payload: { document: docObj } });
    isAddingDoc.value = false;
    newDoc.value = { title: '', url: '', fileDetails: null };
    emit('refresh');
  } finally { isLoading.value = false; }
};

const handleDelete = async (type, resourceId) => {
  isLoading.value = true;
  try {
    await feedbackStore.deleteSubResource({ feedbackId: props.feedbackId, type, resourceId });
    emit('refresh');
  } finally { isLoading.value = false; }
};
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard border elevation="2">
        <VCardItem><VCardTitle>Notes</VCardTitle></VCardItem>
        <VCardText>
          <VTextField v-if="!isAddingNote" placeholder="Add a note..." variant="outlined" readonly @focus="isAddingNote = true" />
          <div v-else>
            <VTextField v-model="newNote.title" label="Title (Optional)" variant="outlined" class="mb-4" />
            <VTextarea v-model="newNote.content" label="Content" variant="outlined" rows="3" auto-grow autofocus />
            <div class="d-flex gap-4 mt-4">
              <VSpacer />
              <VBtn variant="tonal" color="secondary" @click="isAddingNote = false">Cancel</VBtn>
              <VBtn :loading="isLoading" @click="handleSaveNote">Save</VBtn>
            </div>
          </div>
        </VCardText>

        <VDivider v-if="notes.length > 0" />
        <VList v-if="notes.length > 0" class="py-0">
          <VListItem v-for="note in notes" :key="note._id" class="list-item-hover pa-4 pb-5">
            <template #prepend><VIcon icon="tabler-note" class="mt-3" /></template>

            <div v-if="editingNoteId !== note._id" class="list-item-actions">
              <IconBtn size="x-small" @click="editingNoteId = note._id; editedNoteData = { title: note.title, content: note.content }">
                <VIcon icon="tabler-pencil" />
              </IconBtn>
              <IconBtn size="x-small">
                <VIcon icon="tabler-trash" />
                <VDialog activator="parent" max-width="400">
                  <template #default="{ isActive }">
                    <VCard title="Confirm Deletion" text="Are you sure you want to delete this note?">
                      <template #actions>
                        <VSpacer />
                        <VBtn text="Cancel" @click="isActive.value = false" />
                        <VBtn color="error" variant="tonal" text="Delete" :loading="isLoading" @click="handleDelete('note', note._id)" />
                      </template>
                    </VCard>
                  </template>
                </VDialog>
              </IconBtn>
            </div>

            <div v-if="editingNoteId === note._id" class="py-2">
              <VTextField v-model="editedNoteData.title" label="Title" variant="outlined" class="mb-4" density="compact" />
              <VTextarea v-model="editedNoteData.content" label="Content" variant="outlined" rows="3" auto-grow />
              <div class="d-flex gap-4 mt-2">
                <VSpacer /><VBtn size="small" variant="text" @click="editingNoteId = null">Cancel</VBtn>
                <VBtn size="small" :loading="isLoading" @click="handleUpdateNote">Update</VBtn>
              </div>
            </div>
            <div v-else>
              <VListItemTitle class="mb-1">{{ note.title || 'Note' }}</VListItemTitle>
              <VListItemSubtitle style="white-space: pre-wrap;">{{ note.content }}</VListItemSubtitle>
            </div>
            <div class="list-item-timestamp" v-if="editingNoteId !== note._id">
              <VIcon icon="tabler-clock" size="16" class="me-1" />
              <span class="text-caption">{{ formatTimestamp(note) }}</span>
            </div>
          </VListItem>
          <VDivider />
        </VList>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard border elevation="2">
        <VCardItem>
          <VCardTitle>Documents</VCardTitle>
          <template #append v-if="!isAddingDoc">
            <VBtn size="small" variant="text" icon="tabler-upload" @click="isAddingDoc = true" />
          </template>
        </VCardItem>

        <VCardText v-if="isAddingDoc">
          <VTextField v-model="newDoc.title" label="Document Title (Optional)" variant="outlined" class="mb-4" />
          <TikatDocUpload v-model="newDoc.url" :form-id="formId" sub-dir="feedback" @upload-complete="newDoc.fileDetails = $event" />
          <div class="d-flex gap-4 mt-4">
            <VSpacer />
            <VBtn variant="tonal" color="secondary" @click="isAddingDoc = false">Cancel</VBtn>
            <VBtn :loading="isLoading" :disabled="!newDoc.url" @click="handleSaveDoc">Upload & Save</VBtn>
          </div>
        </VCardText>

        <VDivider v-if="documents.length > 0" />
        <VList v-if="documents.length > 0" class="py-0">
          <VListItem v-for="doc in documents" :key="doc._id" class="list-item-hover pa-4 pb-5">
            <template #prepend>
                <VIcon icon="tabler-file" class="mt-n1" />
            </template>

            <div>
                <VListItemTitle class="font-weight-bold mb-1">{{ doc.title }}</VListItemTitle>
                <VListItemSubtitle>{{ doc.name }} ({{ formatFileSize(doc.size) }})</VListItemSubtitle>
            </div>

            <div class="list-item-timestamp">
                <VIcon icon="tabler-clock" size="16" class="me-1" />
                <span class="text-caption">{{ formatTimestamp(doc) }}</span>
            </div>

            <template #append>
                <div class="list-item-actions">
                <IconBtn size="x-small" :href="doc.url" target="_blank">
                    <VIcon icon="tabler-eye" />
                </IconBtn>
                
                <IconBtn size="x-small">
                    <VIcon icon="tabler-trash" />
                    <VDialog activator="parent" max-width="400">
                    <template #default="{ isActive }">
                        <VCard title="Confirm Deletion" text="Delete this document permanently?">
                        <template #actions>
                            <VSpacer /><VBtn text="Cancel" @click="isActive.value = false" />
                            <VBtn color="error" variant="tonal" text="Delete" :loading="isLoading" @click="handleDelete('document', doc._id)" />
                        </template>
                        </VCard>
                    </template>
                    </VDialog>
                </IconBtn>
                </div>
            </template>
           </VListItem>
          <VDivider />
        </VList>
      </VCard>
    </VCol>
  </VRow>
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
.list-item-hover:hover .list-item-actions { opacity: 1; }
.list-item-timestamp {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}
</style>