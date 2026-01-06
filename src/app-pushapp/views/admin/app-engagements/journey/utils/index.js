import { ListenerRegistry } from "../schemas/listeners";
import { ActionRegistry } from "../schemas/actions";

/* ---------------------------------------------------------
 * Internal UI State
 * --------------------------------------------------------- */
export function buildInternalState() {
  const listeners = {};

  for (const key in ListenerRegistry) {
    const schema = ListenerRegistry[key];

    listeners[key] = {
      enabled: false,
      fields: Object.fromEntries(
        schema.fields.map((f) => [f.key, f.default ?? null])
      ),
      // action: null,
      action: {
        type: "SEND_MESSAGE",
        config: Object.fromEntries(
          ActionRegistry["SEND_MESSAGE"].fields.map((f) => [f.key, null])
        ),
      },
    };
  }

  return {
    enabled: false,
    listeners,
  };
}

/* ---------------------------------------------------------
 * Server → UI
 * --------------------------------------------------------- */
export function hydrateJourney(journey, state) {
  if (!journey?.enabled) return;

  state.enabled = true;

  const entry = journey.nodes?.find((n) => n.meta?.isFirstNode);
  if (!entry) return;

  for (const l of entry.listeners || []) {
    const key = l.attrs.type;
    const target = state.listeners[key];
    if (!target) continue;

    target.enabled = true;
    target.fields.timeout = msToDuration(l.attrs[key]);

    const nodeId = l.action.attrs.nodeProps.nodeId;
    const node = journey.nodes.find((n) => n.id === nodeId);
    const action = node?.actions?.[0];
    if (!action) continue;

    target.action = {
      type: action.code,
      config: ActionRegistry[action.code].fromServer(action.attrs),
    };
  }
}

/* ---------------------------------------------------------
 * UI → Server
 * --------------------------------------------------------- */
export function buildJourney(state) {
  if (!state.enabled) return { enabled: false, nodes: [] };

  const entry = {
    id: "n1",
    code: "ACTOR",
    meta: { isFirstNode: true },
    actions: [],
    listeners: [],
  };

  const nodes = [entry];
  let nodeIdx = 2;

  for (const key in state.listeners) {
    const l = state.listeners[key];
    if (!l.enabled || !l.action) continue;

    const schema = ListenerRegistry[key];
    const nodeId = `n${nodeIdx++}`;

    entry.listeners.push({
      id: `n1_l_${key}`,
      code: schema.code,
      attrs: {
        type: key,
        [schema.attrsKey]: durationToMs(l.fields.timeout),
      },
      action: {
        id: `n1_l_${key}_a1`,
        code: "ROUTE_TO_NODE",
        attrs: {
          nodeCode: "ACTOR",
          nodeProps: { nodeId },
        },
      },
    });

    nodes.push({
      id: nodeId,
      code: "ACTOR",
      actions: [
        {
          id: crypto.randomUUID(),
          ...ActionRegistry[l.action.type].toServer(l.action.config),
        },
      ],
      listeners: [],
    });
  }

  return {
    enabled: true,
    code: null,
    nodes,
  };
}

export function durationToMs(input) {
  // Already a number → assume ms
  if (typeof input === "number") return input;

  if (!input || input.value == null) return 0;

  if (input.unit === "hrs") return input.value * 60 * 60 * 1000;
  return input.value * 60 * 1000;
}

export function msToDuration(input) {
  // Already in UI format → return as-is
  if (typeof input === "object" && input?.value != null && input?.unit) {
    return input;
  }

  const ms = Number(input);
  if (Number.isNaN(ms)) {
    return { value: 0, unit: "mins" };
  }

  if (ms % (60 * 60 * 1000) === 0) {
    return { value: ms / (60 * 60 * 1000), unit: "hrs" };
  }

  return { value: ms / (60 * 1000), unit: "mins" };
}

export function humanizeDuration({ value, unit }) {
  if (!value || !unit) return "";

  if (value === 1) {
    return `After 1 ${unit.slice(0, -1)}`;
  }

  return `After ${value} ${unit}`;
}
