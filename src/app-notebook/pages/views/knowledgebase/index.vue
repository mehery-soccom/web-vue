<template>
  <div id="knowledge-base-manager">
    <h2>Knowledge Base Management</h2>

    <div class="input-group">
      <label for="tenantKey">Tenant Partition Key:</label>
      <input type="text" id="tenantKey" v-model.trim="tenantPartitionKey" @input="handleTenantKeyInput" placeholder="Enter Tenant Key">
    </div>

    <div v-if="tenantPartitionKeyIsSet">
      <hr>
      <div class="create-kb-section">
        <h3>Create New Knowledge Base Rules</h3>
        <p>Only "_" special character is allowed</p>
        <p>No blank spaces in knowledgebase name</p>
        <p v-if="kbNameError" class="error-message">{{ kbNameError }}</p>
        <p v-if="!isKbNameValid && newKbName.length" class="error-message">
          Invalid characters. Only letters, numbers, and underscores (_) are allowed. No leading/trailing spaces.
        </p>
      </div>

      <hr>
      <!-- <div class="kb-table-section">
        <h3>Existing Knowledge Bases</h3>
        <button @click="fetchKnowledgeBases" :disabled="loadingKbs">
          {{ loadingKbs ? 'Loading...' : 'Refresh Knowledge Bases' }}
        </button>
        <p v-if="fetchError" class="error-message">{{ fetchError }}</p>
        <table v-if="knowledgeBases.length > 0">
          <thead>
            <tr>
              <th>Knowledge Base Name</th>
              <th>Number of Entities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="kb in knowledgeBases" :key="kb._id">
              <td>{{ kb.kb_name }}</td>
              <td>{{ kb.count !== undefined ? kb.count : 'N/A' }}</td>
              <td>
                <button @click="deleteKnowledgeBase(kb._id, kb.kb_name)" class="delete-btn">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="!loadingKbs && !fetchError">No knowledge bases found. Create one above or check your Tenant Key.</p>
      </div> -->
      <div class="kb-table-section">
        <h3>Existing Knowledge Bases</h3>
        <button @click="fetchKnowledgeBases" :disabled="loadingKbs">
          {{ loadingKbs ? 'Loading...' : 'Refresh Knowledge Bases' }}
        </button>
        <p v-if="fetchError" class="error-message">{{ fetchError }}</p>
        <table v-if="knowledgeBases.length > 0 || true">
          <thead>
            <tr>
              <th>Knowledge Base Name</th>
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
                  v-model="newKbName" 
                  placeholder="Create Knowledge Base" 
                  class="create-kb-input"
                  @input="validateKbName"
                  @keyup.enter="createKnowledgeBase"
                />
              </td>
              <td>
                <button @click="createKnowledgeBase" class="add-btn border" :disabled="!newKbName || newKbName.trim() === ''">
                  Add Knowledge Base
                </button>
              </td>
            </tr>
            <!-- Existing knowledge bases -->
            <tr v-for="kb in knowledgeBases" :key="kb._id">
              <td>{{ kb.kb_name }}</td>
              <td>{{ kb.count !== undefined ? kb.count : 'N/A' }}</td>
              <td>
                <button @click="deleteKnowledgeBase(kb._id, kb.kb_name)" class="delete-btn">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="!loadingKbs && !fetchError">No knowledge bases found. Create one above or check your Tenant Key.</p>
      </div>
    </div>
    <div v-else>
      <p>Please enter the Tenant Partition Key to manage knowledge bases.</p>
    </div>

    <p v-if="apiMessage" :class="{'success-message': apiSuccess, 'error-message': !apiSuccess }">{{ apiMessage }}</p>
  </div>
</template>

