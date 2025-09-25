<script setup>
import DataService from "@/@common/services/DataService";
import { REMOTE_JS_URL } from "@common/constants";
import {
  computed,
  nextTick,
  onUnmounted,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";
let intervalId;
const dialedNumber = ref("");
const isCallHistory = ref(false);
const isDialer = ref(true);
const callState = ref("idle"); // 'idle', 'ringing', 'talking'
const tenantPartitionKey = ref("kedar");
const loadedResources = ref([]);
const currentDateTime = ref("");
const bullforcePstn = ref({
  FS_DISPLAY: "",
  FS_IMPU: "",
  FS_IMPI: "",
  FS_SECRET: "",
  FS_REALM: "",
  FS_WS_PROXY_URL_INT: "",
  FS_WS_PROXY_URL_EXT: "",
  FS_OUTBOUND_PROXY_URL: "",
  FS_ICE_SERVERS: "",
});
const incomingCall = ref({
  show: false,
  remoteNumber: "",
  timestamp: null,
  sessionId: null,
});

// Active call state
const activeCall = ref({
  show: false,
  remoteNumber: "",
  startTime: null,
});

// Call controls state
const callProcessing = ref(false);
const isMuted = ref(false);
const isOnHold = ref(false);
const callDuration = ref("00:00");

// Registration state
const registrationStatus = ref("Disconnected");

// Call history
const callHistory = ref([]);
const callTimer = ref(null);
const sendPostMessage = (event_type, data) => {
  const phoneEvent = JSON.stringify({ event: event_type, event_data: data });
  window.parent.postMessage(phoneEvent, "*");
};
// Computed properties
const canUseKeypad = computed(() => {
  return callState.value === "idle" || callState.value === "talking";
});
const updateDateTime = () => {
  const now = new Date();

  // Format date as DD-MM-YY
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  // Format time as HH:MM AM/PM
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedHours = String(hours).padStart(2, "0");

  currentDateTime.value = `${day}-${month}-${year}, ${formattedHours}:${minutes} ${ampm}`;
};
const statusText = computed(() => {
  switch (callState.value) {
    case "idle":
      return "Ready to dial";
    case "ringing":
      return "Calling...";
    case "talking":
      return "Connected - Use keypad for IVR";
    default:
      return "Ready to dial";
  }
});

const statusClass = computed(() => {
  return {
    "status-idle": callState.value === "idle",
    "status-ringing": callState.value === "ringing",
    "status-talking": callState.value === "talking",
  };
});
const registrationStatusClass = computed(() => {
  switch (registrationStatus.value) {
    case "connected":
      return "status-connected";
    case "Disconnected":
      return "status-disconnected";
    case "connecting...":
      return "status-connecting";
    default:
      return "status-disconnected";
  }
});
// Methods
const initializeSIPBridge = async () => {
  // Check if SIP bridge is available
  console.log("Entered SIP bridge initialize");

  if (!window.sipEventBridge) {
    console.error(
      "SIP Event Bridge not available. Make sure server.js is loaded."
    );
    return;
  }

  // Register event listeners
  window.sipEventBridge.on("incomingCall", handleIncomingCall);
  window.sipEventBridge.on("callAnswered", handleCallAnswered);
  window.sipEventBridge.on("callRejected", handleCallRejected);
  window.sipEventBridge.on("callTerminated", handleCallTerminated);
  window.sipEventBridge.on("connectionStatus", handleConnectionStatus);
  window.sipEventBridge.on("registrationAttempt", handleRegistrationAttempt);

  console.log("SIP Bridge initialized successfully");
};

const cleanupSIPBridge = () => {
  if (window.sipEventBridge) {
    window.sipEventBridge.off("incomingCall", handleIncomingCall);
    window.sipEventBridge.off("callAnswered", handleCallAnswered);
    window.sipEventBridge.off("callRejected", handleCallRejected);
    window.sipEventBridge.off("callTerminated", handleCallTerminated);
    window.sipEventBridge.off("connectionStatus", handleConnectionStatus);
    window.sipEventBridge.off("registrationAttempt", handleRegistrationAttempt);
  }
};

function areJsonEqual(obj1, obj2, path = "") {
  // If they're the same reference, return true
  if (obj1 === obj2) return { isEqual: true };

  // Check for null or non-object types
  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return {
      isEqual: false,
      mismatch: {
        path: path || "root",
        type: "type_mismatch",
        value1: obj1,
        value2: obj2,
        message: `Type mismatch at ${
          path || "root"
        }: ${typeof obj1} vs ${typeof obj2}`,
      },
    };
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if number of keys is different
  if (keys1.length !== keys2.length) {
    const missingInObj2 = keys1.filter((key) => !keys2.includes(key));
    const missingInObj1 = keys2.filter((key) => !keys1.includes(key));

    return {
      isEqual: false,
      mismatch: {
        path: path || "root",
        type: "key_count_mismatch",
        keysInObj1: keys1,
        keysInObj2: keys2,
        missingInObj2: missingInObj2,
        missingInObj1: missingInObj1,
        message: `Different number of keys at ${path || "root"}. Obj1 has ${
          keys1.length
        } keys, Obj2 has ${keys2.length} keys`,
      },
    };
  }

  // Check each key
  for (let key of keys1) {
    if (!keys2.includes(key)) {
      return {
        isEqual: false,
        mismatch: {
          path: path ? `${path}.${key}` : key,
          type: "missing_key",
          missingKey: key,
          message: `Key '${key}' exists in obj1 but not in obj2 at path ${
            path ? `${path}.${key}` : key
          }`,
        },
      };
    }

    const currentPath = path ? `${path}.${key}` : key;
    const result = areJsonEqual(obj1[key], obj2[key], currentPath);

    if (!result.isEqual) {
      return result; // Return the first mismatch found
    }
  }

  return { isEqual: true };
}

const getSecrets = async () => {
  try {
    const response = await DataService.axios.get("/v1/register", {
      headers: {
        tnt: tenantPartitionKey.value,
      },
    });
    const data = await response.data;
    // const response = await fetch(
    //   // "http://localhost:8090/nexus/phone/v1/register",
    //   "http://localhost:8090/scriptus/phone/v1/register",
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       tnt: tenantPartitionKey.value,
    //     },
    //   }
    // );
    // const data = await response.json();
    bullforcePstn.value = {
      ...data.bullforcePstn,
      FS_DISPLAY: "kedar",
    };
    bullforcePstn.value.FS_ICE_SERVERS = [];
    //switch tcp to udp outbound proxy url
    bullforcePstn.value.FS_OUTBOUND_PROXY_URL = `udp${bullforcePstn.value.FS_OUTBOUND_PROXY_URL.slice(
      3
    )}`;
    // console.log(`bulllforce creds : ${JSON.stringify(bullforceCreds)}`);
    // console.log("are equivalent : ",areJsonEqual(bullforcePstn.value,correctValue));
  } catch (error) {
    console.error(error);
    bullforcePstn.value = {};
  } finally {
    // converting number to string
    bullforcePstn.value.FS_IMPI = bullforcePstn.value.FS_IMPI.toString();
    bullforcePstn.value.FS_SECRET = bullforcePstn.value.FS_SECRET.toString();
    // converting string of list of JSON objects to a list of JSON objects according to
    // these docs : https://www.doubango.org/sipml5/docgen/symbols/SIPml.Stack.html
    // bullforcePstn.value.FS_ICE_SERVERS = eval(
    //   "(" + bullforcePstn.value.FS_ICE_SERVERS + ")"
    // );
    console.log(`Sip register to be called`);
    // console.log(`bullforcePstn final : `, bullforcePstn.value);
    callSipRegister();
  }
};

const callSipRegister = () => {
  try {
    if (typeof window.sipRegister === "function") {
      window.sipRegister(bullforcePstn.value);
    } else {
      console.warn("sipRegister function is not available");
    }
  } catch (error) {
    console.error("Error calling sipRegister:", error);
  }
};
const callSipUnregister = () => {
  try {
    if (typeof window.sipUnRegister === "function") {
      window.sipUnRegister();
    } else {
      console.warn("sipRegister function is not available");
    }
  } catch (error) {
    console.error("Error calling sipRegister:", error);
  }
};

const handleIncomingCall = (data) => {
  console.log("Incoming call received:", data);

  incomingCall.value = {
    show: true,
    remoteNumber: data.remoteNumber,
    timestamp: data.timestamp,
    sessionId: data.sessionId,
  };
  sendPostMessage("incomming-call", {
    remoteNumber: data.remoteNumber,
    timestamp: data.timestamp,
    sessionId: data.sessionId,
  });
  // Add to call history
  addToCallHistory(data.remoteNumber, "incoming", data.timestamp);
};

const handleCallAnswered = (data) => {
  console.log("Call answered:", data);

  incomingCall.value.show = false;
  activeCall.value = {
    show: true,
    remoteNumber: incomingCall.value.remoteNumber,
    startTime: new Date(),
  };

  callProcessing.value = false;
  startCallTimer();

  // Update call history
  updateCallHistory("answered");
};

const handleCallRejected = (data) => {
  console.log("Call rejected:", data);

  incomingCall.value.show = false;
  callProcessing.value = false;

  // Update call history
  updateCallHistory("rejected");
};

const handleCallTerminated = (data) => {
  console.log("Call terminated:", data);

  incomingCall.value.show = false;
  activeCall.value.show = false;
  callProcessing.value = false;
  isMuted.value = false;
  isOnHold.value = false;

  if (callTimer.value) {
    clearInterval(callTimer.value);
    callTimer.value = null;
  }
  sendPostMessage("call-terminated", data);
  callState.value = "idle";
  // Update call history
  updateCallHistory("terminated");
};

const handleConnectionStatus = (data) => {
  console.log("Connection status:", data);
  registrationStatus.value = data.connected;
  sendPostMessage("connection-status", { connection: data.connected });
};

const handleRegistrationAttempt = (data) => {
  console.log("Registration attempt:", data);
  registrationStatus.value = "connecting...";
};

// === CALL ACTIONS ===
const answerCall = () => {
  console.log("Answering call...");
  callProcessing.value = true;
  try {
    if (typeof window.answercall === "function") {
      window.answercall();
    } else {
      console.warn("answercall function is not available");
      callProcessing.value = false;
    }
  } catch (error) {
    console.error("Error calling answercall:", error);
  }
};

const rejectCall = () => {
  console.log("Rejecting call...");
  callProcessing.value = true;
  try {
    if (typeof window.rejectcall === "function") {
      window.rejectcall();
    } else {
      console.warn("rejectcall function is not available");
    }
  } catch (error) {
    console.error("Error calling rejectcall:", error);
  }
};

const hangupCall = () => {
  console.log("Hanging up call...");

  if (typeof window.sipHangUp === "function") {
    window.sipHangUp();
  } else {
    console.error("Hangup function not available");
  }
  callState.value = "idle";
};

const toggleMute = () => {
  try {
    if (typeof window.sipToggleMute === "function") {
      window.sipToggleMute();
      isMuted.value = !isMuted.value;
    } else {
      console.warn("sipToggleMute function is not available");
    }
  } catch (error) {
    console.error("Error calling sipToggleMute:", error);
  }
};

const toggleHold = () => {
  try {
    if (typeof window.sipToggleHoldResume === "function") {
      window.sipToggleHoldResume();
      isOnHold.value = !isOnHold.value;
    } else {
      console.warn("sipToggleHoldResume function is not available");
    }
  } catch (error) {
    console.error("Error calling sipToggleHoldResume:", error);
  }
};

const addDigit = (digit) => {
  if (callState.value === "talking") {
    // IVR response - you can emit an event or handle IVR logic here
    console.log("IVR input:", digit);
  } else if (callState.value === "idle") {
    dialedNumber.value = `${dialedNumber.value}${digit}`;
  }
};

const removeDigit = () => {
  if (callState.value === "idle" && dialedNumber.value.length > 0) {
    dialedNumber.value = dialedNumber.value.slice(0, -1);
  }
};

const makeCall = () => {
  if (dialedNumber.value && callState.value === "idle") {
    callState.value = "ringing";
    try {
      if (typeof window.sipCall === "function") {
        window.sipCall("call-audio", dialedNumber.value, Date.now());
        addToCallHistory(dialedNumber.value, "outgoing");
      } else {
        console.warn("sipCall function is not available");
      }
    } catch (error) {
      console.error("Error calling sipCall:", error);
    }
  }
};

// === UTILITY METHODS ===
const formatCallTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const startCallTimer = () => {
  callTimer.value = setInterval(() => {
    if (activeCall.value.startTime) {
      const duration = Math.floor(
        (new Date() - activeCall.value.startTime) / 1000
      );
      const minutes = Math.floor(duration / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (duration % 60).toString().padStart(2, "0");
      callDuration.value = `${minutes}:${seconds}`;
    }
  }, 1000);
};

const addToCallHistory = (remoteNumber, status, timestamp) => {
  callHistory.value.unshift({
    id: Date.now(),
    remoteNumber,
    status,
    timestamp,
  });

  // Keep only last 10 calls
  if (callHistory.value.length > 10) {
    callHistory.value = callHistory.value.slice(0, 10);
  }
};

const updateCallHistory = (newStatus) => {
  if (callHistory.value.length > 0) {
    callHistory.value[0].status = newStatus;
  }
};

const openRecents = async () => {
  isCallHistory.value = true;
  isDialer.value = false;
};
const openDialer = async () => {
  isCallHistory.value = false;
  isDialer.value = true;
};

function handleKeydown(event) {
  const allowedKeys = ["Backspace", "Delete"];
  const isDigit = /^[0-9]$/.test(event.key);
  if (isDigit) {
    addDigit(event.key);
  } else if (allowedKeys.includes(event.key)) {
    // Do something for Backspace, Delete, or digit 0–9
    removeDigit();
  }
}
// Data for elements to be preloaded
const preloads = [
  {
    parentTagName: "head",
    tagName: "script",
    attrs: { src: `${REMOTE_JS_URL}/javascript/adapter.js` },
  },
  {
    parentTagName: "head",
    tagName: "script",
    attrs: { src: `${REMOTE_JS_URL}/javascript/SIPml-api-altered.js` },
  },
  {
    parentTagName: "head",
    tagName: "script",
    attrs: { src: `${REMOTE_JS_URL}/javascript/server.js` },
  },
];

// Data for audio elements
const audioElements = [
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: {
      id: "ringtone",
      loop: "",
      src: `${REMOTE_JS_URL}/javascript/sounds/ringtone.wav`,
    },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: {
      id: "ringbacktone",
      loop: "",
      src: `${REMOTE_JS_URL}/javascript/sounds/ringbacktone.wav`,
    },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: {
      id: "dtmfTone",
      src: `${REMOTE_JS_URL}/javascript/sounds/dtmf.wav`,
    },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: { id: "audio-remote", autoplay: "autoplay" },
  },
];

const loadElements = async (elements) => {
  return Promise.all(
    elements.map((elementConfig) => {
      return new Promise((resolve, reject) => {
        const parent = document.querySelector(elementConfig.parentTagName);
        if (!parent) {
          console.warn(
            `Parent tag "${elementConfig.parentTagName}" not found for element:`,
            elementConfig
          );
          return resolve(); // Resolve even if parent not found to not block other elements
        }

        const newElement = document.createElement(elementConfig.tagName);
        for (const attr in elementConfig.attrs) {
          newElement.setAttribute(attr, elementConfig.attrs[attr]);
        }

        if (elementConfig.tagName === "script") {
          newElement.onload = () => {
            console.log(`Script loaded: ${elementConfig.attrs.src}`);
            resolve();
          };
          newElement.onerror = (error) => {
            console.error(
              `Error loading script: ${elementConfig.attrs.src}`,
              error
            );
            reject(error);
          };
        } else if (
          elementConfig.tagName === "audio" &&
          elementConfig.attrs.src
        ) {
          // For audio, we can listen to 'canplaythrough' or 'loadeddata'
          // 'canplaythrough' means the browser estimates it can play the media to the end without stopping for buffering
          newElement.oncanplaythrough = () => {
            console.log(
              `Audio loaded and ready to play: ${elementConfig.attrs.id}`
            );
            resolve();
          };
          newElement.onerror = (error) => {
            console.error(
              `Error loading audio: ${elementConfig.attrs.id}`,
              error
            );
            reject(error);
          };
          // In case canplaythrough doesn't fire for some reason or faster resolution is needed
          // newElement.onloadeddata = () => {
          //   console.log(`Audio data loaded: ${elementConfig.attrs.id}`);
          //   resolve();
          // };
        } else {
          resolve(); // For other tag types, resolve immediately after creation
        }
        parent.appendChild(newElement);
      });
    })
  );
};
onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
// Lifecycle hooks
onMounted(async () => {
  sendPostMessage("connection-status", {
    connection: registrationStatus.value,
  });
  console.log("windows const app context : ", window.CONST.APP_CONTEXT);
  console.log("window const cdn url : ", window.CONST.CDN_URL);
  console.log("window dynamic base : ", window.__dynamic_base__);
  console.log("REMOTE_JS_URL", REMOTE_JS_URL);
  try {
    // Load script files
    await loadElements(preloads);
    console.log("All script files loaded.");

    // Create and load audio elements
    await loadElements(audioElements);
    console.log("All audio elements created and ready.");

    // Once both are done, the rest of your onMounted logic can run
    console.log(
      "onMounted: Preloading and audio elements setup complete. Running the rest of the onMounted hook."
    );
    // Your other onMounted logic here
    // e.g., initialize SIPml-api, set up event listeners, etc.
  } catch (error) {
    console.error(
      "onMounted: Error during preloading or element creation:",
      error
    );
    // Handle errors appropriately, e.g., show an error message to the user
  }
  window.addEventListener("keydown", handleKeydown);
  window.onloadServerJs();
  await initializeSIPBridge();
  await getSecrets();
  updateDateTime(); // Initial update
  intervalId = setInterval(updateDateTime, 60000); // Update every minute
  console.log("Phone component mounted.");
  window.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data);
      console.log("event from agent panel :", data);
      if (data.event === "response-to-call") {
        console.log("response to call event : ", data.event_data);
        if (data.event_data) {
          console.log("Phone app call answered ");
          answerCall();
        } else {
          console.log("Phone app call rejected ");
          rejectCall();
        }
      }
      // if (data.event === "incomming-call") {
      //     console.log("event calling iframe", data)
      //     const el = document.querySelector('.profile-tooltip-content-call');
      //     if (el) el.style.display = 'block'; el.style.opacity = 1; el.style.pointerEvents = 'auto';
      // } else if(data.event === "call-terminated") {
      //     const el = document.querySelector('.profile-tooltip-content-call');
      //     if (el && el.style.display === 'block') el.style.display = 'none'; el.style.opacity = 0; el.style.pointerEvents = 'none';
      //     console.log("event hanging up iframe", data)
      // } else {
      //     console.log("event other iframe", data)
      // }
    } catch (err) {
      console.warn("event from Non-JSON message received:", e.data);
    }
  });
});

