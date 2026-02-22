<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAuth, signInAnonymously } from 'firebase/auth'
import HomeScreen from './components/HomeScreen.vue'
import TeacherDashboard from './components/TeacherDashboard.vue'
import StudentGame from './components/StudentGame.vue'
import { firebaseApp } from './config/firebase'

// Initialize auth with the app
const auth = getAuth(firebaseApp)

type Screen = 'home' | 'teacher' | 'student'

const currentScreen = ref<Screen>('home')
const sessionId = ref<string>('')
const playerId = ref<string>('')
const username = ref<string>('')

onMounted(async () => {
  // Sign in anonymously for Firestore access
  try {
    await signInAnonymously(auth)
  } catch (error) {
    console.error('Auth error:', error)
  }

  // Check if there's a saved session in localStorage
  const savedSessionId = localStorage.getItem('kampen_sessionId')
  const savedPlayerId = localStorage.getItem('kampen_playerId')
  const savedUsername = localStorage.getItem('kampen_username')

  if (savedSessionId && savedPlayerId && savedUsername) {
    sessionId.value = savedSessionId
    playerId.value = savedPlayerId
    username.value = savedUsername
    currentScreen.value = 'student'
  }
})

function handleTeacherClick() {
  currentScreen.value = 'teacher'
}

function handleStudentJoin(data: { sessionId: string; playerId: string; username: string }) {
  sessionId.value = data.sessionId
  playerId.value = data.playerId
  username.value = data.username
  currentScreen.value = 'student'

  // Save to localStorage so user can rejoin if they close the browser
  localStorage.setItem('kampen_sessionId', data.sessionId)
  localStorage.setItem('kampen_playerId', data.playerId)
  localStorage.setItem('kampen_username', data.username)
}

function handleBackToHome() {
  currentScreen.value = 'home'
  sessionId.value = ''
  playerId.value = ''
  // Clear localStorage when going back
  localStorage.removeItem('kampen_sessionId')
  localStorage.removeItem('kampen_playerId')
  localStorage.removeItem('kampen_username')
}
</script>

<template>
  <div class="app">
    <HomeScreen
      v-if="currentScreen === 'home'"
      @teacher-click="handleTeacherClick"
      @student-join="handleStudentJoin"
    />
    <TeacherDashboard v-else-if="currentScreen === 'teacher'" @back="handleBackToHome" />
    <StudentGame
      v-else-if="currentScreen === 'student'"
      :session-id="sessionId"
      :player-id="playerId"
      :username="username"
      @back="handleBackToHome"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  width: 100%;
}
</style>