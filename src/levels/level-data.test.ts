import { describe, expect, it } from 'vitest'

import { createLevelBricks } from './level-data'

describe('level brick layout', () => {
  it('keeps desktop bricks within playfield width', () => {
    const boardWidth = 1200
    const bricks = createLevelBricks(0, boardWidth)
    const rightMostBrickEdge = Math.max(...bricks.map((brick) => brick.position.x + brick.width))

    expect(rightMostBrickEdge).toBeLessThanOrEqual(boardWidth)
  })

  it('keeps compact desktop bricks within playfield width', () => {
    const boardWidth = 800
    const bricks = createLevelBricks(0, boardWidth)
    const rightMostBrickEdge = Math.max(...bricks.map((brick) => brick.position.x + brick.width))

    expect(rightMostBrickEdge).toBeLessThanOrEqual(boardWidth)
  })

  it('keeps mobile bricks inside the narrow viewport', () => {
    const boardWidth = 320
    const bricks = createLevelBricks(15, boardWidth, {
      playBottomY: 420,
      topOffset: 54,
      maxGridWidth: boardWidth - 16,
      minBrickHeight: 10,
      maxBrickHeight: 16,
      minBrickGap: 3,
      maxBrickGap: 4,
      minHorizontalMargin: 8,
      maxHorizontalMargin: 16,
    })
    const leftMostBrickEdge = Math.min(...bricks.map((brick) => brick.position.x))
    const rightMostBrickEdge = Math.max(...bricks.map((brick) => brick.position.x + brick.width))

    expect(leftMostBrickEdge).toBeGreaterThanOrEqual(0)
    expect(rightMostBrickEdge).toBeLessThanOrEqual(boardWidth)
  })

  it('fits tall mobile brick grids above the reserved control area', () => {
    const playBottomY = 390
    const bricks = createLevelBricks(15, 360, {
      playBottomY,
      topOffset: 48,
      maxGridWidth: 344,
      minBrickHeight: 10,
      maxBrickHeight: 18,
      minBrickGap: 3,
      maxBrickGap: 4,
      minHorizontalMargin: 8,
      maxHorizontalMargin: 16,
    })
    const bottomMostBrickEdge = Math.max(...bricks.map((brick) => brick.position.y + brick.height))

    expect(bottomMostBrickEdge).toBeLessThan(playBottomY)
  })

  it('uses a lower desktop top offset after moving the HUD to the bottom', () => {
    const bricks = createLevelBricks(0, 1200)
    const firstBrickTop = Math.min(...bricks.map((brick) => brick.position.y))

    expect(firstBrickTop).toBe(72)
  })
})
