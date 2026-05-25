<script setup>
import { ref, onMounted, computed, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSequenceStore } from '@app-pushapp/views/dashboards/sequence/useSequenceStore';
import draggable from 'vuedraggable';

const router = useRouter();
const store = useSequenceStore();
const { show } = inject("snackbar", () => {});

const requiredValidator = value => !!value || 'This field is required';

const isLoading = ref(false);
const isFetching = ref(false);
const refForm = ref();

const formData = ref({
  name: '',
  code: '',
  conversionWindowValue: 24,
  conversionWindowUnit: 'hr',
});

const sequenceSteps = ref([
  { id: Date.now() + 1, event_name: null },
  { id: Date.now() + 2, event_name: null }
]);

// Helper to format "add_to_cart" into "Add To Cart"
const formatEventName = (str) => {
  if (!str) return '';
  return str.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const availableEvents = computed(() => {
  return store.uniqueEvents.map(event => ({
    value: event,
    label: formatEventName(event)
  })).sort((a, b) => a.label.localeCompare(b.label));
});

watch(() => formData.value.name, (newName) => {
  if (newName) {
    formData.value.code = newName.trim().toLowerCase().replace(/\s+/g, '_');
  }
});

onMounted(async () => {
  isFetching.value = true;
  try {
    await store.fetchUniqueEvents();
  } catch (error) {
    show({ message: 'Failed to load events.', color: 'error' });
  } finally {
    isFetching.value = false;
  }
});

const addStep = () => {
  sequenceSteps.value.push({ id: Date.now(), event_name: null });
};

const removeStep = (index) => {
  sequenceSteps.value.splice(index, 1);
};

const handleSubmit = async () => {
  const { valid } = await refForm.value.validate();
  if (!valid) {
    show({ message: 'Please fill in all required fields.', color: 'error' });
    return;
  }

  const validSteps = sequenceSteps.value
    .map(step => step.event_name)
    .filter(name => !!name);

  if (validSteps.length < 2) {
    show({ message: 'A sequence must have at least 2 steps.', color: 'warning' });
    return;
  }

  isLoading.value = true;

  const payload = {
    name: formData.value.name,
    code: formData.value.code,
    conversionWindow: `${formData.value.conversionWindowValue}${formData.value.conversionWindowUnit === 'hr' ? 'h' : 'd'}`,
    steps: validSteps,
  };

  try {
    await store.createSequence(payload);
    show({ message: 'Sequence created successfully!', color: 'success' });
    router.push({ name: 'dashboards-sequence-index' });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to create sequence.';
    show({ message: errorMessage, color: 'error' });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div>
  <VRow class="justify-center">
    <VCol cols="12" md="8">
      <VCard :loading="isFetching" class="mb-4 pb-4">
        <VCardItem>
          <VCardTitle class="text-h5">Create Sequence Analytics</VCardTitle>
        </VCardItem>
      </VCard>

      <VForm ref="refForm" @submit.prevent="handleSubmit">
        <!-- Sequence Meta Details -->
        <VCard class="my-4">
          <VCardText>
            <VRow>
              <VCol cols="12" md="4">
                <AppTextField 
                  v-model="formData.name" 
                  label="Sequence Name *" 
                  :rules="[requiredValidator]" 
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <AppTextField 
                  v-model="formData.code" 
                  label="Sequence Code *" 
                  :rules="[requiredValidator]" 
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12" md="4">
                <VLabel class="mb-1 text-body-2 text-high-emphasis">Conversion Window *</VLabel>
                <div class="d-flex gap-1">
                  <AppTextField 
                    v-model="formData.conversionWindowValue" 
                    type="number"
                    placeholder="24"
                    :rules="[requiredValidator]" 
                    style="max-width: 120px;"
                  />
                  <VSelect
                    v-model="formData.conversionWindowUnit"
                    :items="['hr', 'd']"
                    variant="outlined"
                    style="max-width: 110px;"
                  />
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <h4 class="text-h6 mt-6 mb-2">Events Sequence</h4>
        
        <!-- Draggable Steps List -->
        <draggable
          v-model="sequenceSteps"
          tag="div"
          item-key="id"
          handle=".drag-handle"
          animation="200"
        >
          <template #item="{ element, index }">
            <VCard class="mb-3 border" variant="flat">
              <VCardText class="pa-4">
                <VRow align="center" dense>
                  <VCol cols="auto" class="d-flex align-center pr-4">
                    <VIcon class="drag-handle" style="cursor: move;" color="disabled">tabler-grip-vertical</VIcon>
                    <VAvatar color="primary" variant="tonal" size="32" class="ml-2 font-weight-bold">
                      {{ index + 1 }}
                    </VAvatar>
                  </VCol>
                  
                  <VCol class="px-2">
                    <VAutocomplete
                      v-model="element.event_name"
                      :items="availableEvents"
                      item-title="label"
                      item-value="value"
                      label="Select Event"
                      placeholder="Search for an event..."
                      :rules="[requiredValidator]"
                      variant="outlined"
                      density="comfortable"
                      hide-details="auto"
                    />
                  </VCol>

                  <VCol cols="auto" class="pl-2">
                    <VBtn 
                      icon="tabler-trash" 
                      variant="text" 
                      color="error" 
                      @click="removeStep(index)" 
                      :disabled="sequenceSteps.length <= 1"
                    />
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </template>
        </draggable>

        <!-- Actions -->
        <VRow class="mt-4">
          <VCol cols="12" class="d-flex gap-4">
            <VBtn 
              @click="addStep" 
              prepend-icon="tabler-plus" 
              variant="tonal"
              :disabled="sequenceSteps.length >= 5"
            >
              Add Event
            </VBtn>
            <VSpacer />
            <VBtn 
              color="secondary" 
              variant="tonal" 
              :to="{ name: 'dashboards-sequence-index' }"
            >
              Cancel
            </VBtn>
            <VBtn 
              type="submit" 
              color="primary" 
              :loading="isLoading"
            >
              Create Sequence
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</div>
</template>

<style scoped>
.drag-handle:hover {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>