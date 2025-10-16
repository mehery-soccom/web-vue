<!-- src/components/QAPairsTable.vue -->
<script setup>
import axios from "axios";
import { tenant_partition_key } from "@/app-notebook/plugins/tenantPartitionKey";
import { paginationMeta } from "@app-pushapp/@fake-db/utils";
import { computed, nextTick, reactive, ref, watch } from "vue";
import { VDataTable } from "vuetify/labs/VDataTable";
import * as XLSX from "xlsx";
import zipcelx from "zipcelx";
const qaTableItemsPerPage = 25;
const qaTableHeaders = [
  { title: "Question", key: "question", sortable: false },
  { title: "Answer", key: "answer", sortable: false },
  { title: "Actions", key: "actions", sortable: false, width: "100px" },
];
const selectedItems = ref([]);
const qaTableOptions = ref({
  page: 1,
  itemsPerPage: 25,
  search: undefined,
});
const editedItem = ref({
  _id: "",
  question: "",
  answer: "",
  createdAt: "",
  kb_id: "",
  topic_id: "",
  updatedAt: "",
  tenant_partition_key: "",
  __v: 0,
});
const defaultItem = {
  _id: "",
  question: "",
  answer: "",
  createdAt: "",
  kb_id: "",
  topic_id: "",
  updatedAt: "",
  tenant_partition_key: "",
  __v: 0,
};
const editedIndex = ref("");
// Reactive data
const qaData = ref([]);
const cachedPages = ref({}); // Cache for page data: { pageNum: [...data] }
const lastSeenIds = ref({}); // Cache for lastSeenIds: { pageNum: lastSeenId }
const selectedIdsByPage = ref({}); // Track selections by page: { pageNum: [...selectedIds] }
const editedItems = ref({}); // Track edited items: { itemId: { question: '...', answer: '...' } }
const editingContent = reactive({
  itemId: null,
  field: null,
  text: "",
  originalText: "",
});

const loading = ref(false);
const currentPage = ref(1);
const totalPages = ref(0);
const totalItems = ref(0);
const pageSize = ref(25);
const knowledgeBases = ref([]); // List of knowledge bases
const topics = ref([]);
const tenantPartitionKey = ref(tenant_partition_key || "kedar");
const tempTenantKey = ref("");
const selectedKbId = ref(null); // Selected knowledge base ID
const selectedKbName = ref(""); // Selected knowledge base name
const tempKbId = ref(""); // Temporary KB ID for form
const showDeleteModal = ref(false);
const showTopicDeleteModal = ref(false);
const showKbDeleteModal = ref(false);
const statusMessage = ref("");
const statusType = ref("info"); // 'info', 'success', 'error'
const statusTimeout = ref(null);
const cacheTimestamp = ref(null); // When the cache was last refreshed
const tempTopicId = ref("");
const selectedTopicId = ref(null);
const selectedTopicName = ref("");
const ques = ref([]);
const validationMessage = ref("");
const isValidFile = ref(false);
const saveMessage = ref("");
const saveSuccess = ref(false);
const isSaving = ref(false);
const previewHeaders = ref([
  {
    align: "start",
    key: "que",
    sortable: false,
    title: "Question",
  },
  { title: "Answer", key: "ans" },
]);
const previewPage = ref(1);
const previewItemsPerPage = ref(5);
const kbNameError = ref("");
const isKbNameValid = ref(true);
// Template refs
const editTextarea = ref(null);
const showCreateKbModal = ref(false);
const newCreateKbName = ref("");
// Computed properties
const allSelected = computed(() => {
  return (
    qaData.value.length > 0 &&
    selectedIdsByPage.value[currentPage.value] &&
    selectedIdsByPage.value[currentPage.value].length === qaData.value.length
  );
});
const newCreateTopicName = ref("");
const showCreateTopicModal = ref(false);
const isTopicNameValid = ref(true);
const topicNameError = ref("");
const openCreateTopicModal = () => {
  showCreateTopicModal.value = true;
  newCreateTopicName.value = ""; // Reset form when opening
};

const closeTopicModal = () => {
  showCreateTopicModal.value = false;
  newCreateTopicName.value = ""; // Clear form when closing
  topicNameError.value = "";
  isTopicNameValid.value = true;
};
const deleteTopic = async () => {
  try {
    // const response = await fetch(
    //   `http://localhost:8090/scriptus/notebook/v1/api/qapairs/topic`,
    //   {
    //     // Replace with your actual API URL
    //     method: "DELETE",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       topic_id: selectedTopicId.value,
    //       topic_name: selectedTopicName.value,
    //       kb_id: selectedKbId.value,
    //       kb_name: selectedKbName.value,
    //     }),
    //   }
    // );
    // const responseData = await response.json();
    const response = await axios.delete("/v1/api/qapairs/topic",{
          topic_id: selectedTopicId.value,
          topic_name: selectedTopicName.value,
          kb_id: selectedKbId.value,
          kb_name: selectedKbName.value,
        } , {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const data = await response.data;
    const kb = {
      id : selectedKbId.value,
      name : selectedKbName.value
    }
    resetStateComplete();
    selectedKbId.value = kb.id;
    selectedKbName.value = kb.name;
    cancelDeleteTopic();
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create knowledge base");
    }
  } catch (error) {
    console.error("Error deleting topic:", error);
  }
};
const createTopic = async () => {
  const trimmedTopicName = newCreateTopicName.value.trim();
  if (!trimmedTopicName) {
    isTopicNameValid.value = false;
    topicNameError.value = "topic name is empty after trimming.";
    return;
  }
  const allowedTopicNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!allowedTopicNameRegex.test(trimmedTopicName)) {
    isTopicNameValid.value = false;
    topicNameError.value =
      "Invalid characters. Only letters, numbers, and underscores (_) are allowed.";
    return;
  } else {
    isTopicNameValid.value = true;
    topicNameError.value = "";
  }
  const payload = {
    topic_name: trimmedTopicName,
    kb_id: selectedKbId.value,
  };
  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/v1/api/qapairs/topic",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify(payload),
    //   }
    // );
    // if (!response.ok) {
    //   const errorData = await response.json();
    //   throw new Error(errorData.message || "Failed to create knowledge base");
    // }
    // const newTopicData = await response.json();
    const response = await axios.post("/v1/api/qapairs/topic",payload, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const newTopicData = await response.data;
    // Assuming backend returns the new KB object
    newCreateTopicName.value = ""; // Clear input
    console.log(JSON.stringify(newTopicData));
    if (newTopicData.result.success) {
      isTopicNameValid.value = true;
      topicNameError.value = "";
      closeTopicModal();
    } else {
      isTopicNameValid.value = false;
      topicNameError.value = newTopicData.result.message;
    }
    await fetchTopics(); // Refresh list from backend
  } catch (error) {
    console.error("Error creating topic :", error);
  }
};
const openCreateKbModal = () => {
  showCreateKbModal.value = true;
  newCreateKbName.value = ""; // Reset form when opening
};

