import { describe, expect, it } from 'vitest'

import {
  clamp,
  clampPaddleCenterX,
  getResponsiveSegmentWidth,
  reflectVelocity,
  resolveCircleRectCollision,
  resolveSweptCircleTopRectCollision,
} from './math'

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

  it('keeps desktop responsive segment width unchanged', () => {
    expect(getResponsiveSegmentWidth(960, 132, 720, 0.3, 88, 112)).toBe(132)
  })

  it('scales mobile responsive segment width within configured bounds', () => {
    expect(getResponsiveSegmentWidth(320, 132, 720, 0.3, 88, 112)).toBe(96)
    expect(getResponsiveSegmentWidth(260, 132, 720, 0.3, 88, 112)).toBe(88)
    expect(getResponsiveSegmentWidth(430, 132, 720, 0.3, 88, 112)).toBe(112)
  })

  it('does not exceed the board width for very narrow responsive segments', () => {
    expect(getResponsiveSegmentWidth(72, 132, 720, 0.3, 88, 112)).toBe(72)
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

  it('detects a fast ball crossing the top of a paddle between frames', () => {
    const collision = resolveSweptCircleTopRectCollision(
      { x: 70, y: 80 },
      { x: 72, y: 124 },
      8,
      { x: 40, y: 110, width: 80, height: 18 },
    )

    expect(collision).not.toBeNull()
    expect(collision?.normal).toEqual({ x: 0, y: -1 })
    expect(collision?.hitPosition).toEqual({ x: 71, y: 102 })
  })

  it('ignores swept paddle collision when the crossing misses horizontally', () => {
    const collision = resolveSweptCircleTopRectCollision(
      { x: 20, y: 80 },
      { x: 24, y: 124 },
      8,
      { x: 40, y: 110, width: 80, height: 18 },
    )

    expect(collision).toBeNull()
  })
})
