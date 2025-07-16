import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import TYPES from "@app-pushapp/views/app-engagements/data/types";
import SUB_TYPES from "@app-pushapp/views/app-engagements/data/subTypes";

export const useAppEngagements = () => {
  const route = useRoute();
  const router = useRouter();

  const appEngagementsStore = useAppEngagementsStore();

  const getType = () => {};

  return {
    getType,
    TYPES,
    SUB_TYPES,
  };
};
