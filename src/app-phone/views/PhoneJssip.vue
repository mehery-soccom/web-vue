<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import { useWebRTC } from "@/app-phone/composables/useWebRTC";
import { REMOTE_JS_URL } from "@/@common/constants";

const {
  isConnected,
  isConnecting,
  connectionStatus,
  errorMessage,
  activeCall,
  incomingCall,
  callState,
  callDuration,
  callHistory,
  makeCall,
  answerCall,
  rejectCall,
  endCall,
  handleIncomingCall,
  setRemoteDescription,
} = useWebRTC();

const dialedNumber = ref("");
const isCallHistory = ref(false);
const isDialer = ref(true);
const canUseKeypad = computed(() => {
  return callState.value === "idle" || callState.value === "talking";
});

// Utility function
const sendPostMessage = (event_type, data) => {
  const phoneEvent = JSON.stringify({ event: event_type, event_data: data });
  window.parent.postMessage(phoneEvent, "*");
};

const formatCallTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const openRecents = () => {
  isCallHistory.value = true;
  isDialer.value = false;
};

const openDialer = () => {
  isCallHistory.value = false;
  isDialer.value = true;
};

// Keypad functions
const addDigit = (digit) => {
  if (callState.value === "talking") {
    // DTMF tones could be implemented here
    console.log("DTMF input:", digit);
  } else if (callState.value === "idle") {
    dialedNumber.value = `${dialedNumber.value}${digit}`;
  }
};

const removeDigit = () => {
  if (callState.value === "idle" && dialedNumber.value.length > 0) {
    dialedNumber.value = dialedNumber.value.slice(0, -1);
  }
};

const handleKeydown = (event) => {
  const allowedKeys = ["Backspace", "Delete"];
  const isDigit = /^[0-9]$/.test(event.key);
  if (isDigit) {
    addDigit(event.key);
  } else if (allowedKeys.includes(event.key)) {
    removeDigit();
  }
};

// Call handling
const handleCall = async () => {
  if (!dialedNumber.value) return;

  try {
    const offerSDP = await makeCall(dialedNumber.value);
    sendPostMessage("webrtc-offer", {
      dialedNumber: dialedNumber.value,
      offerSDP: offerSDP
    });
    
    console.log("WebRTC offer created and then send to Meta API");

  } catch (error) {
    console.error("Call failed:", error);
    alert("Failed to make call: " + error.message);
  }
};

// Audio elements configuration
const audioElements = [
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: {
      id: "ringtone",
      loop: "",
      src: `${REMOTE_JS_URL}/javacript/sounds/ringtone.wav`,
    },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: {
      id: "ringbacktone",
      loop: "",
      src: `${REMOTE_JS_URL}/javacript/sounds/ringbacktone.wav`,
    },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: {
      id: "dtmfTone",
      src: `${REMOTE_JS_URL}/javacript/sounds/dtmf.wav`,
    },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: { id: "audio-remote", autoplay: "autoplay" },
  },
  {
    parentTagName: "body",
    tagName: "audio",
    attrs: { id: "audio-local", autoplay: "autoplay", muted: "muted" },
  },
];

const loadElements = async (elements) => {
  return Promise.all(
    elements.map((elementConfig) => {
      return new Promise((resolve) => {
        const parent = document.querySelector(elementConfig.parentTagName);
        if (!parent) {
          console.warn(`Parent tag "${elementConfig.parentTagName}" not found`);
          return resolve();
        }

        const newElement = document.createElement(elementConfig.tagName);
        for (const attr in elementConfig.attrs) {
          newElement.setAttribute(attr, elementConfig.attrs[attr]);
        }

        if (elementConfig.tagName === "audio" && elementConfig.attrs.src) {
          newElement.oncanplaythrough = () => {
            console.log(`Audio loaded: ${elementConfig.attrs.id}`);
            resolve();
          };
          newElement.onerror = () => resolve(); // Resolve even if audio fails
        } else {
          resolve();
        }
        parent.appendChild(newElement);
      });
    })
  );
};

