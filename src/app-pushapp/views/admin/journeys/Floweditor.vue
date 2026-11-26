<script setup>
import { ref, computed, watch, nextTick, reactive, onMounted } from 'vue'
import { toPng } from 'html-to-image'
import {
  VueFlow,
  useVueFlow,
  Handle,
  Position,
  Panel,
  MarkerType,
} from '@vue-flow/core'
import { Background, BackgroundVariant } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import axios from 'axios'
import { FILTER_FIELDS_MAP } from '../app-engagements/data/filterOptions'
import FilterBuilder from '../app-engagements/FilterBuilder.vue'
import { fmtNum } from '@app-pushapp/@core/utils/formatters'
import EventAutocomplete from '../../config/event-master/EventAutocomplete.vue'
import { isBroadcastKind } from './journeyKind'

// Props

const props = defineProps({
  initialFlow: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  analyticsNodesMap: { type: Object, default: () => ({}) },
  kind: { type: String, default: 'EVENT' },
  audienceMode: { type: String, default: '' },
  currentNodeId: { type: String, default: '' },
})

const isBroadcast = computed(() => isBroadcastKind(props.kind))


// API LAYER

const API = {
  customEvents: '/api/v1/event-definition',
  messageChannels: (contactType) => `/common/pub/v1/options/channels?contactType=${contactType}`,
  messageTemplates: '/common/api/v1/tmpl/hsm',
  listApps: '/api/channels',
  pushTemplates: '/api/templates/push',
  engagementTemplates: '/api/templates/in-app',
}

function extractArray(response) {
  return (
    response?.results ||
    response?.channels ||
    response?.data ||
    response?.data?.results ||
    response?.data?.channels ||
    response?.data?.data ||
    []
  )
}

// ── Global, request-deduped caches (NOT per-node) ──────────────────────────
const globalCache = reactive({
  customEvents: null,
  messageTemplatesRaw: null,
})
const globalCacheInFlight = {}

async function fetchRaw(url, params = {}) {
  try {
    const res = await axios.get(url, { params })
    return res.data
  } catch (err) {
    console.warn(`[FlowEditor] request failed for ${url}`, err)
    return null
  }
}

async function fetchOnce(key, url, params, mapFn) {
  if (globalCache[key] !== null && globalCache[key] !== undefined) {
    return globalCache[key]
  }
  if (!globalCacheInFlight[key]) {
    globalCacheInFlight[key] = fetchRaw(url, params).then((data) => {
      const mapped = mapFn(data)
      globalCache[key] = mapped
      delete globalCacheInFlight[key]
      return mapped
    })
  }
  return globalCacheInFlight[key]
}

async function loadSystemAndCustomEventsOnce() {
  const systemEvents = Object.values(FILTER_FIELDS_MAP).filter(e => e.type === 'event')
      .map(e => ({ title: e.title, value: e.value, name: e.title }))

  const customEvents = await fetchOnce('customEvents', API.customEvents, {}, (data) => {
      const items = extractArray(data)
      return items
        .map(i => ({ title: i.displayLabel || i.eventName, value: i.eventName, name: i.eventName }))
        .sort((a, b) => a.title.localeCompare(b.title))
    },
  )

  return [ ...systemEvents, ...customEvents ]
}

// Canvas shows Event Master labels for Trigger / Expected nodes (looked up live, so saved journeys show them too).
const eventLabels = ref({})
const eventKeyHint = (key) => !!key && !!eventLabels.value[key] && eventLabels.value[key] !== key
onMounted(async () => {
  const options = await loadSystemAndCustomEventsOnce()
  eventLabels.value = Object.fromEntries(options.map(o => [o.value, o.title]))
})

async function loadMessageChannelsOnce(contactType) {
  return fetchOnce(`messageChannels:${contactType}`, API.messageChannels(contactType), {}, (data) => {
    const items = extractArray(data)
    return items.map((i) => ({ title: i.name, value: i._id }))
  })
}

async function loadMessageTemplatesRawOnce() {
  return fetchOnce('messageTemplatesRaw', API.messageTemplates, { limit: 500 }, (data) => {
    return extractArray(data)
  })
}

function mapMessageTemplateOption(t) {
  return { ...t, title: t.desc || t.name || t.code, value: t.code }
}

function filterApprovedTemplatesForChannel(rawTemplates, channelId) {
  if (!channelId) return []
  return rawTemplates
    .filter((t) =>
      Array.isArray(t.approved) &&
      t.approved.some((a) => a.channelId === channelId && a.status === 'APPROVED')
    )
    .map(mapMessageTemplateOption)
}

function filterTemplatesByContactType(rawTemplates, contactType) {
  if (!contactType) return []
  return rawTemplates
    .filter((t) => t.contactType === contactType)
    .map(mapMessageTemplateOption)
}

async function loadParameterizedTemplates(url, paramName, paramValue) {
  const key = `${url}::${paramValue}`
  if (!globalCacheInFlight[key]) {
    globalCacheInFlight[key] = fetchRaw(url, { limit: 500, [paramName]: paramValue }).then((data) => {
      const items = extractArray(data)
      const mapped = items.map((i) => ({ ...i, title: i.desc || i.name || i.title, value: i.code }))
      delete globalCacheInFlight[key]
      return mapped
    })
  }
  return globalCacheInFlight[key]
}

async function loadAppsOnce() {
  return fetchOnce('listApps', API.listApps, {}, (data) => {
    const items = extractArray(data)
    return items.map((i) => ({ title: i.channel_name, value: i.channel_id }))
  })
}


// NODE TYPE DEFINITIONS

const NODE_DEFS = {
  TRIGGER: {
    label: 'Start',
    icon: '⚡',
    color: '#2563eb',
    hasInput: false,
    fixedOutputs: [{ id: 'triggered', label: 'Start' }],
    defaultAttrs: () => ({ type: 'appevent', appevent: '' }),
  },
  CONDITION: {
    label: 'Checkpoint',
    icon: '◆',
    color: '#d97706',
    hasInput: true,
    fixedOutputs: [
      { id: 'matched', label: 'Matched' },
      { id: 'not_matched', label: 'Not matched' },
    ],
    defaultAttrs: () => ({
      type: 'filter',
      filter: {
        type: 'group',
        conjunction: 'and',
        children: [
          {
            _id: crypto.randomUUID(),
            type: 'filter',
            filterType: null,
            field: null,
            operator: null,
            value: null,
            freqOperator: null,
            freqCount: null,
            freqPeriod: null,
            scannedEvents: null,
          },
        ],
      },
    }),
  },
  ACTOR: {
    label: 'Engage',
    icon: '▶',
    color: '#16a34a',
    hasInput: true,
    fixedOutputs: [],
    defaultAttrs: () => ({
      channelType: 'SEND_WHATSAPP',
      channelId: null,
      template: { code: null, id: null, name: null },
      listeners: [],
    }),
  },
  EXPECTATION: {
    label: 'Monitor',
    icon: '⏳',
    color: '#7c3aed',
    hasInput: true,
    fixedOutputs: [
      { id: 'fulfilled', label: 'Success' },
      { id: 'expired', label: 'Failed' },
    ],
    defaultAttrs: () => ({
      type: 'appevent',
      appevent: '',
      window: { value: 2, unit: 'hour' },
    }),
  },
  BROADCAST: {
    label: 'Broadcast',
    icon: '📣',
    color: '#059669',
    hasInput: true,
    fixedOutputs: [{ id: 'completed', label: 'Completed' }],
    defaultAttrs: () => ({
      channel: 'push',
      channelType: 'SEND_NOTIFICATION',
      channelId: null,
      template: { code: null, name: null },
      filter: {
        type: 'group',
        conjunction: 'and',
        children: [
          {
            _id: crypto.randomUUID(),
            type: 'filter',
            filterType: null,
            field: null,
            operator: null,
            value: null,
            freqOperator: null,
            freqCount: null,
            freqPeriod: null,
            scannedEvents: null,
          },
        ],
      },
    }),
  },
  WAIT: {
    label: 'WAIT',
    icon: '⏱',
    color: '#0891b2',
    hasInput: true,
    fixedOutputs: [{ id: 'completed', label: 'Completed' }],
    defaultAttrs: () => ({
      window: { value: 2, unit: 'hour' },
    }),
  },
  END: {
    label: 'Complete',
    icon: '⏹',
    color: '#dc2626',
    hasInput: true,
    fixedOutputs: [],
    defaultAttrs: () => ({
      status: 'SUCCESS',
    }),
  },
}

const PALETTE_CODES = ['CONDITION', 'ACTOR', 'EXPECTATION', 'WAIT', 'END']
const BROADCAST_PALETTE_CODES = ['BROADCAST', 'WAIT', 'END']
const paletteCodes = computed(() => (isBroadcast.value ? BROADCAST_PALETTE_CODES : PALETTE_CODES))
const BROADCAST_WAIT_UNITS = [
  { title: 'Minutes', value: 'minutes' },
  { title: 'Hours', value: 'hours' },
  { title: 'Days', value: 'days' },
]

function createTriggerNode() {
  return {
    id: 'node_1',
    type: 'flow-node',
    position: { x: 60, y: 200 },
    data: {
      code: 'TRIGGER',
      attrs: { type: 'appevent', appevent: '' },
    },
  }
}

function createBroadcastEntryNode() {
  return {
    id: 'node_1',
    type: 'flow-node',
    position: { x: 60, y: 200 },
    data: {
      code: 'BROADCAST',
      entry: true,
      attrs: NODE_DEFS.BROADCAST.defaultAttrs(),
    },
  }
}

function nodeHasInput(data) {
  if (data?.code === 'BROADCAST' && data.entry) return false
  return !!NODE_DEFS[data?.code]?.hasInput
}

function isProtectedNode(node) {
  if (node?.data?.code === 'TRIGGER') return true
  return node?.data?.code === 'BROADCAST' && !!node?.data?.entry
}

function defaultAttrsFor(code) {
  if (isBroadcast.value && code === 'WAIT') return { duration: { value: 2, unit: 'minutes' } }
  if (isBroadcast.value && code === 'END') return {}
  return NODE_DEFS[code].defaultAttrs()
}

function hasConfiguredFilter(filter) {
  return (filter?.children || []).some((child) => child.field || (child.children && child.children.length))
}

function pluralWaitUnit(unit) {
  return { minute: 'minutes', minutes: 'minutes', hour: 'hours', hours: 'hours', day: 'days', days: 'days' }[unit] || unit
}

function waitParts(attrs) {
  if (attrs?.duration) return attrs.duration
  return attrs?.window || {}
}

