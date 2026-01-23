<script setup>
import Editor from '@tinymce/tinymce-vue'
import { computed, useAttrs } from 'vue'

defineOptions({
  name: 'MyRichTextEditor',
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

const initConfig = computed(() => ({
  height: props.height,
  menubar: props.menubar,
  readonly: props.readonly,
  placeholder: props.placeholder,

  plugins:
    props.plugins ??
    ['advlist','autolink','lists','link','image','charmap',
    'searchreplace','visualblocks','code','fullscreen',
    'insertdatetime','media','table','help','wordcount'],

  toolbar:
    props.toolbar ??
    'undo redo | blocks fontfamily fontsize | \
    bold italic underline strikethrough | \
    alignleft aligncenter alignright alignjustify | \
    bullist numlist outdent indent | \
    link image media table | \
    charmap insertdatetime | \
    searchreplace visualblocks code fullscreen | \
    help',
}))

const getScript = () => {
    console.log("urlll", window.CONST.CDN_URL + '/pushapp/tinymce/tinymce.min.js');
    return window.CONST.CDN_URL + '/pushapp/tinymce/tinymce.min.js'
}
</script>

<template>
  <Editor
    v-model="modelValue"
    :init="initConfig"
    :tinymce-script-src="getScript()"
    v-bind="attrs"
  />
</template>
<style>
.tox-statusbar{
    display: none !important;
}
</style>