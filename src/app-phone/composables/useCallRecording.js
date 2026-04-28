import { ref } from "vue";
import DataService from "@/@common/services/DataService";

async function _uploadBlob(blob, filename, _metadata) {
  // PRODUCTION
  const folder = _metadata.mode === "p2p" ? "p2p" : "meta";
  const s3Key = `recordings/${folder}/${filename}`;
  const formData = new FormData();
  formData.append("docs", blob, s3Key);
  formData.append("metadata", JSON.stringify(_metadata));
  const res = await DataService.axios.post("/api/dms", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.remoteDetails?.Location ?? null;

  // TESTING
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement("a");
  // a.href = url;
  // a.download = filename;
  // document.body.appendChild(a);
  // a.click();
  // setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  // return url;
}

function _bestMimeType(wantVideo) {
  const candidates = wantVideo ? [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ]: [
        "audio/mp4;codecs=mp4a.40.2",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];

  const chosen = candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  return chosen;
}

function _extFromMime(mime) {
  if (mime.includes("mp4"))  return "mp4";
  if (mime.includes("ogg"))  return "ogg";
  return "webm";
}

function _createTickerWorker() {
  const src = `
    let iv = null;
    self.onmessage = (e) => {
      if (e.data.type === 'start') {
        const fps = e.data.fps || 30;
        if (iv) clearInterval(iv);
        iv = setInterval(() => self.postMessage({ type: 'tick' }), 1000 / fps);
      } else if (e.data.type === 'stop') {
        if (iv) { clearInterval(iv); iv = null; }
        self.close();
      }
    };
  `;
  const blob = new Blob([src], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
export function useCallRecording({ mode = "meta", silent, recordingTrigger = "auto" } = {}) {
  const _silent = silent !== undefined ? silent : (recordingTrigger === "auto");

  const isRecording = ref(false);
  const isUploading = ref(false);
  const recordingError = ref(null);
  const uploadedUrls = ref([]);

  let _mediaRecorder = null;
  let _audioCtx = null;
  let _mixDest = null;
  let _remoteSourceNode = null;
  let _localSourceNode = null;
  let _pendingBlobs = [];
  let _roomId = null;
  let _callId = null;
  let _mimeType = "";
  let _notifyPeer = null;
  let _screenStream = null;
  let _screenShareOwner = null;

  let _canvasEl = null;
  let _tickerWorker = null;
  let _offscreenScreenVideo = null;
  let _onVisibilityChange = null;
  let _recordingMetadata = {
    roomId: null,
    callId: null,
    mode: null,
    recordingTrigger: null,
    startedAt: null,
    endedAt: null,
    durationMs: null,
    mimeType: null,
  };
  function updateScreenStream(stream) { _screenStream = stream || null; }
  function updateScreenShareOwner(owner) { _screenShareOwner = owner || null; }

  async function _flush() {
    if (!_pendingBlobs.length) return;

    const blobs = _pendingBlobs.splice(0);
    const ext = _extFromMime(_mimeType);
    const blob = new Blob(blobs, { type: _mimeType || "audio/webm" });
    const filename = `${mode}_${recordingTrigger}_${_callId || _roomId}_${Date.now()}.${ext}`;

    _recordingMetadata.endedAt = new Date().toISOString();
    _recordingMetadata.durationMs = _recordingMetadata.startedAt ? Date.now() - new Date(_recordingMetadata.startedAt).getTime(): null;
    _recordingMetadata.mimeType = _mimeType;

    try {
      isUploading.value = true;
      const url = await _uploadBlob(blob, filename, { ..._recordingMetadata });
      if (url) {
        uploadedUrls.value.push(url);
      }
    } catch (e) {
      recordingError.value = "Upload failed: " + e.message;
      console.error("[Recording] Upload error:", e);
    } finally {isUploading.value = false;}
  }

  function _teardownAudio() {
    try { _remoteSourceNode?.disconnect(); } catch (_) {}
    try { _localSourceNode?.disconnect();  } catch (_) {}
    try { _audioCtx?.close(); } catch (_) {}
    _remoteSourceNode = null;
    _localSourceNode  = null;
    _audioCtx = null;
    _mixDest = null;
    _screenStream = null;
  }

  function _teardownTabCapture() {
    if (_tickerWorker) {
      _tickerWorker.postMessage({ type: "stop" });
      _tickerWorker = null;
    }
    if (_onVisibilityChange) {
      document.removeEventListener("visibilitychange", _onVisibilityChange);
      _onVisibilityChange = null;
    }
    if (_offscreenScreenVideo) {
      _offscreenScreenVideo.srcObject = null; _offscreenScreenVideo = null;
    }
    _canvasEl = null;
  }

  function _startWorkerTicker(drawFrame, fps) {
    if (_tickerWorker) { _tickerWorker.postMessage({ type: "stop" }); _tickerWorker = null; }
    _tickerWorker = _createTickerWorker();
    _tickerWorker.onmessage = (e) => { if (e.data.type === "tick") drawFrame(); };
    _tickerWorker.postMessage({ type: "start", fps });
  }

  function _makeDrawFrame(canvas) {
    const ctx = canvas.getContext("2d");
    const WIDTH = canvas.width, HEIGHT = canvas.height;

    return function drawFrame() {
      const isScreenLayout = !!document.querySelector(".screen-main");
      const isLocalSharing = !!document.getElementById("local-screen-video");

      if (isScreenLayout) {
        const PANEL_W = Math.round(WIDTH * 0.165);
        const MAIN_W = WIDTH - PANEL_W;

        ctx.fillStyle = "#0d0d14";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const mainVid = isLocalSharing
          ? (_offscreenScreenVideo?.readyState >= 2 ? _offscreenScreenVideo : document.getElementById("local-screen-video"))
          : document.getElementById("remote-video");

        if (mainVid?.readyState >= 2 && (mainVid === _offscreenScreenVideo || !mainVid.classList.contains("hidden"))) {
          const vr = mainVid.videoWidth / mainVid.videoHeight || 16 / 9;
          const cr = MAIN_W / HEIGHT;
          let dw, dh, dx, dy;
          if (vr > cr) { dw = MAIN_W; dh = MAIN_W / vr; dx = 0; dy = (HEIGHT - dh) / 2; }
          else { dh = HEIGHT; dw = HEIGHT * vr; dx = (MAIN_W - dw) / 2; dy = 0; }
          ctx.drawImage(mainVid, dx, dy, dw, dh);
        }

        const ownerText = document.querySelector(".screen-owner-badge")?.textContent?.trim() || "";
        if (ownerText) {
          ctx.font = "500 12px system-ui, sans-serif";
          const tw = ctx.measureText(ownerText).width;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          _roundRect(ctx, 12, HEIGHT - 90, tw + 20, 24, 5); ctx.fill();
          ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(ownerText, 22, HEIGHT - 78);
        }

        ctx.fillStyle = "#0a0a12";
        ctx.fillRect(MAIN_W, 0, PANEL_W, HEIGHT);

        const pipCards = document.querySelectorAll(".pip-card");
        const CARD_H = Math.round(PANEL_W * 9 / 16);
        const PAD = 8;

        pipCards.forEach((card, i) => {
          const cx = MAIN_W + PAD, cy = PAD + i * (CARD_H + PAD);
          const cw = PANEL_W - PAD * 2, ch = CARD_H;

          ctx.save();
          _roundRect(ctx, cx, cy, cw, ch, 6); ctx.clip();

          const vid  = card.querySelector("video");
          const avatarEl = card.querySelector(".pip-card-avatar");
          if (vid?.readyState >= 2 && !vid.classList.contains("hidden")) {
            ctx.drawImage(vid, cx, cy, cw, ch);
          } else {
            ctx.fillStyle = "#252a4a"; ctx.fillRect(cx, cy, cw, ch);
            ctx.fillStyle = "#7b96e8";
            ctx.font = `bold ${Math.round(ch * 0.42)}px system-ui, sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(avatarEl?.textContent?.trim() || "?", cx + cw / 2, cy + ch / 2);
          }
          ctx.restore();

          ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1.5;
          _roundRect(ctx, cx, cy, cw, ch, 6); ctx.stroke();

          const name = card.querySelector(".pip-card-name")?.textContent?.trim() || "";
          if (name) {
            ctx.font = "500 9px system-ui, sans-serif";
            const nw = ctx.measureText(name).width;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            _roundRect(ctx, cx + 4, cy + ch - 16, nw + 10, 12, 3); ctx.fill();
            ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(name, cx + 9, cy + ch - 10);
          }
        });

      } else {
        const remoteVid = document.getElementById("remote-video");
        const pipVid = document.getElementById("local-video-pip");
        const pipAvatar = document.querySelector(".pip-avatar");

        if (remoteVid?.readyState >= 2 && !remoteVid.classList.contains("hidden")) {
          ctx.drawImage(remoteVid, 0, 0, WIDTH, HEIGHT);
        } else {
          ctx.fillStyle = "#151520"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
          const initial = document.querySelector(".remote-placeholder .avatar")?.textContent?.trim() || "?";
          ctx.fillStyle = "#252a4a";
          ctx.beginPath(); ctx.arc(WIDTH / 2, HEIGHT / 2 - 20, 55, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#7b96e8";
          ctx.font = "bold 52px system-ui, sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(initial, WIDTH / 2, HEIGHT / 2 - 20);
        }

        const remoteName = document.querySelector(".remote-name-badge")?.textContent?.trim() || "";
        if (remoteName) {
          ctx.font = "600 14px system-ui, sans-serif";
          const tw = ctx.measureText(remoteName).width;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          _roundRect(ctx, 12, HEIGHT - 42, tw + 18, 28, 6); ctx.fill();
          ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(remoteName, 21, HEIGHT - 28);
        }

        const PIP_W = Math.round(WIDTH * 0.18), PIP_H = Math.round(HEIGHT * 0.20);
        const PIP_X = WIDTH - PIP_W - 14, PIP_Y = HEIGHT - PIP_H - 14;

        ctx.save();
        _roundRect(ctx, PIP_X, PIP_Y, PIP_W, PIP_H, 10); ctx.clip();
        if (pipVid?.readyState >= 2 && !pipVid.classList.contains("hidden")) {
          ctx.drawImage(pipVid, PIP_X, PIP_Y, PIP_W, PIP_H);
        } else {
          ctx.fillStyle = "#252a4a"; ctx.fillRect(PIP_X, PIP_Y, PIP_W, PIP_H);
          const localName = document.querySelector(".pip-wrapper span")?.textContent?.replace("(You)", "").trim() || "";
          const init = pipAvatar?.textContent?.trim() || localName?.charAt(0)?.toUpperCase() || "?";
          ctx.fillStyle = "#7b96e8";
          ctx.font = `bold ${Math.round(PIP_H * 0.42)}px system-ui, sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(init, PIP_X + PIP_W / 2, PIP_Y + PIP_H / 2);
        }
        ctx.restore();

        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
        _roundRect(ctx, PIP_X, PIP_Y, PIP_W, PIP_H, 10); ctx.stroke();

        const localName = document.querySelector(".pip-wrapper span")?.textContent?.replace("(You)", "").trim() || "";
        if (localName) {
          ctx.font = "600 11px system-ui, sans-serif";
          const tw = ctx.measureText(localName).width;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          _roundRect(ctx, PIP_X + 6, PIP_Y + PIP_H - 24, tw + 14, 18, 4); ctx.fill();
          ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(localName, PIP_X + 13, PIP_Y + PIP_H - 15);
        }
      }

      ctx.fillStyle = "rgba(217,48,37,0.88)";
      _roundRect(ctx, WIDTH - 86, 14, 72, 26, 13); ctx.fill();
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(WIDTH - 74, 27, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText("REC", WIDTH - 64, 27);
    };
  }

  async function startRecording({
    localStream = null,
    remoteStream = null,
    screenStream = null,
    roomId,
    callId,
    notifyPeerCallback = null,
    screenShareOwner = null,
  } = {}) {
    if (isRecording.value) {
      console.warn("[Recording] Already recording — ignoring");
      return;
    }
    if (recordingTrigger === "auto" && mode !== "meta") {
      console.warn("[Recording] 'auto' trigger is for meta/WhatsApp calls only");
      return;
    }
    if (recordingTrigger === "manual" && mode !== "p2p") {
      console.warn("[Recording] 'manual' trigger is for p2p calls only");
      return;
    }

    try {
      _roomId = roomId;
      _callId = callId || roomId;
      _notifyPeer = notifyPeerCallback;
      _screenStream = screenStream;
      _screenShareOwner = screenShareOwner;
      _pendingBlobs = [];
      uploadedUrls.value = [];
      recordingError.value = null;

      _recordingMetadata = {
        roomId: _roomId,
        callId: _callId,
        mode,
        recordingTrigger,
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationMs: null,
        mimeType: null,
      };

      let recordedStream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const FPS = 30, WIDTH = 1280, HEIGHT = 720;

      if (mode === "p2p") {
        _audioCtx = new AudioCtx();
        const mixDest = _audioCtx.createMediaStreamDestination();
        _mixDest = mixDest;

        const mixIn = (stream) => {
          if (!stream) return null;
          const live = stream.getAudioTracks().filter(t => t.readyState === "live");
          if (!live.length) return null;
          const node = _audioCtx.createMediaStreamSource(new MediaStream(live));
          node.connect(mixDest);
          return node;
        };
        _localSourceNode = mixIn(localStream); _remoteSourceNode = mixIn(remoteStream);

        _onVisibilityChange = () => {
          if (_audioCtx?.state === "suspended") _audioCtx.resume().catch(() => {});
          if (_offscreenScreenVideo?.paused) _offscreenScreenVideo.play().catch(() => {});
        };
        document.addEventListener("visibilitychange", _onVisibilityChange);

        if (screenStream && screenShareOwner === "local") {
          const screenVideoTracks = screenStream.getVideoTracks();
          if (screenVideoTracks.length) {
            recordedStream = new MediaStream([
              screenVideoTracks[0], ...mixDest.stream.getAudioTracks(),
            ]);
          }
        }

        if (!recordedStream) {
          const canvas = document.createElement("canvas");
          canvas.width = WIDTH;
          canvas.height = HEIGHT;
          _canvasEl = canvas;

          if (screenStream) {
            _offscreenScreenVideo = document.createElement("video");
            _offscreenScreenVideo.srcObject  = screenStream;
            _offscreenScreenVideo.muted = true;
            _offscreenScreenVideo.playsInline = true;
            _offscreenScreenVideo.play().catch(() => {});
          }

          const drawFrame = _makeDrawFrame(canvas);
          _startWorkerTicker(drawFrame, FPS);

          const canvasStream = canvas.captureStream(FPS);
          recordedStream = new MediaStream([
            ...canvasStream.getVideoTracks(), ...mixDest.stream.getAudioTracks(),
          ]);
        }

      } else {
        if (!localStream && !remoteStream) {
          recordingError.value = "No audio stream available";
          console.warn("[Recording] No streams for meta recording");
          return;
        }
        _audioCtx = new AudioCtx();
        const mixDest = _audioCtx.createMediaStreamDestination();
        _mixDest = mixDest;

        const mixIn = (stream) => {
          if (!stream) return null;
          const live = stream.getAudioTracks().filter(t => t.readyState === "live");
          if (!live.length) return null;
          const node = _audioCtx.createMediaStreamSource(new MediaStream(live));
          node.connect(mixDest);
          return node;
        };
        _localSourceNode = mixIn(localStream);
        _remoteSourceNode = mixIn(remoteStream);
        recordedStream = mixDest.stream;
      }

      _mimeType = _bestMimeType(mode === "p2p");
      _mediaRecorder = new MediaRecorder(
        recordedStream,
        _mimeType ? { mimeType: _mimeType } : {}
      );

      _mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) _pendingBlobs.push(e.data);
      };

      _mediaRecorder.onerror = (e) => {
        const msg = e.error?.message || "Unknown MediaRecorder error";
        recordingError.value = msg;
        console.error("[Recording] MediaRecorder error:", msg);
      };

      _mediaRecorder.start(1000); isRecording.value = true;

      if (!_silent && _notifyPeer && recordingTrigger === "manual") {
        _notifyPeer({ type: "recordingState", value: true });
      }

    } catch (e) {
      recordingError.value = e.message;
      isRecording.value = false;
      _teardownAudio();_teardownTabCapture();
      console.error("[Recording] startRecording failed:", e);
    }
  }

  function updateRemoteStream(newRemoteStream) {
    if (!_audioCtx || !isRecording.value) return;
    try { _remoteSourceNode?.disconnect(); } catch (_) {}
    _remoteSourceNode = null;
    if (newRemoteStream && _mixDest) {
      const live = newRemoteStream.getAudioTracks().filter(t => t.readyState === "live");
      if (live.length) {
        const node = _audioCtx.createMediaStreamSource(new MediaStream(live));
        node.connect(_mixDest); _remoteSourceNode = node;
      }
    }
  }

  async function stopAndUploadRecording() {
    if (!isRecording.value || !_mediaRecorder) {
      console.warn("[Recording] Not recording — ignoring stop()");
      return [];
    }
    isRecording.value = false;

    return new Promise((resolve) => {
      let settled = false;
      const finish = async () => {
        if (settled) return;
        settled = true;
        await _flush();_teardownAudio();_teardownTabCapture();
        if (!_silent && _notifyPeer && recordingTrigger === "manual") {
          _notifyPeer({ type: "recordingState", value: false });
        }
        _mediaRecorder = null;
        _notifyPeer    = null;
        resolve([...uploadedUrls.value]);
      };
      _mediaRecorder.onstop = finish;
      setTimeout(() => {
        if (!settled) {
          console.warn("[Recording] onstop timeout — finishing manually");
          finish();
        }
      }, 4000);

      try { _mediaRecorder.requestData(); } catch (_) {}
      try { _mediaRecorder.stop(); } catch (_) {}
    });
  }

  return {
    isRecording,
    isUploading,
    recordingError,
    uploadedUrls,
    startRecording,
    stopAndUploadRecording,
    updateRemoteStream,
    updateScreenStream,
    updateScreenShareOwner,
    recordingTrigger,
    mode,
  };
}