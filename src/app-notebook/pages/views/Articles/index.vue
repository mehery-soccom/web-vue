<script setup>
import { ref, computed, onMounted } from "vue";
import { isThisSecond } from "date-fns";
import axios from "axios";
import { tenant_partition_key } from "@/app-notebook/plugins/tenantPartitionKey";
// Reactive data
// const tenantPartitionKey = ref("kedar");
const tenantPartitionKey = ref(tenant_partition_key || "kedar");
const type = ref("");
const category = ref("");
const title = ref("");
const pageTitle = ref("");
const document = ref("");
const error = ref(null);
const isLoading = ref(false);
const knowledgebases = ref([]);
const pages = ref([]);
const parentId = ref(null);
const parentCode = ref(null);
const parentCategory = ref(null);
const parentType = ref(null);
const kbPages = ref({}); // Store pages by KB ID
const selectedPage = ref(null);
const selectedKbId = ref(null);
const selectedKbTitle = ref("");
const iskbselected = ref(false);
const editedPages = ref([]);
const showModal = ref(false);
const isLoadingPages = ref(false);
const editPage = ref({
  _id: "",
  title: "",
  content: "",
});
const isAddKbModal = ref(false);
const isAddPageModal = ref(false);
const showError = computed(() => !!error.value);
const getPageCount = (kbId) => {
  return kbPages.value[kbId]?.length || 0;
};
// Computed properties
const hasChanges = computed(() => {
  return Object.keys(changedRecords.value || {}).length > 0;
});
const getKbPages = (kbId) => {
  return kbPages.value[kbId] || [];
};
// Note: changedRecords is referenced in computed but not defined in original code
// You may need to add this reactive reference if it's used elsewhere
const changedRecords = ref({});

// Methods
const resetKb = () => {
  parentId.value = null;
  parentCode.value = null;
  parentCategory.value = null;
  parentType.value = null;
  selectedKbTitle.value = "";
  iskbselected.value = false;
  knowledgebases.value = [];
  fetchknowledgebases();
};

const openEditModal = (pg) => {
  editPage.value = { ...pg }; // clone to avoid in-place mutation
  isAddKbModal.value = false;
  isAddPageModal.value = false;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  isAddKbModal.value = false;
  isAddPageModal.value = false;
  editPage.value = { _id: "", title: "", content: "" };
};
const selectPage = (page) => {
  closeModal();
  isAddKbModal.value = false;
  isAddPageModal.value = false;
  selectedPage.value = page;
};
const truncateContent = (content) => {
  if (!content) return "No content";
  return content.length > 50 ? content.substring(0, 50) + "..." : content;
};

const submitEdit = async () => {
  const { _id, title: editTitle, content } = editPage.value;

  if (!editTitle.trim() || !content.trim()) {
    alert("Both title and content are required.");
    return;
  }

  if (content.length > 2000) {
    alert("Content exceeds 2000 character limit.");
    return;
  }

  const updatedDoc = { _id, title: editTitle.trim(), content: content.trim() };
  const payload = {
    kb_id: parentId.value,
    code: parentCode.value,
    type: parentType.value,
    category: parentCategory.value,
    updateDocs: [updatedDoc],
  };
  console.log(`Updated doc to send: ${JSON.stringify(payload)}`);
  isLoading.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/article/api/pages",
    //   {
    //     method: "PATCH",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify(payload),
    //   }
    // );
    // const data = await response.json();
    const response = await axios.patch("/article/api/pages", payload, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      },
    });
    const data = await response.data;
    if (!data.success) {
      error.value = data.message;
    } else {
      console.log(`updated : ${JSON.stringify(data)}`);
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    pages.value = [];
    selectedPage.value.content = updatedDoc.content;
    selectedPage.value.title = updatedDoc.title;
    fetchPages();
    isLoading.value = false;
    closeModal();
  }
};

const deletePage = async (id) => {
  isLoading.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/article/api/pages",
    //   {
    //     method: "DELETE",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       kb_id: parentId.value,
    //       del_ids: [id],
    //     }),
    //   }
    // );
    // const data = await response.json();
    const response = await axios.delete(
      "/article/api/pages",
      {
        kb_id: parentId.value,
        del_ids: [id],
      },
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      }
    );
    const data = await response.data;
    if (!data.success) {
      error.value = data.message;
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    pages.value = [];
    selectedPage.value = null;
    fetchPages();
    isLoading.value = false;
  }
};

