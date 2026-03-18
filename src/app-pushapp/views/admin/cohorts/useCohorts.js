/* Shared Singleton State ( Make the data global and shared across all components using the composable ) */
const localCache = reactive({});
const isLoaded = ref(false);
const isLoading = ref(false);

export const useCohorts = () => {
  // const route = useRoute();
  // const router = useRouter();

  onMounted(() => {});

  return {};
};
