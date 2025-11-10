<script setup>
import { ref, onMounted, inject, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '@/app-lead/views/admin/campaigns/useCampaignStore'
import { useFormsStore } from '@/app-lead/views/admin/forms/useFormsStore'
import { requiredValidator } from '@app-lead/@core/utils/validators'

const { show } = inject('snackbar')
const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()
const formsStore = useFormsStore()

const PARAM_ID = route.params.id
const isEditMode = !!PARAM_ID

const isLoading = ref(false)
const isFetchingForms = ref(false)
const formRef = ref(null)
const byUser = window.CONST?.USER?.user || null

const formList = ref([])

const campaignData = ref({
  title: '',
  code: '',
  description: '',
  formId: null,
  isActive: true,
})

watch(
  () => campaignData.value.title,
  newTitle => {
    if (newTitle && !isEditMode) {
      campaignData.value.code = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    }
  }
)

const fetchForms = async () => {
  isFetchingForms.value = true
  try {
    const response = await formsStore.fetchFormsForDropdown()
    formList.value = response?.results || []
  } catch (error) {
    console.error('Failed to fetch forms:', error)
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to fetch forms list.'
    show({ message: errorMessage, color: 'error' })
  } finally {
    isFetchingForms.value = false
  }
}

const fetchCampaign = async (id) => {
  isLoading.value = true
  try {
    const data = await campaignStore.fetchCampaign(id)
    if (!data) throw new Error('Campaign not found')

    campaignData.value = {
      title: data.title ?? '',
      code: data.code ?? '',
      description: data.description ?? '',
      formId: data.form?.id || data.form?._id || data.formId || null,
      isActive: data.isActive ?? true,
    }
  } catch (error) {
    console.error(error)
    const errorMessage =
      error.response?.data?.message || error.message || 'Failed to fetch campaign data'
    show({ message: errorMessage, color: 'error' })
    router.push({ name: 'admin-campaigns-list' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchForms()
  if (isEditMode) fetchCampaign(PARAM_ID)
})

const submitForm = async () => {
  const { valid } = (await formRef.value?.validate()) || { valid: false }
  if (!valid) return

  isLoading.value = true

  const selectedForm =
    formList.value.find(f => f._id === campaignData.value.formId) || null

  if (!selectedForm) {
    show({ message: 'Please select a valid form.', color: 'error' })
    isLoading.value = false
    return
  }

  const payload = {
    title: campaignData.value.title,
    code: campaignData.value.code,
    description: campaignData.value.description,
    formId: campaignData.value.formId,
    formTitle: selectedForm.title,
    formCode: selectedForm.code,
    isActive: campaignData.value.isActive,
    byUser,
  }

  try {
    if (isEditMode) {
      await campaignStore.updateCampaign({ id: PARAM_ID, payload })
      show({ message: 'Campaign updated successfully', color: 'success' })
    } else {
      await campaignStore.createCampaign(payload)
      show({ message: 'Campaign created successfully', color: 'success' })
    }
    router.push({ name: 'admin-campaigns-list' })
  } catch (error) {
    console.error(error)
    const action = isEditMode ? 'update' : 'create'
    const errorMessage =
      error.response?.data?.message || error.message || `Failed to ${action} campaign`
    show({ message: errorMessage, color: 'error' })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VForm ref="formRef" @submit.prevent="submitForm">
        <VCard>
          <VCardItem>
            <VCardTitle>{{ isEditMode ? 'Edit Campaign' : 'Create Campaign' }}</VCardTitle>
          </VCardItem>

          <VDivider />

          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField
                  v-model="campaignData.title"
                  label="Campaign Title"
                  placeholder="Enter Campaign Title"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="campaignData.code"
                  label="Code"
                  placeholder="Enter Campaign Code"
                  :rules="[requiredValidator]"
                  :disabled="isEditMode"
                />
              </VCol>

              <VCol cols="12">
                <AppTextarea
                  v-model="campaignData.description"
                  label="Description"
                  placeholder="Enter Campaign Description"
                  rows="3"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppSelect
                  v-model="campaignData.formId"
                  label="Select Form"
                  placeholder="Select a form to attach"
                  :items="formList"
                  item-title="title"
                  item-value="_id"
                  :rules="[requiredValidator]"
                  :loading="isFetchingForms"
                  :disabled="isEditMode"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSwitch v-model="campaignData.isActive" label="Active" />
              </VCol>
            </VRow>
          </VCardText>

          <VDivider />

          <VCardText>
            <VRow>
              <VCol cols="12" class="d-flex gap-4">
                <VBtn type="submit" :loading="isLoading">
                  {{ isEditMode ? 'Update' : 'Create' }}
                </VBtn>

                <VBtn
                  color="secondary"
                  variant="tonal"
                  :to="{ name: 'admin-campaigns-list' }"
                >
                  Cancel
                </VBtn>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VForm>
    </VCol>
  </VRow>
</template>
