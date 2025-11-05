// composables/useWebRTC.js
import { ref, reactive, onUnmounted } from "vue";
import axios from "axios";

export function useWebRTC() {
  // Reactive state
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionStatus = ref("disconnected"); // 'disconnected', 'connecting', 'connected', 'error'
  const errorMessage = ref("");
  const callDuration = ref("00:00");
  
  // WebRTC objects
  let pc = null;
  let localStream = null;
  
  // ICE servers configuration
  const iceServers = ref([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun.l.google.com:3478" },
    { urls: "stun:stun.counterpath.net:3478" },
    { urls: "stun:numb.viagenie.ca:3478" },
    // Add TURN servers if needed for WhatsApp
  ]);

  // Call state
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

  // Call history management
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

  /**
   * Initialize WebRTC connection
   */
  const initWebRTC = async () => {
    try {
      isConnecting.value = true;
      connectionStatus.value = "connecting";
      errorMessage.value = "";

      // Get user media
      localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      setupLocalAudio(localStream);

      // Create peer connection
      pc = new RTCPeerConnection({
        iceServers: iceServers.value,
        iceTransportPolicy: "all"
      });

      // Add local tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Set up event listeners
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

  /**
   * Set up WebRTC event listeners
   */
  const setupRTCEventListeners = () => {
    if (!pc) return;

    // Handle incoming tracks (remote audio)
    pc.ontrack = (event) => {
      console.log("Received remote track:", event);
      if (event.streams && event.streams[0]) {
        setupRemoteAudio(event.streams[0]);
      }
    };

    // Handle ICE candidates
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
          endCall();
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
  const createOffer = async (remoteNumber = "") => {
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
      
      activeCall.value = {
        show: true,
        remoteNumber: remoteNumber,
        startTime: null,
      };
      
      addToCallHistory(remoteNumber, "outgoing", new Date());
      playRingbacktone();
      
      console.log("SDP Offer created, waiting for answer...");
      await sendAnswer(answerData, callData, 'wacfb:919619723759');
      // Return the local description for sending to Meta API
      return getLocalSDPData();

    } catch (error) {
      console.error("Failed to create offer:", error);
      errorMessage.value = error.message;
      callState.value = "idle";
      throw error;
    }
  };

  const sendAnswer = async (answerData, callData, channelId) => {
  try {
    const url = `https://crforex.mehery.xyz/scriptus/phone/whatsapp/calling/accept`;

    const payload = {
      callData: callData,           // required — from incoming webhook
      channelId: channelId,            // let Meta know this is an SDP answer
      sdpAnswer: answerData.sdp,       // the SDP data (pc.localDescription)
      // ice: answerData.ice || [], // ICE candidates if any
    };

    const response = await axios.post( url, payload);

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

  /**
   * Create SDP answer for incoming call
   */
  const createAnswer = async (offerSDP) => {
    if (!pc) {
      await initWebRTC();
    }

    try {
      callState.value = "ringing";
      playRingtone();

      // Set remote offer
      await pc.setRemoteDescription(new RTCSessionDescription(offerSDP.sdp));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      incomingCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        timestamp: new Date(),
      };
      
      addToCallHistory(currentPeerNumber.value, "incoming", new Date());
      
      console.log("SDP Answer created");
      
      // Return the local description for sending to Meta API
      return getLocalSDPData();

    } catch (error) {
      console.error("Failed to create answer:", error);
      errorMessage.value = error.message;
      callState.value = "idle";
      throw error;
    }
  };

  /**
   * Set remote SDP description (for completing the handshake)
   */
  const setRemoteDescription = async (remoteSDPData) => {
    if (!pc) {
      throw new Error("WebRTC not initialized");
    }

    try {
      // Set remote description
      if (remoteSDPData.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(remoteSDPData.sdp));
      }

      // Add ICE candidates if available
      if (remoteSDPData.ice && Array.isArray(remoteSDPData.ice)) {
        for (const candidate of remoteSDPData.ice) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      console.log("Remote description set successfully");

    } catch (error) {
      console.error("Failed to set remote description:", error);
      throw error;
    }
  };

  /**
   * Get local SDP data (offer/answer + ICE candidates)
   */
  const getLocalSDPData = () => {
    if (!pc || !pc.localDescription) {
      return null;
    }

    return {
      sdp: pc.localDescription.toJSON(),
      ice: gatheredCandidates.value
    };
  };

  /**
   * Update local SDP data display (for debugging)
   */
  const updateLocalSDPData = () => {
    const localData = getLocalSDPData();
    if (localData) {
      // You can send this to parent window or store it for Meta API
      sendPostMessage("local-sdp-data", localData);
    }
  };

  /**
   * Handle incoming call from webhook
   */
  const handleIncomingCall = (offerSDP, remoteNumber = "") => {
    currentPeerNumber.value = remoteNumber;
    incomingCall.value = {
      show: true,
      remoteNumber: remoteNumber,
      timestamp: new Date(),
    };
    callState.value = "ringing";
    playRingtone();
    
    // Store the offer for when user answers
    incomingCall.value.pendingOffer = offerSDP;
  };

  /**
   * Answer incoming call
   */
  const answerCall = async () => {
    if (!incomingCall.value.show || !incomingCall.value.pendingOffer) {
      throw new Error("No incoming call to answer");
    }

    try {
      const answerSDP = await createAnswer(incomingCall.value.pendingOffer);
      incomingCall.value.show = false;
      activeCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        startTime: null, // Will be set when connected
      };
      
      stopRingtone();
      updateCallHistory("answered");
      
      return answerSDP;

    } catch (error) {
      console.error("Failed to answer call:", error);
      throw error;
    }
  };

  /**
   * Reject incoming call
   */
  const rejectCall = () => {
    if (!incomingCall.value.show) {
      throw new Error("No incoming call to reject");
    }

    incomingCall.value = {
      show: false,
      remoteNumber: "",
      timestamp: null,
      pendingOffer: null,
    };
    callState.value = "idle";
    stopRingtone();
    updateCallHistory("rejected");
    
    sendPostMessage("call-rejected", {
      remoteNumber: currentPeerNumber.value,
      timestamp: new Date()
    });
  };

  /**
   * End active call
   */
  const endCall = () => {
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

    // Clear audio elements
    const remoteAudio = document.getElementById("audio-remote");
    const localAudio = document.getElementById("audio-local");
    if (remoteAudio) remoteAudio.srcObject = null;
    if (localAudio) localAudio.srcObject = null;

    updateCallHistory("ended");
    sendPostMessage("call-ended", {
      description: "HANGUP",
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Make outgoing call (initiate WebRTC offer)
   */
  const makeCall = async (remoteNumber) => {
    if (activeCall.value.show || incomingCall.value.show) {
      throw new Error("Call already in progress");
    }

    try {
      const offerSDP = await createOffer(remoteNumber);
      return offerSDP;

    } catch (error) {
      console.error("Failed to make call:", error);
      throw error;
    }
  };

  /**
   * Cleanup
   */
  const disconnect = () => {
    endCall();
    isConnected.value = false;
    connectionStatus.value = "disconnected";
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    isConnected,
    isConnecting,
    connectionStatus,
    errorMessage,
    activeCall,
    incomingCall,
    callState,
    callDuration,
    callHistory,
    
    // Methods
    initWebRTC,
    disconnect,
    makeCall,
    answerCall,
    rejectCall,
    endCall,
    handleIncomingCall,
    setRemoteDescription,
    getLocalSDPData,
  };
}