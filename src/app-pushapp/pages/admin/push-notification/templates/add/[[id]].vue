<script setup>
import { toRef } from "vue";
import NotificationPreview from "@app-pushapp/views/admin/push-notification/NotificationPreview.vue";
import { usePushNotification } from "@app-pushapp/views/admin/push-notification/usePushNotification";
import { usePushNotificationStore } from "@app-pushapp/views/admin/push-notification/usePushNotificationStore";
import { useMetaStore } from "@/app-pushapp/views/common/useMetaStore";
const { show } = inject("snackbar");

const required = (v) => !!v || "This field is required";
const max50 = (v) => !v || v.length <= 50 || "Title must be 50 characters or less";
const max120 = (v) => !v || v.length <= 120 || "Message must be 120 characters or less";
const urlRule = (v) =>
  !v || /^https?:\/\/\S+$/.test(v) || "Must be a valid URL";
const lineOpen = reactive({ 1: false, 2: false, 3: false });
const toggleLine = (line) => {
  lineOpen[line] = !lineOpen[line];
};

// const DEFAULT_VARIABLES_DATA = `{

// }`;

const route = useRoute();
const PARAM_ID = route.params.id;
const QUERY_COPY = route.query.copy;

const router = useRouter();
const fromMetaStore = useMetaStore();
const pushNotificationStore = usePushNotificationStore();
const { FONT_SIZES, GRADIENT_DIRS, TEMPLATE_ALIGN, TEMPLATES_CONFIG } =
  usePushNotification();

const tab = ref("tab-details");
const initialTypeChange = ref(false);
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

    image_url: [""],
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
    line1_font_text_styles: [],
    line2_font_text_styles: [],
    line3_font_text_styles: [],
    bg_color: "",
    bg_color_gradient: "",
    bg_color_gradient_dir: null,
    progress_color: "",
    align: "left",
  },
  model: {
    data: {},
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
  // let data = {};
  // try {
  //   data = JSON.parse(template.model.data);
  // } catch (error) {}
  return {
    view: view.value,
    ...template,
    options: {
      buttons: buttonGroupFields.value,
    },
    // model: {
    //   data,
    // },
  };
});
const formRef = ref();
const formRefVersion = ref(1);

onMounted(async () => {
  if (PARAM_ID) {
    pushNotificationStore
      .fetchTemplate({ id: PARAM_ID })
      .then((response) => {
        initialTypeChange.value = true;
        const _template = response.data.data;
        Object.assign(template, {
          ...template,
          ..._template,
          // model: {
          //   ...(_template.model || {}),
          //   data: {}
          // },
        });
        console.log("add", JSON.parse(JSON.stringify(template)), JSON.parse(JSON.stringify(_template)), template.style.image_url, typeof(template.style.image_url))
        if (template.type === "simple") {
          if (typeof template.style.image_url === "string") template.style.image_url = [template.style.image_url];
          if (!Array.isArray(template.style.image_url)) template.style.image_url = [""];
        }
        let _buttonGroupValue = {};
        _template.options.buttons.map((b) => {
          _buttonGroupValue[b.button_text] = b.button_url;
        });
        buttonGroupValue.value = _buttonGroupValue;
      })
      .catch((error) => {
        console.log(error);
        show({ message: error?.response?.data?.errorMsg ? error.response.data.errorMsg : error, color: "error" });
      });
  } else {
    if (QUERY_COPY) {
      pushNotificationStore
        .fetchTemplate({ id: QUERY_COPY })
        .then((response) => {
          const _template = response.data.data;
          Object.assign(template, {
            ...template,
            ..._template,
            // model: {
            //   ...(_template.model || {}),
            //   data: {},
            // },
          });
          let _buttonGroupValue = {};
          _template.options.buttons.map((b) => {
            _buttonGroupValue[b.button_text] = b.button_url;
          });
          buttonGroupValue.value = _buttonGroupValue;
        })
        .catch((error) => {
          console.log(error);
          show({ message: error?.response?.data?.errorMsg ? error.response.data.errorMsg : error, color: "error" });
        });
    }
  }
  if(fromMetaStore?.$state?.meta?.prefs?.pa_app_logo) template.style.logo_url = fromMetaStore.$state.meta.prefs.pa_app_logo;
});