function waitUntilLabel(nodeId) {
  if (props.currentNodeId !== nodeId) return ""
  const node = nodes.value.find((item) => item.id === nodeId)
  if (node?.data?.code !== "WAIT") return ""
  const duration = waitParts(node.data?.attrs)
  const value = Number(duration?.value)
  const unit = pluralWaitUnit(duration?.unit)
  const ms = { minutes: 60000, hours: 3600000, days: 86400000 }[unit]
  if (!value || !ms) return ""
  const incoming = edges.value.find((edge) => edge.target === nodeId)
  const started = props.analyticsNodesMap?.[incoming?.source]?.endedAtIso
  const start = new Date(started)
  if (!started || Number.isNaN(start.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(start.getTime() + value * ms))
}

function broadcastWaitItems(unit) {
  if (!unit || BROADCAST_WAIT_UNITS.some((item) => item.value === unit)) return BROADCAST_WAIT_UNITS
  return [{ title: unit, value: unit }, ...BROADCAST_WAIT_UNITS]
}

function isCampaignBadge(stats) {
  return !!stats && (stats.messageCount != null || stats.sent != null || stats.failed != null || stats.opened != null)
}
const showGrid = ref(true);
const MESSAGE_CHANNELS = {
  SEND_WHATSAPP: { contactType: 'WHATSAPP', label: 'WhatsApp Channel' },
  SEND_SMS:     { contactType: 'SMS', label: 'SMS Channel' },
  SEND_EMAIL:   { contactType: 'EMAIL', label: 'Email Channel' },
}

function isMessageChannel(channelType) {
  return !!MESSAGE_CHANNELS[channelType]
}

function channelFieldLabel(channelType) {
  return MESSAGE_CHANNELS[channelType]?.label || 'App'
}

const CHANNEL_TYPE_OPTIONS = [
  { title: 'App engagement', value: 'SEND_ENGAGEMENT' },
  { title: 'Push notification', value: 'SEND_NOTIFICATION' },
  { title: 'WhatsApp', value: 'SEND_WHATSAPP' },
  { title: 'SMS', value: 'SEND_SMS' },
  { title: 'Email', value: 'SEND_EMAIL' },
]

function templateListEndpoint(channelType) {
  if (channelType === 'SEND_NOTIFICATION') return API.pushTemplates
  if (channelType === 'SEND_ENGAGEMENT') return API.engagementTemplates
  return null
}
function channelParamName(channelType) {
  return isMessageChannel(channelType) ? 'channelId' : 'appId'
}
const CHANNEL_ABBREV = {
  SEND_WHATSAPP:      'WA',
  SEND_SMS:          'SMS',
  SEND_EMAIL:        '@',
  SEND_NOTIFICATION: 'PN',
  SEND_ENGAGEMENT:   'EN',
}
function channelAbbrev(channelType) {
  return CHANNEL_ABBREV[channelType] || formatLabel(channelType)
}
const CHANNEL_ICON = {
  SEND_WHATSAPP:      'tabler-brand-whatsapp',
  SEND_SMS:          'tabler-message',
  SEND_EMAIL:        'tabler-mail',
  SEND_NOTIFICATION: 'tabler-bell-ringing',
  SEND_ENGAGEMENT:   'tabler-activity',
}
function channelIcon(channelType) {
  return CHANNEL_ICON[channelType] || null
}

function getOutputs(node) {
  const def = NODE_DEFS[node.data.code]
  if (!def) return []
  if (node.data.code === 'ACTOR') {
    const listeners = node.data.attrs?.listeners || []
    if (!listeners.length) {
      return [
        {
          id: 'completed',
          label: 'Continue flow'
        }
      ]
    }
    return listeners.map((l, index) => ({
      id: `listener_${index + 1}`,
      label: l.type === 'text' ? l.text : l.type === 'code' ? l.code : 'opened'
    }))

  }
  return def.fixedOutputs
}


// ID generators

let _nodeId = 1
let _edgeId = 1
let _listenerId = 1
const getNodeId = () => `node_${_nodeId++}`
const getEdgeId = () => `edge_${_edgeId++}`
const getListenerId = () => `listener_${_listenerId++}`


// Confirm dialog (delete)
const showClearDialog = ref(false);
const dialogVisible = ref(false)
const dialogMessage = ref('')
const dialogDeleteButtonRef = ref(null)
const dialogCancelButtonRef = ref(null)
let _dialogResolve = null
function openConfirm(msg) {
  dialogMessage.value = msg
  dialogVisible.value = true
  nextTick(() => dialogDeleteButtonRef.value?.focus())
  return new Promise((r) => { _dialogResolve = r })
}
function resolveDialog(result) {
  dialogVisible.value = false
  const resolve = _dialogResolve
  _dialogResolve = null
  resolve?.(result)
}
function dialogConfirm() { resolveDialog(true) }
function dialogCancel() { resolveDialog(false) }
function focusDialogAction(target) {
  if (target === 'cancel') dialogCancelButtonRef.value?.focus()
  else dialogDeleteButtonRef.value?.focus()
}
function onDialogKeydown(event) {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    const active = document.activeElement
    focusDialogAction(active === dialogDeleteButtonRef.value ? 'cancel' : 'delete')
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (document.activeElement === dialogCancelButtonRef.value) dialogCancel()
    else dialogConfirm()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    dialogCancel()
  }
}
function getNodeTypeLabel(node) {
  return NODE_DEFS[node?.data?.code]?.label || node?.data?.code || 'Node'
}
function getNodeDeleteMessage(node) {
  return `Delete '${getNodeTypeLabel(node)}' node?`
}
function cleanupDeletedNode(nodeId) {
  if (inspectedNodeId.value === nodeId) inspectedNodeId.value = null
  delete optionCache[nodeId]
}
async function requestNodeDeletion(nodeId) {
  if (props.disabled) return
  const node = nodes.value.find((n) => n.id === nodeId)
  if (!node || isProtectedNode(node)) return

  const ok = await openConfirm(getNodeDeleteMessage(node))
  if (!ok) return

  cleanupDeletedNode(nodeId)
  nodes.value = nodes.value.filter((n) => n.id !== nodeId)
  edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
}


// Save / load panel state

const savePanelOpen = ref(false)
const savedJson = ref('')
const flowName = ref('Boost cart value')
const flowDesc = ref('')
const copyState = ref('idle')

const loadPanelOpen = ref(false)
const loadJsonText = ref('')
const loadError = ref('')


// Drag state

const draggedType = ref(null)
const isDragOver = ref(false)


// Inspector state

const inspectedNodeId = ref(null)
const inspectedNode = computed(() => nodes.value.find((n) => n.id === inspectedNodeId.value) || null)
const optionCache = reactive({})

function ensureCache(nodeId) {
  if (!optionCache[nodeId]) {
    optionCache[nodeId] = {
      eventOptions: [],
      loadingEvents: false,
      channelOptions: [],
      loadingChannel: false,
      templateOptions: [],
      loadingTemplate: false,
    }
  }
  return optionCache[nodeId]
}

async function loadEventOptionsFor(nodeId) {
  const cache = ensureCache(nodeId)
  if (cache.eventOptions.length > 0) return
  cache.loadingEvents = true
  cache.eventOptions = await loadSystemAndCustomEventsOnce()
  cache.loadingEvents = false
}

async function loadChannelOptionsFor(nodeId, channelType) {
  const cache = ensureCache(nodeId)
  cache.loadingChannel = true
  const messageChannel = MESSAGE_CHANNELS[channelType]
  if (messageChannel) {
    cache.channelOptions = await loadMessageChannelsOnce(messageChannel.contactType)
  } else {
    cache.channelOptions = await loadAppsOnce()
  }
  cache.loadingChannel = false
}

async function loadTemplateOptionsFor(nodeId, channelType, channelOrAppId) {
  const cache = ensureCache(nodeId)
  if (!channelOrAppId) { cache.templateOptions = []; return }

  cache.loadingTemplate = true
  if (channelType === 'SEND_WHATSAPP') {
    const raw = await loadMessageTemplatesRawOnce()
    cache.templateOptions = filterApprovedTemplatesForChannel(raw, channelOrAppId)
  } else if (channelType === 'SEND_SMS' || channelType === 'SEND_EMAIL') {
    const raw = await loadMessageTemplatesRawOnce()
    cache.templateOptions = filterTemplatesByContactType(raw, MESSAGE_CHANNELS[channelType].contactType)
  } else {
    const url = templateListEndpoint(channelType)
    cache.templateOptions = url
      ? await loadParameterizedTemplates(url, channelParamName(channelType), channelOrAppId)
      : []
  }
  cache.loadingTemplate = false
}

const {
  onInit,
  onConnect,
  addEdges,
  addNodes,
  updateNode,
  updateNodeData,
  onNodesChange,
  onEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  screenToFlowCoordinate,
  onNodesInitialized,
  fitView,
  setViewport,
  toObject,
  viewport,
} = useVueFlow()

const nodes = ref([isBroadcast.value ? createBroadcastEntryNode() : createTriggerNode()])

const edges = ref([])
_nodeId = 2
_edgeId = 1

onInit(() => {
  if (props.initialFlow) {
    loadFlow(props.initialFlow)
  } else {
    nextTick(() => {
      if (nodes.value.length === 1) setViewport({ x: 0, y: 0, zoom: 1.25 })
      else fitView()
    })
    if (isBroadcast.value) loadChannelOptionsFor('node_1', 'SEND_NOTIFICATION')
    else loadEventOptionsFor('node_1')
  }
})
watch(() => props.initialFlow,
  (val) => { if (val) loadFlow(val)}
);

// Connect
function wouldCycle(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return true
  const stack = [targetId]
  const seen = new Set()
  while (stack.length) {
    const current = stack.pop()
    if (current === sourceId) return true
    if (seen.has(current)) continue
    seen.add(current)
    for (const edge of edges.value) {
      if (edge.source === current) stack.push(edge.target)
    }
  }
  return false
}

onConnect((connection) => {
  if (props.disabled) return
  if (isBroadcast.value && wouldCycle(connection.source, connection.target)) return
  const outputId = connection.sourceHandle
  const sourceNode = nodes.value.find((n) => n.id === connection.source)
  const outputDef = sourceNode ? getOutputs(sourceNode).find((o) => o.id === outputId) : null

  addEdges({
    ...connection,
    id: getEdgeId(),
    type: 'flow-edge',
    label: outputDef?.label || outputId || '',
    data: { output: outputId },
    markerEnd: MarkerType.ArrowClosed,
  })
})

// Delete with confirmation (blocked entirely in view mode)
onNodesChange(async (changes) => {
  const next = []
  for (const c of changes) {
    if (c.type === 'remove') {
      if (props.disabled) continue
      const node = nodes.value.find((n) => n.id === c.id)
      if (isProtectedNode(node)) continue
      const ok = await openConfirm(getNodeDeleteMessage(node))
      if (ok) {
        next.push(c)
        cleanupDeletedNode(c.id)
      }
    } else if (c.type === 'position' || c.type === 'dimensions' || c.type === 'select') {
      // harmless layout/selection changes, always allowed (even in view mode)
      next.push(c)
    } else {
      if (props.disabled) continue
      next.push(c)
    }
  }
  applyNodeChanges(next)
})
onEdgesChange(async (changes) => {
  const next = []
  for (const c of changes) {
    if (c.type === 'remove') {
      if (props.disabled) continue
      const ok = await openConfirm(`Delete this connection?`)
      if (ok) next.push(c)
    } else if (c.type === 'select') {
      next.push(c)
    } else {
      if (props.disabled) continue
      next.push(c)
    }
  }
  applyEdgeChanges(next)
})

// Node click → open inspector, lazy-load only what's missing (always allowed, even in view mode)
function onNodeClick({ node }) {
  inspectedNodeId.value = node.id
  const cache = ensureCache(node.id)

  if (invalidNodeIds.value.has(node.id)) {
    invalidNodeIds.value.delete(node.id)
    invalidNodeIds.value = new Set(invalidNodeIds.value)
  }
  if (node.data.code === 'TRIGGER' || node.data.code === 'EXPECTATION') {
    loadEventOptionsFor(node.id)
  }
  if (node.data.code === 'ACTOR' || node.data.code === 'EXPECTATION') {
    if (cache.channelOptions.length === 0) {
      loadChannelOptionsFor(node.id, node.data.attrs.channelType)
    }
    if (node.data.attrs.channelId && cache.templateOptions.length === 0) {
      loadTemplateOptionsFor(node.id, node.data.attrs.channelType, node.data.attrs.channelId)
    }
  }
  if (node.data.code === 'BROADCAST') {
    const channelType = node.data.attrs.channelType || 'SEND_NOTIFICATION'
    if (cache.channelOptions.length === 0) loadChannelOptionsFor(node.id, channelType)
    if (node.data.attrs.channelId && cache.templateOptions.length === 0) {
      loadTemplateOptionsFor(node.id, channelType, node.data.attrs.channelId)
    }
  }
}
function onPaneClick() {
  inspectedNodeId.value = null
}
function closeInspector() {
  inspectedNodeId.value = null
}

