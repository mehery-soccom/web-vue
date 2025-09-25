// composables/useSip.js
import { ref, reactive, onUnmounted } from "vue";
import JsSIP from "jssip";

export function useSip() {
  // Reactive state
  const isRegistered = ref(false);
  const isConnecting = ref(false);
  const registrationStatus = ref("Disconnected"); // 'disconnected', 'connecting', 'connected', 'registered', 'error'
  const errorMessage = ref("");
  const callDuration = ref("00:00");
  let ua = null;
  let session = null;
  let request = null;
  const callTimer = ref(null);
  const currentPeerNumber = ref("");
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.counterpath.net:3478" },
    { urls: "stun:numb.viagenie.ca:3478" },
  ];
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
  let peerConnectionTime = null;
  // Configuration
  const config = ref({
    uri: "", // IMPU
    password: "", // SECRET
    display_name: "", // DISPLAY_NAME
    websocket_servers: [""], // WEBSOCKET
    realm: "", // REALM
    authorization_user: "", // IMPI
    ice_servers: [],
    ha1: null,
  });
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

    // Keep only last 10 calls
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

  /**
   * Initialize SIP connection
   * @param {Object} sipConfig - SIP configuration object
   */
  const initSip = (sipConfig) => {
    try {
      // Update config
      config.value = sipConfig.value;
      // console.log(sipConfig.value);
      // console.log(config.value);
      // Validate required config
      if (!config.value.uri || !config.value.websocket_servers?.length) {
        throw new Error("URI and websocket servers are required");
      }

      isConnecting.value = true;
      registrationStatus.value = "connecting";
      errorMessage.value = "";

      // Create UA configuration
      const uaConfig = {
        sockets: config.value.websocket_servers.map(
          (server) => new JsSIP.WebSocketInterface(server)
        ),
        uri: config.value.uri,
        password: config.value.password,
        display_name: config.value.display_name || "",
        contact_uri: null,
        authorization_user: config.value.authorization_user || null,
        instance_id: null,
        session_timers: false,
        use_preloaded_route: false,

        callstats: false,
        no_answer_timeout: 60,
        register: true,
        register_expires: 600,
      };

      // Add realm if provided
      if (config.realm) {
        uaConfig.realm = config.value.realm;
      }

      // Add HA1 if provided (for digest authentication)
      if (config.ha1) {
        uaConfig.ha1 = config.value.ha1;
      }

      // For FreeSWITCH/Asterisk compatibility
      if (config.value.authorization_user || config.value.impi) {
        uaConfig.authorization_user =
          config.value.authorization_user || config.value.impi;
      }
      // Create User Agent
      ua = new JsSIP.UA(uaConfig);

      // Set up event listeners
      setupEventListeners();

      // Start UA
      ua.start();
    } catch (error) {
      console.error("SIP initialization failed:", error);
      errorMessage.value = error.message;
      registrationStatus.value = "error";
      isConnecting.value = false;
    }
  };
  function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    console.log("incoming phone number : ", phone);
    const digits = phone.replace(/\D/g, "");

    // If it starts with 0 and followed by 10 digits, strip the 0
    if (digits.length === 11 && digits.startsWith("0")) {
      currentPeerNumber.value = "91" + digits.slice(1);
      return;
    }

    // If it's exactly 10 digits, add 91
    if (digits.length === 10) {
      currentPeerNumber.value = "91" + digits;
      return;
    }

    // If it's already in correct format or invalid, return as is or throw
    throw new Error("Invalid phone number format");
  }
  /**
   * Set up JsSIP event listeners
   */
  const setupEventListeners = () => {
    if (!ua) return;

    // Connection events
    ua.on("connected", () => {
      console.log("SIP connected");
      registrationStatus.value = "connected";
      isConnecting.value = false;
    });

    ua.on("disconnected", () => {
      console.log("SIP disconnected");
      registrationStatus.value = "disconnected";
      isRegistered.value = false;
      isConnecting.value = false;
    });

    // Registration events
    ua.on("registered", () => {
      console.log("SIP registered");
      isRegistered.value = true;
      registrationStatus.value = "registered";
      sendPostMessage("connection-status", { connection: "connected" });
    });

    ua.on("unregistered", () => {
      console.log("SIP unregistered");
      isRegistered.value = false;
      registrationStatus.value = "connected";
    });

    ua.on("registrationFailed", (e) => {
      console.error("SIP registration failed:", e);
      isRegistered.value = false;
      registrationStatus.value = "error";
      errorMessage.value = `Registration failed: ${e.cause}`;
    });

    // Call events
    ua.on("newRTCSession", (e) => {
      console.log("New RTC session:", e);
      session = e.session;
      request = e.request;
      peerConnectionTime = Date.now();
      if (session.direction === "incoming") {
        incomingCall.value = {
          show: true,
          remoteNumber: request.from._uri._user || "unknown",
          timestamp: new Date(),
        };
        currentPeerNumber.value = request.from._uri._user || "unknown";
        formatPhoneNumber(currentPeerNumber.value);
        console.log("called Id : ", request.from._uri._user || "unknown");
        callState.value = "ringing";
        setupCallEventListeners(session);
        addToCallHistory(
          request.from._uri._user || "unknown",
          "incoming",
          new Date()
        );
        sendPostMessage("incomming-call", {
          remoteNumber: currentPeerNumber.value,
          timestamp: incomingCall.value.timestamp,
        });
      } else {
        callState.value = "calling";
        setupCallEventListeners(session);
      }
    });
  };

  /**
   * Set up call-specific event listeners
   */
  const setupCallEventListeners = (session) => {
    session.on("peerconnection", (data) => {
      console.log("peer connection event", data);
      const peerConnection = data.peerconnection;
      peerConnection.addEventListener("addstream", (e) => {
        // Get the stream from the event
        const stream = e.stream;
        if (stream) {
          setupRemoteAudio(stream);
        }
      });
    });

    session.on("progress", () => {
      console.log("Call progress");
      const current = Date.now();
      activeCall.value = {
          show: true,
          remoteNumber: currentPeerNumber.value,
          startTime: null,
        };
      if (peerConnectionTime !== null) {
        const timeDiff = ((current - peerConnectionTime) / 1000).toFixed(2);
        console.log(`Peer connection formation time: ${timeDiff} seconds`);
      } else {
        console.warn("peerConnectionTime not set before progress event");
      }
      if (session.direction === "incoming") {
        playRingtone();
      } else {
        sendPostMessage("outbound-call-ringing", {
          dialedNumber: currentPeerNumber.value,
        });
        const remoteStream = session.connection.getRemoteStreams()[0];
        if (remoteStream) {
          setupRemoteAudio(remoteStream);
        }
      }
      callState.value = "calling";
      // playRingtone();
    });
    session.on("icecandidate", function (event) {
      if (
        event.candidate.type === "srflx" &&
        event.candidate.relatedAddress !== null &&
        event.candidate.relatedPort !== null
      ) {
        event.ready();
      }
    });
    session.on("accepted", () => {
      console.log("Call accepted");
      callState.value = "talking";
      console.log("accepted : ", session);
      if (session.direction === "incoming") {
        activeCall.value = {
          show: true,
          remoteNumber: currentPeerNumber.value,
          startTime: new Date(),
        };
        incomingCall.value = {
          show: false,
          remoteNumber: "",
          timestamp: null,
        };
        stopRingtone();
        startCallTimer();
      } else {
        activeCall.value = {
          show: true,
          remoteNumber: currentPeerNumber.value,
          startTime: new Date(),
        };
        incomingCall.value = {
          show: false,
          remoteNumber: "",
          timestamp: null,
        };
        stopRingtone();
        startCallTimer();
      }
      // stopRingtone();
      console.log(`active call accepted : `, activeCall.value);
      // Setup remote audio
    });

    session.on("ended", () => {
      console.log("Call ended");
      callState.value = "ended";
      activeCall.value = {
        show: false,
        remoteNumber: "",
        startTime: null,
      };
      incomingCall.value = {
        show: false,
        remoteNumber: "",
        timestamp: null,
      };
      currentPeerNumber.value = "";

      // stopRingtone();
      if (callTimer.value) {
        clearInterval(callTimer.value);
        callTimer.value = null;
      }
      console.log(`active call ended from peer: `, activeCall.value);
      // Clear remote audio
      const remoteAudio = document.getElementById("audio-remote");
      if (remoteAudio) {
        remoteAudio.srcObject = null;
      }
      callState.value = "idle";
      session = null;
      request = null;
      updateCallHistory("terminated");
      sendPostMessage("call-terminated", {
        description: "HANGUP",
        timestamp: new Date().toISOString(),
      });
    });

    session.on("failed", (e) => {
      console.log("Call failed:", e);
      if (e.message && e.message.status_code === 480) {
        sendPostMessage("call-failed", {
          message: "unavailable",
          status_code: e.message.status_code,
        });
      } else {
        sendPostMessage("call-terminated", {
          description: "HANGUP",
          timestamp: new Date().toISOString(),
        });
        stopRingtone();
      }
      callState.value = "ended";
      // stopRingtone();
      activeCall.value = {
        show: false,
        remoteNumber: "",
        startTime: null,
      };
      incomingCall.value = {
        show: false,
        remoteNumber: "",
        timestamp: null,
      };
      setTimeout(() => {
        callState.value = "idle";
      }, 1000);
      session = null;
      request = null;
    });
  };

  /**
   * Make an outbound call
   * @param {string} target - SIP URI or phone number to call
   * @param {Object} options - Call options
   */
  const makeCall = (target, options = {}) => {
    if(target.length === 10) target = `91${target}`;
    const sipTargetUri = `sip:${target}@bullforce`;
    console.log(`sipTargetUri : ${sipTargetUri}`);
    if (!ua || !isRegistered.value) {
      throw new Error("SIP not registered");
    }

    if (activeCall.value.show || incomingCall.value.show) {
      throw new Error("Call already in progress");
    }
    const callOptions = {
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: iceServers,
      },
      ...options,
    };

    try {
      session = ua.call(sipTargetUri, callOptions);
      callState.value = "calling";
      setupCallEventListeners(session);
      currentPeerNumber.value = target;
      addToCallHistory(currentPeerNumber.value, "outgoing");
      return session;
    } catch (error) {
      console.error("Failed to make call:", error);
      throw error;
    }
  };

  /**
   * Answer incoming call
   */
  const answerCall = (options = {}) => {
    if (!incomingCall.value) {
      throw new Error("No incoming call to answer");
    }
    try {
      // incomingCall.value.answer(callOptions);

      session.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            // TURN servers if needed
          ],
        },
      });
      stopRingtone();
      updateCallHistory("answered");
    } catch (error) {
      console.error("Failed to answer call:", error);
      throw error;
    }
  };

  /**
   * Reject incoming call
   */
  const rejectCall = () => {
    if (!incomingCall.value) {
      throw new Error("No incoming call to reject");
    }
    try {
      // incomingCall.value.terminate();
      session.terminate();
      incomingCall.value = {
        show: false,
        remoteNumber: "",
        timestamp: null,
      };
      callState.value = "idle";
      updateCallHistory("rejected");
    } catch (error) {
      console.error("Failed to reject call:", error);
      throw error;
    }
  };

  /**
   * End active call
   */
  const endCall = () => {
    incomingCall.value = {
      show: false,
      remoteNumber: "",
      timestamp: null,
    };
    activeCall.value = {
      show: false,
      remoteNumber: "",
      startTime: null,
    };
    console.log(`active call ended from jssip: `, activeCall.value);
    callState.value = "idle";
    if (!session) {
      throw new Error("No active call to end");
    }

    try {
      session.terminate();
      session = null;
    } catch (error) {
      console.error("Failed to end call:", error);
      throw error;
    }
  };

  /**
   * Register SIP account
   */
  const register = () => {
    if (!ua) {
      throw new Error("SIP not initialized");
    }
    ua.register();
  };

  /**
   * Unregister SIP account
   */
  const unregister = () => {
    if (!ua) return;
    ua.unregister();
  };

  /**
   * Disconnect and cleanup
   */
  const disconnect = () => {
    if (ua) {
      ua.stop();
      ua = null;
    }
    isRegistered.value = false;
    isConnecting.value = false;
    registrationStatus.value = "disconnected";
    activeCall.value = {
      show: false,
      remoteNumber: "",
      startTime: null,
    };
    incomingCall.value = {
      show: false,
      remoteNumber: "",
      timestamp: null,
    };
    callState.value = "idle";
  };
  // Cleanup on component unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    isRegistered,
    isConnecting,
    registrationStatus,
    errorMessage,
    activeCall,
    incomingCall,
    callState,
    config,
    callDuration,
    callHistory,
    // Methods
    initSip,
    register,
    unregister,
    disconnect,
    makeCall,
    answerCall,
    rejectCall,
    endCall,
  };
}
