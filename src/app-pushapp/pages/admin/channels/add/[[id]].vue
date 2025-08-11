<script setup>
import ChannelEditable from "@app-pushapp/views/admin/channels/ChannelEditable.vue";
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
const { show } = inject("snackbar");

const route = useRoute();
const PARAM_ID = route.params.id;

const router = useRouter();

const channelsStore = useChannelsStore();

const isLoading = ref(false);
const channelData = ref({
  platforms: [{ active: true }],
});
const formRef = ref();

onMounted(async () => {
  if (PARAM_ID) {
    channelsStore
      .fetchChannel({ id: PARAM_ID })
      .then((response) => {
        channelData.value = response.data.channel;
      })
      .catch((error) => {
        console.log(error);
        show({ message: "Failed to fetch Channel", color: "error" });
      });
  }
});

const onCreate = async () => {
  let validationResult = await formRef.value.validate();

  console.log("onCreate", validationResult.errors);

  if (!validationResult.valid) {
    return;
  }

  try {
    isLoading.value = true;
    let fileError = "";

    const formData = new FormData();
    formData.append("channel_name", channelData.value.channel_name);
    if(!!channelData.value.logo_url) formData.append("logo_url", channelData.value.logo_url || "");
    if (Array.isArray(channelData.value.logo_colors)) {
      formData.append('logo_colors', JSON.stringify(channelData.value.logo_colors));
    }
    channelData.value.platforms.map((p) => {
      if (!p.file)
        fileError = `${fileError ? fileError + ", " : ""}${p.platform_type}`;
      else formData.append(`${p.platform_type}_file`, p.file);

      formData.append(`${p.platform_type}_bundle_id`, p.bundle_id);

      if (p.platform_type === "ios") {
        formData.append(`key_id`, p.key_id);
        formData.append(`team_id`, p.team_id);
      }
    });

    if (fileError)
      return show({
        message: `${fileError} platform file missing`,
        color: "error",
      });

    await channelsStore.createChannel(formData);
    show({ message: "Channel created successfully", color: "success" });
    router.push({ name: "admin-channels-list" });
  } catch (error) {
    console.error(error);
    show({ message: "Failed to create Channel", color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const onUpdate = async () => {
  let validationResult = await formRef.value.validate();

  console.log("onUpdate", validationResult.errors);

  if (!validationResult.valid) {
    return;
  }

  try {
    isLoading.value = true;
    let fileError = "";

    const formData = new FormData();
    formData.append("user_id", "user123");
    formData.append("channel_name", channelData.value.channel_name);
    if(!!channelData.value.logo_url) formData.append("logo_url", channelData.value.logo_url || "");
    if (Array.isArray(channelData.value.logo_colors)) {
      formData.append('logo_colors', JSON.stringify(channelData.value.logo_colors));
    }
    channelData.value.platforms.map((p) => {
      if (p.platform_id) {
        console.log("onUpdate > existing platform file", p.platform_type);

        formData.append(`${p.platform_type}_file_path`, p.file_path);
        formData.append(`${p.platform_type}_active_status`, p.active);
      } else {
        console.log("onUpdate > new platform file", p.platform_type);

        if (!p.file)
          fileError = `${fileError ? fileError + ", " : ""}${p.platform_type}`;
        else formData.append(`${p.platform_type}_file`, p.file);
      }

      formData.append(`${p.platform_type}_bundle_id`, p.bundle_id);

      if (p.platform_type === "ios") {
        formData.append(`key_id`, p.key_id);
        formData.append(`team_id`, p.team_id);
      }
    });

    if (fileError)
      return show({
        message: `${fileError} platform file missing`,
        color: "error",
      });

    await channelsStore.updateChannel(channelData.value.channel_id, formData);
    show({ message: "Channel updated successfully", color: "success" });
    router.push({ name: "admin-channels-list" });
  } catch (error) {
    console.error(error);
    show({ message: "Failed to update Channel", color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const onUpdatePlatform = async ({ channel_id, platform_id }) => {
  try {
    isLoading.value = true;

    await channelsStore.updatePlatform(
      { channel_id, platform_id },
      { user_id: "user123" }
    );

    show({ message: "Platform updated successfully", color: "success" });
    router.push({ name: "admin-channels-list" });
  } catch (error) {
    console.error(error);
    show({ message: "Failed to update Platform", color: "error" });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <VRow>
    <VCol cols="12" md="9">
      <VForm ref="formRef">
        <VRow>
          <VCol cols="12">
            <ChannelEditable
              :data="channelData"
              @update-platform="onUpdatePlatform"
            />
          </VCol>
        </VRow>
        <VRow>
          <VCol cols="12" class="text-right">
            <div class="px-6">
              <VBtn
                @click="PARAM_ID ? onUpdate() : onCreate()"
                class="mr-3"
                :disabled="isLoading"
                >{{
                  isLoading ? "loading..." : PARAM_ID ? "Update" : "Create"
                }}</VBtn
              >
              <VBtn
                variant="tonal"
                color="secondary"
                :to="{ name: 'admin-channels-list' }"
              >
                Cancel
              </VBtn>
            </div>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</template>
