// composables/useWebRTC.js
import { ref, reactive, onUnmounted } from "vue";
import axios from "axios";
import { usePhoneStore } from "../views/usePhoneStore";
const PhoneStore = usePhoneStore();

export function useWebRTC() {
  // Reactive state
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionStatus = ref("disconnected"); // 'disconnected', 'connecting', 'connected', 'error'
  const errorMessage = ref("");
  const callDuration = ref("00:00");
  // const callData = ref({ 
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
  // })
  const callData = ref({})
  
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
      // Return the local description for sending to Meta API
      return getLocalSDPData();

    } catch (error) {
      console.error("Failed to create offer:", error);
      errorMessage.value = error.message;
      callState.value = "idle";
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

  /**
   * Create SDP answer for incoming call
   */
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
      await sendAnswer( answer, callData.value, 'wacfb:919619723759');
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
  const handleIncomingCall = (offerSDP, remoteNumber = "", fullOffer) => {
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
      console.log("bef assign", JSON.parse(JSON.stringify(callData.value)))
      // callData.value = event_data;
      const answerSDP = await createAnswer(incomingCall.value.pendingOffer || callData.value.session);
      incomingCall.value.show = false;
      activeCall.value = {
        show: true,
        remoteNumber: currentPeerNumber.value,
        startTime: null, // Will be set when connected
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

  /**
   * Reject incoming call
   */
  const rejectCall = async () => {
    if (!incomingCall.value.show) {
      throw new Error("No incoming call to reject");
    }
    await rejectCallMeta('wacfb:919619723759');
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
  const endCall = async () => {
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
    await terminateCallMeta('wacfb:919619723759');

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