const deleteKb = async (id) => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/article/api/kb",
    //   {
    //     method: "DELETE",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       kb_id: id,
    //     }),
    //   }
    // );
    // const data = await response.json();
    console.log(`response : ${JSON.stringify(data)}`);
    const response = await axios.delete(
      "/article/api/kb",
      {
        kb_id: id,
      },
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      }
    );
    const data = await response.data;
    if (!data.success) {
      error.value = data.message;
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    pages.value = [];
    resetKb();
    isLoading.value = false;
  }
};

const submitPage = async () => {
  if (!pageTitle.value || !document.value.trim()) {
    alert("All fields are required.");
    return;
  }
  isLoading.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/article/api/pages",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       kb_id: parentId.value,
    //       code: parentCode.value,
    //       category: parentCategory.value,
    //       type: parentType.value,
    //       docs: [{ title: pageTitle.value, document: document.value }],
    //     }),
    //   }
    // );
    // const data = await response.json();
    const response = await axios.post(
      "/article/api/pages",
      {
        kb_id: parentId.value,
        code: parentCode.value,
        category: parentCategory.value,
        type: parentType.value,
        docs: [{ title: pageTitle.value, document: document.value }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      }
    );
    const data = await response.data;
    if (!data.success) {
      error.value = data.message;
    } else {
      pages.value = [];
      fetchPages();
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    isLoading.value = false;
  }
};

const fetchPages = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   `http://localhost:8090/scriptus/notebook/article/api/pages/mongodb?page=1&pageSize=100&kb_id=${parentId.value}`,
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //   }
    // );
    // const pagesData = await response.json();
    const response = await axios.get(
      `/article/api/pages/mongodb?page=1&pageSize=100&kb_id=${parentId.value}`,
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      }
    );
    const pagesData = await response.data;
    if (!pagesData.success) {
      error.value = pagesData.message;
    } else {
      pages.value = pagesData.data;
      kbPages.value[parentId.value] = pagesData.data || [];
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    isLoading.value = false;
  }
};

const loadPages = async (id, titleParam, code, categoryParam, typeParam) => {
  parentId.value = id;
  parentCode.value = code;
  parentCategory.value = categoryParam;
  parentType.value = typeParam;
  iskbselected.value = true;
  selectedKbTitle.value = titleParam;
  console.log(`Load pages for knowledgebase ID: ${id}`);
  fetchPages();
};

const submitForm = async () => {
  if (!type.value || !category.value.trim()) {
    alert("All fields are required.");
    return;
  }
  isLoading.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/article/api/kb",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       type: type.value,
    //       category: category.value.trim(),
    //       title: title.value.trim() || null,
    //     }),
    //   }
    // );
    // const data = await response.json();
    const response = await axios.post(
      `/article/api/kb`,
      {
        type: type.value,
        category: category.value.trim(),
        title: title.value.trim() || null,
      },
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      }
    );
    const data = await response.data;
    if (!data.success) {
      error.value = data.message;
    } else {
      resetState();
      knowledgebases.value = [];
      fetchknowledgebases();
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    isLoading.value = false;
  }
};

const resetState = () => {
  type.value = "";
  category.value = "";
  title.value = "";
  error.value = null;
};

