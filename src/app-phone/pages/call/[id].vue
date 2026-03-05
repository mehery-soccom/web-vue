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
  reattachMediaStreams, Mic, Camera, ScreenShare, isConnected, sendCameraState, onRemoteCameraState,
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
const roomFullMessage = ref("");
const remoteCameraOn = ref(false);
const nameError = ref("")

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
  onRemoteCameraState((val) => { remoteCameraOn.value = val; });
  const joined = await RealDB.createRoom(roomId, userName.value, userId, null);
  if (joined.waitingForNewSession) {
    currentSessionId = joined.sessionId;
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
  remoteName.value = "";
  remoteName.value = "";
  remoteCameraOn.value = false;
  try {
    const newSession = await RealDB.createNewSession(roomId, userId, userName.value);
    currentSessionId = newSession.sessionId;
    isHost.value = true;
    await resetWebRTC();
    onRemoteCameraState((val) => { remoteCameraOn.value = val; });
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
  if (!userName.value.trim()) { nameError.value = "Please enter your name"; return; }
  nameError.value = "";

  if (isJoining.value) return;
  roomFullMessage.value = "";
  stopPolling();
  isJoining.value = true; hasJoined.value = true;
  const prevId = sessionStorage.getItem('p2p_prevUserId');
  sessionStorage.removeItem('p2p_prevUserId');
  try {
    const session = await RealDB.createRoom(roomId, userName.value, userId, prevId);
    if (session.waitingForNewSession) {
      currentSessionId = session.sessionId;
      isJoining.value = false;
      startHeartbeat(); startPolling(800);
      return;
    }
    currentSessionId = session.sessionId;
    isHost.value = session.host?.userId === userId;
    await resetWebRTC();
    onRemoteCameraState((val) => { remoteCameraOn.value = val; });
    if (isHost.value) { await setupAsHost(); } else { await setupAsGuest(session); }
  } catch (error) {
    hasJoined.value = false; isJoining.value = false;
    const msg = error.message || "";
    if (msg.includes("ROOM_FULL")) roomFullMessage.value = "This room is full.";
    else statusMessage.value = "Failed to connect. Please try again.";
    return;
  }
  isJoining.value = false;
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
        isJoining.value = true;
        try {
          await rejoinAsParticipant();
        } catch (e) {
          statusMessage.value = "Reconnection failed. Retrying...";
        } finally {
          isJoining.value = false; startPolling(800);
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
    if (roomData.sessionId === currentSessionId) {
      remoteName.value = remotePeer?.name || "";
    }
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
    startPolling(4000);
    await nextTick();
    setTimeout(() => reattachMediaStreams(), 300);
  } else if (wasEverConnected && !isEndingCall.value && !isCreatingNewSession) {
    remoteName.value = "";
    startPolling(1000);
  }
});

watch(remoteCameraOn, async (val) => {
  if (val) {
    await nextTick();
    reattachMediaStreams();
  }
});

