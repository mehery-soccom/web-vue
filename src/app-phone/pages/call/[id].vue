<script setup>
import { Icon } from '@iconify/vue'
import { onMounted, onUnmounted, ref, computed } from "vue";
import { useWebRTC } from "@/app-phone/composables/useWebRTC";
import { useRoute, useRouter } from "vue-router";

onMounted(async () => {
  console.log("channel list")
});

const route = useRoute();
const router = useRouter();
const roomId = route.params.id;
const userName = ref("");
const hasJoined = ref(false);

onUnmounted(() => {

});
</script>

<template>
  <div class="call-container">
    <div v-if="hasJoined">
      <h1>Set Up Your Meeting Room</h1>
      <div class="staging">
        <div class="left-conatiner">
          <div class="video-preview">
            <video id="local-video" autoplay muted playsinline></video>
            <div class="controls">
              <button @click="toggleCamera">
                <Icon :icon="Camera ? 'tabler:video' : 'tabler:video-off'" />
              </button>

              <button @click="toggleMic">
                <Icon :icon="Mic ? 'tabler:microphone' : 'tabler:microphone-off'" />
              </button>
            </div>
          </div>
        </div>
        <div class="right-container">
          <label for="userName">Enter Name</label>
          <input type="text" placeholder="Enter Name" v-model="userName" id="userName" />

          <div class="buttons">
            <button class="btn-cancel" @click="handleLeave">Cancel</button>
            <button class="btn-join" @click="handleJoin">Join Call</button>
          </div>
        </div>

      </div>

    </div>

    <div v-else class="room">
      <video id="remote-video" autoplay playsinline class="main-video"></video>

      <div class="pip-wrapper">
        <video id="local-video-pip" autoplay muted playsinline class="pip-video"></video>
        <span>You</span>
      </div>
      <div class="controls">
        <button @click="toggleCamera">
          <Icon :icon="Camera ? 'tabler:video' : 'tabler:video-off'" />
        </button>

        <button @click="toggleMic">
          <Icon :icon="Mic ? 'tabler:microphone' : 'tabler:microphone-off'" />
        </button>

        <button @click="toggleScreenShare">
          <Icon :icon="ScreenShare ? 'tabler:screen-share' : 'tabler:screen-share-off'" />
        </button>

        <button @click="handleLeave" class="btn-leave">
          <Icon icon="tabler:phone-off" />
        </button>
      </div>
    </div>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden !important;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.call-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #b3cae8, #e9edf3);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.staging {
  display: flex;
  gap: 32px;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(26, 115, 232, 0.15);
}

.left-conatiner {
  width: 100%;
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

.controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
}

.controls button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #1a73e8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s ease;
}

.controls button:hover {
  background: #1557b0;
}

.buttons {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #1a73e8;
  color: #1a73e8;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #b3cae8;
}

.btn-join {
  background: #1a73e8;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-join:hover {
  background: #1557b0;
}

</style>