// Update a node's attrs — blocked in view mode
function setNodeAttr(path, value) {
  if (props.disabled) return
  if (!inspectedNode.value) return
  const nodeId = inspectedNode.value.id
  updateNode(nodeId, (n) => {
    const attrs = JSON.parse(JSON.stringify(n.data.attrs || {}))
    const segments = path.split('.')
    let target = attrs
    for (let i = 0; i < segments.length - 1; i++) {
      target[segments[i]] = target[segments[i]] ?? {}
      target = target[segments[i]]
    }
    target[segments[segments.length - 1]] = value
    return { ...n, data: { ...n.data, attrs } }
  })
}

// ── Channel-type cascade ──
async function onChannelTypeChange(nodeId, channelType) {
  if (props.disabled) return
  setNodeAttr('channelType', channelType)
  setNodeAttr('channelId', null)
  setNodeAttr('template.code', null)
  const cache = ensureCache(nodeId)
  cache.channelOptions = []
  cache.templateOptions = []
  await loadChannelOptionsFor(nodeId, channelType)
}
async function onChannelIdChange(nodeId, channelType, channelId) {
  if (props.disabled) return
  setNodeAttr('channelId', channelId)
  setNodeAttr('template.code', null)
  const cache = ensureCache(nodeId)
  cache.templateOptions = []
  await loadTemplateOptionsFor(nodeId, channelType, channelId)
}

function onTemplateChange(nodeId, templateCode, code) {
  if (props.disabled) return
  setNodeAttr('template.code', templateCode)
  const selectedTemplate = optionCache[nodeId]?.templateOptions?.find( o => o.value === templateCode)
  setNodeAttr('template.name', selectedTemplate?.title || '')
  const node = nodes.value.find(n => n.id === nodeId)

  if(code === 'ACTOR' && !isMessageChannel(node?.data?.attrs?.channelType)){
    let buttons = selectedTemplate?.options?.buttons || []
    if (!buttons.length) buttons = selectedTemplate?.style?.btn || []
    console.log("btns", buttons)

    updateNode(nodeId, n => ({
      ...n,
      data: {
        ...n.data,
        attrs: {
          ...n.data.attrs,
          listeners: buttons.map((b, index) => ({
            id: `listener_${index + 1}`,
            ...(node?.data?.attrs?.channelType === "SEND_ENGAGEMENT"
            ? {
                type: "text",
                text: b.label || b.button_id,
              }
            : {
                type: "code",
                code: b.label || b.button_id,
            }),
            // type: 'code',
            // code: b.label || b.button_id,
          }))
        }
      }
    }))
  }
}

// ── ACTOR listener management ──
function addListener() {
  if (props.disabled) return
  if (!inspectedNode.value) return
  const nodeId = inspectedNode.value.id
  updateNode(nodeId, (n) => {
    const attrs = JSON.parse(JSON.stringify(n.data.attrs || {}))
    attrs.listeners = attrs.listeners || []
    attrs.listeners.push({ id: `listener_${attrs.listeners.length + 1}`, type: 'code', text: '', code: ''})
    return { ...n, data: { ...n.data, attrs } }
  })
}
function updateListenerText(index, value) {
  if (props.disabled) return
  if (!inspectedNode.value) return
  const nodeId = inspectedNode.value.id

  updateNode(nodeId, n => {
    const attrs = JSON.parse(JSON.stringify(n.data.attrs || {}))
    if (attrs.listeners[index].type === 'text') attrs.listeners[index].text = value
    else if (attrs.listeners[index].type === 'code') attrs.listeners[index].code = value

    return { ...n, data: { ...n.data, attrs }}
  })
}
function setListenerType(index, value) {
  if (props.disabled) return
  if (!inspectedNode.value) return
  const nodeId = inspectedNode.value.id

  updateNode(nodeId, n => {
    const attrs = JSON.parse(JSON.stringify(n.data.attrs || {}))
    attrs.listeners[index].type = value
    if (value === 'text') {
      delete attrs.listeners[index].code
      attrs.listeners[index].text ??= ''
    }
    else if (value === 'code') {
      delete attrs.listeners[index].text
      attrs.listeners[index].code ??= ''
    }
    else {
      delete attrs.listeners[index].text
      delete attrs.listeners[index].code
    }

    return { ...n, data: { ...n.data, attrs } }
  })
}
function removeListener(index) {
  if (props.disabled) return
  if (!inspectedNode.value) return
  const nodeId = inspectedNode.value.id
  const listener = inspectedNode.value.data.attrs.listeners[index]
  updateNode(nodeId, (n) => {
    const attrs = JSON.parse(JSON.stringify(n.data.attrs || {}))
    attrs.listeners.splice(index, 1)
    return { ...n, data: { ...n.data, attrs } }
  })
  edges.value = edges.value.filter((e) => !(e.source === nodeId && e.data?.output === listener.emit))
}

const invalidNodeIds = ref(new Set())

function isOutputConnected(nodeId, outputId) {
  return edges.value.some(
    (e) => e.source === nodeId && (e.data?.output === outputId || e.sourceHandle === outputId)
  )
}

function findUpstreamAppEvent(nodeId, visited = new Set()) {
  if (visited.has(nodeId)) return null
  visited.add(nodeId)
  const edge = edges.value.find((e) => e.target === nodeId)
  if (!edge) return null
  const sourceNode = nodes.value.find((n) => n.id === edge.source)
  if (!sourceNode) return null
  if (sourceNode.data.code === 'TRIGGER' || sourceNode.data.code === 'EXPECTATION') {
    return sourceNode.data.attrs?.appevent || null
  }
  if (sourceNode.data.code === 'CONDITION') {
    return findUpstreamAppEvent(sourceNode.id, visited)
  }
  return null
}

const connectedAppEventForInspectedNode = computed(() => {
  if (!inspectedNode.value || inspectedNode.value.data.code !== 'CONDITION') return null
  return findUpstreamAppEvent(inspectedNode.value.id)
})
function hasCycle() {
  const visiting = new Set()
  const visited = new Set()
  const outgoing = new Map()
  for (const edge of edges.value) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, [])
    outgoing.get(edge.source).push(edge.target)
  }
  function walk(id) {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const next of outgoing.get(id) || []) {
      if (walk(next)) return true
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return nodes.value.some((node) => walk(node.id))
}

function validateBroadcastFlow() {
  const errors = []
  const invalidIds = new Set()
  const allowed = new Set(['BROADCAST', 'WAIT', 'END'])
  const incoming = new Map(nodes.value.map((node) => [node.id, 0]))
  for (const edge of edges.value) {
    if (incoming.has(edge.target)) incoming.set(edge.target, incoming.get(edge.target) + 1)
  }
  const roots = nodes.value.filter((node) => (incoming.get(node.id) || 0) === 0)
  const ends = nodes.value.filter((node) => node.data.code === 'END')

  if (roots.length !== 1 || roots[0]?.data?.code !== 'BROADCAST') {
    errors.push({ nodeId: roots[0]?.id, label: 'Broadcast', messages: ['The journey needs one Broadcast entry'] })
    if (roots[0]?.id) invalidIds.add(roots[0].id)
  }
  if (ends.length !== 1) {
    errors.push({ nodeId: ends[0]?.id, label: 'Complete', messages: ['The journey needs exactly one Complete node'] })
    ends.forEach((node) => invalidIds.add(node.id))
  }
  if (hasCycle()) {
    errors.push({ nodeId: null, label: 'Flow', messages: ['The flow cannot contain a cycle'] })
  }

  for (const node of nodes.value) {
    const code = node.data.code
    const attrs = node.data.attrs || {}
    const messages = []
    if (!allowed.has(code)) messages.push('This node is not allowed on this journey')
    if (code === 'BROADCAST') {
      if (!attrs.channelId) messages.push('Select an app')
      if (!attrs.template?.code) messages.push('Select a template')
      if (props.audienceMode === 'FLEXIBLE' && !hasConfiguredFilter(attrs.filter)) {
        messages.push('Configure the audience filter')
      }
      if (!isOutputConnected(node.id, 'completed')) messages.push('Connect the output to a node')
    } else if (code === 'WAIT') {
      const duration = attrs.duration || {}
      if (!duration.value) messages.push('Set the wait time')
      if (!duration.unit) messages.push('Select the time unit')
      if (!isOutputConnected(node.id, 'completed')) messages.push('Connect the output to a node')
    }
    if (messages.length) {
      invalidIds.add(node.id)
      errors.push({ nodeId: node.id, label: NODE_DEFS[code]?.label || code, messages })
    }
  }

  invalidNodeIds.value = invalidIds
  return { valid: errors.length === 0, errors }
}

function validateFlow() {
  if (isBroadcast.value) return validateBroadcastFlow()
  const errors = []
  const invalidIds = new Set()

  for (const n of nodes.value) {
    const code = n.data.code
    const attrs = n.data.attrs || {}
    const messages = []

    if (code === 'TRIGGER') {
      if (!attrs.appevent) messages.push('Select an app event')
      if (!isOutputConnected(n.id, 'triggered')) messages.push('Connect the Start output to a node')
    } else if (code === 'CONDITION') {
      const hasConfiguredFilter = (attrs.filter?.children || []).some(
        (c) => c.field || (c.children && c.children.length)
      )
      if (!hasConfiguredFilter) messages.push('Configure the condition filter')
      if (!isOutputConnected(n.id, 'matched')) messages.push('Connect the Matched output to a node')
      if (!isOutputConnected(n.id, 'not_matched')) messages.push('Connect the Not matched output to a node')

    } else if (code === 'ACTOR') {
      if (!attrs.channelType) messages.push('Select an action')
      if (!attrs.channelId) messages.push('Select a channel/app')
      if (!attrs.template?.code) messages.push('Select a template')

      const listeners = attrs.listeners || []
      if (listeners.length > 0) {
        listeners.forEach((l, index) => {
          const outId = `listener_${index + 1}`
          const label = l.type === 'text' ? l.text : l.type === 'code' ? l.code : 'opened'
          if (!isOutputConnected(n.id, outId)) {
            messages.push(`Connect output "${label || outId}" to a node`)
          }
        })
      }
    } else if (code === 'EXPECTATION') {
      if (!attrs.appevent) messages.push('Select an expected event')
      if (!attrs.window?.value) messages.push('Set the wait time')
      if (!attrs.window?.unit) messages.push('Select the time unit')
      if (!isOutputConnected(n.id, 'fulfilled')) messages.push('Connect the Success output to a node')
      if (!isOutputConnected(n.id, 'expired')) messages.push('Connect the Failed output to a node')
    } else if (code === 'WAIT') {
      if (!attrs.window?.value) messages.push('Set the wait time')
      if (!attrs.window?.unit) messages.push('Select the time unit')
      if (!isOutputConnected(n.id, 'completed')) messages.push('Connect the output to a node')
    } else if (code === 'END') {
      if (!attrs.status) messages.push('Select a status (Succeeded / Failed)')
    }

    if (messages.length) {
      invalidIds.add(n.id)
      errors.push({ nodeId: n.id, label: NODE_DEFS[code]?.label || code, messages })
    }
  }
  invalidNodeIds.value = invalidIds
  return { valid: errors.length === 0, errors }
}

