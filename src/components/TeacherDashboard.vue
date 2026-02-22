<script setup lang="ts">
import { ref, computed } from 'vue'
const copyStatus = ref('');
function handleCopyLink() {
  const link = `ofstad.co/kampen#${sessionCode.value}`;
  // Try clipboard API, fallback to execCommand
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(link).then(() => {
      copyStatus.value = 'Copied!';
      setTimeout(() => (copyStatus.value = ''), 1200);
    });
  } else {
    const input = document.createElement('input');
    input.value = link;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    copyStatus.value = 'Copied!';
    setTimeout(() => (copyStatus.value = ''), 1200);
  }
}
import { createSession, subscribeToSession, advanceRound, startRound, setVotingEnabled } from '@/utils/firestore'
async function handleShowVoting() {
  if (!sessionId.value) return;
  await setVotingEnabled(sessionId.value, true);
}
import { defaultGameConfig } from '@/config/gameConfigs'
import type { SessionState } from '@/types/game'
import Leaderboard from './Leaderboard.vue'

defineEmits<{
  back: []
}>()

const sessionId = ref<string>('')
const sessionCode = ref<string>('')
const session = ref<SessionState | null>(null)
const isCreated = ref(false)
const loading = ref(false)
const unsubscribe = ref<(() => void) | null>(null)

async function createNewSession() {
  loading.value = true
  try {
    const id = await createSession(defaultGameConfig, 'teacher')
    sessionId.value = id
    sessionCode.value = id
    isCreated.value = true

    // Subscribe to session updates
    unsubscribe.value = subscribeToSession(id, (updatedSession: SessionState) => {
      session.value = updatedSession
    })
  } catch (error) {
    console.error('Failed to create session:', error)
  } finally {
    loading.value = false
  }
}

async function handleStartRound() {
  if (!sessionId.value) return
  try {
    await startRound(sessionId.value)
  } catch (error) {
    console.error('Failed to start round:', error)
  }
}

async function handleAdvanceRound() {
  if (!sessionId.value) return
  try {
    await advanceRound(sessionId.value)
  } catch (error) {
    console.error('Failed to advance round:', error)
  }
}

const currentRoundConfig = computed(() => {
  if (!session.value) return null
  return session.value.gameConfig.rounds[session.value.currentRound - 1]
})

const allSubmitted = computed(() => {
  if (!session.value || !currentRoundConfig.value) return false
  const roundChoices = session.value.roundChoices[session.value.currentRound] || {}
  return Object.keys(session.value.players).length > 0 &&
    Object.keys(roundChoices).length === Object.keys(session.value.players).length
})
</script>

