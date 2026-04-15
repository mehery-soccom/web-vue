<script setup>
import { Icon } from '@iconify/vue';
import { onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebRTC } from "@/app-phone/composables/useWebRTC";
import { RealDB } from '@/app-phone/composables/apiSignaling';

const {
  initP2PCall, createP2POffer, createP2PAnswer,
  setRemoteDescription, addRemoteCandidate,
  endP2PCall, toggleMic, toggleCamera, toggleScreenShare,
  reattachMediaStreams, Mic, Camera, ScreenShare, isConnected, onRemoteCameraState, sendCameraState, connectionStatus, resetP2PWithMedia,
  remoteDisconnected, dataChannel, remoteStream
} = useWebRTC();

const route = useRoute();
const router = useRouter();
const roomId = route.params.id;
const callStore = RealDB

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
const isScreenSharePending = ref(false);
let isReconnecting = false;
const remoteIsScreen = ref(false);

let pollingInterval = null;
let pollRate = 1500;
const wasEverConnected = ref(false);
let lastAnsweredOfferSdp = null;
let currentSessionId = null;
const isCreatingNewSession = ref(false);
let remoteDescSet = false;

const resetWebRTC = async () => {
  const hadCamera = Camera.value;
  const hadMic = Mic.value;
  const hadScreen = ScreenShare.value;
  await resetP2PWithMedia(hadCamera, hadMic);
  remoteDescSet = false;lastAnsweredOfferSdp = null;
  if (hadScreen) isScreenSharePending.value = true;
  onRemoteCameraState((val) => { remoteCameraOn.value = val; });
};

const stopPolling = () => { if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; } };

const setupAsHost = async () => {
  const sId = currentSessionId;
  const offer = await createP2POffer(roomId);
  if (currentSessionId !== sId) return;
  await callStore.updateRoom(roomId, { offer: { type: 'offer', sdp: offer.sdp, candidates: offer.candidates }, status: 'waiting', answer: null, guestCandidates: [] });
  statusMessage.value = "Waiting for participant...";
};

const setupAsGuest = async (initialSession) => {
  const sId = currentSessionId;
  let roomData = initialSession?.offer?.sdp ? initialSession : null;
  let attempts = 0;
  while (!roomData?.offer?.sdp && attempts < 40) {
    if (currentSessionId !== sId) return;
    statusMessage.value = "Waiting for host...";
    await new Promise(r => setTimeout(r, 300));
    roomData = await callStore.getRoom(roomId, userId);
    attempts++;
  }
  if (currentSessionId !== sId || !roomData?.offer?.sdp) throw new Error("Host offer unavailable.");
  const answer = await createP2PAnswer(roomData.offer);
  if (currentSessionId !== sId) return;
  lastAnsweredOfferSdp = roomData.offer.sdp;
  await callStore.updateRoom(roomId, {
    answer: { type: 'answer', sdp: answer.sdp, candidates: answer.candidates },
    status: 'active'
  });
  statusMessage.value = "Connecting...";
};

// if 2 peers try joinng and same time then guest peer and refreshing
const rejoinAsParticipant = async () => {
  await resetWebRTC();
  onRemoteCameraState((val) => { remoteCameraOn.value = val; });
  const joined = await callStore.createRoom(roomId, userName.value, userId, null);
  if (joined.waitingForNewSession) {
    currentSessionId = joined.sessionId;
    return;
  }
  currentSessionId = joined.sessionId;
  isHost.value = joined.host?.userId === userId;
  if (isHost.value) { await setupAsHost(); } else { await setupAsGuest(joined); }
};

