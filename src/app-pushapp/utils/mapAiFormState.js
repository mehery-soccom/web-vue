const emptyFilterChild = () => ({
  type: "filter",
  filterType: null,
  field: null,
  operator: null,
  value: null,
  freqOperator: null,
  freqCount: null,
  freqPeriod: null,
  scannedEvents: null,
});

export function cloneAudienceFilterTree(node) {
  if (!node) return null;

  if (node.type === "group") {
    return {
      type: "group",
      conjunction: node.conjunction || "and",
      children: (node.children || []).map(cloneAudienceFilterTree).filter(Boolean),
    };
  }

  if (node.type === "filter") {
    return {
      _id: node._id || crypto.randomUUID(),
      type: "filter",
      filterType: node.filterType ?? null,
      field: node.field ?? null,
      operator: node.operator ?? null,
      value: node.value ?? null,
      freqOperator: node.freqOperator ?? null,
      freqCount: node.freqCount ?? null,
      freqPeriod: node.freqPeriod ?? null,
      scannedEvents: node.scannedEvents ?? null,
    };
  }

  return null;
}

export function cloneFilterNode(node) {
  return cloneAudienceFilterTree(node);
}

function filterTreeHasSlice(filter) {
  if (!filter) return false;
  if (filter.type === "filter") return filter.filterType === "slice";
  if (filter.type === "group") {
    return (filter.children || []).some(filterTreeHasSlice);
  }
  return false;
}

export function mapAiAudienceToFilter(audienceData) {
  if (!audienceData) return null;

  // API form-state returns a ready-made FilterBuilder tree
  if (audienceData.filter?.type === "group") {
    const filter = cloneFilterNode(audienceData.filter);
    if (!filter.children?.length) return null;

    return {
      mode: filterTreeHasSlice(filter) ? "slice" : "filter",
      filter,
    };
  }

  const { logic, filters = [], slices = [] } = audienceData;
  const conjunction = String(logic || "AND").toLowerCase() === "or" ? "or" : "and";

  if (slices.length) {
    return {
      mode: "slice",
      filter: {
        type: "group",
        conjunction,
        children: slices.map((slice) => ({
          ...emptyFilterChild(),
          filterType: "slice",
          field: typeof slice === "string" ? slice : slice.id || slice._id || slice.sliceId,
        })),
      },
    };
  }

  if (filters.length) {
    return {
      mode: "filter",
      filter: {
        type: "group",
        conjunction,
        children: filters.map((item) => ({
          _id: crypto.randomUUID(),
          ...emptyFilterChild(),
          filterType: item.filterType || "additionalInfo",
          field: item.field,
          operator: item.operator ?? null,
          value: item.value,
        })),
      },
    };
  }

  return null;
}

export function buildScheduleDate(dtstart, recurrenceTime) {
  if (!dtstart) return null;

  const base = new Date(dtstart);
  if (Number.isNaN(base.getTime())) return null;

  if (recurrenceTime) {
    const [h, m] = String(recurrenceTime).split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      base.setHours(h, m, 0, 0);
    }
  }

  return base.toISOString();
}

/** Parse RRULE string from AI form-state into campaign schedule UI fields. */
export function parseRruleToScheduleFields(rrule) {
  if (!rrule || typeof rrule !== "string") return null;

  const parts = Object.fromEntries(
    rrule.split(";").map((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) return [part.trim().toUpperCase(), ""];
      return [
        part.slice(0, eqIdx).trim().toUpperCase(),
        part.slice(eqIdx + 1).trim(),
      ];
    }),
  );

  const freq = parts.FREQ;
  if (!freq) return null;

  const hour = parts.BYHOUR != null ? String(parts.BYHOUR).padStart(2, "0") : "00";
  const minute = parts.BYMINUTE != null ? String(parts.BYMINUTE).padStart(2, "0") : "00";
  const time = `${hour}:${minute}`;

  const posMap = { 1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH", "-1": "LAST" };

  if (freq === "DAILY") {
    return { schedulePattern: "daily", dailyTime: time };
  }

  if (freq === "WEEKLY") {
    return {
      schedulePattern: "weekly",
      weeklyTime: time,
      scheduleDays: parts.BYDAY ? parts.BYDAY.split(",").filter(Boolean) : [],
    };
  }

  if (freq === "MONTHLY") {
    if (parts.BYMONTHDAY) {
      return {
        schedulePattern: "monthlyDate",
        monthlyDateTime: time,
        scheduleDate: String(parts.BYMONTHDAY),
      };
    }

    if (parts.BYDAY) {
      return {
        schedulePattern: "monthlyWeekday",
        monthlyWeekdayTime: time,
        scheduleWeekday: parts.BYDAY.split(",").filter(Boolean),
        scheduleWeek: parts.BYSETPOS
          ? posMap[parts.BYSETPOS] || parts.BYSETPOS
          : null,
      };
    }
  }

  return null;
}

/** Unwrap nested API envelopes until we reach { sections, version, ... }. */
export function extractAiFormState(payload) {
  if (!payload) return null;

  let current = payload;
  for (let i = 0; i < 4; i += 1) {
    if (current?.sections) return current;

    const nested = current?.data;
    if (!nested || nested === current) break;

    if (nested.sections || nested.version != null || nested.sessionId) {
      current = nested;
      continue;
    }

    break;
  }

  return current?.sections ? current : null;
}

export function formStateSignature(formState) {
  if (!formState?.sections) return "";
  return JSON.stringify(formState.sections);
}

/** Map GET /ai-form-state payload into campaign form state. */
export function mapAiFormStateToCampaignState(formState) {
  if (!formState?.sections) return null;

  const { template, audience, schedule } = formState.sections;

  return {
    template: template?.data ?? null,
    audience: audience?.data ?? null,
    schedule: schedule?.data ?? null,
    version: formState.version,
  };
}
