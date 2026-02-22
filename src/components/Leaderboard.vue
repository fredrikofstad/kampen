<script setup lang="ts">
import type { Player } from '../composables/useGame'

defineProps<{
  players: Player[]
  roundResults?: Record<string, number>
  highlightId?: string
}>()
</script>

<template>
  <div class="leaderboard">
    <h2 class="leaderboard-title">🏆 Ledertavle</h2>
    <div v-if="players.length === 0" class="empty">Ingen spillere ennå.</div>
    <ol v-else class="player-list">
      <li
        v-for="(player, index) in players"
        :key="player.id"
        :class="['player-row', { highlight: player.id === highlightId }]"
      >
        <span class="rank">{{ index + 1 }}.</span>
        <span class="name">{{ player.name }}</span>
        <span class="score">{{ player.score }} pt</span>
        <span v-if="roundResults && roundResults[player.id] !== undefined" class="round-delta">
          <template v-if="(roundResults[player.id] ?? 0) > 0">+{{ roundResults[player.id] }}</template>
          <template v-else>{{ roundResults[player.id] ?? 0 }}</template>
        </span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.leaderboard {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 280px;
}

.leaderboard-title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  text-align: center;
  color: #f1c40f;
}

.empty {
  color: #888;
  text-align: center;
}

.player-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #2a2a3e;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.player-row.highlight {
  background: #3a3a5e;
  border: 1px solid #7c7cff;
}

.rank {
  color: #888;
  width: 1.5rem;
  flex-shrink: 0;
  font-size: 0.9rem;
}

.name {
  flex: 1;
  font-weight: 500;
}

.score {
  font-weight: 700;
  color: #a3e635;
}

.round-delta {
  font-size: 0.8rem;
  color: #f1c40f;
  min-width: 2rem;
  text-align: right;
}
</style>
