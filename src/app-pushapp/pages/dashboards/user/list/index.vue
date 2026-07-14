<script setup>
import { ref, inject, onMounted, watch } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import { useUserStore } from '@app-pushapp/views/dashboards/user/useUserStore';
import FilterBuilder from '@app-pushapp/views/admin/app-engagements/FilterBuilder.vue';

const router = useRouter();
const userStore = useUserStore();
const show = inject("snackbar", () => {}); 

const activeTab = ref('filter');
const isLoading = ref(false);
const profilesTotal = ref(0);

const filterLocal = ref({
  type: "group",
  conjunction: "and",
  children: [
    { type: "filter", filterType: "attribute" }
  ]
});
const filterPage = ref(1);
const hasMoreProfiles = ref(false);

const searchCode = ref('');
const profilesList = ref([]);

onMounted(() => {
  const savedState = sessionStorage.getItem('usersListState');
  if (savedState) {
    const state = JSON.parse(savedState);
    activeTab.value = state.activeTab || 'filter';
    filterLocal.value = state.filterLocal;
    filterPage.value = state.filterPage || 1;
    searchCode.value = state.searchCode || '';
    profilesList.value = state.profilesList || [];
    hasMoreProfiles.value = state.hasMoreProfiles || false;
  }
});

watch(
  [activeTab, filterLocal, filterPage, searchCode, profilesList, hasMoreProfiles],
  () => {
    sessionStorage.setItem('usersListState', JSON.stringify({
      activeTab: activeTab.value,
      filterLocal: filterLocal.value,
      filterPage: filterPage.value,
      searchCode: searchCode.value,
      profilesList: profilesList.value,
      hasMoreProfiles: hasMoreProfiles.value
    }));
  },
  { deep: true }
);

onBeforeRouteLeave((to, from) => {
  if (to.name !== 'dashboards-user-add-id?') {
    sessionStorage.removeItem('usersListState');
  }
});

const applyFilter = async (isLoadMore = false) => {
  if (!isLoadMore) {
    filterPage.value = 1;
    profilesList.value = [];
    profilesTotal.value = 0;
  }

  isLoading.value = true;
  try {
    const payload = { filter: filterLocal.value };
    const params = { page: filterPage.value, limit: 20 }; 
    
    const res = await userStore.fetchProfilesByFilter(payload, params);
    
    if (res?.results && res.results.length > 0) {
      profilesList.value.push(...res.results);
      
      if (res.pagination) {
        profilesTotal.value = res.pagination.total;
        hasMoreProfiles.value = filterPage.value < res.pagination.totalPages;
      } else {
        profilesTotal.value = profilesList.value.length;
        hasMoreProfiles.value = false;
      }
    } else {
      hasMoreProfiles.value = false;
      if (!isLoadMore) show({ message: 'No users found for this filter.', color: 'warning' });
    }
  } catch (error) {
    show({ message: 'Failed to fetch profiles from filter.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const loadMoreProfiles = () => {
  filterPage.value++;
  applyFilter(true);
};

const executeSearch = async () => {
  if (!searchCode.value.trim()) {
    show({ message: 'Please enter a user code.', color: 'warning' });
    return;
  }

  isLoading.value = true;
  profilesList.value = [];
  hasMoreProfiles.value = false;

  try {
    const res = await userStore.fetchProfileByCode(searchCode.value.trim());
    if (res?.data) {
      profilesList.value = [res.data.code];
      profilesTotal.value = 1;
    } else {
      show({ message: 'User not found.', color: 'warning' });
    }
  } catch (error) {
    show({ message: 'Failed to find user by code.', color: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const handleTabChange = () => {
  profilesList.value = [];
  hasMoreProfiles.value = false;
};

const goToUserDetails = (code) => {
  if (!code) return;
  router.push({ name: 'dashboards-user-add-id?', params: { id: code } });
};
</script>

<template>
  <div>
    <VRow>
      <VCol cols="12">
        <h2 class="text-h4 font-weight-medium">User Analytics</h2>
      </VCol>

      <VCol cols="12">
        <VCard>
          <VTabs v-model="activeTab" @update:model-value="handleTabChange">
            <VTab value="filter" prepend-icon="tabler-filter">Filter Users</VTab>
            <VTab value="search" prepend-icon="tabler-search">Search by Code</VTab>
          </VTabs>

          <VDivider />

          <VCardText class="pt-6">
            <VWindow v-model="activeTab">
              
              <VWindowItem value="filter">
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Build custom segments to find targeted groups of users.
                </p>
                
                <FilterBuilder 
                  v-model="filterLocal" 
                  :ignoreSlicefilterType="true" 
                />
                
                <div class="d-flex justify-end mt-4">
                  <VBtn 
                    color="primary" 
                    prepend-icon="tabler-filter-check"
                    :loading="isLoading"
                    @click="applyFilter(false)"
                  >
                    Apply Filter
                  </VBtn>
                </div>
              </VWindowItem>

              <VWindowItem value="search">
                <VRow>
                    <VCol cols="12" md="6">
                        <AppTextField
                            v-model="searchCode"
                            label="User Code"
                            clearable
                            @keyup.enter="executeSearch"
                        />
                    </VCol>

                    <VCol
                        cols="12"
                        md="6"
                        class="d-flex align-center pt-9"
                    >
                        <VBtn
                            color="primary"
                            prepend-icon="tabler-search"
                            :loading="isLoading"
                            @click="executeSearch"
                        >
                            Search
                        </VBtn>
                    </VCol>
                </VRow>
                </VWindowItem>
            </VWindow>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" v-if="profilesList.length > 0">
        <h3 class="text-h5 mb-4 mt-2">
          Results ({{ profilesList.length }}/{{ profilesTotal }})
        </h3>
        
        <VRow>
          <VCol v-for="(code, index) in profilesList" :key="index" cols="12" sm="6" md="4" lg="3">
            <VCard 
              class="cursor-pointer h-100 transition-swing hover-elevate pb-2" 
              variant="outlined"
              @click="goToUserDetails(code)"
            >
              <VCardItem class="pa-3">
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" rounded>
                    <VIcon icon="tabler-user" />
                  </VAvatar>
                </template>
                <VCardTitle class="text-h6 text-truncate" :title="code">
                  {{ code || 'Unknown Code' }}
                </VCardTitle>
              </VCardItem>
            </VCard>
          </VCol>
        </VRow>

        <div class="d-flex justify-center mt-6" v-if="hasMoreProfiles && activeTab === 'filter'">
          <VBtn 
            variant="tonal" 
            color="secondary" 
            :loading="isLoading"
            @click="loadMoreProfiles"
          >
            Show More
          </VBtn>
        </div>
      </VCol>

      <VCol cols="12" v-else-if="isLoading">
        <div class="d-flex justify-center py-10">
          <VProgressCircular indeterminate color="primary" />
        </div>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.hover-elevate:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.15) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}
</style>