const fetchknowledgebases = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/article/api/kb",
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //   }
    // );
    // const data = await response.json();

    const response = await axios.get(`/article/api/kb`, 
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      });
    const data = await response.data;
    if (!data.success) {
      error.value = data.message;
    } else {
      knowledgebases.value = data.result;
      resetState();
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    isLoading.value = false;
  }
};
const loadKnowledgebasePages = async (kb) => {
  selectedKbId.value = kb._id;
  selectedKbTitle.value = kb.title || kb.category;

  // If pages already loaded for this KB, don't reload
  if (kbPages.value[kb._id]) {
    return;
  }

  isLoadingPages.value = true;
  error.value = null;

  try {
    // const response = await fetch(
    //   `http://localhost:8090/scriptus/notebook/article/api/pages/mongodb?page=1&pageSize=100&kb_id=${kb._id}`,
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //   }
    // );
    // const pagesData = await response.json();
    const response = await axios.get(
      `/article/api/pages/mongodb?page=1&pageSize=100&kb_id=${kb._id}`,
      {
        headers: {
          "Content-Type": "application/json",
          tnt: tenantPartitionKey.value,
        },
      }
    );
    const pagesData = await response.data;
    if (!pagesData.success) {
      error.value = pagesData.message;
    } else {
      // Store pages for this KB
      kbPages.value[kb._id] = pagesData.data || [];
    }
  } catch (err) {
    handleApiError(err);
  } finally {
    isLoadingPages.value = false;
  }
};
const handleApiError = (err) => {
  if (err.response) {
    console.error("API Error Response:", err.response);
    switch (err.response.status) {
      case 400:
        error.value =
          "Bad Request: Please check your input. " +
          (err.response.data.message || "");
        break;
      case 401:
        error.value =
          "Unauthorized: You need to be logged in to perform this action.";
        break;
      case 403:
        error.value =
          "Forbidden: You don't have permission to access this resource.";
        break;
      case 404:
        error.value = "Not Found: The requested resource could not be found.";
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        error.value =
          "Server Error: We are experiencing issues on our end. Please try again later.";
        break;
      default:
        error.value = `An unexpected error occurred: ${err.response.status} - ${
          err.response.statusText || "Unknown Error"
        }`;
    }
  } else if (err.request) {
    console.error("API No Response:", err.request);
    error.value =
      "Network Error: Could not connect to the server. Please check your internet connection.";
  } else {
    console.error("API Request Setup Error:", err.message);
    error.value = `An error occurred: ${err.message}`;
  }
};
const displayAddKbModal = () => {
  closeModal();
  isAddPageModal.value = false;
  isAddKbModal.value = true;
};
const displayAddPageModal = () => {
  closeModal();
  isAddKbModal.value = false;
  isAddPageModal.value = true;
};
const clearError = () => {
  error.value = null;
};

// Lifecycle hook
onMounted(async () => {
  await fetchknowledgebases();
});

