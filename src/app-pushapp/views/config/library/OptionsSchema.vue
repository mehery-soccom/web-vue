<script setup>
import { requiredValidator } from "@app-pushapp/@core/utils/validators";

/**
 * v-model:schema — expects { properties: Array<Field> }
 */
const schemaModel = defineModel("schema", {
  type: Object,
  default: () => ({ properties: [] }),
});

// ---------- Local UI state ----------
const isEditing = ref(false);
const editingIndex = ref(-1);
const draftField = ref(initDraft());
const formRef = ref();

// ---------- Helpers ----------
function initDraft() {
  return { label: "", code: "", type: "string", required: false };
}

const fields = computed({
  get: () => schemaModel.value?.properties ?? [],
  set: (val) => {
    schemaModel.value = {
      ...(schemaModel.value || {}),
      properties: val,
    };
  },
});

// Ensure locked defaults always exist
if (!fields.value.some((f) => f.code === "label")) {
  fields.value.unshift({
    label: "Label",
    code: "label",
    type: "string",
    required: true,
    locked: true,
  });
}
if (!fields.value.some((f) => f.code === "code")) {
  fields.value.unshift({
    label: "Code",
    code: "code",
    type: "string",
    required: true,
    locked: true,
  });
}

// ---------- Actions ----------
function startAdd() {
  isEditing.value = true;
  editingIndex.value = -1;
  draftField.value = initDraft();
}

function startEdit(idx) {
  const f = fields.value[idx];
  if (f?.locked) return; // locked: no edit
  isEditing.value = true;
  editingIndex.value = idx;
  draftField.value = { ...f };
}

function cancelEdit() {
  isEditing.value = false;
  editingIndex.value = -1;
  draftField.value = initDraft();
}

function toCode(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

async function saveField() {
  let validationResult = await formRef.value.validate();
  if (!validationResult.valid) return;

  const d = { ...draftField.value };
  d.label = String(d.label || "").trim();
  d.code = toCode(d.code || d.label);

  const dup = fields.value.some((f, i) => {
    if (i === editingIndex.value) return false;
    return (
      f.label.trim().toLowerCase() === d.label.toLowerCase() ||
      String(f.code).trim().toLowerCase() === d.code.toLowerCase()
    );
  });
  if (dup) return alert("Duplicate label or code not allowed.");

  const updated = [...fields.value];
  if (editingIndex.value > -1) {
    const wasLocked = !!updated[editingIndex.value]?.locked;
    updated[editingIndex.value] = {
      ...d,
      ...(wasLocked ? { locked: true } : {}),
    };
  } else {
    updated.push({ ...d });
  }
  fields.value = updated;

  cancelEdit();
}

function deleteField(idx) {
  const f = fields.value[idx];
  if (f?.locked) return;
  fields.value = fields.value.filter((_, i) => i !== idx);
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-5">
      <div></div>
      <VBtn size="small" @click="startAdd">Add Field</VBtn>
    </div>

    <!-- Table mode -->
    <VTable v-if="!isEditing" density="compact" class="elevation-1">
      <thead>
        <tr>
          <th>Label</th>
          <th>Code</th>
          <th>Type</th>
          <th>Mandatory</th>
          <th style="width: 120px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in fields" :key="`${f.code}-${i}`">
          <td>
            {{ f.label }}
            <VChip
              v-if="f.locked"
              size="x-small"
              class="ml-2"
              density="comfortable"
              color="grey"
              variant="tonal"
              label
            >
              locked
            </VChip>
          </td>
          <td>{{ f.code }}</td>
          <td>{{ f.type }}</td>
          <td>{{ f.required ? "Yes" : "No" }}</td>
          <td>
            <VBtn
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              :disabled="f.locked"
              @click="startEdit(i)"
            />
            <VBtn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              :disabled="f.locked"
              @click="deleteField(i)"
            />
          </td>
        </tr>
      </tbody>
    </VTable>

    <!-- Form mode -->
    <VForm v-else ref="formRef" class="pa-3 border rounded">
      <AppTextField
        v-model="draftField.label"
        label="Label"
        :rules="[requiredValidator]"
      />
      <AppTextField
        v-model="draftField.code"
        label="Code"
        class="mt-3"
        hint="Leave blank to auto-generate from label"
        persistent-hint
      />
      <AppSelect
        v-model="draftField.type"
        :items="['string', 'number', 'boolean', 'pages']"
        label="Type"
        class="mt-3"
        :rules="[requiredValidator]"
      />
      <div class="d-flex align-center mt-4">
        <span class="me-2">Mandatory</span>
        <VSwitch
          v-model="draftField.required"
          color="primary"
          hide-details
          inset
        />
      </div>
      <div class="d-flex gap-2 mt-10 justify-end">
        <VBtn variant="tonal" @click="cancelEdit">Cancel</VBtn>
        <VBtn color="primary" @click="saveField">Save</VBtn>
      </div>
    </VForm>
  </div>
</template>
