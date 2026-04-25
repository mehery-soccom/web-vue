<script setup>
import { ref, onMounted, computed, inject } from 'vue';
// import MyPdfUpload from '@/app-lead/views/admin/leads/MyPdfUpload.vue';
import LeadDocUpload from '@/app-lead/views/admin/leads/LeadDocUpload.vue';
import { useDocStore } from '@/app-lead/views/admin/leads/useDocStore';

const props = defineProps({
  leadId: {
    type: String,
    required: true,
  },
  formId: {
    type: String,
    required: true, 
  }
});

const docStore = useDocStore();
const { show } = inject("snackbar");

const allDocs = ref([]);
const isLoading = ref(true);
const byUser = window.CONST?.USER?.code || null;

const isAddingNote = ref(false);
const isSavingNote = ref(false);
const newNote = ref({
  title: '',
  content: '',
});

const isAddingDoc = ref(false);
const isSavingDoc = ref(false);
const newDocument = ref({
  title: '',
  url: '',
  fileDetails: null
});
const maxDocSize = 5 * 1024 * 1024;

const documents = computed(() => {
  return allDocs.value
    .filter(doc => doc.type === 'DOCUMENT')
    .sort((a, b) => (b.updatedAt?.stamp || b.createdAt.stamp) - (a.updatedAt?.stamp || a.createdAt.stamp));
});

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  } else {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}


const editingNoteId = ref(null);
const editedNoteData = ref({ title: '', content: '' });

const editingDocId = ref(null);
const editedDocData = ref({ title: '' });

