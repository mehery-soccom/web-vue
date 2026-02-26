<script setup>
import { ref, computed, watch } from 'vue'
import { requiredValidator } from '@app-tikat/@core/utils/validators'

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
})

if (!props.data.options) {
  props.data.options = []
}

watch(() => props.data.label, (newLabel) => {
  if (newLabel) {
    props.data.key = newLabel.toLowerCase().replace(/ /g, '_')
  }
})

const inputTypeOptions = [
  { title: 'TEXT', value: 'TEXT' },
  { title: 'PHONE', value: 'PHONE' },
  { title: 'EMAIL', value: 'EMAIL' },
  { title: 'RATING', value: 'RATING' },
  { title: 'DROPDOWN', value: 'OPTIONS' },
  { title: 'DOCUMENT', value: 'DOCUMENT' },
  { title: 'BOOLEAN', value: 'BOOLEAN' },
  { title: 'DATE', value: 'DATE' },
  // {title: 'QUESTION', value: 'QUESTION' },
]

const newOptionLabel = ref('')
const newOptionCode = ref('')

const isMandatory = computed({
  get: () => !props.data.optional,
  set: val => {
    props.data.optional = !val
  },
})

const addOption = () => {
  if (newOptionLabel.value && newOptionCode.value) {
    props.data.options.push({
      label: newOptionLabel.value,
      code: newOptionCode.value,
    })
    newOptionLabel.value = ''
    newOptionCode.value = ''
  }
}

const removeOption = index => {
  props.data.options.splice(index, 1)
}

watch(newOptionLabel, (val) => {
  if (val) {
    newOptionCode.value = val.replace(/ /g, '_').toLowerCase()
  } else {
    newOptionCode.value = ''
  }
})
</script>

<template>
  <VCard title="Field Details">
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <AppTextField
            v-model="data.label"
            label="Label"
            placeholder="e.g., Verification Document"
            :rules="[requiredValidator]"
          />
        </VCol>
        
        <VCol cols="12" md="6">
          <AppTextField
            v-model="data.key"
            label="Key"
            placeholder="e.g., ver_doc"
            :rules="[requiredValidator]"
          />
        </VCol>

        <VCol cols="12">
          <AppTextField
            v-model="data.desc"
            label="Description"
            placeholder="Enter Field Description"
            rows="2"
          />
        </VCol>

        <VCol cols="12" md="6">
          <AppSelect
            v-model="data.inputType"
            label="Input Type"
            placeholder="Select Input Type"
            :items="inputTypeOptions"
            item-title="title"
            item-value="value"
            :rules="[requiredValidator]"
          />
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="6" md="3">
          <VSwitch
            v-model="isMandatory"
            label="Mandatory"
          />
        </VCol>
        <VCol cols="6" md="3">
          <VSwitch
            v-model="data.isActive"
            label="Active"
          />
        </VCol>
      </VRow>
    </VCardText>

    <template v-if="data.inputType === 'OPTIONS'">
      <VDivider />
      <VCardItem>
        <VCardTitle>Configure Options</VCardTitle>
      </VCardItem>
      
      <VCardText>
        <VRow align="center">
          <VCol cols="12" md="5">
            <AppTextField
              v-model="newOptionLabel"
              label="Option Label"
              placeholder="e.g., Sedan"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="5">
            <AppTextField
              v-model="newOptionCode"
              label="Option Code"
              placeholder="e.g., sedan"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="2">
            <VBtn
              icon="tabler-plus"
              size="small"
              @click="addOption"
            />
          </VCol>
        </VRow>

        <VList
          v-if="data.options.length"
          lines="one"
          border
          class="mt-4"
        >
          <VListItem
            v-for="(option, index) in data.options"
            :key="index"
            :title="option.label"
            :subtitle="`Code: ${option.code}`"
          >
            <template #append>
              <VBtn
                icon="tabler-x"
                variant="text"
                color="error"
                size="small"
                @click="removeOption(index)"
              />
            </template>
          </VListItem>
        </VList>
      </VCardText>
    </template>
  </VCard>
</template>