import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import TYPES from "./data/types";
// import SUB_TYPES from "./data/subTypes";
import { getSubTypes } from "./data/subTypes"

export const useAppEngagements = () => {
  const route = useRoute();
  const router = useRouter();

  const appEngagementsStore = useAppEngagementsStore();
  const SUB_TYPES = getSubTypes();

  const getType = () => {};

  return {
    getType,
    TYPES,
    SUB_TYPES,
  };
};