function clearValidation() {
  invalidNodeIds.value = new Set()
}
// Drag & drop from sidebar palette — no-ops in view mode
function onDragStart(event, code) {
  if (props.disabled) return
  event.dataTransfer?.setData('application/flownode', code)
  draggedType.value = code
  document.body.style.userSelect = 'none'
}
function onDragOver(event) {
  if (props.disabled) return
  event.preventDefault()
  if (draggedType.value) {
    isDragOver.value = true
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }
}
function onDragLeave() { isDragOver.value = false }
function onDrop(event) {
  if (props.disabled) return
  isDragOver.value = false
  document.body.style.userSelect = ''
  const code = event.dataTransfer?.getData('application/flownode') || draggedType.value
  if (!code || !NODE_DEFS[code] || code === 'TRIGGER') return
  if (isBroadcast.value && !BROADCAST_PALETTE_CODES.includes(code)) return
  if (isBroadcast.value && code === 'END' && nodes.value.some((node) => node.data.code === 'END')) return

  const raw = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const GRID = 20
  const position = {
    x: Math.round(raw.x / GRID) * GRID,
    y: Math.round(raw.y / GRID) * GRID,
  }

  const nodeId = getNodeId()
  const newNode = {
    id: nodeId,
    type: 'flow-node',
    position,
    data: { code, entry: false, attrs: defaultAttrsFor(code) },
  }

  const { off } = onNodesInitialized(() => {
    updateNode(nodeId, (n) => ({
      position: {
        x: Math.round((n.position.x - (n.dimensions?.width ?? 0) / 2) / GRID) * GRID,
        y: Math.round((n.position.y - (n.dimensions?.height ?? 0) / 2) / GRID) * GRID,
      },
    }))
    off()
  })

  addNodes(newNode)
  draggedType.value = null
}

// Build & save the backend-shaped payload
function buildBroadcastPayload() {
  const nodesDict = {}
  for (const node of nodes.value) {
    const code = node.data.code
    const attrs = node.data.attrs || {}
    const entry = { id: node.id, code, attrs: {} }
    if (code === 'BROADCAST') {
      entry.attrs = {
        channel: 'push',
        channelType: 'SEND_NOTIFICATION',
        channelId: attrs.channelId,
        template: {
          code: attrs.template?.code,
          name: attrs.template?.name,
        },
      }
      if (hasConfiguredFilter(attrs.filter)) entry.attrs.filter = attrs.filter
      entry.outputs = [{ id: 'completed' }]
    } else if (code === 'WAIT') {
      const duration = attrs.duration || {}
      entry.attrs = {
        duration: {
          value: Number(duration.value),
          unit: pluralWaitUnit(duration.unit),
        },
      }
      entry.outputs = [{ id: 'completed' }]
    } else if (code === 'END') {
      entry.attrs = {}
    }
    nodesDict[node.id] = entry
  }

  const edgesArr = edges.value.map((edge) => ({
    id: edge.id,
    source: {
      node: edge.source,
      output: edge.data?.output ?? edge.sourceHandle ?? null,
    },
    target: { node: edge.target },
  }))

  return {
    flow: { nodes: nodesDict, edges: edgesArr },
    flowRenderer: { drawflow: { Home: toObject() } },
  }
}

function buildFlowPayload() {
  if (isBroadcast.value) return buildBroadcastPayload()
  const nodesDict = {}
  for (const n of nodes.value) {
    const code = n.data.code
    const entry = { id: n.id, code, attrs: n.data.attrs || {} }
    const outputs = getOutputs(n)
    if (code === 'ACTOR') {
      const a = n.data.attrs || {}
      entry.attrs = {
        actions: [
          {
            id: 'action_1',
            code: a.channelType,
            attrs: {
              channelId: a.channelId,
              ...(isMessageChannel(a.channelType) ? { type: 'template' } : {}),
              template: {
                code: a.template?.code,
                id: a.template?.id,
                name: a.template?.name,
              },
            },
          },
        ],
      }
      const listeners = n.data.attrs?.listeners || []
      if (!listeners.length) {
        entry.listeners = []
        entry.outputs = [{ id: 'completed' }]
      }
      else {
        entry.listeners = listeners.map(l => ({
          ...l,
          actionId: 'action_1',
          emit: l.type === 'text' ? l.text : l.type === 'code' ? l.code : 'opened'
        }))
        entry.outputs = entry.listeners.map(l => ({ id: l.emit}))
      }
    } else if (code === 'EXPECTATION') {
      const a = n.data.attrs || {}
      entry.attrs = {
        type: a.type,
        appevent: a.appevent,
        name: a.name,
        window: {
          value: a.window?.value,
          unit: a.window?.unit,
        },
        actions: a.template?.code ? [
          {
            id: 'action_1',
            code: a.channelType,
            attrs: {
              channelId: a.channelId,
              ...(isMessageChannel(a.channelType) ? { type: 'template' } : {}),
              template: {
                code: a.template?.code,
                id: a.template?.id,
                name: a.template?.name,
              },
            },
          },
        ] : [],
      }
      entry.outputs = outputs.map(o => ({ id: o.id })) // fulfilled / expired — fixed, never listener-driven
    } else if (outputs.length) {
      entry.outputs = outputs.map(o => ({ id: o.id}))
    }
    nodesDict[n.id] = entry
  }

  const edgesArr = edges.value.map((e) => ({
    id: e.id,
    // source: { node: e.source, output: e.data?.output ?? e.sourceHandle ?? null },
    source: {
      node: e.source,
      output: (() => {
        const output = e.data?.output ?? e.sourceHandle ?? null

        const actorNode = nodes.value.find(n => n.id === e.source && n.data.code === "ACTOR")
        if (!actorNode) return output
        const listener = actorNode.data.attrs?.listeners?.find(l => l.id === output)
        if (!listener) return output

        return listener.type === "text" ? listener.text : listener.type === "code" ? listener.code : "opened"
      })(),
    },
    target: { node: e.target },
  }))

  const renderState = toObject()

  return {
    flow: { nodes: nodesDict, edges: edgesArr },
    flowRenderer: { drawflow: { Home: renderState } },
  }
}

function ensureFilterIds(node) {
  if (!node) return node;
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (!child._id) child._id = crypto.randomUUID();
      ensureFilterIds(child);
    });
  }
  return node;
}

function ensureBroadcastEditorAttrs(attrs) {
  const next = { ...(attrs || {}) }
  if (!next.channel) next.channel = 'push'
  if (!next.channelType) next.channelType = 'SEND_NOTIFICATION'
  if (!next.template) next.template = { code: null, name: null }
  if (!next.filter) next.filter = NODE_DEFS.BROADCAST.defaultAttrs().filter
  else ensureFilterIds(next.filter)
  return next
}

function markBroadcastEntry() {
  if (!isBroadcast.value) return
  const incoming = new Set(edges.value.map((edge) => edge.target))
  nodes.value = nodes.value.map((node) => {
    if (node.data?.code !== 'BROADCAST') return node
    return { ...node, data: { ...node.data, entry: !incoming.has(node.id) } }
  })
}

function loadFlow(payload) {
  const home = payload?.flowRenderer?.drawflow?.Home
  if (home && Array.isArray(home.nodes) && home.nodes.length > 0) {
    home.nodes.forEach((n) => {
      if (n.data?.code === 'CONDITION' && n.data?.attrs?.filter) {
        ensureFilterIds(n.data.attrs.filter);
      }
      if (n.data?.code === 'BROADCAST') {
        n.data.attrs = ensureBroadcastEditorAttrs(n.data.attrs)
      }
    })
    nodes.value = home.nodes
    edges.value = home.edges || []
    nextTick(() => {
      if (home.viewport) setViewport(home.viewport)
      else fitView()
    })
  } else {
    const flowNodes = payload?.flow?.nodes || {}
    const flowEdges = payload?.flow?.edges || []
    const ids = Object.keys(flowNodes)

    nodes.value = ids.map((id, i) => {
      const n = flowNodes[id]
      return {
        id,
        type: 'flow-node',
        position: { x: 60 + i * 260, y: 180 },
        data: {
          code: n.code,
          attrs: n.code === 'BROADCAST' ? ensureBroadcastEditorAttrs(n.attrs) : (n.attrs || {}),
        },
      }
    })

    edges.value = flowEdges.map((e, index) => ({
      id: e.id || `edge_${index + 1}`,
      type: 'flow-edge',
      source: e.source.node,
      target: e.target.node,
      sourceHandle: e.source.output,
      data: { output: e.source.output },
      label: e.source.output || '',
      markerEnd: MarkerType.ArrowClosed,
    }))

    nextTick(() => fitView())
  }

  markBroadcastEntry()

  const maxNodeNum = Math.max(0, ...nodes.value.map((n) => Number(String(n.id).match(/(\d+)$/)?.[1]) || 0))
  const maxEdgeNum = Math.max(0, ...edges.value.map((e) => Number(String(e.id).match(/(\d+)$/)?.[1]) || 0))
  _nodeId = maxNodeNum + 1
  _edgeId = maxEdgeNum + 1
}

