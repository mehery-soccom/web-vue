<script setup>
import { smartFormatDate } from "@app-pushapp/@core/utils/formatters";
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";
import { requiredValidator } from "@app-pushapp/@core/utils/validators";
import OptionsSchema from "@/app-pushapp/views/config/library/OptionsSchema.vue";

const { show } = inject("snackbar");

const toCode = (v) => {
  return String(v || "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
};

const DEFAULT_OPTION_SCHEMA = {
  properties: [
    {
      label: "Label",
      code: "label",
      type: "string",
      required: true,
      locked: true,
    },
    {
      label: "Code",
      code: "code",
      type: "string",
      required: false,
      locked: true,
    },
  ],
};
const DEFAULT_ITEM = {
  key: null,
  label: null,
  description: null,

  optionSchema: DEFAULT_OPTION_SCHEMA,
  options: [],

  defaultVersion: null,
  versions: [],
};

const libraryStore = useLibraryStore();

const route = useRoute();
const PARAM_KEY = route.params.id;
const QUERY_EDIT = route.query.edit;

const router = useRouter();

const loading = ref(false);

// ---------------- Tabs ----------------
const tab = ref(QUERY_EDIT || "details");

// ---------------- State ----------------
const item = reactive(JSON.parse(JSON.stringify(DEFAULT_ITEM)));
const itemCopy = reactive(JSON.parse(JSON.stringify(DEFAULT_ITEM)));
const disableSave = computed(() => {
  return JSON.stringify(item) === JSON.stringify(itemCopy);
});
const disablePublish = computed(() => {
  return !!(
    (JSON.stringify(item.options) === JSON.stringify(itemCopy.options))
    // && !item.options.length
  );
});
const formRef = ref();

// ---------------- Schema Drawer ----------------
const schemaDrawer = ref(false);

// ---------------- Options ----------------
const optionFormRef = ref();
const optionDialog = ref(false);
const optionEditing = reactive({});
const optionEditingIndex = ref(-1);
const optionHeaders = computed(() => {
  return [
    ...item.optionSchema.properties.map((p) => {
      return {
        title: p.label,
        key: p.code,
      };
    }),
    {
      title: "Actions",
      key: "actions",
      sortable: false,
    },
  ];
});
const optionViewDailog = ref(false);
const optionViewHeaders = ref([]);
const optionView = ref([]);

const openOptionDialog = (_item, index) => {
  let __item = {};
  item.optionSchema.properties.map(
    (o) => (__item[o.code] = o.type === "boolean" ? false : null)
  );

  // Object.keys(optionEditing).forEach((key) => delete optionEditing[key]);

  optionEditingIndex.value = index ?? -1;
  Object.assign(optionEditing, _item || __item);
  optionDialog.value = true;
};

const saveOption = async () => {
  optionEditing.code = toCode(optionEditing.code || optionEditing.label);

  let validationResult = await optionFormRef.value.validate();
  if (!validationResult.valid) return;

  // prevent duplicate label or code
  const exists = item.options.some(
    (opt, idx) =>
      idx !== optionEditingIndex.value &&
      (opt.label === optionEditing.label || opt.code === optionEditing.code)
  );
  if (exists)
    return show({
      message: "Duplicate label or code not allowed.",
      color: "error",
    });

  if (optionEditingIndex.value > -1) {
    item.options[optionEditingIndex.value] = { ...optionEditing };
  } else {
    item.options.push({ ...optionEditing });
  }
  optionDialog.value = false;
};

const removeOption = (index) => {
  item.options.splice(index, 1);
};

// ---------------- Versions ----------------
const nextVersion = computed(() => {
  return item.versions.length + 1;
});

const rollbackToDraft = (ver) => {
  Object.assign(
    item,
    JSON.parse(
      JSON.stringify({ optionSchema: ver.optionSchema, options: ver.options })
    )
  );
  tab.value = "details"; // jump back
};

const viewOptions = (ver) => {
  optionViewHeaders.value = Object.keys(ver.options[0]).map((o) => ({
    title: o,
    key: o,
  }));
  optionView.value = ver.options;
  optionViewDailog.value = true;
};

const makeDefault = async (ver) => {
  try {
    loading.value = true;

    const res = await libraryStore.publish({
      id: item.key,
      version: ver.version,
    });
    setItem(res.data.data);

    show({
      message: `Version - ${res.data.data.defaultVersion} activated successfully`,
      color: "success",
    });
  } catch (error) {
    const { data = {} } = error?.response || {};

    show({
      message: data.statusMessage || "Failed to Publish",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
};

const schemaErrors = computed(() => {
  const errs = [];
  const s = item.optionSchema;
  if (!s) {
    errs.push("Schema cannot be empty");
    return errs;
  }
  if (!Array.isArray(s.properties)) {
    errs.push("`properties` must be an array.");
    return errs;
  }
  const seen = new Set();
  s.properties.forEach((p, i) => {
    if (!p || typeof p !== "object") {
      errs.push(`Property[${i}] must be an object.`);
      return;
    }
    if (!p.label) errs.push(`Property[${i}] missing "label".`);
    if (!p.code) errs.push(`Property[${i}] missing "code".`);
    if (p.code && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p.code))
      errs.push(
        `Property[${i}] code "${p.code}" must start with a letter/_ and contain only letters, numbers, _.`
      );
    if (p.code) {
      if (seen.has(p.code)) errs.push(`Duplicate code "${p.code}".`);
      seen.add(p.code);
    }
    if (!p.type) errs.push(`Property[${i}] missing "type".`);
    else if (!["string", "number", "boolean", "select"].includes(p.type))
      errs.push(
        `Property[${i}] type must be one of: string | number | boolean.`
      );
  });
  return errs;
});

const optionsErrors = computed(() => {
  const exists = (v) => v !== "" && v !== undefined && v !== null;

  const errs = [];
  const { properties } = item.optionSchema;
  item.options.forEach((row, rIdx) => {
    properties.forEach((p) => {
      const val = row[p.code];
      const label = p.label || p.code;
      const required = !!p.required;
      if (required && !exists(val)) {
        errs.push(`Row ${rIdx + 1}: ${label} is required.`);
      } else if (p.type === "number" && exists(val) && isNaN(Number(val))) {
        errs.push(`Row ${rIdx + 1}: ${label} must be a number.`);
      } else if (
        p.type === "boolean" &&
        exists(val) &&
        !(val === true || val === false)
      ) {
        errs.push(`Row ${rIdx + 1}: ${label} must be true/false.`);
      }
    });
  });
  return errs;
});

const save = async ({ publish }) => {
  try {
    loading.value = true;

    let validationResult = await formRef.value.validate();

    if (!validationResult.valid) return;

    if (schemaErrors.value.length)
      return show({ message: "Invalid Option Schema", color: "error" });

    if (!item.options.length)
      return show({
        message: "Please add at least one option before saving.",
        color: "error",
      });

    if (optionsErrors.value.length) return;

    item.key = toCode(item.label);

    let res;
    if (!item._id) {
      res = await libraryStore.create(item);
    } else {
      res = await libraryStore.update({ id: item.key, ...item });
    }
    setItem(res.data.data);

    if (!publish)
      show({ message: "Your changes have been saved.", color: "success" });

    router.push({ name: "config-library-add-id?", params: { id: item.key } });

    return true;
  } catch (error) {
    const { data = {} } = error?.response || {};

    show({ message: data.statusMessage || "Failed to Save", color: "error" });

    return false;
  } finally {
    loading.value = false;
  }
};

const publish = async () => {
  const saved = await save({ publish: true });

  if (saved) {
    try {
      loading.value = true;

      const res = await libraryStore.publish({ id: item.key });
      setItem(res.data.data);

      show({
        message: `Version - ${res.data.data.defaultVersion} published successfully`,
        color: "success",
      });

      // router.push({ name: "config-library-list" });
    } catch (error) {
      const { data = {} } = error?.response || {};

      show({
        message: data.statusMessage || "Failed to Publish",
        color: "error",
      });
    } finally {
      loading.value = false;
    }
  }
};

const setItem = (i) => {
  Object.assign(
    item,
    JSON.parse(
      JSON.stringify(
        i
          ? {
              ...i,
              ...(!i.optionSchema?.properties?.length
                ? { optionSchema: DEFAULT_OPTION_SCHEMA }
                : {}),
            }
          : DEFAULT_ITEM
      )
    )
  );
  Object.assign(
    itemCopy,
    JSON.parse(
      JSON.stringify(
        i
          ? {
              ...i,
              ...(!i.optionSchema?.properties?.length
                ? { optionSchema: DEFAULT_OPTION_SCHEMA }
                : {}),
            }
          : DEFAULT_ITEM
      )
    )
  );
};

onMounted(() => {
  if (PARAM_KEY) {
    loading.value = true;
    libraryStore
      .read({ id: PARAM_KEY })
      .then((response) => {
        setItem(response.data.data);
      })
      .catch((error) => {
        console.log(error);
        show({ message: "Something went wrong", color: "error" });
      })
      .finally(() => {
        loading.value = false;
      });
  }
});
</script>

<template>
  <VCard flat class="editor-container">
    <VCardText class="d-flex align-center flex-wrap gap-4 pb-0">
      <div class="me-3 d-flex gap-3"></div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <VBtn
          variant="tonal"
          color="secondary"
          :to="{ name: 'config-library-list' }"
        >
          Exit
        </VBtn>

        <VBtn
          v-if="tab === 'versions'"
          prepend-icon="tabler-plus"
          color="primary"
          @click="tab = 'details'"
        >
          New Version</VBtn
        >

        <VBtn
          v-if="tab === 'details'"
          color="primary"
          @click="save"
          :loading="loading"
          :disabled="disableSave"
        >
          Save Changes <VIcon end icon="mdi-file-cloud"
        /></VBtn>

        <VBtn
          v-if="tab === 'details'"
          color="primary"
          @click="publish"
          :loading="loading"
          :disabled="disablePublish"
        >
          Publish <VIcon end icon="mdi-rocket-launch-outline"
        /></VBtn>
      </div>
    </VCardText>

    <VTabs v-model="tab">
      <VTab value="details"> Details </VTab>
      <VTab value="versions"> Versions </VTab>
    </VTabs>

    <VWindow v-model="tab">
      <!-- Details Tab -->
      <VWindowItem value="details">
        <VCardText>
          <!-- Basic Details -->
          <VForm ref="formRef">
            <VRow>
              <VCol cols="4">
                <AppTextField
                  v-model="item.label"
                  label="Name"
                  placeholder="Enter a unique library name"
                  :rules="[requiredValidator]"
                  :readonly="!!item._id"
                />
              </VCol>
              <VCol cols="6">
                <AppTextField
                  v-model="item.description"
                  label="Description"
                  placeholder="Optional"
                />
              </VCol>
              <VCol cols="2">
                <AppTextField
                  v-if="item.defaultVersion"
                  :value="item.defaultVersion"
                  label="Active Version"
                  readonly
                  :append-inner-icon="
                    item.versions?.length > 1 ? 'mdi-pencil' : null
                  "
                  @click:append-inner="tab = 'versions'"
                />
              </VCol>
            </VRow>
          </VForm>

          <VDivider class="ma-10" />

          <!-- Options -->
          <VRow>
            <VCol cols="7" class="pt-0">
              <!-- <h3>New Draft > v2</h3> -->
              <div class="d-flex align-center">
                <VIcon
                  icon="mdi-format-list-bulleted"
                  color="primary"
                  class="me-2"
                />
                <span class="text-h6 font-weight-medium me-2">
                  Draft Version
                </span>
                <VChip color="primary">
                  {{ nextVersion }}
                </VChip>
              </div>
            </VCol>
            <VCol cols="5" class="pt-0 d-flex justify-end gap-4">
              <VBtn variant="tonal" @click="schemaDrawer = true" class="mr-2">
                <VIcon>mdi-cog</VIcon>
                <VTooltip activator="parent">Configure schema</VTooltip>
              </VBtn>
              <VBtn
                prepend-icon="tabler-plus"
                @click="openOptionDialog()"
                width="160px"
                >New</VBtn
              >
            </VCol>
          </VRow>

          <VAlert
            v-if="optionsErrors.length"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            <div v-for="(e, i) in optionsErrors" :key="i">{{ e }}</div>
          </VAlert>

          <VRow class="mt-0">
            <VCol cols="12">
              <MyDataTable :headers="optionHeaders" :items="item.options">
                <template #item="{ item, index }">
                  <tr>
                    <!-- Loop through headers to maintain column order -->
                    <td v-for="header in optionHeaders" :key="header.key">
                      <template
                        v-if="typeof item.raw[header.key] === 'boolean'"
                      >
                        <span v-if="item.raw[header.key]">✅</span>
                        <span v-else>❌</span>
                      </template>
                      <template v-else-if="header.key === 'actions'">
                        <VIcon
                          icon="mdi-pencil"
                          size="small"
                          class="me-2"
                          color="primary"
                          @click="openOptionDialog(item.raw, index)"
                        />
                        <VIcon
                          icon="mdi-delete"
                          size="small"
                          color="error"
                          @click="removeOption(index)"
                        />
                      </template>
                      <template v-else>
                        {{ item.raw[header.key] }}
                      </template>
                    </td>
                  </tr>
                </template>
              </MyDataTable>
            </VCol>
          </VRow>
        </VCardText>
      </VWindowItem>

      <!-- Versions Tab -->
      <VWindowItem value="versions">
        <VCardText>
          <MyDataTable
            :headers="[
              { title: 'Version', key: 'version' },
              { title: 'Active', key: 'isDefault' },
              { title: 'Published@', key: 'published.stamp' },
              { title: 'Published By', key: 'published.byUser' },
              {
                title: 'Actions',
                key: 'actions',
                sortable: false,
              },
            ]"
            :items="item.versions"
          >
            <template #item.isDefault="{ item }">
              <VIcon v-if="item.raw.isDefault" color="success">
                mdi-check-circle
              </VIcon>
            </template>
            <template #item.published.stamp="{ item }">
              {{ smartFormatDate(item.raw.published.stamp) }}
            </template>
            <template #item.actions="{ item }">
              <IconBtn
                size="small"
                color="info"
                class="mr-2"
                @click="viewOptions(item.raw)"
              >
                <VIcon icon="mdi-eye" />
                <VTooltip activator="parent">View</VTooltip>
              </IconBtn>

              <IconBtn
                size="small"
                color="warning"
                @click="rollbackToDraft(item.raw)"
              >
                <VIcon icon="mdi-history" />
                <VTooltip activator="parent"> Rollback</VTooltip>
              </IconBtn>

              <IconBtn
                v-if="!item.raw.isDefault"
                size="small"
                color="primary"
                class="mr-2"
                @click="makeDefault(item.raw)"
              >
                <VIcon icon="mdi-star-outline" />
                <VTooltip activator="parent"> Activate</VTooltip>
              </IconBtn>
            </template>
          </MyDataTable>
        </VCardText>
      </VWindowItem>
    </VWindow>

    <!-- Option Add Dialog -->
    <VDialog v-model="optionDialog" max-width="500">
      <VCard>
        <VCardTitle
          >{{ optionEditingIndex > -1 ? "Edit" : "Add" }} Option</VCardTitle
        >
        <VCardText>
          <VForm ref="optionFormRef">
            <VRow class="mb-4 align-end">
              <template
                v-for="field in item.optionSchema.properties"
                :key="field.code"
                class="mb-2"
              >
                <!-- Boolean Input -->
                <VCol v-if="field.type === 'boolean'" cols="12" md="12">
                  <div>
                    <label class="font-weight-medium mb-2 d-block">
                      {{ field.label }}
                    </label>
                    <VBtnToggle
                      v-model="optionEditing[field.code]"
                      mandatory
                      divided
                      color="primary"
                      density="compact"
                    >
                      <VBtn :value="true">Yes</VBtn>
                      <VBtn :value="false">No</VBtn>
                    </VBtnToggle>
                  </div>
                </VCol>

                <!-- Select Input -->
                <VCol v-else-if="field.type === 'select'" cols="12" md="12">
                  <AppSelect
                    v-model="optionEditing[field.code]"
                    :label="field.label"
                    :items="field.options"
                    :rules="[field.required ? requiredValidator : null]"
                    clearable
                  />
                </VCol>

                <!-- Number Input -->
                <VCol v-else-if="field.type === 'number'" cols="12" md="12">
                  <AppTextField
                    v-model="optionEditing[field.code]"
                    :label="field.label"
                    :type="'number'"
                    :rules="[field.required ? requiredValidator : null]"
                  />
                </VCol>

                <!-- Text Input -->
                <VCol v-else cols="12" md="12">
                  <AppTextField
                    v-model="optionEditing[field.code]"
                    :label="field.label"
                    :rules="[field.required ? requiredValidator : true]"
                    v-bind="
                      field.locked &&
                      field.code === 'code' &&
                      !optionEditing[field.code]
                        ? {
                            hint: 'Leave blank to auto-generate from label',
                            'persistent-hint': true,
                          }
                        : {}
                    "
                  />
                </VCol>
              </template>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn color="secondary" @click="optionDialog = false">Cancel</VBtn>
          <VBtn color="primary" @click="saveOption">Save</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- View Options Dialog -->
    <VDialog v-model="optionViewDailog" max-width="800">
      <VCard>
        <VCardTitle>Options</VCardTitle>
        <VCardText>
          <MyDataTable :headers="optionViewHeaders" :items="optionView">
            <template #item="{ item }">
              <tr>
                <td v-for="header in optionViewHeaders" :key="header.key">
                  <template v-if="typeof item.raw[header.key] === 'boolean'">
                    <span v-if="item.raw[header.key]">✅</span>
                    <span v-else>❌</span>
                  </template>
                  <template v-else>
                    {{ item.raw[header.key] }}
                  </template>
                </td>
              </tr>
            </template>
          </MyDataTable>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Option Schema Drawer -->
    <VNavigationDrawer
      v-model="schemaDrawer"
      temporary
      :scrim="false"
      location="right"
      width="700"
      absolute
    >
      <VToolbar flat>
        <VToolbarTitle>Option Schema</VToolbarTitle>
        <VSpacer />
        <VBtn icon="mdi-close" @click="schemaDrawer = false" />
      </VToolbar>

      <VCard flat>
        <VCardText>
          <!-- Schema editor UI will go here -->
          <OptionsSchema v-model:schema="item.optionSchema" />
        </VCardText>
      </VCard>
    </VNavigationDrawer>
  </VCard>
</template>

<style scoped lang="scss">
.editor-container {
  min-height: calc(100vh - 130px);
}
</style>
