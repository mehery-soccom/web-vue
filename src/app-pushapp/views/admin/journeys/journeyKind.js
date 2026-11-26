export const EVENT_KIND = "EVENT";
export const BROADCAST_KIND = "BROADCAST";

export function resolveKind(kind) {
  return String(kind || "").toUpperCase() === BROADCAST_KIND ? BROADCAST_KIND : EVENT_KIND;
}

export function isBroadcastKind(kind) {
  return resolveKind(kind) === BROADCAST_KIND;
}

export function extractKinds(response) {
  const body = response?.data;
  const list = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.results)
        ? body.results
        : Array.isArray(body?.data?.results)
          ? body.data.results
          : [];

  return list
    .map((item) => ({
      kind: String(item?.kind || item?.code || "").toUpperCase(),
      label: item?.label || item?.kindLabel || "",
      labelPlural: item?.labelPlural || item?.kindLabelPlural || "",
    }))
    .filter((item) => item.kind);
}

export function labelForKind(kinds, kind, plural = false) {
  const entry = (kinds || []).find((item) => item.kind === resolveKind(kind));
  if (!entry) return "";
  return plural ? entry.labelPlural : entry.label;
}

export function labelForRecord(kinds, record, plural = false) {
  if (!plural && record?.kindLabel) return record.kindLabel;
  if (plural && record?.kindLabelPlural) return record.kindLabelPlural;
  return labelForKind(kinds, record?.kind, plural);
}

export function journeyTimezone() {
  return window.CONST?.CONFIG?.SETUP?.POSTMAN_TIMEZONE_OFFSET?.split("::")[0] || "Asia/Kolkata";
}