function confirmLoad() {
  if (props.disabled) return
  try {
    const payload = JSON.parse(loadJsonText.value)
    loadFlow(payload)
    loadPanelOpen.value = false
    inspectedNodeId.value = null
  } catch (err) {
    loadError.value = 'That isn\'t valid JSON — check for a missing brace or comma.'
  }
}
function onLoadFileChange(event) {
  if (props.disabled) return
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { loadJsonText.value = String(reader.result || '') }
  reader.readAsText(file)
}
function formatLabel(value) {
  const str = String(value || '').toLowerCase().replaceAll('_', ' ')
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const nodeBodyLines = (node) => {
  const data = node.data || {}
  const attrs = data.attrs || {}
  if (data.code === 'TRIGGER') {
    return [formatLabel(attrs.name) || formatLabel(attrs.appevent) || 'No Event Selected']
  }
  if (data.code === 'CONDITION') {
    return [`${attrs.filter?.children?.length || 0} condition(s)`]
  }
  if (data.code === 'ACTOR') {
    return [`${channelAbbrev(attrs.channelType)} · ${attrs.template?.name || attrs.template?.code || 'No Template'}`]
  }
  if (data.code === 'EXPECTATION') {
    const lines = [`${formatLabel(attrs.name) || formatLabel(attrs.appevent) || 'No event'} (${attrs.window?.value ?? ''}${attrs.window?.unit?.[0] || ''})`]
    if (attrs.channelType) {
      lines.push(`${channelAbbrev(attrs.channelType)} · ${attrs.template?.name || attrs.template?.code || 'No Template'}`)
    }
    return lines
  }
  if (data.code === 'BROADCAST') {
    return [`${channelAbbrev(attrs.channelType)} · ${attrs.template?.name || attrs.template?.code || 'No Template'}`]
  }
  if (data.code === 'WAIT') {
    const wait = waitParts(attrs)
    return [`Wait for (${wait.value ?? ''}${wait.unit?.[0] || ''})`]
  }
  if (data.code === 'END') {
    return [attrs.status ? formatLabel(attrs.status) : 'Terminates Flow']
  }
  return ['']
}

const buildFlowHtml = (title = 'Journey flow') => {
  const flowNodes = nodes.value || []
  if (!flowNodes.length) return ''

  const NODE_W = 220
  const NODE_H = 86
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  flowNodes.forEach((node) => {
    const x = node.position?.x ?? 0
    const y = node.position?.y ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y - 36)
    maxX = Math.max(maxX, x + NODE_W + 24)
    maxY = Math.max(maxY, y + NODE_H + 24)
  })

  const pad = 56
  const width = Math.max(320, maxX - minX + pad * 2)
  const height = Math.max(240, maxY - minY + pad * 2)
  const ox = pad - minX
  const oy = pad - minY
  const nodeById = Object.fromEntries(flowNodes.map((node) => [node.id, node]))

  const edgeMarkup = (edges.value || []).map((edge) => {
    const source = nodeById[edge.source]
    const target = nodeById[edge.target]
    if (!source || !target) return ''
    const outputs = getOutputs(source)
    const handle = edge.sourceHandle || edge.data?.output
    const outIndex = Math.max(0, outputs.findIndex((output) => output.id === handle))
    const outCount = Math.max(outputs.length, 1)
    const sx = (source.position?.x ?? 0) + ox + NODE_W
    const sy = (source.position?.y ?? 0) + oy + ((outIndex + 0.5) / outCount) * NODE_H
    const tx = (target.position?.x ?? 0) + ox
    const ty = (target.position?.y ?? 0) + oy + NODE_H / 2
    const bend = Math.max(48, Math.abs(tx - sx) / 2)
    const label = edge.label || outputs[outIndex]?.label || ''
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    return `<path d="M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}" />${
      label
        ? `<text x="${mx}" y="${my - 8}" text-anchor="middle">${escapeHtml(label)}</text>`
        : ''
    }`
  }).join('')

  const cardMarkup = flowNodes.map((node) => {
    const def = NODE_DEFS[node.data?.code] || {}
    const x = (node.position?.x ?? 0) + ox
    const y = (node.position?.y ?? 0) + oy
    const stats = props.analyticsNodesMap?.[node.id]
    const badges = stats
      ? (stats.messageCount != null || stats.sent != null
        ? `<div class="badges"><span class="reached">Messages ${escapeHtml(fmtNum(stats.messageCount ?? 0))}</span><span class="current">Sent ${escapeHtml(fmtNum(stats.sent ?? 0))}</span><span class="current">Failed ${escapeHtml(fmtNum(stats.failed ?? 0))}</span><span class="reached">Opened ${escapeHtml(fmtNum(stats.opened ?? 0))}</span></div>`
        : `<div class="badges"><span class="reached">Reached ${escapeHtml(fmtNum(stats.reachedCount ?? 0))}</span>${
          node.data?.code === 'TRIGGER'
            ? ''
            : `<span class="current">Here ${escapeHtml(fmtNum(stats.currentlyAtCount ?? 0))}</span>`
        }</div>`)
      : ''
    const body = nodeBodyLines(node).map((line) => escapeHtml(line)).join('<br>')
    return `<article class="node" style="left:${x}px;top:${y}px;--c:${def.color || '#94a3b8'}">${badges}<div class="card"><div class="head"><span>${def.icon || ''}</span><span>${escapeHtml(def.label || node.data?.code || 'Node')}</span></div><div class="body">${body}</div></div></article>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f5f2; color: #2f2b3d; font-family: Inter, Segoe UI, sans-serif; }
  .toolbar { position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; align-items: center; padding: 10px 14px; background: #fff; border-bottom: 1px solid #e6e3dc; }
  .toolbar strong { margin-right: auto; }
  button { border: 1px solid #d9d5cc; background: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  .stage { overflow: auto; height: calc(100vh - 52px); }
  .canvas { position: relative; transform-origin: top left; background-image: linear-gradient(#ebe8e0 1px, transparent 1px), linear-gradient(90deg, #ebe8e0 1px, transparent 1px); background-size: 20px 20px; }
  svg.edges { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  svg.edges path { fill: none; stroke: #b0aa9b; stroke-width: 1.6; }
  svg.edges text { font-size: 10px; fill: #6e6b7b; }
  .node { position: absolute; width: ${NODE_W}px; }
  .badges { display: flex; justify-content: center; gap: 6px; margin-bottom: 6px; font-size: 11px; font-weight: 700; }
  .reached, .current { border-radius: 999px; padding: 2px 8px; }
  .reached { background: #ece9ff; color: #7367f0; }
  .current { background: #fff1e3; color: #c2410c; }
  .card { background: #fff; border: 1.5px solid var(--c); border-radius: 9px; box-shadow: 0 6px 16px rgba(0,0,0,0.05); }
  .head { display: flex; gap: 6px; align-items: center; padding: 7px 10px; color: var(--c); font-size: 12px; font-weight: 700; border-bottom: 1px solid #f0eee8; }
  .body { padding: 9px 11px 11px; font-size: 12px; line-height: 1.4; word-break: break-word; }
</style>
</head>
<body>
  <div class="toolbar">
    <strong>${escapeHtml(title)}</strong>
    <button type="button" onclick="setZoom(zoom * 1.2)">Zoom in</button>
    <button type="button" onclick="setZoom(zoom / 1.2)">Zoom out</button>
    <button type="button" onclick="fit()">Fit</button>
  </div>
  <div class="stage" id="stage">
    <div class="canvas" id="canvas" style="width:${width}px;height:${height}px">
      <svg class="edges" viewBox="0 0 ${width} ${height}">${edgeMarkup}</svg>
      ${cardMarkup}
    </div>
  </div>
<script>
  let zoom = 1;
  const canvas = document.getElementById('canvas');
  const stage = document.getElementById('stage');
  function setZoom(next) {
    zoom = Math.min(6, Math.max(0.15, next));
    canvas.style.transform = 'scale(' + zoom + ')';
  }
  function fit() {
    const pad = 24;
    const scale = Math.min(
      (stage.clientWidth - pad) / ${width},
      (stage.clientHeight - pad) / ${height},
      1
    );
    setZoom(scale > 0 ? scale : 1);
  }
  fit();
</${'script'}>
</body>
</html>`
}

function clearAll() {
  if (props.disabled) return
  if (isBroadcast.value) {
    const entry = nodes.value.find((node) => node.data.code === 'BROADCAST' && node.data.entry)
      || createBroadcastEntryNode()
    nodes.value = [entry]
  } else {
    const trigger = nodes.value.find((n) => n.data.code === 'TRIGGER')
    nodes.value = trigger ? [trigger] : []
  }
  edges.value = []
  showClearDialog.value = false;
}

const canvasWrapperRef = ref(null)
const captureFlowScreenshot = async () => {
  fitView({ padding: 0.08, duration: 0 })
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 200))

  const el = canvasWrapperRef.value
  if (!el) return null
  const COLOR_PROPS = [
    'backgroundColor', 'color', 'borderColor',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'outlineColor', 'fill',
  ]
  const allEls = [el, ...el.querySelectorAll('*')]
  const colorSaved = allEls.map((child) => {
    const tag = child.tagName?.toLowerCase()
    if (tag === 'path' || tag === 'polyline' || tag === 'line') return { child, snapshot: {} }
    const cs = window.getComputedStyle(child)
    const snapshot = {}
    COLOR_PROPS.forEach((prop) => {
      const computed = cs[prop]
      if (computed && computed !== 'rgba(0, 0, 0, 0)' && computed !== 'none' && computed !== '') {
        snapshot[prop] = { original: child.style[prop], computed }
        child.style[prop] = computed
      }
    })
    return { child, snapshot }
  })

  const zoom = viewport.value?.zoom ?? 1
  const scaledStroke = 1.6 * zoom

  const interactionPaths = [...el.querySelectorAll('.vue-flow__edge-interaction')]
  const interactionSaved = interactionPaths.map((p) => ({ p, display: p.style.display }))
  interactionPaths.forEach((p) => { p.style.display = 'none' })

  const edgePaths = [...el.querySelectorAll('.vue-flow__edge-path')]
  const strokeSaved = edgePaths.map((p) => ({
    p,
    stroke: p.style.stroke,
    fill: p.style.fill,
    strokeWidth: p.style.strokeWidth,
    strokeOpacity: p.style.strokeOpacity,
    vectorEffect: p.style.vectorEffect,
  }))
  edgePaths.forEach((p) => {
    const cs = window.getComputedStyle(p)
    const computedStroke = cs.getPropertyValue('stroke')
    const strokeColor = (computedStroke && computedStroke !== 'rgb(0, 0, 0)') ? computedStroke : '#b0aa9b'
    p.style.stroke = strokeColor
    p.style.fill = 'none'
    p.style.strokeOpacity = '1'
    p.style.strokeWidth = String(scaledStroke)
    p.style.vectorEffect = 'non-scaling-stroke'
  })

  try {
    const opts = {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      skipFonts: true,
    }
    await toPng(el, opts)
    return await toPng(el, opts)
  } finally {
    colorSaved.forEach(({ child, snapshot }) => {
      Object.entries(snapshot).forEach(([prop, { original }]) => {
        child.style[prop] = original
      })
    })
    interactionSaved.forEach(({ p, display }) => { p.style.display = display })
    strokeSaved.forEach(({ p, stroke, fill, strokeWidth, strokeOpacity, vectorEffect }) => {
      p.style.stroke = stroke
      p.style.fill = fill
      p.style.strokeWidth = strokeWidth
      p.style.strokeOpacity = strokeOpacity
      p.style.vectorEffect = vectorEffect
    })
  }
}

defineExpose({
  loadFlow,
  buildFlowPayload,
  validateFlow,
  clearValidation,
  captureFlowScreenshot,
  buildFlowHtml,
})
</script>