const fetchDocsAndNotes = async () => {
  isLoading.value = true;
  try {
    const response = await docStore.fetchDocs({ leadId: props.leadId });
    allDocs.value = response.data || [];
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    const errorMessage = error.response?.data?.message || error.message || 'Could not load documents and notes.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchDocsAndNotes);

const notes = computed(() => {
  return allDocs.value
    .filter(doc => doc.type === 'NOTE')
    .sort((a, b) => (b.updatedAt?.stamp || b.createdAt.stamp) - (a.updatedAt?.stamp || a.createdAt.stamp));
});

const resetAndCloseForm = () => {
  newNote.value = { title: '', content: '' };
  isAddingNote.value = false;
};

const handleSaveNote = async () => {
  if (!newNote.value.content) {
    show({ message: 'Note content cannot be empty.', color: 'warning' });
    return;
  }

  isSavingNote.value = true;
  try {
    const payload = {
      title: newNote.value.title || 'Note',
      type: 'NOTE',
      content: newNote.value.content,
      leadId: props.leadId,
      documentInfo: {},
      byUser: byUser,
    };

    await docStore.createDoc({ payload });
    show({ message: 'Note saved successfully!', color: 'success' });
    
    await fetchDocsAndNotes();
    resetAndCloseForm();

  } catch (error) {
    console.error("Failed to save note:", error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to save note.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isSavingNote.value = false;
  }
};

const handleEditNote = (note) => {
  editingNoteId.value = note._id;
  editedNoteData.value = { title: note.title, content: note.content };
};

const cancelEdit = () => {
  editingNoteId.value = null;
  editedNoteData.value = { title: '', content: '' };
};

const handleUpdateNote = async () => {
  if (!editedNoteData.value.content) {
    show({ message: 'Note content cannot be empty.', color: 'warning' });
    return;
  }
  isSavingNote.value = true;
  try {
    const payload = { 
      title: editedNoteData.value.title || 'Note',
      content: editedNoteData.value.content,
      type: 'NOTE',
      leadId: props.leadId,
      documentInfo: {},
      byUser: byUser,
    };

    await docStore.updateDoc({
      id: editingNoteId.value,
      payload: payload,
    });

    show({ message: 'Note updated successfully!', color: 'success' });
    await fetchDocsAndNotes();
    cancelEdit();
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update note.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isSavingNote.value = false;
  }
};

const handleDeleteNote = async (noteId) => {
  isSavingNote.value = true;
  try {
    await docStore.deleteDoc({ id: noteId });
    show({ message: 'Note deleted successfully', color: 'success' });
    await fetchDocsAndNotes();
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete note.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isSavingNote.value = false;
  }
};

const resetAndCloseDocForm = () => {
  newDocument.value = { title: '', url: '', fileDetails: null };
  isAddingDoc.value = false;
};

const handleDocumentUploadComplete = async () => {
  const uploadedUrl = newDocument.value.url;
  const fileDetails = newDocument.value.fileDetails;

  if (!uploadedUrl || !fileDetails) {
    show({ message: 'Please upload a file first.', color: 'warning' });
    return;
  }

  isSavingDoc.value = true;
  try {
    const documentInfo = {
      fileName: fileDetails.name || uploadedUrl.split('/').pop(),
      fileSize: fileDetails.contentLength || 0,
      mimeType: fileDetails.contentType || 'application/pdf',
      path: fileDetails.path || null
    };

    const payload = {
      title: newDocument.value.title || documentInfo.fileName.split('.').slice(0, -1).join('.') || 'Document', 
      type: 'DOCUMENT',
      content: uploadedUrl,
      leadId: props.leadId,
      byUser: byUser,
      documentInfo: documentInfo,
    };

    await docStore.createDoc({ payload });
    show({ message: 'Document saved successfully!', color: 'success' });
    
    await fetchDocsAndNotes();
    resetAndCloseDocForm();

  } catch (error) {
    console.error("Failed to save document:", error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to save document record.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isSavingDoc.value = false;
  }
};

const handleDeleteDocument = async (docId) => {
  isSavingDoc.value = true;
  try {
    await docStore.deleteDoc({ id: docId });
    show({ message: 'Document deleted successfully', color: 'success' });
    await fetchDocsAndNotes();
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete document.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isSavingDoc.value = false;
  }
};

const handleEditDoc = (doc) => {
  editingDocId.value = doc._id;
  editedDocData.value = { title: doc.title };
};

const cancelEditDoc = () => {
  editingDocId.value = null;
  editedDocData.value = { title: '' };
};

const handleUpdateDoc = async () => {
  if (!editedDocData.value.title) {
    show({ message: 'Document title cannot be empty.', color: 'warning' });
    return;
  }
  isSavingDoc.value = true;
  try {
    const originalDoc = allDocs.value.find(d => d._id === editingDocId.value);
    if (!originalDoc) {
      throw new Error("Original document not found.");
    }

    const payload = {
      ...originalDoc,
      title: editedDocData.value.title,
      byUser: byUser,
    };
    
    delete payload._id; 
    delete payload.createdAt;
    delete payload.updatedAt;

    await docStore.updateDoc({
      id: editingDocId.value,
      payload: payload,
    });

    show({ message: 'Document updated successfully!', color: 'success' });
    await fetchDocsAndNotes();
    cancelEditDoc();
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update document.'
    show({ message: errorMessage, color: 'error' });
  } finally {
    isSavingDoc.value = false;
  }
};

const formatTimestamp = (note) => {
  const timestampObj = note.updatedAt || note.createdAt;
  if (!timestampObj || !timestampObj.stamp) return '';

  const date = new Date(timestampObj.stamp);
  const options = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const formattedDate = new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', ' ');
  
  const prefix = (note.updatedAt && note.updatedAt.stamp !== note.createdAt.stamp) ? 'Edited on' : 'Created on';

  return `${prefix} ${formattedDate} by ${timestampObj.byUser}`;
};

</script>

<template>
  <VRow>
    <!-- Notes Card -->
    <VCol cols="12">
      <VCard border elevation="2">
        <VCardItem>
          <VCardTitle>Notes</VCardTitle>
        </VCardItem>

        <VCardText>
          <VTextField
            v-if="!isAddingNote"
            placeholder="Add a note..."
            variant="outlined"
            @focus="isAddingNote = true"
            readonly
          />

          <div v-else>
            <VTextField
              v-model="newNote.title"
              label="Title (Optional)"
              variant="outlined"
              class="mb-4"
            />
            <VTextarea
              v-model="newNote.content"
              label="Content"
              variant="outlined"
              rows="3"
              auto-grow
              autofocus
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
                :loading="isSavingNote"
                @click="handleSaveNote"
              >
                Save
              </VBtn>
            </div>
          </div>
        </VCardText>

        <VDivider v-if="notes.length > 0" />
        
        <VList v-if="notes.length > 0" class="py-0">
            <template v-for="note in notes" :key="note._id">
                <VListItem class="list-item-hover pa-4 pb-5">
                
                <template #prepend>
                    <VIcon icon="tabler-note" class="mt-3" />
                </template>

                <div class="list-item-actions" v-if="editingNoteId !== note._id">
                    <IconBtn size="x-small" @click="handleEditNote(note)">
                    <VIcon icon="tabler-pencil" />
                    </IconBtn>
                    
                    <IconBtn size="x-small">
                    <VIcon icon="tabler-trash" />
                    <v-dialog activator="parent" max-width="400">
                        <template v-slot:default="{ isActive }">
                        <v-card
                            title="Confirm Deletion"
                            text="Are you sure you want to delete this note? This action cannot be undone."
                        >
                            <template v-slot:actions>
                            <VSpacer />
                            <v-btn text="Cancel" @click="isActive.value = false" />
                            <v-btn
                                color="error"
                                variant="tonal"
                                text="Delete"
                                :loading="isSavingNote"
                                @click="() => { handleDeleteNote(note._id); isActive.value = false; }"
                            />
                            </template>
                        </v-card>
                        </template>
                    </v-dialog>
                    </IconBtn>
                </div>
                
                <div v-if="editingNoteId === note._id" class="py-2">
                    <VTextField
                        v-model="editedNoteData.title"
                        label="Title (Optional)"
                        variant="outlined"
                        class="mb-4"
                        density="compact"
                    />
                    <VTextarea
                        v-model="editedNoteData.content"
                        label="Content"
                        variant="outlined"
                        rows="3"
                        auto-grow
                        autofocus
                    />
                    <div class="d-flex gap-4 mt-2">
                        <VSpacer />
                        <VBtn size="small" variant="text" @click="cancelEdit">Cancel</VBtn>
                        <VBtn size="small" :loading="isSavingNote" @click="handleUpdateNote">Update</VBtn>
                    </div>
                </div>
                
                <div v-else>
                    <VListItemTitle class="mb-1">{{ note.title }}</VListItemTitle>
                    <VListItemSubtitle style="white-space: pre-wrap;">{{ note.content }}</VListItemSubtitle>
                </div>

                <div class="list-item-timestamp" v-if="editingNoteId !== note._id">
                    <VIcon icon="tabler-clock" size="16" class="me-1" />
                    <span class="text-caption">{{ formatTimestamp(note) }}</span>
                </div>

                </VListItem>
                <VDivider />
            </template>
        </VList>
        
        <VCardText v-if="!isLoading && notes.length === 0 && !isAddingNote" class="text-center text-disabled">
          No notes found.
        </VCardText>

        <VCardText v-if="isLoading" class="text-center">
          <VProgressCircular indeterminate />
        </VCardText>
      </VCard>
    </VCol>

    <!-- Documents Card -->
    <VCol cols="12">
      <VCard border elevation="2">
        <VCardItem>
          <VCardTitle>Documents</VCardTitle>
          <template #append v-if="!isAddingDoc">
            <VBtn 
              size="small" 
              variant="text" 
              icon="tabler-upload" 
              @click="isAddingDoc = true" 
              />
          </template>
        </VCardItem>

        <VCardText v-if="isAddingDoc">
          <VTextField
            v-model="newDocument.title"
            label="Document Title (Optional)"
            placeholder="e.g., Contract Agreement"
            variant="outlined"
            class="mb-4"
          />
          <!-- <MyPdfUpload
            label="Select Document"
            v-model="newDocument.url"
            @upload-complete="newDocument.fileDetails = $event"
            :max-size="maxDocSize"
          /> -->
          <LeadDocUpload
            label="Select Document"
            v-model="newDocument.url"
            @upload-complete="newDocument.fileDetails = $event"
            :max-size="maxDocSize"
            :form-id="props.formId"
            sub-dir="profile"
          />
          <div class="d-flex gap-4 mt-4">
              <VSpacer />
              <VBtn
                variant="tonal"
                color="secondary"
                @click="resetAndCloseDocForm"
              >
                Cancel
              </VBtn>
             <VBtn 
                :loading="isSavingDoc" 
                :disabled="!newDocument.url || isSavingDoc"
                @click="handleDocumentUploadComplete"
              > 
                {{ isSavingDoc ? 'Saving...' : 'Upload & Save' }}
              </VBtn> 
            </div>
        </VCardText>
        
        <VDivider v-if="documents.length > 0" />

        <VList v-if="documents.length > 0" class="py-0">
          <template v-for="doc in documents" :key="doc._id">
            <VListItem class="list-item-hover pa-4 pb-5">

              <template #prepend>
                <VIcon icon="tabler-file" class="mt-n1" />
              </template>

              <div v-if="editingDocId === doc._id" class="py-2">
                <VTextField
                  v-model="editedDocData.title"
                  label="Document Title"
                  variant="outlined"
                  density="compact"
                  autofocus
                  @keyup.enter="handleUpdateDoc"
                  @keyup.esc="cancelEditDoc"
                />

                <div class="d-flex gap-4 mt-2">
                  <VSpacer />
                  <VBtn size="small" variant="text" @click="cancelEditDoc">
                    Cancel
                  </VBtn>
                  <VBtn size="small" :loading="isSavingDoc" @click="handleUpdateDoc">
                    Update
                  </VBtn>
                </div>
              </div>

              <div v-else>
                <VListItemTitle class="mb-1">{{ doc.title }}</VListItemTitle>
                <VListItemSubtitle>
                  {{ doc.documentInfo.fileName || 'N/A' }}
                  ({{ formatFileSize(doc.documentInfo.fileSize) }})
                </VListItemSubtitle>
              </div>

              <div v-if="editingDocId !== doc._id" class="list-item-timestamp">
                <VIcon icon="tabler-clock" size="16" class="me-1" />
                <span class="text-caption">{{ formatTimestamp(doc) }}</span>
              </div>

              <template #append>
                <div v-if="editingDocId !== doc._id" class="list-item-actions">
                  <IconBtn size="x-small" @click="handleEditDoc(doc)">
                    <VIcon icon="tabler-pencil" />
                  </IconBtn>

                  <IconBtn
                    size="x-small"
                    :href="doc.content"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <VIcon icon="tabler-eye" />
                  </IconBtn>

                  <IconBtn size="x-small">
                    <VIcon icon="tabler-trash" />
                    <v-dialog activator="parent" max-width="400">
                      <template v-slot:default="{ isActive }">
                        <v-card
                          title="Confirm Deletion"
                          text="Are you sure you want to delete this document? This action cannot be undone."
                        >
                          <template v-slot:actions>
                            <VSpacer />
                            <v-btn text="Cancel" @click="isActive.value = false" />
                            <v-btn
                              color="error"
                              variant="tonal"
                              text="Delete"
                              :loading="isSavingDoc" 
                              @click="() => { handleDeleteDocument(doc._id); isActive.value = false; }"
                            />
                          </template>
                        </v-card>
                      </template>
                    </v-dialog>
                  </IconBtn>
                </div>
              </template>

            </VListItem>
            <VDivider />
          </template>
        </VList>

        <VCardText v-if="!isLoading && documents.length === 0 && !isAddingDoc" class="text-center text-disabled">
          No documents found.
        </VCardText>

        <VCardText v-if="isLoading" class="text-center">
          <VProgressCircular indeterminate />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
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
</style>

