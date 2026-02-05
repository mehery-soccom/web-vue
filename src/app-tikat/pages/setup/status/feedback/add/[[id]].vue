<script setup>
import { ref, onMounted, inject, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStatusStore } from '@/app-tikat/views/setup/status/useStatusStore';

const requiredValidator = value => !!value || 'This field is required';

const { show } = inject('snackbar');
const route = useRoute();
const router = useRouter();
const statusStore = useStatusStore();

const PARAM_ID = route.params.id;
const isEditMode = computed(() => PARAM_ID && PARAM_ID !== 'add');

const isLoading = ref(false);
const formRef = ref(null);

const statusData = ref({
  label: '',
  key: '',
  desc: '',
});

const fetchStatus = async id => {
  isLoading.value = true;
  try {
    const response = await statusStore.fetchStatuses(); 
    const list = response.results || [];
    const itemToEdit = list.find(item => item._id === id);
    
    if (itemToEdit) {
      statusData.value = {
        label: itemToEdit.label,
        key: itemToEdit.key,
        desc: itemToEdit.desc,
      };
    } else {
      throw new Error('Status not found');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch status data.'
    show({ message: errorMessage, color: 'error' });
    router.push({ name: 'setup-status-feedback-list' });
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (isEditMode.value) {
    fetchStatus(PARAM_ID);
  }
});

watch(() => statusData.value.label, (newLabel) => {
  if (newLabel && !isEditMode.value) {
    statusData.value.key = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
  }
});

const submitForm = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  isLoading.value = true;
  
  const payload = {
    ...statusData.value,
  };

  try {
    if (isEditMode.value) {
      await statusStore.updateStatus({ id: PARAM_ID }, payload);
      show({ message: 'Status updated successfully', color: 'success' });
    } else {
      await statusStore.createStatus(payload);
      show({ message: 'Status created successfully', color: 'success' });
    }
    router.push({ name: 'setup-status-feedback-list' });
  } catch (error) {
    const action = isEditMode.value ? 'update' : 'create';
    const errorMessage = error.response?.data?.message || error.message || `Failed to ${action} status.`
    show({ message: errorMessage, color: 'error' });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <VRow>
    <VCol cols="12" md="9">
      <VForm ref="formRef" @submit.prevent="submitForm">
        <VRow>
          <VCol cols="12">
            <VCard :title="isEditMode ? 'Edit Status' : 'Create New Status'">
              <VCardText>
                <VRow>
                  <VCol cols="12" md="6">
                    <AppTextField
                      v-model="statusData.label"
                      label="Status Label"
                      placeholder="e.g. In Progress"
                      :rules="[requiredValidator]"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <AppTextField
                      v-model="statusData.key"
                      label="Status Key"
                      placeholder="e.g. in_progress"
                      :rules="[requiredValidator]"
                      :disabled="isEditMode"
                    />
                  </VCol>

                  <VCol cols="12">
                    <AppTextField
                      v-model="statusData.desc"
                      label="Description"
                      placeholder="Enter a short description for this status"
                      rows="2"
                    />
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </VCol>

          <VCol cols="12" class="d-flex gap-4">
            <VBtn type="submit" :loading="isLoading">
              {{ isEditMode ? 'Update Status' : 'Create Status' }}
            </VBtn>
            
            <VBtn
              color="secondary"
              variant="tonal"
              :to="{ name: 'setup-status-feedback-list' }"
            >
              Cancel
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</template>