// on refresh rejoin as host
const handleSessionEnded = async () => {
  if (isCreatingNewSession.value || isEndingCall.value) return;
  isCreatingNewSession.value = true;
  stopPolling();
  remoteName.value = "";
  remoteCameraOn.value = false;
  try {
    const session = await callStore.createRoom(roomId, userName.value, userId, null);
    if (session.waitingForNewSession) {
      // another peer already created new session, wait for polling to detect it
      currentSessionId = session.sessionId;
      return;
    }

    currentSessionId = session.sessionId;
    isHost.value = session.host?.userId === userId;
    wasEverConnected.value = false;

    await resetWebRTC();
    onRemoteCameraState((val) => { remoteCameraOn.value = val; });

    if (isHost.value) {
      await setupAsHost();
    } else {
      await setupAsGuest(session);
    }
  } catch (e) {
    statusMessage.value = "Error. Please refresh.";
  } finally {
    isCreatingNewSession.value = false;
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
    const stagingCameraOn = Camera.value;
    const stagingMicOn = Mic.value;
    const session = await callStore.createRoom(roomId, userName.value, userId, prevId);
    if (session.waitingForNewSession) {
      currentSessionId = session.sessionId;
      isJoining.value = false;
      startPolling(800);
      return;
    }
    currentSessionId = session.sessionId;
    isHost.value = session.host?.userId === userId;
    await resetWebRTC();
    onRemoteCameraState((val) => { remoteCameraOn.value = val; });
    if (isHost.value) { await setupAsHost(); } else { await setupAsGuest(session); }
    if (stagingCameraOn) {
      Camera.value = false; 
      await toggleCamera();
    }
    if (stagingMicOn) {
      Mic.value = false;
      await toggleMic();
    }
  } catch (error) {
    hasJoined.value = false; isJoining.value = false;
    const msg = error.message || "";
    if (msg.includes("ROOM_FULL")) roomFullMessage.value = "This room is full.";
    else statusMessage.value = "Failed to connect. Please try again.";
    return;
  }
  isJoining.value = false;
  startPolling(800);
};

