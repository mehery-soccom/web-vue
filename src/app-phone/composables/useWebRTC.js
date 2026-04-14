// composables/useWebRTC.js
import { ref, reactive, onUnmounted, nextTick } from "vue";
import { toast } from "vue3-toastify";
import { usePhoneStore } from "../views/usePhoneStore";

export function useWebRTC() {
  const PhoneStore = usePhoneStore();
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionStatus = ref("disconnected"); // 'disconnected', 'connecting', 'connected', 'error'
  const errorMessage = ref("");
  const callDuration = ref("00:00");
  const callData = ref({});
  const agentCode = ref("");
  const receivedAnswer = ref({});
  const receivedSdpAnswer = ref(null);
  let pc = null;
  let localStream = null;
  let dataChannel = null;
  const onCameraStateCallback = ref(null);
  let cameraToggleLock = false;

  //Calling Variables
  const remoteStream = ref(null);
  let channelId = ref("");

  const Mic = ref(false);
  const Camera = ref(false);
  const ScreenShare = ref(false);
  let ScreenStream = null;
  const callMode = ref("meta"); // 'meta' 'p2p'
  const remoteDisconnected = ref(false);
  let p2pRoomId = null;

  // ICE servers configuration
  const iceServers = ref([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun.l.google.com:3478" },
    { urls: "stun:stun.counterpath.net:3478" },
    { urls: "stun:numb.viagenie.ca:3478" },
    // Will add TURN servers if needed
  ]);

  const activeCall = ref({
    show: false,
    remoteNumber: "",
    startTime: null,
  });

  const incomingCall = ref({
    show: false,
    remoteNumber: "",
    timestamp: null,
  });

  const callHistory = ref([]);
  const callState = ref("idle"); // 'idle', 'calling', 'ringing', 'talking', 'ended'
  const callTimer = ref(null);
  const currentPeerNumber = ref("");
  const gatheredCandidates = ref([]);

  // Post message utility
  const sendPostMessage = (event_type, data) => {
    const phoneEvent = JSON.stringify({ event: event_type, event_data: data });
    window.parent.postMessage(phoneEvent, "*");
  };

  const addToCallHistory = (remoteNumber, status, timestamp) => {
    callHistory.value.unshift({
      id: Date.now(),
      remoteNumber,
      status,
      timestamp,
    });

    if (callHistory.value.length > 10) {
      callHistory.value = callHistory.value.slice(0, 10);
    }
  };

  const updateCallHistory = (newStatus) => {
    if (callHistory.value.length > 0) {
      callHistory.value[0].status = newStatus;
    }
  };

  // Audio control functions
  const playRingtone = () => {
    const ringtone = document.getElementById("ringtone");
    if (ringtone) {
      ringtone.currentTime = 0;
      ringtone.play().catch(console.error);
    }
  };

  const stopRingtone = () => {
    const ringtone = document.getElementById("ringtone");
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
  };

  const playRingbacktone = () => {
    const ringbacktone = document.getElementById("ringbacktone");
    if (ringbacktone) {
      ringbacktone.currentTime = 0;
      ringbacktone.play().catch(console.error);
    }
  };

  const stopRingbacktone = () => {
    const ringbacktone = document.getElementById("ringbacktone");
    if (ringbacktone) {
      ringbacktone.pause();
      ringbacktone.currentTime = 0;
    }
  };

  const setupRemoteAudio = (stream) => {
    const remoteAudio = document.getElementById("audio-remote");
    if (remoteAudio && stream) {
      remoteAudio.srcObject = stream;
    }
  };

  const setupLocalAudio = (stream) => {
    const localAudio = document.getElementById("audio-local");
    if (localAudio && stream) {
      localAudio.srcObject = stream;
    }
  };

  const setupLocalVideo = (stream) => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
      localVideo.muted = true;
    }

    // Room Video
    const localVideoPip = document.getElementById("local-video-pip");
    if (localVideoPip) {
      localVideoPip.srcObject = stream;
      localVideoPip.muted = true;
    }
  };

  // Timer functions
  const startCallTimer = () => {
    callTimer.value = setInterval(() => {
      if (activeCall.value.startTime) {
        const duration = Math.floor(
          (new Date() - activeCall.value.startTime) / 1000,
        );
        const minutes = Math.floor(duration / 60)
          .toString()
          .padStart(2, "0");
        const seconds = (duration % 60).toString().padStart(2, "0");
        callDuration.value = `${minutes}:${seconds}`;
      }
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimer.value) {
      clearInterval(callTimer.value);
      callTimer.value = null;
    }
  };

  const initWebRTC = async () => {
    try {
      isConnecting.value = true;
      connectionStatus.value = "connecting";
      errorMessage.value = "";

      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setupLocalAudio(localStream);

      pc = new RTCPeerConnection({
        iceServers: iceServers.value,
        iceTransportPolicy: "all",
      });

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      setupRTCEventListeners();
      isConnecting.value = false;
      if (callMode.value !== "p2p") {
        connectionStatus.value = "connected";
      }
      console.log("WebRTC initialized successfully");
    } catch (error) {
      console.error("WebRTC initialization failed:", error);
      errorMessage.value = error.message;
      connectionStatus.value = "error";
      isConnecting.value = false;
    }
  };

  const setupRTCEventListeners = () => {
    if (!pc) return;

    pc.ontrack = async (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;

      setupRemoteAudio(stream);

      if (callMode.value === "p2p") {
        console.log("[ontrack] Remote stream received, tracks:", stream.getTracks().map(t => `${t.kind}(${t.readyState})`).join(", "));
        stream.getTracks().forEach(track => {
        track.onended = () => {
          console.warn("[Remote Track Ended]", track.kind);
        };
      });
        remoteStream.value = stream;
        let attempts = 0;
        const attach = () => {
          const remoteVideo = document.getElementById("remote-video");
          if (remoteVideo) {
            if (remoteVideo.srcObject !== stream) {remoteVideo.srcObject = stream;}
            remoteVideo.muted = false;
            console.log("[ontrack] Remote video attached on attempt", attempts + 1);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(attach, 150);
        } else {
          console.warn("[ontrack] Remote video element never appeared");
        }
      };
      await nextTick();
      attach();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        gatheredCandidates.value.push(event.candidate.toJSON());
      } else {
        console.log("ICE gathering complete");
        updateLocalSDPData();
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      switch (pc.connectionState) {
        case "connected":
          remoteDisconnected.value = false;
          isConnected.value = true;
          connectionStatus.value = "connected";
          callState.value = "talking";
          activeCall.value.startTime = new Date();
          startCallTimer();
          stopRingbacktone();
          stopRingtone();
          if (callMode.value === "p2p") {
            const trySendState = (attempts = 0) => {
              if (dataChannel?.readyState === "open") {
                console.log("[reconnect] DataChannel open, re-sending camera state");
                sendCameraState(Camera.value);
                if (ScreenShare.value) sendCameraState(true);
              } else if (attempts < 20) {
                setTimeout(() => trySendState(attempts + 1), 300);
              } else {
                console.warn("[reconnect] DataChannel never re-opened after reconnect");
              }
            };
            setTimeout(() => trySendState(), 500);
            setTimeout(() => {
              if (remoteStream.value) {
                const dead = remoteStream.value.getTracks().every(t => t.readyState !== "live");
                if (dead) {
                  console.warn("[connected but no media] forcing reset");
                  connectionStatus.value = "error";
                }
              }
            }, 2000);
          }
          break;
        case "disconnected":
          const remoteVideo = document.getElementById("remote-video");
          if (remoteVideo) {
            remoteVideo.srcObject = null;
          }
          remoteStream.value = null;
          break;
        case "failed":
          connectionStatus.value = "error";
          isConnected.value = false;
          if (callMode.value === "p2p") {
            console.log("[connectionState] Attempting ICE restart");
            remoteDisconnected.value = true;
        } else {
          isConnected.value = false;
          connectionStatus.value = "error";
          endCall(false);
        }
          break;
        case "closed":
          isConnected.value = false;
          connectionStatus.value = "disconnected";
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    pc.ondatachannel = (event) => {
      console.log("[ondatachannel] DataChannel received (guest side)");
      dataChannel = event.channel;
      dataChannel.onopen = () => {
        if (callMode.value === "p2p") {sendCameraState(Camera.value);}
      };
      setupDataChannel(dataChannel);
    };
  };

  /**
   * Create SDP offer for outgoing call
   */
  const createOfferr = async (remoteNumber = "") => {
    if (!pc) {
      await initWebRTC();
    }

    try {
      callState.value = "calling";
      currentPeerNumber.value = remoteNumber;

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callMode.value === "p2p",
      });

      await pc.setLocalDescription(offer);
      callData.value.sdp_type = "offer";
      callData.value.sdp = offer.sdp;

      activeCall.value = {
        show: true,
        remoteNumber: remoteNumber,
        startTime: null,
      };

      addToCallHistory(remoteNumber, "outgoing", new Date());
      playRingbacktone();

      console.log("SDP Offer created, waiting for answer...");
      if (channelId.value) {
        await sendOffer(
          callData.value,
          channelId.value,
          currentPeerNumber.value
        );
      }
      // Return the local description for sending to Meta API
      return getLocalSDPData();
    } catch (error) {
      console.error("Failed to create offer:", error);
      errorMessage.value = error.message;
      callState.value = "idle";
      throw error;
    }
  };

  const askIfPermissionPresent = async (num, channelId) => {
    try {
      const payload = { contact: { phone: num }, channelId: channelId };
      const response = await PhoneStore.askPermissionToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error sending answer to Meta API:",
        error.response?.data || error.message
      );
      throw error;
    }
  };
  const sendOffer = async (callDat, channelId, phone) => {
    try {
      const payload = {
        contact: { phone: phone },
        channelId: channelId,
        session: callDat,
        agent: agentCode.value,
      };
      const response = await PhoneStore.sendOfferToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error sending answer to Meta API:",
        error.response?.data || error.message
      );
      throw error;
    }
  };

  const sendAnswer = async (answerData, callDatas, channelId) => {
    try {
      // const url = `https://crforex.mehery.xyz/admin/api/scriptus/phone/whatsapp/calling/accept`;
      const payload = {
        callData: callData.value,
        channelId: channelId,
        sdpAnswer: answerData.sdp,
      };

      const response = await PhoneStore.sendAnswerToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error sending answer to Meta API:",
        error.response?.data || error.message
      );
      throw error;
    }
  };
  const rejectCallMeta = async (channelId) => {
    try {
      const payload = { callData: callData.value, channelId: channelId };
      const response = await PhoneStore.rejectSendToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error sending answer to Meta API:",
        error.response?.data || error.message
      );
      throw error;
    }
  };
  const terminateCallMeta = async (channelId) => {
    try {
      const payload = { callData: callData.value, channelId: channelId };
      const response = await PhoneStore.terminateCallToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error sending answer to Meta API:",
        error.response?.data || error.message
      );
      throw error;
    }
  };

  const createAnswer = async (offerSDP) => {
    if (!pc) {
      await initWebRTC();
    }

    try {
      callState.value = "ringing";

      // Set remote offer
      const remoteDesc = {
        type: offerSDP.sdp_type || offerSDP.type || "offer",
        sdp: offerSDP.sdp,
      };
      await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      incomingCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        timestamp: new Date(),
      };

      addToCallHistory(currentPeerNumber.value, "incoming", new Date());

      console.log("SDP Answer created", answer);

      if (channelId.value) {
        await sendAnswer(answer, callData.value, channelId.value);
      }
      // Return the local description for sending to Meta API
      return getLocalSDPData();
    } catch (error) {
      console.error("Failed to create answer:", error);
      errorMessage.value = error.message;
      callState.value = "idle";
      throw error;
    }
  };

  const setRemoteDescription = async (remoteSDPData) => {
    if (!pc) {
      throw new Error("WebRTC not initialized");
    }

    if (pc.signalingState === "stable") {
      console.warn("Remote answer already applied, skipping");
      return;
    }

    const sdpData = remoteSDPData?.value ?? remoteSDPData;
    if (!sdpData?.sdp) {
      console.warn("No SDP found in remote description", sdpData);
      return;
    }
    try {
      const remoteDesc = {
        type: sdpData.sdp_type || "answer",
        sdp: sdpData.sdp,
      };
      await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));
      // if (remoteSDPData.ice && Array.isArray(remoteSDPData.ice)) {
      //   for (const candidate of remoteSDPData.ice) {
      //     await pc.addIceCandidate(new RTCIceCandidate(candidate));
      //   }
      // }
      console.log(
        "Remote description set successfully",
        remoteSDPData,
        sdpData,
        remoteDesc
      );
      activeCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        startTime: null,
      };
      console.log("answered call");
      stopRingbacktone();
      updateCallHistory("answered");
    } catch (error) {
      console.error("Failed to set remote description:", error);
      throw error;
    }
  };

  const getLocalSDPData = () => {
    if (!pc || !pc.localDescription) {
      return null;
    }

    return {
      sdp: pc.localDescription.toJSON(),
      ice: gatheredCandidates.value,
    };
  };

  const updateLocalSDPData = () => {
    const localData = getLocalSDPData();
    if (localData) {
      sendPostMessage("local-sdp-data", localData);
    }
  };

  const handleIncomingCall = (
    offerSDP,
    remoteNumber = "",
    fullOffer,
    channel_id
  ) => {
    channelId.value = channel_id;
    currentPeerNumber.value = remoteNumber;
    incomingCall.value = {
      show: true,
      remoteNumber: remoteNumber,
      timestamp: new Date(),
    };
    callState.value = "ringing";
    playRingtone();
    console.log("handle got called", offerSDP);
    callData.value = fullOffer;
    incomingCall.value.pendingOffer = offerSDP;
  };

  const answerCall = async () => {
    if (!incomingCall.value.show || !incomingCall.value.pendingOffer) {
      throw new Error("No incoming call to answer");
    }

    try {
      console.log("before assign", JSON.parse(JSON.stringify(callData.value)));
      // callData.value = event_data;
      const answerSDP = await createAnswer(
        incomingCall.value.pendingOffer || callData.value.session
      );
      incomingCall.value.show = false;
      activeCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        startTime: null,
      };
      console.log("answered call", answerSDP);
      stopRingtone();
      updateCallHistory("answered");

      return answerSDP;
    } catch (error) {
      console.error("Failed to answer call:", error);
      throw error;
    }
  };

  const rejectCall = async () => {
    if (!incomingCall.value.show) {
      throw new Error("No incoming call to reject");
    }
    await rejectCallMeta(channelId.value);
    incomingCall.value = {
      show: false,
      remoteNumber: "",
      timestamp: null,
      pendingOffer: null,
    };
    callState.value = "idle";
    stopRingtone();
    updateCallHistory("rejected");
    channelId.value = "";
    // callData.value = {};

    sendPostMessage("call-rejected", {
      remoteNumber: currentPeerNumber.value,
      timestamp: new Date(),
    });
  };

  const endCall = async (endFromAgent) => {
    if (pc) {
      pc.close();
      pc = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }

    activeCall.value = {
      show: false,
      remoteNumber: "",
      startTime: null,
    };

    incomingCall.value = {
      show: false,
      remoteNumber: "",
      timestamp: null,
      pendingOffer: null,
    };

    callState.value = "idle";
    currentPeerNumber.value = "";
    gatheredCandidates.value = [];

    stopCallTimer();
    stopRingtone();
    stopRingbacktone();
    if (endFromAgent) await terminateCallMeta(channelId.value);

    // Clear audio elements
    const remoteAudio = document.getElementById("audio-remote");
    const localAudio = document.getElementById("audio-local");
    if (remoteAudio) remoteAudio.srcObject = null;
    if (localAudio) localAudio.srcObject = null;

    receivedSdpAnswer.value = null;
    callData.value = {};
    channelId.value = "";

    updateCallHistory("ended");
    sendPostMessage("call-ended", {
      description: "HANGUP",
      timestamp: new Date().toISOString(),
    });
  };
  const getChannelList = async () => {
    try {
      const resp = await PhoneStore.getChannels();
      return resp.data;
    } catch (e) {
      console.error("channels list", e);
    }
  };
  const getAction = (actions = [], name) => {
    return actions.find((a) => a.action_name === name);
  };
  const formatPermissionLimits = (limits = []) => {
    return limits.map((l) => {
      const remaining = Math.max(0, l.max_allowed - l.current_usage);

      let periodLabel = l.time_period;
      if (l.time_period === "PT24H") periodLabel = "today";
      if (l.time_period === "P7D") periodLabel = "this week";

      return `${remaining} ${periodLabel}`;
    });
  };
  const makeCall = async (channel_id, remoteNumber, agent) => {
    if (activeCall.value.show || incomingCall.value.show) {
      throw new Error("Call already in progress");
    }
    let resp = {};
    try {
      resp = await askIfPermissionPresent(remoteNumber, channel_id);
      console.log("asked perm vue3", resp);
      const { permission, actions } = resp.data;
      const status = permission?.status;
      currentPeerNumber.value = remoteNumber;

      if (status === "permanent" || status === "temporary") {
        const startCallAction = getAction(actions, "start_call");

          if (startCallAction?.can_perform_action) {
              channelId.value = channel_id;
              agentCode.value = agent;
              incomingCall.value = {
                show: true,
                remoteNumber: remoteNumber,
                timestamp: new Date(),
              };
              callState.value = "ringing";
              try {
                const offerSDP = await createOfferr(remoteNumber);
                console.log("ss",offerSDP);

              } catch (error) {
                console.error("Failed to make call:", error);
                throw error;
              }
          } else {
              toast.error("Call limit reached. You cannot place a call right now.");
              console.error("Call limit reached. You cannot place a call right now.");
          }
        return;
      } else {
        // this.$toast.error('Access denied, Request user permission by sending template.');
        const requestAction = getAction(
          actions,
          "send_call_permission_request"
        );
        if (!requestAction) {
          toast.error("Permission request action not available.");
          return;
        }

        const limitSummary = formatPermissionLimits(requestAction.limits).join(", ");
          if (requestAction.can_perform_action) {
            sendPostMessage("no-call-permission", {
              remoteNumber: currentPeerNumber.value,
              channelId: channel_id,
            });
          }
          // toast.info(`User has not granted call permission.\nPermission requests available:: ${limitSummary}.`,{ timeout: 0 });
          else toast.error(`You cannot send a permission request right now.\nLimits: ${limitSummary}.`,{ timeout: 0 });
          console.log("Access for call denied.");

      }
    } catch (e) {
      console.error("Failed to make call:", e);
      // this.$toast.error('Access denied, Request user permission to call.');
    }
  };

  const disconnect = () => {
    endCall(false);
    isConnected.value = false;
    connectionStatus.value = "disconnected";
  };
  const gotAnswer = (answer) => {
    receivedAnswer.value = answer;
    receivedSdpAnswer.value = answer.event_data.session;
    callData.value = answer.event_data;
    console.log(" got ans", answer);
  };
  const getCallsSuggestion = async (val) => {
    const resp = await PhoneStore.getCallSuggestion({ agentCode: window.CONST.APP_USER, contactWaId: val})
    console.log("rsults", resp.data.results)
    return resp.data.results;

  };


  //Calling Functionalities

  const toggleCamera = async () => {
  if (!localStream || !pc) return;
  if (cameraToggleLock) return;
  cameraToggleLock = true;

  
  try {
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (Camera.value) {
      const realTrack = localStream.getVideoTracks()[0];
      const canvas = document.createElement("canvas");
      Object.assign(canvas, { width: 2, height: 2 });
      canvas.getContext("2d").fillRect(0, 0, 2, 2);
      const blackTrack = canvas.captureStream(1).getVideoTracks()[0];

      if (sender) await sender.replaceTrack(blackTrack);
      if (realTrack) { realTrack.stop(); localStream.removeTrack(realTrack); }
      localStream.addTrack(blackTrack);
      Camera.value = false;
      sendCameraState(false);
      reattachMediaStreams();
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const newTrack = newStream.getVideoTracks()[0];
        const blackTrack = localStream.getVideoTracks()[0];
        if (sender) await sender.replaceTrack(newTrack);
        if (blackTrack) {localStream.removeTrack(blackTrack);blackTrack.stop();}
        localStream.addTrack(newTrack);
        Camera.value = true;
        sendCameraState(true);
        reattachMediaStreams();
      } catch (error) {
        console.error("Error restarting camera:", error);
        Camera.value = false;
        sendCameraState(false);
      }
    }
    reattachMediaStreams();
  } catch (error){
    console.error("Camera Toggle Error:", error);
  }
    finally {
    cameraToggleLock = false;
  }
};

  const sendCameraState = (state) => {
    if (dataChannel?.readyState === "open") {
      dataChannel.send(JSON.stringify({ type: "cameraState", value: state }));
    }
  };

  const onRemoteCameraState = (callback) => {
    onCameraStateCallback.value = callback;
  };
  
  const toggleMic = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    Mic.value = audioTrack.enabled;
  };

  const stopScreenShare = () => {
    if (!ScreenStream) return;

    ScreenStream.getTracks().forEach((track) => track.stop());
    ScreenShare.value = false;

    if (localStream && pc) {
      const videoSender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      const cameraTrack = localStream.getVideoTracks()[0];

      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
      }
    }

    ScreenStream = null;
    sendCameraState(Camera.value);
  };

  const toggleScreenShare = async () => {
    if (ScreenShare.value) {
      stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      ScreenStream = screenStream;

      screenTrack.onended = () => {
        if (ScreenShare.value) stopScreenShare();
      };

      if (pc) {
        const videoSender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }
      ScreenShare.value = true;
      sendCameraState(true);
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  const reattachMediaStreams = () => {
    const localVideoPip = document.getElementById("local-video-pip");
    if (localVideoPip && localStream) {
      localVideoPip.srcObject = localStream;
    }
    const remoteVideoEl = document.getElementById("remote-video");
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = Mic.value;
    }
    if (remoteStream.value && remoteVideoEl){
      if (remoteVideoEl.srcObject !== remoteStream.value) {
      remoteVideoEl.srcObject = remoteStream.value;
      console.log("[reattach] Remote video srcObject set", !!remoteStream.value);
      }
    }
  };

  const initP2PCall = async () => {
    callMode.value = "p2p";
    cameraToggleLock = false;
    dataChannel = null;
    gatheredCandidates.value = [];

    if (pc) {
      pc.close();
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }

    // Get audio only — no camera light
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Mute mic by default
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
      Mic.value = false;
    }

    // blank video track so the transceiver exists for replaceTrack later
    const canvas = document.createElement("canvas");
    Object.assign(canvas, { width: 2, height: 2 });
    const ctx = canvas.getContext("2d");
    const keepAlive = setInterval(() => ctx.fillRect(0, 0, 2, 2), 100);
    const blankTrack = canvas.captureStream(10).getVideoTracks()[0];
    blankTrack.onended = () => clearInterval(keepAlive);
    localStream.addTrack(blankTrack);
    Camera.value = false;

    // Build PeerConnection manually
    pc = new RTCPeerConnection({
      iceServers: iceServers.value,
      iceTransportPolicy: "all",
    });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    setupRTCEventListeners();

    setupLocalVideo(localStream);
  };

  const setupDataChannel = (dc) => {
  dc.onopen = () => {
    console.log("[dataChannel] Opened, sending camera state:", Camera.value, "ScreenShare:", ScreenShare.value);
    sendCameraState(Camera.value);
    if (ScreenShare.value) sendCameraState(true);
    reattachMediaStreams();
  };
  dc.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "cameraState" && onCameraStateCallback.value) {
        console.log("[dataChannel] Received remote cameraState:", msg.value);
        onCameraStateCallback.value(msg.value);
      }
    } catch (_) {}
  };
};

