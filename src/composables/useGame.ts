import { ref, computed } from 'vue'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'

export interface Player {
  id: string
  name: string
  score: number
}

export type GameStatus = 'lobby' | 'choosing' | 'results' | 'finished'
export type Choice = 'A' | 'B'

export interface GameState {
  code: string
  status: GameStatus
  currentRound: number
  totalRounds: number
  players: Record<string, Player>
  choices: Record<string, Choice>
  roundResults: Record<string, number>
}

// Option A: always 1 point
const OPTION_A_POINTS = 1
// Option B: 5 points if ≤3 players chose it, else 0
const OPTION_B_POINTS = 5
const OPTION_B_MAX_PLAYERS = 3

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem('kampen_player_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('kampen_player_id', id)
  }
  return id
}

export function useGame() {
  const gameState = ref<GameState | null>(null)
  const playerId = ref<string>(getOrCreatePlayerId())
  const error = ref<string | null>(null)
  const loading = ref(false)
  let unsubscribe: Unsubscribe | null = null

  const myPlayer = computed<Player | null>(() => {
    if (!gameState.value) return null
    return gameState.value.players[playerId.value] ?? null
  })

  const myChoice = computed<Choice | null>(() => {
    if (!gameState.value) return null
    return gameState.value.choices[playerId.value] ?? null
  })

  const sortedPlayers = computed<Player[]>(() => {
    if (!gameState.value) return []
    return Object.values(gameState.value.players).sort((a, b) => b.score - a.score)
  })

  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  function listenToGame(code: string) {
    stopListening()
    const gameRef = doc(db, 'games', code)
    unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        gameState.value = snapshot.data() as GameState
      } else {
        gameState.value = null
      }
    })
  }

  async function createGame(totalRounds = 5): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const MAX_RETRIES = 10
      let code = generateCode()
      let gameRef = doc(db, 'games', code)
      let existing = await getDoc(gameRef)
      let retries = 0
      while (existing.exists() && retries < MAX_RETRIES) {
        code = generateCode()
        gameRef = doc(db, 'games', code)
        existing = await getDoc(gameRef)
        retries++
      }
      if (existing.exists()) {
        error.value = 'Could not generate a unique game code. Please try again.'
        throw new Error('Max retries exceeded')
      }

      const state: GameState = {
        code,
        status: 'lobby',
        currentRound: 0,
        totalRounds,
        players: {},
        choices: {},
        roundResults: {},
      }
      await setDoc(gameRef, { ...state, createdAt: serverTimestamp() })
      listenToGame(code)
      return code
    } catch (e) {
      error.value = 'Failed to create game.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function joinGame(code: string, playerName: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const upperCode = code.trim().toUpperCase()
      const gameRef = doc(db, 'games', upperCode)
      const snapshot = await getDoc(gameRef)
      if (!snapshot.exists()) {
        error.value = 'Game not found. Check the code and try again.'
        return
      }
      const state = snapshot.data() as GameState
      if (state.status === 'finished') {
        error.value = 'This game has already ended.'
        return
      }
      const player: Player = {
        id: playerId.value,
        name: playerName.trim(),
        score: 0,
      }
      await updateDoc(gameRef, {
        [`players.${playerId.value}`]: player,
      })
      listenToGame(upperCode)
    } catch (e) {
      error.value = 'Failed to join game.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function startRound(): Promise<void> {
    if (!gameState.value) return
    const gameRef = doc(db, 'games', gameState.value.code)
    await updateDoc(gameRef, {
      status: 'choosing',
      choices: {},
      roundResults: {},
      currentRound: gameState.value.currentRound + 1,
    })
  }

  async function submitChoice(choice: Choice): Promise<void> {
    if (!gameState.value) return
    const gameRef = doc(db, 'games', gameState.value.code)
    await updateDoc(gameRef, {
      [`choices.${playerId.value}`]: choice,
    })
  }

  async function endRound(): Promise<void> {
    if (!gameState.value) return
    const { choices, players } = gameState.value

    // Calculate how many chose B
    const bCount = Object.values(choices).filter((c) => c === 'B').length
    const bGetsPoints = bCount <= OPTION_B_MAX_PLAYERS

    const roundResults: Record<string, number> = {}
    const updatedPlayers = { ...players }

    for (const [pid, choice] of Object.entries(choices)) {
      let points = 0
      if (choice === 'A') {
        points = OPTION_A_POINTS
      } else if (choice === 'B') {
        points = bGetsPoints ? OPTION_B_POINTS : 0
      }
      roundResults[pid] = points
      if (updatedPlayers[pid]) {
        updatedPlayers[pid] = {
          ...updatedPlayers[pid],
          score: (updatedPlayers[pid].score ?? 0) + points,
        }
      }
    }

    // Players who didn't choose get 0 this round
    for (const pid of Object.keys(players)) {
      if (!(pid in roundResults)) {
        roundResults[pid] = 0
      }
    }

    const isLastRound = gameState.value.currentRound >= gameState.value.totalRounds
    const gameRef = doc(db, 'games', gameState.value.code)
    await updateDoc(gameRef, {
      status: isLastRound ? 'finished' : 'results',
      roundResults,
      players: updatedPlayers,
    })
  }

  async function nextRound(): Promise<void> {
    if (!gameState.value) return
    await startRound()
  }

  function cleanup() {
    stopListening()
    gameState.value = null
    error.value = null
  }

  return {
    gameState,
    playerId,
    myPlayer,
    myChoice,
    sortedPlayers,
    error,
    loading,
    createGame,
    joinGame,
    startRound,
    submitChoice,
    endRound,
    nextRound,
    cleanup,
    OPTION_A_POINTS,
    OPTION_B_POINTS,
    OPTION_B_MAX_PLAYERS,
  }
}
