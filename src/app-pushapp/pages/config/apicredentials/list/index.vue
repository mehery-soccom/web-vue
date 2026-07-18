<script setup>
import { PLATFORM_COLORS } from "@app-pushapp/utils/constants";
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { useApiStore } from "@/app-pushapp/views/config/apicredentials/useApiStore";
import debounce from "lodash/debounce";

const { show } = inject("snackbar");
const channelsStore = useChannelsStore();
const apiStore = useApiStore();
const isLoading = ref(false);
const channels = ref([]);
const showDetailsDrawer = ref(false)
const drawerMode = ref("view");
const detailsLoading = ref(false)
const generatingKey = ref(false)

const appDetails = ref({
  name: "",
  app_id: "",
  app_secret: "",
  lane: ""
})
// const totalChannels = ref(0);
const headers = [
  {
    title: "App Name",
    key: "keyName",
  },
  {
    title: "Created by",
    key: "createdBy",
  },
  {
    title: "Created at",
    key: "createdStamp",
  },
  {
    title: "Actions",
    key: "actions",
    sortable: false,
  },
];

const pagination = reactive({
  itemsLength: 0,
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  multiSort: true,
  filters: {
    
  },
});

const onUpdateOptions = (options) => {
  pagination.itemsLength = options.itemsLength;
  pagination.page = options.page;
  pagination.itemsPerPage = options.itemsPerPage;
  pagination.sortBy = options.sortBy;
  pagination.filters = options.filters;

  fetchChannels({ ...pagination });
};
const onUpdateOptionsDebounced = debounce((options) => {
  onUpdateOptions(options);
}, 300);

onMounted(async () => {
  fetchChannels();
});

const openCreateDrawer = () => {
  drawerMode.value = "create";
  appDetails.value = {
    name: "",
    app_id: "",
    app_secret: "",
    lane: "",
  };
  showDetailsDrawer.value = true;
};

const createApp = async () => {
  isLoading.value = true;

  try {
    await apiStore.create(appDetails.value);
    show({ message: "App created successfully", color: "success" });
    showDetailsDrawer.value = false;
    fetchChannels();
  } catch (e) {
    show({ message: "Unable to create app", color: "error" });
  } finally {
    isLoading.value = false;
    console.log("app det", appDetails, appDetails.value)
  }
};
// 👉 Fetch Channels
const fetchChannels = (params) => {
  isLoading.value = true;
  apiStore.readAll(params)
    .then((response) => {
      channels.value = response.data.results;
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
  apiStore
    .delete({ id })
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

const viewAppDetails = async (id, name) => {
  drawerMode.value = "view";
  detailsLoading.value = true
  try {
  //   const response = await apiStore.getApiCreds({id})
  //   const resp = response.data.data;
    appDetails.value = {
      name: name,
      app_id: id,
      app_secret: "**********",
    }
    showDetailsDrawer.value = true
  }
  catch (e) {
    show({ message: "Unable to fetch app details", color: "error" })
  }
  finally {
    detailsLoading.value = false
  }
}

const generateKey = async id => {
  generatingKey.value = true
  try {
    const response = await apiStore.getApiCreds({id})
    appDetails.value.app_secret = response.data?.data?.appKey;
    appDetails.value.app_id = response.data?.data?.appId;
    show({ message: "New secret generated successfully", color: "success" })
  }
  catch (e) {
    show({ message: "Unable to generate key", color: "error" })
  }
  finally {
    generatingKey.value = false
  }
}
const copyToClipboard = async (text) => {
  try {
    await window.navigator.clipboard.writeText(text)
    show({ message: "Copied to clipboard", color: "success" })
  } catch (err) {
    console.error(err)
    show({ message: "Failed to copy", color: "error" })
  }
}
function formatTimestamp(ts) {
  const date = new Date(ts);

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2); // Last two digits of year

  if (!ts) return "-";
  return `${hh}:${mm} ${dd}-${mo}-${yy}`;
}
</script>

<template>
  <VCard id="invoice-list">
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn icon @click="fetchChannels({ ...pagination })" :loading="isLoading" variant="text">
          <VIcon>tabler-refresh</VIcon>
        </VBtn>
        <!-- 👉 Create -->
        <VBtn prepend-icon="tabler-plus" @click="openCreateDrawer">
          Create App
        </VBtn>
      </div>
    </VCardText>

    <VDivider />

    <MyDataTable :headers="headers" :items="channels" :loading="isLoading"
      :server-side="true" v-bind="pagination" @update:options="onUpdateOptionsDebounced">
      <!-- channel id -->
      <template #item.createdStamp="{ item }">
          {{ formatTimestamp(item.raw.createdStamp) }}
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <IconBtn @click="viewAppDetails(item.raw._id, item.raw.keyName)">
          <VIcon icon="mdi-pencil-outline" />
        </IconBtn>
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
                    @click="deleteChannel(item.raw._id, isActive)"
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
      </template>
    </MyDataTable>
    <VNavigationDrawer v-model="showDetailsDrawer" location="end" temporary width="420">
      <div class="pa-6" style="margin-top: 85px;">
        <div class="text-h5 mb-6"> App Credentials </div>
        <VProgressCircular v-if="detailsLoading" indeterminate />
        <template v-else>
          <VTextField
            class="mb-5"
            label="App Name"
            v-model="appDetails.name"
            :readonly="drawerMode === 'view'"
          />
          <VTextField
            class="mb-5"
            label="App ID"
            v-model="appDetails.app_id"
            readonly
            append-inner-icon="tabler-copy"
            @click:append-inner="copyToClipboard(appDetails.app_id)"
            v-if="drawerMode === 'view'"
          />
          <VTextField
            label="App Secret Key"
            v-model="appDetails.app_secret"
            readonly
            append-inner-icon="tabler-copy"
            @click:append-inner="copyToClipboard(appDetails.app_secret)"
            v-if="drawerMode === 'view'"
          />
          <VBtn v-if="drawerMode === 'view'" class="mt-5" color="warning" :loading="generatingKey" @click="generateKey(appDetails.app_id)">
            Generate New Key
          </VBtn>
          <VBtn v-if="drawerMode === 'create'" color="primary" @click="createApp">
            Create
          </VBtn>
        </template>
      </div>
    </VNavigationDrawer>
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
