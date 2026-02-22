<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from '../composables/useGame'
import Leaderboard from './Leaderboard.vue'

const emit = defineEmits<{ (e: 'exit'): void }>()

const { gameState, sortedPlayers, error, loading, createGame, startRound, endRound, nextRound, OPTION_B_MAX_PLAYERS } = useGame()

const totalRoundsInput = ref(5)
const gameCode = ref<string | null>(null)

async function handleCreate() {
  gameCode.value = await createGame(totalRoundsInput.value)
}

function copyCode() {
  if (gameCode.value) {
    navigator.clipboard.writeText(gameCode.value)
  }
}

const bCount = computed(() => {
  if (!gameState.value) return 0
  return Object.values(gameState.value.choices).filter((c) => c === 'B').length
})
const aCount = computed(() => {
  if (!gameState.value) return 0
  return Object.values(gameState.value.choices).filter((c) => c === 'A').length
})
</script>

<template>
  <div class="host">
    <!-- Create game screen -->
    <div v-if="!gameCode" class="create-form card">
      <h2>🎮 Lag nytt spill</h2>
      <label>
        Antall runder
        <input v-model.number="totalRoundsInput" type="number" min="1" max="20" />
      </label>
      <p class="rules-hint">
        <strong>Regler:</strong> Alternativ A gir alltid 1 poeng. Alternativ B gir 5 poeng —
        men bare hvis maks {{ OPTION_B_MAX_PLAYERS }} spillere velger B. Ellers gir B 0 poeng.
      </p>
      <button :disabled="loading" @click="handleCreate" class="btn-primary">
        {{ loading ? 'Oppretter...' : 'Opprett spill' }}
      </button>
      <button class="btn-secondary" @click="emit('exit')">← Tilbake</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <!-- Game lobby / active game -->
    <template v-else-if="gameState">
      <div class="game-header">
        <div class="code-badge">
          Spillkode: <strong>{{ gameState.code }}</strong>
          <button class="copy-btn" @click="copyCode" title="Kopier kode">📋</button>
        </div>
        <div class="round-info">
          Runde {{ gameState.currentRound }} / {{ gameState.totalRounds }}
        </div>
      </div>

      <div class="main-layout">
        <div class="left-panel">
          <!-- LOBBY -->
          <div v-if="gameState.status === 'lobby'" class="card">
            <h3>Venter på spillere…</h3>
            <p>Del koden <strong>{{ gameState.code }}</strong> med spillerne.</p>
            <ul class="joined-list">
              <li v-for="p in sortedPlayers" :key="p.id">{{ p.name }}</li>
              <li v-if="sortedPlayers.length === 0" class="muted">Ingen har blitt med ennå.</li>
            </ul>
            <button
              :disabled="sortedPlayers.length === 0"
              class="btn-primary"
              @click="startRound"
            >
              Start runde 1
            </button>
            <button class="btn-secondary" @click="emit('exit')">Avslutt</button>
          </div>

          <!-- CHOOSING -->
          <div v-else-if="gameState.status === 'choosing'" class="card">
            <h3>Runde {{ gameState.currentRound }} pågår</h3>
            <div class="choice-stats">
              <div class="stat">
                <span class="stat-label">Valgte A</span>
                <span class="stat-value">{{ aCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Valgte B</span>
                <span class="stat-value">{{ bCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Totalt</span>
                <span class="stat-value">{{ aCount + bCount }} / {{ sortedPlayers.length }}</span>
              </div>
            </div>
            <p class="muted">
              B gir 5 poeng hvis maks {{ OPTION_B_MAX_PLAYERS }} velger det
              ({{ bCount }} har valgt B så langt).
            </p>
            <button class="btn-primary" @click="endRound">Avslutt runde</button>
          </div>

          <!-- RESULTS -->
          <div v-else-if="gameState.status === 'results'" class="card">
            <h3>Runderesultater – Runde {{ gameState.currentRound }}</h3>
            <div class="choice-stats">
              <div class="stat">
                <span class="stat-label">Valgte A</span>
                <span class="stat-value">{{ aCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Valgte B</span>
                <span class="stat-value">{{ bCount }}</span>
              </div>
            </div>
            <p v-if="bCount <= OPTION_B_MAX_PLAYERS" class="result-good">
              ✅ B ga 5 poeng ({{ bCount }} ≤ {{ OPTION_B_MAX_PLAYERS }} spillere)
            </p>
            <p v-else class="result-bad">
              ❌ B ga 0 poeng ({{ bCount }} > {{ OPTION_B_MAX_PLAYERS }} spillere)
            </p>
            <button
              class="btn-primary"
              @click="nextRound"
            >
              {{ gameState.currentRound >= gameState.totalRounds ? 'Vis sluttresultat' : 'Neste runde' }}
            </button>
          </div>

          <!-- FINISHED -->
          <div v-else-if="gameState.status === 'finished'" class="card">
            <h3>🎉 Spillet er ferdig!</h3>
            <p>Se ledertavlen for endelig resultat.</p>
            <button class="btn-secondary" @click="emit('exit')">Nytt spill</button>
          </div>
        </div>

        <div class="right-panel">
          <Leaderboard
            :players="sortedPlayers"
            :round-results="gameState.status === 'results' || gameState.status === 'finished' ? gameState.roundResults : undefined"
          />
        </div>
      </div>
    </template>

    <!-- Loading state after code assigned -->
    <div v-else class="card">
      <p>Kobler til spill…</p>
    </div>
  </div>
</template>

<style scoped>
.host {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.code-badge {
  background: #2a2a3e;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
}

.round-info {
  color: #888;
}

.main-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.left-panel {
  flex: 1;
  min-width: 260px;
}

.right-panel {
  flex: 0 0 300px;
}

.card {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #aaa;
}

.create-form input {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #444;
  background: #2a2a3e;
  color: inherit;
  font-size: 1rem;
  width: 80px;
}

.rules-hint {
  font-size: 0.85rem;
  color: #aaa;
  background: #2a2a3e;
  padding: 0.75rem;
  border-radius: 8px;
  line-height: 1.5;
}

.choice-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  flex: 1;
  background: #2a2a3e;
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.joined-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 200px;
  overflow-y: auto;
}

.joined-list li {
  background: #2a2a3e;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
}

.muted {
  color: #888;
  font-size: 0.9rem;
}

.result-good {
  color: #a3e635;
  font-weight: 600;
}

.result-bad {
  color: #f87171;
  font-weight: 600;
}

.btn-primary {
  background: #5865f2;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #4752c4;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: #aaa;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.btn-secondary:hover {
  color: #fff;
  border-color: #888;
}

.error {
  color: #f87171;
  font-size: 0.9rem;
}
</style>
