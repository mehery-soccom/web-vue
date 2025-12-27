<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import { useWebRTC } from "@/app-phone/composables/useWebRTC";

onMounted(async () => {
  console.log("channel list")
});

onUnmounted(() => {
  
});
</script>

<template>
  <div class="container">
    <div>Hello</div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden !important;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.container {
  overflow: hidden !important;
  width: 100%;
  /* height: 100%; */
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(180deg, #f7f9fb, #e9edf3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.webrtc-client {
  width: 300px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 25px;
  backdrop-filter: blur(8px);
  box-shadow: 10px 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style>