const onCreate = async () => {
  let validationResult = await formRef.value.validate();

  console.log("onCreate", validationResult.errors, template);

  if (!validationResult.valid) {
    return;
  }

  try {
    isLoading.value = true;

    // let data = {};
    // try {
    //   data = JSON.parse(template.model.data || DEFAULT_VARIABLES_DATA);
    // } catch (error) {
    //   return show({ message: "Invalid variables json", color: "error" });
    // }

    let payload = {};
    delete template.createdAt;
    delete template.updatedAt;
    delete template._id;
    delete template.__v;
    if (template.type === "simple") {
      if (Array.isArray(template.style.image_url) && template.style.image_url.length === 1) template.style.image_url = template.style.image_url[0];
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
        // model: {
        //   ...(template.model || {}),
        //   data,
        // },
      };
    } else {
      payload = {
        ...template,
        options: {},
        // model: {
        //   ...(template.model || {}),
        //   data,
        // },
      };
    }

    await pushNotificationStore.createTemplate(payload);

    show({ message: "Template created successfully", color: "success" });

    router.push({ name: "admin-push-notification-templates-list" });
  } catch (error) {
    console.error(error);

    show({ message: error?.response?.data?.errorMsg ? error.response.data.errorMsg : error, color: "error" });
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

    // let data = {};
    // try {
    //   data = JSON.parse(template.model.data || DEFAULT_VARIABLES_DATA);
    // } catch (error) {
    //   return show({ message: "Invalid variables json", color: "error" });
    // }

    let payload = {};
    if (template.type === "simple") {
      if (Array.isArray(template.style.image_url) && template.style.image_url.length === 1) template.style.image_url = template.style.image_url[0];
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
        // model: {
        //   ...(template.model || {}),
        //   data,
        // },
      };
    } else {
      payload = {
        ...template,
        options: {},
        // model: {
        //   ...(template.model || {}),
        //   data,
        // },
      };
    }

    await pushNotificationStore.updateTemplate(template._id, payload);

    show({ message: "Template updated successfully", color: "success" });

    router.push({ name: "admin-push-notification-templates-list" });
  } catch (error) {
    console.error(error);

    show({ message: error?.response?.data?.errorMsg ? error.response.data.errorMsg : error, color: "error" });
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
    formRefVersion.value += 1;
    console.log("running watch 1", JSON.parse(JSON.stringify(template.style.image_url)))
    if (val === "simple") {
      template.subType = null;
      template.style.image_url = [""];
    } else if(val === 'styled') {
      if(initialTypeChange.value) initialTypeChange.value = false;
      else template.style.image_url = "";
    }
    console.log("running watch 2", JSON.parse(JSON.stringify(template.style.image_url)))
    if(fromMetaStore?.$state?.meta?.prefs?.pa_app_logo) template.style.logo_url = fromMetaStore.$state.meta.prefs.pa_app_logo;
  }
);

watch(
  () => template.subType,
  (val) => {
    if (val) template.style.code = val;
    else template.style.code = "simple";
    if(fromMetaStore?.$state?.meta?.prefs?.pa_app_logo) template.style.logo_url = fromMetaStore.$state.meta.prefs.pa_app_logo;
  }
);
</script>