const closeKbModal = () => {
  showCreateKbModal.value = false;
  newCreateKbName.value = ""; // Clear form when closing
  kbNameError.value = "";
  isKbNameValid.value = true;
};
const createKnowledgeBase = async () => {
  const trimmedKbName = newCreateKbName.value.trim();
  if (!trimmedKbName) {
    isKbNameValid.value = false;
    kbNameError.value =
      "Knowledge base name is invalid or empty after trimming.";
    return;
  }
  const allowedKbNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!allowedKbNameRegex.test(trimmedKbName)) {
    isKbNameValid.value = false;
    kbNameError.value =
      "Invalid characters. Only letters, numbers, and underscores (_) are allowed.";
    return;
  } else {
    isKbNameValid.value = true;
    kbNameError.value = "";
  }
  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/v1/api/qapairs/kb",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({ kb_name: trimmedKbName }),
    //   }
    // );
    // if (!response.ok) {
    //   const errorData = await response.json();
    //   throw new Error(errorData.message || "Failed to create knowledge base");
    // }
    // const newKbData = await response.json();
    const response = await axios.post("/v1/api/qapairs/kb",{ kb_name: trimmedKbName }, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const newKbData = await response.data;
    // Assuming backend returns the new KB object
    newCreateKbName.value = ""; // Clear input
    console.log(JSON.stringify(newKbData));
    if (newKbData.result.success) {
      isKbNameValid.value = true;
      kbNameError.value = "";
      closeKbModal();
    } else {
      isKbNameValid.value = false;
      kbNameError.value = newKbData.result.message;
    }
    await fetchKnowledgeBases(); // Refresh list from backend
  } catch (error) {
    console.error("Error creating knowledge base:", error);
  }
};
const isFormValid = computed(() => {
  return (
    // tempTenantKey.value.trim() &&
    !tenantPartitionKey.value || // No tenant set yet, so only validate tenant field
    (knowledgeBases.value.length > 0 && tempKbId.value) || // Tenant set, so validate KB selection
    (topics.value.length > 0 && tempTopicId.value)
  );
});

// Methods
const submitSelections = () => {
  if (!tenantPartitionKey.value && tempTenantKey.value.trim()) {
    tenantPartitionKey.value = tenant_partition_key || "kedar"
    // Don't reset tempTenantKey yet as we need it for the next step
  }

  if (tenantPartitionKey.value && tempKbId.value) {
    // Find the KB name for the selected ID
    const selectedKb = knowledgeBases.value.find(
      (kb) => kb._id === tempKbId.value
    );
    if (selectedKb) {
      selectedKbId.value = tempKbId.value;
      selectedKbName.value = selectedKb.kb_name;

      // Reset temporary values
      // tempTenantKey.value = ""
      tempKbId.value = "";
      tempTopicId.value = "";
      selectedTopicId.value = null;
      selectedTopicName.value = "";
      qaData.value = [];
      cachedPages.value = {};
      lastSeenIds.value = {};
      selectedIdsByPage.value = {};
      editedItems.value = {};
      Object.assign(editingContent, {
        itemId: null,
        field: null,
        text: "",
        originalText: "",
      });

      // Reset data states
      // resetState()

      // // Fetch first page of data
      // fetchData(1)
    }
  }

  if (selectedKbId.value && tempTopicId.value) {
    const selectedTopic = topics.value.find(
      (tp) => tp._id === tempTopicId.value
    );

    if (selectedTopic) {
      selectedTopicId.value = tempTopicId.value;
      selectedTopicName.value = selectedTopic.topic_name;

      tempTopicId.value = "";
      resetState();
      fetchData(1);
    }
  }
};

const changeSelections = () => {
  selectedKbId.value = null;
  selectedKbName.value = "";
  selectedTopicId.value = null;
  selectedTopicName.value = "";
  resetState();
};

const resetStateComplete = () => {
  qaData.value = [];
  cachedPages.value = {};
  lastSeenIds.value = {};
  selectedIdsByPage.value = {};
  editedItems.value = {};
  Object.assign(editingContent, {
    itemId: null,
    field: null,
    text: "",
    originalText: "",
  });
  knowledgeBases.value = [];
  topics.value = [];
  currentPage.value = 1;
  totalPages.value = 0;
  totalItems.value = 0;
  cacheTimestamp.value = null;
  selectedKbId.value = null;
  selectedKbName.value = "";
  tempTopicId.value = "";
  selectedTopicId.value = null;
  selectedTopicName.value = "";
  ques.value = [];
  validationMessage.value = "";
  isValidFile.value = false;
  saveMessage.value = "";
  saveSuccess.value = false;
  isSaving.value = false;
  editedItem.value = {
    _id: "",
    question: "",
    answer: "",
    createdAt: "",
    kb_id: "",
    topic_id: "",
    updatedAt: "",
    tenant_partition_key: "",
    __v: 0,
  };
  editedIndex.value = "";
  showCreateKbModal.value = false;
  newCreateKbName.value = "";
};


const resetState = () => {
  qaData.value = [];
  cachedPages.value = {};
  lastSeenIds.value = {};
  selectedIdsByPage.value = {};
  editedItems.value = {};
  Object.assign(editingContent, {
    itemId: null,
    field: null,
    text: "",
    originalText: "",
  });
  currentPage.value = 1;
  totalPages.value = 0;
  totalItems.value = 0;
  cacheTimestamp.value = null;
  ques.value = [];
  validationMessage.value = "";
  isValidFile.value = false;
  saveMessage.value = "";
  saveSuccess.value = false;
  isSaving.value = false;
  editedItem.value = {
    _id: "",
    question: "",
    answer: "",
    createdAt: "",
    kb_id: "",
    topic_id: "",
    updatedAt: "",
    tenant_partition_key: "",
    __v: 0,
  };
  editedIndex.value = "";
};