<script>
export default {
  name: 'KnowledgeBaseManager',
  data() {
    return {
      tenantPartitionKey: '',
      tenantPartitionKeyIsSet: false,
      newKbName: '',
      kbNameError: '',
      isKbNameValid: false,
      knowledgeBases: [],
      loadingKbs: false,
      fetchError: null,
      apiMessage: '',
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
    }
  },
  methods: {
    handleTenantKeyInput() {
      // This method is called on input, watcher handles the logic
    },
    validateKbName() {
      this.kbNameError = '';
      let nameToTest = this.newKbName;

      // No leading/trailing white spaces (handled by v-model.trim implicitly on submit, but good for visual feedback)
      // For validation, we explicitly trim
      nameToTest = nameToTest.trim();

      if (nameToTest !== this.newKbName && this.newKbName.length > 0) {
          // This condition means there were spaces at the start or end
          // We can let the user know or just silently trim.
          // For now, we will proceed with the trimmed value for validation.
      }


      if (!nameToTest) {
        this.isKbNameValid = false;
        return;
      }

      // Check for allowed characters (alphanumeric and underscore)
      if (!this.allowedKbNameRegex.test(nameToTest)) {
        this.isKbNameValid = false;
        this.kbNameError = 'Invalid characters. Only letters, numbers, and underscores (_) are allowed.';
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
             this.kbNameError = `Invalid characters: ${foundBanned.join(', ')}. Only letters, numbers, and underscores (_) are allowed. No spaces.`;
        }

      } else {
        this.isKbNameValid = true;
      }
    },
    async createKnowledgeBase() {
      const trimmedKbName = this.newKbName.trim();
      if (!this.isKbNameValid || !trimmedKbName) {
        this.kbNameError = 'Knowledge base name is invalid or empty after trimming.';
        return;
      }

      this.clearApiMessage();
      console.log('Attempting to create KB:', trimmedKbName);

      // --- Placeholder for actual API call to create KB ---
      // For now, we'll simulate a successful creation and add to the local list.
      // Replace this with your actual `Workspace` or `axios` call.
      try {
        const response = await fetch('http://localhost:8090/nexus/notebook/api/qapairs/kb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'tnt': this.tenantPartitionKey,
          },
          body: JSON.stringify({ kb_name: trimmedKbName }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create knowledge base');
        }
        const newKbData = await response.json();
         // Assuming backend returns the new KB object
        this.knowledgeBases.push(newKbData);
        this.newKbName = ''; // Clear input
        this.isKbNameValid = false;
        this.setApiMessage(newKbData.message, newKbData.success);
        this.fetchKnowledgeBases(); // Refresh list from backend
      } catch (error) {
        console.error('Error creating knowledge base:', error);
        this.setApiMessage(error.message || 'An error occurred while creating the KB.', false);
      }
    },
    async fetchKnowledgeBases() {
      if (!this.tenantPartitionKey) {
        this.fetchError = 'Tenant Partition Key is required to fetch knowledge bases.';
        this.knowledgeBases = [];
        return;
      }
      this.loadingKbs = true;
      this.fetchError = null;
      this.clearApiMessage();

      try {
        const response = await fetch(`http://localhost:8090/nexus/notebook/api/qapairs/kb?isDetailed=true`, { // Replace with your actual API URL
          method: 'GET',
          headers: {
            'tnt': this.tenantPartitionKey,
          },
        });

        if (!response.ok) {
          let errorMsg = `Error fetching knowledge bases: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
          } catch (e) { /* Ignore if response is not JSON */ }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        if (data && data.result) {
          this.knowledgeBases = data.result.map(kb => ({
            ...kb,
            count: kb.count !== undefined ? parseInt(kb.count, 10) : 'N/A' // Ensure count is a number or N/A
          }));
        } else {
          this.knowledgeBases = [];
          this.fetchError = 'Received unexpected data format from server.';
        }
      } catch (error) {
        console.error('Fetch KBs error:', error);
        this.fetchError = error.message || 'Failed to fetch knowledge bases.';
        this.knowledgeBases = []; // Clear KBs on error
      } finally {
        this.loadingKbs = false;
      }
    },
    async deleteKnowledgeBase(kbId, kbName) {
      if (!this.tenantPartitionKey) {
        this.setApiMessage('Tenant Partition Key is missing.', false);
        return;
      }
      if (!confirm(`Are you sure you want to delete the knowledge base "${kbName}"?`)) {
        return;
      }

      this.clearApiMessage();
      console.log(`Attempting to delete KB ID: ${kbId}, Name: ${kbName}`);

      try {
        const response = await fetch(`http://localhost:8090/nexus/notebook/api/qapairs/kb`, { // Replace with your actual API URL
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'tnt': this.tenantPartitionKey,
          },
          body: JSON.stringify({ kb_id: kbId, kb_name: kbName }),
        });

        const responseData = await response.json();

        if (responseData.success) {
          this.knowledgeBases = this.knowledgeBases.filter(kb => kb._id !== kbId);
          this.setApiMessage(`Knowledge base "${kbName}" deleted successfully. Children deleted: ${responseData.deleteChildren}, KB deleted: ${responseData.deleteKb}`, true);
          // Optionally, re-fetch the list if you want to be absolutely sure
          // this.fetchKnowledgeBases();
        } else {
          throw new Error(responseData.message || 'Failed to delete knowledge base.');
        }
      } catch (error) {
        console.error('Error deleting knowledge base:', error);
        this.setApiMessage(error.message || 'An error occurred while deleting the KB.', false);
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
        this.apiMessage = '';
        this.apiSuccess = false;
    }
  },
  mounted() {
    // If you want to pre-fill tenantPartitionKey from localStorage or elsewhere, do it here.
    // Example: this.tenantPartitionKey = localStorage.getItem('tenantKey') || '';
    // The watcher will then trigger fetchKnowledgeBases if a key is present.
  }
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

.create-kb-section, .kb-table-section {
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

th, td {
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
  background-color: #89595d;
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
.error-message.error-message { /* Specificity to override */
  color: red;
  font-size: 0.9em;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid red;
  background-color: #ffe6e6;
  border-radius: 4px;
}
</style>