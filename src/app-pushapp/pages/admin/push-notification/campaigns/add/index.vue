<script setup>
import { useChannelsStore } from "@app-pushapp/views/admin/channels/useChannelsStore";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
const { show } = inject("snackbar");

const route = useRoute();
const router = useRouter();
const channelsStore = useChannelsStore();
const pushNotificationStore = usePushNotificationStore();

const tab = ref("tab-details");
const isLoading = ref(false);
const notification = reactive({
  campaignName: "",
  template: null,
  channel_id: null,
  platforms: [],
});
const ChannelList = ref([]);
const TemplateListSimple = ref([]);

onMounted(async () => {
  let channelsRes = await channelsStore.fetchChannels().catch((error) => error);
  if (channelsRes.results) ChannelList.value = channelsRes.results;

  let templatesRes = await pushNotificationStore
    .fetchTemplates()
    .catch((error) => error);
  if (templatesRes.results)
    TemplateListSimple.value = templatesRes.results.filter(
      (t) => t.type === "simple"
    );

  const copy = route.query.copy;
  if (copy) {
    pushNotificationStore
      .fetchCampaign({ id: copy })
      .then((response) => {
        const _notification = response.data.data;
        let template = TemplateListSimple.value.find(
          (t) => t.code === _notification.templateCode
        );
        Object.assign(notification, {
          ...notification,
          ..._notification,
          channel_id: _notification.channelId,
          platforms: _notification.filters.platform,
          template: template?._id,
          campaignName: "",
        });
      })
      .catch((error) => {
        console.log(error);
        show({ message: "Something went wrong", color: "error" });
      });
  }
});

const onSendSimple = async () => {
  try {
    isLoading.value = true;

    let template = TemplateListSimple.value.find(
      (t) => t._id === notification.template
    );

    let payloadV2 = {
      to: {
        filter: {
          platform: notification.platforms,
          session_type: "all",
        },
      },
      channel_id: notification.channel_id,
      style: { code: "simple", ...template.style },
      template: {
        code: template.code,
        data: template.model?.data,
        lang: "en",
      },
      options: {
        buttons: template.options.buttons,
      },

      type: template.type,
      campaignName: notification.campaignName,
    };

    await pushNotificationStore.sendBulkV2(payloadV2);

    show({ message: "Notification sent successfully", color: "success" });

    router.push({ name: "admin-push-notification-campaigns-list" });
  } catch (error) {
    console.error(error);

    show({ message: "Something went wrong. try again", color: "error" });
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <v-row>
    <!-- Form Column -->
    <v-col cols="12" md="8">
      <v-card title="Push Notification">
        <VTabs v-model="tab">
          <VTab value="tab-details"> Details </VTab>
          <VTab value="tab-segments"> Segments </VTab>
        </VTabs>

        <VCard flat>
          <VCardText>
            <VWindow v-model="tab" class="disable-tab-transition">
              <VWindowItem value="tab-details">
                <VForm>
                  <VRow>
                    <VCol cols="12" md="6">
                      <AppTextField
                        v-model="notification.campaignName"
                        label="Notification Name"
                        placeholder="Enter Notification Name"
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <AppSelect
                        v-model="notification.template"
                        :items="TemplateListSimple"
                        label="Template"
                        placeholder="Select a template"
                        item-title="code"
                        item-value="_id"
                        clearable
                      >
                        <template #item="{ props, item }">
                          <v-list-item v-bind="props" class="px-4">
                            <div class="dropdown-option-meta text-caption">
                              ( {{ item.raw.type }} )
                            </div>
                          </v-list-item>
                        </template>
                      </AppSelect>
                    </VCol>
                  </VRow>
                </VForm>
              </VWindowItem>

              <VWindowItem value="tab-segments">
                <VForm>
                  <VRow>
                    <VCol cols="12" md="6">
                      <AppSelect
                        v-model="notification.channel_id"
                        :items="ChannelList"
                        label="App"
                        placeholder="Select App"
                        item-title="channel_name"
                        item-value="channel_id"
                        clearable
                      />
                    </VCol>

                    <VCol cols="12" md="6"></VCol>

                    <VCol cols="12" md="6">
                      <AppSelect
                        v-model="notification.platforms"
                        :items="pushNotificationStore.platformList"
                        label="Platform"
                        placeholder="Select Platforms"
                        item-title="label"
                        item-value="value"
                        clearable
                        multiple
                        chips
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <AppTextField label="Target" value="All Users" disabled />
                    </VCol>
                  </VRow>
                </VForm>
              </VWindowItem>
            </VWindow>
          </VCardText>

          <VDivider />

          <VCardText class="d-flex gap-4">
            <VBtn
              v-if="tab === 'tab-segments'"
              @click="onSendSimple"
              :disabled="isLoading"
              >{{ isLoading ? "loading..." : "Send Now" }}</VBtn
            >
            <VBtn
              variant="tonal"
              color="secondary"
              :to="{ name: 'admin-push-notification-campaigns-list' }"
            >
              Cancel
            </VBtn>
          </VCardText>
        </VCard>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped lang="scss">
.dropdown-option-meta {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem;
}
</style>
