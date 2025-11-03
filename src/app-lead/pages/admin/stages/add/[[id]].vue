<script setup>
import { ref, onMounted, inject, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStagesStore } from '@/app-lead/views/admin/stages/useStagesStore';

const requiredValidator = value => !!value || 'This field is required';

const { show } = inject('snackbar');
const route = useRoute();
const router = useRouter();
const stagesStore = useStagesStore();

const PARAM_ID = route.params.id;
const isEditMode = computed(() => PARAM_ID && PARAM_ID !== 'add');

const isLoading = ref(false);
const formRef = ref(null);

const stageData = ref({
  title: '',
  code: '',
  desc: '',
  probability: 40,
});

const fetchStage = async id => {
  isLoading.value = true;
  try {
    const response = await stagesStore.fetchStages(); 
    const stageToEdit = response.data.find(stage => stage._id === id);
    if (stageToEdit) {
      stageData.value = {
        ...stageToEdit,
        probability: Number(stageToEdit.probability || 0),
      };
    } else {
      throw new Error('Stage not found in the list');
    }
  } catch (error) {
    console.error(error);
    show({ message: 'Failed to fetch stage data.', color: 'error' });
    router.push({ name: 'admin-stages-list' });
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (isEditMode.value) {
    fetchStage(PARAM_ID);
  }
});

watch(() => stageData.value.title, (newTitle) => {
  if (newTitle && !isEditMode.value) {
    stageData.value.code = newTitle.trim().toLowerCase().replace(/\s+/g, '_');
  }
});

const submitForm = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  isLoading.value = true;
  
  const payload = {
    ...stageData.value,
    probability: String(stageData.value.probability),
    byUser: window.CONST?.USER?.user,
  };

  try {
    if (isEditMode.value) {
      await stagesStore.updateStage({ id: PARAM_ID, data: payload });
      show({ message: 'Stage updated successfully', color: 'success' });
    } else {
      await stagesStore.createStage({ payload });
      show({ message: 'Stage created successfully', color: 'success' });
    }
    router.push({ name: 'admin-stages-list' });
  } catch (error) {
    console.error(error);
    const action = isEditMode.value ? 'update' : 'create';
    show({ message: `Failed to ${action} stage.`, color: 'error' });
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
            <VCard :title="isEditMode ? 'Edit Stage' : 'Create New Stage'">
              <VCardText>
                <VRow>
                  <VCol cols="12" md="6">
                    <AppTextField
                      v-model="stageData.title"
                      label="Stage Title"
                      :rules="[requiredValidator]"
                    />
                  </VCol>

                  <VCol cols="12" md="6">
                    <AppTextField
                      v-model="stageData.code"
                      label="Stage Code"
                      :rules="[requiredValidator]"
                      :disabled="isEditMode"
                    />
                  </VCol>

                  <VCol cols="12">
                    <AppTextField
                      v-model="stageData.desc"
                      label="Description"
                      placeholder="Enter a short description for this stage"
                      rows="2"
                    />
                  </VCol>

                  <VCol cols="12">
                    <VSlider
                      v-model="stageData.probability"
                      label="Probability"
                      :step="5"
                      thumb-label
                      color="primary"
                    >
                      <template #append>
                        <div class="font-weight-medium" style="width: 40px;">
                          {{ stageData.probability }}%
                        </div>
                      </template>
                    </VSlider>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </VCol>

          <VCol cols="12" class="d-flex gap-4">
            <VBtn type="submit" :loading="isLoading">
              {{ isEditMode ? 'Update Stage' : 'Create Stage' }}
            </VBtn>
            <VBtn
              color="secondary"
              variant="tonal"
              :to="{ name: 'admin-stages-list' }"
            >
              Cancel
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</template>

