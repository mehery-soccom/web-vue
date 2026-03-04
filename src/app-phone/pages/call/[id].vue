<script setup>
import { Icon } from '@iconify/vue';
import { onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebRTC } from "@/app-phone/composables/useWebRTC";
import { RealDB } from '@/app-phone/composables/apiSignaling';

const {
  initP2PCall, createP2POffer, createP2PAnswer,
  setRemoteDescription, addRemoteCandidate, onIceCandidate,
  endP2PCall, toggleMic, toggleCamera, toggleScreenShare,
  reattachMediaStreams, Mic, Camera, ScreenShare, isConnected,
} = useWebRTC();

const route = useRoute();
const router = useRouter();
const roomId = route.params.id;

const userName = ref(localStorage.getItem('p2p_username') || "");
const userId = (() => {
  let id = sessionStorage.getItem('p2p_userId');
  if (!id) {
    id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('p2p_userId', id);
  }
  return id;
})();
watch(userName, v => localStorage.setItem('p2p_username', v));

const remoteName = ref("");
const statusMessage = ref("");
const isHost = ref(false);
const isEndingCall = ref(false);
const isJoining = ref(false);
const hasJoined = ref(false);
const isSyncing = ref(false);
const roomFullMessage = ref("");
const nameTakenMessage = ref("");

let pollingInterval = null;
let heartbeatInterval = null;
let pollRate = 1500;
let wasEverConnected = false;
let lastAnsweredOfferSdp = null;
let currentSessionId = null;
let isCreatingNewSession = false;
let remoteDescSet = false;
let pendingCandidates = [];
const processedCandidates = new Set();

const resetWebRTC = async () => {
  await endP2PCall();
  await initP2PCall();
  processedCandidates.clear();
  pendingCandidates = []; remoteDescSet = false; lastAnsweredOfferSdp = null;
};

const stopPolling = () => { if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; } };
const stopHeartbeat = () => { if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; } };

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatInterval = setInterval(async () => {
    if (!hasJoined.value || isEndingCall.value || isJoining.value || isCreatingNewSession) return;
    const result = await RealDB.heartbeat(roomId, userId);
    if (result?.ok && result.status === "ended" && result.sessionId === currentSessionId)
      await handleSessionEnded();
  }, 10000);
};

const setupAsHost = async () => {
  const sId = currentSessionId;
  onIceCandidate(async (c) => {
    if (currentSessionId !== sId) return;
    await RealDB.addCandidate(roomId, c, 'host', sId);
  });
  const offer = await createP2POffer(roomId);
  if (currentSessionId !== sId) return;
  await RealDB.updateRoom(roomId, { offer: { type: 'offer', sdp: offer.sdp }, status: 'waiting', answer: null, guestCandidates: [] });
  statusMessage.value = "Waiting for participant...";
};

const setupAsGuest = async (initialSession) => {
  const sId = currentSessionId;
  onIceCandidate(async (c) => {
    if (currentSessionId !== sId) return;
    await RealDB.addCandidate(roomId, c, 'guest', sId);
  });
  let roomData = initialSession?.offer?.sdp ? initialSession : null;
  let attempts = 0;
  while (!roomData?.offer?.sdp && attempts < 40) {
    if (currentSessionId !== sId) return;
    statusMessage.value = "Waiting for host...";
    await new Promise(r => setTimeout(r, 300));
    roomData = await RealDB.getRoom(roomId);
    attempts++;
  }
  if (currentSessionId !== sId || !roomData?.offer?.sdp) throw new Error("Host offer unavailable.");
  const answer = await createP2PAnswer(roomData.offer);
  remoteDescSet = true;
  for (const c of pendingCandidates) addRemoteCandidate(c);
  pendingCandidates = [];
  if (currentSessionId !== sId) return;
  lastAnsweredOfferSdp = roomData.offer.sdp;
  await RealDB.updateRoom(roomId, { answer: { type: 'answer', sdp: answer.sdp }, status: 'active' });
  statusMessage.value = "Connecting...";
};

