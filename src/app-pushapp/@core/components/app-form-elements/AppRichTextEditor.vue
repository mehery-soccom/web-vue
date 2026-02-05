<script setup>
import Editor from '@tinymce/tinymce-vue'
import { computed, useAttrs } from 'vue'

defineOptions({
  name: 'AppRichTextEditor',
  inheritAttrs: false,
})

/* v-model support */
const modelValue = defineModel({ type: String, default: '' })

const props = defineProps({
  height: { type: [Number, String], default: 300 },
  menubar: { type: [Boolean, String], default: false },
  toolbar: { type: String, default: null },
  plugins: { type: [String, Array], default: null },
  readonly: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
})

const attrs = useAttrs()

const elementId = computed(() => {
  const token = attrs.id || attrs.label
  return token
    ? `app-richtext-${token}-${Math.random().toString(36).slice(2, 7)}`
    : undefined
})

const label = computed(() => attrs.label)

const initConfig = computed(() => ({
  height: props.height,
  menubar: props.menubar,
  readonly: props.readonly,
  placeholder: props.placeholder,
  statusbar: false,

  plugins:
    props.plugins ??
    [
      'advlist', 'autolink', 'lists', 'link', 'image',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount',
    ],

  toolbar:
    props.toolbar ??
    'undo redo | blocks fontfamily fontsize | ' +
    'bold italic underline strikethrough forecolor backcolor| ' +
    'alignleft aligncenter alignright alignjustify | ' +
    'bullist numlist outdent indent | ' +
    'link image media table | ' +
    'code fullscreen | help',
}))

const tinymceSrc = computed(
  () => `${window.CONST.CDN_URL}/pushapp/tinymce/tinymce.min.js`
)
</script>

<template>
  <div class="app-richtext-editor flex-grow-1">
    <VLabel
      v-if="label"
      :for="elementId"
      class="mb-1 text-body-2 text-high-emphasis"
      :text="label"
    />

    <Editor
      :id="elementId"
      v-model="modelValue"
      :init="initConfig"
      :tinymce-script-src="tinymceSrc"
      v-bind="attrs"
    />
  </div>
</template>

<style>
/* fallback */
.tox-statusbar {
  display: none !important;
}
</style>