const waitForNCandidates = (n = 10, timeoutMs = 3000) => {
    return new Promise((resolve) => {
        if (gatheredCandidates.value.length >= n) {
            resolve(); return;
        }

        const timer = setTimeout(() => {
          pc.onicecandidate = original;
          resolve();
        }, timeoutMs);

        const original = pc.onicecandidate;
        pc.onicecandidate = (event) => {
            if (original) original(event);
            if (gatheredCandidates.value.length >= n) {
              clearTimeout(timer)
                pc.onicecandidate = original;
                resolve();
            }
        };
    });
};

  const createP2POffer = async (remoteNumber) => {
    p2pRoomId = remoteNumber;
    if (callMode.value !== "p2p") await initP2PCall();
    if (!pc) await initWebRTC();
    console.log("[createP2POffer] Resetting gatheredCandidates before new offer");
    gatheredCandidates.value = [];

    callState.value = "calling";
    currentPeerNumber.value = remoteNumber;

    dataChannel = pc.createDataChannel("p2p-state");
    setupDataChannel(dataChannel);

    const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    await waitForNCandidates(10);  // ← wait for 10 or 3s

    activeCall.value = { show: true, remoteNumber, startTime: null };

    return {
        type: offer.type,
        sdp: offer.sdp,
        candidates: gatheredCandidates.value.slice(0, 10),
    };
};

  const createP2PAnswer = async (remoteOffer) => {
    if (!pc) await initP2PCall();
    console.log("[createP2PAnswer] Resetting gatheredCandidates before new answer");
    gatheredCandidates.value = [];

    const sdpData = remoteOffer.sdp || remoteOffer;
    const type = sdpData.type || "offer";
    const sdp = sdpData.sdp || sdpData;

    if (typeof sdp !== "string") {
      console.error("Invalid SDP Data:", remoteOffer);
      throw new Error("Failed to parse SDP: Invalid format");
    }

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));

    if (remoteOffer.candidates?.length) {
        for (const c of remoteOffer.candidates) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
        }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await waitForNCandidates(10);

    return {
      type: answer.type,
      sdp: answer.sdp,
      candidates: gatheredCandidates.value.slice(0, 10),
    };
  };

  const addRemoteCandidate = async (candidate) => {
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    }
  };

  const resetP2PWithMedia = async (hadCamera, hadMic) => {
    callMode.value = "p2p";
    cameraToggleLock = false;
    gatheredCandidates.value = [];
    remoteStream.value = null;
    if (pc) { pc.close(); pc = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; await new Promise(r => setTimeout(r, 400));}

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: hadCamera ? { width: 1280, height: 720 } : false
    };

  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (!hadCamera) {
       const canvas = document.createElement("canvas");
       canvas.width = canvas.height = 2;
       const blackTrack = canvas.captureStream(1).getVideoTracks()[0];
       localStream.addTrack(blackTrack);
    }
    Mic.value = hadMic;
    Camera.value = hadCamera;
    localStream.getAudioTracks()[0].enabled = hadMic;
    if (ScreenStream) {
      ScreenStream.getTracks().forEach(t => t.stop());
      ScreenStream = null;
    }

    pc = new RTCPeerConnection({ iceServers: iceServers.value, iceTransportPolicy: "all" });
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    setupRTCEventListeners();
    setupLocalVideo(localStream);

    dataChannel = null;
    ScreenShare.value = false;
    callMode.value = "p2p";
  }catch (error){
    console.error("Hardware Grab Failed", error);
  }
};
  const endP2PCall = async () => {
    if (callMode.value !== "p2p") return;

    await endCall(false);

    if (ScreenStream) {
      ScreenStream.getTracks().forEach((t) => t.stop());
      ScreenStream = null;
    }

    const remoteVideo = document.getElementById("remote-video");
    const localVideo = document.getElementById("local-video");
    const localVideoPip = document.getElementById("local-video-pip");

    if (remoteVideo) remoteVideo.srcObject = null;
    if (localVideo) localVideo.srcObject = null;
    if (localVideoPip) localVideoPip.srcObject = null;

    remoteStream.value = null;
    ScreenStream = null;

    Mic.value = false;
    Camera.value = false;
    ScreenShare.value = false;
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
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
    dataChannel,

    Mic,
    Camera,
    ScreenShare,
    ScreenStream,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendCameraState,

    initWebRTC,
    disconnect,
    makeCall,
    answerCall,
    rejectCall,
    endCall,
    handleIncomingCall,
    setRemoteDescription,
    getLocalSDPData,
    gotAnswer,
    getChannelList,
    getCallsSuggestion,
    createOfferr,
    createAnswer,
    remoteStream,

    reattachMediaStreams,
    initP2PCall,
    createP2POffer,
    createP2PAnswer,
    addRemoteCandidate,
    onRemoteCameraState,
    resetP2PWithMedia,
    remoteDisconnected,
    endP2PCall,
  };
}