// Export functions and reactive data for template usage
// (This is automatically handled by <script setup>)
</script>
<template>
  <div class="container">
    <v-responsive class="border rounded" max-height="600">
      <v-app>
        <v-app-bar title="Article Manager" color="primary"></v-app-bar>

        <v-navigation-drawer permanent width="350">
          <v-list>
            <v-list-subheader>Knowledge Bases</v-list-subheader>
            <VBtn
              :icon="false"
              variant="tonal"
              color="default"
              @click="displayAddKbModal"
            >
              Add Knowledgebase
            </VBtn>
            <v-list-group
              v-for="kb in knowledgebases"
              :key="kb._id"
              :value="kb._id"
            >
              <template v-slot:activator="{ props }">
                <div class="d-flex align-center">
                  <v-list-item
                  v-bind="props"
                  :title="kb.title || kb.category"
                  :subtitle="`${kb.type} • ${kb.category}`"
                  prepend-icon="mdi-folder"
                  @click="
                    loadPages(kb._id, kb.title, kb.code, kb.category, kb.type)
                  "                  
                >
                </v-list-item>
                <v-icon icon="mdi-delete" @click="deleteKb(kb._id)"></v-icon>
                </div>
                
              </template>

              <div
                v-if="isLoadingPages && selectedKbId === kb._id"
                class="pa-4"
              >
                <span class="ml-2">Loading pages...</span>
              </div>

              <div
                v-else-if="getKbPages(kb._id).length > 0"
                style="max-height: 300px; overflow-y: auto"
              >
                <VBtn
                  :icon="false"
                  variant="tonal"
                  color="default"
                  @click="displayAddPageModal"
                >
                  Add Page
                </VBtn>
                <v-list-item
                  v-for="page in pages"
                  :key="page._id"
                  :title="page.title"
                  :subtitle="truncateContent(page.content || page.document)"
                  prepend-icon="mdi-file-document-outline"
                  class="ml-4"
                  @click="selectPage(page)"
                  :active="selectedPage && selectedPage._id === page._id"
                >
                </v-list-item>
              </div>
              <div
                v-else-if="getKbPages(kb._id).length === 0"
                style="max-height: 300px; overflow-y: auto"
              >
                <VBtn
                  :icon="false"
                  variant="tonal"
                  color="default"
                  @click="displayAddPageModal"
                >
                  Add Page No Pages in this Knowledge base
                </VBtn>
              </div>

              <v-list-item
                v-else-if="selectedKbId === kb._id"
                class="ml-4"
                title="No pages found"
                subtitle="This knowledge base is empty"
                prepend-icon="mdi-file-remove-outline"
                disabled
              >
              </v-list-item>
            </v-list-group>

            <v-list-item
              v-if="knowledgebases.length === 0 && !isLoading"
              title="No knowledge bases found"
              subtitle="Create your first knowledge base"
              prepend-icon="mdi-database-plus"
              disabled
            >
            </v-list-item>

            <div v-if="isLoading" class="pa-4 text-center">
              <div class="mt-2">Loading knowledge bases...</div>
            </div>
          </v-list>
        </v-navigation-drawer>

        <v-main>
          <v-container fluid>
            <!-- Add Knowledge Base Form -->
            <v-card v-if="isAddKbModal" class="mx-auto" max-width="600">
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-database-plus</v-icon>
                Create New Knowledge Base
              </v-card-title>

              <v-divider></v-divider>

              <v-form @submit.prevent="submitForm">
                <v-card-text>
                  <v-row>
                    <v-col cols="12">
                      <v-label class="text-subtitle-1 font-weight-medium mb-2"
                        >Type:</v-label
                      >
                      <v-btn-toggle
                        v-model="type"
                        color="primary"
                        variant="outlined"
                        mandatory
                        class="w-100"
                      >
                        <v-btn value="Information" class="flex-grow-1">
                          <v-icon start>mdi-information</v-icon>
                          Information
                        </v-btn>
                        <v-btn value="Guide" class="flex-grow-1">
                          <v-icon start>mdi-book-open</v-icon>
                          Guide
                        </v-btn>
                      </v-btn-toggle>
                    </v-col>

                    <v-col cols="12">
                      <v-text-field
                        v-model="category"
                        label="Category"
                        variant="outlined"
                        required
                        prepend-inner-icon="mdi-tag"
                        hint="Enter the category for this knowledge base"
                        persistent-hint
                      ></v-text-field>
                    </v-col>

                    <v-col cols="12">
                      <v-text-field
                        v-model="title"
                        label="Title (Optional)"
                        variant="outlined"
                        prepend-inner-icon="mdi-format-title"
                        hint="Enter an optional title for this knowledge base"
                        persistent-hint
                      ></v-text-field>
                    </v-col>
                  </v-row>
                </v-card-text>

                <v-card-actions class="px-6 pb-6">
                  <v-spacer></v-spacer>
                  <!-- <v-btn variant="outlined" @click="cancelForm"> Cancel </v-btn> -->
                  <v-btn
                    type="submit"
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-plus"
                  >
                    Create Knowledge Base
                  </v-btn>
                </v-card-actions>
              </v-form>
            </v-card>
            <v-card v-else-if="showModal">
              <v-card-title class="text-h5"> Edit Page </v-card-title>

              <v-card-text>
                <v-container>
                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        v-model="editPage.title"
                        label="Title"
                        outlined
                        dense
                      ></v-text-field>
                    </v-col>

                    <v-col cols="12">
                      <v-textarea
                        v-model="editPage.content"
                        label="Content (max 2000 chars)"
                        :counter="2000"
                        maxlength="2000"
                        rows="5"
                        outlined
                        dense
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>

              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="grey darken-1" text @click="closeModal">
                  Cancel
                </v-btn>
                <v-btn color="primary" @click="submitEdit"> Update </v-btn>
              </v-card-actions>
            </v-card>

            <!-- Add Page Form -->
            <v-card
              v-else-if="isAddPageModal"
              v-if="iskbselected"
              class="mx-auto"
              max-width="800"
            >
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-file-document-plus</v-icon>
                Add New Page
                <v-spacer></v-spacer>
                <v-chip color="primary" variant="outlined">
                  {{ selectedKbTitle }}
                </v-chip>
              </v-card-title>

              <v-divider></v-divider>

              <v-form @submit.prevent="submitPage">
                <v-card-text>
                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        v-model="pageTitle"
                        label="Page Title"
                        variant="outlined"
                        required
                        prepend-inner-icon="mdi-format-title"
                        hint="Enter a descriptive title for this page"
                        persistent-hint
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="document"
                        label="Page Content"
                        variant="outlined"
                        required
                        rows="10"
                        counter="2000"
                        maxlength="2000"
                        prepend-inner-icon="mdi-text"
                        hint="Enter the content for this page (maximum 2000 characters)"
                        persistent-hint
                        auto-grow="true"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>

                <v-card-actions class="px-6 pb-6">
                  <v-spacer></v-spacer>
                  <!-- <v-btn variant="outlined" @click="cancelPageForm">
                    Cancel
                  </v-btn> -->
                  <v-btn
                    type="submit"
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-plus"
                  >
                    Add Page
                  </v-btn>
                </v-card-actions>
              </v-form>
            </v-card>
            <div v-else-if="selectedPage" class="">
              <v-card>
                <v-card-title class="d-flex align-center">
                  <v-icon class="mr-2">mdi-file-document</v-icon>
                  {{ selectedPage.title }}
                  <v-spacer></v-spacer>
                  <v-chip color="success" size="small">
                    {{ selectedKbTitle }}
                  </v-chip>
                </v-card-title>

                <v-divider></v-divider>

                <v-card-text>
                  <div class="page-document">
                    {{ selectedPage.content || selectedPage.document }}
                  </div>
                </v-card-text>

                <v-card-actions>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    prepend-icon="mdi-pencil"
                    @click="openEditModal(selectedPage)"
                  >
                    Edit Page
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="outlined"
                    prepend-icon="mdi-delete"
                    @click="deletePage(selectedPage._id)"
                  >
                    Delete Page
                  </v-btn>
                </v-card-actions>
              </v-card>
            </div>

            <div v-else class="welcome-content">
              <v-card class="mx-auto" max-width="600">
                <v-card-text class="text-center pa-8">
                  <v-icon size="64" color="grey-lighten-1"
                    >mdi-book-open-variant</v-icon
                  >
                  <h2 class="mt-4 mb-2">Welcome to Article Manager</h2>
                  <p class="text-grey">
                    Select a knowledge base from the sidebar and choose a page
                    to view its content.
                  </p>
                </v-card-text>
              </v-card>
            </div>

            <v-snackbar v-model="showError" color="error" :timeout="5000">
              {{ error }}
              <template v-slot:actions>
                <v-btn variant="text" @click="clearError">Close</v-btn>
              </template>
            </v-snackbar>
          </v-container>
        </v-main>
      </v-app>
    </v-responsive>
  </div>