onBeforeUnmount(() => {
  console.log("Phone component unmounting.");
  callSipUnregister();
  window.removeEventListener("keydown", handleKeydown);
  cleanupSIPBridge();

  // Clean up dynamically loaded elements
  loadedResources.value.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  loadedResources.value = [];
});
</script>

<template>
  <div class="container">
    <!-- Status Bar -->
    <div class="sip-client">
      <div class="status-bar">
        <div class="status-left">
          <!-- <span>11:17 AM</span> -->
          <span>{{ currentDateTime }}</span>
        </div>
        <div class="status-right">
          <div class="registration-status">
            <!-- Connected Icon -->
            <div v-if="registrationStatus === 'Disconnected'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M22 16v-.5a2.5 2.5 0 0 0-5 0v.5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1m-1 0h-3v-.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5zM18 5.83v5.43c.47-.16.97-.26 1.5-.26c.17 0 .33.03.5.05V1L1 20h13v-2H5.83z"
                />
              </svg>
            </div>
            <div v-else-if="registrationStatus === 'connected'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M19.5 10c.17 0 .33.03.5.05V1L1 20h13v-3c0-.89.39-1.68 1-2.23v-.27c0-2.48 2.02-4.5 4.5-4.5m2.5 6v-1.5a2.5 2.5 0 0 0-5 0V16c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1m-1 0h-3v-1.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"
                />
              </svg>
            </div>
            <span class="status-text">{{ registrationStatus }}</span>
          </div>
        </div>
      </div>
      <!-- Incoming Call Modal/Alert -->
      <div v-if="incomingCall.show" class="incoming-call-overlay">
        <div class="incoming-call-modal">
          <h3>Incoming Call</h3>
          <p class="caller-info">
            <strong>From: {{ incomingCall.remoteNumber }}</strong>
          </p>
          <p class="call-time">{{ formatCallTime(incomingCall.timestamp) }}</p>

          <div class="call-actions">
            <button
              @click="answerCall"
              class="btn btn-success answer-btn"
              :disabled="callProcessing"
            >
              <span v-if="!callProcessing">Answer</span>
              <span v-else>Connecting...</span>
            </button>

            <button
              @click="rejectCall"
              class="btn btn-danger reject-btn"
              :disabled="callProcessing"
            >
              <span v-if="!callProcessing">Reject</span>
              <span v-else>Rejecting...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Active Call Status -->
      <div v-if="activeCall.show" class="active-call-status">
        <h4>Call Active</h4>

        <p>Connected to: {{ activeCall.remoteNumber }}</p>
        <p>Duration: {{ callDuration }}</p>

        <div class="call-controls">
          <button @click="hangupCall" class="btn btn-danger">❌ Hang Up</button>
          <!-- <button @click="toggleMute" class="btn btn-secondary">
            {{ isMuted ? "🔊 Unmute" : "🔇 Mute" }}
          </button>
          <button @click="toggleHold" class="btn btn-secondary">
            {{ isOnHold ? "▶️ Resume" : "⏸️ Hold" }}
          </button> -->
        </div>
      </div>
      <!-- Call History -->
      <div class="call-history" v-if="isCallHistory">
        <h4>Recent Calls</h4>
        <ul>
          <li v-for="call in callHistory" :key="call.id">
            {{ call.remoteNumber }} - {{ call.status }} -
            {{ formatCallTime(call.timestamp) }}
          </li>
        </ul>
      </div>
      <div class="dialer-container" v-if="isDialer">
        <!-- Registration Status -->
        <!-- <div class="registration-status">
          <p>Status: {{ registrationStatus }}</p>
        </div> -->
        <div class="display">
          <div class="number-display">{{ dialedNumber }}</div>
          <!-- <div class="status-display" :class="statusClass">
            {{ statusText }}
          </div> -->
        </div>
        <div class="keypad">
          <div class="keypad-row">
            <button
              class="key-button"
              @click="addDigit('1')"
              :disabled="!canUseKeypad"
            >
              1
            </button>
            <button
              class="key-button"
              @click="addDigit('2')"
              :disabled="!canUseKeypad"
            >
              2
            </button>
            <button
              class="key-button"
              @click="addDigit('3')"
              :disabled="!canUseKeypad"
            >
              3
            </button>
          </div>

          <div class="keypad-row">
            <button
              class="key-button"
              @click="addDigit('4')"
              :disabled="!canUseKeypad"
            >
              4
            </button>
            <button
              class="key-button"
              @click="addDigit('5')"
              :disabled="!canUseKeypad"
            >
              5
            </button>
            <button
              class="key-button"
              @click="addDigit('6')"
              :disabled="!canUseKeypad"
            >
              6
            </button>
          </div>

          <div class="keypad-row">
            <button
              class="key-button"
              @click="addDigit('7')"
              :disabled="!canUseKeypad"
            >
              7
            </button>
            <button
              class="key-button"
              @click="addDigit('8')"
              :disabled="!canUseKeypad"
            >
              8
            </button>
            <button
              class="key-button"
              @click="addDigit('9')"
              :disabled="!canUseKeypad"
            >
              9
            </button>
          </div>

          <div class="keypad-row">
            <button
              class="key-button"
              @click="addDigit('+')"
              :disabled="!canUseKeypad"
            >
              +
            </button>
            <button
              class="key-button"
              @click="addDigit('0')"
              :disabled="!canUseKeypad"
            >
              0
            </button>
            <button
              class="key-button backspace"
              @click="removeDigit"
              :disabled="callState !== 'idle'"
            >
              ⌫
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <button
            class="action-button call-button"
            @click="makeCall"
            :disabled="callState === 'ringing' || !dialedNumber"
          >
            📞 Call
          </button>

          <button
            class="action-button hangup-button"
            @click="hangupCall"
            :disabled="callState === 'idle'"
          >
            📱 Hang Up
          </button>
        </div>
      </div>
      <!-- <ul class="tab-nav-container">
        <li class="tab tab-purple" @click="openDialer">
          <p>Dialer</p>
        </li>
        <li class="tab tab-pink" @click="openRecents">
          <p>Recents</p>
        </li>
      </ul> -->
      <ul class="tab-nav-container">
        <li class="tab" @click="openDialer">
          <!-- <div class="icon-placeholder"></div> -->
          <div class="icon-placeholder" :class="{ active: isDialer }">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2M6 1c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m12-8c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2m-6 8c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m6 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-6 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"
              />
            </svg>
          </div>
          <p>Dialer</p>
        </li>
        <li class="tab" @click="openRecents">
          <div v-if="!isCallHistory" class="icon-placeholder">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8"
              />
              <path
                fill="currentColor"
                d="M12.5 7H11v6l5.25 3.15l.75-1.23l-4.5-2.67z"
              />
            </svg>
          </div>
          <div
            v-else
            class="icon-placeholder"
            :class="{ active: isCallHistory }"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2m3.3 14.71L11 12.41V7h2v4.59l3.71 3.71z"
              />
            </svg>
          </div>
          <p>Recent</p>
        </li>
        <!-- <li class="tab">
            <div class="icon-placeholder"></div>
            <p>Contacts</p>
        </li> -->
      </ul>
      <!-- <button
        v-if="registrationStatus === 'connected'"
        class="action-button"
        @click="callSipUnregister"
        :disabled="registrationStatus !== 'connected'"
      >
        Sip-Un-Register
      </button>
      <button
        v-if="registrationStatus === 'Disconnected'"
        class="action-button"
        @click="callSipRegister"
        :disabled="registrationStatus !== 'Disconnected'"
      >
        Sip-Register
      </button> -->
    </div>
  </div>
