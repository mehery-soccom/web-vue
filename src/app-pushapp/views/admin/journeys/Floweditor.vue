<script setup>
import { ref, computed, watch, nextTick, reactive } from 'vue'
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


// Props

const props = defineProps({
  initialFlow: { type: Object, default: null },
})


// API LAYER

const API = {
  customEvents: '/api/v1/event-definition',
  whatsappChannels: '/common/pub/v1/options/channels?contactType=WHATSAPP',
  whatsappTemplates: '/common/api/v1/tmpl/hsm',
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
// These endpoints return the same data regardless of which node is open, so
// they're fetched once for the whole app session and reused everywhere.
const globalCache = reactive({
  customEvents: null,       // [{title, value}] | null until loaded
  whatsappChannels: null,   // [{title, value}] | null until loaded
  whatsappTemplatesRaw: null, // raw template records (pre-filter) | null until loaded
})
const globalCacheInFlight = {} // url -> Promise, to dedupe concurrent calls

async function fetchRaw(url, params = {}) {
  try {
    const res = await axios.get(url, { params })
    return res.data
  } catch (err) {
    console.warn(`[FlowEditor] request failed for ${url}`, err)
    return null
  }
}

// Generic single-flight fetch+cache: if a request for this exact key is
// already in progress, every caller awaits the same promise instead of
// firing a duplicate request.
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

// async function loadCustomEventsOnce() {
//   return fetchOnce('customEvents', API.customEvents, {}, (data) => {
//     const items = extractArray(data)
//     return items.map((i) => ({ title: i.eventName, value: i.eventName }))
//   })
// }
async function loadSystemAndCustomEventsOnce() {
  const systemEvents = Object.values(FILTER_FIELDS_MAP).filter(e => e.type === 'event')
      .map(e => ({ title: e.title, value: e.value }))

  const customEvents = await fetchOnce('customEvents', API.customEvents, {}, (data) => {
      const items = extractArray(data)
      return items.map(i => ({ title: i.eventName, value: i.eventName,}))
    },
  )

  return [ ...systemEvents, ...customEvents ]
}

async function loadWhatsappChannelsOnce() {
  return fetchOnce('whatsappChannels', API.whatsappChannels, {}, (data) => {
    const items = extractArray(data)
    return items.map((i) => ({ title: i.name, value: i._id }))
  })
}

// Fetched once, kept RAW (un-filtered) — filtering by channel happens
// client-side per node since "approved" status depends on the chosen channel.
async function loadWhatsappTemplatesRawOnce() {
  return fetchOnce('whatsappTemplatesRaw', API.whatsappTemplates, { limit: 500 }, (data) => {
    return extractArray(data) // raw template records, not yet {title,value}
  })
}

// Filter the raw WhatsApp template list down to only templates approved for
// the given channelId: approved[] must contain an entry where
// approved.channelId === channelId && approved.status === 'APPROVED'.
function filterWhatsappTemplatesForChannel(rawTemplates, channelId) {
  if (!channelId) return []
  return rawTemplates
    .filter((t) =>
      Array.isArray(t.approved) &&
      t.approved.some((a) => a.channelId === channelId && a.status === 'APPROVED')
    )
    .map((t) => ({ ...t, title: t.desc || t.name || t.code, value: t.code }))
}

// Non-WhatsApp templates (push / in-app) — these DO take a per-app/channel
// param server-side, so they're fetched per channel selection, not cached
// globally. Still single-flighted per (endpoint+param) key to avoid dup calls
// if multiple things trigger a refetch in the same tick.
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
  // CONDITION: {
  //   label: 'Checkpoint',
  //   icon: '◆',
  //   color: '#d97706',
  //   hasInput: true,
  //   fixedOutputs: [
  //     { id: 'matched', label: 'Matched' },
  //     { id: 'not_matched', label: 'Not matched' },
  //   ],
  //   defaultAttrs: () => ({
  //     // Same channel/template cascade shape as ACTOR
  //     channelType: 'WHATSAPP',
  //     channelId: null,
  //     template: { code: null },
  //     // Wait/delay
  //     wait: { value: 0, unit: 'minutes' },
  //   }),
  // },
  // WAIT: {
  //   label: 'Pause',
  //   icon: '⏱',
  //   color: '#0891b2',
  //   hasInput: true,
  //   fixedOutputs: [{ id: 'completed', label: 'Completed' }],
  //   defaultAttrs: () => ({
  //     type: 'duration',
  //     duration: { value: 2, unit: 'hours' },
  //   }),
  // },
  ACTOR: {
    label: 'Engage',
    icon: '▶',
    color: '#16a34a',
    hasInput: true,
    fixedOutputs: [],
    defaultAttrs: () => ({
      channelType: 'SEND_MESSAGE',
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
      { id: 'SUCCESS', label: 'Success' },
      { id: 'FAILED', label: 'Failed' },
    ],
    defaultAttrs: () => ({
      type: 'appevent',
      appevent: '',
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

const PALETTE_CODES = [ 'ACTOR', 'EXPECTATION', 'END']

const CHANNEL_TYPE_OPTIONS = [
  { title: 'Send WhatsApp', value: 'SEND_MESSAGE' },
  { title: 'Send Push notification', value: 'SEND_NOTIFICATION' },
  { title: 'Send App engagement', value: 'SEND_ENGAGEMENT' },
]

function templateListEndpoint(channelType) {
  if (channelType === 'SEND_NOTIFICATION') return API.pushTemplates
  if (channelType === 'SEND_ENGAGEMENT') return API.engagementTemplates
  return null
}
function channelParamName(channelType) {
  return channelType === 'SEND_MESSAGE' ? 'channelId' : 'appId'
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
      label: l.type === 'text' ? l.text : l.type === 'code' ? l.code : 'Default'
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

const dialogVisible = ref(false)
const dialogMessage = ref('')
let _dialogResolve = null
function openConfirm(msg) {
  dialogMessage.value = msg
  dialogVisible.value = true
  return new Promise((r) => { _dialogResolve = r })
}
function dialogConfirm() { dialogVisible.value = false; _dialogResolve?.(true) }
function dialogCancel() { dialogVisible.value = false; _dialogResolve?.(false) }


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

// checks the global cache first; only fetches if missing ──
async function loadEventOptionsFor(nodeId) {
  const cache = ensureCache(nodeId)
  if (cache.eventOptions.length > 0) return // already loaded for this node
  cache.loadingEvents = true
  cache.eventOptions = await loadSystemAndCustomEventsOnce()
  cache.loadingEvents = false
}

async function loadChannelOptionsFor(nodeId, channelType) {
  const cache = ensureCache(nodeId)
  cache.loadingChannel = true
  if (channelType === 'SEND_MESSAGE') {
    cache.channelOptions = await loadWhatsappChannelsOnce()
  } else {
    cache.channelOptions = await loadAppsOnce()
  }
  cache.loadingChannel = false
}

async function loadTemplateOptionsFor(nodeId, channelType, channelOrAppId) {
  const cache = ensureCache(nodeId)
  if (!channelOrAppId) { cache.templateOptions = []; return }

  cache.loadingTemplate = true
  if (channelType === 'SEND_MESSAGE') {
    const raw = await loadWhatsappTemplatesRawOnce()
    cache.templateOptions = filterWhatsappTemplatesForChannel(raw, channelOrAppId)
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
} = useVueFlow()

const nodes = ref([
  {
    id: 'node_1',
    type: 'flow-node',
    position: { x: 60, y: 200 },
    data: {
      code: 'TRIGGER',
      attrs: { type: 'appevent', appevent: '' },
    },
  },
])

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
    loadEventOptionsFor('node_1')
  }
})

// Connect
onConnect((connection) => {
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

// Delete with confirmation
onNodesChange(async (changes) => {
  const next = []
  for (const c of changes) {
    if (c.type === 'remove') {
      const node = nodes.value.find((n) => n.id === c.id)
      if (node?.data?.code === 'TRIGGER') continue
      const ok = await openConfirm(`Delete node "${c.id}"?`)
      if (ok) {
        next.push(c)
        if (inspectedNodeId.value === c.id) inspectedNodeId.value = null
        delete optionCache[c.id]
      }
    } else {
      next.push(c)
    }
  }
  applyNodeChanges(next)
})
onEdgesChange(async (changes) => {
  const next = []
  for (const c of changes) {
    if (c.type === 'remove') {
      const ok = await openConfirm(`Delete this connection?`)
      if (ok) next.push(c)
    } else {
      next.push(c)
    }
  }
  applyEdgeChanges(next)
})

// Node click → open inspector, lazy-load only what's missing
function onNodeClick({ node }) {
  inspectedNodeId.value = node.id
  const cache = ensureCache(node.id)

  if (node.data.code === 'TRIGGER' || node.data.code === 'EXPECTATION') {
    loadEventOptionsFor(node.id) 
  }
  if (node.data.code === 'ACTOR') {
    if (cache.channelOptions.length === 0) {
      loadChannelOptionsFor(node.id, node.data.attrs.channelType)
    }
    if (node.data.attrs.channelId && cache.templateOptions.length === 0) {
      loadTemplateOptionsFor(node.id, node.data.attrs.channelType, node.data.attrs.channelId)
    }
  }
}
function onPaneClick() {
  inspectedNodeId.value = null
}
function closeInspector() {
  inspectedNodeId.value = null
}

// Update a node's attrs (deep-merge one key at a time, called from inspector
// inputs). IMPORTANT: this only ever touches node data — it never triggers
// any network call by itself. Network calls happen only from the explicit
// onChannelTypeChange / onChannelIdChange handlers below.
function setNodeAttr(path, value) {
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
  setNodeAttr('channelType', channelType)
  setNodeAttr('channelId', null)
  setNodeAttr('template.code', null)
  const cache = ensureCache(nodeId)
  cache.channelOptions = []
  cache.templateOptions = []
  await loadChannelOptionsFor(nodeId, channelType)
}
async function onChannelIdChange(nodeId, channelType, channelId) {
  setNodeAttr('channelId', channelId)
  setNodeAttr('template.code', null)
  const cache = ensureCache(nodeId)
  cache.templateOptions = []
  await loadTemplateOptionsFor(nodeId, channelType, channelId)
}

function onTemplateChange(nodeId, templateCode) {
  setNodeAttr('template.code', templateCode)
  const selectedTemplate = optionCache[nodeId]?.templateOptions?.find( o => o.value === templateCode)
  setNodeAttr('template.name', selectedTemplate?.title || '')
  console.log("temsp sel", selectedTemplate)

  let buttons = selectedTemplate?.options?.buttons || []
  if (!buttons.length) buttons = selectedTemplate?.style?.btn || []

  updateNode(nodeId, n => ({
    ...n,
    data: {
      ...n.data,
      attrs: {
        ...n.data.attrs,
        listeners: buttons.map((b, index) => ({
          id: `listener_${index + 1}`,
          type: 'text',
          text: b.label || b.button_text,
        }))
      }
    }
  }))
}
// ── ACTOR listener management ──
function addListener() {
  if (!inspectedNode.value) return
  const nodeId = inspectedNode.value.id
  updateNode(nodeId, (n) => {
    const attrs = JSON.parse(JSON.stringify(n.data.attrs || {}))
    attrs.listeners = attrs.listeners || []
    attrs.listeners.push({ id: `listener_${attrs.listeners.length + 1}`, type: 'text', text: '', code: ''})
    return { ...n, data: { ...n.data, attrs } }
  })
}
function updateListenerText(index, value) {
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

// Drag & drop from sidebar palette
function onDragStart(event, code) {
  event.dataTransfer?.setData('application/flownode', code)
  draggedType.value = code
  document.body.style.userSelect = 'none'
}
function onDragOver(event) {
  event.preventDefault()
  if (draggedType.value) {
    isDragOver.value = true
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }
}
function onDragLeave() { isDragOver.value = false }
function onDrop(event) {
  isDragOver.value = false
  document.body.style.userSelect = ''
  const code = event.dataTransfer?.getData('application/flownode') || draggedType.value
  if (!code || !NODE_DEFS[code] || code === 'TRIGGER') return

  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const nodeId = getNodeId()

  const newNode = {
    id: nodeId,
    type: 'flow-node',
    position,
    data: { code, attrs: NODE_DEFS[code].defaultAttrs() },
  }

  const { off } = onNodesInitialized(() => {
    updateNode(nodeId, (n) => ({
      position: {
        x: n.position.x - (n.dimensions?.width ?? 0) / 2,
        y: n.position.y - (n.dimensions?.height ?? 0) / 2,
      },
    }))
    off()
  })

  addNodes(newNode)
  draggedType.value = null
}

// Build & save the backend-shaped payload
function buildFlowPayload() {
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
          emit: l.type === 'text' ? l.text : l.type === 'code' ? l.code : 'default'
        }))
        entry.outputs = entry.listeners.map(l => ({ id: l.emit}))
      }
    }
    else if (outputs.length) {
      entry.outputs = outputs.map(o => ({ id: o.id}))
    }
    nodesDict[n.id] = entry
  }

  const edgesArr = edges.value.map((e) => ({
    id: e.id,
    source: { node: e.source, output: e.data?.output ?? e.sourceHandle ?? null },
    target: { node: e.target },
  }))

  const renderState = toObject()

  return {
    flow: { nodes: nodesDict, edges: edgesArr },
    flowRenderer: { drawflow: { Home: renderState } },
  }
}

function loadFlow(payload) {
  const home = payload?.flowRenderer?.drawflow?.Home
  if (home && Array.isArray(home.nodes) && home.nodes.length > 0) {
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
        data: { code: n.code, attrs: n.attrs || {} },
      }
    })

    edges.value = flowEdges.map((e) => ({
      id: e.id,
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

  const maxNodeNum = Math.max(0, ...nodes.value.map((n) => Number(String(n.id).match(/(\d+)$/)?.[1]) || 0))
  const maxEdgeNum = Math.max(0, ...edges.value.map((e) => Number(String(e.id).match(/(\d+)$/)?.[1]) || 0))
  _nodeId = maxNodeNum + 1
  _edgeId = maxEdgeNum + 1
}

function confirmLoad() {
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
function clearAll() {
  const trigger = nodes.value.find((n) => n.data.code === 'TRIGGER')
  nodes.value = trigger ? [trigger] : []
  edges.value = []
}

defineExpose({ loadFlow, buildFlowPayload })
</script>

<template>
  <div class="flow-editor">

    <!-- ════════════════ SIDEBAR ════════════════ -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">Journey Builder</span>
      </div>

      <div class="sidebar-section">
        <p class="section-label">Nodes</p>
        <p class="field-hint" style="margin:0 0 4px">Trigger is added automatically and can't be duplicated.</p>
        <div
          v-for="code in PALETTE_CODES" :key="code"
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
        <button class="action-btn" @click="setViewport({ x: 0, y: 0, zoom: 1 })">Move to Start</button>
        <button class="action-btn danger" @click="clearAll">✕ Clear canvas</button>
      </div>

      <div class="sidebar-section hint-section">
        <p class="section-label">Tips</p>
        <ul class="hints">
          <li>Start is fixed — set its app event in the inspector</li>
          <li>Drag a node type onto canvas</li>
          <li>Drag from a colored dot to connect an output</li>
          <li>Click a node to edit its settings</li>
          <li>Select + Backspace to delete</li>
          <li>ACTOR outputs come from listeners you add</li>
        </ul>
      </div>
    </aside>

    <!-- ════════════════ CANVAS ════════════════ -->
    <div
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
        fit-view-on-init
        delete-key-code="Backspace"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
      >
        <Background :variant="BackgroundVariant.Dots" :gap="20" pattern-color="#d6d3cb" />
        <Controls position="top-left" />
        <MiniMap :node-color="(n) => NODE_DEFS[n.data?.code]?.color || '#94a3b8'" />

        <!-- ── FLOW NODE ── -->
        <template #node-flow-node="{ id, data, selected }">
          <Handle v-if="NODE_DEFS[data.code]?.hasInput" type="target" :position="Position.Left" class="flow-handle-in" />

          <div
            class="flow-node"
            :class="{ selected }"
            :style="{ '--node-color': NODE_DEFS[data.code]?.color }"
          >
            <div class="flow-node-head">
              <span class="flow-node-icon">{{ NODE_DEFS[data.code]?.icon }}</span>
              <span class="flow-node-code">{{ NODE_DEFS[data.code]?.label }}</span>
            </div>
            <div class="flow-node-body">
              <template v-if="data.code === 'TRIGGER'">{{ formatLabel(data.attrs.name) || formatLabel(data.attrs.appevent) || 'No Event Selected' }}</template>
              <template v-else-if="data.code === 'ACTOR'">
                {{ formatLabel(data.attrs.channelType) }} · {{ data.attrs.template?.name || data.attrs.template?.code || 'No Template' }}
              </template>
              <template v-else-if="data.code === 'EXPECTATION'">
                {{ formatLabel(data.attrs.name) || formatLabel(data.attrs.appevent) || 'No event' }} ({{ data.attrs.window?.value }}{{ data.attrs.window?.unit?.[0] }})
              </template>
              <template v-else-if="data.code === 'END'">
                <span v-if="data.attrs.status">{{ formatLabel(data.attrs.status) }}</span>
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
            <AppSelect
              label="App Event"
              :model-value="inspectedNode.data.attrs.appevent"
              :items="optionCache[inspectedNode.id]?.eventOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingEvents"
              @update:model-value="value => {
                setNodeAttr('appevent', value)
                setNodeAttr('name', optionCache[inspectedNode.id]?.eventOptions?.find(o => o.value === value)?.title || '')
              }"
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
              @update:model-value="value =>
                onChannelTypeChange(inspectedNode.id, value)"
            />

            <AppSelect
              :label="inspectedNode.data.attrs.channelType === 'SEND_MESSAGE' ? 'WhatsApp Channel' : 'App'"
              :model-value="inspectedNode.data.attrs.channelId"
              :items="optionCache[inspectedNode.id]?.channelOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingChannel"
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
              :disabled="!inspectedNode.data.attrs.channelId"
              clearable
              @update:model-value="value => onTemplateChange(inspectedNode.id, value)"
            />
            <p v-if="inspectedNode.data.attrs.channelType === 'SEND_MESSAGE' && inspectedNode.data.attrs.channelId && !optionCache[inspectedNode.id]?.loadingTemplate && (optionCache[inspectedNode.id]?.templateOptions || []).length === 0" class="field-hint">
              No approved templates for this channel yet.
            </p>

            <div class="listeners-block">
              <div class="listeners-head">
                <span class="field-label" style="margin:0">Listeners (outputs)</span>
                <VBtn
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
                  :model-value="l.type || 'text'"
                  :items="[
                    { title:'Text', value:'text' },
                    { title:'Code', value:'code' },
                    { title:'Default', value:'default' }
                  ]"
                  @update:model-value="value => setListenerType(i, value)"
                />
                <AppTextField
                  density="compact"
                  :model-value="l.type === 'text' ? l.text : l.code"
                  :placeholder="l.type === 'text' ? 'Text' : 'Code'"
                  @update:model-value="value =>
                    updateListenerText(i, value)"
                />
                <VBtn
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
            <AppSelect
              label="Expected Event"
              :model-value="inspectedNode.data.attrs.appevent"
              :items="optionCache[inspectedNode.id]?.eventOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingEvents"
              @update:model-value="value => {
                setNodeAttr('appevent', value)
                setNodeAttr('name', optionCache[inspectedNode.id]?.eventOptions?.find(o => o.value === value)?.title || '')
              }"
            />
            <AppTextField
              label="Time"
              type="number"
              :model-value="inspectedNode.data.attrs.window?.value"
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
              @update:model-value="value => setNodeAttr('window.unit', value)"
            />

            <AppSelect
              label="Action (Fire and Forget - No Listeners)"
              :model-value="inspectedNode.data.attrs.channelType"
              :items="CHANNEL_TYPE_OPTIONS"
              item-title="title"
              item-value="value"
              @update:model-value="value =>
                onChannelTypeChange(inspectedNode.id, value)"
            />

            <AppSelect
              :label="inspectedNode.data.attrs.channelType === 'SEND_MESSAGE' ? 'WhatsApp Channel' : 'App'"
              :model-value="inspectedNode.data.attrs.channelId"
              :items="optionCache[inspectedNode.id]?.channelOptions || []"
              item-title="title"
              item-value="value"
              :loading="optionCache[inspectedNode.id]?.loadingChannel"
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
              :disabled="!inspectedNode.data.attrs.channelId"
              clearable
              @update:model-value="value => onTemplateChange(inspectedNode.id, value)"
            />
            <p v-if="inspectedNode.data.attrs.channelType === 'SEND_MESSAGE' && inspectedNode.data.attrs.channelId && !optionCache[inspectedNode.id]?.loadingTemplate && (optionCache[inspectedNode.id]?.templateOptions || []).length === 0" class="field-hint">
              No approved templates for this channel yet.
            </p> 

            <p class="field-hint">Outputs: <code>Success</code> / <code>Failed</code></p>
          </template>

          <!-- END -->
          <template v-else-if="inspectedNode.data.code === 'END'">
            <AppSelect
              label="Status"
              :model-value="inspectedNode.data.attrs.status"
              :items="[
                { title:'Succeeded', value:'SUCCESS' },
                { title:'Failed', value:'FAILED' }
              ]"
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
        <div class="dialog-box">
          <p class="dialog-message">{{ dialogMessage }}</p>
          <div class="dialog-actions">
            <button class="btn-primary" @click="dialogConfirm">Delete</button>
            <button class="btn-cancel" @click="dialogCancel">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ════════════════ LOAD PANEL ════════════════ -->
    <Teleport to="body">
      <div v-if="loadPanelOpen" class="dialog-mask" @mousedown.self="loadPanelOpen = false">
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
.sidebar-header { padding: 16px 16px 12px; border-bottom: 1px solid var(--hairline); }
.sidebar-title { font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
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
  min-width: 190px; border-radius: 9px; background: var(--paper);
  border: 1.5px solid var(--node-color);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05);
  transition: box-shadow 0.15s;
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
.flow-node-body { padding: 9px 11px 11px; font-size: 12px; min-height: 16px; word-break: break-word; }

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
/* .flow-handle-out {
  width: 10px !important; height: 10px !important; border-radius: 50% !important;
  background: var(--node-color, var(--accent)) !important; border: 2px solid var(--paper) !important;
} */
.flow-handle-in {
  width: 10px !important; height: 10px !important; border-radius: 50% !important;
  background: #9a9486 !important; border: 2px solid var(--paper) !important;
}

/* ══ INSPECTOR ══ */
.inspector {
  width: 320px; flex-shrink: 0; background: var(--paper);
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