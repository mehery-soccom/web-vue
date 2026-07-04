<script setup>
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@app-pushapp/views/dashboards/user/useUserStore';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const show = inject("snackbar", () => {});

const isLoadingProfile = ref(true);
const isLoadingCohorts = ref(false);
const isLoadingTimeline = ref(false);

const profile = ref(null);
const matchedCohorts = ref([]);
const timelineEvents = ref([]);

// Timeline 3-day chunks window
let currentEndDate = Date.now();
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
let currentStartDate = currentEndDate - THREE_DAYS_MS;

const daysViewed = ref(3);

onMounted(async () => {
  const code = route.params.id;
  if (!code) {
    show({ message: 'User code is missing.', color: 'error' });
    router.back();
    return;
  }
  await loadProfileData(code);
});

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const ms = typeof timestamp === 'object' && timestamp.stamp ? timestamp.stamp : timestamp;
  if (isNaN(ms) || ms < 10000) return String(timestamp); // Fallback for weird strings
  
  return new Date(Number(ms)).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatValue = (val) => {
  if (Array.isArray(val)) {
    return val.map(v => {
      if (typeof v === 'object' && v !== null) {
        if (v.date) return v.date;
        if (v.stamp) return formatDateTime(v.stamp);
      }
      return v;
    }).join(', ');
  }
  
  if (typeof val === 'object' && val !== null) {
    if (val.date) return val.date;
    if (val.stamp) return formatDateTime(val.stamp);
    return JSON.stringify(val);
  }
  
  if (typeof val === 'number' && val > 1000000000) {
    const ms = val > 1000000000000 ? val : val * 1000;
    return formatDateTime(ms);
  }

  if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) {
    return new Date(val).toLocaleDateString('en-IN');
  }

  return val;
};

const loadProfileData = async (code) => {
  isLoadingProfile.value = true;
  try {
    const res = await userStore.fetchProfileByCode(code);
    if (res?.data) {
      profile.value = res.data;
      loadCohorts(profile.value);
      loadTimeline(profile.value._id, profile.value.code);
    } else {
      show({ message: 'User profile not found.', color: 'error' });
    }
  } catch (error) {
    show({ message: 'Failed to load profile.', color: 'error' });
  } finally {
    isLoadingProfile.value = false;
  }
};

const loadCohorts = async (profileData) => {
  isLoadingCohorts.value = true;
  try {
    const res = await userStore.evaluateProfileCohorts(profileData);
    if (res?.results) {
      matchedCohorts.value = res.results;
    }
  } catch (error) {
    console.error("Failed to load cohorts", error);
  } finally {
    isLoadingCohorts.value = false;
  }
};

const loadTimeline = async (p_id, userId) => {
  isLoadingTimeline.value = true;
  try {
    const params = {
      dateRange1: currentStartDate,
      dateRange2: currentEndDate,
      timezone: window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asi/Kolkata",
      p_id: p_id,
      userId: userId
    };
    const res = await userStore.fetchUserTimeline(params);
    if (res?.data && res.data.length > 0) {
      timelineEvents.value = [...timelineEvents.value, ...res.data].sort((a, b) => b.timestamp - a.timestamp);
    } else if (timelineEvents.value.length === 0) {
    }
  } catch (error) {
    console.error("Failed to load timeline", error);
  } finally {
    isLoadingTimeline.value = false;
  }
};

const fetchOlderTimeline = () => {
  currentEndDate = currentStartDate - 1;
  currentStartDate = currentEndDate - THREE_DAYS_MS;
  daysViewed.value += 3;
  loadTimeline(profile.value._id, profile.value.code);
};

const getTimelineIcon = (category) => {
  switch(category) {
    case 'EVENT': return 'tabler-click';
    case 'NOTIFICATION': return 'tabler-bell';
    case 'ENGAGEMENT': return 'tabler-activity';
    default: return 'tabler-point';
  }
};

