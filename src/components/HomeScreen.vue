<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { joinSession } from '@/utils/firestore'

const emit = defineEmits<{
  teacherClick: []
  studentJoin: [data: { sessionId: string; playerId: string; username: string }]
}>()

const isStudent = ref(false)
const joinSessionId = ref('')
const sessionCodeLocked = ref(false)

function checkHashForSession() {
  const hash = window.location.hash.replace('#', '').trim();
  if (hash.length > 0) {
    joinSessionId.value = hash;
    sessionCodeLocked.value = true;
    isStudent.value = true;
  }
}

onMounted(() => {
  checkHashForSession();
  window.addEventListener('hashchange', checkHashForSession);
});

// Clean up event listener if component is destroyed
import { onUnmounted } from 'vue';
onUnmounted(() => {
  window.removeEventListener('hashchange', checkHashForSession);
});
const studentUsername = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleStudentJoin() {
  if (!joinSessionId.value.trim() || !studentUsername.value.trim()) {
    errorMessage.value = 'Please enter session code and username'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const playerId = await joinSession(joinSessionId.value, studentUsername.value)
    emit('studentJoin', {
      sessionId: joinSessionId.value,
      playerId,
      username: studentUsername.value,
    })
  } catch (error) {
    console.error('Join session error:', error)
    errorMessage.value = 'Failed to join session. Check the code and try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="home-screen">
    <div class="container">
      <h1>Kampen</h1>
      <p class="subtitle">Naturtilstanden</p>

      <div class="button-group">
        <button class="btn btn-teacher" @click="$emit('teacherClick')">
          👨‍🏫 Host
        </button>
        <button class="btn btn-student" @click="isStudent = !isStudent">
          👨‍🎓 Join
        </button>
      </div>

      <div v-if="isStudent" class="join-form">
        <h2>Join a game session</h2>
        <input
          v-model="joinSessionId"
          type="text"
          placeholder="Enter session code"
          class="input"
          :readonly="sessionCodeLocked"
          :disabled="sessionCodeLocked"
          @keyup.enter="handleStudentJoin"
        />
        <input
          v-model="studentUsername"
          type="text"
          placeholder="Enter your username"
          class="input"
          @keyup.enter="handleStudentJoin"
        />
        <button class="btn btn-join" @click="handleStudentJoin" :disabled="isLoading">
          {{ isLoading ? 'Joining...' : 'Join Session' }}
        </button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-screen {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 100%;
}

.container {
  background: white;
  border-radius: 10px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}

h1 {
  margin: 0 0 10px;
  color: #333;
  font-size: 2.5em;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
  font-size: 1.1em;
}

.button-group {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.btn {
  flex: 1;
  padding: 15px 20px;
  border: none;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-teacher {
  background: #667eea;
  color: white;
}

.btn-teacher:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

.btn-student {
  background: #764ba2;
  color: white;
}

.btn-student:hover {
  background: #653a8a;
  transform: translateY(-2px);
}

.join-form {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.join-form h2 {
  color: #333;
  margin-top: 0;
}

.input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

.btn-join {
  width: 100%;
  background: #667eea;
  color: white;
  padding: 12px;
}

.btn-join:hover {
  background: #5568d3;
}

.error {
  color: #e74c3c;
  margin-top: 10px;
}
</style>