<template>
  <div class="teacher-dashboard">
    <header class="header">
      <h1>Host Panel</h1>
      <button class="btn-back" @click="$emit('back')">← Back</button>
    </header>

    <div class="container">
      <div v-if="!isCreated" class="setup-section">
        <h2>Create a game session</h2>
        <button class="btn btn-primary" @click="createNewSession" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create New Session' }}
        </button>
      </div>

      <div v-else class="game-section">
        <div class="session-info">
          <h2>Session Code: <span class="code">{{ sessionCode }}</span></h2>
          <p>Share this code with players to join the game</p>
          <div class="invite-link-row">
            <input
              class="invite-link-input"
              :value="`ofstad.co/kampen#${sessionCode}`"
              readonly
              @focus="(e) => { const t = e.target as HTMLInputElement | null; if (t) t.select(); }"
            />
            <button class="btn btn-primary" @click="handleCopyLink">Copy Link</button>
            <span
              v-if="copyStatus"
              class="copy-status"
              :style="{ color: '#222', background: '#fff', border: '1.5px solid #bbb', borderRadius: '4px', padding: '2px 6px', marginLeft: '8px', fontSize: '0.95em', display: 'inline-block', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }"
            >
              {{ copyStatus }}
            </span>
          </div>
        </div>

        <div v-if="session" class="game-state">
          <div class="info-box">
            <p><strong>Round:</strong> {{ session.currentRound }}/{{ session.gameConfig.rounds.length }}</p>
            <p><strong>Players:</strong> {{ Object.keys(session.players).length }}</p>
            <p><strong>Status:</strong> {{ session.status }}</p>
          </div>

          <div v-if="currentRoundConfig" class="round-config">
            <h3>Current Round Configuration</h3>
            <p><strong>Safe Points (guaranteed):</strong> {{ currentRoundConfig.lowScore }}</p>
            <p><strong>Risky Points (if threshold not exceeded):</strong> {{ currentRoundConfig.highScore }}</p>
            <p><strong>Threshold:</strong> If more than {{ currentRoundConfig.threshold }} choose risky, they get 0</p>
            <p v-if="currentRoundConfig.description" class="description">
              {{ currentRoundConfig.description }}
            </p>
          </div>

          <div class="controls">
            <button
              v-if="session.status === 'waiting'"
              class="btn btn-success"
              @click="handleStartRound"
            >
              Start Round
            </button>
            <button
              v-if="session.status === 'playing' && !session.votingEnabled"
              class="btn btn-warning"
              @click="handleShowVoting"
            >
              Show Voting
            </button>
            <button
              v-if="session.status === 'playing' && allSubmitted"
              class="btn btn-primary"
              @click="handleAdvanceRound"
            >
              Calculate Scores & Next Round
            </button>
            <p v-if="session.status === 'playing' && !allSubmitted" class="waiting">
              ⏳ Waiting for {{ Object.keys(session.players).length - Object.keys(session.roundChoices[session.currentRound] || {}).length }} players to submit...
            </p>
          </div>

          <Leaderboard v-if="session" :session="session" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.teacher-dashboard {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 8px 16px;
  gap: 12px;
  width: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
}

.header h1 {
  margin: 0;
  font-size: 1.2em;
  font-weight: 600;
  flex-shrink: 0;
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  padding: 0 16px;
  overflow-y: auto;
  flex: 1;
  box-sizing: border-box;
}

.setup-section,
.game-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.setup-section h2,
.game-section h2 {
  color: #333;
  margin: 0 0 12px 0;
  font-size: 1em;
  font-weight: 600;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-block;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-primary:disabled {
  background: #aaa;
  cursor: not-allowed;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover {
  background: #229954;
}

.session-info {
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 5px;
  margin-bottom: 12px;
  border-left: 3px solid #667eea;
}

.session-info h2 {
  margin: 0 0 6px 0;
  color: #333;
  font-size: 0.95em;
  font-weight: 600;
}

.session-info p {
  margin: 4px 0;
  color: #555;
  font-size: 0.85em;
}

.code {
  font-family: 'Courier New', monospace;
  font-size: 1em;
  background: white;
  padding: 4px 8px;
  border-radius: 3px;
  color: #667eea;
  font-weight: 600;
}

.game-state {
  margin-top: 12px;
}

.info-box {
  background: #f5f7fa;
  padding: 10px 12px;
  border-radius: 5px;
  margin-bottom: 12px;
  border-left: 3px solid #667eea;
}

.info-box p {
  margin: 4px 0;
  color: #333;
  font-size: 0.9em;
}

.info-box strong {
  color: #222;
}

.round-config {
  background: #f0f2f9;
  padding: 12px;
  border-radius: 5px;
  margin: 12px 0;
  border-left: 3px solid #667eea;
}

.round-config h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 0.95em;
  font-weight: 600;
}

.round-config p {
  margin: 4px 0;
  color: #555;
  font-size: 0.85em;
}

.description {
  font-style: italic;
  color: #666;
  font-size: 0.85em;
}

.controls {
  margin: 12px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.controls button {
  flex: 1;
  min-width: 120px;
}

.waiting {
  color: #ff9800;
  font-weight: 600;
  font-size: 0.9em;
}
</style>
/* Copy status feedback */
.copy-status {
  color: #222 !important;
  background: #fff !important;
  font-size: 0.95em;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1.5px solid #bbb !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  display: inline-block;
}
/* Invite link styles moved here */
.invite-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.invite-link-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  background: #f8f9fa;
  color: #333;
}