<template>
  <div class="flow-editor">

    <!-- ════════════════ SIDEBAR ════════════════ -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">Journey Builder</span>
        <span v-if="disabled" class="view-only-badge">View only</span>
      </div>

      <div v-if="!disabled" class="sidebar-section">
        <p class="section-label">Nodes</p>
        <p class="field-hint" style="margin:0 0 4px">{{ isBroadcast ? 'The first Broadcast node is the entry and can’t be duplicated as an entry.' : 'Trigger is added automatically and can\'t be duplicated.' }}</p>
        <div
          v-for="code in paletteCodes" :key="code"
          class="node-pill"
          :style="{ '--pill-color': NODE_DEFS[code].color }"
          draggable="true"
          @dragstart="onDragStart($event, code)"
        >
          <span class="pill-icon">{{ NODE_DEFS[code].icon }}</span> {{ NODE_DEFS[code].label }}
        </div>
      </div>

      <div class="sidebar-section">
        <p class="section-label">Actions</p>
        <button class="action-btn" @click="fitView()">⊞ Fit view</button>
        <button v-if="!disabled" class="action-btn danger" @click="showClearDialog = true"> ✕ Clear canvas </button>
        <button class="action-btn" @click="showGrid = !showGrid">
          {{ showGrid ? '▦ Hide grid' : '▦ Show grid' }}
        </button>
        <!-- <button class="action-btn" @click="setViewport({ x: 0, y: 0, zoom: 1 })">Move to Start</button> -->
        <!-- <button v-if="!disabled" class="action-btn danger" @click="clearAll">✕ Clear canvas</button> -->

          <VDialog v-model="showClearDialog" max-width="420">
            <VCard>
              <VCardTitle>Clear Canvas?</VCardTitle>
              <VCardText>
                This will remove all nodes and connections from the canvas except the entry node.
                This action cannot be undone.
              </VCardText>
              <VCardActions>
                <VSpacer />
                <VBtn variant="text" @click="showClearDialog = false"> Cancel </VBtn>
                <VBtn color="error" @click="clearAll"> Clear Canvas </VBtn>
              </VCardActions>
            </VCard>
          </VDialog>
      </div>

      <div class="sidebar-section hint-section">
        <p class="section-label">Tips</p>
        <ul class="hints">
          <li v-if="isBroadcast">Broadcast is the entry — set its channel, app, and template in the inspector</li>
          <li v-else>Start is fixed — set its app event in the inspector</li>
          <li>Drag a node type onto canvas</li>
          <li>Drag from a colored dot to connect an output</li>
          <li>Click a node to edit its settings</li>
          <li>Select + Backspace to delete</li>
          <li v-if="!isBroadcast">ACTOR outputs come from listeners you add</li>
        </ul>
      </div>
    </aside>

    <!-- ════════════════ CANVAS ════════════════ -->
    <div
      ref="canvasWrapperRef"
      class="canvas-wrapper"
      :class="{ 'drag-over': isDragOver }"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :apply-default="false"
        :min-zoom="0.15"
        :max-zoom="3"
        :snap-to-grid="showGrid"
        :snap-grid="[20, 20]"
        fit-view-on-init
        :delete-key-code="disabled ? null : 'Backspace'"
        :nodes-draggable="!disabled"
        :nodes-connectable="!disabled"
        :elements-selectable="true"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
      >
        <Background :variant="showGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots" :gap="20" :size="1" :pattern-color="showGrid ? '#ebe8e0' : '#d6d3cb'" />
        <Controls position="top-left" :show-interactive="false" />
        <MiniMap :node-color="(n) => NODE_DEFS[n.data?.code]?.color || '#94a3b8'" />

        <!-- ── FLOW NODE ── -->
        <template #node-flow-node="{ id, data, selected }">
          <Handle v-if="nodeHasInput(data)" type="target" :position="Position.Left" class="flow-handle-in" />

          <!-- Analytics counts shown above node when in analytics mode -->
          <div v-if="analyticsNodesMap[id]" class="node-analytics-badge" :class="{ campaign: isCampaignBadge(analyticsNodesMap[id]) }">
            <template v-if="isCampaignBadge(analyticsNodesMap[id])">
              <VTooltip location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-reached">{{ fmtNum(analyticsNodesMap[id].messageCount ?? 0) }}</span>
                </template>
                <span>Messages</span>
              </VTooltip>
              <VTooltip location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-current">{{ fmtNum(analyticsNodesMap[id].sent ?? 0) }}</span>
                </template>
                <span>Sent</span>
              </VTooltip>
              <VTooltip location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-failed">{{ fmtNum(analyticsNodesMap[id].failed ?? 0) }}</span>
                </template>
                <span>Failed</span>
              </VTooltip>
              <VTooltip location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-opened">{{ fmtNum(analyticsNodesMap[id].opened ?? 0) }}</span>
                </template>
                <span>Opened</span>
              </VTooltip>
              <VTooltip
                v-if="analyticsNodesMap[id].startedAt || analyticsNodesMap[id].endedAt"
                location="top"
              >
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-ran">
                    <VIcon size="14" icon="mdi-clock-outline" />
                  </span>
                </template>
                <div>Started @ {{ analyticsNodesMap[id].startedAt || "—" }}</div>
                <div>Ended @ {{ analyticsNodesMap[id].endedAt || "—" }}</div>
              </VTooltip>
            </template>
            <template v-else>
              <VTooltip location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-reached">
                    <VIcon size="11" style="margin-bottom:1px">tabler-user-check</VIcon>
                    {{ fmtNum(analyticsNodesMap[id].reachedCount) }}
                  </span>
                </template>
                <span>Reached</span>
              </VTooltip>
              <VTooltip location="top" v-if="data.code !== 'TRIGGER'">
                <template #activator="{ props }">
                  <span v-bind="props" class="analytics-badge-current">
                    <VIcon size="11" style="margin-bottom:1px">tabler-users</VIcon>
                    {{ fmtNum(analyticsNodesMap[id].currentlyAtCount) }}
                  </span>
                </template>
                <span>Currently at</span>
              </VTooltip>
            </template>
          </div>

          <div
            class="flow-node"
            :class="{ selected, invalid: invalidNodeIds.has(id), 'is-current': currentNodeId && currentNodeId === id }"
            :style="{ '--node-color': NODE_DEFS[data.code]?.color }"
          >
            <button
              v-if="!disabled && !isProtectedNode({ data })"
              type="button"
              class="node-delete-btn"
              :aria-label="`Delete ${NODE_DEFS[data.code]?.label || 'node'}`"
              @click.stop="requestNodeDeletion(id)"
            >
              ✕
            </button>
            <div v-if="currentNodeId === id" class="node-now-badge">
              Now
              <VTooltip v-if="waitUntilLabel(id)" location="top">
                <template #activator="{ props: tip }">
                  <VIcon v-bind="tip" size="12" icon="mdi-clock-outline" class="node-now-clock" />
                </template>
                <span>Until @ {{ waitUntilLabel(id) }}</span>
              </VTooltip>
            </div>
            <div class="flow-node-head">
              <span class="flow-node-icon">{{ NODE_DEFS[data.code]?.icon }}</span>
              <span class="flow-node-code">{{ NODE_DEFS[data.code]?.label }}</span>
            </div>
            <div class="flow-node-body">
              <template v-if="data.code === 'TRIGGER'">
                <div class="font-weight-bold">{{ eventLabels[data.attrs.appevent] || formatLabel(data.attrs.name) || formatLabel(data.attrs.appevent) || 'No Event Selected' }}</div>
                <div v-if="eventKeyHint(data.attrs.appevent)" class="flow-node-key">{{ data.attrs.appevent }}</div>
              </template>
              <template v-else-if="data.code === 'CONDITION'">
                {{ (data.attrs.filter?.children?.length || 0) }} condition(s)
              </template>
              <template v-else-if="data.code === 'ACTOR'">
                {{ channelAbbrev(data.attrs.channelType) }} 
                <VIcon :icon="channelIcon(data.attrs.channelType)" size="16" :style="{ color: NODE_DEFS[data.code]?.color, marginTop: '-2px' }" /> 
                · {{ data.attrs.template?.name || data.attrs.template?.code || 'No Template' }}
              </template>
              <template v-else-if="data.code === 'EXPECTATION'">
                <div><span class="font-weight-bold">{{ eventLabels[data.attrs.appevent] || formatLabel(data.attrs.name) || formatLabel(data.attrs.appevent) || 'No event' }}</span> ({{ data.attrs.window?.value }}{{ data.attrs.window?.unit?.[0] }})</div>
                <div v-if="eventKeyHint(data.attrs.appevent)" class="flow-node-key">{{ data.attrs.appevent }}</div>
                <div v-if="data.attrs.channelType">{{ channelAbbrev(data.attrs.channelType) }}
                <VIcon :icon="channelIcon(data.attrs.channelType)" size="16" :style="{ color: NODE_DEFS[data.code]?.color, marginTop: '-2px' }" />  
                · {{ data.attrs.template?.name || data.attrs.template?.code || 'No Template' }}</div>
              </template>
              <template v-else-if="data.code === 'BROADCAST'">
                {{ channelAbbrev(data.attrs.channelType) }}
                <VIcon :icon="channelIcon(data.attrs.channelType)" size="16" :style="{ color: NODE_DEFS[data.code]?.color, marginTop: '-2px' }" />
                · {{ data.attrs.template?.name || data.attrs.template?.code || 'No Template' }}
              </template>
              <template v-else-if="data.code === 'WAIT'">
                <div>Wait for ({{ waitParts(data.attrs).value }}{{ waitParts(data.attrs).unit?.[0] }})</div>
              </template>
              <template v-else-if="data.code === 'END'">
                <span v-if="data.attrs.status">
                  {{ formatLabel(data.attrs.status) }}
                  <VIcon :icon="data.attrs.status === 'SUCCESS' ? 'tabler-mood-smile' : 'tabler-mood-sad'" size="16" :style="{ color: NODE_DEFS[data.code]?.color, marginTop: '-2px' }" />
                </span>
                <span v-else>Terminates Flow</span>
              </template>
            </div>
          </div>

          <div class="output-ports">
            <div v-for="(out, i) in getOutputs({ data })" :key="out.id" class="output-port">
              <span class="port-label">{{ out.label }}</span>
              <Handle
                :id="out.id"
                type="source"
                :position="Position.Right"
                class="flow-handle-out"
              />
            </div>
          </div>
        </template>

        <div v-if="isDragOver" class="drop-overlay">⊕ Release to drop</div>
      </VueFlow>
    </div>

    <!-- ════════════════ INSPECTOR ════════════════ -->
    <Transition name="slide">
      <aside v-if="inspectedNode" class="inspector">
        <div class="inspector-header">
          <span class="inspector-icon" :style="{ background: NODE_DEFS[inspectedNode.data.code]?.color }">
            {{ NODE_DEFS[inspectedNode.data.code]?.icon }}
          </span>
          <span class="inspector-title">{{ NODE_DEFS[inspectedNode.data.code]?.label }}</span>
          <button class="icon-btn" @click="closeInspector">✕</button>
        </div>
        <div class="inspector-id">{{ inspectedNode.id }}</div>

        <div class="inspector-body">

          <!-- TRIGGER -->
          <template v-if="inspectedNode.data.code === 'TRIGGER'">
            <EventAutocomplete
              label="App Event"
              app-style
              placeholder="Search event label or internal key"
              :model-value="inspectedNode.data.attrs.appevent"
              :items="optionCache[inspectedNode.id]?.eventOptions || []"
              :loading="optionCache[inspectedNode.id]?.loadingEvents"
              :disabled="disabled"
              @update:model-value="value => {
                setNodeAttr('appevent', value)
                setNodeAttr('name', optionCache[inspectedNode.id]?.eventOptions?.find(o => o.value === value)?.name || '')
              }"
            />
          </template>

          <template v-else-if="inspectedNode.data.code === 'CONDITION'">
            <p v-if="!connectedAppEventForInspectedNode" class="field-hint">
              Connect this node to Start or Monitor to auto-fill the event.
            </p>
            <FilterBuilder
              v-model="inspectedNode.data.attrs.filter"
              vertical
              :connected-app-event="connectedAppEventForInspectedNode"
              :ignoreEventDatafilterType="!connectedAppEventForInspectedNode"
              :ignoreEventfilterType="true"
              :ignoreCustomEventfilterType="true"
              :ignoreCohortfilterType="true"
              :ignoreSlicefilterType="true"
              :readonly="disabled"
            />
          </template>
          <!-- ACTOR -->
          <template v-else-if="inspectedNode.data.code === 'ACTOR'">
            <AppSelect
              label="Action"
              :model-value="inspectedNode.data.attrs.channelType"
              :items="CHANNEL_TYPE_OPTIONS"
              item-title="title"
              item-value="value"
              :disabled="disabled"
              @update:model-value="value =>
                onChannelTypeChange(inspectedNode.id, value)"
            />

            <AppSelect
              :label="channelFieldLabel(inspectedNode.data.attrs.channelType)"
              :model-value="inspectedNode.data.attrs.channelId"
              :items="optionCache[inspectedNode.id]?.channelOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingChannel"
              :disabled="disabled"
              @update:model-value="value =>
                onChannelIdChange(
                  inspectedNode.id,
                  inspectedNode.data.attrs.channelType,
                  value
                )"
            />

            <AppAutocomplete
              label="Template"
              :model-value="inspectedNode.data.attrs.template?.code"
              :items="optionCache[inspectedNode.id]?.templateOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingTemplate"
              :disabled="disabled || !inspectedNode.data.attrs.channelId"
              clearable
              @update:model-value="value => onTemplateChange(inspectedNode.id, value, inspectedNode.data.code)"
            />
            <p v-if="inspectedNode.data.attrs.channelType === 'SEND_WHATSAPP' && inspectedNode.data.attrs.channelId && !optionCache[inspectedNode.id]?.loadingTemplate && (optionCache[inspectedNode.id]?.templateOptions || []).length === 0" class="field-hint">
              No approved templates for this channel yet.
            </p>
            <p v-else-if="(inspectedNode.data.attrs.channelType === 'SEND_SMS' || inspectedNode.data.attrs.channelType === 'SEND_EMAIL') && !optionCache[inspectedNode.id]?.loadingTemplate && (optionCache[inspectedNode.id]?.templateOptions || []).length === 0" class="field-hint">
              No templates for this contact type yet.
            </p>

            <div class="listeners-block">
              <div class="listeners-head">
                <span class="field-label" style="margin:0">Listeners (outputs)</span>
                <VBtn
                  v-if="!disabled && !isMessageChannel(inspectedNode.data.attrs.channelType)"
                  size="small"
                  color="success"
                  prepend-icon="mdi-plus"
                  @click="addListener"
                >
                  Add
                </VBtn>
              </div>
              <p v-if="!inspectedNode.data.attrs.listeners?.length" class="field-hint">
                No listeners configured.<br>
                Output <code>Continue flow</code> is added automatically.
              </p>
              <div v-for="(l, i) in inspectedNode.data.attrs.listeners" :key="l.id" class="listener-row">
                <AppSelect
                  density="compact"
                  style="width:120px"
                  :model-value="l.type || 'code'"
                  :items="
                    inspectedNode.data.attrs.channelType === 'SEND_ENGAGEMENT'
                      ? [
                          { title: 'Text', value: 'text' },
                          { title: 'Opened', value: 'opened' }
                        ]
                      : [
                          { title: 'Text', value: 'text' },
                          { title: 'Code', value: 'code' },
                          { title: 'Opened', value: 'opened' }
                        ]
                  "
                  :disabled="disabled"
                  @update:model-value="value => setListenerType(i, value)"
                />
                <AppTextField
                  density="compact" v-if="l.type == 'code' || l.type == 'text'"
                  :model-value="l.type === 'text' ? l.text : l.code"
                  :placeholder="l.type === 'text' ? 'Text' : 'Code'"
                  :disabled="disabled"
                  @update:model-value="value =>
                    updateListenerText(i, value)"
                />
                <VBtn
                  v-if="!disabled"
                  icon
                  size="small"
                  color="error"
                  variant="text"
                  @click="removeListener(i)"
                >
                  <VIcon icon="mdi-close"/>
                </VBtn>
              </div>
            </div>
          </template>

          <!-- EXPECTATION -->
          <template v-else-if="inspectedNode.data.code === 'EXPECTATION'">
            <EventAutocomplete
              label="Expected Event"
              app-style
              placeholder="Search event label or internal key"
              :model-value="inspectedNode.data.attrs.appevent"
              :items="optionCache[inspectedNode.id]?.eventOptions || []"
              :loading="optionCache[inspectedNode.id]?.loadingEvents"
              :disabled="disabled"
              @update:model-value="value => {
                setNodeAttr('appevent', value)
                setNodeAttr('name', optionCache[inspectedNode.id]?.eventOptions?.find(o => o.value === value)?.name || '')
              }"
            />
            <AppTextField
              label="Time"
              type="number"
              :model-value="inspectedNode.data.attrs.window?.value"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('window.value', Number(value))"
            />
            <AppSelect
              label="Time Unit"
              :model-value="inspectedNode.data.attrs.window?.unit"
              :items="[
                { title:'Minutes', value:'minute'},
                { title:'Hours', value:'hour'},
                { title:'Days', value:'day'}
              ]"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('window.unit', value)"
            />

            <AppSelect
              label="Action (Fire and Forget - No Listeners)"
              :model-value="inspectedNode.data.attrs.channelType"
              :items="CHANNEL_TYPE_OPTIONS"
              item-title="title"
              item-value="value"
              :disabled="disabled"
              @update:model-value="value =>
                onChannelTypeChange(inspectedNode.id, value)"
            />

            <AppSelect
              :label="channelFieldLabel(inspectedNode.data.attrs.channelType)"
              :model-value="inspectedNode.data.attrs.channelId"
              :items="optionCache[inspectedNode.id]?.channelOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingChannel"
              :disabled="disabled"
              @update:model-value="value =>
                onChannelIdChange(
                  inspectedNode.id,
                  inspectedNode.data.attrs.channelType,
                  value
                )"
            />

            <AppAutocomplete
              label="Template"
              :model-value="inspectedNode.data.attrs.template?.code"
              :items="optionCache[inspectedNode.id]?.templateOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingTemplate"
              :disabled="disabled || !inspectedNode.data.attrs.channelId"
              clearable
              @update:model-value="value => onTemplateChange(inspectedNode.id, value, inspectedNode.data.code)"
            />
            <p v-if="inspectedNode.data.attrs.channelType === 'SEND_WHATSAPP' && inspectedNode.data.attrs.channelId && !optionCache[inspectedNode.id]?.loadingTemplate && (optionCache[inspectedNode.id]?.templateOptions || []).length === 0" class="field-hint">
              No approved templates for this channel yet.
            </p>
            <p v-else-if="(inspectedNode.data.attrs.channelType === 'SEND_SMS' || inspectedNode.data.attrs.channelType === 'SEND_EMAIL') && !optionCache[inspectedNode.id]?.loadingTemplate && (optionCache[inspectedNode.id]?.templateOptions || []).length === 0" class="field-hint">
              No templates for this contact type yet.
            </p>

            <p class="field-hint">Outputs: <code>Success</code> / <code>Failed</code></p>
          </template>

          <template v-else-if="inspectedNode.data.code === 'BROADCAST'">
            <AppSelect
              label="Action"
              model-value="SEND_NOTIFICATION"
              :items="[{ title: 'Push notification', value: 'SEND_NOTIFICATION' }]"
              disabled
            />
            <AppSelect
              label="App"
              :model-value="inspectedNode.data.attrs.channelId"
              :items="optionCache[inspectedNode.id]?.channelOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingChannel"
              :disabled="disabled"
              @update:model-value="value => onChannelIdChange(inspectedNode.id, 'SEND_NOTIFICATION', value)"
            />
            <AppAutocomplete
              label="Template"
              :model-value="inspectedNode.data.attrs.template?.code"
              :items="optionCache[inspectedNode.id]?.templateOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingTemplate"
              :disabled="disabled || !inspectedNode.data.attrs.channelId"
              clearable
              @update:model-value="value => onTemplateChange(inspectedNode.id, value, 'BROADCAST')"
            />
            <p v-if="audienceMode === 'FLEXIBLE'" class="field-hint">
              This filter runs when the node runs.
            </p>
            <p v-else class="field-hint">
              Leave this empty to send the frozen audience. A filter keeps only the matching profiles for this send. Profiles that do not match stay in the snapshot for later nodes.
            </p>
            <FilterBuilder
              v-model="inspectedNode.data.attrs.filter"
              vertical
              :ignoreEventfilterType="true"
              :ignoreEventDatafilterType="true"
              :ignoreCustomEventfilterType="true"
              :ignoreCohortfilterType="true"
              :ignoreSlicefilterType="true"
              :readonly="disabled"
            />
          </template>

          <!-- WAIT/DELAY -->
          <template v-else-if="inspectedNode.data.code === 'WAIT' && isBroadcast">
            <AppTextField
              label="Time"
              type="number"
              :model-value="inspectedNode.data.attrs.duration?.value"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('duration.value', Number(value))"
            />
            <AppSelect
              label="Time Unit"
              :model-value="inspectedNode.data.attrs.duration?.unit"
              :items="broadcastWaitItems(inspectedNode.data.attrs.duration?.unit)"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('duration.unit', value)"
            />
            <p class="field-hint">Outputs: <code>Completed</code> should be connected to another node.</p>
          </template>
          <template v-else-if="inspectedNode.data.code === 'WAIT'">
            <AppTextField
              label="Time"
              type="number"
              :model-value="inspectedNode.data.attrs.window?.value"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('window.value', Number(value))"
            />
            <AppSelect
              label="Time Unit"
              :model-value="inspectedNode.data.attrs.window?.unit"
              :items="[
                { title:'Minutes', value:'minute'},
                { title:'Hours', value:'hour'},
                { title:'Days', value:'day'}
              ]"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('window.unit', value)"
            />
            <p class="field-hint">Outputs: <code>Continue flow</code> should be connected to other node.</p>
          </template>

          <!-- END -->
          <template v-else-if="inspectedNode.data.code === 'END' && isBroadcast">
            <p class="field-hint">Terminates the journey here.</p>
          </template>
          <template v-else-if="inspectedNode.data.code === 'END'">
            <AppSelect
              label="Status"
              :model-value="inspectedNode.data.attrs.status"
              :items="[
                { title:'Succeeded', value:'SUCCESS' },
                { title:'Failed', value:'FAILED' }
              ]"
              :disabled="disabled"
              @update:model-value="value => setNodeAttr('status', value)"
            />
            <p class="field-hint"> Terminates the flow here. </p>
          </template>

        </div>
      </aside>
    </Transition>

    <!-- ════════════════ CONFIRM DIALOG ════════════════ -->
    <Teleport to="body">
      <div v-if="dialogVisible" class="dialog-mask" @mousedown.self="dialogCancel">
        <div class="dialog-box" role="dialog" aria-modal="true" @keydown="onDialogKeydown">
          <p class="dialog-message">{{ dialogMessage }}</p>
          <div class="dialog-actions">
            <button ref="dialogDeleteButtonRef" class="btn-primary" @click="dialogConfirm">Delete</button>
            <button ref="dialogCancelButtonRef" class="btn-cancel" @click="dialogCancel">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ════════════════ LOAD PANEL ════════════════ -->
    <Teleport to="body">
      <div v-if="loadPanelOpen && !disabled" class="dialog-mask" @mousedown.self="loadPanelOpen = false">
        <div class="save-box">
          <div class="save-head">
            <span>Load flow</span>
            <button class="icon-btn" @click="loadPanelOpen = false">✕</button>
          </div>
          <p class="field-hint">
            Paste a previously saved flow JSON, or choose a file. If it includes the saved
            canvas layout (<code>flowRenderer.drawflow.Home</code>), positions and zoom are restored exactly.
          </p>
          <input type="file" accept="application/json,.json" class="field-input" @change="onLoadFileChange" />
          <textarea class="json-output" v-model="loadJsonText" placeholder="Paste flow JSON here…"></textarea>
          <p v-if="loadError" class="load-error">{{ loadError }}</p>
          <div class="dialog-actions">
            <button class="btn-primary" :disabled="!loadJsonText.trim()" @click="confirmLoad">Load onto canvas</button>
            <button class="btn-cancel" @click="loadPanelOpen = false">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/core@1.48.2/dist/style.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/core@1.48.2/dist/theme-default.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/controls@latest/dist/style.css';