</template>
<style scoped>
.welcome-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.page-document {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 16px;
}
.v-list-group .v-list-item {
  transition: all 0.2s ease;
}

.v-list-group .v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
.form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.field {
  margin-bottom: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #aaa;
  background: #f9f9f9;
  cursor: pointer;
}

button.active {
  background-color: #007bff;
  color: white;
}

input {
  width: 100%;
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.error-message {
  background-color: #ffebee; /* Light red */
  color: #c62828; /* Dark red */
  border: 1px solid #ef9a9a; /* Lighter red border */
  padding: 15px;
  margin-top: 15px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message p {
  margin: 0;
}

.clear-error-button {
  background: none;
  border: none;
  color: #c62828;
  font-weight: bold;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 5px;
}
.kb-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}

.kb-table th,
.kb-table td {
  padding: 0.5rem;
  border: 1px solid #ddd;
  text-align: left;
}
.kb-table input,
.kb-table textarea {
  width: 100%;
  border: 1px solid #ccc;
  padding: 4px;
  box-sizing: border-box;
}
</style>
<!-- 
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="clearError" class="clear-error-button">X</button>
    </div>
    <div v-if="isLoading" class="">
      <p>Loading ...</p>
    </div>
    <table class="kb-table" v-if="knowledgebases.length > 0">
      <thead>
        <tr>
          <th>Type</th>
          <th>Category</th>
          <th>Title</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="kb in knowledgebases" :key="kb._id">
          <td>{{ kb.type }}</td>
          <td>{{ kb.category }}</td>
          <td>{{ kb.title }}</td>
          <td>
            <button @click="deleteKB(kb._id)">Delete</button>
            <button
              @click="
                loadPages(kb._id, kb.title, kb.code, kb.category, kb.type)
              "
            >
              Load Pages
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <table class="kb-table" v-if="pages.length > 0">
      <thead>
        <tr>
          <th>Title</th>
          <th>Content</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pg in pages" :key="pg._id">
          <td>{{ pg.title || "Undefined" }}</td>
          <td>{{ pg.content }}</td>
          <td>
            <button @click="openEditModal(pg)">Edit</button>
            <button @click="deletePage(pg._id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="modal-backdrop" v-if="showModal">
      <div class="modal">
        <h3>Edit Page</h3>
        <div class="field">
          <label>Title:</label>
          <input v-model="editPage.title" type="text" />
        </div>
        <div class="field">
          <label>Content (max 2000 chars):</label>
          <textarea
            v-model="editPage.content"
            maxlength="2000"
            rows="5"
          ></textarea>
          <small>{{ editPage.content.length }} / 2000</small>
        </div>
        <div class="modal-actions">
          <button @click="submitEdit">Update</button>
          <button @click="closeModal">Cancel</button>
        </div>
      </div>
    </div> -->