// Message handling for Meta API integration
const setupMessageHandlers = () => {
  window.addEventListener("message", async (e) => {
    try {
      const data = JSON.parse(e.data);
      console.log("Message from parent/Meta API:", data);

      switch (data.event) {
        case "incoming-call":
          handleIncomingCall(data.event_data.session, data.event_data.from, data.event_data);
          break;

        case "response-to-call":
          if (data.event_val) await answerCall();
          else await rejectCall();
          break;

        case "end-call":
          await endCall(false);
          break;
        
        case "webrtc-answer":
          await setRemoteDescription(data.event_data.answerSDP);
          break;

        case "make-call":
          await handleCall(data.event_data.dialed_number);
          break;
      }
    } catch (err) {
      console.warn("Non-JSON message or parsing error:", e.data, err);
    }
  });
};

onMounted(async () => {
  await loadElements(audioElements);
  window.addEventListener("keydown", handleKeydown);
  setupMessageHandlers();
  
  sendPostMessage("webrtc-ready", { status: "initialized" });
  // const cata = { 
  //   event:"response-to-call",
  //   event_data:{
  //     id:"wacid.HBgONDc3MDAwNTc4Mjk0NTMVEgASGCBBQzVCQTVFNTE2MUJGN0VDRkIyRjREQjFFRUZFRDI0MxwYDDkxOTYxOTcyMzc1ORUCABUeAA==",
  //     from:"918691945760",
  //     to:"919619723759",
  //     event:"connect",
  //     timestamp:"1762336250",
  //     direction:"USER_INITIATED",
  //     session:{
  //       sdp:"v=0\r\no=- 1762336250050 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio\r\na=msid-semantic: WMS 1a8be36a-9a9c-4322-8636-f2247cfdf1b9\r\na=ice-lite\r\nm=audio 3484 UDP/TLS/RTP/SAVPF 111 126\r\nc=IN IP4 163.70.144.130\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=candidate:707619806 1 udp 2122260223 163.70.144.130 3484 typ host generation 0 network-cost 50\r\na=candidate:1267757827 1 udp 2122262783 2a03:2880:f288:1d4:face:b00c:0:699c 3484 typ host generation 0 network-cost 50\r\na=ice-ufrag:VyVkdwnqGUZtqVON\r\na=ice-pwd:sGUUAvS/fOjzPtIoL72o2g==\r\na=fingerprint:sha-256 8E:64:08:0B:8F:CE:73:ED:E2:44:9C:FB:EA:0B:20:D5:41:B6:93:06:F9:79:6C:48:78:1A:A2:41:AD:9C:EA:68\r\na=setup:actpass\r\na=mid:audio\r\na=sendrecv\r\na=msid:1a8be36a-9a9c-4322-8636-f2247cfdf1b9 WhatsAppTrack1\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 maxaveragebitrate=20000;maxplaybackrate=16000;minptime=20;sprop-maxcapturerate=16000;useinbandfec=1\r\na=rtpmap:126 telephone-event/8000\r\na=maxptime:20\r\na=ptime:20\r\na=ssrc:972010428 cname:WhatsAppAudioStream1\r\n",
  //       sdp_type:"offer"
  //     }
  //   }
  // }
  // setTimeout(() => { handleIncomingCall(cata.event_data.session, cata.event_data.from, cata.event_data); }, 10000);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="container">
    <div class="webrtc-client" style="max-width: 310px;">
      <div class="status-bar">
        <div class="status-left"></div>
        <div class="status-right">
          <div class="connection-status">
            <div v-if="connectionStatus === 'disconnected'">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22 16v-.5a2.5 2.5 0 0 0-5 0v.5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1m-1 0h-3v-.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5zM18 5.83v5.43c.47-.16.97-.26 1.5-.26c.17 0 .33.03.5.05V1L1 20h13v-2H5.83z"/>
              </svg>
            </div>
            <div v-else-if="connectionStatus === 'connected'">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19.5 10c.17 0 .33.03.5.05V1L1 20h13v-3c0-.89.39-1.68 1-2.23v-.27c0-2.48 2.02-4.5 4.5-4.5m2.5 6v-1.5a2.5 2.5 0 0 0-5 0V16c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1m-1 0h-3v-1.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Incoming Call Modal -->
      <!-- <div v-if="incomingCall.show" class="incoming-call-overlay">
        <div class="incoming-call-modal">
          <h3>Incoming WhatsApp Call</h3>
          <p class="caller-info">
            <strong>From: {{ incomingCall.remoteNumber }}</strong>
          </p>
          <p class="call-time">{{ formatCallTime(incomingCall.timestamp) }}</p>

          <div class="call-actions">
            <button @click="answerCall" class="btn btn-success answer-btn">
              Answer
            </button>
            <button @click="rejectCall" class="btn btn-danger reject-btn">
              Reject
            </button>
          </div>
        </div>
      </div> -->

      <div v-if="activeCall.show" class="active-call-status">
        <h4>WhatsApp Call Active</h4>
        <p>Connected to: {{ activeCall.remoteNumber }}</p>
        <p v-if="activeCall.startTime">Duration: {{ callDuration }}</p>

        <div class="call-controls">
          <button @click="endCall(true)" class="btn btn-danger">❌ Hang Up</button>
        </div>
      </div>

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
        <div class="display">
          <div class="number-display">{{ dialedNumber }}</div>
        </div>

        <div class="keypad">
          <div class="keypad-row">
            <button class="key-button" @click="addDigit('1')" :disabled="!canUseKeypad">1</button>
            <button class="key-button" @click="addDigit('2')" :disabled="!canUseKeypad">2</button>
            <button class="key-button" @click="addDigit('3')" :disabled="!canUseKeypad">3</button>
          </div>

          <div class="keypad-row">
            <button class="key-button" @click="addDigit('4')" :disabled="!canUseKeypad">4</button>
            <button class="key-button" @click="addDigit('5')" :disabled="!canUseKeypad">5</button>
            <button class="key-button" @click="addDigit('6')" :disabled="!canUseKeypad">6</button>
          </div>

          <div class="keypad-row">
            <button class="key-button" @click="addDigit('7')" :disabled="!canUseKeypad">7</button>
            <button class="key-button" @click="addDigit('8')" :disabled="!canUseKeypad">8</button>
            <button class="key-button" @click="addDigit('9')" :disabled="!canUseKeypad">9</button>
          </div>

          <div class="keypad-row">
            <button class="key-button" @click="addDigit('+')" :disabled="!canUseKeypad">+</button>
            <button class="key-button" @click="addDigit('0')" :disabled="!canUseKeypad">0</button>
            <button class="key-button backspace" @click="removeDigit" :disabled="callState !== 'idle'">⌫</button>
          </div>
        </div>

        <div class="action-buttons">
          <button class="action-button call-button" @click="handleCall" 
                  :disabled="callState === 'ringing' || !dialedNumber">
            📞 Call
          </button>
          <button class="action-button hangup-button" @click="endCall(true)" 
                  :disabled="callState === 'idle'">
            📱 Hang Up
          </button>
        </div>
      </div>

      <ul class="tab-nav-container">
        <li class="tab" @click="openDialer">
          <div class="icon-placeholder" :class="{ active: isDialer }">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2M6 1c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m12-8c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2m-6 8c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m6 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-6 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/>
            </svg>
          </div>
          <p>Dialer</p>
        </li>
        <li class="tab" @click="openRecents">
          <div class="icon-placeholder" :class="{ active: isCallHistory }">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2m3.3 14.71L11 12.41V7h2v4.59l3.71 3.71z"/>
            </svg>
          </div>
          <p>Recent</p>
        </li>
      </ul>
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
