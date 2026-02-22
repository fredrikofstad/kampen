// Game types and interfaces

export interface RoundConfig {
  roundNumber: number
  lowScore: number
  highScore: number
  threshold: number // If more than this many people choose high, they get 0
  description?: string
}

export interface GameConfig {
  gameName: string
  rounds: RoundConfig[]
}

export interface Player {
  id: string
  username: string
  sessionId: string
  totalScore: number
  roundChoices: Record<number, 'low' | 'high'> // Map of roundNumber to choice
  roundScores: Record<number, number> // Map of roundNumber to score
  adjustments?: Record<number, number> // Map of roundNumber to adjustment
  joinedAt: number
}

export interface SessionState {
  id: string
  gameConfig: GameConfig
  currentRound: number
  status: 'waiting' | 'playing' | 'finished'
  createdBy: string
  createdAt: number
  players: Record<string, Player>
  roundChoices: Record<number, Record<string, 'low' | 'high'>> // roundNumber -> playerId -> choice
  roundResults: Record<number, Record<string, number>> // roundNumber -> playerId -> score
  votingEnabled: boolean
}

export interface LeaderboardEntry {
  username: string
  totalScore: number
  playerId: string
  roundScores: Array<{ score: number; adjustment?: number }>
}
