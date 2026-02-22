import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { firebaseApp } from '@/config/firebase'
import type { SessionState, Player, LeaderboardEntry } from '@/types/game'
import { calculateRoundScores } from './gameLogic'

const db = getFirestore(firebaseApp)

export async function createSession(gameConfig: any, creatorId: string): Promise<string> {
  const sessionId = Math.random().toString(36).substring(2, 5)
  const sessionData: SessionState = {
    id: sessionId,
    gameConfig,
    currentRound: 1,
    status: 'waiting',
    createdBy: creatorId,
    createdAt: Date.now(),
    players: {},
    roundChoices: {},
    roundResults: {},
    votingEnabled: false,
  }

  await setDoc(doc(db, 'sessions', sessionId), sessionData)
  return sessionId
}

export async function joinSession(sessionId: string, username: string): Promise<string> {
  const playerId = Math.random().toString(36).substring(2, 9)
  const playerData: Player = {
    id: playerId,
    username,
    sessionId,
    totalScore: 0,
    roundChoices: {},
    roundScores: {},
    joinedAt: Date.now(),
  }

  const sessionRef = doc(db, 'sessions', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) {
    throw new Error('Session not found')
  }

  await updateDoc(sessionRef, {
    [`players.${playerId}`]: playerData,
  })

  return playerId
}

export async function submitChoice(
  sessionId: string,
  playerId: string,
  roundNumber: number,
  choice: 'low' | 'high'
): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    [`roundChoices.${roundNumber}.${playerId}`]: choice,
    [`players.${playerId}.roundChoices.${roundNumber}`]: choice,
  })
}

export async function advanceRound(sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) throw new Error('Session not found')

  const session = sessionSnap.data() as SessionState
  const currentRound = session.currentRound
  const roundConfig = session.gameConfig.rounds[currentRound - 1]
  
  if (!roundConfig) throw new Error('Round configuration not found')
  
  const choices = session.roundChoices[currentRound] || {}

  // Calculate scores for current round
  const scores = calculateRoundScores(choices, roundConfig)

  // Update player total scores
  const updatedPlayers = { ...session.players }
  for (const [playerId, scoreObj] of Object.entries(scores)) {
    if (updatedPlayers[playerId]) {
      updatedPlayers[playerId].roundScores[currentRound] = scoreObj.score
      updatedPlayers[playerId].totalScore += scoreObj.score
      // Optionally, store adjustment for display
      if (!updatedPlayers[playerId].adjustments) updatedPlayers[playerId].adjustments = {};
      if (scoreObj.adjustment !== undefined) {
        updatedPlayers[playerId].adjustments[currentRound] = scoreObj.adjustment;
      }
    }
  }

  // Move to next round or finish
  const nextRound = currentRound + 1
  const isGameFinished = nextRound > session.gameConfig.rounds.length

  await updateDoc(sessionRef, {
    [`roundResults.${currentRound}`]: scores,
    players: updatedPlayers,
    currentRound: nextRound,
    status: isGameFinished ? 'finished' : 'playing',
    votingEnabled: false,
  })
}

export async function startRound(sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'playing',
    votingEnabled: false,
  })
}

export function subscribeToSession(
  sessionId: string,
  callback: (session: SessionState) => void
): () => void {
  const sessionRef = doc(db, 'sessions', sessionId)
  return onSnapshot(sessionRef, (snap: DocumentSnapshot) => {
    if (snap.exists()) {
      callback(snap.data() as SessionState)
    }
  })
}

export function getLeaderboard(session: SessionState): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = Object.values(session.players).map((player: Player) => ({
    username: player.username,
    totalScore: player.totalScore,
    playerId: player.id,
    roundScores: Object.keys(player.roundScores)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((roundNum) => {
        const score = player.roundScores[parseInt(roundNum)] || 0;
        const adj = player.adjustments && player.adjustments[parseInt(roundNum)] !== undefined ? player.adjustments[parseInt(roundNum)] : undefined;
        return { score, adjustment: adj };
      }),
  }))

  // Sort by total score descending
  return entries.sort((a, b) => b.totalScore - a.totalScore)
}

export async function setVotingEnabled(sessionId: string, enabled: boolean) {
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, { votingEnabled: enabled });
}
