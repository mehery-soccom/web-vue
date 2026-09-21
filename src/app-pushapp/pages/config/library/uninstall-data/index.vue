<script setup>
import { useConfigStore } from "@/app-pushapp/views/config/useConfigStore";
import {
  requiredValidator,
  integerValidator,
} from "@app-pushapp/@core/utils/validators";

const { show } = inject("snackbar");
const configStore = useConfigStore();

const loading = ref(false);
const formRef = ref();

const form = reactive({
  inactiveDays: 7,
  uninstallDays: 14,
});
const formCopy = reactive({
  inactiveDays: 7,
  uninstallDays: 14,
});

const disableSave = computed(
  () => JSON.stringify(form) === JSON.stringify(formCopy)
);

const positiveValidator = (value) =>
  Number(value) > 0 || "Must be a positive number";

const applyData = (data = {}) => {
  form.inactiveDays = data.inactiveDays ?? 7;
  form.uninstallDays = data.uninstallDays ?? 14;
  Object.assign(formCopy, { ...form });
};

async function fetchConfig() {
  try {
    loading.value = true;
    const res = await configStore.fetchSilentLifecycle();
    applyData(res.data?.data);
  } catch (error) {
    const { data = {} } = error?.response || {};
    show({
      message: data.statusMessage || data.message || "Failed to load",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  const validationResult = await formRef.value.validate();
  if (!validationResult.valid) return;

  try {
    loading.value = true;
    const res = await configStore.updateSilentLifecycle({
      inactiveDays: Number(form.inactiveDays),
      uninstallDays: Number(form.uninstallDays),
    });
    applyData(res.data?.data);
    show({ message: "Your changes have been saved.", color: "success" });
  } catch (error) {
    const { data = {} } = error?.response || {};
    show({
      message: data.statusMessage || data.message || "Failed to Save",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchConfig();
});
</script>

<template>
  <VCard flat class="editor-container">
    <VCardText class="d-flex align-center flex-wrap gap-4 pb-0">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          variant="tonal"
          color="secondary"
          :to="{ name: 'config-library-list' }"
        >
          Exit
        </VBtn>

        <VBtn
          color="primary"
          :loading="loading"
          :disabled="disableSave"
          @click="save"
        >
          Save Changes <VIcon end icon="mdi-file-cloud" />
        </VBtn>
      </div>
    </VCardText>

    <VCardText>
      <VForm ref="formRef">
        <VRow>
          <VCol cols="12" md="4">
            <AppTextField
              v-model="form.inactiveDays"
              type="number"
              label="Inactive Days"
              hint="Days of silence before device is marked INACTIVE"
              persistent-hint
              :rules="[requiredValidator, integerValidator, positiveValidator]"
            />
          </VCol>
          <VCol cols="12" md="4">
            <AppTextField
              v-model="form.uninstallDays"
              type="number"
              label="Uninstall Days"
              hint="Days of silence before device is marked UNINSTALLED"
              persistent-hint
              :rules="[requiredValidator, integerValidator, positiveValidator]"
            />
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>
</template>
