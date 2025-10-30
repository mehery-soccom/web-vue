<script setup>
import { ref } from 'vue';

const name = ref('');
const form = ref(null); 
const valid = ref(false); 

const rules = {
  required: value => !!value || 'Name is required.',
  min: value => value.length >= 3 || 'Name must be at least 3 characters.',
};


const submitForm = () => {
  if (valid.value) {
    console.log('Form is valid and submitted! Name:', name.value);
  } else {
    console.log('Form is invalid. Please check fields.');
  }
};

const resetForm = () => {
  form.value.reset();
  name.value = '';
};
</script>

<template>
  <v-container>
    <h2>Simple VForm Example</h2>
    
    <v-form 
      ref="form"
      v-model="valid" 
      @submit.prevent="submitForm"
      lazy-validation
    >
      <v-text-field
        v-model="name"
        :rules="[rules.required, rules.min]"
        label="Enter Your Name"
        required
        counter
      ></v-text-field>

      <v-row>
        <v-col cols="6">
          <v-btn
            color="success"
            type="submit"
            :disabled="!valid" 
            block
          >
            Submit
          </v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn
            color="error"
            @click="resetForm"
            block
          >
            Reset
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped>
.v-container {
  max-width: 400px;
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>