@import 'https://cdn.jsdelivr.net/npm/@vue-flow/minimap@latest/dist/style.css';

:root {
  --canvas-bg: #f7f5f0;
  --ink: #1f2421;
  --ink-soft: #5b6660;
  --paper: #ffffff;
  --hairline: #e3e0d5;
  --accent: #2563eb;
}

.flow-editor {
  display: flex;
  height: 100vh;
  width: 100%;
  font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  background: var(--canvas-bg);
  color: var(--ink);
}

/* ══ SIDEBAR ══ */
.sidebar {
  width: 220px; flex-shrink: 0; display: flex; flex-direction: column;
  background: var(--paper); border-right: 1px solid var(--hairline);
  overflow-y: auto; z-index: 10;
}
.sidebar-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--hairline); display: flex; align-items: center; gap: 8px; }
.sidebar-title { font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
.view-only-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  background: #f1efe8; color: #9a9486; padding: 2px 7px; border-radius: 99px;
}
.sidebar-section {
  padding: 12px 14px; border-bottom: 1px solid var(--hairline);
  display: flex; flex-direction: column; gap: 7px;
}
.hint-section { flex-grow: 1; }
.section-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: #9a9486; margin: 0 0 2px;
}

.node-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 11px; border-radius: 7px; font-size: 12px; font-weight: 600;
  cursor: grab; border: 1.5px solid var(--pill-color);
  background: color-mix(in srgb, var(--pill-color) 9%, white);
  color: color-mix(in srgb, var(--pill-color) 70%, black);
  user-select: none; transition: transform 0.1s, box-shadow 0.1s;
}
.node-pill:hover { transform: translateX(3px); box-shadow: 2px 4px 10px rgba(0,0,0,0.08); }
.node-pill:active { cursor: grabbing; }
.pill-icon { font-size: 12px; }

