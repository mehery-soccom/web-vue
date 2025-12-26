<script setup>
/*
import { useTheme } from 'vuetify'
import AnalyticsEarningReportsWeeklyOverview from '@app-pushapp/views/dashboards/analytics/AnalyticsEarningReportsWeeklyOverview.vue'
import AnalyticsMonthlyCampaignState from '@app-pushapp/views/dashboards/analytics/AnalyticsMonthlyCampaignState.vue'
import AnalyticsProjectTable from '@app-pushapp/views/dashboards/analytics/AnalyticsProjectTable.vue'
import AnalyticsSalesByCountries from '@app-pushapp/views/dashboards/analytics/AnalyticsSalesByCountries.vue'
import AnalyticsSalesOverview from '@app-pushapp/views/dashboards/analytics/AnalyticsSalesOverview.vue'
import AnalyticsSourceVisits from '@app-pushapp/views/dashboards/analytics/AnalyticsSourceVisits.vue'
import AnalyticsSupportTracker from '@app-pushapp/views/dashboards/analytics/AnalyticsSupportTracker.vue'
import AnalyticsTotalEarning from '@app-pushapp/views/dashboards/analytics/AnalyticsTotalEarning.vue'
import AnalyticsWebsiteAnalytics from '@app-pushapp/views/dashboards/analytics/AnalyticsWebsiteAnalytics.vue'

const vuetifyTheme = useTheme()
const currentTheme = vuetifyTheme.current.value.colors

const statisticsVertical = {
  title: 'Revenue Generated',
  color: 'success',
  icon: 'tabler-credit-card',
  stats: '97.5k',
  height: 97,
  series: [{
    data: [
      300,
      350,
      330,
      380,
      340,
      400,
      380,
    ],
  }],
  chartOptions: {
    chart: {
      height: 110,
      type: 'area',
      parentHeightOffset: 0,
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    tooltip: { enabled: false },
    markers: {
      colors: 'transparent',
      strokeColors: 'transparent',
    },
    grid: { show: false },
    colors: [currentTheme.success],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.8,
        opacityFrom: 0.6,
        opacityTo: 0.1,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    xaxis: {
      show: true,
      lines: { show: false },
      labels: { show: false },
      stroke: { width: 0 },
      axisBorder: { show: false },
    },
    yaxis: {
      stroke: { width: 0 },
      show: false,
    },
  },
}
*/
</script>

<template>
  <VRow class="match-height">
    <!-- 👉 Website analytics -->
    <!-- <VCol
      cols="12"
      md="6"
    >
      <AnalyticsWebsiteAnalytics />
    </VCol> -->

    <!-- 👉 Sales Overview -->
    <!-- <VCol
      cols="12"
      md="3"
      sm="6"
    >
      <AnalyticsSalesOverview />
    </VCol> -->

    <!-- 👉 Statistics Vertical -->
    <!-- <VCol
      cols="12"
      md="3"
      sm="6"
    >
      <CardStatisticsVertical v-bind="statisticsVertical" />
    </VCol> -->

    <!-- 👉 Earning Reports Weekly Overview -->
    <!-- <VCol
      cols="12"
      md="6"
    >
      <AnalyticsEarningReportsWeeklyOverview />
    </VCol> -->

    <!-- 👉 Support Tracker -->
    <!-- <VCol
      cols="12"
      md="6"
    >
      <AnalyticsSupportTracker />
    </VCol> -->

    <!-- 👉 Sales by Countries -->
    <!-- <VCol
      cols="12"
      sm="6"
      lg="4"
    >
      <AnalyticsSalesByCountries />
    </VCol> -->

    <!-- 👉 Total Earning -->
    <!-- <VCol
      cols="12"
      sm="6"
      lg="4"
    >
      <AnalyticsTotalEarning />
    </VCol> -->

    <!-- 👉 Monthly Campaign State -->
    <!-- <VCol
      cols="12"
      sm="6"
      lg="4"
    >
      <AnalyticsMonthlyCampaignState />
    </VCol> -->

    <!-- 👉 Source Visits -->
    <!-- <VCol
      cols="12"
      sm="6"
      lg="4"
    >
      <AnalyticsSourceVisits />
    </VCol> -->

    <!-- 👉 Project Table -->
    <!-- <VCol
      cols="12"
      lg="8"
    >
      <AnalyticsProjectTable />
    </VCol> -->

    <div :style="{ width: '100%', textAlign: 'center', marginTop: '300px' }">
      <h3 :style="{ fontSize: '44px' }">
        <VIcon icon="tabler-settings" /> Tikat Management
        <small>v1.0</small>
      </h3>
    </div>
  </VRow>
</template>

<style lang="scss">
@use "@app-pushapp/@core/scss/template/libs/apex-chart.scss";
</style>
