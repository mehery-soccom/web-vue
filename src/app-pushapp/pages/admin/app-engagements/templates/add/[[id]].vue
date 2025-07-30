<script setup>
import { toRef } from 'vue';
const { show } = inject("snackbar");
import DynamicForm from '@/app-pushapp/views/admin/app-engagements/form/dynamicForm.vue';
import DynamicFieldEditor from '@/app-pushapp/components/DynamicFieldEditor.vue';
import { useAppEngagementsStore } from '@/app-pushapp/views/admin/app-engagements/useAppEngagementsStore';
import NotificationPreview from '@/app-pushapp/views/admin/push-notification/NotificationPreview.vue';
import { useAppEngagements } from '@/app-pushapp/views/admin/app-engagements/useAppEngagements';
const AppEngagements = useAppEngagements();
const AppEngagementsStore = useAppEngagementsStore();
const typesList = AppEngagements.TYPES;
const subTypesList = AppEngagements.SUB_TYPES;

const availableSubTypes = computed(() => {
  const filtered = subTypesList.filter(sub => sub.type === template.type);
  if (filtered.length === 1 && filtered[0].value === template.type && template.subType !== filtered[0].value) {
    template.subType = filtered[0].value;
  }
  return filtered;
});

const required = (v) => !!v || "This field is required";
const route = useRoute();
const IS_PAGE = route.name?.includes("admin-app-engagements-templates-add");
const PARAM_ID = route.params.id;
const QUERY_COPY = route.query.t_copy;
const QUERY_EDIT = route.query.t_edit;

const router = useRouter();

const isLoading = ref(false);
const isPreStep = ref(false);
const activeTemplateTab = ref("tab-details");
const template = reactive({
  type: null,
  subType: null,
  desc: '',
  code: '',
  model: { data: [] },
  style:{
    code: 'simple',
    title: "",
    message: "",
    category: null,

    image_url: "",
    logo_url: "",
    button1_url: "",
    button2_url: "",

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

    /** roadblock */
    height: '',
    width: '',
    btn: [],
  }
})
const view = ref({
  platform: "ios",
  mode: "collapse",
  appearance: "light",
});
const templatePreview = computed(() => {
  return {
    view: view.value,
    ...template,
    // options: {
    //   buttons: template.buttonGroupFields.value,
    // },
  };
});
const formRef = ref(null);

const submit = async () => {
  const { valid, errors } = formRef.value.validate();
  if (!valid) {
    show({ message: errors.join(', '), color: 'error' });
    return;
  }
  await onCreate();
  console.log("valid form", formRef, formRef.value, template, dynamicFields, JSON.stringify(template, null, 2))
};
const onCreate = async () => {
  try {
    isLoading.value = true;
    let payload = {};
    if (template.type === "simple") {
      payload = {
        ...template,
        options: {
          ...(template.options || {}),
          // buttons: buttonGroupFields.value.map((b) => ({
          //   button_id: b.id,
          //   button_text: b.text,
          //   button_url: buttonGroupValue.value[b.text],
          // })),
        },
      };
    } else {
      payload = {
        ...template,
        options: {},
      };
    }
    template.style.code = template.subType || template.type;

    await AppEngagementsStore.createTemplate(payload);
    show({ message: "Template created successfully", color: "success" });
    router.push({ name: "admin-app-engagements-templates-list" });
  } catch (error) {
    console.error(error);
    show({ message: "Something went wrong. try again", color: "error" });
  } finally {
    isLoading.value = false;
  }
};

const formFields = computed(() => {
  const matched = subTypesList.find(s =>
      (template.subType && s.value === template.subType && s.type === template.type) ||
      (!template.subType && s.value === template.type)
  );
  return matched?.form?.fields ?? [];
});

function onFormUpdate(updated) {
  Object.assign(template, updated)
  // console.log('[Parent] got update:', template.style)
}

onMounted(async () => {});

const isValid = async () => {
  return true;
};

const val = async () => {
  return {
    test: true,
  };
};

const sanitizeAndUnderscore = (str) => {
  return str.replace(/[^\w\s]/g, "").replace(/\s+/g, "_");
};

