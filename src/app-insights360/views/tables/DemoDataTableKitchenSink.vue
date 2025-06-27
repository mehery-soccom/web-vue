<script setup>
import { VDataTable } from 'vuetify/labs/VDataTable';
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
  }
});
const search = ref('')
const columnSearch = reactive({})
const sortBy = ref([])
const currentSortKey = ref(null)
const currentSortOrder = ref('asc')

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

const filteredItems = computed(() => {
  const searchableKeys = props.headers
    ?.filter(header => header.searchable)
    .map(header => header.key) || []

  let items = props.productList?.filter(item =>
    searchableKeys.every(key => {
      const searchValue = columnSearch[key]?.toLowerCase?.() || ''
      const itemValue = String(item[key] ?? '').toLowerCase()
      return itemValue.includes(searchValue)
    })
  ) || []

  if (currentSortKey.value) {
    items = [...items].sort((a, b) => {
      const valA = a[currentSortKey.value] ?? ''
      const valB = b[currentSortKey.value] ?? ''
      return currentSortOrder.value === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
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
    >
      <template #headers="{ columns }">
        <tr>
          <th v-for="col in columns" :key="col.key"
            @click="col.sortable && toggleSort(col.key)" class="sortable-th">
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
          <th v-for="column in columns" :key="column.key">
            <input
              v-if="column.searchable"
              v-model="columnSearch[column.key]"
              type="text"
              class="form-control form-control-sm"
              placeholder="🔍︎ Search"
            />
          </th>
        </tr>
      </template>
      <template #item="{ item }">
        <tr>
          <td v-for="header in props.headers" :key="header.key">
            <slot :name="`item.${header.key}`"
              :item="item" v-if="$slots[`item.${header.key}`]"
            />
            <template v-else>
              <span>{{ item.value[header.key] }}</span>
            </template>
          </td>
        </tr>
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
input.form-control-sm {
  max-width: 90%;
  width: 90%;
  font-size: 0.8rem;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
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
</style>