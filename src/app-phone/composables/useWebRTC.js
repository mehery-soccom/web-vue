// composables/useWebRTC.js
import { ref, reactive, onUnmounted } from "vue";
import { usePhoneStore } from "../views/usePhoneStore";
const PhoneStore = usePhoneStore();

export function useWebRTC() {
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
  let channelId = ref('');
  
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

  // Timer functions
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
          autoGainControl: true
        }, 
        video: false 
      });
      
      setupLocalAudio(localStream);

      pc = new RTCPeerConnection({
        iceServers: iceServers.value,
        iceTransportPolicy: "all"
      });

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      setupRTCEventListeners();
      isConnecting.value = false;
      connectionStatus.value = "connected";
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

    pc.ontrack = (event) => {
      console.log("Received remote track:", event);
      if (event.streams && event.streams[0]) {
        setupRemoteAudio(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        gatheredCandidates.value.push(event.candidate.toJSON());
        console.log("New ICE candidate:", event.candidate);
      } else {
        console.log("ICE gathering complete");
        // Update local SDP data when complete
        updateLocalSDPData();
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      switch (pc.connectionState) {
        case "connected":
          isConnected.value = true;
          connectionStatus.value = "connected";
          callState.value = "talking";
          activeCall.value.startTime = new Date();
          startCallTimer();
          stopRingbacktone();
          stopRingtone();
          break;
        case "disconnected":
        case "failed":
          isConnected.value = false;
          connectionStatus.value = "error";
          endCall(false);
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
        offerToReceiveVideo: false
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
      await sendOffer(callData.value, channelId.value, currentPeerNumber.value);
      // Return the local description for sending to Meta API
      return getLocalSDPData();

    } catch (error) {
      console.error("Failed to create offer:", error);
      errorMessage.value = error.message;
      callState.value = "idle";
      throw error;
    }
  };

  // const askIfPermissionPresent = async (answerData, callDatas, channelId) => {
  //   try {
  //     const payload = { callData: callData.value, channelId: channelId, sdpAnswer: answerData.sdp };
  //     const response = await PhoneStore.askPermissionToMeta(payload);
  //     console.log("Meta API response:", response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error sending answer to Meta API:", error.response?.data || error.message);
  //     throw error;
  //   }
  // };
  const sendOffer = async (callDat, channelId, phone) => {
    try {
      const payload = { contact: { phone: phone }, channelId: channelId, session: callDat, agent: agentCode.value };
      const response = await PhoneStore.sendOfferToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error sending answer to Meta API:", error.response?.data || error.message);
      throw error;
    }
  };

  const sendAnswer = async (answerData, callDatas, channelId) => {
    try {
      // const url = `https://crforex.mehery.xyz/admin/api/scriptus/phone/whatsapp/calling/accept`;
      const payload = { callData: callData.value, channelId: channelId, sdpAnswer: answerData.sdp };

      const response = await PhoneStore.sendAnswerToMeta(payload);
      console.log("Meta API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error sending answer to Meta API:", error.response?.data || error.message);
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
      console.error("Error sending answer to Meta API:", error.response?.data || error.message);
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
      console.error("Error sending answer to Meta API:", error.response?.data || error.message);
      throw error;
    }
  };

  const createAnswer = async (offerSDP) => {
    if (!pc) {
      await initWebRTC();
    }

    try {
      callState.value = "ringing";
      // playRingtone();

      // Set remote offer
      const remoteDesc = {
        type: offerSDP.sdp_type || offerSDP.type || "offer",
        sdp: offerSDP.sdp
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
      await sendAnswer( answer, callData.value, channelId.value);
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

    const sdpData = remoteSDPData?.value ?? remoteSDPData;
    if (!sdpData?.sdp) {
      console.warn("No SDP found in remote description", sdpData);
      return;
    }
    try {
      const remoteDesc = {
        type: sdpData.sdp_type || "answer",
        sdp: sdpData.sdp
      };
      await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));
      // if (remoteSDPData.ice && Array.isArray(remoteSDPData.ice)) {
      //   for (const candidate of remoteSDPData.ice) {
      //     await pc.addIceCandidate(new RTCIceCandidate(candidate));
      //   }
      // }
      console.log("Remote description set successfully", remoteSDPData, sdpData, remoteDesc);
      activeCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        startTime: null,
      };
      console.log("answered call");
      setTimeout(()=>{
        stopRingbacktone();
        updateCallHistory("answered");
      },5000);
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
      ice: gatheredCandidates.value
    };
  };

  const updateLocalSDPData = () => {
    const localData = getLocalSDPData();
    if (localData) {
      sendPostMessage("local-sdp-data", localData);
    }
  };

  const handleIncomingCall = (offerSDP, remoteNumber = "", fullOffer, channel_id) => {
    channelId.value = channel_id;
    currentPeerNumber.value = remoteNumber;
    incomingCall.value = {
      show: true,
      remoteNumber: remoteNumber,
      timestamp: new Date(),
    };
    callState.value = "ringing";
    playRingtone();
    console.log("handle got called", offerSDP)
    callData.value = fullOffer;
    incomingCall.value.pendingOffer = offerSDP;
  };

  const answerCall = async () => {
    if (!incomingCall.value.show || !incomingCall.value.pendingOffer) {
      throw new Error("No incoming call to answer");
    }

    try {
      console.log("before assign", JSON.parse(JSON.stringify(callData.value)))
      // callData.value = event_data;
      const answerSDP = await createAnswer(incomingCall.value.pendingOffer || callData.value.session);
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
    channelId.value = '';
    
    sendPostMessage("call-rejected", {
      remoteNumber: currentPeerNumber.value,
      timestamp: new Date()
    });
  };

  const endCall = async (endFromAgent) => {
    if (pc) {
      pc.close();
      pc = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
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
    if(endFromAgent) await terminateCallMeta(channelId.value);

    // Clear audio elements
    const remoteAudio = document.getElementById("audio-remote");
    const localAudio = document.getElementById("audio-local");
    if (remoteAudio) remoteAudio.srcObject = null;
    if (localAudio) localAudio.srcObject = null;

    channelId.value = '';
    updateCallHistory("ended");
    sendPostMessage("call-ended", {
      description: "HANGUP",
      timestamp: new Date().toISOString(),
    });
  };

  const makeCall = async (channel_id, remoteNumber, agent) => {
    if (activeCall.value.show || incomingCall.value.show) {
      throw new Error("Call already in progress");
    }
    channelId.value = channel_id;
    currentPeerNumber.value = remoteNumber;
    agentCode.value = agent;
    incomingCall.value = {
      show: true,
      remoteNumber: remoteNumber,
      timestamp: new Date(),
    };
    callState.value = "ringing";
    // playRingtone();

    try {
      const offerSDP = await createOfferr(remoteNumber);
      console.log("ss",offerSDP);

    } catch (error) {
      console.error("Failed to make call:", error);
      throw error;
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
  }

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
  };
}