<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { startRound } from '@/utils/firestore'
import { submitChoice, subscribeToSession } from '@/utils/firestore'
import type { SessionState } from '@/types/game'
import Leaderboard from './Leaderboard.vue'

const props = defineProps<{
  sessionId: string
  playerId: string
  username: string
}>()

defineEmits<{
  back: []
}>()

const session = ref<SessionState | null>(null)
const selectedChoice = ref<'low' | 'high' | null>(null)
const hasSubmitted = ref(false)
const isSubmitting = ref(false)
const unsubscribe = ref<(() => void) | null>(null)
const showRoundComplete = ref(false)
const isHost = computed(() => session.value?.createdBy === props.playerId)
watch(
  () => session.value && session.value.status === 'playing' && allSubmitted(),
  async (done) => {
    if (done) {
      showRoundComplete.value = true
      await nextTick()
    } else {
      showRoundComplete.value = false
    }
  }
)

function allSubmitted() {
  if (!session.value) return false
  const roundChoices = session.value.roundChoices[session.value.currentRound] || {}
  return Object.keys(session.value.players).length > 0 &&
    Object.keys(roundChoices).length === Object.keys(session.value.players).length
}

async function handleStartRound() {
  if (!session.value) return
  await startRound(session.value.id)
  showRoundComplete.value = false
}

onMounted(async () => {
  if (props.sessionId) {
    unsubscribe.value = subscribeToSession(props.sessionId, (updatedSession: SessionState) => {
      session.value = updatedSession
      checkIfSubmitted()
    })
  }
})

onUnmounted(() => {
  if (unsubscribe.value) {
    unsubscribe.value()
  }
})

function checkIfSubmitted() {
  if (!session.value) return
  const roundNum = session.value.currentRound
  const roundChoices = session.value.roundChoices[roundNum] || {}
  hasSubmitted.value = props.playerId in roundChoices
  if (hasSubmitted.value) {
    const choice = roundChoices[props.playerId]
    if (choice === 'low' || choice === 'high') {
      selectedChoice.value = choice
    }
  }
}

async function submitRoundChoice() {
  if (!selectedChoice.value || !session.value) return;
  isSubmitting.value = true;
  try {
    await submitChoice(
      session.value.id,
      props.playerId,
      session.value.currentRound,
      selectedChoice.value
    );
  } catch (error) {
    console.error('Failed to submit choice:', error);
  } finally {
    isSubmitting.value = false;
  }
}

const currentRoundConfig = computed(() => {
  if (!session.value) return null
  return session.value.gameConfig.rounds[session.value.currentRound - 1]
})

const gameFinished = computed(() => {
  return session.value?.status === 'finished'
})

