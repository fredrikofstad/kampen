<script setup lang="ts">
import { ref } from 'vue'
import HostSession from './components/HostSession.vue'
import GameSession from './components/GameSession.vue'

type View = 'home' | 'host' | 'player'
const view = ref<View>('home')
</script>

<template>
  <div class="app">
    <!-- Home screen -->
    <div v-if="view === 'home'" class="home">
      <h1 class="title">⚔️ Kampen</h1>
      <p class="subtitle">Et strategisk poengsettingsspill for klasserommet</p>
      <div class="home-buttons">
        <button class="btn-host" @click="view = 'host'">🎓 Lag spill (lærer)</button>
        <button class="btn-player" @click="view = 'player'">🎮 Bli med (elev)</button>
      </div>
      <div class="rules-card">
        <h3>Regler</h3>
        <ul>
          <li><strong>Alternativ A</strong> – Gir alltid 1 poeng.</li>
          <li>
            <strong>Alternativ B</strong> – Gir 5 poeng, men kun hvis maks 3 spillere
            velger B. Hvis 4 eller flere velger B, gir det 0 poeng.
          </li>
        </ul>
      </div>
    </div>

    <!-- Host view -->
    <HostSession v-else-if="view === 'host'" @exit="view = 'home'" />

    <!-- Player view -->
    <GameSession v-else-if="view === 'player'" @exit="view = 'home'" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.home {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding-top: 3rem;
}

.title {
  font-size: 3rem;
  margin: 0;
}

.subtitle {
  color: #aaa;
  text-align: center;
  margin: 0;
}

.home-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
}

.btn-host {
  background: #5865f2;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-host:hover {
  background: #4752c4;
}

.btn-player {
  background: #1e1e2e;
  color: white;
  border: 2px solid #5865f2;
  border-radius: 10px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-player:hover {
  background: #2a2a4e;
}

.rules-card {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  width: 100%;
  max-width: 400px;
}

.rules-card h3 {
  margin: 0 0 0.75rem;
  color: #f1c40f;
}

.rules-card ul {
  padding-left: 1.2rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #ccc;
  line-height: 1.5;
}
</style>
