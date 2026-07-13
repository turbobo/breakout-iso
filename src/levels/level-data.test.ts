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

  it('uses a lower desktop top offset after moving the HUD to the bottom', () => {
    const bricks = createLevelBricks(0, 1200)
    const firstBrickTop = Math.min(...bricks.map((brick) => brick.position.y))

    expect(firstBrickTop).toBe(72)
  })
})
