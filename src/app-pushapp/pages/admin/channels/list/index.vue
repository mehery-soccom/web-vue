<script setup>
import { PLATFORM_COLORS } from "@app-pushapp/utils/constants";
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";

const { show } = inject("snackbar");
const channelsStore = useChannelsStore();
const isLoading = ref(false);
const channels = ref([]);
// const totalChannels = ref(0);
const headers = [
  {
    title: "App Name",
    key: "channel_name",
  },
  {
    title: "App ID",
    key: "channel_id",
  },
  {
    title: "Platform(s)",
    key: "platforms",
    sortable: false,
  },
  {
    title: "",
    key: "actions",
    sortable: false,
  },
];

onMounted(async () => {
  fetchChannels();
});

// 👉 Fetch Channels
const fetchChannels = () => {
  isLoading.value = true;
  channelsStore
    .fetchChannels()
    .then((response) => {
      channels.value = response.results;
      // totalChannels.value = response.data.total;
    })
    .catch((error) => {
      if (!error.response?.data?.error == "No channels found")
        show({ message: "Something went wrong", color: "error" });
      channels.value = [];
    })
    .finally(() => {
      isLoading.value = false;
    });
};

const deleteChannel = (id, dialogCloseRef) => {
  isLoading.value = true;
  channelsStore
    .deleteChannel({ id })
    .then(() => {
      fetchChannels();
      dialogCloseRef.value = false;
      show({ message: "Channel deleted successfully", color: "success" });
    })
    .catch((error) => {
      console.log(error);
      show({ message: "Something went wrong", color: "error" });
    })
    .finally(() => {
      isLoading.value = false;
    });
};
</script>

<template>
  <VCard v-if="channels" id="invoice-list">
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <!-- 👉 Create -->
        <VBtn prepend-icon="tabler-plus" :to="{ name: 'admin-channels-add' }">
          Create App
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable :headers="headers" :items="channels" :loading="isLoading">
      <!-- channel id -->
      <template #item.channel_name="{ item }">
        <RouterLink
          :to="{
            name: 'admin-channels-preview-id',
            params: { id: item.raw.channel_id },
          }"
        >
          {{ item.raw.channel_name }}
        </RouterLink>
      </template>

      <!-- platforms -->
      <template #item.platforms="{ item }">
        <div class="d-flex gap-2">
          <VChip
            v-for="p in item.raw.platforms"
            :key="p.platform_type"
            label
            :color="PLATFORM_COLORS[p.platform_type].color"
            class="font-weight-medium"
          >
            {{ PLATFORM_COLORS[p.platform_type].text }}
          </VChip>
        </div>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn>
          <VIcon icon="tabler-trash" />
          <v-dialog activator="parent" max-width="340">
            <template v-slot:default="{ isActive }">
              <v-card
                class=""
                prepend-icon="mdi-alert"
                text="Are you certain, you want to delete ?"
                title="Confirm"
              >
                <template v-slot:actions>
                  <v-btn
                    class="ml-auto"
                    text="Yes"
                    @click="deleteChannel(item.raw.channel_id, isActive)"
                  ></v-btn>
                  <v-btn
                    class="ml-auto"
                    text="No"
                    @click="isActive.value = false"
                  ></v-btn>
                </template>
              </v-card>
            </template>
          </v-dialog>
        </IconBtn>

        <IconBtn
          :to="{
            name: 'admin-channels-edit-id',
            params: { id: item.raw.channel_id },
          }"
        >
          <VIcon icon="mdi-pencil-outline" />
        </IconBtn>
      </template>
    </MyDataTable>
  </VCard>
</template>

<style lang="scss">
#invoice-list {
  .invoice-list-actions {
    inline-size: 8rem;
  }

  .invoice-list-filter {
    inline-size: 12rem;
  }
}
</style>
