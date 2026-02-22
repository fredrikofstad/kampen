import type { RoundConfig } from '@/types/game'

/**
 * Calculate scores for a round based on choices and threshold
 * @param choices Map of playerId to choice ('low' or 'high')
 * @param roundConfig Configuration for the round
 * @returns Map of playerId to score
 */
export function calculateRoundScores(
  choices: Record<string, 'low' | 'high'>,
  roundConfig: RoundConfig
): Record<string, { score: number, adjustment?: number }> {
  const scores: Record<string, { score: number, adjustment?: number }> = {}
  const highChoosers = Object.entries(choices).filter(([, choice]) => choice === 'high')
  const highCount = highChoosers.length

  // Calculate base scores
  for (const [playerId, choice] of Object.entries(choices)) {
    if (choice === 'low') {
      scores[playerId] = { score: roundConfig.lowScore }
    } else {
      if (highCount > roundConfig.threshold) {
        scores[playerId] = { score: 0 }
      } else {
        scores[playerId] = { score: roundConfig.highScore }
      }
    }
  }

  // Apply random adjustments for rounds >= 3
  if (roundConfig.roundNumber >= 3) {
    const playerIds = Object.keys(scores)
    const n = playerIds.length
    const bonusCount = Math.floor(n / 4)
    const penaltyCount = Math.floor(n / 4)
    // Shuffle playerIds
    const shuffled = playerIds.slice().sort(() => Math.random() - 0.5)
    const bonusIds = shuffled.slice(0, bonusCount)
    const penaltyIds = shuffled.slice(bonusCount, bonusCount + penaltyCount)
    for (const id of bonusIds) {
      const adj = Math.floor(Math.random() * 3) + 1 // 1, 2, or 3
      if (scores[id]) {
        scores[id].adjustment = adj
        scores[id].score += adj
      }
    }
    for (const id of penaltyIds) {
      const adj = Math.floor(Math.random() * 3) + 1 // 1, 2, or 3
      if (scores[id]) {
        scores[id].adjustment = -adj
        scores[id].score -= adj
      }
    }
  }

  return scores
}

/**
 * Generate a random session code for sharing
 */
export function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
