<script setup>
import { computed } from "vue"

const props = defineProps({
  node: { type: Object, required: true },
  level: { type: Number, default: 0 }
})

const formatFieldName = (field) => {
  if (!field) return ""
  const str = String(field)
  const withSpaces = str.replace(/_/g, " ")
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

const indent = computed(() => ({
  marginLeft: "10px"
}))
</script>

<template>
  <div :style="indent">

    <!-- GROUP -->
    <template v-if="node.type === 'group'">
      <div class="group-title">
        <span class="group-chip">
          {{ formatFieldName(node.conjunction).toUpperCase() }}
        </span>
      </div>
      <div v-for="(child, idx) in node.children" :key="idx" class="group-children">
        <FilterViewer :node="child" :level="level + 1" />
      </div>
    </template>

    <!-- FILTER -->
    <template v-else-if="node.type === 'filter'">
      <div class="filter-card">
        <!-- FILTER TYPE -->
        <div v-if="node.filterType" class="filter-type">
          {{ formatFieldName(node.filterType) }} : 
        </div>
        <div class="filter-row">
          <!-- frequency filter -->
          <template v-if="node.freqOperator && (node.freqCount || node.value)">
            <strong> {{ formatFieldName(node.field) }}</strong>
            {{
              " has" +
              (node.operator === "is_not" ? " not" : "") +
              " happened " +
              formatFieldName(node.freqOperator).toLowerCase() +
              " " +
              (node.freqCount || node.value) +
              " time" +
              ((node.freqCount || node.value) > 1 ? "s" : "")
            }}
            <span v-if="node.freqPeriod">
              {{ formatFieldName(node.freqPeriod).toLowerCase() }}
            </span>
          </template>

          <!-- normal filter -->
          <template v-else>
            <strong>{{ formatFieldName(node.field) }}</strong>
            {{ formatFieldName(node.operator) }}
            <strong v-if="node.operator === 'BETWEEN' && node.value?.length === 2 && node.value[0]?.dateLocal">
              {{ node.value[0].dateLocal }} and {{ node.value[1].dateLocal }}
            </strong>
            <strong v-else-if="node.value?.[0]?.dateLocal">
              {{ node.value[0].dateLocal }}
            </strong>
            <strong v-else-if="Array.isArray(node.value)">
              {{ node.value.join(", ") }}
            </strong>
            <strong v-else>
              {{ formatFieldName(node.freqCount || node.value) }}
            </strong>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.group-title{
  margin:10px 0;
}
.group-chip{
  background:#eef2ff;
  color:#4f46e5;
  font-size:12px;
  font-weight:600;
  padding:4px 10px;
  border-radius:14px;
}
.group-children{
  border-left:2px solid #e5e7eb;
}
.filter-card{
  background:#fafafa;
  border:1px solid #e5e7eb;
  border-radius:6px;
  padding:8px 10px;
  margin:6px 0;
  display: flex;
}
.filter-type{
  font-size:14px;
  color:#6b7280;
  margin-right:3px;
  font-weight:800;
}
.filter-row{
  font-size:13px;
  line-height:1.5;
  margin-top: 2px;
}
</style>