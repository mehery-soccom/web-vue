<!-- <script setup>
import { ref, onMounted } from 'vue'
import CardStatisticsTransactions from '@app-insights360/views/dashboards/analytics/CardStatisticsTransactions.vue'

const segmentsStats = ref([
  { title: 'Feedback Received', stats: '0', icon: 'tabler-message-2', color: 'primary' },
  { title: 'Excellent', stats: '0', icon: 'tabler-mood-smile', color: 'success' },
  { title: 'Satisfactory', stats: '0', icon: 'tabler-mood-neutral', color: 'warning' },
  { title: 'Poor', stats: '0', icon: 'tabler-mood-sad', color: 'error' },
])

const statusStats = ref([
  { title: 'Feedback Received', stats: '0', icon: 'tabler-message-2', color: 'primary' },
  { title: 'Open', stats: '0', icon: 'tabler-circle-dot', color: 'info' },
  { title: 'Resolved', stats: '0', icon: 'tabler-circle-check', color: 'success' },
  { title: 'In Progress', stats: '0', icon: 'tabler-clock', color: 'warning' },
])

// --- Tables Data ---
const segmentTableData = ref([])
const statusTableData = ref([])

const fetchDashboardData = async () => {
  try {
    // Simulating API Delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // 1. Mock Data for Top Cards
    const cardData = {
      segments: { total: 100, excellent: 50, satisfactory: 30, poor: 20 },
      statuses: { total: 100, open: 50, resolved: 30, inProgress: 20 }
    }

    segmentsStats.value[0].stats = String(cardData.segments.total)
    segmentsStats.value[1].stats = String(cardData.segments.excellent)
    segmentsStats.value[2].stats = String(cardData.segments.satisfactory)
    segmentsStats.value[3].stats = String(cardData.segments.poor)

    statusStats.value[0].stats = String(cardData.statuses.total)
    statusStats.value[1].stats = String(cardData.statuses.open)
    statusStats.value[2].stats = String(cardData.statuses.resolved)
    statusStats.value[3].stats = String(cardData.statuses.inProgress)

    // 2. Mock Data for Tables (Matching your image)
    segmentTableData.value = [
      { formName: 'ABC', avgScore: '34.52%', received: 345, excellent: 90, satisfactory: 30, poor: 225 },
      { formName: 'PQR', avgScore: '89.91%', received: 290, excellent: 20, satisfactory: 10, poor: 260 },
    ]

    statusTableData.value = [
      { formName: 'ABC', avgScore: '34.52%', received: 345, new: 90, active: 30, closed: 225 },
      { formName: 'PQR', avgScore: '89.91%', received: 290, new: 20, active: 10, closed: 260 },
    ]

  } catch (error) {
    console.error("Dashboard analytics error", error)
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <VRow class="match-height">
    <VCol cols="12" md="6">
      <CardStatisticsTransactions 
        :statistics="segmentsStats" 
        title="Campaign Segments" 
      />
    </VCol>
    <VCol cols="12" md="6">
      <CardStatisticsTransactions 
        :statistics="statusStats" 
        title="Campaign Status" 
      />
    </VCol>

    <VCol cols="12">
      <VCard title="Form Segment Breakdown">
        <VTable class="text-no-wrap">
          <thead>
            <tr>
              <th class="text-uppercase">Form Name</th>
              <th class="text-uppercase text-center">Avg Score</th>
              <th class="text-uppercase text-center">Received</th>
              <th class="text-uppercase text-center">Excellent</th>
              <th class="text-uppercase text-center">Satisfactory</th>
              <th class="text-uppercase text-center">Poor</th>
              <th class="text-uppercase text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in segmentTableData" :key="item.formName">
              <td class="font-weight-medium">{{ item.formName }}</td>
              <td class="text-center">{{ item.avgScore }}</td>
              <td class="text-center">{{ item.received }}</td>
              <td class="text-center">{{ item.excellent }}</td>
              <td class="text-center">{{ item.satisfactory }}</td>
              <td class="text-center">{{ item.poor }}</td>
              <td class="text-center">
                <VBtn variant="text" size="small" color="primary">View</VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard title="Form Status Breakdown">
        <VTable class="text-no-wrap">
          <thead>
            <tr>
              <th class="text-uppercase">Form Name</th>
              <th class="text-uppercase text-center">Avg Score</th>
              <th class="text-uppercase text-center">Received</th>
              <th class="text-uppercase text-center">New</th>
              <th class="text-uppercase text-center">Active</th>
              <th class="text-uppercase text-center">Closed</th>
              <th class="text-uppercase text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in statusTableData" :key="item.formName">
              <td class="font-weight-medium">{{ item.formName }}</td>
              <td class="text-center">{{ item.avgScore }}</td>
              <td class="text-center">{{ item.received }}</td>
              <td class="text-center">{{ item.new }}</td>
              <td class="text-center">{{ item.active }}</td>
              <td class="text-center">{{ item.closed }}</td>
              <td class="text-center">
                <VBtn variant="text" size="small" color="primary">View</VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
.v-table th {
  font-weight: 600 !important;
  letter-spacing: 0.5px;
}
</style> -->

<script setup>

</script>

<template>
  <VRow class="match-height">
    <div :style="{ width: '100%', textAlign: 'center', marginTop: '300px' }">
      <h3 :style="{ fontSize: '44px' }">
        <VIcon icon="tabler-settings" /> Service Management
        <small>v1.0</small>
      </h3>
    </div>
  </VRow>
</template>