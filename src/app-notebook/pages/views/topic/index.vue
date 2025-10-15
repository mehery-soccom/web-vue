<template>
  <div id="knowledge-base-manager">
    <h2>Knowledge Base Management</h2>

    <div class="input-group">
      <label for="tenantKey">Tenant Partition Key:</label>
      <input
        type="text"
        id="tenantKey"
        v-model.trim="tenantPartitionKey"
        @input="handleTenantKeyInput"
        placeholder="Enter Tenant Key"
      />
    </div>

    <div v-if="tenantPartitionKeyIsSet">
      <hr />
      <div class="kb-selection-container">
        <div class="form-group">
          <label for="kbSelect">Select Knowledge Base:</label>
          <div class="select-container">
            <select
              id="kbSelect"
              v-model="selectedKbId"
              class="form-select"
              @change="kbChanged"
            >
              <option value="" disabled>Select a knowledge base</option>
              <option
                v-for="kb in knowledgeBases"
                :key="kb._id"
                :value="kb._id"
              >
                {{ kb.kb_name }}
              </option>
            </select>
            <div v-if="loadingKbs" class="loading-spinner">Loading...</div>
          </div>
        </div>
      </div>
      <div class="create-tp-section">
        <h3>Create New Topic</h3>
        <div class="input-group">
          <label for="topicName">Knowledge Base Name: {{ selectedKbName }}</label>
          <!-- <input
            type="text"
            id="topicName"
            v-model="newTopicName"
            @input="validateTopicName"
            placeholder="e.g., my_documents_v1"
          /> -->
          <p>Only "_" special character is allowed</p>
          <p>No blank spaces in topic name</p>
          <!-- <button
            @click="createTopic"
            :disabled="!isTopicNameValid || !newTopicName.length"
          >
            Create
          </button> -->
        </div>
        <p v-if="TopicNameError" class="error-message">{{ TopicNameError }}</p>
        <p
          v-if="!isTopicNameValid && newTopicName.length"
          class="error-message"
        >
          Invalid characters. Only letters, numbers, and underscores (_) are
          allowed. No leading/trailing spaces.
        </p>
      </div>

      <hr />
      <div class="tp-table-section" v-if="kbSelected">
        <h3>Existing Topics</h3>
        <button @click="fetchTopics" :disabled="loadingKbs">
          {{ loadingKbs ? "Loading..." : "Refresh Topics" }}
        </button>
        <p v-if="fetchError" class="error-message">{{ fetchError }}</p>
        <!-- <table >
          <thead>
            <tr>
              <th>Topic Name</th>
              <th>Number of Entities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="topics.length > 0" v-for="tp in topics" :key="tp._id" >
              <td>{{ tp.topic_name }}</td>
              <td>{{ tp.count !== undefined ? tp.count : "N/A" }}</td>
              <td>
                <button
                  @click="deleteTopic(tp._id, tp.topic_name)"
                  class="delete-btn"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table> -->

        <table>
          <thead>
            <tr>
              <th>Topic Name</th>
              <th>Number of Entities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Special create row -->
            <tr class="create-row">
              <td colspan="2">
                <input
                  type="text"
                  v-model="newTopicName"
                  @input="validateTopicName"
                  placeholder="Create Topic"
                  class="create-topic-input"
                  @keyup.enter="createTopic"
                />
              </td>
              <td>
                <button
                  @click="createTopic"
                  class="add-btn"
                  :disabled="!newTopicName || newTopicName.trim() === ''"
                >
                  Add Topic
                </button>
              </td>
            </tr>
            <!-- Existing topics -->
            <tr v-for="tp in topics" :key="tp._id">
              <td>{{ tp.topic_name }}</td>
              <td>{{ tp.count !== undefined ? tp.count : "N/A" }}</td>
              <td>
                <button
                  @click="deleteTopic(tp._id, tp.topic_name)"
                  class="delete-btn"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- <p v-else-if="!loadingKbs && !fetchError">
          No topics found in {{ selectedKbName }}. Create one above or check your Tenant Key.
        </p> -->
      </div>
    </div>
    <div v-else>
      <p>Please enter the Tenant Partition Key to manage knowledge bases.</p>
    </div>

    <p
      v-if="apiMessage"
      :class="{ 'success-message': apiSuccess, 'error-message': !apiSuccess }"
    >
      {{ apiMessage }}
    </p>
  </div>
</template>