const rejoinAsParticipant = async () => {
  await resetWebRTC();
  const joined = await RealDB.createRoom(roomId, userName.value, userId, null);
  if (joined.waitingForNewSession) {
    currentSessionId = joined.sessionId;
    statusMessage.value = "Waiting for room to reset...";
    return;
  }
  currentSessionId = joined.sessionId;
  isHost.value = joined.host?.userId === userId;
  if (isHost.value) { await setupAsHost(); } else { await setupAsGuest(joined); }
};

const handleSessionEnded = async () => {
  if (isCreatingNewSession || isEndingCall.value) return;
  isCreatingNewSession = true;
  stopPolling();
  statusMessage.value = "Participant left. Waiting for them to rejoin...";
  try {
    const newSession = await RealDB.createNewSession(roomId, userId, userName.value);
    currentSessionId = newSession.sessionId;
    isHost.value = true;
    await resetWebRTC();
    await setupAsHost();
  } catch (e) {
    if (e.message?.includes('UNAUTHORIZED')) {
      // Another peer already created a new session — join it as a participant
      try {
        await rejoinAsParticipant();
      } catch (inner) {
        statusMessage.value = "Error. Please refresh.";
      }
    } else {
      statusMessage.value = "Error. Please refresh.";
    }
  } finally {
    isCreatingNewSession = false;
    startPolling(800);
  }
};

const joinRoom = async () => {
  if (!userName.value.trim()) return alert("Please enter your name");
  if (isJoining.value) return;
  roomFullMessage.value = "";
  stopPolling();
  isJoining.value = true; hasJoined.value = true; isSyncing.value = true;
  statusMessage.value = "Connecting...";
  const prevId = sessionStorage.getItem('p2p_prevUserId');
  sessionStorage.removeItem('p2p_prevUserId');
  try {
    const session = await RealDB.createRoom(roomId, userName.value, userId, prevId);
    if (session.waitingForNewSession) {
      currentSessionId = session.sessionId;
      isSyncing.value = false; isJoining.value = false;
      statusMessage.value = "Waiting for room to reset...";
      startHeartbeat(); startPolling(800);
      return;
    }
    currentSessionId = session.sessionId;
    isHost.value = session.host?.userId === userId;
    await resetWebRTC();
    if (isHost.value) { await setupAsHost(); } else { await setupAsGuest(session); }
  } catch (error) {
    hasJoined.value = false; isSyncing.value = false; isJoining.value = false;
    const msg = error.message || "";
    if (msg.includes("ROOM_FULL")) roomFullMessage.value = "This room is full.";
    else statusMessage.value = "Failed to connect. Please try again.";
    return;
  }
  isSyncing.value = false; isJoining.value = false;
  startHeartbeat(); startPolling(800);
};

