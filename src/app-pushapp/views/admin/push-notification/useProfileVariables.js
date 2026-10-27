import { usePushNotificationStore } from "./usePushNotificationStore";

const STATIC_PROFILE_KEYS = ["name", "phones", "emails", "code"];

export function useProfileVariables() {
  const pushNotificationStore = usePushNotificationStore();
  const profileFields = ref([]);

  const profileSuggestions = computed(() => [
    "profile.",
    ...[...new Set([...STATIC_PROFILE_KEYS, ...profileFields.value.map((f) => f.code)])].map(
      (code) => `profile.${code}`,
    ),
  ]);

  const fetchProfileFields = async () => {
    try {
      const res = await pushNotificationStore.fetchCustomerMasterFields();
      const body = res?.data;
      const list = [body?.results, body?.data?.results, body?.data, body].find(Array.isArray) || [];
      profileFields.value = list.filter((f) => f?.code);
    } catch (error) {
      console.log("fetchProfileFields error");
    }
  };

  const getUsedProfileKeys = (style = {}) => {
    const keys = new Set();
    const regex = /{{\s*profile\.([a-zA-Z0-9_]+)\s*}}/g;
    let match;
    const { html, ...fields } = style || {};
    const text = JSON.stringify(fields);
    while ((match = regex.exec(text)) !== null) keys.add(match[1]);
    return [...keys];
  };

  const buildProfileVarMap = (style = {}) => {
    const map = {};
    getUsedProfileKeys(style).forEach((k) => {
      if (k === "name") {
        map[k] = "profile.name.formattedName";
        return;
      }
      if (k === "phones") {
        map[k] = "profile.phones.phone";
        return;
      }
      if (k === "emails") {
        map[k] = "profile.emails.email";
        return;
      }
      if (k === "code" || k === "rm") {
        map[k] = `profile.${k}`;
        return;
      }
      const fieldType = String(profileFields.value.find((f) => f.code === k)?.type || "").toLowerCase();
      if (fieldType === "document") map[k] = `profile.additionalInfo.${k}.url`;
      else if (fieldType === "date") map[k] = `profile.additionalInfo.${k}.date`;
      else map[k] = `profile.additionalInfo.${k}`;
    });
    return map;
  };

  return { profileFields, profileSuggestions, fetchProfileFields, buildProfileVarMap };
}
