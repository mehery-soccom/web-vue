<script setup>
import ChannelPlatformEditable from "./ChannelPlatformEditable.vue";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";

const props = defineProps({
  mode: {
    type: String,
    required: true,
    default: "ADD",
  },
  data: {
    type: null,
    required: true,
    default: {},
  },
});

const emit = defineEmits(["fileUpload", "updatePlatform"]);

onMounted(async () => {});

const itemsOptions = (platform) => {
  return [
    {
      label: "Android",
      value: "android",
    },
    {
      label: "IOS",
      value: "ios",
    },
    {
      label: "Huawei",
      value: "huawei",
    },
  ].filter(
    (i) =>
      i.value === platform.platform_type ||
      !props.data.platforms.find((p) => i.value === p.platform_type)
  );
};

const addPlatform = () => {
  props.data.platforms.push({ active: true });
};

const removePlatform = (index) => {
  let channel_id = props.data.channel_id;
  let platform_id = props.data.platforms[index].platform_id;

  if (!platform_id) {
    if (props.data.platforms.length > 1) props.data.platforms.splice(index, 1);
  } else {
    emit("updatePlatform", { channel_id, platform_id });
  }
};

const handleFileUpload = (file, index) => {
  props.data.platforms[index].file = file;
};
</script>

<template>
  <VCard>
    <v-card-item>
      <v-card-title>App Details</v-card-title>
    </v-card-item>

    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <AppTextField
            v-model="data.channel_name"
            label="App Name"
            placeholder="Enter App Name"
            :rules="[requiredValidator]"
          />
        </VCol>
        <VCol cols="12" md="6" v-if="data.channel_id">
          <AppTextField v-model="data.channel_id" label="App ID" readonly />
        </VCol>
      </VRow>
    </VCardText>

    <VDivider />

    <v-card-item>
      <template #append>
        <VBtn
          size="38"
          @click="addPlatform"
          :disabled="props.data.platforms?.length >= 3"
        >
          <VIcon size="22" icon="tabler-plus" />
        </VBtn>
      </template>
      <v-card-title>Platform Details</v-card-title>
    </v-card-item>

    <VCardText class="add-products-form">
      <div
        v-for="(platform, index) in props.data.platforms"
        :key="'platform.' + index"
      >
        <ChannelPlatformEditable
          :index="index"
          :itemsOptions="itemsOptions(platform)"
          :mode="props.mode"
          :data="platform"
          @remove-platform="removePlatform"
          @fileUpload="handleFileUpload"
        />
      </div>
    </VCardText>
  </VCard>
</template>

<style scss>
.add-products-form > :not(:first-child) {
  margin-top: 1.5rem;
}
</style>