const downloadTemplate = () => {
  // Create sample data for the template
  const sampleData = [
    [
      { type: "string", value: "Question" },
      { type: "string", value: "Answer" },
    ],
    [
      { type: "string", value: "What is Vue.js?" },
      {
        type: "string",
        value:
          "Vue.js is a progressive JavaScript framework for building user interfaces.",
      },
    ],
    [
      { type: "string", value: "What is Excel?" },
      {
        type: "string",
        value: "Excel is a spreadsheet application developed by Microsoft.",
      },
    ],
    [
      { type: "string", value: "Sample Question 3" },
      { type: "string", value: "Sample Answer 3" },
    ],
  ];

  // Use zipcelx to create and download the Excel file
  const config = {
    filename: "qa_template",
    sheet: {
      data: sampleData,
    },
  };

  zipcelx(config);
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) {
    resetValidation();
    return;
  }

  validateAndParseFile(file);
};

const validateAndParseFile = (file) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Validate the file format
      if (!validateFileFormat(jsonData)) {
        return;
      }

      // Parse the data
      parseQuestionsAndAnswers(jsonData);
    } catch (error) {
      validationMessage.value = "Error reading file: " + error.message;
      isValidFile.value = false;
      ques.value = [];
    }
  };

  reader.readAsArrayBuffer(file);
};

const validateFileFormat = (data) => {
  // Check if file has data
  if (!data || data.length < 2) {
    validationMessage.value =
      "File must contain at least a header row and one data row.";
    isValidFile.value = false;
    ques.value = [];
    return false;
  }

  // Check if header row exists and has correct columns
  const headers = data[0];
  if (!headers || headers.length < 2) {
    validationMessage.value = "File must have at least 2 columns.";
    isValidFile.value = false;
    ques.value = [];
    return false;
  }

  // Check if headers match expected format (case-insensitive)
  const expectedHeaders = ["question", "answer"];
  const actualHeaders = headers
    .slice(0, 2)
    .map((h) => (h || "").toString().toLowerCase().trim());

  const headersMatch = expectedHeaders.every(
    (expected, index) => actualHeaders[index] === expected
  );

  if (!headersMatch) {
    validationMessage.value = `Headers must be "Question" and "Answer". Found: "${headers[0]}" and "${headers[1]}"`;
    isValidFile.value = false;
    ques.value = [];
    return false;
  }

  return true;
};

const parseQuestionsAndAnswers = (data) => {
  const parsedQues = [];

  // Skip header row (index 0) and process data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.length === 0 || (!row[0] && !row[1])) {
      continue;
    }

    const question = (row[0] || "").toString().trim();
    const answer = (row[1] || "").toString().trim();

    // Only add rows that have both question and answer
    if (question && answer) {
      parsedQues.push({
        que: question,
        ans: answer,
      });
    }
  }

  if (parsedQues.length === 0) {
    validationMessage.value =
      "No valid question-answer pairs found. Make sure both columns have data.";
    isValidFile.value = false;
    ques.value = [];
    return;
  }

  ques.value = parsedQues;
  previewPage.value = 1;
  validationMessage.value = `Successfully loaded ${parsedQues.length} question-answer pairs.`;
  isValidFile.value = true;

  // Clear any previous save messages
  saveMessage.value = "";
};

const resetValidation = () => {
  ques.value = [];
  validationMessage.value = "";
  isValidFile.value = false;
  saveMessage.value = "";
};

