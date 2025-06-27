<script setup>
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
const { show } = inject("snackbar");

const pushNotificationStore = usePushNotificationStore();

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  label: {
    type: String,
  },
});

const emit = defineEmits(["update:modelValue"]);

/**
 * useAttrs() -  To forward unknown props and listeners
 * usage : v-bind="attrs"
 * Does Not Include :
 * 1. Props declared via defineProps() (you access those directly).
 * 2. Emits declared via defineEmits() (those are meant to be handled with emit()).
 */
const attrs = useAttrs();

/**
 * usage : v-bind="_props"
 */
const _props = computed(() => {
  const __props = { ...props };

  // console.log("__props", __props);
  return __props;
});

/**
 * usage : v-on="_listeners"
 */
const _listeners = computed(() => {
  const __listeners = Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key.startsWith("on"))
  );

  // console.log("__listeners", __listeners);
  return __listeners;
});

const uploading = ref(false);
const file = ref(null);
const url = ref(props.modelValue);

const handleFileUpload = async (event) => {
  document.activeElement?.blur();
  try {
    uploading.value = true;
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("docs", file);
    let res = await pushNotificationStore.uploadDoc(formData);
    url.value = res.data.remoteDetails.Location; // "https://cdn.pixabay.com/photo/2021/12/12/20/00/play-6865967_640.jpg"
  } catch (error) {
    console.error("handleFileUpload", error);
    show({
      message: "Failed to upload image. Please try again.",
      color: "error",
    });
  } finally {
    uploading.value = false;
    file.value = null;
  }
};

function clearUpload() {
  url.value = "";
}

watch(
  () => props.modelValue,
  (val) => {
    if (val !== url.value) url.value = val;
  }
);

watch(url, (val) => {
  emit("update:modelValue", val);
});
</script>

<template>
  <VRow no-gutters align="end">
    <VCol :cols="!url ? '12' : '11'">
      <VLabel class="mb-1 text-body-2 text-high-emphasis" :text="label" />
      <VFileInput
        v-if="!url"
        :loading="uploading"
        color="primary"
        variant="outlined"
        accept="image/*"
        @change="handleFileUpload"
        v-model="file"
        placeholder="Select a file"
        prepend-inner-icon="mdi-image"
        prepend-icon=""
      />
      <div v-else class="d-flex align-center ga-3">
        <VTextField
          v-model="url"
          variant="outlined"
          class="flex-grow-1"
          prepend-inner-icon="mdi-image"
          readonly
        />
      </div>
    </VCol>
    <VCol v-if="url" cols="1" class="d-flex align-center justify-end">
      <VBtn icon variant="text" @click="clearUpload">
        <VIcon>mdi-trash</VIcon>
      </VBtn>
    </VCol>
  </VRow>
</template>

<style lang="scss"></style>
