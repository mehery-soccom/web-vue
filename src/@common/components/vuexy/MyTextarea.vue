<script setup>
import { ref, onMounted, onUnmounted, useAttrs } from "vue";
import { Textcomplete, Textarea } from "textcomplete";
import getCaretCoordinates from "textarea-caret";

const props = defineProps({
  suggestions: {
    type: Array,
    required: true,
  },
});

const attrs = useAttrs();

function flattenKeys(obj = {}, parent = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = parent ? `${parent}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flattenKeys(value, path)
      : path;
  });
}

const flatSuggestions = computed(() => {
  const appendSuggestions = ["data."]; // can be a prop
  return [...flattenKeys(props.suggestions), ...appendSuggestions];
});

const model = defineModel({ type: String, default: "" });

const textareaRef = ref(null);

let textcompleteInstance = null;

let editorEl = null;

const setupTextcomplete = () => {
  editorEl = textareaRef.value?.$el?.querySelector("textarea");
  if (!editorEl) return;

  const textcomplete = new Textcomplete(new Textarea(editorEl));
  textcompleteInstance = textcomplete;

  textcomplete.register([
    {
      id: "template-vars",
      match: /{{\s*([\w.]*)$/,
      index: 1,
      search(term, callback) {
        const safeTerm = (term || "").trim();
        const filtered = flatSuggestions.value.filter((v) =>
          v.toLowerCase().includes(safeTerm.toLowerCase())
        );
        callback(filtered);
      },
      replace(varName) {
        return varName.endsWith(".") ? `{{${varName}` : `{{${varName}}}`;
      },
    },
  ]);

  // Ensure dropdown appended to body
  textcomplete.on("rendered", () => {
    const dropdownEl = textcomplete.dropdown?.el;
    if (dropdownEl && !document.body.contains(dropdownEl)) {
      document.body.appendChild(dropdownEl);
    }
  });

  const reposition = () => {
    const dropdownEl = document.querySelector(".textcomplete-dropdown");
    if (!dropdownEl || !editorEl) return;

    const caret = getCaretCoordinates(editorEl, editorEl.selectionEnd);
    const rect = editorEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    dropdownEl.style.top = `${caret.top + rect.top + scrollTop + 20}px`; // add offset
    dropdownEl.style.left = `${caret.left + rect.left + scrollLeft}px`;
    dropdownEl.style.minWidth = `160px`;
  };

  window.addEventListener("scroll", reposition, true);
  window.addEventListener("resize", reposition);
  document.addEventListener("click", hideDropdown);
};

const hideDropdown = () => {
  textcompleteInstance?.hide();
};

onMounted(setupTextcomplete);

onUnmounted(() => {
  document.removeEventListener("click", hideDropdown);
  window.removeEventListener("scroll", customReposition, true);
  window.removeEventListener("resize", customReposition);
});
</script>

<template>
  <AppTextarea
    ref="textareaRef"
    v-model="model"
    class="textcomplete-input"
    v-bind="attrs"
  />
</template>

<style>
.textcomplete-dropdown {
  position: absolute !important;
  z-index: 9999;
  background-color: var(--v-theme-surface, #fff);
  border: 1px solid var(--v-border-color, #ccc);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  font-size: 14px;
  min-width: 160px;
  max-height: 240px;
  overflow-y: auto;
  backdrop-filter: blur(4px);
}

.textcomplete-item {
  padding: 8px 14px;
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  color: var(--v-theme-on-surface, #212121);
}

.textcomplete-item.active,
.textcomplete-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  color: var(--v-theme-on-primary, #000);
}

/* Dark theme support */
.v-theme--dark .textcomplete-dropdown {
  background-color: var(--v-theme-surface, #121212);
  border-color: var(--v-border-color, #333);
}

.v-theme--dark .textcomplete-item {
  color: var(--v-theme-on-surface, #eee);
}

.v-theme--dark .textcomplete-item.active,
.v-theme--dark .textcomplete-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.2);
  color: var(--v-theme-on-primary, #fff);
}

/* Hide empty header/footer */
.textcomplete-header:empty,
.textcomplete-footer:empty {
  display: none !important;
}
</style>
