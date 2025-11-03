<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import MyFileInputUpload from '@/@common/components/vuexy/MyFileInputUpload.vue'; 
import { useDocStore } from '@/app-lead/views/admin/leads/useDocStore';

const props = defineProps({
  leadId: {
    type: String,
    required: true,
  },
});

const docStore = useDocStore();
const { show } = inject("snackbar");

const allDocs = ref([]);
const isLoading = ref(true);
const byUser = window.CONST?.USER?.user || null;

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

const documents = computed(() => {
  return allDocs.value
    .filter(doc => doc.type === 'DOCUMENT')
    .sort((a, b) => (b.updatedAt?.stamp || b.createdAt.stamp) - (a.updatedAt?.stamp || a.createdAt.stamp));
});


const editingNoteId = ref(null);
const editedNoteData = ref({ title: '', content: '' });

const fetchDocsAndNotes = async () => {
  isLoading.value = true;
  try {
    const response = await docStore.fetchDocs({ leadId: props.leadId });
    allDocs.value = response.data || [];
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    show({ message: 'Could not load documents and notes.', color: 'error' });
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
    show({ message: 'Failed to save note.', color: 'error' });
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
    show({ message: 'Failed to update note.', color: 'error' });
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
    show({ message: 'Failed to delete note.', color: 'error' });
  } finally {
    isSavingNote.value = false;
  }
};

const resetAndCloseDocForm = () => {
  newDocument.value = { title: '', url: '', fileDetails: null };
  isAddingDoc.value = false;
};

const handleDocumentUploadComplete = async (uploadedUrl) => {
  if (!uploadedUrl) return; // Exit if the URL is empty (e.g., cleared)

  isSavingDoc.value = true;
  try {
    // Attempt to get file details from the component or event if available
    // For now, we hardcode documentInfo as requested
    const hardcodedFileInfo = {
      fileName: newDocument.value.title || uploadedUrl.split('/').pop() || 'document.pdf', // Best guess for filename
      fileSize: 1000000, // Placeholder size
      mimeType: 'application/octet-stream', // Placeholder type
    };

    const payload = {
      title: newDocument.value.title || hardcodedFileInfo.fileName.split('.')[0] || 'Document', // Use filename base if no title
      type: 'DOCUMENT',
      content: uploadedUrl, // The URL from the upload component
      leadId: props.leadId,
      createdBy: 'HIMANSHU', // Hardcoded as requested
      documentInfo: hardcodedFileInfo, // Hardcoded for now
    };

    await docStore.createDoc({ payload });
    show({ message: 'Document saved successfully!', color: 'success' });
    
    await fetchDocsAndNotes();
    resetAndCloseDocForm(); // Close form after successful save

  } catch (error) {
    console.error("Failed to save document:", error);
    show({ message: 'Failed to save document record.', color: 'error' });
    // Keep the form open for retry if needed, or you could close it here too
  } finally {
    isSavingDoc.value = false;
  }
};

watch(() => newDocument.value.url, (newUrl, oldUrl) => {
  // Trigger save only when a new URL is set (not when cleared)
  if (newUrl && newUrl !== oldUrl) {
    handleDocumentUploadComplete(newUrl);
  }
});

// 5. Add handler for deleting documents (similar to notes)
const handleDeleteDocument = async (docId) => {
  // Use isSavingDoc state to show loading on button maybe? Or add a specific one.
  try {
    await docStore.deleteDoc({ id: docId });
    show({ message: 'Document deleted successfully', color: 'success' });
    await fetchDocsAndNotes();
  } catch (error) {
    show({ message: 'Failed to delete document.', color: 'error' });
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
    <!-- <VCol cols="12">
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
          <MyFileInputUpload
            label="Select Document"
            v-model="newDocument.url" 
            accept="*" 
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
              <VBtn :loading="isSavingDoc" disabled> 
                {{ isSavingDoc ? 'Saving...' : 'Upload & Save' }}
              </VBtn> 
            </div>
        </VCardText>
        
        <VDivider v-if="documents.length > 0" />

        <VList v-if="documents.length > 0" class="py-0">
          <template v-for="doc in documents" :key="doc._id">
            <VListItem 
              class="list-item-hover pa-4 pb-8" 
              :href="doc.content" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <template #prepend>
                <VIcon icon="tabler-file" class="mt-n1" />
              </template>

              <VListItemTitle class="mb-1">{{ doc.title }}</VListItemTitle>
              <VListItemSubtitle>
                {{ doc.documentInfo.fileName || 'N/A' }} 
                ({{ formatFileSize(doc.documentInfo.fileSize) }})
              </VListItemSubtitle>

              <div class="list-item-timestamp">
                <VIcon icon="tabler-clock" size="16" class="me-1" />
                <span class="text-caption">{{ formatTimestamp(doc) }}</span>
              </div>

              <template #append>
                <div class="list-item-actions">
                  <IconBtn size="x-small">
                    <VIcon icon="tabler-trash" />
                    <v-dialog activator="parent" max-width="400">
                        <template v-slot:default="{ isActive }">
                          <v-card
                            title="Confirm Deletion"
                            text="Are you sure you want to delete this document?"
                          >
                            <template v-slot:actions>
                              <VSpacer />
                              <v-btn text="Cancel" @click="isActive.value = false" />
                              <v-btn
                                color="error"
                                variant="tonal"
                                text="Delete"
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
    </VCol> -->
  </VRow>
</template>

<style scoped>
.list-item-hover {
  /* This allows us to position child elements relative to the list item */
  position: relative; 
}

.list-item-actions {
  /* Position the actions to the top right */
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 0.25rem;
  background-color: rgb(var(--v-theme-surface)); /* Add a small background to prevent text overlap */
  border-radius: 4px;

  /* Hide actions by default */
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.list-item-hover:hover .list-item-actions {
  /* Show actions on hover */
  opacity: 1;
}

.list-item-timestamp {
  /* Position the timestamp to the bottom right */
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}
</style>