.action-btn {
  background: #faf9f6; border: 1px solid var(--hairline); border-radius: 6px;
  padding: 7px 11px; font-size: 11px; font-weight: 600; cursor: pointer;
  text-align: left; color: var(--ink-soft); transition: background 0.15s;
}
.action-btn:hover { background: #efece4; }
.action-btn.danger { color: #b91c1c; border-color: #f3c9c4; }
.action-btn.danger:hover { background: #fdeceb; }

.hints {
  margin: 0; padding-left: 14px; font-size: 10.5px; color: #9a9486;
  display: flex; flex-direction: column; gap: 4px;
}

/* ══ CANVAS ══ */
.canvas-wrapper { flex: 1; position: relative; overflow: hidden; }
.canvas-wrapper.drag-over::after {
  content: ''; position: absolute; inset: 0;
  background: rgba(37,99,235,0.04); border: 2px dashed var(--accent);
  pointer-events: none; z-index: 5;
}
.drop-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none; z-index: 6; font-size: 18px; font-weight: 700; color: var(--accent);
}

/* ══ FLOW NODE ══ */
.flow-node {
  position: relative;
  min-width: 190px; border-radius: 9px; background: var(--paper);
  border: 1.5px solid var(--node-color);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05);
  transition: box-shadow 0.15s;
}
.node-delete-btn {
  position: absolute;
  top: -10px;
  right: 15px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--node-color) 25%, var(--hairline));
  border-radius: 999px;
  background: var(--paper);
  color: color-mix(in srgb, var(--node-color) 70%, black);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-2px);
  transition: opacity 0.15s, transform 0.15s, background 0.15s, color 0.15s;
  z-index: 2;
}
.flow-node:hover .node-delete-btn,
.node-delete-btn:focus-visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.node-delete-btn:hover,
.node-delete-btn:focus-visible {
  background: #fdeceb;
  color: #b91c1c;
  outline: none;
}
.flow-node.selected {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--node-color) 30%, transparent), 0 6px 16px rgba(0,0,0,0.08);
}
.flow-node-head {
  display: flex; align-items: center; gap: 6px; padding: 7px 11px;
  background: color-mix(in srgb, var(--node-color) 10%, white);
  border-bottom: 1px solid color-mix(in srgb, var(--node-color) 25%, transparent);
  border-radius: 8px 8px 0 0;
}
.flow-node-icon { font-size: 12px; }
.flow-node-code {
  font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  color: color-mix(in srgb, var(--node-color) 75%, black);
}
.flow-node-key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; opacity: .6; margin-top: 2px; }
.flow-node-body { padding: 9px 11px 11px; font-size: 12px; min-height: 16px; word-break: break-word; }
.flow-node.is-current {
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.45), 0 6px 16px rgba(0,0,0,0.08);
}
.node-now-badge {
  position: absolute;
  top: -12px;
  left: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #059669;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.node-now-clock {
  color: #fff;
  cursor: default;
}
.analytics-badge-ran {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.72);
  border-radius: 10px;
  padding: 2px 6px;
  cursor: default;
}
.flow-node.invalid {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25), 0 6px 16px rgba(0,0,0,0.08);
  animation: invalid-pulse 1.4s ease-in-out 2;
}
@keyframes invalid-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25), 0 6px 16px rgba(0,0,0,0.08); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.15), 0 6px 16px rgba(0,0,0,0.08); }
}
/* ── Analytics node badge ── */
.node-analytics-badge {
  position: absolute;
  top: -30px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  pointer-events: auto;
  z-index: 2;
}
.node-analytics-badge.campaign {
  top: -34px;
  left: -20px;
  right: -20px;
}
.analytics-badge-reached,
.analytics-badge-current,
.analytics-badge-failed,
.analytics-badge-opened {
  cursor: default;
}
.analytics-badge-reached {
  display: flex; align-items: center; gap: 3px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  border-radius: 10px;
  padding: 2px 8px;
}
.analytics-badge-current {
  display: flex; align-items: center; gap: 3px;
  background: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));
  border-radius: 10px;
  padding: 2px 8px;
}
.analytics-badge-failed {
  display: flex; align-items: center; gap: 3px;
  background: rgba(var(--v-theme-error), 0.12);
  color: rgb(var(--v-theme-error));
  border-radius: 10px;
  padding: 2px 8px;
}
.analytics-badge-opened {
  display: flex; align-items: center; gap: 3px;
  background: rgba(var(--v-theme-success), 0.12);
  color: rgb(var(--v-theme-success));
  border-radius: 10px;
  padding: 2px 8px;
}

.output-port { position: relative; }
.output-ports {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}
.flow-handle-out {
  width: 9px;
  height: 9px;
  position: relative !important;
  top: auto !important;
  right: -0px !important;
  border-radius: 50% !important;
  background: var(--node-color, var(--accent)) !important;
}
.port-label {
  position: absolute;
  right: -5px;
  top: -8px;
  transform: translateY(-100%);
  white-space: nowrap;
  font-size: 9px;
  font-weight: 600;
  color: var(--ink-soft);
  background: var(--paper);
  padding: 2px 6px;
  border-radius: 99px;
  border: 1px solid var(--hairline);
  pointer-events: none;

  opacity: 0;
  visibility: hidden;
  transition: opacity .15s;
}
.output-port:hover .port-label {
  opacity: 1;
  visibility: visible;
}
.flow-handle-in {
  width: 10px !important; height: 10px !important; border-radius: 50% !important;
  background: #9a9486 !important; border: 2px solid var(--paper) !important;
}

/* ══ INSPECTOR ══ */
.inspector {
  width: 350px; flex-shrink: 0; background: var(--paper);
  border-left: 1px solid var(--hairline); display: flex; flex-direction: column;
  overflow-y: auto; z-index: 10;
}
.slide-enter-active, .slide-leave-active { transition: transform 0.18s ease, opacity 0.18s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(16px); opacity: 0; }

.inspector-header { display: flex; align-items: center; gap: 8px; padding: 14px 16px 4px; }
.inspector-icon {
  width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center;
  justify-content: center; font-size: 11px; color: #fff;
}
.inspector-title { font-size: 13px; font-weight: 700; flex: 1; }
.icon-btn { background: none; border: none; cursor: pointer; color: #9a9486; font-size: 13px; padding: 2px 4px; border-radius: 4px; }
.icon-btn:hover { background: #f1efe8; color: var(--ink); }
.inspector-id { padding: 0 16px 10px; font-size: 10px; color: #b0aa9b; font-family: monospace; }
.inspector-body { padding: 4px 16px 20px; display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: #9a9486; margin-top: 8px;
}
.field-input {
  width: 100%; box-sizing: border-box; padding: 7px 9px; border: 1.5px solid var(--hairline);
  border-radius: 6px; font-size: 12.5px; outline: none; font-family: inherit; color: var(--ink); background: #fff;
}
.field-input:focus { border-color: var(--accent); }
.field-input:disabled { background: #f5f3ec; color: #b0aa9b; cursor: not-allowed; }
.field-input.small { padding: 5px 7px; font-size: 11.5px; }
.field-input.mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.field-hint { font-size: 10.5px; color: #9a9486; margin: 4px 0 0; line-height: 1.5; }
.field-hint code { background: #f1efe8; padding: 1px 5px; border-radius: 4px; font-size: 10px; }

.listeners-block { margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--hairline); }
.listeners-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.add-listener-btn {
  background: #e8f3ec; border: 1px solid #aed9bf; color: #15663b;
  font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; cursor: pointer;
}
.add-listener-btn:hover { background: #d8ecdf; }
.listener-row { display: flex; gap: 5px; align-items: center; margin-top: 6px; }
.remove-listener-btn { background: none; border: none; color: #b91c1c; cursor: pointer; font-size: 12px; padding: 2px 4px; flex-shrink: 0; }
.remove-listener-btn:hover { color: #7f1d1d; }

/* ══ DIALOG ══ */
.dialog-mask {
  position: fixed; inset: 0; background: rgba(20,20,18,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(2px);
}
.dialog-box {
  background: var(--paper); border-radius: 12px; padding: 24px 28px;
  min-width: 280px; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
.dialog-message { font-size: 13px; font-weight: 500; text-align: center; margin: 0; }
.dialog-actions { display: flex; gap: 8px; justify-content: center; }
.btn-primary {
  padding: 7px 18px; border-radius: 7px; border: none; background: var(--accent);
  color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
}
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { background: #c7c2b4; cursor: not-allowed; }
.btn-primary:focus-visible,
.btn-cancel:focus-visible,
.node-delete-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-cancel {
  padding: 7px 18px; border-radius: 7px; border: 1.5px solid var(--hairline);
  background: #faf9f6; color: var(--ink-soft); font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-cancel:hover { background: #efece4; }

.save-box {
  background: var(--paper); border-radius: 12px; padding: 22px 26px;
  width: 460px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  display: flex; flex-direction: column; gap: 4px;
}
.save-head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.json-output {
  width: 100%; box-sizing: border-box; margin-top: 10px; height: 200px; padding: 10px; border-radius: 7px;
  border: 1.5px solid var(--hairline); background: #1f2421; color: #e7e4da;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5; resize: vertical;
}
.load-error { font-size: 11px; color: #b91c1c; margin: 6px 0 0; }

.vue-flow__minimap { bottom: 14px; right: 14px; }
.vue-flow__edge-path { stroke: #b0aa9b; stroke-width: 1.6; }
.vue-flow__edge.selected .vue-flow__edge-path { stroke: var(--accent); }
.vue-flow__edge-text { fill: var(--ink-soft); font-size: 10px; }
.vue-flow__edge-textbg { fill: var(--canvas-bg); }
</style>