</template>

<style>
.btn-success {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px; /* More square, slightly rounded */
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.btn-success:hover {
  background-color: #24913e;
  box-shadow: 0 3px 6px rgba(40, 167, 69, 0.25);
}

.btn-danger {
  background-color: #a70414;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.btn-danger:hover {
  background-color: #860a0a;
  box-shadow: 0 3px 6px rgba(220, 53, 69, 0.25);
}

.container {
  display: flex;
  justify-content: center;
  align-items: center;

  height: 100vh;
}
.registration-status {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 500;
}
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #fff;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.status-left {
  display: flex;
  align-items: center;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  margin-right: 4px;
}

.bar {
  width: 3px;
  background-color: #333;
  border-radius: 1px;
}

.bar:nth-child(1) {
  height: 4px;
}
.bar:nth-child(2) {
  height: 6px;
}
.bar:nth-child(3) {
  height: 8px;
}
.bar:nth-child(4) {
  height: 10px;
}

.wifi-icon {
  width: 16px;
  height: 16px;
  margin-left: 8px;
}

.battery {
  display: flex;
  align-items: center;
  font-size: 12px;
  margin-left: 8px;
}

.battery-icon {
  width: 20px;
  height: 12px;
  border: 1px solid #333;
  border-radius: 2px;
  margin-left: 4px;
  position: relative;
}

