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
  receivedSdpAnswer,
  receivedAnswer,
  makeCall,
  answerCall,
  rejectCall,
  endCall,
  handleIncomingCall,
  setRemoteDescription,
  gotAnswer,
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
          handleIncomingCall(data.event_data.session, data.event_data.from, data.event_data, data.channelId);
          break;

        case "response-to-call":
          if (data.event_val) await answerCall();
          else await rejectCall();
          break;

        case "end-call":
          await endCall(false);
          break;
        
        case "webrtc-answer":
          gotAnswer(data);
          break;
        
        case "accepted-call":
          await setRemoteDescription(receivedSdpAnswer);
          break;

        case "make-call":
          await makeCall(data.channelId, data.event_data.dialed_number, data.event_data.agentCode);
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
  //   },
  //   channelId: 'wacfb:8745876899',
  // }
  // setTimeout(() => { handleIncomingCall(cata.event_data.session, cata.event_data.from, cata.event_data, cata.channelId); }, 10000);
  // const cata = { 
  //   event:"make-call",
  //   event_data:{
  //     dialed_number:"918691945760",
  //     agentCode: 'bhavik'
  //   },
  //   channelId: 'wacfb:919619723759',
  // }
  // setTimeout(() => { makeCall(cata.channelId, cata.event_data.dialed_number, cata.event_data.agentCode ); }, 10000);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>


<template>
  <div class="container">
    <div class="webrtc-client" style="max-width: 310px;">
      
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

      <div v-if="activeCall.show" class="incoming-call-overlay">
        <div class="active-call-status">
          <h4>Active Call</h4>
          <p>{{ activeCall.remoteNumber }}</p>
          <p v-if="activeCall.startTime">Duration: {{ callDuration }}</p>

          <div class="call-controls">
            <button @click="endCall(true)" class="btn btn-danger">❌</button>
          </div>
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
          <button class="action-button call-button" @click="handleCall" style="color: white;"
                  :disabled="callState === 'ringing' || !dialedNumber">
            📞
          </button>
          <!-- <button class="action-button hangup-button" @click="endCall(true)" 
                  :disabled="callState === 'idle'">
            📱 Hang Up
          </button> -->
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
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden !important;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.container {
  overflow: hidden !important;
  width: 100%;
  /* height: 100%; */
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(180deg, #f7f9fb, #e9edf3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.webrtc-client {
  width: 300px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 25px;
  backdrop-filter: blur(8px);
  box-shadow: 10px 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Incoming / Active Call */
.incoming-call-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.incoming-call-modal {
  background: #fff;
  border-radius: 20px;
  padding: 30px;
  width: 90%;
  max-width: 340px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  text-align: center;
  animation: fadeIn 0.3s ease;
}

.incoming-call-modal h3 {
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
}

.caller-info {
  font-size: 16px;
  color: #444;
}

.call-actions {
  display: flex;
  justify-content: center;
  gap: 25px;
  margin-top: 25px;
}

/* Buttons */
.btn {
  border: none;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.btn-success {
  background: linear-gradient(145deg, #4cd964, #34c759);
  color: #fff;
}

.btn-success:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 18px rgba(76, 217, 100, 0.4);
}

.btn-danger {
  background: linear-gradient(145deg, #ff3b30, #d9342c);
  color: #fff;
}

.btn-danger:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 18px rgba(255, 59, 48, 0.4);
}

/* Active Call Card */
.active-call-status {
  background: #fefefe;
  border-radius: 16px;
  padding: 20px;
  margin: 20px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.active-call-status h4 {
  margin-bottom: 8px;
  color: #222;
}

.call-controls {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* Dialer */
.dialer-container {
  background-color: #f6f6f6;
  padding: 25px 20px 30px;
}

.display {
  background: #fff;
  border-radius: 15px;
  text-align: center;
  padding: 18px;
  margin-bottom: 15px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 0.5px solid #ddd;
}

.number-display {
  font-size: 24px;
  font-weight: 500;
  color: #222;
  min-height: 30px;
  word-break: break-all;
}

.keypad {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 15px 0 20px;
}

.keypad-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.key-button {
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 50%;
  background: #fff;
  font-size: 24px;
  font-weight: 500;
  color: #111;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.key-button:hover:not(:disabled) {
  background: #f5f5f5;
  transform: scale(1.05);
}

.key-button:active:not(:disabled) {
  transform: scale(0.95);
}

.backspace {
  background: #fff0f0 !important;
  color: #e53935 !important;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.call-button,
.hangup-button {
  border: none;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.call-button {
  background: linear-gradient(145deg, #4cd964, #34c759);
  box-shadow: 0 4px 15px rgba(76, 217, 100, 0.3);
}

.hangup-button {
  background: linear-gradient(145deg, #ff3b30, #d9342c);
  box-shadow: 0 4px 15px rgba(255, 59, 48, 0.3);
}

.call-button:hover,
.hangup-button:hover {
  transform: scale(1.08);
}

/* Bottom Navigation */
.tab-nav-container {
  display: none;
  justify-content: space-around;
  align-items: center;
  background: #f1f3f6;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding: 15px 0;
  margin: 0px;
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: 0.2s;
}

.icon-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 46px;
  height: 30px;
  border-radius: 14px;
  color: #666;
}

.active {
  background: #d9e1ff;
  color: #2b52e0;
}

.tab p {
  font-size: 12px;
  margin: 4px 0 0;
  color: #666;
}

.tab:hover {
  opacity: 0.75;
}

/* Call History */
.call-history {
  padding: 20px;
  text-align: left;
}

.call-history h4 {
  color: #222;
  margin-bottom: 10px;
}

.call-history li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  color: #444;
  font-size: 14px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

::-webkit-scrollbar {
  display: none !important;
}
</style>
