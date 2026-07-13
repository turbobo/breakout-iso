import { describe, expect, it } from 'vitest'

import { clamp, clampPaddleCenterX, reflectVelocity, resolveCircleRectCollision } from './math'

describe('math helpers', () => {
  it('clamps generic values to the inclusive range', () => {
    expect(clamp(-4, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
    expect(clamp(14, 0, 10)).toBe(10)
  })

  it('clamps paddle center while keeping the whole paddle inside the board', () => {
    expect(clampPaddleCenterX(12, 100, 320)).toBe(50)
    expect(clampPaddleCenterX(300, 100, 320)).toBe(270)
    expect(clampPaddleCenterX(160, 100, 320)).toBe(160)
  })

  it('centers the paddle when the board is narrower than the paddle', () => {
    expect(clampPaddleCenterX(20, 500, 320)).toBe(160)
  })

  it('reflects velocity around the collision normal', () => {
    expect(reflectVelocity({ x: 12, y: 8 }, { x: 0, y: -1 })).toEqual({ x: 12, y: -8 })
  })

  it('resolves circle and rect collisions with a usable normal', () => {
    const collision = resolveCircleRectCollision(
      { position: { x: 24, y: 14 }, radius: 8 },
      { x: 20, y: 20, width: 40, height: 16 },
    )

    expect(collision).not.toBeNull()
    expect(collision?.normal.y).toBeLessThan(0)
    expect(collision?.penetration).toBeGreaterThan(0)
  })
})
