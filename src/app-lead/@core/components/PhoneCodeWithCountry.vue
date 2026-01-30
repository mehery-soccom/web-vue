<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import countryList from '@/app-lead/@core/utils/CountryCode.js';

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  rules: {
    type: Array,
    default: () => [],
  },
  defaultCountryCode: {
    type: String,
    default: '+91', 
  },
});

const emits = defineEmits(['update:modelValue']);

const selectedCountry = ref(null);
const phoneNumber = ref('');

const fullPhoneNumber = computed(() => {
  if (!phoneNumber.value) return null;
  const code = selectedCountry.value ? selectedCountry.value.dial_code : '';
  return `${code}${phoneNumber.value}`;
});

const computedRules = computed(() => {
  return props.rules.map(rule => {
    return (val) => rule(fullPhoneNumber.value);
  });
});

watch([selectedCountry, phoneNumber], () => {
  emits('update:modelValue', fullPhoneNumber.value);
});

const parseModelValue = (val) => {
  if (!val) {
    phoneNumber.value = '';
    if (!selectedCountry.value) {
      selectedCountry.value = countryList.find(c => c.dial_code === props.defaultCountryCode) || countryList[0];
    }
    return;
  }

  const strVal = String(val);

  const sortedCountries = [...countryList].sort((a, b) => b.dial_code.length - a.dial_code.length);
  
  const foundCountry = sortedCountries.find(c => strVal.startsWith(c.dial_code));

  if (foundCountry) {
    selectedCountry.value = foundCountry;
    phoneNumber.value = strVal.replace(foundCountry.dial_code, '');
  } else {
    phoneNumber.value = strVal;
  }
};

onMounted(() => {
  parseModelValue(props.modelValue);
});

watch(() => props.modelValue, (newVal) => {
  if (newVal !== fullPhoneNumber.value) {
    parseModelValue(newVal);
  }
});

const customFilter = (itemTitle, queryText, item) => {
  const text = item.raw.name.toLowerCase();
  const code = item.raw.dial_code.toLowerCase();
  const searchText = queryText.toLowerCase();
  
  return text.indexOf(searchText) > -1 || code.indexOf(searchText) > -1;
};


</script>

<template>
  <div class="d-flex gap-2 align-start">
    <VAutocomplete
      v-model="selectedCountry"
      :items="countryList"
      item-title="name"
      item-value="dial_code"
      :rules="[v => !!v || 'Required']"
      return-object
      variant="outlined"
      :custom-filter="customFilter"
      class="flex-grow-0"
      style="width: 90px; min-width: 90px;"
      autocomplete="off"
    >
      <template #selection="{ item }">
        <span class="text-body-2">{{ item.raw.dial_code }}</span>
      </template>
      <template #item="{ props, item }">
        <VListItem v-bind="props" :title="item.raw.name" :subtitle="item.raw.dial_code">
          <template #prepend>
            <span class="text-caption font-weight-bold mr-2">{{ item.raw.code }}</span>
          </template>
        </VListItem>
      </template>
    </VAutocomplete>

    <VTextField
      v-model="phoneNumber"
      :placeholder="placeholder"
      variant="outlined"
      type="number"
      :rules="computedRules" 
      class="flex-grow-1"
    />
  </div>
</template>