import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";
import DataService from "@/@common/services/DataService";

import TYPES from "./data/types";
import { getSubTypes } from "./data/subTypes";
import {
  optionTypes,
  optionsMap,
  eventOperators,
  attributeOperators,
  profileAttributeOperators,
  freqOperators,
  freqPeriods,
} from "./data/filterOptions";

/* Shared Singleton State ( Make the data global and shared across all components using the composable ) */
const FILTER_OPTIONS_MAP = reactive(optionsMap);
const optionsCache = reactive({});
const isLoaded = ref(false);
const isLoading = ref(false);

export const useAppEngagements = (source) => {
  const route = useRoute();
  const router = useRouter();

  const appEngagementsStore = useAppEngagementsStore();
  const libraryStore = useLibraryStore();

  const SUB_TYPES = getSubTypes();
  const FILTER_EVENT_OPTIONS = computed(() => {
    return Object.values(FILTER_OPTIONS_MAP).filter((o) => o.type === "event");
  });
  const FILTER_ATTRIBUTE_OPTIONS = computed(() => {
    return Object.values(FILTER_OPTIONS_MAP).filter(
      (o) => o.type === "attribute"
    );
  });
  const FILTER_PROFILE_ATTRIBUTE_OPTIONS = computed(() => {
    return Object.values(FILTER_OPTIONS_MAP).filter(
      (o) => o.type === "additionalInfo"
    );
  });
  const FILTER_PROFILE_COHORT_OPTIONS = computed(() => {
    return Object.values(FILTER_OPTIONS_MAP).filter((o) => o.type === "cohort");
  });

  async function fetchFilterExternalOptions({ type }) {
    if (optionsCache[type]) return;

    isLoading.value = true;
    try {
      const response = await DataService.getX("/api/v1/customer/master/field");
      const resultsMap = {};
      const results = response.map((el) => {
        const r = {
          type,
          title: el.label,
          value: el.code,
          inputFieldMeta: {
            type: { dropdown: "select" }[el.type] || el.type,
            options: el.possibleOptions?.map((o) => {
              return {
                title: o.label,
                value: o.value,
              };
            }),
          },
        };
        resultsMap[r.value] = r;
        return r;
      });
      optionsCache[type] = results;
      Object.assign(FILTER_OPTIONS_MAP, resultsMap);
    } catch (error) {
      console.error(`Failed to fetch filter options for ${type}:`, error);
      optionsCache[type] = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchFieldExternalOptions() {
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
      fetchFieldExternalOptions();
    }
  });

  if (source)
    watch(
      source,
      (newVal) => {
        if (
          newVal?.filterType === "additionalInfo" ||
          newVal?.filterType === "cohort"
        ) {
          fetchFilterExternalOptions({ type: newVal?.filterType });
        }
      },
      { immediate: true, deep: true }
    );

  return {
    TYPES,
    SUB_TYPES,

    FILTER_OPTION_TYPES: optionTypes,
    FILTER_OPTIONS_MAP,
    FILTER_EVENT_OPTIONS,
    FILTER_ATTRIBUTE_OPTIONS,
    FILTER_PROFILE_ATTRIBUTE_OPTIONS,
    FILTER_PROFILE_COHORT_OPTIONS,
    eventOperators,
    attributeOperators,
    profileAttributeOperators,
    freqOperators,
    freqPeriods,
  };
};
