<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
let meetingIdInput = ref('');

const startInstantMeeting = () => {
  const roomId = Math.random().toString(36).substring(2, 10);
  router.push({ name: 'call-id', params: { id: roomId } });
};
const isValidValue = computed(() => {
  return meetingIdInput.value.trim().length >= 8;
})

const joinMeeting = () => {
  if (!isValidValue) return;
  router.push({ name: 'call-id', params: { id: meetingIdInput.value } });
};
</script>

<template>
  <div class="landing-container">
    <div class="card">
      <h1>Start Call</h1>

      <div class="actions">
        <button class="btn-primary" @click="startInstantMeeting">
          <span>+</span> Start Instant Call
        </button>

        <div class="join-box">
          <input v-model="meetingIdInput" type="text" placeholder="Enter code to join" />
          <button class="btn-text" :class="{ 'btn-text-active': isValidValue }" :disabled="!isValidValue"
            @click="joinMeeting">
            Join
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #b3cae8 100%);
}

.card {
  background: white;
  padding: 2.5rem;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  text-align: left;
  max-width: 450px;
  width: 100%;
}

h1 {
  font-size: 2.5rem;
  color: #1a1a1a;
  margin-bottom: 2rem;
  text-align: center;
}

p {
  color: #666;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.btn-primary {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: 0.2s;
}

.btn-primary:hover {
  background: #1557b0;
}

.join-box {
  display: flex;
}

input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px 0px 0px 8px;
  font-size: 1rem;
  outline: none;
}

input:focus {
  border-color: #1a73e8;
}

.btn-text {
  background: #e5e7eb;
  color: #9ca3af;
  border: none;
  font-weight: 600;
  cursor: not-allowed;
  padding: 0 1rem;
  border-radius: 0 8px 8px 0;
  transition: all 0.2s ease;
}

.btn-text-active {
  background: #1a73e8;
  color: white;
  cursor: pointer;
}

.btn-text-active:hover {
  background: #1557b0;
}
</style>