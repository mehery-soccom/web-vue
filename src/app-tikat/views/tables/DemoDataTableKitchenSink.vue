<script setup>
import { VDataTable } from 'vuetify/labs/VDataTable';
import { ref, toRaw, useSlots } from 'vue';
const props = defineProps({
  productList: {
    type: Array,
    required: false
  },
  headers: {
    type: Array,
    required: false
  }, 
  title: {
    type: String,
  },
  fixedColumn: {
    type: Boolean,
    default: false
  },
  itemValue: {
    type: String,
    default: 'templateId'
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
const search = ref('')
const columnSearch = reactive({})
const sortBy = ref([])
const currentSortKey = ref(null)
const currentSortOrder = ref('asc')
const expanded = ref([])
const slots = useSlots();
const hasExpand = !!slots['expanded-row'];

const toggleSort = (key) => {
  if (currentSortKey.value === key) {
    currentSortOrder.value = currentSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSortKey.value = key
    currentSortOrder.value = 'asc'
  }
}

watchEffect(() => {
  props.headers?.forEach(header => {
    if (!(header.key in columnSearch)) {
      columnSearch[header.key] = ''
    }
  })
})

const getDeepValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const filteredItems = computed(() => {
  const filterableHeaders = props.headers?.filter(header => header.searchable || header.filterable) || []

  let items = props.productList?.filter(item =>
    filterableHeaders.every(header => {
      const searchValue = String(columnSearch[header.key] ?? '').toLowerCase()
      if (!searchValue) return true

      const itemValue = String(getDeepValue(item, header.key) ?? '').toLowerCase()

      return header.filterOptions
        ? itemValue === searchValue
        : itemValue.includes(searchValue)
    })
  ) || []

  if (currentSortKey.value) {
    items = [...items].sort((a, b) => {
      const valA = getDeepValue(a, currentSortKey.value) ?? 0
      const valB = getDeepValue(b, currentSortKey.value) ?? 0

      const comparison = String(valA).localeCompare(String(valB), undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      })

      return currentSortOrder.value === 'asc' ? comparison : -comparison
    })
  }

  return items
})
// const filteredItems = computed(() => {
//   const searchableKeys = props.headers
//     ?.filter(header => header.searchable)
//     .map(header => header.key) || []

//   return props.productList?.filter(item =>
//     searchableKeys.every(key => {
//       const searchValue = columnSearch[key]?.toLowerCase?.() || ''
//       const itemValue = String(item[key] ?? '').toLowerCase()
//       return itemValue.includes(searchValue)
//     })
//   ) || []
// })

// onMounted(() => {
//   setInterval(()=>{
//     console.log("prods", props.productList, toRaw(props.productList), JSON.parse(JSON.stringify(props.productList)))
//   }, 10000)
// })
</script>

<template>
  <div>
    <VCardText>
      <VRow>
        <VCol cols="12" md="12">
          <div class="d-flex justify-space-between align-center w-100">
            <span style="font-size: 1.1rem;font-weight: 600;"> {{ props.title }} </span>
            <div style="max-width: 200px; flex-grow: 0 !important;">
            <AppTextField style="width: 200px;max-width: 200px;"
              v-model="search"
              density="compact"
              placeholder="Search"
              append-inner-icon="tabler-search"
              single-line
              hide-details
              dense
              outlined
            />
            </div>
          </div>
        </VCol>
      </VRow>
    </VCardText>

    <!-- 👉 Data Table  -->
    <VDataTable
      v-bind="$attrs"
      :headers="toRaw(props.headers)"
      :items="filteredItems"
      :search="search"
      v-model:sort-by="sortBy"
      :items-per-page="10"
      class="text-no-wrap"
      :item-value="$attrs['item-value'] ?? props.itemValue"    
      v-model:expanded="expanded"
      :show-expand="hasExpand"
      :class="{ 'fixed-column': props.fixedColumn, 'has-expand': hasExpand, 'fixed-layout': true }"
      :loading="props.loading"
    >
      <template #headers="{ columns }">
        <tr>
          <th v-for="col in columns" :key="col.key"
              @click="col.sortable && toggleSort(col.key)" 
              :style="{ width: col.width, minWidth: col.width }" 
              class="sortable-th">
              {{ col.title }}
            <span v-if="col.information" class="ml-1" :title="col.information">
              <VIcon size="18" icon="tabler-info-circle" />
            </span>
            <VIcon v-if="col.sortable && currentSortKey === col.key" class="sort-icon" size="14">
              {{ currentSortOrder === 'asc' ? 'mdi-chevron-down' : 'mdi-chevron-up' }}
            </VIcon>
          </th>
        </tr>
        <tr>
          <th v-for="column in columns" :key="column.key" :style="{ width: column.width, minWidth: column.width }">
            <select
              v-if="column.filterable && column.filterOptions"
              v-model="columnSearch[column.key]"
              class="form-control form-control-sm"
            >
              <option
                v-for="option in column.filterOptions"
                :key="option"
                :value="option"
              >
                {{ option === '' ? '--' : option.charAt(0).toUpperCase() + option.slice(1) }}
              </option>
            </select>

            <input
              v-else-if="column.searchable"
              v-model="columnSearch[column.key]"
              type="text"
              class="form-control form-control-sm"
              placeholder="🔍︎ Search"
            />
          </th>
        </tr>
      </template>

      <template #item="{ item, isExpanded, toggleExpand }">
        <tr>
          <td
            v-for="header in props.headers"
            :key="header.key"
            :style="{ width: header.width, minWidth: header.width, verticalAlign: 'middle' }"
          >
            <template v-if="header.key === 'data-table-expand'">
              <button
                v-if="$slots['expanded-row']"
                type="button"
                @click="toggleExpand(item)"
                style="border:none;background:transparent;cursor:pointer;padding:4px"
                :aria-expanded="isExpanded(item) ? 'true' : 'false'"
              >
                <VIcon small>
                  {{ isExpanded(item) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                </VIcon>
              </button>
            </template>

            <template v-else>
              <slot :name="`item.${header.key}`"
                :item="item" v-if="$slots[`item.${header.key}`]"
              />
              <span v-else>{{ item.raw?.[header.key] ?? item[header.key] }}</span>
            </template>
          </td>
        </tr>
      </template>
      <template #no-data>
        <div v-if="loading" class="d-flex flex-column align-center justify-center pa-6" style="min-height: 200px">
          <v-progress-circular indeterminate color="primary" size="48" />
          <div class="mt-2">Loading...</div>
        </div>
        <div v-else class="d-flex flex-column align-center justify-center pa-8" style="min-height: 300px">
          <v-icon size="64" color="grey lighten-1">mdi-folder-open</v-icon>
          <div class="text-h6 mt-4 mb-2">No records found</div>
          <!-- <div class="text-body-2 text-medium-emphasis mb-4">
            Looks like there's nothing here yet. Start by adding a new item.
          </div> -->
        </div>
      </template>
      <template #expanded-row="slotProps">
        <slot name="expanded-row" v-bind="slotProps" />
      </template>
    </VDataTable>
  </div>
</template>

<style>
.v-data-table__td, .v-data-table__th {
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-data-table__td, .v-data-table__th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* max-width removed to respect dynamic widths */
}

.fixed-layout :deep(table) {
  table-layout: fixed !important;
  width: 100% !important;
}

/* Ensure text truncates with ellipsis if it exceeds the fixed width */
:deep(.v-data-table__td), 
:deep(.v-data-table__th) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* Header Row 2 (Search Inputs) need to fit inside the fixed width */
:deep(.form-control-sm) {
  width: 100% !important;
  min-width: 0 !important; /* Allows input to shrink below default */
}

input.form-control-sm {
  max-width: 90%;
  width: 90%;
  font-size: 0.8rem;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  color: #000;
}
input.form-control-sm:focus {
  outline: none;
  border-color: #5c6bc0; /* soft blue */
  box-shadow: 0 0 3px rgba(92, 107, 192, 0.4);
  background-color: #fff;
}
.sort-icon {
  visibility: hidden;
  margin-left: 6px;
}
.sortable-th:hover .sort-icon {
  visibility: visible;
}

.v-data-table-column--data-table-expand {
  width: 48px !important;
  min-width: 48px !important;
}

.fixed-column.has-expand th:nth-child(1),
.fixed-column.has-expand td:nth-child(1) {
  position: sticky !important;
  left: 0 !important;
  z-index: 3 !important;
}

.fixed-column.has-expand th:nth-child(2),
.fixed-column.has-expand td:nth-child(2) {
  position: sticky !important;
  left: 48px !important;
  z-index: 2 !important;
}

.fixed-column.has-expand th:nth-child(1) {
  z-index: 4 !important;
}

.fixed-column.has-expand th:nth-child(2) {
  z-index: 3 !important;
}

.fixed-column:not(.has-expand) th:nth-child(1),
.fixed-column:not(.has-expand) td:nth-child(1) {
  position: sticky !important;
  left: 0 !important;
  z-index: 2 !important;
}

.fixed-column:not(.has-expand) th:nth-child(1) {
  z-index: 3 !important;
}

.form-control-sm {
  min-width: 120px;
  width: 100%;
  font-size: 0.8rem;
  padding: 6px 10px;
  border-radius: 4px;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  color: #000;
  background-color: #f9f9f9; 
  border: 1px solid rgba(var(--v-theme-on-surface), 0.22);
}

.form-control-sm:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 3px rgba(var(--v-theme-primary), 0.4);
  background-color: #fff;
}

select.form-control-sm {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 12px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='rgba(var(--v-theme-on-surface), 0.7)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
}


</style>