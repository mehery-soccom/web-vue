import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";
import DataService from "@/@common/services/DataService";

import TYPES from "./data/types";
import { getSubTypes } from "./data/subTypes";
import {
  optionsMap,
  eventOperators,
  attributeOperators,
  freqOperators,
  freqPeriods,
} from "./data/filterOptions";

/* Shared Singleton State ( Make the data global and shared across all components using the composable ) */
const FILTER_OPTIONS_MAP = reactive(optionsMap);
const isLoaded = ref(false);
const isLoading = ref(false);

export const useAppEngagements = () => {
  const route = useRoute();
  const router = useRouter();

  const appEngagementsStore = useAppEngagementsStore();
  const libraryStore = useLibraryStore();

  const SUB_TYPES = getSubTypes();
  const FILTER_OPTIONS = Object.values(FILTER_OPTIONS_MAP);
  const FILTER_EVENT_OPTIONS = computed(() => {
    return FILTER_OPTIONS.filter((o) => o.type === "event");
  });
  const FILTER_ATTRIBUTE_OPTIONS = computed(() => {
    return FILTER_OPTIONS.filter((o) => o.type === "attribute");
  });

  async function fetchExternalOptions() {
    isLoading.value = true;
    for (const [key, filter] of Object.entries(FILTER_OPTIONS_MAP)) {
      const meta = filter.inputFieldMeta;

      // Skip if no inputFieldMeta
      if (!meta || !meta.options) continue;

      // If options is a string, assume it's an API URL
      if (typeof meta.options === "string") {
        try {
          const response = await DataService.get(meta.options);
          const { results } = response;
          FILTER_OPTIONS_MAP[key].inputFieldMeta.options = results.map(
            (item) => ({
              title: item.label,
              value: item.code,
              meta: {
                type: item.type,
                page: item.page,
              },
            })
          );
        } catch (error) {
          console.error(`Failed to fetch options for ${key}:`, error);

          FILTER_OPTIONS_MAP[key].inputFieldMeta.options = [];
        }
      }
    }
    isLoaded.value = true;
    isLoading.value = false;
  }

  async function fetchOptionsForKey(key) {
    const filter = FILTER_OPTIONS_MAP[key];
    if (
      !filter?.inputFieldMeta?.options ||
      typeof filter.inputFieldMeta.options !== "string"
    )
      return;

    try {
      const response = await fetch(filter.inputFieldMeta.options);
      const data = await response.json();

      FILTER_OPTIONS_MAP[key].inputFieldMeta.options = data.map((item) => ({
        title: item.name,
        value: item.id,
      }));
    } catch (error) {
      console.error(`Failed to fetch options for "${key}":`, error);
    }
  }

  onMounted(() => {
    // Initialize only once
    if (!isLoaded.value && !isLoading.value) {
      fetchExternalOptions();
    }
  });

  return {
    TYPES,
    SUB_TYPES,

    FILTER_OPTIONS_MAP,
    FILTER_EVENT_OPTIONS,
    FILTER_ATTRIBUTE_OPTIONS,
    eventOperators,
    attributeOperators,
    freqOperators,
    freqPeriods,
  };
};
