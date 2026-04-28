<script setup>
import { Icon } from '@iconify/vue';
import { onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWebRTC } from "@/app-phone/composables/useWebRTC";
import { RealDB } from '@/app-phone/composables/apiSignaling';
import { decryptPayload } from '@/@common/services/P2PCrypto';
import { useCallRecording } from '@/app-phone/composables/useCallRecording';
import { computed } from 'vue';

const {
  initP2PCall, createP2POffer, createP2PAnswer,
  setRemoteDescription, addRemoteCandidate,
  endP2PCall, toggleMic, toggleCamera, toggleScreenShare, screenShareOwner, activeScreenStream, localScreenStream, clearRemoteScreenShare,
  reattachMediaStreams, Mic, Camera, ScreenShare, isConnected, onRemoteCameraState, sendCameraState, connectionStatus, resetP2PWithMedia,
  remoteDisconnected, dataChannel, remoteStream, sendDataChannelMessage, onRemoteRecordingState, increaseBitrate, ScreenStream
} = useWebRTC();

const route = useRoute();
const router = useRouter();
const roomId = route.params.id;
const callStore = RealDB

const p2pRecording = useCallRecording({ mode: "p2p", recordingTrigger: "manual" });
const { isRecording, isUploading, recordingError, startRecording, stopAndUploadRecording, updateRemoteStream, updateScreenStream  } = p2pRecording;
const remoteIsRecording = ref(false);
const isScreenShareActive = computed(() => !!screenShareOwner.value);
const localScreenSharing = computed(() => screenShareOwner.value === 'local');
const remoteScreenSharing = computed(() => screenShareOwner.value === 'remote');
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
let currentCallId = null;
let currentCallParticipants = null;

function _attachRemoteStream() {
  if (!remoteStream.value) return;
  nextTick(() => {
    const el = document.getElementById("remote-video");
    if (el && el.srcObject !== remoteStream.value) {
      el.srcObject = remoteStream.value;
      el.play().catch(() => {});
    }
  });
}

function _getStreamsForRecording() {
  const localPip = document.getElementById("local-video-pip");
  const localAudio = document.getElementById("audio-local");
  const localSrc   =
    (localPip?.srcObject   instanceof MediaStream ? localPip.srcObject   : null) ||
    (localAudio?.srcObject instanceof MediaStream ? localAudio.srcObject : null);
  const remoteSrc  = remoteStream.value;
 
  return { localSrc, remoteSrc };
}

const toggleRecording = async () => {
  if (isRecording.value) {
    await stopAndUploadRecording();
  } else {
    const { localSrc, remoteSrc } = _getStreamsForRecording();
    const currentScreenStream = localScreenSharing.value
      ? (ScreenStream.value ?? null)
      : remoteScreenSharing.value ? remoteStream.value : null;
    await startRecording({
      localStream: localSrc,
      remoteStream: remoteSrc,
      screenStream: currentScreenStream,
      roomId,
      callId: currentCallId || currentSessionId || roomId,
      notifyPeerCallback: sendDataChannelMessage,
      screenShareOwner: screenShareOwner.value,
    });
  }
};

function _setupRemoteCameraCallback() {
  onRemoteCameraState((cameraOn, isScreen) => {
    if (isScreen) {remoteIsScreen.value = cameraOn;} else {remoteCameraOn.value = cameraOn;}
    nextTick(() => _attachRemoteStream());
  });
}
function _resolveCallId(roomData) {
  const hostId  = roomData?.host?.userId;
  const guestId = roomData?.guest?.userId;
  if (!hostId || !guestId) return;
  
  const pairKey = [hostId, guestId].sort().join("::");
  if (pairKey !== currentCallParticipants) {
    currentCallParticipants = pairKey;
    currentCallId = `${roomId}_${Date.now()}`;
    console.log(`[CallRoom] New call established — callId:${currentCallId} pair:${pairKey}`);
  }
}