.battery-level {
  background-color: #4caf50;
  height: 100%;
  width: 44%;
  border-radius: 1px;
}

.battery-tip {
  position: absolute;
  right: -3px;
  top: 3px;
  width: 2px;
  height: 6px;
  background-color: #333;
  border-radius: 0 1px 1px 0;
}

.search-container {
  padding: 16px;
  background-color: #f5f5f5;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: #e8eaf6;
  border-radius: 25px;
  padding: 12px 16px;
  gap: 12px;
}

.search-icon {
  width: 20px;
  height: 20px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #333;
  outline: none;
}

.search-input::placeholder {
  color: #666;
  opacity: 0.8;
}

.voice-icon,
.menu-icon {
  width: 20px;
  height: 20px;
  opacity: 0.6;
  cursor: pointer;
}
.tab-nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 10px 0;
  background: #ededf7;
  box-sizing: border-box;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom-right-radius: 40px;
  border-bottom-left-radius: 40px;
  list-style: none;
  position: relative;
  bottom: 0;
  left: 0;
}

.tab {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  opacity: 0.7;
}

.icon-placeholder {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 56px;
  height: 30px;
  margin-bottom: 6px;
  background-color: #ededf7;
  border-radius: 16px;
  opacity: 0.6;
}

.tab p {
  font-family: "Roboto", sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin: 0;
  text-align: center;
}
.active {
  background-color: #dce0f9;
}
.call-history {
  /* margin-top: 30px; */
  width: 360px;
  margin: 0 auto;
  padding: 20px;
}

