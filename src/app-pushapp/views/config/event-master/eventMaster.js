// Shared helpers for Event Master (list, detail) and every event picker in the app.
import DataService from "@/@common/services/DataService";

let labelsPromise = null;

/** { eventName: displayLabel } for all events (hidden included), loaded once per page session. Display only. */
export function loadEventLabels() {
  if (!labelsPromise) {
    labelsPromise = DataService.axios
      .get("/api/v1/event-definition")
      .then((res) => Object.fromEntries((res.data.data || []).map((e) => [e.eventName, e.displayLabel || e.eventName])))
      .catch(() => {
        labelsPromise = null; // retry next time
        return {};
      });
  }
  return labelsPromise;
}

/** Call after a label changes so pickers pick up the new text. */
export const resetEventLabels = () => (labelsPromise = null);

export const HIDE_MESSAGE =
  "Hidden events are not displayed in your dashboards or reports. No data is lost and events can be unhidden at any time. If a hidden event records activity, it automatically becomes visible again.";

export const KEY_LABEL = "Internal Key";
export const EVENT_KEY_TOOLTIP = "Immutable key used by SDK & API";

export const DATA_TYPES = [
  { title: "String", value: "STRING" },
  { title: "Integer", value: "INTEGER" },
  { title: "Float", value: "FLOAT" },
  { title: "Boolean", value: "BOOLEAN" },
  { title: "Date", value: "DATE" },
  { title: "Object", value: "OBJECT" },
  { title: "Array", value: "ARRAY" },
];

export const DEFAULT_DATA_TYPE = "STRING"; // any property without a type is treated as a String

export const dataTypeTitle = (value) => DATA_TYPES.find((t) => t.value === (value || DEFAULT_DATA_TYPE))?.title;

const DOT_COLORS = ["#28C76F", "#7367F0", "#00BAD1", "#FF9F43", "#C084FC", "#FF4C51", "#2E9BFF"];

/** Stable colour per event key, so the same event always gets the same dot. */
export function dotColor(eventName = "") {
  let hash = 0;
  for (const ch of eventName) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return DOT_COLORS[Math.abs(hash) % DOT_COLORS.length];
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDate = (value) => (value ? dateFmt.format(new Date(value)) : "—");

/** "who · when" for Last Updated; never-edited events fall back to System + created time. */
export function lastUpdated(item) {
  if (item?.updatedAt) {
    const who = item.updatedBy ? String(item.updatedBy).split("@")[0] : "System";
    return { who, when: formatDate(item.updatedAt) };
  }
  return { who: "System", when: formatDate(item?.createTime?.stamp) };
}

/** Backend error message (e.g. the 409 duplicate-label text), else a fallback. */
export const apiError = (e, fallback = "Something went wrong") => e?.response?.data?.error?.message || fallback;