const startPolling = (rate = 1500) => {
  stopPolling();
  pollRate = rate;
  pollingInterval = setInterval(async () => {
    if (isEndingCall.value || isJoining.value || isCreatingNewSession) return;
    const roomData = await RealDB.getRoom(roomId);

    if (hasJoined.value && roomData?.sessionId === currentSessionId && roomData?.status === "ended") {
      await handleSessionEnded(); return;
    }

    //detect new session after refresh
    if (hasJoined.value && roomData && roomData.sessionId !== currentSessionId) {
      const alreadyIn = roomData.host?.userId === userId || roomData.guest?.userId === userId;
      if (alreadyIn) {
        // We're already registered in the new session (e.g. fast page-refresh flow)
        currentSessionId = roomData.sessionId;
        isHost.value = roomData.host?.userId === userId;
      } else if (roomData.status === "waiting" || (roomData.status === "active" && !roomData.guest?.userId)) {
        // New session with open guest slot
        if (isJoining.value || isCreatingNewSession) return;
        stopPolling();
        isJoining.value = true; isSyncing.value = true;
        statusMessage.value = "Joining...";
        try {
          await rejoinAsParticipant();
        } catch (e) {
          statusMessage.value = "Reconnection failed. Retrying...";
        } finally {
          isJoining.value = false; isSyncing.value = false; startPolling(800);
        }
        return;
      }
    }
    if (!roomData || roomData.sessionId !== currentSessionId) return;

    // apply answer (host side)
    if (isHost.value && !remoteDescSet && roomData.answer?.sdp) {
      try {
        await setRemoteDescription(roomData.answer);
        remoteDescSet = true;
        for (const c of pendingCandidates) addRemoteCandidate(c);
        pendingCandidates = [];
      } catch (e) { if (!e.message?.includes('not initialized')) console.error("[POLL/HOST]", e); }
    }

    // re-answer on new offer (guest side)
    if (!isHost.value && !remoteDescSet && roomData.offer?.sdp && roomData.offer.sdp !== lastAnsweredOfferSdp && !roomData.answer?.sdp) {
      try {
        const sId = currentSessionId;
        await endP2PCall(); await initP2PCall();
        processedCandidates.clear(); pendingCandidates = []; remoteDescSet = false;
        onIceCandidate(async (c) => { if (currentSessionId !== sId) return; await RealDB.addCandidate(roomId, c, 'guest', sId); });
        const answer = await createP2PAnswer(roomData.offer);
        remoteDescSet = true;
        for (const c of pendingCandidates) addRemoteCandidate(c);
        pendingCandidates = [];
        if (currentSessionId !== sId) return;
        lastAnsweredOfferSdp = roomData.offer.sdp;
        await RealDB.updateRoom(roomId, { answer: { type: 'answer', sdp: answer.sdp }, status: 'active' });
      } catch (e) { console.error("[POLL/GUEST re-answer]:", e); }
    }

    // Name sync
    const remotePeer = isHost.value ? roomData.guest : roomData.host;
    remoteName.value = remotePeer?.name || "";

    // ICE trickle
    const candidates = isHost.value ? roomData.guestCandidates : roomData.hostCandidates;
    for (const c of (candidates || [])) {
      if (processedCandidates.has(c.candidate)) continue;
      processedCandidates.add(c.candidate);
      if (remoteDescSet) { addRemoteCandidate(c); } else { pendingCandidates.push(c); }
    }
    const target = !isConnected.value && roomData.guest?.userId ? 500 : isConnected.value ? 4000 : 1500;
    if (target !== pollRate) startPolling(target);
  }, pollRate);
};

watch(isConnected, async (connected) => {
  if (connected) {
    wasEverConnected = true;
    statusMessage.value = "Connected";
    startPolling(4000);
    await nextTick();
    setTimeout(() => reattachMediaStreams(), 300);
  } else if (wasEverConnected && !isEndingCall.value && !isCreatingNewSession) {
    statusMessage.value = "Participant disconnected. Waiting for them to rejoin...";
    remoteName.value = "";
    startPolling(1000);
  }
});

onMounted(async () => {
  await initP2PCall();
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('p2p_prevUserId', userId);
    if (hasJoined.value && !isEndingCall.value) {
      navigator.sendBeacon(
        `http://localhost:8090/nexus/phone/p2p/room/${roomId}/leave`,
        new Blob([JSON.stringify({ userId })], { type: 'application/json' })
      );
    }
  });
});

onUnmounted(() => {
  stopPolling(); stopHeartbeat(); endP2PCall();
  if (hasJoined.value && !isEndingCall.value) {
    RealDB.leaveRoom(roomId, userId);
  }
});

const handleLeave = async (updateDB = true) => {
  stopPolling(); stopHeartbeat();
  isEndingCall.value = true;
  if (updateDB) await RealDB.leaveRoom(roomId, userId);
  await endP2PCall();
  router.push('/call');
};
</script>