.call-history ul {
  list-style: none;
  padding: 0;
}

.call-history li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}
.active-call-status {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 5px;
  margin: 20px 0;
}
.call-controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}
.sip-client {
  max-width: 360px;
  margin: 0 auto;
  padding: 20px;
}

.incoming-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.incoming-call-modal {
  background: white;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.caller-info {
  font-size: 18px;
  margin: 15px 0;
}

.call-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 20px;
}
.dialer-container {
  max-width: 320px;
  margin: 0 auto;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.display {
  background: #fff;
  border-radius: 10px;
  margin-bottom: 20px;
  padding: 20px;
  text-align: center;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
}

.number-display {
  font-size: 24px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
  min-height: 30px;
  word-break: break-all;
}

.status-display {
  font-size: 14px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 15px;
  transition: all 0.3s ease;
}

.status-idle {
  background: #e3f2fd;
  color: #1976d2;
}

.status-ringing {
  background: #fff3e0;
  color: #f57c00;
  animation: pulse 1.5s infinite;
}

.status-talking {
  background: #e8f5e8;
  color: #2e7d32;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.keypad {
  margin-bottom: 20px;
}

.keypad-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.key-button {
  width: 90px;
  height: 60px;
  border: none;
  border-radius: 10px;
  background: #fff;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.key-button:hover:not(:disabled) {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.key-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.key-button:disabled {
  background: #e0e0e0;
  color: #999;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.backspace {
  background: #ffebee !important;
  color: #d32f2f !important;
}

.backspace:hover:not(:disabled) {
  background: #ffcdd2 !important;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.action-button {
  padding: 10px;
  flex: 1;
  height: 50px;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
}

.call-button {
  background: #4caf50;
  color: white;
}

.call-button:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
}

.call-button:disabled {
  background: #c8e6c9;
  color: #81c784;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.hangup-button {
  background: #f44336;
  color: white;
}

.hangup-button:hover:not(:disabled) {
  background: #da190b;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(244, 67, 54, 0.3);
}

.hangup-button:disabled {
  background: #ffcdd2;
  color: #ef9a9a;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
}
</style>
