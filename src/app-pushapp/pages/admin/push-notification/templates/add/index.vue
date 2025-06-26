<script setup>
import NotificationPreview from "@app-pushapp/views/admin/push-notification/NotificationPreview.vue";
import { usePushNotification } from "@app-pushapp/views/admin/push-notification/usePushNotification";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
const { show } = inject("snackbar");

const DEFAULT_VARIABLES_DATA = `{

}`;

const route = useRoute();
const router = useRouter();
const pushNotificationStore = usePushNotificationStore();

const { FONT_SIZES, GRADIENT_DIRS, TEMPLATE_ALIGN, TEMPLATES_CONFIG } =
  usePushNotification();

const tab = ref("tab-details");
const isLoading = ref(false);
const template = reactive({
  type: "simple",
  subType: null,
  desc: "",
  code: "",
  style: {
    code: "simple",

    /** simple */
    title: "",
    message: "",
    category: null,

    image_url: "",
    logo_url: "",

    /** styled */
    line_1: "",
    line_2: "",
    line_3: "",
    line1_font_size: null,
    line2_font_size: null,
    line3_font_size: null,
    line1_font_color: "",
    line2_font_color: "",
    line3_font_color: "",
    bg_color: "",
    bg_color_gradient: "",
    bg_color_gradient_dir: null,
    progress_color: "",
    align: "left",
  },
  model: {
    data: DEFAULT_VARIABLES_DATA,
  },
});
const view = ref({
  platform: "ios",
  mode: "collapse",
  appearance: "light",
});
const buttonGroupValue = ref({});
const buttonGroupFields = computed(() => {
  if (template.style.category) {
    return (
      pushNotificationStore.buttonGroupList.find(
        (b) => b.value === template.style.category
      )?.fields || []
    );
  }
  return [];
});
const templatePreview = computed(() => {
  let data = {};
  try {
    data = JSON.parse(template.model.data);
  } catch (error) {}
  return {
    view: view.value,
    ...template,
    options: {
      buttons: buttonGroupFields.value,
    },
    model: {
      data,
    },
  };
});

onMounted(async () => {
  const id = route.query.copy;
  if (id) {
    pushNotificationStore
      .fetchTemplate({ id })
      .then((response) => {
        const _template = response.data.data;
        Object.assign(template, {
          ...template,
          ..._template,
          model: {
            ..._template.model,
            data: JSON.stringify(_template.model.data, null, 2),
          },
        });
        let _buttonGroupValue = {};
        _template.options.buttons.map((b) => {
          _buttonGroupValue[b.button_text] = b.button_url;
        });
        buttonGroupValue.value = _buttonGroupValue;
      })
      .catch((error) => {
        console.log(error);
        show({ message: "Something went wrong", color: "error" });
      });
  }
});

