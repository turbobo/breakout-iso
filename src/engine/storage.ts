const highScoreKey = 'neon-breakout-best-score'

export function readBestScore(): number {
  const storedScore = window.localStorage.getItem(highScoreKey)
  const parsedScore = Number(storedScore)

  return Number.isFinite(parsedScore) ? parsedScore : 0
}

export function saveBestScore(score: number): void {
  const bestScore = Math.max(readBestScore(), score)
  window.localStorage.setItem(highScoreKey, String(bestScore))
}