<template>
  <v-row style="height: calc(100vh - 105px)">
    <!-- template Column -->
    <v-col cols="12" md="8" class="template-form">
      <v-card>
        <v-card-item class="pb-0">
          <v-card-title>{{PARAM_ID ? "Edit" : "Create"}} Template</v-card-title>
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
                <VForm ref="formRef" :key="formRefVersion">
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
                        :rules="[required]"
                        prepend-inner-icon="mdi-shape"
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
                        :rules="[required]"
                        prepend-inner-icon="mdi-subdirectory-arrow-right"
                      />
                    </VCol>

                    <VCol cols="12" md="6">
                      <AppTextField
                        v-model="template.desc"
                        label="Template Name"
                        placeholder="Enter name"
                        :rules="[required]"
                        prepend-inner-icon="mdi-text-box"
                      />
                    </VCol>

                    <VDivider class="mt-4" />

                    <!-- Simple Template Fields -->
                    <template v-if="template.type === 'simple'">
                      <VCol cols="12" md="12">
                        <AppTextSuggestion
                          v-model="template.style.title"
                          :label="`Title (${template.style.title.length}/50 Characters)`"
                          placeholder="Enter Notification Title"
                          :rules="[required, max50]"
                          prepend-inner-icon="mdi-format-title"
                          :suggestions="template.model"
                        />
                      </VCol>

                      <VCol cols="12">
                        <AppTextSuggestion
                          v-model="template.style.message"
                          :label="`Message (${template.style.message.length}/120 Characters)`"
                          placeholder="Enter Message"
                          :rules="[required, max120]"
                          prepend-inner-icon="mdi-message-text"
                          type="textarea"
                          :suggestions="template.model"
                        />
                      </VCol>

                      <VCol cols="12">
                        <div v-for="(img, index) in template.style.image_url">
                          <div style="margin-bottom: 20px;">
                            <MyFileInputUpload
                              v-model="template.style.image_url[index]"
                              :key="index"
                              :label="`Upload Image ${index + 1}`"
                              :max-size="10240"
                              helper-text="Supported formats: JPG, JPEG, PNG, GIF, WebP, SVG (any image format supported by your browser). Max file size is 10 kb"
                            />
                          </div>
                        </div>
                        <VBtn v-if="template.style.image_url.length < 3" @click="template.style.image_url.push('')">
                          Add Image
                        </VBtn>
                        <VBtn v-if="template.style.image_url.length > 1" @click="template.style.image_url.pop()" color="error" style="margin-left: 1rem;">
                          Remove Image
                        </VBtn>
                        <!-- <MyFileInputUpload
                          v-model="template.style.image_url"
                          label="Upload Image" :max-size="10240"
                        /> -->
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
                          prepend-inner-icon="mdi-gesture-tap-button"
                        />
                      </VCol>

                      <VCol
                        v-for="b in buttonGroupFields"
                        :key="b.text"
                        cols="12"
                      >
                        <AppTextField
                          v-model="buttonGroupValue[b.text]"
                          :label="'Button > ' + b.text"
                          placeholder="Enter URL"
                          :rules="[urlRule]"
                          prepend-inner-icon="mdi-link"
                        />
                      </VCol>
                    </template>

                    <!-- Styled Template Fields -->
                    <template v-else>
                      <template v-for="line in [1, 2, 3]" :key="line">
                        <VCol cols="12">
                          <VRow no-gutters align="end">
                            <VCol cols="11">
                              <AppTextSuggestion
                                v-model="template.style[`line_${line}`]"
                                :label="`Line ${line} Text`"
                                class="mb-1"
                                placeholder="Enter text for this line"
                                prepend-inner-icon="mdi-text"
                                density="compact"
                                :suggestions="template.model"
                              />
                            </VCol>
                            <VCol
                              cols="1"
                              class="d-flex align-center justify-end"
                            >
                              <VBtn
                                icon
                                variant="text"
                                @click="toggleLine(line)"
                              >
                                <VIcon>{{
                                  lineOpen[line]
                                    ? "mdi-chevron-up"
                                    : "mdi-pencil"
                                }}</VIcon>
                              </VBtn>
                            </VCol>
                          </VRow>

                          <VExpandTransition>
                            <div v-show="lineOpen[line]">
                              <VRow dense class="mt-1">
                                <!-- Font Size -->
                                <VCol cols="12" md="4">
                                  <AppSelect
                                    v-model="
                                      template.style[`line${line}_font_size`]
                                    "
                                    :items="FONT_SIZES"
                                    prepend-inner-icon="mdi-format-size"
                                    placeholder="Font Size"
                                  />
                                </VCol>

                                <!-- Font Color -->
                                <VCol cols="12" md="4">
                                  <MyColorPicker
                                    v-model="
                                      template.style[`line${line}_font_color`]
                                    "
                                    placeholder="Font Color"
                                  />
                                </VCol>

                                <!-- Text Style Buttons -->
                                <VCol cols="12" md="4">
                                  <VBtnToggle
                                    v-model="
                                      template.style[`line${line}_text_styles`]
                                    "
                                    multiple
                                    variant="outlined"
                                    class="text-style-toggle"
                                  >
                                    <VBtn color="primary" value="bold" icon
                                      ><VIcon>mdi-format-bold</VIcon></VBtn
                                    >
                                    <VBtn color="primary" value="italic" icon
                                      ><VIcon>mdi-format-italic</VIcon></VBtn
                                    >
                                    <VBtn color="primary" value="underline" icon
                                      ><VIcon>mdi-format-underline</VIcon></VBtn
                                    >
                                  </VBtnToggle>
                                </VCol>
                              </VRow>
                            </div>
                          </VExpandTransition>
                        </VCol>
                      </template>

                      <VCol cols="12">
                        <MyFileInputUpload
                          v-model="template.style.image_url"
                          label="Upload Image" :max-size="10240"
                          helper-text="Supported formats: JPG, JPEG, PNG, GIF, WebP, SVG (any image format supported by your browser). Max file size is 10 kb"
                        />
                      </VCol>

                      <!-- Background -->
                      <VCol cols="12" md="4">
                        <MyColorPicker
                          v-model="template.style.bg_color"
                          label="Background Color"
                        />
                      </VCol>
                      <!-- <VCol cols="12" md="3">
                        <MyColorPicker
                          v-model="template.style.bg_color_gradient"
                          label="Gradient Color"
                        />
                      </VCol>
                      <VCol cols="12" md="3">
                        <AppSelect
                          v-model="template.style.bg_color_gradient_dir"
                          :items="GRADIENT_DIRS" clearable
                          label="Gradient Direction"
                          prepend-inner-icon="mdi-arrow-expand-all"
                        />
                      </VCol> -->

                      <!-- Progress -->
                      <VCol cols="12" md="4">
                        <MyColorPicker
                          v-model="template.style.progress_color"
                          label="Progress Color"
                        />
                      </VCol>

                      <!-- Alignment -->
                      <VCol cols="12" md="4">
                        <AppSelect
                          v-model="template.style.align"
                          :items="TEMPLATE_ALIGN"
                          label="Template Alignment"
                          prepend-inner-icon="mdi-format-align-center"
                        />
                      </VCol>
                    </template>
                  </VRow>
                </VForm>
              </VWindowItem>

              <VWindowItem value="tab-variables">
                <!-- <VRow>
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
                </VRow> -->
                <VRow>
                  <VCol cols="12" md="12">
                    <DynamicFieldEditor
                      v-model="template.model"
                      :fields="[
                        toRef(template.style, 'title'),
                        toRef(template.style, 'message'),
                        toRef(template.style, 'line_1'),
                        toRef(template.style, 'line_2'),
                        toRef(template.style, 'line_3'),
                      ]"
                      :dynamic-prefixes="['data']"
                    />
                  </VCol>
                </VRow>
                <!-- toRef - bc, watching multiple fields in an array -->
              </VWindowItem>
            </VWindow>
          </VCardText>

          <VDivider />

          <VCardText class="d-flex gap-4">
            <VBtn
              @click="PARAM_ID ? onUpdate() : onCreate()"
              :disabled="isLoading"
              >{{
                isLoading ? "loading..." : PARAM_ID ? "Update" : "Create"
              }}</VBtn
            >
            <VBtn
              variant="outlined"
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
.text-style-toggle .v-btn {
  min-width: 56px;
  height: 36px;
}
.v-btn-group {
  height: 44px !important;
}
</style>