const startPolling = (rate = 1500) => {
  stopPolling();
  pollRate = rate;
  pollingInterval = setInterval(async () => {
    if (isEndingCall.value || isJoining.value || isCreatingNewSession.value) return;
    const roomData = await callStore.getRoom(roomId, userId);

    if (hasJoined.value && (!roomData || (roomData.sessionId === currentSessionId && roomData.status === "ended"))) {
      if (!roomData && isHost.value && !wasEverConnected.value) {
        await handleLeave(false);
        return;
      }
      await handleSessionEnded();
      return;
    }

    //detect new session after refresh
    if (hasJoined.value && roomData && roomData.sessionId !== currentSessionId) {
      const alreadyIn = roomData.host?.userId === userId || roomData.guest?.userId === userId;
      if (alreadyIn) {
        // We're already registered in the new session (e.g. fast page-refresh flow)
        currentSessionId = roomData.sessionId;
        isHost.value = roomData.host?.userId === userId;
        remoteDescSet = false;
        lastAnsweredOfferSdp = null;
        wasEverConnected.value = false;
      } else if (roomData.status === "waiting" || (roomData.status === "active" && !roomData.guest?.userId)) {
        // New session with open guest slot
        if (isJoining.value || isCreatingNewSession.value) return;
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
    if (!roomData || roomData.sessionId !== currentSessionId) {
      await handleSessionEnded();
      return;
    }

    // apply answer (host side)
    if (isHost.value && roomData.answer?.sdp) {
      if (!remoteDescSet) {
          try {
              await setRemoteDescription(roomData.answer);
              remoteDescSet = true;
              if (roomData.status === 'reconnecting') {
                await callStore.updateRoom(roomId, { status: 'active' });
            }
          } catch (e) { 
              if (!e.message?.includes('not initialized')) console.error("[POLL/HOST]", e); 
          }
      }

      if (remoteDescSet && roomData.answer.candidates?.length) {
        roomData.answer.candidates.forEach(c => addRemoteCandidate(c));
      }
    }    

    // re-answer on new offer (guest side)
    const roomIsReconnecting = roomData.status === 'reconnecting';
    const isNewOffer = roomData.offer?.sdp && roomData.offer.sdp !== lastAnsweredOfferSdp;
    if (!isHost.value && (isNewOffer || (roomIsReconnecting && !remoteDescSet))) {
      try {
        const sId = currentSessionId;
        await resetP2PWithMedia(Camera.value, Mic.value);
        onRemoteCameraState((val) => { remoteCameraOn.value = val; });
        remoteDescSet = false;
        const answer = await createP2PAnswer(roomData.offer);
        if (currentSessionId !== sId) return;
        lastAnsweredOfferSdp = roomData.offer.sdp;
        remoteDescSet = true;
        await callStore.updateRoom(roomId, { answer: { type: 'answer', sdp: answer.sdp, candidates: answer.candidates }, status: 'active' });
      } catch (e) { console.error("[CallRoom:poll] Guest re-answer failed", { message: e.message }); }
    }

    // Name sync
    const remotePeer = isHost.value ? roomData.guest : roomData.host;
    if (roomData.sessionId === currentSessionId) {
      if (remotePeer?.userId) {
        remoteName.value = remotePeer?.name || "";
      } else {
        remoteName.value = "";
      }
    }
    const target = !isConnected.value && roomData.guest?.userId ? 500 : isConnected.value ? 4000 : 1500;
    if (target !== pollRate) startPolling(target);
  }, pollRate);
};
const resumeScreenShare = async () => {
  try {
    await toggleScreenShare();
    isScreenSharePending.value = false;
  } catch (error) {
    console.error("Manual resume failed:", error);
  }
};

watch(isConnected, async (connected) => {
  if (connected) {
    wasEverConnected.value = true;
    stopPolling();
    startPolling(10000);
    const roomData = await callStore.getRoom(roomId, userId);
    if (roomData?.sessionId === currentSessionId) {
      const remotePeer = isHost.value ? roomData.guest : roomData.host;
      remoteName.value = remotePeer?.name || "";
    }
    await nextTick();
    setTimeout(() => reattachMediaStreams(), 800);
    let attempts = 0;
    const trySend = setInterval(() => {
      const dcState = dataChannel.value?.readyState ?? "null";
    const dcOpen = dataChannel.value?.readyState === "open";
    if (dcOpen) {
      sendCameraState(Camera.value);
      if (ScreenShare.value) sendCameraState(true);
      clearInterval(trySend);
      return
    }

    attempts++;

    if (attempts >= 10) {
      reattachMediaStreams();
      if (remoteStream.value?.getVideoTracks().length) {
        remoteCameraOn.value = true;
      }
      clearInterval(trySend);
      return; 
    }
  }, 500);
  } else if (wasEverConnected.value && !isEndingCall.value && !isCreatingNewSession.value) {
    remoteCameraOn.value = false;
    startPolling(1000);
  }
});

watch(connectionStatus, async (status) => {
  if ((status === 'failed' || status === 'error') && isHost.value && wasEverConnected.value) {
    stopPolling();
      if (isReconnecting){console.warn("[CallRoom:connStatus] Reconnect already in progress, skipping");
      return
    } 
    isReconnecting = true;
    try{

    await resetP2PWithMedia(Camera.value, Mic.value);
    onRemoteCameraState((val) => { remoteCameraOn.value = val; remoteIsScreen.value = isScreen ?? false;});
    remoteDescSet = false;
    let offer;
    try {
      offer = await createP2POffer(roomId);
    } catch (e) {
      await resetP2PWithMedia(Camera.value, Mic.value);
      offer = await createP2POffer(roomId);
    }
    await callStore.updateRoom(roomId, {
      offer: { type: 'offer', sdp: offer.sdp, candidates: offer.candidates },
      answer: null, 
      status: 'reconnecting' 
    });
  }
  finally{
    isReconnecting = false;
    startPolling(800);
  }}
});

watch(remoteCameraOn, async (val) => {
  if (val) {
    await nextTick();
    reattachMediaStreams();
    if (remoteStream.value) {
      const dead = remoteStream.value.getTracks().every(t => t.readyState !== "live");
    
      if (dead) {
        await resetP2PWithMedia(Camera.value, Mic.value);
      }
    }
  }
});

watch(userName, v => {
  localStorage.setItem('p2p_username', v);
  if (v.trim()) nameError.value = "";
});
watch(remoteDisconnected, (dropped) => {
  if (dropped) {
    remoteCameraOn.value = false;
  }
});
onMounted(async () => {
  await initP2PCall();
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('p2p_prevUserId', userId);
    if (hasJoined.value && !isEndingCall.value) {
      navigator.sendBeacon(
        `${window.CONST?.API_CONTEXT || ""}/p2p/room/${roomId}/leave`,
        new Blob([JSON.stringify({ userId })], { type: 'application/json' })
      );
    }
  });
});

