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

function sortByTitle(items = []) {
  return [...items].sort((a, b) =>
    String(a?.title || "").localeCompare(String(b?.title || ""))
  );
}

export const useAppEngagements = (source, config = {}) => {
  // const route = useRoute();
  // const router = useRouter();

  // const appEngagementsStore = useAppEngagementsStore();
  // const libraryStore = useLibraryStore();

  const FILTER_FIELDS = computed(() => {
    // console.log("FILTER_FIELDS", source?.filterType);
    if (!source?.filterType) return [];
    if (source.filterType === "cohort")
      return sortByTitle(
        config.onlyActiveCohorts
          ? localCache.activeCohorts || []
          : localCache.cohort || [],
      );
    return sortByTitle(Object.values(FILTER_FIELDS_MAP).filter((o) => {
      const ft =
        source.filterType === "computedSystemAttribute"
          ? "attribute"
          : source.filterType;
      if (o.type !== ft) return false;
      if (ft === "slice" && config.channelId.value) {
        return String(o.channelId) === String(config.channelId.value);
      }
      return true;
    }));
  });
  const FILTER_OPERATORS = computed(() => {
    // console.log("FILTER_OPERATORS", source.field);
    if (source.filterType === "eventData") return _FILTER_OPERATORS;
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
    console.log("fetchFilterFields raw type", type, FILTER_FIELDS_MAP, localCache);

    const _type = type === "computedSystemAttribute" ? "attribute" : type;
    if (!_type || localCache[_type]) return;

    if (_type === "event" || _type === "attribute") {
      const resultsMap = {};
      Object.values(_FILTER_FIELDS_MAP).forEach((o) => {
        if (o.type !== _type) return;
        resultsMap[o.value] = JSON.parse(JSON.stringify(o));
      });
      Object.keys(resultsMap).forEach((key) => {
        if (!FILTER_FIELDS_MAP[key]) {
          FILTER_FIELDS_MAP[key] = resultsMap[key];
        }
      });

      if (localCache[_type]) return;
      localCache[_type] = sortByTitle(Object.values(resultsMap));

      if (!isLoaded.value && !isLoading.value) {
        fetchFilterFieldValues();
      }
    }

    if (_type === "additionalInfo") {
      isLoading.value = true;
      try {
        const response = await DataService.getX(
          "/api/v1/customer/master/field",
        );
        const resultsMap = {};
        const results = response.map((el) => {
          const r = {
            type: _type,
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
        localCache[_type] = sortByTitle(results);
        Object.assign(FILTER_FIELDS_MAP, resultsMap);
      } catch (error) {
        console.error(`Failed to fetch filter options for ${_type}:`, error);
        localCache[_type] = [];
      } finally {
        isLoading.value = false;
      }
    }

    if (_type === "slice") {
      isLoading.value = true;
      try {
        const response = await DataService.axios.get(
          "/api/v1/notification/push/slice",
        );
        const resultsMap = {};
        const results = response.data.results.map((el) => {
          const r = {
            type: _type,
            title: el.name,
            value: el._id,
            meta: {
              projection: null, // el.buildStats?.tokensSubscribed,
            },
            channelId: el.channel_id,
          };
          resultsMap[r.value] = r;
          return r;
        });
        localCache[_type] = sortByTitle(results);
        Object.assign(FILTER_FIELDS_MAP, resultsMap);
      } catch (error) {
        console.error(`Failed to fetch filter options for ${_type}:`, error);
        localCache[_type] = [];
      } finally {
        isLoading.value = false;
      }
    }

    if (_type === "cohort") {
      isLoading.value = true;
      try {
        const response = await DataService.axios.get("/api/v1/cohort");
        const resultsMap = {};
        const activeCohorts = [];
        const results = response.data.results.map((el) => {
          const r = {
            type: _type,
            title: el.name,
            value: el._id,
            meta: {
              projection: null, // el.buildStats?.tokensSubscribed,
            },
            filter: el.filter,
          };
          if (el.active) activeCohorts.push(r);
          resultsMap[r.value] = r;
          return r;
        });
        localCache[_type] = sortByTitle(results);
        localCache.activeCohorts = sortByTitle(activeCohorts);
        Object.assign(FILTER_FIELDS_MAP, resultsMap);
      } catch (error) {
        console.error(`Failed to fetch filter options for ${_type}:`, error);
        localCache[_type] = [];
      } finally {
        isLoading.value = false;
      }
    }

    if (_type === "customEvent" || _type === "eventData") {
      isLoading.value = true;
      try {
        const response = await DataService.axios.get(
          "/api/v1/event-definition",
        );
        const resultsMap = {};
        const results = response.data.data.map((el) => {
          const r = {
            type: _type,
            title: el.eventName,
            value: _type === "eventData" ? el._id : el.eventName,
            eventId: el.eventName,
            meta: {
              projection: null,
              dataProperties: el.dataProperties || [],
            },
          };

          if (_type === "eventData") {
            r.inputFieldMeta = { type: "text" };
          }

          // resultsMap[r.value] = r;
          const mapKey = `customEvent_${r.value}`;
          resultsMap[mapKey] = r;
          return r;
        });
        localCache[_type] = sortByTitle(results);
        Object.assign(FILTER_FIELDS_MAP, resultsMap);
      } catch (error) {
        console.error(`Failed to fetch filter options for ${_type}:`, error);
        localCache[_type] = [];
      } finally {
        isLoading.value = false;
      }
    }
  }

  async function fetchFilterFieldValues() {
    isLoading.value = true;
    for (const key of Object.entries(FILTER_FIELDS_MAP)) {
      const entry = FILTER_FIELDS_MAP[key];
      const meta = entry?.inputFieldMeta;

      // Skip if no inputFieldMeta
      if (!meta || !meta.options) continue;

      // If options is a string, assume it's an API URL
      if (typeof meta.options === "string") {
        meta._optionsUrl = meta.options;
      }
      const url = meta._optionsUrl;
      if (!url) continue;

      try {
        const response = await DataService.get(url);
        const { results } = response;
        FILTER_FIELDS_MAP[key].inputFieldMeta.options = results.map((item) => ({
          title: item.label,
          value: item.code,
          meta: {
            type: item.type,
            page: item.page,
          },
        }));
      } catch (error) {
        console.error(`Failed to fetch options for ${key}:`, error);
        if (FILTER_FIELDS_MAP[key]) {
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
    fetchFilterFields,
    fetchFilterFieldValues,
    clearCache,
    localCache,
  };
};
