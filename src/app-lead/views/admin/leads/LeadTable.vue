<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  leads: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  itemsLength: {
    type: Number,
    default: 0
  },
  page: {
    type: Number,
    default: 1
  },
  itemsPerPage: {
    type: Number,
    default: 10
  },
});

const emit = defineEmits(['update:options', 'delete-lead']);

const router = useRouter();

const headers = [
  { title: "Name", key: "contact.name", sortable: false },
  { title: "Stage", key: "stage", sortable: false },
  { title: "Campaign", key: "campaign", sortable: false },
  { title: "Assigned Agent", key: "agent", sortable: false },
  { title: "Actions", key: "actions", sortable: false, align: 'center' },
];

const getCurrentStage = (lead) => {
  if (Array.isArray(lead.leadHistory) && lead.leadHistory.length > 0) {
    return lead.leadHistory[lead.leadHistory.length - 1].stagetitle;
  }
  return 'N/A';
};

const handleRowClick = (event, { item }) => {
  if (item?.raw?._id) {
    router.push({ 
      name: 'admin-leads-add-id?', 
      params: { id: item.raw._id },
      query: { showProgress: 'true' } 
    });
  }
};
</script>

<template>
  <MyDataTable
    :headers="headers"
    :items="leads"
    :loading="loading"
    :items-length="itemsLength"
    :page="page"
    :items-per-page="itemsPerPage"
    class="text-no-wrap"
    @update:options="options => emit('update:options', options)"
    @click:row="handleRowClick"
    hover
  >
    <template #item.name="{ item }">
      <div class="d-flex flex-column">
        <span class="font-weight-medium">{{item.raw.contact?.name || 'No Name' }}</span>
      </div>
    </template>

    <template #item.stage="{ item }">
      {{ getCurrentStage(item.raw) }}
    </template>
    
    <template #item.campaign="{ item }">
      {{ item.raw.formTitle || '-' }}
    </template>

    <template #item.agent>
      -
    </template>
    
    <template #item.actions="{ item }">
      <IconBtn @click.stop> 
        <VIcon icon="tabler-trash" />
        <v-dialog activator="parent" max-width="400">
          <template v-slot:default="{ isActive }">
            <v-card
              title="Confirm Deletion"
              text="Are you sure you want to delete this lead?"
            >
              <template v-slot:actions>
                <VSpacer />
                <v-btn 
                  text="Cancel" 
                  @click="isActive.value = false"
                />
                <v-btn
                  color="error"
                  variant="tonal"
                  text="Delete"
                  :loading="loading"
                  @click="() => { emit('delete-lead', item.raw._id); isActive.value = false; }"
                />
              </template>
            </v-card>
          </template>
        </v-dialog>
      </IconBtn>
    </template>
  </MyDataTable>
</template>

<style scoped>
:deep(tbody tr) {
  cursor: pointer;
}
</style>