const onCreate = async () => {
  try {
    isLoading.value = true;

    let data = {};
    try {
      data = JSON.parse(template.model.data || DEFAULT_VARIABLES_DATA);
    } catch (error) {
      return show({ message: "Invalid variables json", color: "error" });
    }

    let payload = {};
    if (template.type === "simple") {
      payload = {
        ...template,
        options: {
          ...(template.options || {}),
          buttons: buttonGroupFields.value.map((b) => ({
            button_id: b.id,
            button_text: b.text,
            button_url: buttonGroupValue.value[b.text],
          })),
        },
        model: {
          ...(template.model || {}),
          data,
        },
      };
    } else {
      payload = {
        ...template,
        options: {},
        model: {
          ...(template.model || {}),
          data,
        },
      };
    }

    await pushNotificationStore.createTemplate(payload);

    show({ message: "Template created successfully", color: "success" });

    router.push({ name: "admin-push-notification-templates-list" });
  } catch (error) {
    console.error(error);

    show({ message: "Something went wrong. try again", color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const sanitizeAndUnderscore = (str) => {
  return str.replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
};

watch(
  () => view.value.platform,
  () => {
    view.value.mode = "collapse";
  }
);

watch(
  () => template.desc,
  (val) => {
    template.code = sanitizeAndUnderscore(val);
  }
);

watch(
  () => template.type,
  (val) => {
    if (val === "simple") {
      template.subType = null;
    }
  }
);

watch(
  () => template.subType,
  (val) => {
    if (val) template.style.code = val;
    else template.style.code = "simple";
  }
);
</script>

<template>
  <v-row style="height: calc(100vh - 105px)">
    <!-- template Column -->
    <v-col cols="12" md="8" class="template-form">
      <v-card>
        <v-card-item class="pb-0">
          <v-card-title>Create Template</v-card-title>
          <v-card-subtitle
            >This template will be used for sending Push
            Notification</v-card-subtitle
          >
        </v-card-item>

        <VTabs v-model="tab">
          <VTab value="tab-details"> Details </VTab>
          <VTab value="tab-variables"> Variables </VTab>
        </VTabs>

        <VCard flat>
          <VCardText>
            <VWindow v-model="tab" class="disable-tab-transition">
              <VWindowItem value="tab-details">
                <VForm>
                  <VRow>
                    <VCol cols="12" md="12">
                      <VRow>
                        <VCol cols="12" md="6">
                          <AppSelect
                            v-model="template.type"
                            :items="[
                              { label: 'Simple', value: 'simple' },
                              { label: 'Styled', value: 'styled' },
                            ]"
                            label="Type"
                            placeholder="Select Type"
                            item-title="label"
                            item-value="value"
                          />
                        </VCol>

                        <VCol cols="12" md="6">
                          <AppSelect
                            v-if="template.type === 'styled'"
                            v-model="template.subType"
                            :items="[{ label: 'Delivery', value: 'delivery' }]"
                            label="Sub Type"
                            placeholder="Select Sub Type"
                            item-title="label"
                            item-value="value"
                          />
                        </VCol>

                        <VCol cols="12" md="6">
                          <AppTextField
                            v-model="template.desc"
                            label="Name"
                            placeholder="Enter Name"
                          />
                        </VCol>

                        <VCol cols="12" md="6">
                          <!-- <AppTextField
                            v-model="template.code"
                            label="Code"
                            placeholder="Enter Code"
                          /> -->
                        </VCol>
                      </VRow>
                    </VCol>

                    <VDivider class="mt-4" />

                    <VCol cols="12" md="12">
                      <VRow v-if="template.type === 'simple'">
                        <VCol cols="12" md="12">
                          <AppTextField
                            v-model="template.style.title"
                            label="Title"
                            placeholder="Enter Notification Title"
                          />
                        </VCol>

                        <VCol cols="12" md="12">
                          <AppTextarea
                            v-model="template.style.message"
                            label="Message"
                            placeholder="Enter Notification Message"
                          />
                        </VCol>

                        <!-- <VCol cols="12" md="12">
                          <AppTextField
                            v-model="template.style.logo_url"
                            label="Logo URL ( public )"
                          />
                        </VCol> -->

                        <VCol cols="12" md="12">
                          <MyFileInputUpload
                            v-model="template.style.image_url"
                            label="Image URL ( public )"
                          />
                        </VCol>

                        <VCol cols="12" md="6">
                          <AppSelect
                            v-model="template.style.category"
                            :items="pushNotificationStore.buttonGroupList"
                            label="CTA Group"
                            placeholder="Select Button Group"
                            item-title="label"
                            item-value="value"
                            clearable
                          />
                        </VCol>

                        <VCol
                          cols="12"
                          md="12"
                          v-if="buttonGroupFields.length"
                          v-for="b in buttonGroupFields"
                        >
                          <AppTextField
                            v-model="buttonGroupValue[b.text]"
                            :label="'Button > ' + b.text"
                            placeholder="Enter URL"
                          />
                        </VCol>
                      </VRow>

                      <VRow v-else>
                        <!-- Line 1 -->
                        <VCol cols="12" md="7">
                          <AppTextField
                            v-model="template.style.line_1"
                            label="Title"
                            placeholder="Enter Title"
                          />
                        </VCol>
                        <VCol cols="12" md="2">
                          <AppSelect
                            v-model="template.style.line1_font_size"
                            :items="FONT_SIZES"
                            label="Font Size"
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <MyColorPicker
                            v-model="template.style.line1_font_color"
                            label="Font Color"
                          />
                        </VCol>

                        <!-- Line 2 -->
                        <VCol cols="12" md="7">
                          <AppTextField
                            v-model="template.style.line_2"
                            label="Text"
                            placeholder="Enter Text"
                          />
                        </VCol>
                        <VCol cols="12" md="2">
                          <AppSelect
                            v-model="template.style.line2_font_size"
                            :items="FONT_SIZES"
                            label="Font Size"
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <MyColorPicker
                            v-model="template.style.line2_font_color"
                            label="Font Color"
                          />
                        </VCol>

                        <!-- Line 3 -->
                        <VCol cols="12" md="7">
                          <AppTextField
                            v-model="template.style.line_3"
                            label="Message"
                            placeholder="Enter Message"
                          />
                        </VCol>
                        <VCol cols="12" md="2">
                          <AppSelect
                            v-model="template.style.line3_font_size"
                            :items="FONT_SIZES"
                            label="Font Size"
                          />
                        </VCol>
                        <VCol cols="12" md="3">
                          <MyColorPicker
                            v-model="template.style.line3_font_color"
                            label="Font Color"
                          />
                        </VCol>

                        <!-- Images -->
                        <VCol cols="12" md="12">
                          <MyFileInputUpload
                            v-model="template.style.logo_url"
                            label="Logo URL ( public )"
                          />
                        </VCol>
                        <VCol cols="12" md="12">
                          <MyFileInputUpload
                            v-model="template.style.image_url"
                            label="Image URL ( public )"
                          />

                          <!-- Background -->
                        </VCol>

                        <!-- Backgroud -->
                        <VCol cols="12" md="3"
                          ><MyColorPicker
                            v-model="template.style.bg_color"
                            label="Background Color"
                        /></VCol>
                        <VCol cols="12" md="3">
                          <MyColorPicker
                            v-model="template.style.bg_color_gradient"
                            label="Gradient Color"
                        /></VCol>
                        <VCol cols="12" md="3"
                          ><AppSelect
                            v-model="template.style.bg_color_gradient_dir"
                            :items="GRADIENT_DIRS"
                            label="Gradient Direction"
                        /></VCol>
                        <VCol cols="12" md="3"></VCol>

                        <!-- Progress Bar -->
                        <VCol cols="12" md="3"
                          ><MyColorPicker
                            v-model="template.style.progress_color"
                            label="Progress Color"
                        /></VCol>
                        <VCol cols="12" md="9"></VCol>

                        <!-- Alignment -->
                        <VCol cols="12" md="4"
                          ><AppSelect
                            v-model="template.style.align"
                            :items="TEMPLATE_ALIGN"
                            label="Direction"
                        /></VCol>
                      </VRow>
                    </VCol>
                  </VRow>
                </VForm>
              </VWindowItem>

              <VWindowItem value="tab-variables">
                <VRow>
                  <VCol cols="12" md="12">
                    <AppTextarea
                      v-model="template.model.data"
                      label="Sample Data"
                      auto-grow
                      rows="6"
                      spellcheck="false"
                      class="monospace"
                      placeholder='e.g. {"title": "Hello"}'
                      hint="use {{data.<variable>}} for custom variables in your template"
                      persistent-hint
                    />
                  </VCol>
                </VRow>
              </VWindowItem>
            </VWindow>
          </VCardText>

          <VDivider />

          <VCardText class="d-flex gap-4">
            <VBtn @click="onCreate" :disabled="isLoading">{{
              isLoading ? "loading..." : "Create"
            }}</VBtn>
            <VBtn
              variant="tonal"
              color="secondary"
              :to="{ name: 'admin-push-notification-templates-list' }"
            >
              Cancel
            </VBtn>
          </VCardText>
        </VCard>
      </v-card>
    </v-col>

    <!-- Preview Column -->
    <VCol cols="12" md="4">
      <VRow>
        <v-col cols="5" class="px-0">
          <v-btn-toggle v-model="view.platform" mandatory density="compact">
            <v-btn color="primary" value="ios">iOS</v-btn>
            <v-btn color="primary" value="android">Android</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="7" class="pl-3">
          <v-btn-toggle v-model="view.mode" mandatory density="compact">
            <v-btn color="primary" value="collapse">Collapse</v-btn>
            <v-btn color="primary" value="expand">Expand</v-btn>
          </v-btn-toggle>
        </v-col>
      </VRow>
      <VRow style="height: calc(100% - 36px)">
        <v-col cols="12" class="d-flex justify-center pt-0">
          <NotificationPreview :template="templatePreview" />
        </v-col>
      </VRow>
    </VCol>
  </v-row>
</template>

<style scoped lang="scss">
.template-form {
  height: inherit;
  overflow: scroll;
}
</style>