onUnmounted(() => {
  stopPolling(); endP2PCall();
  if (hasJoined.value && !isEndingCall.value) {
    callStore.leaveRoom(roomId, userId);
  }
});

const handleLeave = async (updateDB = true) => {
  stopPolling();
  isEndingCall.value = true;
  if (updateDB) await callStore.leaveRoom(roomId, userId);
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
        :class="{ hidden: !isConnected || !remoteCameraOn }" :style="{ objectFit: remoteCameraOn && remoteIsScreen ? 'contain' : 'cover' }"></video>

      <!-- remote peer not connected -->
      <div v-if="!isConnected || !remoteCameraOn" class="remote-placeholder">
        <template v-if="remoteName && !isCreatingNewSession">
          <div class="avatar-ring">
            <div class="avatar">{{ remoteName.charAt(0).toUpperCase() }}</div>
          </div>
          <p class="placeholder-name">{{ remoteName }}</p>
          <div v-if="remoteDisconnected && !isConnected" class="reconnecting-badge">
            <span class="buffer-dot"></span>
            <span class="buffer-dot"></span>
            <span class="buffer-dot"></span>
            <span style="margin-left:6px; font-size:0.78rem; opacity:0.6">Connection lost…</span>
          </div>
          <div v-else-if="!isConnected" class="connecting-dots">
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
      <div v-if="remoteName && !isCreatingNewSession" class="remote-name-badge">{{ remoteName }}</div>

      <!-- Local  -->
      <div class="pip-wrapper">
        <video id="local-video-pip" autoplay muted playsinline class="pip-video" :class="{ hidden: !Camera }"></video>
        <div v-if="!Camera" class="pip-avatar">
          {{ userName.charAt(0).toUpperCase() }}
        </div>
        <span>{{ userName }} (You)</span>
      </div>

      <div v-if="wasEverConnected && !isConnected" class="reconnecting-overlay">
        <div class="wifi-loader">
          <Icon icon="tabler:wifi-off" width="40" />
        </div>
        <p>Reconnecting...</p>
        <span>Trying to restore your connection</span>
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
        <div v-if="isScreenSharePending" class="resume-overlay">
          <button @click="resumeScreenShare" class="btn-resume">
            <Icon icon="tabler:screen-share" />
            Resume Screen Share
          </button>
        </div>
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
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #e9edf3;
  overflow: hidden;
  position: fixed;
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

.name-field {
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

.reconnecting-badge {
  display: flex;
  align-items: center;
  background: rgba(249, 171, 0, 0.15);
  border: 1px solid rgba(249, 171, 0, 0.3);
  border-radius: 20px;
  padding: 5px 12px;
  margin-top: 4px;
}

.buffer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f9ab00;
  margin: 0 2px;
  animation: dot-pulse 1.4s ease-in-out infinite;
}

.buffer-dot:nth-child(2) { animation-delay: 0.2s; }
.buffer-dot:nth-child(3) { animation-delay: 0.4s; }
/* ── Controls ── */
.controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 999;
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
.resume-overlay {
  position: absolute;
  top: -60px; /* Position it above the control bar */
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: max-content;
}
.btn-resume {
  background: #f9ab00 !important;
  color: #202124 !important;
  border-radius: 24px !important;
  padding: 8px 16px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto !important;
  height: auto !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.btn-resume:hover {
  background: #f89b00 !important;
}
/*.btn-recording {
  background: #d93025 !important;
  animation: pulse-red 1.5s ease-in-out infinite;
}

@keyframes pulse-red {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(217, 48, 37, 0.4);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(217, 48, 37, 0);
  }
}*/

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
    bottom: 100px;
  }
   .controls {
    bottom: 30px;
    gap: 10px;
    width: 90%;
    justify-content: center;
  }

  .controls button {
    width: 42px;
    height: 42px;
    font-size: 18px;
  }
}
</style>