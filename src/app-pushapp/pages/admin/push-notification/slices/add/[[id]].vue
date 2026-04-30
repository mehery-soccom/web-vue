<script setup>
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { useAppEngagements } from "@/app-pushapp/views/admin/app-engagements/useAppEngagements";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";
import FilterBuilder from "@app-pushapp/views/admin/app-engagements/FilterBuilder.vue";
import validateFilterStructure from "@/app-pushapp/utils/validateFilterStructure";
const { show } = inject("snackbar");

const route = useRoute();
const router = useRouter();
const pushNotificationStore = usePushNotificationStore();
const channelsStore = useChannelsStore();
const { clearCache } = useAppEngagements();
const ChannelList = ref([]);
const isLoading = ref(false);
const slice = reactive({
  name: null,
  channel_id: null,
  filter: null,
});
const formRef = ref();
const filterRef = ref(null);

const onCreate = async () => {
  let validationResult = await formRef.value?.validate();
  if (!validationResult?.valid) return;

  let filtervalid = await filterRef.value?.isValid();
  let filterStructureValid = true;
  try {
    validateFilterStructure(slice.filter, null, true, true);
  } catch (error) {
    filterStructureValid = false;
    show({ message: error.message, color: "error" });
  }
  if (!filtervalid || !filterStructureValid) return;

  try {
    isLoading.value = true;

    let payload = {
      ...slice,
    };
    await pushNotificationStore.createSlice(payload);

    clearCache("slice");

    show({ message: "Slice created successfully", color: "success" });

    router.push({ name: "admin-push-notification-slices-list" });
  } catch (error) {
    const apiErr = error.response.data;
    show({
      message:
        apiErr?.error?.message || apiErr?.message || "something went wrong",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  let channelsRes = await channelsStore
    .fetchChannels()
    .catch((error) => console.log("[slice] [add] fetchChannels", error));
  if (channelsRes.results) ChannelList.value = channelsRes.results;

  if (route.params.id) {
    pushNotificationStore
      .fetchSlice({ id: route.params.id })
      .then((response) => {
        const _slice = response.data.data;
        Object.assign(slice, {
          ...slice,
          ..._slice,
        });
      })
      .catch((error) => {
        const apiErr = error.response.data;
        show({
          message:
            apiErr?.error?.message || apiErr?.message || "something went wrong",
          color: "error",
        });
      });
  } else {
    slice.filter = {
      type: "group",
      conjunction: "and",
      children: [
        {
          type: "filter",
          filterType: null,
          field: null,
          operator: null,
          value: null,
          freqOperator: null,
          freqCount: null,
          freqPeriod: null,
        },
      ],
    };
  }
});
</script>

<template>
  <v-card>
    <v-card-item class="pb-0">
      <v-card-title
        >{{ route.params.id ? "View" : "Build" }} Slice</v-card-title
      >
      <v-card-subtitle
        >This slice can be used to send out Push Notifications</v-card-subtitle
      >
    </v-card-item>

    <VCardText>
      <VForm ref="formRef" class="my-4">
        <VRow>
          <VCol cols="12" md="4">
            <AppTextField
              v-model="slice.name"
              placeholder="Slice name"
              :rules="[requiredValidator]"
              prepend-inner-icon="mdi-text-box"
              :readonly="!!route.params.id"
            />
          </VCol>
          <VCol cols="12" md="4">
            <AppSelect
              v-model="slice.channel_id"
              :items="ChannelList"
              placeholder="Mobile App"
              item-title="channel_name"
              item-value="channel_id"
              :rules="[requiredValidator]"
              prepend-inner-icon="mdi-cellphone"
              :readonly="!!route.params.id"
            />
          </VCol>
        </VRow>
      </VForm>
      <FilterBuilder
        v-if="slice.filter"
        v-model="slice.filter"
        :ignoreEventfilterType="true"
        :ignoreSlicefilterType="true"
        :ignoreCohortfilterType="true"
        ref="filterRef"
        :readonly="!!route.params.id"
      />
    </VCardText>

    <VCardText class="d-flex gap-4">
      <VBtn v-if="!route.params.id" @click="onCreate" :disabled="isLoading">{{
        isLoading ? "loading..." : "Create"
      }}</VBtn>
      <VBtn
        variant="tonal"
        color="secondary"
        :to="{ name: 'admin-push-notification-slices-list' }"
      >
        Exit
      </VBtn>
    </VCardText>
  </v-card>
</template>

<style scoped lang="scss">
.template-form {
  height: inherit;
  overflow: scroll;
}
.text-style-toggle .v-btn {
  min-width: 56px;
  height: 36px;
}
.v-btn-group {
  height: 44px !important;
}
</style>
