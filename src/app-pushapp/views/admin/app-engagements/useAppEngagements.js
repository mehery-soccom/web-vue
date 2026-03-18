// import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
// import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";
import DataService from "@/@common/services/DataService";

import TYPES from "./data/types";
import { SUB_TYPES } from "./data/subTypes";
import {
  FILTER_TYPES,
  FILTER_FIELDS_MAP as _FILTER_FIELDS_MAP,
  FILTER_OPERATORS as _FILTER_OPERATORS,
  FILTER_PERIODS,
} from "./data/filterOptions";

/* Shared Singleton State ( Make the data global and shared across all components using the composable ) */
const FILTER_FIELDS_MAP = reactive({});
const localCache = reactive({});
const isLoaded = ref(false);
const isLoading = ref(false);

export const useAppEngagements = (source) => {
  // const route = useRoute();
  // const router = useRouter();

  // const appEngagementsStore = useAppEngagementsStore();
  // const libraryStore = useLibraryStore();

  const FILTER_FIELDS = computed(() => {
    // console.log("FILTER_FIELDS", source?.filterType);
    if (!source?.filterType) return [];
    return Object.values(FILTER_FIELDS_MAP).filter(
      (o) => o.type === source.filterType,
    );
  });
  const FILTER_OPERATORS = computed(() => {
    // console.log("FILTER_OPERATORS", source.field);
    const filterField = FILTER_FIELDS_MAP[source.field];
    if (!filterField) return [];
    const filterFieldInputType = filterField.inputFieldMeta?.type;
    // console.log("FILTER_OPERATORS filterFieldInputType", filterFieldInputType);
    return _FILTER_OPERATORS.filter((el) => {
      let r = true;
      if (el.strictApplicableTypes) {
        if (
          !filterFieldInputType ||
          !el.strictApplicableTypes.includes(filterFieldInputType)
        ) {
          r = false;
        }
      }
      return r;
    });
  });

  async function fetchFilterFields({ type }) {
    console.log("fetchFilterFields", type);

    if (!type || localCache[type]) return;

    if (type === "event" || type === "attribute") {
      const resultsMap = {};
      const results = Object.values(_FILTER_FIELDS_MAP).filter((o) => {
        const r = o.type === type;
        if (r) resultsMap[o.value] = o;
        return r;
      });
      localCache[type] = results;
      Object.assign(FILTER_FIELDS_MAP, resultsMap);

      if (!isLoaded.value && !isLoading.value) {
        fetchFilterFieldValues();
      }
    }

    if (type === "additionalInfo") {
      isLoading.value = true;
      try {
        const response = await DataService.getX(
          "/api/v1/customer/master/field",
        );
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
        localCache[type] = results;
        Object.assign(FILTER_FIELDS_MAP, resultsMap);
      } catch (error) {
        console.error(`Failed to fetch filter options for ${type}:`, error);
        localCache[type] = [];
      } finally {
        isLoading.value = false;
      }
    }

    if (type === "cohort") {
      isLoading.value = true;
      try {
        const response = await DataService.axios.get("/api/v1/cohort");
        const resultsMap = {};
        const results = response.data.results.map((el) => {
          const r = {
            type,
            title: el.name,
            value: el._id,
            meta: {
              projection: el.buildStats?.tokensSubscribed,
            },
          };
          resultsMap[r.value] = r;
          return r;
        });
        localCache[type] = results;
        Object.assign(FILTER_FIELDS_MAP, resultsMap);
      } catch (error) {
        console.error(`Failed to fetch filter options for ${type}:`, error);
        localCache[type] = [];
      } finally {
        isLoading.value = false;
      }
    }
  }

  async function fetchFilterFieldValues() {
    isLoading.value = true;
    for (const [key, filter] of Object.entries(FILTER_FIELDS_MAP)) {
      const meta = filter.inputFieldMeta;

      // Skip if no inputFieldMeta
      if (!meta || !meta.options) continue;

      // If options is a string, assume it's an API URL
      if (typeof meta.options === "string") {
        try {
          const response = await DataService.get(meta.options);
          const { results } = response;
          FILTER_FIELDS_MAP[key].inputFieldMeta.options = results.map(
            (item) => ({
              title: item.label,
              value: item.code,
              meta: {
                type: item.type,
                page: item.page,
              },
            }),
          );
        } catch (error) {
          console.error(`Failed to fetch options for ${key}:`, error);

          FILTER_FIELDS_MAP[key].inputFieldMeta.options = [];
        }
      }
    }
    isLoaded.value = true;
    isLoading.value = false;
  }

  function clearCache() {
    Object.keys(localCache).forEach((key) => {
      delete localCache[key];
    });
  }

  onMounted(() => {});

  if (source)
    watch(
      source,
      (newVal) => {
        fetchFilterFields({ type: newVal?.filterType });
      },
      { immediate: true, deep: true },
    );

  return {
    TYPES,
    SUB_TYPES,

    FILTER_TYPES,
    FILTER_FIELDS,
    FILTER_FIELDS_MAP,
    FILTER_OPERATORS,

    FILTER_PERIODS,

    clearCache,
  };
};
