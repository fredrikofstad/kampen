<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from '../composables/useGame'
import Leaderboard from './Leaderboard.vue'

const emit = defineEmits<{ (e: 'exit'): void }>()

const {
  gameState,
  playerId,
  myPlayer,
  myChoice,
  sortedPlayers,
  error,
  loading,
  joinGame,
  submitChoice,
  OPTION_A_POINTS,
  OPTION_B_POINTS,
  OPTION_B_MAX_PLAYERS,
} = useGame()

const codeInput = ref('')
const nameInput = ref('')
const joined = ref(false)

async function handleJoin() {
  if (!codeInput.value.trim() || !nameInput.value.trim()) return
  await joinGame(codeInput.value, nameInput.value)
  if (!error.value) {
    joined.value = true
  }
}

async function handleChoice(choice: 'A' | 'B') {
  await submitChoice(choice)
}
</script>

<template>
  <div class="player">
    <!-- Join form -->
    <div v-if="!joined" class="card">
      <h2>🎮 Bli med i spill</h2>
      <div class="field">
        <label>Spillkode</label>
        <input
          v-model="codeInput"
          placeholder="F.eks. AB3C"
          maxlength="4"
          @keyup.enter="handleJoin"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="field">
        <label>Ditt navn</label>
        <input
          v-model="nameInput"
          placeholder="Skriv inn navn"
          maxlength="24"
          @keyup.enter="handleJoin"
        />
      </div>
      <button :disabled="loading || !codeInput.trim() || !nameInput.trim()" class="btn-primary" @click="handleJoin">
        {{ loading ? 'Kobler til…' : 'Bli med' }}
      </button>
      <button class="btn-secondary" @click="emit('exit')">← Tilbake</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <!-- In-game view -->
    <template v-else-if="gameState">
      <div class="game-header">
        <span class="code-badge">Kode: <strong>{{ gameState.code }}</strong></span>
        <span class="player-name">{{ myPlayer?.name ?? 'Ukjent' }}</span>
        <span class="round-info">Runde {{ gameState.currentRound }} / {{ gameState.totalRounds }}</span>
      </div>

      <div class="main-layout">
        <div class="left-panel">
          <!-- LOBBY -->
          <div v-if="gameState.status === 'lobby'" class="card">
            <h3>⏳ Venter på at spillet starter…</h3>
            <p>Spillkode: <strong class="big-code">{{ gameState.code }}</strong></p>
            <p class="rules-hint">
              <strong>Regler:</strong> Alternativ A gir alltid {{ OPTION_A_POINTS }} poeng.
              Alternativ B gir {{ OPTION_B_POINTS }} poeng — men bare hvis maks
              {{ OPTION_B_MAX_PLAYERS }} spillere velger B. Ellers gir B 0 poeng.
            </p>
          </div>

          <!-- CHOOSING -->
          <div v-else-if="gameState.status === 'choosing'" class="card">
            <h3>Runde {{ gameState.currentRound }} – Gjør ditt valg!</h3>
            <div v-if="!myChoice" class="choices">
              <button class="choice-btn choice-a" @click="handleChoice('A')">
                <span class="choice-label">A</span>
                <span class="choice-desc">{{ OPTION_A_POINTS }} poeng garantert</span>
              </button>
              <button class="choice-btn choice-b" @click="handleChoice('B')">
                <span class="choice-label">B</span>
                <span class="choice-desc">
                  {{ OPTION_B_POINTS }} poeng hvis ≤{{ OPTION_B_MAX_PLAYERS }} velger B
                </span>
              </button>
            </div>
            <div v-else class="chosen">
              <p>
                Du valgte <strong class="choice-tag" :class="myChoice === 'A' ? 'tag-a' : 'tag-b'">{{ myChoice }}</strong>
              </p>
              <p class="muted">Venter på at alle velger…</p>
            </div>
          </div>

          <!-- RESULTS -->
          <div v-else-if="gameState.status === 'results'" class="card">
            <h3>Runderesultat – Runde {{ gameState.currentRound }}</h3>
            <div v-if="myPlayer && gameState.roundResults[playerId] !== undefined" class="my-result">
              <p>
                Du valgte <strong class="choice-tag" :class="gameState.choices[playerId] === 'A' ? 'tag-a' : 'tag-b'">
                  {{ gameState.choices[playerId] ?? '–' }}
                </strong>
                og fikk
                <strong class="points">+{{ gameState.roundResults[playerId] }} poeng</strong>
              </p>
              <p>Totalt: <strong>{{ myPlayer.score }} poeng</strong></p>
            </div>
            <p class="muted">Venter på neste runde…</p>
          </div>

          <!-- FINISHED -->
          <div v-else-if="gameState.status === 'finished'" class="card">
            <h3>🎉 Spillet er ferdig!</h3>
            <div v-if="myPlayer" class="my-result">
              <p>Din sluttpoengsum: <strong class="points">{{ myPlayer.score }} poeng</strong></p>
            </div>
            <button class="btn-secondary" @click="emit('exit')">Spill igjen</button>
          </div>
        </div>

        <div class="right-panel">
          <Leaderboard
            :players="sortedPlayers"
            :round-results="gameState.status === 'results' || gameState.status === 'finished' ? gameState.roundResults : undefined"
            :highlight-id="playerId"
          />
        </div>
      </div>
    </template>

    <!-- Loading fallback -->
    <div v-else class="card">
      <p>Kobler til spill…</p>
    </div>
  </div>
</template>

<style scoped>
.player {
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
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.player-name {
  font-weight: 700;
  font-size: 1rem;
}

.round-info {
  color: #888;
  font-size: 0.9rem;
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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field label {
  font-size: 0.85rem;
  color: #aaa;
}

.field input {
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  border: 1px solid #444;
  background: #2a2a3e;
  color: inherit;
  font-size: 1.1rem;
}

.field input:focus {
  outline: none;
  border-color: #5865f2;
}

.big-code {
  font-size: 2rem;
  letter-spacing: 0.2em;
  color: #f1c40f;
}

.rules-hint {
  font-size: 0.85rem;
  color: #aaa;
  background: #2a2a3e;
  padding: 0.75rem;
  border-radius: 8px;
  line-height: 1.5;
}

.choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.choice-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.1s, border-color 0.2s;
}

.choice-btn:hover {
  transform: scale(1.03);
}

.choice-a {
  background: #1d4ed8;
  color: white;
}

.choice-a:hover {
  border-color: #93c5fd;
}

.choice-b {
  background: #b45309;
  color: white;
}

.choice-b:hover {
  border-color: #fcd34d;
}

.choice-label {
  font-size: 2.5rem;
  font-weight: 900;
  line-height: 1;
}

.choice-desc {
  font-size: 0.8rem;
  opacity: 0.9;
  text-align: center;
}

.chosen {
  text-align: center;
  padding: 1rem;
}

.choice-tag {
  font-size: 1.2rem;
  padding: 0.1em 0.5em;
  border-radius: 4px;
}

.tag-a {
  background: #1d4ed8;
  color: white;
}

.tag-b {
  background: #b45309;
  color: white;
}

.my-result {
  background: #2a2a3e;
  padding: 1rem;
  border-radius: 8px;
  line-height: 1.8;
}

.points {
  color: #a3e635;
  font-size: 1.1rem;
}

.muted {
  color: #888;
  font-size: 0.9rem;
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
