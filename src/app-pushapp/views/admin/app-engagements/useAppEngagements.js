import { useAppEngagementsStore } from "@app-pushapp/views/admin/app-engagements/useAppEngagementsStore";
import TYPES from "./data/types";
import { getSubTypes } from "./data/subTypes";

export const useAppEngagements = () => {
  const route = useRoute();
  const router = useRouter();

  const appEngagementsStore = useAppEngagementsStore();

  const SUB_TYPES = getSubTypes();

  return {
    TYPES,
    SUB_TYPES,
  };
};