const resetWebRTC = async () => {
  if (isRecording.value) await stopAndUploadRecording();
  const hadCamera = Camera.value;
  const hadMic = Mic.value;
  await resetP2PWithMedia(hadCamera, hadMic);
  remoteDescSet = false; lastAnsweredOfferSdp = null;
  _setupRemoteCameraCallback();
  onRemoteRecordingState((val) => { remoteIsRecording.value = val; });
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

const rejoinAsParticipant = async () => {
  await resetWebRTC();
  _setupRemoteCameraCallback();
  const joined = await callStore.createRoom(roomId, userName.value, userId, null);
  if (joined.waitingForNewSession) {
    currentSessionId = joined.sessionId;
    return;
  }
  currentSessionId = joined.sessionId;
  isHost.value = joined.host?.userId === userId;
  if (isHost.value) { await setupAsHost(); } else { await setupAsGuest(joined); }
};

const handleSessionEnded = async () => {
  if (isCreatingNewSession.value || isEndingCall.value) return;
  isCreatingNewSession.value = true;
  stopPolling();
  remoteName.value = "";
  remoteCameraOn.value = false;
  currentCallParticipants = null;
  remoteIsRecording.value = false;
  remoteIsScreen.value = false;
  clearRemoteScreenShare();
  try {
    const session = await callStore.createRoom(roomId, userName.value, userId, null);
    if (session.waitingForNewSession) {
      currentSessionId = session.sessionId;
      return;
    }
    currentSessionId = session.sessionId;
    isHost.value = session.host?.userId === userId;
    wasEverConnected.value = false;

    await resetWebRTC();
    _setupRemoteCameraCallback();

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
    _setupRemoteCameraCallback();
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

    if (hasJoined.value && roomData && roomData.sessionId !== currentSessionId) {
      const alreadyIn = roomData.host?.userId === userId || roomData.guest?.userId === userId;
      if (alreadyIn) {
        currentSessionId = roomData.sessionId;
        isHost.value = roomData.host?.userId === userId;
        remoteDescSet = false;
        lastAnsweredOfferSdp = null;
        wasEverConnected.value = false;
      } else if (roomData.status === "waiting" || (roomData.status === "active" && !roomData.guest?.userId)) {
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

    const roomIsReconnecting = roomData.status === 'reconnecting';
    const isNewOffer = roomData.offer?.sdp && roomData.offer.sdp !== lastAnsweredOfferSdp;
    if (!isHost.value && (isNewOffer || (roomIsReconnecting && !remoteDescSet))) {
      try {
        const sId = currentSessionId;
        await resetP2PWithMedia(Camera.value, Mic.value);
        _setupRemoteCameraCallback();
        onRemoteRecordingState((val) => { remoteIsRecording.value = val; });
        remoteDescSet = false;
        const answer = await createP2PAnswer(roomData.offer);
        if (currentSessionId !== sId) return;
        lastAnsweredOfferSdp = roomData.offer.sdp;
        remoteDescSet = true;
        await callStore.updateRoom(roomId, { answer: { type: 'answer', sdp: answer.sdp, candidates: answer.candidates }, status: 'active' });
      } catch (e) { console.error("[CallRoom:poll] Guest re-answer failed", { message: e.message }); }
    }

    const remotePeer = isHost.value ? roomData.guest : roomData.host;
    if (roomData.sessionId === currentSessionId) {
      if (remotePeer?.userId) {
        remoteName.value = remotePeer?.name || "";
      } else {
        remoteName.value = "";
      }
    }
    _resolveCallId(roomData);
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
    if (isRecording.value && remoteStream.value) {
      updateRemoteStream(remoteStream.value);
    }
    let attempts = 0;
    const trySend = setInterval(() => {
      const dcOpen = dataChannel.value?.readyState === "open";
      if (dcOpen) {
        if (ScreenShare.value) {sendCameraState(true, true);}
        sendCameraState(Camera.value, false);
        if (isRecording.value) {
          sendDataChannelMessage({ type: "recordingState", value: true });
        }
        clearInterval(trySend);
        return;
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
    setTimeout(() => { increaseBitrate(); }, 2000);
  } else if (wasEverConnected.value && !isEndingCall.value && !isCreatingNewSession.value) {
    remoteCameraOn.value = false; remoteIsRecording.value = false;
    startPolling(1000);
  }
});

watch(localScreenStream, async (stream) => {
  if (stream) {
    await nextTick();
    const el = document.getElementById("local-screen-video");
    if (el) { el.srcObject = stream; el.play().catch(() => {}); }
    if (remoteStream.value) {
      const remotePip = document.getElementById("remote-pip-video");
      if (remotePip) { remotePip.srcObject = remoteStream.value; remotePip.play().catch(() => {}); }
    }
  }
});

watch(isScreenShareActive, async (active, wasActive) => {
  if (active) {
    await nextTick();
    if (localScreenSharing.value) {
      const screenEl = document.getElementById("local-screen-video");
      if (screenEl && localScreenStream.value) {
        screenEl.srcObject = localScreenStream.value;
        screenEl.play().catch(() => {});
      }
      const remotePip = document.getElementById("remote-pip-video");
      if (remotePip && remoteStream.value) {
        remotePip.srcObject = remoteStream.value;
        remotePip.play().catch(() => {});
      }
    } else if (remoteScreenSharing.value) {
      _attachRemoteStream();
      await nextTick();
      reattachMediaStreams();
    }
 
  } else if (wasActive) {
    await nextTick();
    await nextTick();
    const localPip = document.getElementById("local-video-pip");
    if (localPip) {
      const pipSrc = localPip.srcObject;
      if (!pipSrc || pipSrc.getTracks().every(t => t.readyState !== "live")) {
        const stagingVid = document.getElementById("local-video");
        const src = stagingVid?.srcObject ?? null;
        if (src) {
          localPip.srcObject = src;
          localPip.play().catch(() => {});
        }
      }
    }
     const remoteVid = document.getElementById("remote-video");
    if (remoteVid && remoteStream.value) {
      if (remoteVid.srcObject !== remoteStream.value) {
        remoteVid.srcObject = remoteStream.value;
        remoteVid.play().catch(() => {});
      }
    }
    reattachMediaStreams();
  }
});
 
watch(screenShareOwner, async (owner) => {
  if (owner === 'remote') {
    await nextTick();
    await nextTick();
    _attachRemoteStream();
  }
});
watch(remoteIsScreen, async (val) => {
  if (val) {
    await nextTick();
    await nextTick();
    _attachRemoteStream();
  }
});

watch(connectionStatus, async (status) => {
  if ((status === 'failed' || status === 'error') && isHost.value && wasEverConnected.value) {
    stopPolling();
    if (isReconnecting) {
      console.warn("[CallRoom:connStatus] Reconnect already in progress, skipping");
      return;
    }
    isReconnecting = true;
    try {
      await resetP2PWithMedia(Camera.value, Mic.value);
      _setupRemoteCameraCallback();
      onRemoteRecordingState((val) => { remoteIsRecording.value = val; });
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
    } finally {
      isReconnecting = false;
      startPolling(800);
    }
  }
});

watch(remoteCameraOn, async (val) => {
  if (val) {
    await nextTick();
    if (isScreenShareActive.value && localScreenSharing.value && remoteStream.value) {
      const remotePip = document.getElementById("remote-pip-video");
      if (remotePip && remotePip.srcObject !== remoteStream.value) {
        remotePip.srcObject = remoteStream.value;
        remotePip.play().catch(() => {});
      }
    }
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
    remoteCameraOn.value = false; remoteIsRecording.value = false; remoteIsScreen.value = false; clearRemoteScreenShare();
  }
});

onMounted(async () => {
  await initP2PCall();
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('s');
  if (encoded) {
    const payload = await decryptPayload(encoded);
    if (payload) { userName.value = payload.role === 'agent' ? (payload.agentCode || '') : (payload.contactName || ''); }
  }
  if (userName.value) {
    await joinRoom();
  }
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

onUnmounted(async () => {
  stopPolling(); 
  if (isRecording.value) {
    await stopAndUploadRecording();
  }
  endP2PCall();
  if (hasJoined.value && !isEndingCall.value) {
    callStore.leaveRoom(roomId, userId);
  }
});

const handleLeave = async (updateDB = true) => {
  stopPolling();
  isEndingCall.value = true;
  if (isRecording.value) await stopAndUploadRecording();
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
    <div v-else class="room" :class="{ 'screen-share-layout': isScreenShareActive }">

      <template v-if="!isScreenShareActive">
        <video id="remote-video" autoplay playsinline class="main-video"
          :class="{ hidden: !isConnected || (!remoteCameraOn && !remoteIsScreen) }"
          :style="{ objectFit: remoteCameraOn && remoteIsScreen ? 'contain' : 'cover' }">
        </video>

        <div v-if="!isConnected || (!remoteCameraOn && !remoteIsScreen)" class="remote-placeholder">
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

        <!-- Remote name badge -->
        <div v-if="remoteName && !isCreatingNewSession" class="remote-name-badge">{{ remoteName }}</div>

        <!-- Local PiP -->
        <div class="pip-wrapper">
          <video id="local-video-pip" autoplay muted playsinline class="pip-video" :class="{ hidden: !Camera }"></video>
          <div v-if="!Camera" class="pip-avatar">
            {{ userName.charAt(0).toUpperCase() }}
          </div>
          <span>{{ userName }} (You)</span>
        </div>
      </template>

      <!-- SCREEN SHARE LAYOUT -->
      <template v-else>
        <!-- Main screen area -->
        <div class="screen-main">
          <video
            v-if="localScreenSharing"
            id="local-screen-video"
            autoplay muted playsinline
            class="screen-video">
          </video>
          <video
            v-else
            id="remote-video"
            autoplay playsinline
            class="screen-video"
            :class="{ hidden: !isConnected }">
          </video>

          <div v-if="remoteScreenSharing && !isConnected" class="screen-placeholder">
            <Icon icon="tabler:screen-share-off" width="48" color="rgba(255,255,255,0.2)" />
            <p>Screen share connecting...</p>
          </div>

          <div class="screen-owner-badge">
            <Icon icon="tabler:screen-share" width="14" />
            {{ localScreenSharing ? 'You are sharing' : (remoteName || 'Participant') + ' is sharing' }}
          </div>
        </div>

        <!-- ── Right PiP panel ── -->
        <div class="pip-panel">
          <!-- Remote participant pip card -->
          <div class="pip-card" v-if="localScreenSharing">
            <video id="remote-pip-video" autoplay playsinline class="pip-card-video"
              :class="{ hidden: !remoteCameraOn }">
            </video>
            <div v-if="!remoteCameraOn" class="pip-card-avatar">
              {{ (remoteName || '?').charAt(0).toUpperCase() }}
            </div>
            <span class="pip-card-name">{{ remoteName || 'Waiting...' }}</span>
          </div>

          <!-- Local self pip card -->
          <div class="pip-card">
            <video id="local-video-pip" autoplay muted playsinline class="pip-card-video"
              :class="{ hidden: !Camera }">
            </video>
            <div v-if="!Camera" class="pip-card-avatar">
              {{ userName.charAt(0).toUpperCase() }}
            </div>
            <span class="pip-card-name">{{ userName }} (You)</span>
          </div>
        </div>
        <div v-if="remoteName && !isCreatingNewSession" class="remote-name-badge">{{ remoteName }}</div>
      </template>

      <!--SHARED OVERLAYS-->
      <div v-if="isConnected && (isRecording || remoteIsRecording)" class="recording-badge">
        <span class="rec-dot"></span>
        <span v-if="isRecording">Recording</span>
        <span v-else>{{ remoteName || 'Other participant' }} is recording</span>
        <span v-if="isUploading" class="uploading-dot" title="Uploading…">↑</span>
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
        <button v-if="isConnected" @click="toggleRecording" :class="{ 'btn-recording': isRecording }"
          :title="isRecording ? 'Stop Recording' : 'Start Recording'">
          <Icon :icon="isRecording ? 'tabler:player-stop-filled' : 'tabler:player-record'" />
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

.connecting-dots span:nth-child(2) { animation-delay: 0.2s; }
.connecting-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
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

.recording-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(217, 48, 37, 0.88);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(6px);
  z-index: 10;
  box-shadow: 0 2px 12px rgba(217, 48, 37, 0.4);
}

.rec-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  flex-shrink: 0;
  animation: rec-pulse 1.2s ease-in-out infinite;
}

@keyframes rec-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}

.uploading-dot {
  font-size: 0.75rem;
  opacity: 0.8;
  animation: dot-pulse 1s ease-in-out infinite;
}

/* ── PiP (normal layout) ── */
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

.pip-video.hidden { display: none; }

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

.controls button:hover { background: rgba(255, 255, 255, 0.24); }
.controls button:active { transform: scale(0.93); }

.resume-overlay {
  position: absolute;
  top: -60px;
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

.btn-resume:hover { background: #f89b00 !important; }

/* ── Screen share layout ── */
.screen-share-layout {
  display: flex;
}

.screen-main {
  flex: 1;
  position: relative;
  background: #0d0d14;
  overflow: hidden;
  height: 100%;
}

.screen-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.screen-video.hidden { display: none; }

.screen-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
}

.screen-owner-badge {
  position: absolute;
  bottom: 80px;
  left: 16px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(4px);
  z-index: 5;
}

/* ── PiP panel (screen share mode) ── */
.pip-panel {
  width: 180px;
  flex-shrink: 0;
  background: #0a0a12;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  z-index: 5;
  padding-bottom: 90px;
  overflow-y: auto;
}

.pip-card {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  border: 1.5px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.pip-card-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pip-card-video.hidden { display: none; }

.pip-card-avatar {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #252a4a;
  color: #7b96e8;
  font-size: 1.6rem;
  font-weight: 700;
}

.pip-card-name {
  position: absolute;
  bottom: 5px;
  left: 6px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 1px 6px;
  font-size: 9px;
  border-radius: 3px;
  max-width: calc(100% - 12px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Reconnecting overlay ── */
.reconnecting-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 20;
  color: white;
}

.reconnecting-overlay p {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.reconnecting-overlay span {
  font-size: 0.85rem;
  opacity: 0.6;
}

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

.btn-off:hover { background: #c5221f !important; }

.btn-leave {
  background: #d93025 !important;
}

.btn-leave:hover { 
  background: #b31412 !important;
}

.btn-active {
  background: #0d8f4c !important;
}

.btn-recording {
  background: #d93025 !important;
  animation: pulse-red 1.5s ease-in-out infinite;
}

.btn-recording:hover { background: #b31412 !important; }

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(217, 48, 37, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(217, 48, 37, 0); }
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

.btn-join:hover { background: #1557b0; }

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
  .staging { flex-direction: column; }
  .right-container { width: 100%; }

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

  .screen-share-layout {
    flex-direction: column;
  }

  .pip-panel {
    width: 100%;
    height: 100px;
    flex-direction: row;
    padding: 6px;
    padding-bottom: 6px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .pip-card {
    width: 140px;
    aspect-ratio: 16/9;
    flex-shrink: 0;
  }
}
</style>