<template>
  <div class="call-container">

    <!-- Room full -->
    <div v-if="roomFullMessage" class="room-full-notice">
      <Icon icon="tabler:lock" width="48" color="#ea4335" />
      <h2>Room Full</h2>
      <p>{{ roomFullMessage }}</p>
      <button class="btn-cancel" @click="router.push('/call')">Go Back</button>
    </div>

    <!-- Syncing/reconnecting overlay -->
    <div v-else-if="isSyncing" class="sync-page">
      <div class="loader-large"></div>
      <h2>Reconnecting...</h2>
      <p>Please stay on this page while we sync.</p>
    </div>

    <!-- Pre-join staging -->
    <div v-else-if="!hasJoined">
      <h1>Meeting Room: {{ roomId }}</h1>
      <div class="staging">
        <div class="left-container">
          <div class="video-preview">
            <video id="local-video" autoplay muted playsinline class="staging-video"></video>
            <div class="controls">
              <button @click="toggleCamera" :class="{ 'btn-off': !Camera }">
                <Icon :icon="Camera ? 'tabler:video' : 'tabler:video-off'" />
              </button>
              <button @click="toggleMic" :class="{ 'btn-off': !Mic }">
                <Icon :icon="Mic ? 'tabler:microphone' : 'tabler:microphone-off'" />
              </button>
            </div>
          </div>
        </div>
        <div class="right-container">
          <label for="userName">Enter Name</label>
          <input type="text" placeholder="Your name" v-model="userName" id="userName" @keyup.enter="joinRoom" />
          <div class="buttons">
            <button class="btn-cancel" @click="handleLeave(false)">Cancel</button>
            <button class="btn-join" @click="joinRoom">Join Call</button>
          </div>
        </div>
      </div>
    </div>

    <!-- In-call -->
    <div v-else class="room">
      <video id="remote-video" autoplay playsinline class="main-video"></video>

      <div v-if="!isConnected" class="status-bar">
        <div class="loader-small"></div>
        <span>{{ statusMessage }}</span>
      </div>

      <div v-if="isConnected && remoteName" class="remote-name-badge">{{ remoteName }}</div>

      <div class="pip-wrapper">
        <video id="local-video-pip" autoplay muted playsinline class="pip-video"></video>
        <span>{{ userName }} (You)</span>
      </div>

      <div class="controls">
        <button @click="toggleCamera" :class="{ 'btn-off': !Camera }">
          <Icon :icon="Camera ? 'tabler:video' : 'tabler:video-off'" />
        </button>
        <button @click="toggleMic" :class="{ 'btn-off': !Mic }">
          <Icon :icon="Mic ? 'tabler:microphone' : 'tabler:microphone-off'" />
        </button>
        <button @click="toggleScreenShare" :class="{ 'btn-active': ScreenShare }">
          <Icon :icon="ScreenShare ? 'tabler:screen-share-off' : 'tabler:screen-share'" />
        </button>
        <button @click="handleLeave(true)" class="btn-leave">
          <Icon icon="tabler:phone-off" />
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.call-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #e9edf3;
}

.sync-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loader-large {
  width: 48px;
  height: 48px;
  border: 5px solid #1a73e8;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.room-full-notice {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  font-size: 18px;
  color: #333;
}

.staging {
  display: flex;
  gap: 32px;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.video-preview {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.video-preview video {
  width: 100%;
  height: 250px;
  object-fit: cover;
}

.right-container {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-container label {
  font-size: 14px;
  color: #1557b0;
  font-weight: 500;
}

.right-container input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #b3cae8;
  outline: none;
  font-size: 14px;
}

.right-container input:focus {
  border-color: #1a73e8;
}

.right-container .buttons {
  display: flex;
  justify-content: space-between;
}


.room {
  width: 100%;
  height: 100%;
  position: relative;
  background: black;
}

.main-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-bar {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
  white-space: nowrap;
}

.loader-small {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

.remote-name-badge {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  z-index: 5;
}

.pip-wrapper {
  position: absolute;
  bottom: 5rem;
  right: 1rem;
  width: 240px;
  height: 160px;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  z-index: 5;
}

.pip-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pip-wrapper span {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 4px;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 10;
}

.controls button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: #1a73e8;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-off {
  background: #ea4335 !important;
}

.btn-leave {
  background: #d93025 !important;
}

.btn-active {
  background: #0d8f4c !important;
}

.btn-join {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .staging {
    flex-direction: column;
  }

  .right-container {
    width: 100%;
  }
}
</style>