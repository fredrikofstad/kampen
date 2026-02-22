<script setup lang="ts">
import { computed } from 'vue'
import { getLeaderboard } from '@/utils/firestore'
import type { SessionState } from '@/types/game'

const props = defineProps<{
  session: SessionState
}>()

const leaderboard = computed(() => {
  return getLeaderboard(props.session)
})
</script>

<template>
  <div class="leaderboard">
    <h3>📊 Leaderboard</h3>
    <div class="leaderboard-content">
      <div v-if="leaderboard.length === 0" class="empty">
        <p>No players yet</p>
      </div>
      <div v-else class="scores-table">
        <div class="table-header">
          <span class="rank">Rank</span>
          <span class="name">Player</span>
          <span class="score">Total Points</span>
          <span class="rounds">Round Scores</span>
        </div>
        <div v-for="(entry, index) in leaderboard" :key="entry.playerId" class="table-row">
          <span class="rank">{{ index + 1 }}</span>
          <span class="name">{{ entry.username }}</span>
          <span class="score">{{ entry.totalScore }}</span>
          <span class="rounds">
            <template v-if="entry.roundScores.length">
              <span v-for="(rs, i) in entry.roundScores" :key="i" class="round-score">
                {{ rs.score }}
                <span v-if="rs.adjustment !== undefined" :class="['adj-badge', rs.adjustment > 0 ? 'adj-bonus' : 'adj-penalty']">
                  {{ rs.adjustment > 0 ? '+' : '' }}{{ rs.adjustment }}
                </span>
                <span v-if="i < entry.roundScores.length - 1"> | </span>
              </span>
            </template>
            <template v-else>-</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard {
  margin-top: 40px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  border-left: 4px solid #667eea;
}

.leaderboard h3 {
  margin-top: 0;
  color: #333;
}

.empty {
  text-align: center;
  color: #999;
  padding: 20px;
}

.scores-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.table-header {
  display: grid;
  grid-template-columns: 50px 1fr 120px 1fr;
  gap: 15px;
  padding: 12px;
  background: #e8eaf6;
  border-radius: 5px;
  font-weight: bold;
  color: #333;
}

.table-row {
  display: grid;
  grid-template-columns: 50px 1fr 120px 1fr;
  gap: 15px;
  padding: 12px;
  border-bottom: 1px solid #eee;
  align-items: center;
  color: #555;
}

.table-row:last-child {
  border-bottom: none;
}

.rank {
  font-weight: bold;
  color: #667eea;
}

.name {
  word-break: break-word;
}

.score {
  font-weight: bold;
  color: #27ae60;
  text-align: center;
}

.rounds {
  font-size: 0.9em;
  color: #999;
  text-align: right;
}

.round-score {
  display: inline-block;
  margin-right: 2px;
}

.adj-badge {
  display: inline-block;
  margin-left: 4px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: bold;
}

.adj-bonus {
  background: #e6ffe6;
  color: #27ae60;
  border: 1px solid #b2f2b2;
}

.adj-penalty {
  background: #ffe6e6;
  color: #e74c3c;
  border: 1px solid #f2b2b2;
}
</style>