const finalScores = computed(() => {
  if (!session.value) return []
  const players = Object.values(session.value.players)
  return players
    .map((p: any) => ({
      username: p.username,
      totalScore: p.totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
})
</script>

<template>
  <div class="student-game">
    <header class="header">
      <div>
        <h1>{{ session?.gameConfig.gameName || 'Loading...' }}</h1>
        <p class="username">Playing as: {{ username }}</p>
      </div>
      <button class="btn-back" @click="$emit('back')">← Back</button>
    </header>

    <div class="container" :class="{ 'round-complete': showRoundComplete }">
      <div v-if="session">
        <!-- Game Finished -->
        <div v-if="gameFinished" class="finished-section">
          <h2>🎉 Game Over!</h2>
          <p>Final Results:</p>
          <div class="final-scores">
            <div v-for="(entry, index) in finalScores" :key="index" class="score-entry">
              <span class="rank">{{ index + 1 }}.</span>
              <span class="name">{{ entry.username }}</span>
              <span class="score">{{ entry.totalScore }} pts</span>
            </div>
          </div>
        </div>

        <!-- Game Active -->
        <div v-else>
          <!-- Round Complete Screen -->
          <div v-if="showRoundComplete" class="round-complete-section">
            <h2 class="round-complete-title">Round Complete!</h2>
            <Leaderboard v-if="session" :session="session" />
            <button v-if="isHost && session.status === 'waiting'" class="btn btn-primary" @click="handleStartRound">Next Round</button>
            <p v-else class="waiting-host-msg">Waiting for host to start next round...</p>
          </div>
          <div class="status-bar">
            <div class="progress">
              <span>Round {{ session.currentRound }}/{{ session.gameConfig.rounds.length }}</span>
              <div class="bar">
                <div
                  class="fill"
                  :style="{ width: `${(session.currentRound / session.gameConfig.rounds.length) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Waiting to Start -->
          <div v-if="session.status === 'waiting' && !showRoundComplete" class="waiting-section">
            <h2>⏳ Waiting for the host to start the round</h2>
            <p>{{ Object.keys(session.players).length }} players have joined</p>
          </div>

          <!-- Round Active -->
          <div v-else-if="session.status === 'playing' && currentRoundConfig && !showRoundComplete" class="round-section">
            <div class="round-config">
              <h2>Round {{ session.currentRound }}</h2>
              <p v-if="currentRoundConfig.description" class="description">
                {{ currentRoundConfig.description }}
              </p>
            </div>
            <div v-if="session.votingEnabled">
              <div v-if="!hasSubmitted" class="choice-section">
                <h3>Make your choice:</h3>
                <div class="choice-buttons">
                  <button
                    class="choice-btn low-btn"
                    :class="{ active: selectedChoice === 'low' }"
                    @click="selectedChoice = 'low'"
                  >
                    <span class="label">Safe Choice</span>
                    <span class="points">+{{ currentRoundConfig.lowScore }} points</span>
                  </button>
                  <button
                    class="choice-btn high-btn"
                    :class="{ active: selectedChoice === 'high' }"
                    @click="selectedChoice = 'high'"
                  >
                    <span class="label">Risky Choice</span>
                    <span class="points">+{{ currentRoundConfig.highScore }} points</span>
                  </button>
                </div>
                <button
                  class="btn btn-submit"
                  @click="submitRoundChoice"
                  :disabled="!selectedChoice || isSubmitting"
                >
                  {{ isSubmitting ? 'Submitting...' : 'Submit Choice' }}
                </button>
              </div>
              <div v-else class="submitted">
                <p class="success">✓ You chose the <strong>{{ selectedChoice === 'low' ? 'safe' : 'risky' }}</strong> option</p>
                <p class="waiting-others">Waiting for other players to submit...</p>
              </div>
            </div>
            <div v-else class="waiting-voting">
              <p class="waiting-others">Waiting for host to enable voting...</p>
            </div>
          </div>

          <Leaderboard v-if="session && !showRoundComplete" :session="session" />
        </div>
      </div>

      <div v-else class="loading">
        <p>Laster inn spill-sesjonen...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-game {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 100vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  padding: 16px 24px 0 24px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  padding: 0 16px;
}
.container.round-complete {
  background: #f8f9fa;
}

@media (max-width: 600px) {
  .header {
    padding: 12px 8px 0 8px;
  }
  .container {
    padding: 0 4vw;
  }
}

@media (max-width: 600px) {
  .container {
    padding-left: 4vw;
    padding-right: 4vw;
  }
}

.round-complete-section {
  }
  .waiting-host-msg {
    color: #222;
    font-size: 1.1rem;
    margin-top: 1.5rem;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 32px 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  text-align: center;
  margin: 24px 0;
}

.round-complete-title {
  color: #222;
  font-size: 2rem;
  margin-bottom: 1.5rem;
}


.status-bar {
  background: white;
  padding: 20px;
  border-radius: 10px 10px 0 0;
  margin-bottom: 0;
}

.progress {
  display: flex;
  align-items: center;
  gap: 15px;
}

.progress span {
  font-weight: bold;
  color: #333;
  min-width: 60px;
}

.bar {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: #667eea;
  transition: width 0.3s ease;
}

.waiting-section,
.round-section,
.finished-section {
  background: white;
  border-radius: 0 0 10px 10px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.waiting-section h2,
.round-section h2,
.finished-section h2 {
  color: #333;
  margin-top: 0;
}

.round-config {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 30px;
  border-left: 4px solid #667eea;
}

.round-config p {
  margin: 10px 0;
  color: #555;
}

.description {
  font-style: italic;
  color: #666;
  font-size: 0.95em;
}

.options {
  background: white;
  padding: 15px;
  border-radius: 5px;
  margin-top: 15px;
}

.options p {
  margin: 10px 0;
  color: #333;
}

.choice-section {
  margin: 30px 0;
}

.choice-section h3 {
  color: #333;
  margin-bottom: 20px;
}

.choice-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.choice-btn {
  padding: 25px;
  border: 3px solid #ddd;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
}

.low-btn {
  border-color: #27ae60;
  color: #27ae60;
}

.low-btn.active {
  background: #27ae60;
  color: white;
}

.high-btn {
  border-color: #e74c3c;
  color: #e74c3c;
}

.high-btn.active {
  background: #e74c3c;
  color: white;
}

.label {
  font-weight: bold;
  font-size: 1.1em;
  color: inherit;
}

.points {
  font-size: 1.3em;
  font-weight: bold;
  color: inherit;
}

.btn-submit {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-submit:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
}

.btn-submit:disabled {
  background: #aaa;
  cursor: not-allowed;
}

.submitted {
  text-align: center;
  padding: 30px;
  background: #e8f5e9;
  border-radius: 5px;
}

.success {
  color: #27ae60;
  font-size: 1.2em;
  margin: 0;
}

.waiting-others {
  color: #666;
  margin-top: 10px;
}

.finished-section {
  text-align: center;
}

.final-scores {
  margin-top: 30px;
}

.score-entry {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 5px;
  margin-bottom: 10px;
  justify-content: space-between;
}

.rank {
  font-weight: bold;
  color: #667eea;
  font-size: 1.2em;
  min-width: 40px;
}

.name {
  flex: 1;
  text-align: left;
  color: #333;
}

.score {
  font-weight: bold;
  color: #27ae60;
  font-size: 1.1em;
}

.loading {
  text-align: center;
  color: white;
  padding: 40px;
}
</style>