watch(userName, v => {
  localStorage.setItem('p2p_username', v);
  if (v.trim()) nameError.value = "";
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

    <!-- Pre-join staging -->
    <div v-else-if="!hasJoined" class="staging-page">
      <h1>Room: <span class="room-id">{{ roomId }}</span></h1>
      <div class="staging">
        <div class="left-container">
          <div class="video-preview">
            <video id="local-video" autoplay muted playsinline class="staging-video"></video>
            <div class="controls staging-controls">
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
          <div class="name-field">
            <label for="userName">Your name</label>
            <input type="text" placeholder="Enter your name" v-model="userName" id="userName" @keyup.enter="joinRoom" />
            <span v-if="nameError" style="color: #ea4335; font-size: 0.78rem; margin-top: -8px;">{{ nameError }}</span>
          </div>
          <div class="buttons">
            <button class="btn-cancel" @click="handleLeave(false)">Cancel</button>
            <button class="btn-join" @click="joinRoom">Join Call</button>
          </div>
        </div>
      </div>
    </div>

    <!-- In-call -->
    <div v-else class="room">

      <!-- Remote video -->
      <video id="remote-video" autoplay playsinline class="main-video"
        :class="{ hidden: !isConnected || !remoteCameraOn }"></video>

      <!-- remote peer not connected -->
      <div v-if="!isConnected || !remoteCameraOn" class="remote-placeholder">
        <template v-if="remoteName">
          <div class="avatar-ring">
            <div class="avatar">{{ remoteName.charAt(0).toUpperCase() }}</div>
          </div>
          <p class="placeholder-name">{{ remoteName }}</p>
          <div class="connecting-dots" v-if="!isConnected">
            <span></span><span></span><span></span>
          </div>
        </template>
        <template v-else>
          <div class="avatar-ring empty">
            <Icon icon="tabler:user" width="40" color="rgba(255,255,255,0.2)" />
          </div>
          <p class="placeholder-name muted">Waiting for someone to join…</p>
        </template>
      </div>

      <!-- Remote name -->
      <div v-if="remoteName" class="remote-name-badge">{{ remoteName }}</div>

      <!-- Local  -->
      <div class="pip-wrapper">
        <video id="local-video-pip" autoplay muted playsinline class="pip-video" :class="{ hidden: !Camera }"></video>
        <div v-if="!Camera" class="pip-avatar">
          {{ userName.charAt(0).toUpperCase() }}
        </div>
        <span>{{ userName }} (You)</span>
      </div>

      <!-- Controls -->
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

/* ── Room full ── */
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

/* ── Staging ── */
.staging-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.staging-page h1 {
  font-size: 1rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 1rem;
}

.room-id {
  color: #1a73e8;
  font-family: monospace;
  font-weight: 700;
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
  background: #111;
  border-radius: 12px;
  overflow: hidden;
  width: 300px; 
  height: 250px;
  flex-shrink: 0;
}

.video-preview video {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
}

.right-container {
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: space-between;
  
}
.name-field{
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.name-field label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  font-weight: 600;
}

.name-field input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid #e0e0e0;
  outline: none;
  font-size: 14px;
  transition: border-color 0.15s;
}

.name-field input:focus {
  border-color: #1a73e8;
}

.right-container .buttons {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* ── In-call room ── */
.room {
  width: 100%;
  height: 100%;
  position: relative;
  background: #151520;
}

.main-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.main-video.hidden {
  display: none;
}

/* ── Remote placeholder ── */
.remote-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #151520;
}

.avatar-ring {
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-ring.empty {
  background: rgba(255, 255, 255, 0.03);
}

.avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #252a4a;
  color: #7b96e8;
  font-size: 2.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -1px;
  user-select: none;
}

.placeholder-name {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.05rem;
  font-weight: 500;
  margin: 0;
}

.placeholder-name.muted {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.88rem;
  font-weight: 400;
}

.connecting-dots {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 2px;
}

.connecting-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: dot-pulse 1.4s ease-in-out infinite;
}

.connecting-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.connecting-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot-pulse {

  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.3;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ── Remote name badge ── */
.remote-name-badge {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  z-index: 5;
  backdrop-filter: blur(4px);
}

/* ── PiP ── */
.pip-wrapper {
  position: absolute;
  bottom: 5rem;
  right: 1rem;
  width: 200px;
  height: 140px;
  background: #111;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  z-index: 5;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.pip-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pip-wrapper span {
  position: absolute;
  bottom: 7px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 7px;
  font-size: 10px;
  border-radius: 4px;
}

.pip-video.hidden {
  display: none;
}

.pip-avatar {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #252a4a;
  color: #7b96e8;
  font-size: 2rem;
  font-weight: 700;
}

/* ── Controls ── */
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
  background: rgba(255, 255, 255, 0.14);
  color: white;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
  backdrop-filter: blur(6px);
}

.controls button:hover {
  background: rgba(255, 255, 255, 0.24);
}

.controls button:active {
  transform: scale(0.93);
}

/* staging controls sit on top of the video preview */
.staging-controls {
  position: absolute !important;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: transparent !important;
}

.staging-controls button {
  background: rgba(0, 0, 0, 0.55) !important;
  backdrop-filter: blur(4px);
}

.btn-off {
  background: #ea4335 !important;
}

.btn-off:hover {
  background: #c5221f !important;
}

.btn-leave {
  background: #d93025 !important;
}

.btn-leave:hover {
  background: #b31412 !important;
}

.btn-active {
  background: #0d8f4c !important;
}

/* ── Shared buttons ── */
.btn-join {
  flex: 1;
  background: #1a73e8;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-join:hover {
  background: #1557b0;
}

.btn-cancel {
  flex: 1;
  background: transparent;
  border: 1.5px solid #ddd;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  color: #555;
  transition: border-color 0.15s, color 0.15s;
}

.btn-cancel:hover {
  border-color: #aaa;
  color: #333;
}

/* ── Responsive ── */
@media (max-width: 700px) {
  .staging {
    flex-direction: column;
  }

  .right-container {
    width: 100%;
  }

  .pip-wrapper {
    width: 130px;
    height: 90px;
  }
}
</style>