<script>
export default {
  name: "KnowledgeBaseManager",
  data() {
    return {
      tenantPartitionKey: "",
      tenantPartitionKeyIsSet: false,
      newTopicName: "",
      TopicNameError: "",
      isTopicNameValid: false,
      knowledgeBases: [],
      topics: [],
      selectedKbId: null,
      selectedKbName: "",
      kbSelected: false,
      loadingKbs: false,
      fetchError: null,
      apiMessage: "",
      apiSuccess: false,
      // As per instructions: "!,@,#,$,%,^,&,*,(,),[,],{,},:,;,',\",`,|,\,/,?,,,.,<,>"
      // Note: comma is listed twice, period is listed.
      // Regex will handle this more broadly.
      bannedKbNameCharsRegex: /[!@#$%^&*()\[\]{};:'"`|\\\/?,.<> ]/, // Includes space
      allowedKbNameRegex: /^[a-zA-Z0-9_]+$/,
    };
  },
  watch: {
    tenantPartitionKey(newValue) {
      this.tenantPartitionKeyIsSet = !!newValue;
      if (this.tenantPartitionKeyIsSet) {
        this.fetchKnowledgeBases();
      } else {
        this.knowledgeBases = []; // Clear KBs if tenant key is removed
        this.fetchError = null;
      }
    },
    selectedKbId(newValue) {
      this.kbSelected = !!newValue;
      if (this.kbSelected) {
        this.fetchTopics();
      } else {
        this.topics = [];
        this.fetchError = null;
      }
    },
  },
  methods: {
    kbChanged() {
      const selectedKb = this.knowledgeBases.find(
        (kb) => kb._id === this.selectedKbId
      );
      this.selectedKbName = selectedKb.kb_name;
    },
    handleTenantKeyInput() {
      // This method is called on input, watcher handles the logic
    },
    validateTopicName() {
      this.TopicNameError = "";
      let nameToTest = this.newTopicName;

      // No leading/trailing white spaces (handled by v-model.trim implicitly on submit, but good for visual feedback)
      // For validation, we explicitly trim
      nameToTest = nameToTest.trim();

      if (nameToTest !== this.newTopicName && this.newTopicName.length > 0) {
        // This condition means there were spaces at the start or end
        // We can let the user know or just silently trim.
        // For now, we will proceed with the trimmed value for validation.
      }

      if (!nameToTest) {
        this.isTopicNameValid = false;
        return;
      }

      // Check for allowed characters (alphanumeric and underscore)
      if (!this.allowedKbNameRegex.test(nameToTest)) {
        this.isTopicNameValid = false;
        this.TopicNameError =
          "Invalid characters. Only letters, numbers, and underscores (_) are allowed.";
        // More specific error based on banned characters:
        let foundBanned = [];
        for (const char of nameToTest) {
          if (!char.match(/[a-zA-Z0-9_]/)) {
            if (!foundBanned.includes(char)) {
              foundBanned.push(char);
            }
          }
        }
        if (foundBanned.length > 0) {
          this.TopicNameError = `Invalid characters: ${foundBanned.join(
            ", "
          )}. Only letters, numbers, and underscores (_) are allowed. No spaces.`;
        }
      } else {
        this.isTopicNameValid = true;
      }
    },
    async createTopic() {
      const trimmedTopicName = this.newTopicName.trim();
      if (!this.isTopicNameValid || !trimmedTopicName) {
        this.TopicNameError = "Topic name is invalid or empty after trimming.";
        return;
      }

      this.clearApiMessage();
      console.log("Attempting to create KB:", trimmedTopicName);

      // --- Placeholder for actual API call to create KB ---
      // For now, we'll simulate a successful creation and add to the local list.
      // Replace this with your actual `Workspace` or `axios` call.
      try {
        const response = await fetch(
          "http://localhost:8090/nexus/notebook/api/qapairs/topic",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              tnt: this.tenantPartitionKey,
            },
            body: JSON.stringify({
              topic_name: trimmedTopicName,
              kb_id: this.selectedKbId,
            }),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to create knowledge base"
          );
        }
        const newKbData = await response.json();
        console.log(`topic : ${JSON.stringify(newKbData)}`);
        // Assuming backend returns the new KB object
        // this.knowledgeBases.push(newKbData);
        const message = newKbData.result.message;
        const success = newKbData.result.success;
        console.log(`message : ${message}`);
        console.log(`success : ${success}`);
        this.newTopicName = ""; // Clear input
        this.isTopicNameValid = false;
        this.setApiMessage(message, success);
        this.fetchTopics(); // Refresh list from backend
      } catch (error) {
        console.error("Error creating knowledge base:", error);
        this.setApiMessage(
          error.message || "An error occurred while creating the KB.",
          false
        );
      }
    },
    async fetchTopics() {
      if (!this.selectedKbId) return;
      this.loadingKbs = true;
      try {
        const response = await fetch(
          `http://localhost:8090/scriptus/nexus/notebook/api/qapairs/topic?isDetailed=true&kb_id=${this.selectedKbId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              tnt: this.tenantPartitionKey,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        this.topics = data.result || [];
        console.log(this.topics);

        if (this.topics.length === 0) {
          this.showStatus("No knowledge bases found for this tenant", "info");
        }
      } catch (error) {
        console.error("Error fetching topics:", error);
        this.showStatus("Failed to load topics: " + error.message, "error");
        this.knowledgeBases = [];
      } finally {
        this.loadingKbs = false;
      }
    },
    async fetchKnowledgeBases() {
      if (!this.tenantPartitionKey) {
        this.fetchError =
          "Tenant Partition Key is required to fetch knowledge bases.";
        this.knowledgeBases = [];
        return;
      }
      this.loadingKbs = true;
      this.fetchError = null;
      this.clearApiMessage();

      try {
        const response = await fetch(
          `http://localhost:8090/scriptus/nexus/notebook/api/qapairs/kb?isDetailed=true`,
          {
            // Replace with your actual API URL
            method: "GET",
            headers: {
              tnt: this.tenantPartitionKey,
            },
          }
        );

        if (!response.ok) {
          let errorMsg = `Error fetching knowledge bases: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
          } catch (e) {
            /* Ignore if response is not JSON */
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        if (data && data.result) {
          this.knowledgeBases = data.result.map((kb) => ({
            ...kb,
            count: kb.count !== undefined ? parseInt(kb.count, 10) : "N/A", // Ensure count is a number or N/A
          }));
        } else {
          this.knowledgeBases = [];
          this.fetchError = "Received unexpected data format from server.";
        }
      } catch (error) {
        console.error("Fetch KBs error:", error);
        this.fetchError = error.message || "Failed to fetch knowledge bases.";
        this.knowledgeBases = []; // Clear KBs on error
      } finally {
        this.loadingKbs = false;
      }
    },
    async deleteTopic(topic_id, topic_name) {
      if (!this.tenantPartitionKey) {
        this.setApiMessage("Tenant Partition Key is missing.", false);
        return;
      }
      if (
        !confirm(
          `Are you sure you want to delete the knowledge base "${topic_name}"?`
        )
      ) {
        return;
      }

      this.clearApiMessage();
      console.log(
        `Attempting to delete topic ID: ${topic_id}, Name: ${topic_name}`
      );

      try {
        const response = await fetch(
          `http://localhost:8090/nexus/notebook/api/qapairs/topic`,
          {
            // Replace with your actual API URL
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              tnt: this.tenantPartitionKey,
            },
            body: JSON.stringify({
              topic_id: topic_id,
              topic_name: topic_name,
              kb_id: this.selectedKbId,
              kb_name: this.selectedKbName,
            }),
          }
        );

        const responseData = await response.json();

        if (responseData.success) {
          // this.knowledgeBases = this.knowledgeBases.filter(
          //   (kb) => kb._id !== kbId
          // );
          this.setApiMessage(
            `Topic "${topic_name}" deleted successfully`,
            true
          );
          // Optionally, re-fetch the list if you want to be absolutely sure
          // this.fetchKnowledgeBases();
        } else {
          throw new Error(
            responseData.message || "Failed to delete knowledge base."
          );
        }
      } catch (error) {
        console.error("Error deleting knowledge base:", error);
        this.setApiMessage(
          error.message || "An error occurred while deleting the KB.",
          false
        );
      }
    },
    setApiMessage(message, isSuccess) {
      this.apiMessage = message;
      this.apiSuccess = isSuccess;
      setTimeout(() => {
        this.clearApiMessage();
      }, 5000); // Clear message after 5 seconds
    },
    clearApiMessage() {
      this.apiMessage = "";
      this.apiSuccess = false;
    },
  },
  mounted() {
    // If you want to pre-fill tenantPartitionKey from localStorage or elsewhere, do it here.
    // Example: this.tenantPartitionKey = localStorage.getItem('tenantKey') || '';
    // The watcher will then trigger fetchKnowledgeBases if a key is present.
  },
};
</script>

<style scoped>
#knowledge-base-manager {
  font-family: sans-serif;
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input-group input[type="text"],
.input-group button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 8px;
  font-size: 1rem;
}

.input-group input[type="text"] {
  width: calc(100% - 100px); /* Adjust width as needed */
}

.input-group button {
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.input-group button:hover {
  background-color: #0056b3;
}

.input-group button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

hr {
  margin: 25px 0;
  border: 0;
  border-top: 1px solid #eee;
}

.create-tp-section,
.tp-table-section {
  margin-bottom: 20px;
}

h3 {
  margin-top: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

th,
td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

th {
  background-color: #f7f7f7;
  font-weight: bold;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.add-btn {
  background-color: #8f474e;
  color: white;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: #c82333;
}

.error-message {
  color: red;
  font-size: 0.9em;
  margin-top: 5px;
}
.success-message {
  color: green;
  font-size: 0.9em;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid green;
  background-color: #e6ffe6;
  border-radius: 4px;
}
/* Overwrite error-message style for API messages when it's an error */
.error-message.error-message {
  /* Specificity to override */
  color: red;
  font-size: 0.9em;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid red;
  background-color: #ffe6e6;
  border-radius: 4px;
}
</style>
