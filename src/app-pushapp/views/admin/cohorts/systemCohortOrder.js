/** Fixed display order for SYSTEM cohorts in dropdowns (not alphabetical). */
export const SYSTEM_COHORT_ORDER = [
  "Engaged Champions",
  "Champions",
  "High-Value At Risk",
  "Lapsing Regulars",
  "Steady Core",
  "Frequent Low-Basket",
  "Promising New",
  "Engaged Non-Buyers",
  "One-and-Done",
  "Dormant/Churned",
];

const normalize = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_/|-]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const ORDER_INDEX = new Map(
  SYSTEM_COHORT_ORDER.map((name, index) => [normalize(name), index]),
);

/** Also accept common id/slug forms from RFM / API. */
[
  ["engaged_champions", 0],
  ["champions", 1],
  ["high_value_at_risk", 2],
  ["lapsing_regulars", 3],
  ["steady_core", 4],
  ["frequent_low_basket", 5],
  ["promising_new", 6],
  ["promising_new_hv", 6],
  ["engaged_non_buyers", 7],
  ["one_and_done", 8],
  ["dormant", 9],
  ["dormant_churned", 9],
].forEach(([key, index]) => ORDER_INDEX.set(normalize(key), index));

function cohortLabel(item) {
  return item?.name ?? item?.title ?? item?.label ?? "";
}

function cohortKey(item) {
  return item?.code ?? item?.id ?? item?.cohortId ?? item?.value ?? item?._id ?? "";
}

function systemCohortRank(item) {
  const byName = ORDER_INDEX.get(normalize(cohortLabel(item)));
  if (byName != null) return byName;
  const byKey = ORDER_INDEX.get(normalize(cohortKey(item)));
  if (byKey != null) return byKey;
  return SYSTEM_COHORT_ORDER.length;
}

/**
 * Sort SYSTEM cohorts into the fixed product order.
 * Unknown system cohorts stay after the known list, A–Z among themselves.
 * Non-system items (if mixed) keep relative alphabetical order after system ones.
 */
export function sortSystemCohorts(items = []) {
  return [...items].sort((a, b) => {
    const ra = systemCohortRank(a);
    const rb = systemCohortRank(b);
    if (ra !== rb) return ra - rb;
    return String(cohortLabel(a)).localeCompare(String(cohortLabel(b)));
  });
}
