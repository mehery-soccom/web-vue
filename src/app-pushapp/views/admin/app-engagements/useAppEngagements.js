import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import { useLibraryStore } from "@/app-pushapp/views/config/library/useLibraryStore";

import TYPES from "./data/types";
import { getSubTypes } from "./data/subTypes";
import {
  optionsMap,
  eventOperators,
  attributeOperators,
  freqOperators,
  freqPeriods,
} from "./data/filterOptions";

export const useAppEngagements = () => {
  const route = useRoute();
  const router = useRouter();

  const appEngagementsStore = useAppEngagementsStore();
  const libraryStore = useLibraryStore();

  const SUB_TYPES = getSubTypes();
  const FILTER_OPTIONS_MAP = reactive(optionsMap);
  const FILTER_OPTIONS = Object.values(FILTER_OPTIONS_MAP);
  const FILTER_EVENT_OPTIONS = computed(() => {
    return FILTER_OPTIONS.filter((o) => o.type === "event");
  });
  const FILTER_ATTRIBUTE_OPTIONS = computed(() => {
    return FILTER_OPTIONS.filter((o) => o.type === "attribute");
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