const saveToBackend = async () => {
  if (ques.value.length === 0) return;

  isSaving.value = true;
  saveMessage.value = "";

  try {
    const payload = {
      kb_id: selectedKbId.value,
      topic_id: selectedTopicId.value,
      ques: ques.value.map((pair) => ({
        que: pair.que.trim(),
        ans: pair.ans.trim(),
      })),
    };
    // Replace this URL with your actual backend endpoint
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/v1/api/qapairs",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify(payload),
    //   }
    // );
    const response = await axios.post("/v1/api/qapairs",payload, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    // const newKbData = await response.data;
    let responseOK = response.status === 200;
    if (responseOK) {
      saveMessage.value = `Successfully saved ${ques.value.length} question-answer pairs to the backend.`;
      saveSuccess.value = true;
      loading.value = true;
      refreshData();
      loading.value = false;
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    saveMessage.value = `Error saving to backend: ${error.message}`;
    saveSuccess.value = false;
  } finally {
    isSaving.value = false;
  }
};

const fetchTopics = async () => {
  if (!selectedKbId.value) return;
  loading.value = true;
  try {
    // const response = await fetch(
    //   `http://localhost:8090/scriptus/notebook/v1/api/qapairs/topic?kb_id=${selectedKbId.value}`,
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //   }
    // );
    // if (!response.ok) {
    //   throw new Error(`Error: ${response.status} - ${response.statusText}`);
    // }

    // const data = await response.json();
    const response = await axios.get(`/v1/api/qapairs/topic?kb_id=${selectedKbId.value}`, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const data = await response.data;
    topics.value = data.result || [];
    console.log(topics.value);

    if (topics.value.length === 0) {
      showStatus(
        `No topics found for knowledgebase ${selectedKbName.value}`,
        "info"
      );
    }
  } catch (error) {
    console.error("Error fetching topics:", error);
    showStatus("Failed to load topics: " + error.message, "error");
    knowledgeBases.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchKnowledgeBases = async () => {
  if (!tenantPartitionKey.value) return;

  loading.value = true;

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/v1/api/qapairs/kb",
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //   }
    // );
    // console.log(`response : ${JSON.stringify(response)}`);
    // if (!response.ok) {
    //   throw new Error(`Error: ${response.status} - ${response.statusText}`);
    // }
    // const data = await response.json();

    const response = await axios.get("/v1/api/qapairs/kb", {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const data = await response.data;

    knowledgeBases.value = data.result || [];

    if (knowledgeBases.value.length === 0) {
      showStatus("No knowledge bases found for this tenant", "info");
    }
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    console.log(`response : ${JSON.stringify(response)}`);
    showStatus("Failed to load knowledge bases: " + error.message, "error");
    knowledgeBases.value = [];
  } finally {
    loading.value = false;
  }
};

// Load data from cache or fetch from server
const loadPageData = async (pageNum) => {
  if (!tenantPartitionKey.value || !selectedKbId.value) return;

  // If page exists in cache, use it
  if (cachedPages.value[pageNum]) {
    qaData.value = cachedPages.value[pageNum];
    // Initialize selection array for this page if needed
    if (!selectedIdsByPage.value[pageNum]) {
      selectedIdsByPage.value[pageNum] = [];
    }
    return;
  }

  // Otherwise, fetch from server
  await fetchData(pageNum);
};

// Refresh all data (clear cache and fetch first page)
const refreshData = () => {
  resetState();
  qaTableOptions.value.page = 1;
  fetchData(1);
  showStatus("Data refreshed", "success");
};

const fetchData = async (pageNum) => {
  if (!tenantPartitionKey.value || !selectedKbId.value) return;

  loading.value = true;

  try {
    // let url = `http://localhost:8090/scriptus/notebook/v1/api/qapairs/mongodb?page=${pageNum}&pageSize=${pageSize.value}&kb_id=${selectedKbId.value}&topic_id=${selectedTopicId.value}`;
    let url = `/v1/api/qapairs/mongodb?page=${pageNum}&pageSize=${pageSize.value}&kb_id=${selectedKbId.value}&topic_id=${selectedTopicId.value}`;
    // Add lastSeenId parameter for pages beyond the first page
    if (pageNum > 1 && lastSeenIds.value[pageNum - 1]) {
      url += `&lastSeenId=${lastSeenIds.value[pageNum - 1]}`;
    }

    // const response = await fetch(url, {
    //   method: "GET",
    //   headers: {
    //     "Content-Type": "application/json",
    //     tnt: tenantPartitionKey.value,
    //   },
    // });

    // if (!response.ok) {
    //   throw new Error(`Error: ${response.status} - ${response.statusText}`);
    // }

    // const data = await response.json();
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const data = await response.data;
    // Update the current data
    qaData.value = data.data;
    console.log(`qaData : `, qaData.value);
    totalPages.value = parseInt(data.totalPages);
    totalItems.value = parseInt(data.total);

    // Cache the retrieved data
    cachedPages.value[pageNum] = data.data;

    // Initialize selection array for this page if needed
    if (!selectedIdsByPage.value[pageNum]) {
      selectedIdsByPage.value[pageNum] = [];
    }

    // Update the lastSeenId for pagination
    if (qaData.value.length > 0) {
      lastSeenIds.value[pageNum] = qaData.value[qaData.value.length - 1]._id;
    }

    // Update cache timestamp
    cacheTimestamp.value = new Date();
  } catch (error) {
    console.error("Error fetching QA pairs:", error);
    qaData.value = [];
    showStatus("Failed to load data: " + error.message, "error");
  } finally {
    loading.value = false;
  }
};

const toggleSelectAll = () => {
  if (!selectedIdsByPage.value[currentPage.value]) {
    selectedIdsByPage.value[currentPage.value] = [];
  }

  if (allSelected.value) {
    selectedIdsByPage.value[currentPage.value] = [];
  } else {
    selectedIdsByPage.value[currentPage.value] = qaData.value.map(
      (item) => item._id
    );
  }
};

const showDelKbModal = () => {
  showKbDeleteModal.value = true;
};

const confirmDeleteSelected = () => {
  if (getSelectedCount() > 0) {
    showDeleteModal.value = true;
  }
};

const cancelDeleteKb = () => {
  showKbDeleteModal.value = false;
};

const cancelDelete = () => {
  showDeleteModal.value = false;
};
const showDelTopicModal = () => {
  showTopicDeleteModal.value = true;
};
const cancelDeleteTopic = () => {
  showTopicDeleteModal.value = false;
};
// Get all selected IDs across all pages
const getAllSelectedIds = () => {
  let allSelectedIds = [];
  for (const pageNum in selectedIdsByPage.value) {
    allSelectedIds = [...allSelectedIds, ...selectedIdsByPage.value[pageNum]];
  }
  return allSelectedIds;
};

// Get total count of selected items
const getSelectedCount = () => {
  return getAllSelectedIds().length;
};

const deleteKnowledgeBase = async () => {
  
  loading.value = true;
  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/v1/api/qapairs/kb",
    //   {
    //     method: "DELETE",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       kb_id: selectedKbId.value,
    //       kb_name: selectedKbName.value,
    //     }),
    //   }
    // );
    // if (!response.ok) {
    //   throw new Error(`Error: ${response.status} - ${response.statusText}`);
    // }

    // const data = await response.json();
    const response = await axios.delete("/v1/api/qapairs/kb",{
        kb_id : selectedKbId.value,
        kb_name : selectedKbName.value
      }, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      },
    });
    const data = await response.data;
    console.log(`response del: ${JSON.stringify(data)}`);

    // Show success message
    showStatus(
      `Successfully deleted ${selectedKbName.value} knowledge base`,
      "success"
    );

    // Clear cache and reload data
    resetStateComplete();
    qaTableOptions.value.page = 1;
  } catch (error) {
    console.error("Error deleting records:", error);
    showStatus("Failed to delete records: " + error.message, "error");
  } finally {
    cancelDeleteKb();
    loading.value = false;
  }
};

const deleteSelected = async () => {
  showDeleteModal.value = false;
  loading.value = true;
  const selectedIds = getAllSelectedIds();

  try {
    // const url = `http://localhost:8090/scriptus/notebook/v1/api/qapairs`;
    const url = "/v1/api/qapairs";
    // const response = await fetch(url, {
    //   method: "DELETE",
    //   headers: {
    //     "Content-Type": "application/json",
    //     tnt: tenantPartitionKey.value,
    //   },
    //   body: JSON.stringify({
    //     kb_id: selectedKbId.value,
    //     topic_id: selectedTopicId.value,
    //     del_ids: selectedIds,
    //   }),
    // });

    // if (!response.ok) {
    //   throw new Error(`Error: ${response.status} - ${response.statusText}`);
    // }

    // const data = await response.json();
    const response = await axios.delete(url,{
        kb_id: selectedKbId.value,
        topic_id: selectedTopicId.value,
        del_ids: selectedIds,
      }, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const data = await response.data;
    console.log(`response del: ${JSON.stringify(data)}`);

    // Show success message
    showStatus(`Successfully deleted ${selectedIds.length} item(s)`, "success");

    // Clear cache and reload data
    resetState();
    fetchData(1);
  } catch (error) {
    console.error("Error deleting records:", error);
    showStatus("Failed to delete records: " + error.message, "error");
  } finally {
    loading.value = false;
  }
};

const showStatus = (message, type = "info") => {
  statusMessage.value = message;
  statusType.value = type;

  // Clear any existing timeout
  if (statusTimeout.value) {
    clearTimeout(statusTimeout.value);
  }

  // Auto-clear success and info messages after 5 seconds
  if (type !== "error") {
    statusTimeout.value = setTimeout(() => {
      clearStatus();
    }, 5000);
  }
};

const clearStatus = () => {
  statusMessage.value = "";
  if (statusTimeout.value) {
    clearTimeout(statusTimeout.value);
    statusTimeout.value = null;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
    qaTableOptions.value.page += 1;
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
    qaTableOptions.value.page -= 1;
  }
};

// Format cache status message
const getCacheStatus = () => {
  const pagesCount = Object.keys(cachedPages.value).length;
  let timeAgo = "";

  if (cacheTimestamp.value) {
    const seconds = Math.floor((new Date() - cacheTimestamp.value) / 1000);
    if (seconds < 60) {
      timeAgo = `${seconds} seconds ago`;
    } else if (seconds < 3600) {
      timeAgo = `${Math.floor(seconds / 60)} minutes ago`;
    } else {
      timeAgo = `${Math.floor(seconds / 3600)} hours ago`;
    }
  }

  return `${pagesCount} page(s) cached ${timeAgo}`;
};

// Start editing a cell
const startEditing = (itemId, field) => {
  // Get the current item from the data
  const item = qaData.value.find((item) => item._id === itemId);
  if (!item) return;

  // Set up the editing state
  Object.assign(editingContent, {
    itemId: itemId,
    field: field,
    text: item[field],
    originalText: item[field],
  });

  // Focus the textarea after Vue updates the DOM
  nextTick(() => {
    if (editTextarea.value) {
      const textarea = Array.isArray(editTextarea.value)
        ? editTextarea.value[0]
        : editTextarea.value;

      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }
  });
};

// Complete editing and save changes
const finishEditing = (itemId, field) => {
  // Make sure we're editing this item and field
  if (editingContent.itemId !== itemId || editingContent.field !== field) {
    return;
  }

  const newText = editingContent.text.trim();
  const originalText = editingContent.originalText.trim();

  // Only update if content changed
  if (newText !== originalText) {
    // Find item in the current data and update it
    const item = qaData.value.find((item) => item._id === itemId);
    if (item) {
      item[field] = newText;

      // Update the item in cache as well
      Object.values(cachedPages.value).forEach((pageData) => {
        const cachedItem = pageData.find((i) => i._id === itemId);
        if (cachedItem) {
          cachedItem[field] = newText;
        }
      });

      // Track this item as edited
      if (!editedItems.value[itemId]) {
        editedItems.value[itemId] = {
          _id: itemId,
          question: item.question,
          answer: item.answer,
          kb_id: selectedKbId.value, // Add the KB ID for the update API
        };
      } else {
        editedItems.value[itemId][field] = newText;
      }
    }
  }

  // Clear editing state
  Object.assign(editingContent, {
    itemId: null,
    field: null,
    text: "",
    originalText: "",
  });
};
const close = () => {
  // setTimeout(() => {
  editedItem.value = Object.assign({}, defaultItem);
  editedIndex.value = "";
  // }, 150)
};
const save = () => {
  // Update the item in cache as well
  // console.log(`cached Pages : ${currentPage.value}`,cachedPages.value);
  // const pages = cachedPages.value;
  cachedPages.value[currentPage.value].forEach((faq) => {
    // console.log(`faq : `, faq);
    if (faq._id === editedIndex.value) {
      faq["question"] = editedItem.value.question;
      faq["answer"] = editedItem.value.answer;
      console.log("cache updated");
    } else {
      console.log("not updated");
    }
  });
  // Object.values().forEach((cachedCurrentPage) => {
  //   console.log(` cached page : `,cachedCurrentPage);
  // const cachedItem = cachedCurrentPage.find((i) => i._id === editedIndex.value);
  // if (cachedItem) {
  //   cachedItem[field] = newText;
  // }
  // if (cachedItem) {
  //   console.log(`cached item : ${JSON.stringify(cachedItem)}`);
  //   cachedItem["question"] = editedItem.value.question;
  //   cachedItem["answer"] = editedItem.value.answer;
  // } else {
  //   console.log(`cached item : ${JSON.stringify(cachedItem)}`);
  // }
  // });
  editedItems.value[editedIndex.value] = {
    _id: editedIndex.value,
    question: editedItem.value.question,
    answer: editedItem.value.answer,
    // kb_id: selectedKbId.value, // Add the KB ID for the update API
  };
  close();
};
const editItem = (item) => {
  console.log(`start edit item : `, item);
  editedIndex.value = item._id;
  editedItem.value = item;
};
// Check if we're currently editing a specific cell
const isEditingCell = (itemId, field) => {
  return editingContent.itemId === itemId && editingContent.field === field;
};

// Check if an item has been edited
const isItemEdited = (itemId) => {
  return !!editedItems.value[itemId];
};

// Get count of edited items
const getEditedCount = () => {
  return Object.keys(editedItems.value).length;
};

// Send all edited items to the update API
const updateEditedItems = async () => {
  if (getEditedCount() === 0) return;

  loading.value = true;
  const editedItemsArray = Object.values(editedItems.value);

  try {
    // const response = await fetch(
    //   "http://localhost:8090/scriptus/notebook/v1/api/qapairs",
    //   {
    //     method: "PATCH",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //     body: JSON.stringify({
    //       kb_id: selectedKbId.value,
    //       topic_id: selectedTopicId.value,
    //       updateDocs: editedItemsArray,
    //     }),
    //   }
    // );
      
    // if (!response.ok) {
    //   throw new Error(`Error: ${response.status} - ${response.statusText}`);
    // }

    // const data = await response.json();
    const response = await axios.patch("/v1/api/qapairs",{
          kb_id: selectedKbId.value,
          topic_id: selectedTopicId.value,
          updateDocs: editedItemsArray,
        }, {
      headers: {
        "Content-Type": "application/json",
        tnt: tenantPartitionKey.value,
      }
    });
    const data = await response.data;
    console.log(`Update response: ${JSON.stringify(data)}`);

    // Show success message
    showStatus(
      `Successfully updated ${editedItemsArray.length} item(s)`,
      "success"
    );

    // Clear edited items after successful update
    editedItems.value = {};
    refreshData();
  } catch (error) {
    console.error("Error updating records:", error);
    showStatus("Failed to update records: " + error.message, "error");
  } finally {
    loading.value = false;
  }
};
// Watchers
// Update qaData whenever the page changes
watch(
  currentPage,
  (newPage) => {
    if (tenantPartitionKey.value && selectedKbId.value) {
      loadPageData(newPage);
    }
  },
  { immediate: true }
);

// Fetch knowledge bases when tenant key is set
watch(
  tenantPartitionKey,
  (newValue) => {
    if (newValue) {
      fetchKnowledgeBases();
    }
  },
  { immediate: true }
);

watch(
  selectedKbId,
  (newValue) => {
    if (newValue) {
      fetchTopics();
    }
  },
  { immediate: true }
);
const previewPageCount = computed(() => {
  return Math.ceil(ques.value.length / previewItemsPerPage.value);
});
</script>
<template>
  <v-container fluid class="qa-table-container">
    <v-row>
      <v-col cols="12">
        <v-card elevation="0">
          <v-card-title class="text-h4 pa-4"> FAQ's </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- Selection Status Messages -->
    <!-- <v-row v-if="!tenantPartitionKey || !selectedKbId || !selectedTopicId">
      <v-col cols="12">
        <v-alert
          v-if="!tenantPartitionKey"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Tenant is not selected
        </v-alert>
        <v-alert
          v-else-if="!selectedKbId"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Knowledge base is not selected
        </v-alert>
        <v-alert
          v-else-if="!selectedTopicId"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Topic is not selected
        </v-alert>
      </v-col>
    </v-row> -->

    <!-- Tenant and KB Display & Change Option -->
    <v-row v-if="tenantPartitionKey">
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-chip color="primary" variant="outlined" class="mb-2">
                  Current Tenant: <strong>{{ tenantPartitionKey }}</strong>
                </v-chip>
              </v-col>
            </v-row>
            <v-row v-if="tenantPartitionKey">
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="mb-4">
                  <v-btn
                    @click="openCreateKbModal"
                    color="primary"
                    class="my-2 mx-1"
                  >
                    Add Knowledge base
                  </v-btn>
                  <v-btn
                    @click="showDelKbModal"
                    color="error"
                    variant="outlined"
                    class="my-2 mx-1"
                    v-if="selectedKbId"
                  >
                    Delete Knowledge base
                  </v-btn>
                  <v-card-text>
                    <v-form @submit.prevent="submitSelections">
                      <v-row
                        v-if="tenantPartitionKey && knowledgeBases.length > 0"
                      >
                        <v-col cols="12">
                          <v-chip
                            v-if="selectedKbId"
                            color="success"
                            variant="outlined"
                            class="mb-2"
                          >
                            Selected Knowledge base: {{ selectedKbName }}
                          </v-chip>
                          <v-select
                            v-model="tempKbId"
                            :items="knowledgeBases"
                            item-title="kb_name"
                            item-value="_id"
                            label="Knowledge Base"
                            placeholder="Select a knowledge base"
                            required
                            outlined
                            dense
                          ></v-select>
                        </v-col>
                      </v-row>
                      <v-btn
                        type="submit"
                        color="primary"
                        :disabled="!isFormValid"
                        class="mt-2"
                      >
                        Select Knowledge Base
                      </v-btn>
                    </v-form>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="6" v-if="selectedKbId">
                <v-card variant="outlined" class="mb-4">
                  <v-btn
                    @click="openCreateTopicModal"
                    color="primary"
                    class="my-2 mx-1"
                  >
                    Add Topic
                  </v-btn>
                  <v-btn
                    @click="showDelTopicModal"
                    color="error"
                    variant="outlined"
                    class="my-2 mx-1"
                    v-if="selectedTopicId"
                  >
                    Delete Topic
                  </v-btn>
                  <v-card-text>
                    <v-form @submit.prevent="submitSelections">
                      <v-row v-if="selectedKbId && topics.length > 0">
                        <v-col cols="12">
                          <v-chip
                            v-if="selectedTopicId"
                            color="success"
                            variant="outlined"
                            class="mb-2"
                          >
                            Selected Topic: {{ selectedTopicName }}
                          </v-chip>
                          <v-select
                            v-model="tempTopicId"
                            :items="topics"
                            item-title="topic_name"
                            item-value="_id"
                            label="Select Topic"
                            placeholder="Select a Topic from knowledge base"
                            required
                            outlined
                            dense
                          ></v-select>
                        </v-col>
                      </v-row>
                      <v-btn
                        v-if="topics.length > 0"
                        type="submit"
                        color="primary"
                        :disabled="!isFormValid"
                        class="mt-2"
                      >
                        Select Topic
                      </v-btn>
                      <v-chip v-else
                        >No topics in {{ selectedKbName }}. Please add some
                        topics to proceed</v-chip
                      >
                    </v-form>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-card-actions>
                  <v-btn
                    v-if="selectedKbId && selectedTopicId"
                    @click="refreshData"
                    color="primary"
                    variant="outlined"
                  >
                    Refresh Data
                  </v-btn>
                  <v-btn
                    v-if="selectedKbId && selectedTopicId"
                    @click="updateEditedItems"
                    color="success"
                    :disabled="getEditedCount() === 0"
                    class="ml-2"
                  >
                    Update {{ getEditedCount() }} Edited Item(s)
                  </v-btn>
                </v-card-actions>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          class="mb-4"
        ></v-progress-circular>
        <p class="text-h6">Loading data...</p>
      </v-col>
    </v-row>

    <!-- Excel QA Manager -->
    <v-row v-if="selectedKbId && selectedTopicId">
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-title class="text-h5">
            Question & Answer Excel Upload
          </v-card-title>
          <v-card-text>
            <!-- Download Template Button -->
            <v-row class="mb-4">
              <v-col cols="12">
                <v-btn
                  @click="downloadTemplate"
                  color="blue"
                  variant="outlined"
                >
                  Download Sample Template
                </v-btn>
              </v-col>
            </v-row>

            <!-- Upload Excel File -->
            <v-row class="mb-4">
              <v-col cols="12">
                <v-file-input
                  ref="fileInput"
                  @change="handleFileUpload"
                  accept=".xlsx,.xls"
                  label="Upload Excel File"
                  outlined
                  dense
                  show-size
                ></v-file-input>
              </v-col>
            </v-row>

            <!-- Validation Messages -->
            <v-row v-if="validationMessage" class="mb-4">
              <v-col cols="12">
                <v-alert
                  :type="isValidFile ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ validationMessage }}
                </v-alert>
              </v-col>
            </v-row>

            <!-- Preview of Questions and Answers -->
            <v-row v-if="ques.length > 0" class="mb-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title class="text-h6">
                    Preview ({{ ques.length }} items)
                  </v-card-title>
                  <v-card-text>
                    <div class="max-h-60 overflow-y-auto">
                      <VDataTable
                        v-model:page="previewPage"
                        :headers="previewHeaders"
                        :items="ques"
                        :items-per-page="previewItemsPerPage"
                      >
                        <template v-slot:top>
                          <v-text-field
                            :model-value="previewItemsPerPage"
                            class="pa-2"
                            label="Items per page"
                            min="-1"
                            type="number"
                            hide-details
                            @update:model-value="
                              previewItemsPerPage = parseInt($event, 10)
                            "
                          ></v-text-field>
                        </template>

                        <template v-slot:bottom>
                          <div class="text-center pt-2">
                            <VPagination
                              v-model="previewPage"
                              :length="previewPageCount"
                            ></VPagination>
                          </div>
                        </template>
                      </VDataTable>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Save Button -->
            <v-row v-if="ques.length > 0" class="mb-4">
              <v-col cols="12">
                <v-btn
                  @click="saveToBackend"
                  :color="ques.length > 0 && !isSaving ? 'success' : 'grey'"
                  :disabled="ques.length === 0 || isSaving"
                  :loading="isSaving"
                >
                  {{ isSaving ? "Saving..." : "Save" }}
                </v-btn>
              </v-col>
            </v-row>

            <!-- Save Status -->
            <v-row v-if="saveMessage" class="mb-4">
              <v-col cols="12">
                <v-alert
                  :type="saveSuccess ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ saveMessage }}
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Actions Bar -->
    <v-row
      v-if="
        !loading &&
        tenantPartitionKey &&
        selectedKbId &&
        selectedTopicId &&
        qaData.length > 0
      "
    >
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="6">
                <v-chip
                  :color="getSelectedCount() === 0 ? 'grey' : 'primary'"
                  variant="outlined"
                >
                  <span v-if="getSelectedCount() === 0">No items selected</span>
                  <span v-else>{{ getSelectedCount() }} item(s) selected</span>
                </v-chip>
              </v-col>
              <v-col cols="12" md="6" class="text-right">
                <v-btn
                  @click="confirmDeleteSelected"
                  color="error"
                  variant="outlined"
                  :disabled="getSelectedCount() === 0"
                  class="mr-2"
                >
                  Delete Selected
                </v-btn>
                <v-btn
                  @click="toggleSelectAll"
                  color="secondary"
                  variant="outlined"
                >
                  {{ allSelected ? "Unselect All" : "Select All" }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Data Table -->
    <v-row
      v-if="
        !loading &&
        tenantPartitionKey &&
        selectedKbId &&
        selectedTopicId &&
        qaData.length > 0
      "
    >
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="12" class="d-flex align-center">
                <h2 class="text-h6 mr-4">Select all in this page</h2>
                <v-checkbox
                  id="selectAll"
                  :model-value="allSelected"
                  @update:model-value="toggleSelectAll"
                  hide-details
                ></v-checkbox>
              </v-col>
            </v-row>

            <VDataTable
              :headers="qaTableHeaders"
              :items="qaData"
              :items-per-page="qaTableItemsPerPage"
            >
              <template #item.question="{ item }">
                <v-textarea
                  v-model="editedItem.question"
                  :auto-grow="true"
                  v-if="item.raw._id === editedItem._id"
                ></v-textarea>
                <span v-else>{{ item.raw.question }}</span>
              </template>
              <template #item.answer="{ item }">
                <v-textarea
                  v-model="editedItem.answer"
                  :auto-grow="true"
                  v-if="item.raw._id === editedItem._id"
                ></v-textarea>
                <span v-else>{{ item.raw.answer }}</span>
              </template>
              <template #item.actions="{ item }">
                <div v-if="item.raw._id === editedItem._id">
                  <v-icon
                    icon="mdi-window-close"
                    color="red"
                    class="mr-3"
                    @click="close"
                  ></v-icon>
                  <v-icon
                    icon="mdi-content-save"
                    color="green"
                    @click="save"
                  ></v-icon>
                </div>
                <div v-else style="display: flex; align-items: center;">
                  <v-icon
                    icon="mdi-pencil"
                    @click="editItem(item.raw)"
                  ></v-icon>
                  <v-checkbox
                    :id="`item-${item.raw._id}`"
                    :value="item.raw._id"
                    v-model="selectedIdsByPage[currentPage]"
                    hide-details
                  ></v-checkbox>
                </div>
              </template>
              <template #bottom>
                <VDivider />
                <div
                  class="d-flex align-center justify-center justify-sm-space-between flex-wrap gap-3 pa-5 pt-3"
                >
                  <p class="text-sm text-disabled mb-0">
                    {{ paginationMeta(qaTableOptions, totalItems) }}
                  </p>
                  <div class="d-flex align-center justify-center gap-3">
                    <VBtn
                      :disabled="qaTableOptions.page <= 1"
                      variant="tonal"
                      color="default"
                      @click="previousPage"
                    >
                      Previous
                    </VBtn>
                    <VBtn
                      :disabled="qaTableOptions.page >= Math.ceil(totalPages)"
                      variant="tonal"
                      color="default"
                      @click="nextPage"
                    >
                      Next
                    </VBtn>
                  </div>
                </div>
              </template>
            </VDataTable>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Data Message -->
    <v-row
      v-if="
        !loading && tenantPartitionKey && selectedKbId && qaData.length === 0
      "
    >
      <v-col cols="12" class="text-center">
        <v-card>
          <v-card-text>
            <v-icon size="64" color="grey" class="mb-4"
              >mdi-database-off</v-icon
            >
            <p class="text-h6">
              No QA pairs data available. Please check your selections and try
              again.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Delete Confirmation Modal -->
    <v-dialog v-model="showDeleteModal" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5">Confirm Delete</v-card-title>
        <v-card-text>
          <p class="mb-4">
            Are you sure you want to delete {{ getSelectedCount() }} selected
            item(s)?
          </p>
          <v-alert type="warning" variant="tonal">
            This action cannot be undone.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="cancelDelete">
            Cancel
          </v-btn>
          <v-btn color="error" @click="deleteSelected"> Delete </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Knowledgebase Confirmation Modal -->
    <v-dialog v-model="showKbDeleteModal" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5">Confirm Delete</v-card-title>
        <v-card-text>
          <p class="mb-4">
            Are you sure you want to delete entirety of
            {{ selectedKbName }} Knowledge base
          </p>
          <v-alert type="warning" variant="tonal">
            This action cannot be undone.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="cancelDeleteKb">
            Cancel
          </v-btn>
          <v-btn color="error" @click="deleteKnowledgeBase"> Delete </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Delete Topic Confirmation Modal -->
    <v-dialog v-model="showTopicDeleteModal" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5">Confirm Delete</v-card-title>
        <v-card-text>
          <p class="mb-4">
            Are you sure you want to delete entirety of
            {{ selectedTopicName }} topic
          </p>
          <v-alert type="warning" variant="tonal">
            This action cannot be undone.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="cancelDeleteTopic">
            Cancel
          </v-btn>
          <v-btn color="error" @click="deleteTopic"> Delete </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Create Knowledge Base Modal -->
    <v-dialog v-model="showCreateKbModal" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5">Create Knowledge Base</v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newCreateKbName"
                  label="Knowledge Base Name"
                  outlined
                  dense
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <div v-if="!isKbNameValid">
          <p>invalid kb name error : {{ kbNameError }}</p>
        </div>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="closeKbModal">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="createKnowledgeBase"
            :disabled="!newCreateKbName || newCreateKbName.trim().length === 0"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Create Topic Modal -->
    <v-dialog v-model="showCreateTopicModal" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5"
          >Create Topic in {{ selectedKbName }} knowledgebase</v-card-title
        >
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="newCreateTopicName"
                  label="Topic Name"
                  outlined
                  dense
                  required
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <div v-if="!isTopicNameValid">
          <p>invalid kb name error : {{ topicNameError }}</p>
        </div>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-1" text @click="closeTopicModal">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="createTopic"
            :disabled="
              !newCreateTopicName || newCreateTopicName.trim().length === 0
            "
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Status Messages -->
    <div
      v-if="statusMessage"
      :class="['status-message', 'status-' + statusType]"
    >
      {{ statusMessage }}
      <button @click="clearStatus" class="status-close">&times;</button>
    </div>
  </v-container>
</template>
<style lang="scss">
.qa-table-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  color: #333;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.title {
  font-size: 28px;
  margin-bottom: 24px;
  color: #2c3e50;
  text-align: center;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 16px;
}

/* Selection Form Styles */
.selection-form-container {
  max-width: 500px;
  margin: 40px auto;
  padding: 24px;
  background-color: #f8f9fa;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selection-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #495057;
}

.form-input {
  color: black;
  padding: 12px 16px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  outline: none;
}

/* Selection Status */
.selection-status {
  max-width: 500px;
  margin: 40px auto;
  text-align: center;
}

.status-alert {
  padding: 16px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 6px;
  margin-bottom: 12px;
  border-left: 4px solid #dc3545;
}

/* Button Styles */
.btn {
  padding: 10px 18px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:active {
  transform: translateY(1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #e9ecef;
  color: #495057;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #dee2e6;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
}

.btn-success {
  background-color: #2ecc71;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #27ae60;
}

.btn-pagination {
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
  padding: 8px 14px;
}

.btn-pagination:hover:not(:disabled) {
  background-color: #e9ecef;
}

/* Selection Info Styles */
.selection-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #3498db;
}

.current-selections {
  display: flex;
  align-items: center;
  gap: 20px;
}

.selection-item {
  margin-right: 16px;
}

.data-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cache-info {
  font-size: 14px;
  color: #6c757d;
  background-color: #e9ecef;
  padding: 4px 10px;
  border-radius: 12px;
}

/* Actions Bar */
.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.bulk-actions {
  display: flex;
  gap: 10px;
}

/* Loading Styles */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #6c757d;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Table Styles */
.table-wrapper {
  margin-top: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.data-info {
  color: #6c757d;
  font-size: 14px;
}

.table-responsive {
  overflow-x: auto;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.qa-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 6px;
  overflow: hidden;
}

.qa-table th,
.qa-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.qa-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
  z-index: 1;
}

.checkbox-col {
  width: 50px;
  text-align: center;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.qa-table th:nth-child(2) {
  width: 40%;
}

.qa-table tr:last-child td {
  border-bottom: none;
}

.qa-table tr:hover {
  background-color: #f8f9fa;
}

.qa-table tr.edited-row {
  background-color: #d4edff;
}

.qa-table tr.edited-row:hover {
  background-color: #c2e5ff;
}

.qa-table td {
  position: relative;
  cursor: pointer;
}

.qa-table td.editing {
  padding: 0;
  cursor: auto;
}

.edit-container {
  height: 100%;
  width: 100%;
}

.edit-input {
  width: 100%;
  height: 100%;
  min-height: 100px;
  padding: 12px;
  border: 2px solid #3498db;
  resize: vertical;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.5;
}

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 8px;
  border-top: 1px solid #e9ecef;
}

.pagination-info {
  color: #6c757d;
}

.pagination-controls {
  display: flex;
  gap: 12px;
}

/* No Data Message */
.no-data {
  text-align: center;
  padding: 40px 0;
  color: #6c757d;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-top: 24px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #2c3e50;
}

.delete-warning {
  color: #e74c3c;
  font-weight: 500;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

/* Status Message */
.status-message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 300px;
  max-width: 500px;
  z-index: 90;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-info {
  background-color: #3498db;
  color: white;
}

.status-success {
  background-color: #2ecc71;
  color: white;
}

.status-error {
  background-color: #e74c3c;
  color: white;
}

.status-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 0 0 10px;
  margin-left: 10px;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .qa-table-container {
    padding: 15px;
  }

  .title {
    font-size: 24px;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  .tenant-info {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .current-tenant {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .data-controls {
    width: 100%;
    justify-content: space-between;
  }

  .actions-bar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .bulk-actions {
    width: 100%;
    justify-content: space-between;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .qa-table th,
  .qa-table td {
    padding: 12px 8px;
    font-size: 14px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .pagination-controls {
    width: 100%;
    justify-content: space-between;
  }

  .status-message {
    min-width: auto;
    max-width: 90%;
    left: 5%;
    right: 5%;
  }

  .form-input,
  .btn {
    font-size: 14px;
    padding: 10px 14px;
  }
}

@media (max-width: 480px) {
  .qa-table-container {
    padding: 10px;
  }

  .title {
    font-size: 20px;
  }

  .checkbox-col {
    width: 30px;
  }

  .checkbox {
    width: 16px;
    height: 16px;
  }

  .qa-table th,
  .qa-table td {
    padding: 10px 6px;
    font-size: 13px;
  }

  .btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .tenant-form-container {
    padding: 15px;
  }

  .modal-content {
    padding: 16px;
  }
  .excel-qa-manager {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }
}
</style>