const getTimelineColor = (category) => {
  switch(category) {
    case 'EVENT': return 'primary';
    case 'NOTIFICATION': return 'warning';
    case 'ENGAGEMENT': return 'success';
    default: return 'secondary';
  }
};
</script>

<template>
  <div>
    <div class="mb-4">
      <VBtn variant="text" prepend-icon="tabler-arrow-left" @click="router.back()">
        Back to Users
      </VBtn>
    </div>

    <div v-if="isLoadingProfile" class="d-flex justify-center py-12">
      <VProgressCircular indeterminate color="primary" size="40" />
    </div>

    <VRow v-else-if="profile">
      
      <VCol cols="12">
        <VCard>
          <VCardText class="d-flex flex-wrap gap-4 align-center">
            <VAvatar size="72" color="primary" variant="tonal" rounded>
              <span class="text-h4">{{ profile.code?.charAt(0)?.toUpperCase() || 'U' }}</span>
            </VAvatar>
            <div>
              <h2 class="text-h4 font-weight-bold">{{ profile.code }}</h2>
            </div>
            <VSpacer />
            <div class="text-right">
              <VChip color="secondary" variant="tonal" size="small" class="mb-1">Source: {{ profile.source || 'UNKNOWN' }}</VChip>
              <div class="text-caption text-disabled mt-1">
                Created: {{ formatDateTime(profile.created?.stamp) }}
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard class="h-100">
          <VCardItem>
            <VCardTitle>Additional Information</VCardTitle>
          </VCardItem>
          <VDivider />
          <VCardText class="pt-4" v-if="profile.additionalInfo && Object.keys(profile.additionalInfo).length > 0">
            <VList density="compact" class="pa-0">
              <VListItem v-for="(value, key) in profile.additionalInfo" :key="key" class="px-0">
                <div class="d-flex justify-space-between align-start w-100">
                  <span class="text-subtitle-2 text-medium-emphasis text-capitalize me-2">{{ key.replace(/_/g, ' ') }}</span>
                  <span class="text-body-2 font-weight-medium text-right text-wrap" style="max-width: 60%;">
                    {{ formatValue(value) }}
                  </span>
                </div>
                <VDivider class="mt-2" v-if="key !== Object.keys(profile.additionalInfo).pop()" />
              </VListItem>
            </VList>
          </VCardText>
          <VCardText v-else class="text-disabled text-center py-6">
            No additional info available.
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="8">
        
        <VCard class="mb-4">
          <VCardItem>
            <VCardTitle>Matched Cohorts</VCardTitle>
          </VCardItem>
          <VCardText>
            <div v-if="isLoadingCohorts" class="d-flex align-center gap-2 text-disabled">
              <VProgressCircular indeterminate size="20" color="primary" /> Evaluating...
            </div>
            <div v-else-if="matchedCohorts.length > 0" class="d-flex flex-wrap gap-2">
              <VChip 
                v-for="cohort in matchedCohorts" 
                :key="cohort._id" 
                color="primary" 
                variant="tonal"
                prepend-icon="tabler-users-group"
              >
                {{ cohort.name }}
              </VChip>
            </div>
            <div v-else class="text-disabled text-body-2">
              User does not currently match any cohorts.
            </div>
          </VCardText>
        </VCard>

        <VCard>
          <VCardItem class="d-flex justify-space-between align-center">
            <VCardTitle>Activity Timeline</VCardTitle>
            <template #append>
              <VChip size="small" variant="flat" color="primary" class="ml-2">{{ daysViewed }}-Day View</VChip>
            </template>
          </VCardItem>
          <VDivider />
          
          <VCardText class="pa-0">
            <div class="custom-timeline pa-4">
              
              <div v-if="timelineEvents.length === 0 && !isLoadingTimeline" class="text-center text-disabled py-10">
                <VIcon icon="tabler-history" size="40" class="mb-2 opacity-50" />
                <p>No activity found in this period.</p>
              </div>

              <div class="timeline-row" v-for="(item, index) in timelineEvents" :key="index">
                <div class="timeline-content left-side">
                  <VCard v-if="item.category === 'EVENT'" variant="outlined" class="w-100 event-card">
                    <VTooltip v-if="item.event_data" activator="parent" location="top">
                      <div v-for="(val, key) in item.event_data" :key="key" class="text-caption">
                        <strong>{{ key }}:</strong> {{ val }}
                      </div>
                    </VTooltip>
                    <VCardText class="pa-3">
                      <div class="d-flex justify-space-between align-center mb-1">
                        <span class="text-caption font-weight-bold text-primary">{{ item.category }}</span>
                        <span class="text-caption text-disabled">{{ formatDateTime(item.timestamp) }}</span>
                      </div>
                      <div class="font-weight-bold text-body-1">{{ item.event_name?.replace(/_/g, ' ') || 'Unknown Event' }}</div>
                    </VCardText>
                  </VCard>
                </div>

                <div class="timeline-divider">
                  <VAvatar :color="getTimelineColor(item.category)" size="36" variant="elevated" class="elevation-2 z-index-1">
                    <VIcon :icon="getTimelineIcon(item.category)" size="20" color="white" />
                  </VAvatar>
                </div>

                <div class="timeline-content right-side">
                  <VCard v-if="item.category !== 'EVENT'" variant="outlined" class="w-100 other-card">
                    <VCardText class="pa-3">
                      <div class="d-flex justify-space-between align-center mb-1">
                        <span :class="`text-caption font-weight-bold text-${getTimelineColor(item.category)}`">{{ item.category }}</span>
                        <span class="text-caption text-disabled">{{ formatDateTime(item.timestamp) }}</span>
                      </div>
                      
                      <template v-if="item.category === 'ENGAGEMENT'">
                        <div class="font-weight-bold text-body-1">{{ item.templateCode || 'Unknown Template' }}</div>
                        <div class="text-caption text-medium-emphasis text-capitalize mt-1">Type: {{ item.templateType || 'N/A' }}</div>
                      </template>
                      
                      <template v-else-if="item.category === 'NOTIFICATION'">
                        <div class="font-weight-bold text-body-1 text-capitalize">{{ item.template?.replace(/_/g, ' ') || 'Unknown Notification' }}</div>
                        <div class="text-caption text-medium-emphasis text-capitalize mt-1">Subtype: {{ item.subType || 'N/A' }}</div>
                      </template>
                      
                      <template v-else>
                        <div class="font-weight-bold text-body-1 text-capitalize">{{ item.template || item.templateCode || 'Interaction' }}</div>
                      </template>

                    </VCardText>
                  </VCard>
                </div>
              </div>

            </div>
          </VCardText>

          <VCardActions class="justify-center py-4 bg-var-theme-background">
            <VBtn 
              variant="tonal" 
              color="secondary" 
              :loading="isLoadingTimeline"
              @click="fetchOlderTimeline"
            >
              Load Previous 3 Days
            </VBtn>
          </VCardActions>
        </VCard>

      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.custom-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.custom-timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background-color: rgba(var(--v-theme-on-surface), 0.12);
  transform: translateX(-50%);
  z-index: 0;
}

.timeline-row {
  display: flex;
  width: 100%;
  align-items: center;
  position: relative;
}

.timeline-content {
  width: 50%;
  position: relative;
}

.left-side {
  padding-right: 32px;
  display: flex;
  justify-content: flex-end;
}

.right-side {
  padding-left: 32px;
  display: flex;
  justify-content: flex-start;
}

.timeline-divider {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

/* Card Styling */
.event-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.other-card {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

/* Responsive for Mobile */
@media (max-width: 600px) {
  .custom-timeline::before {
    left: 24px;
  }
  .timeline-divider {
    left: 24px;
  }
  .timeline-content {
    width: 100%;
  }
  .left-side {
    padding-right: 0;
    padding-left: 64px;
    justify-content: flex-start;
  }
  .right-side {
    padding-left: 64px;
  }
}
</style>