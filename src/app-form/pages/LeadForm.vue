<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useFormStore } from "@/app-form/views/useFormStore"
import AppDateTimePicker from "@/app-lead/@core/components/app-form-elements/AppDateTimePicker.vue"
import { emailValidator, requiredValidator } from "@app-lead/@core/utils/validators"
import LeadDocUpload from "@/app-lead/views/admin/leads/LeadDocUpload.vue"

const route = useRoute()
const router = useRouter();
const formStore = useFormStore()

const refForm = ref(null)
const formStructure = ref(null)
const formCode = ref(null);
const formTitle = ref(null);
const formValues = ref({})
const isLoading = ref(true)
const maxDocSize = 5 * 1024 * 1024;

const phoneValidator = (value) => {
  if (!value) return true
  const phoneRegex = /^[+]?[0-9]{10,15}$/
  return phoneRegex.test(value) || "Please enter a valid phone number"
}

const getRules = (field) => {
  const rules = []
  if (field.optional === false) {
    if (field.inputType === 'BOOLEAN') {
      rules.push(value => (value !== null && value !== undefined) || 'This Field is required');
    } else {
      rules.push(requiredValidator);
    }
  }
  if (field.inputType === "EMAIL") rules.push(emailValidator)
  if (field.inputType === "PHONE") rules.push(phoneValidator)
  return rules
}

const isReadOnly = (field) => {
  return field.access?.contact === 'R' || field.access?.external === 'R';
}

onMounted(async () => {
  isLoading.value = true

  const formId = route.params.formId
  const submissionId = route.params.submissionId
  const queryParams = route.query

  if (!formId || !submissionId) {
    isLoading.value = false
    return
  }

  try {
    const response = await formStore.fetchFormData({
      formId,
      submissionId,
      params: queryParams,
    })

    const formDef = response.data.results[0]
    if (!formDef) throw new Error("No form definition found in API response.")

    const mappedFields = formDef.formFields
      .map((f) => {
        const master = formDef.masterFields[f.field_id] || null;
        if (!master) return null;
        return { ...master, access: f.access };
      })
      .filter((f) => {
         if (!f) return false;
         
         const accessCode = f.access?.contact || f.access?.external;
         if (accessCode === 'H') return false;

         return true;
      })

    formCode.value = formDef.code;
    formTitle.value = formDef.title;

    formStructure.value = {
      title: formDef.title,
      desc: formDef.desc,
      fields: mappedFields,
    }

    const initialValues = {}
    formStructure.value.fields.forEach((field) => {
      if (field.inputType === 'BOOLEAN') {
        initialValues[field.path || field.code] = false
      } else {
        initialValues[field.path || field.code] = null
      }
    })
    formValues.value = initialValues
  } catch (error) {
    formStructure.value = null
  } finally {
    isLoading.value = false
  }
})

const submitForm = async () => {
  if (!refForm.value) return

  const { valid } = await refForm.value.validate()
  if (!valid) return

  isLoading.value = true

  const apiData = Object.keys(formValues.value).reduce((acc, currentKey) => {
    const value = formValues.value[currentKey]
    const keyMap = {
      'custom.name': 'contact.name',
      'custom.email': 'contact.email',
      'custom.phone': 'contact.phone'
    }
    if (keyMap[currentKey]) {
      acc[keyMap[currentKey]] = value
    } else {
      acc[currentKey] = value
    }
    return acc
  }, {})

  const payload = {
    formCode: formCode.value,
    formTitle: formTitle.value,
    data: apiData
  };

  // console.log("Submitting payload:", payload);

  const formId = route.params.formId
  const submissionId = route.params.submissionId
  const queryParams = route.query

  try {
    await formStore.submitFormData({
      formId,
      submissionId,
      params: queryParams,
      payload
    })

    router.push({
			name: "app-form-success",
			params: { formId: formId, submissionId: submissionId },
		});
  } catch (error) {
    console.error("Error submitting form:", error);
    alert("Failed to submit form. Please try again.")
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <VContainer>
    <VRow class="justify-center">
      <VCol cols="10" md="7">
        <div v-if="isLoading" class="text-center mt-10">
          <VProgressCircular indeterminate size="64" />
          <p class="mt-4">Loading Form...</p>
        </div>

        <VForm v-else-if="formStructure" ref="refForm" @submit.prevent="submitForm">
          <VCard class="mb-6">
            <VCardItem class="text-left">
              <VCardTitle class="text-h3 ">{{ formStructure.title }}</VCardTitle>
              <VCardSubtitle v-if="formStructure.desc" class="mt-2 font-italic">
                {{ formStructure.desc }}
              </VCardSubtitle>
            </VCardItem>
          </VCard>

          <VCard
            v-for="field in formStructure.fields"
            :key="field._id"
            class="my-4"
          >
            <VCardText>
              <VLabel class="mb-2 font-weight-medium">
                {{ field.title }}
                <span v-if="field.optional === false" class="text-error">*</span>
              </VLabel>

              <VRow v-if="['TEXT', 'EMAIL', 'PHONE'].includes(field.inputType)">
                <VCol md="8">
                  <VTextField
                    v-model="formValues[field.path || field.code]"
                    :placeholder="field.desc"
                    variant="outlined"
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'OPTIONS'">
                <VCol md="8">
                  <VSelect
                    v-model="formValues[field.path || field.code]"
                    :items="field.options"
                    item-title="label"
                    item-value="code"
                    :placeholder="field.desc"
                    :rules="getRules(field)"
                    variant="outlined"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DATE'">
                <VCol md="4">
                  <AppDateTimePicker
                    v-model="formValues[field.path || field.code]"
                    :placeholder="field.desc"
                    prepend-inner-icon="tabler-calendar"
                    :rules="getRules(field)"
                    :disabled="isReadOnly(field)"
                  />
                </VCol>
              </VRow>

              <VRow v-else-if="field.inputType === 'DOCUMENT'">
                <VCol md="6">
                  <LeadDocUpload
                    :model-value="formValues[field.path || field.code]?.url || null"
                    :form-id="route.params.formId"
                    sub-dir="main"
                    :max-size="maxDocSize"
                    :disabled="isReadOnly(field)"
                    @upload-complete="payload => {
                      formValues[field.path || field.code] = {
                        name: payload.name,
                        path: payload.path,
                        url: payload.url,
                        contentType: payload.contentType,
                        contentLength: payload.contentLength,
                        title: payload.title,
                      }
                    }"
                    @update:modelValue="value => {
                      if (value === null) {
                        formValues[field.path || field.code] = null
                      }
                    }"
                  />
                  <input 
                    type="hidden" 
                    v-model="formValues[field.path || field.code]" 
                  />
                </VCol>
              </VRow>

              <VSwitch
                v-else-if="field.inputType === 'BOOLEAN'"
                v-model="formValues[field.path || field.code]"
                :rules="getRules(field)"
                :disabled="isReadOnly(field)"
              />

              <VTextField
                v-else
                :placeholder="field.desc"
                variant="outlined"
                disabled
                hint="Unsupported field type"
                :disabled="isReadOnly(field)"
              />
            </VCardText>
          </VCard>

          <VBtn class="mt-6" type="submit" block :loading="isLoading">
            Submit
          </VBtn>
        </VForm>

        <div v-else class="text-center mt-10">
          <VAlert type="error" variant="tonal">
            No form data found or the data is invalid. Please check the console for errors.
          </VAlert>
        </div>
      </VCol>
    </VRow>
  </VContainer>
</template>

<style>
.layout-wrapper.layout-blank {
  background-color: #f4f5fa;
}
</style>
