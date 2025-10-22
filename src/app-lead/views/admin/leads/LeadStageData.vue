<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useStagesStore } from '@/app-lead/views/admin/stages/useStagesStore';
import { useLeadsStore } from '@/app-lead/views/admin/leads/useLeadsStore';

const props = defineProps({
  currentStageId: {
    type: String,
    required: true,
  },
  leadId: {
    type: String,
    required: true,
  }
});

const emit = defineEmits(['stage-updated']);

const stagesStore = useStagesStore();
const leadsStore = useLeadsStore();
const { show } = inject("snackbar");

const allStages = ref([]);
const isLoading = ref(true); 
const isUpdating = ref(false);

const stageForm = ref({
  selectedStageId: props.currentStageId,
});

const originalStageId = ref(props.currentStageId);

onMounted(async () => {
  try {
    const response = await stagesStore.fetchStages();
    allStages.value = response.data || [];
  } catch (error) {
    show({ message: 'Could not load stages data.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
});

watch(() => props.currentStageId, (newId) => {
  stageForm.value.selectedStageId = newId;
  originalStageId.value = newId;
});

const sortedStages = computed(() => {
  if (!allStages.value) return [];
  return [...allStages.value].sort((a, b) => Number(a.probability) - Number(b.probability));
});

const currentStageIndex = computed(() => {
  return sortedStages.value.findIndex(stage => stage._id === props.currentStageId);
});

const selectedStageDetails = computed(() => {
  return allStages.value.find(stage => stage._id === stageForm.value.selectedStageId);
});

const probability = computed(() => {
  return selectedStageDetails.value ? selectedStageDetails.value.probability : 'N/A';
});

const isFormEdited = computed(() => {
  return stageForm.value.selectedStageId !== originalStageId.value;
});


const handleCancel = () => {
  stageForm.value.selectedStageId = originalStageId.value;
};

const handleSubmit = async () => {
  if (!isFormEdited.value) return;

  isUpdating.value = true;
  try {
    const payload = {
      leadStage: stageForm.value.selectedStageId,
    };
    await leadsStore.updateLead({ id: props.leadId, data: payload });
    show({ message: 'Lead stage updated successfully!', color: 'success' });
    
    emit('stage-updated');

  } catch (error) {
    show({ message: 'Failed to update lead stage.', color: 'error' });
  } finally {
    isUpdating.value = false;
  }
};
</script>

<template>
  <VCard border elevation="2">
    <VCardText>
      <p class="text-h6 mb-4">Lead Progress</p>
      <div v-if="!isLoading && sortedStages.length">
        <VTimeline
          direction="horizontal"
          side="end"
          truncate-line="both"
        >
          <VTimelineItem
            v-for="(stage, index) in sortedStages"
            :key="stage._id"
            :dot-color="index <= currentStageIndex ? 'primary' : 'grey-lighten-1'"
            size="small"
            fill-dot
          >
            <div class="text-center" :class="{ 'font-weight-bold text-primary': index === currentStageIndex }">
              <p class="mb-0 text-caption">{{ stage.title }}</p>
              <small class="text-disabled">{{ stage.probability }}%</small>
            </div>
          </VTimelineItem>
        </VTimeline>
      </div>
      <div v-else-if="isLoading" class="text-center">
        <VProgressCircular indeterminate />
      </div>

      <VDivider class="my-6" />

      <VForm @submit.prevent="handleSubmit">
        
        <VRow align="center">
          <VCol cols="12" md="4">
            <VLabel>Assigned Agent</VLabel>
          </VCol>
          <VCol cols="12" md="8">
            <AppTextField
              placeholder="-"
              disabled
            />
          </VCol>
        </VRow>

        <VRow align="center">
          <VCol cols="12" md="4">
            <VLabel>Stage</VLabel>
          </VCol>
          <VCol cols="12" md="8">
            <AppSelect
              v-model="stageForm.selectedStageId"
              :items="allStages"
              item-title="title"
              item-value="_id"
              placeholder="Select a new stage"
            />
          </VCol>
        </VRow>

        <VRow align="center">
          <VCol cols="12" md="4">
            <VLabel>Probability</VLabel>
          </VCol>
          <VCol cols="12" md="8">
            <AppTextField
              :model-value="probability"
              readonly
              suffix="%"
            />
          </VCol>
        </VRow>

        <VRow align="center">
          <VCol cols="12" md="4">
            <VLabel>Closing Date</VLabel>
          </VCol>
          <VCol cols="12" md="8">
            <AppTextField
              placeholder="-"
              disabled
            />
          </VCol>
        </VRow>

        <VRow>
          <VCol class="d-flex gap-4 mt-4">
            <VSpacer />
            <VBtn
              color="secondary"
              variant="tonal"
              :disabled="!isFormEdited"
              @click="handleCancel"
            >
              Cancel
            </VBtn>
            <VBtn
              type="submit"
              :loading="isUpdating"
              :disabled="!isFormEdited"
            >
              Update
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>
</template>

