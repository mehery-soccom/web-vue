<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FieldEditable from '@app-lead/views/admin/fields/FieldEditable.vue'
import { useFieldsStore } from '@app-lead/views/admin/fields/useFieldsStore'

const { show } = inject('snackbar')
const route = useRoute()
const router = useRouter()
const fieldsStore = useFieldsStore()

const PARAM_ID = route.params.id
const isLoading = ref(false)
const formRef = ref()

const fieldData = ref({
  title: '',
  code: '',
  desc: '',
  inputType: null,
  isActive: true,
  optional: false,
  options: [],
})

const fetchField = async id => {
  try {
    const response = await fieldsStore.fetchFields({ fieldId: id })
    if (response.results && response.results.length > 0) {
      fieldData.value = response.results[0]
    } else {
      throw new Error('Field not found')
    }
  } catch (error) {
    console.error(error)
    show({ message: 'Failed to fetch field data', color: 'error' })
    router.push({ name: 'admin-fields-list' }) 
  }
}

onMounted(() => {
  if (PARAM_ID) {
    fetchField(PARAM_ID)
  }
})

const submitForm = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  isLoading.value = true
  
  const payload = { ...fieldData.value }
  if (payload.inputType !== 'OPTIONS') {
    delete payload.options
  }
  payload.byUser = window.CONST?.USER.user

  try {
    if (PARAM_ID) {
      await fieldsStore.updateField({ id: PARAM_ID }, { ...payload })
      show({ message: 'Field updated successfully', color: 'success' })
    } else {
      await fieldsStore.createField({ ...payload })
      show({ message: 'Field created successfully', color: 'success' })
    }
    router.push({ name: 'admin-fields-list' })
  } catch (error) {
    console.error(error)
    show({ message: `Failed to ${PARAM_ID ? 'update' : 'create'} field`, color: 'error' })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12" md="9">
      <VForm ref="formRef" @submit.prevent="submitForm">
        <VRow>
          <VCol cols="12">
            <FieldEditable :data="fieldData" />
          </VCol>

          <VCol
            cols="12"
            class="d-flex gap-4"
          >
            <VBtn
              type="submit"
              :loading="isLoading"
            >
              {{ PARAM_ID ? 'Update' : 'Create' }}
            </VBtn>
            <VBtn
              color="secondary"
              variant="tonal"
              :to="{ name: 'admin-fields-list' }"
            >
              Cancel
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCol>
  </VRow>
</template>