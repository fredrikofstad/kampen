import type { GameConfig } from '@/types/game'

// Example game configuration - customize as needed
export const defaultGameConfig: GameConfig = {
  gameName: 'Kampen',
  rounds: [
    {
      roundNumber: 1,
      lowScore: 1,
      highScore: 3,
      threshold: 3,
      description: 'Hvis mer enn 3 personer velger risikabelt, får alle som valgte risikabelt 0 poeng',
    },
    {
      roundNumber: 2,
      lowScore: 1,
      highScore: 5,
      threshold: 4,
      description: 'Hvis mer enn 4 personer velger risikabelt, får alle som valgte risikabelt 0 poeng',
    },
    {
      roundNumber: 3,
      lowScore: 5,
      highScore: 10,
      threshold: 3,
      description: 'Hvis mer enn 3 personer velger risikabelt, får alle som valgte risikabelt 0 poeng',
    },
    {
      roundNumber: 4,
      lowScore: 5,
      highScore: 10,
      threshold: 8,
      description: 'Hvis mer enn 8 personer velger risikabelt, får alle som valgte risikabelt 0 poeng',
    },
    {
      roundNumber: 5,
      lowScore: 5,
      highScore: 20,
      threshold: 5,
      description: 'Hvis mer enn 5 personer velger risikabelt, får alle som valgte risikabelt 0 poeng',
    },
    {
      roundNumber: 6,
      lowScore: 20,
      highScore:30,
      threshold: 5,
      description: 'Hvis mer enn 5 personer velger risikabelt, får alle som valgte risikabelt 0 poeng',
    },
  ],
}