watch(() => template.type,(val) => {
    template.subType = '';
  }
);
watch(
  () => template.subType,
  (val) => {
    if (val) template.style.code = val;
    else template.style.code = null;
  }
);

watch(
  () => template.desc,
  (val) => {
    template.code = sanitizeAndUnderscore(val);
  }
);

defineExpose({ isValid, val });
</script>

<template>
  <v-row>
    <!-- Pre step -->
    <v-col v-if="isPreStep" cols="12" md="12">
      <VCard>Pre step</VCard>

    </v-col>

    <!-- Form Column -->
    <v-col v-if="!isPreStep" cols="12" md="8">
      <v-card>
        <v-card-item class="pb-0">
          <v-card-title>Create Template</v-card-title>
          <v-card-subtitle
            >This template will be used for sending Push
            Notification</v-card-subtitle
          >
        </v-card-item>

        <VTabs v-model="activeTemplateTab">
          <VTab value="tab-details"> Details </VTab>
          <VTab value="tab-variables"> Variables </VTab>
        </VTabs>

        <!-- <VCard flat>
          <VCardText>
            <VWindow v-model="activeTemplateTab" class="disable-tab-transition">
              <VWindowItem value="tab-details"> Form </VWindowItem> -->

          <VCard flat>
            <VCardText>
              <VWindow
                v-model="activeTemplateTab"
                class="disable-tab-transition"
              >
                <VWindowItem value="tab-details">
                  <div>
                    <VRow>
                      <VCol cols="12" md="6">
                        <!-- <AppSelect v-model="template.type" :items="Object.keys(formConfig)" label="Type" :rules="[required]" /> -->
                        <AppSelect
                          v-model="template.type"
                          :items="typesList.map(t => ({ label: t.label, value: t.value }))"
                          label="Type" item-title="label" item-value="value"
                          :rules="[required]"
                        />
                      </VCol>
                      <VCol cols="12" md="6">
                        <!-- <AppSelect v-if="subtypeOptions.length" v-model="template.subtype"
                          :items="subtypeOptions" label="Subtype" :rules="[required]"
                        /> -->
                        <AppSelect
                          v-if="availableSubTypes.length > 1 || (availableSubTypes.length === 1 && availableSubTypes[0].value !== template.type)"
                          v-model="template.subType" item-title="label" item-value="value"
                          :items="availableSubTypes.map(s => ({ label: s.label, value: s.value }))"
                          label="Subtype"
                        />
                      </VCol>
                      <VCol cols="12" md="6">
                        <AppTextField v-model="template.desc" label="Template Name" placeholder="Enter name"
                          :rules="[required]" prepend-inner-icon="mdi-text-box"
                        />
                      </VCol>
                    </VRow>
                    <VDivider class="mt-4" />

                    <DynamicForm
                      v-if="formFields.length"
                      ref="formRef"
                      :formData="template"
                      :fields="formFields"
                      @update:formData="onFormUpdate"
                    />
                  </div>
                </VWindowItem>

                <VWindowItem value="tab-variables"> 
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
                </VWindowItem>
              </VWindow>
            </VCardText>
            <template v-if="IS_PAGE">
              <VDivider />
              <VCardText class="d-flex gap-4">
                <VBtn :disabled="isLoading" @click="submit">{{
                  isLoading ? "loading..." : PARAM_ID ? "Update" : "Create"
                }}</VBtn>
                <VBtn
                  variant="tonal"
                  color="secondary"
                  :to="{ name: 'admin-app-engagements-templates-list' }"
                >
                  Cancel
                </VBtn> 
              </VCardText>
            </template>
        </VCard>
      </v-card>
    </v-col>

    <!-- Preview Column -->
    <VCol v-if="!isPreStep" cols="12" md="4">
      <!-- <VCol cols="12" md="4"> -->
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
        <VRow style="height: calc(100% - 36px); max-height: 550px;">
          <v-col cols="12" class="d-flex justify-center pt-0">
            <NotificationPreview :template="templatePreview" />
          </v-col>
        </VRow>
    </VCol>
  </v-row>
</template>

<style scoped lang="scss"></style>
