import { describe, expect, it } from 'vitest'

import { Brick, isBossBrick, isDestructibleBrick, isSteelBrick, type BrickKind } from './brick'

function createBrick(kind: BrickKind): Brick {
  return new Brick({
    position: { x: 10, y: 20 },
    width: 48,
    height: 18,
    kind,
    color: '#FFFFFF',
    score: 100,
    health: kind === 'steel' ? Number.POSITIVE_INFINITY : 1,
  })
}

describe('Brick', () => {
  it('keeps steel bricks alive and reports them as non-destructible', () => {
    const brick = createBrick('steel')

    expect(isSteelBrick(brick)).toBe(true)
    expect(isBossBrick(brick)).toBe(false)
    expect(isDestructibleBrick(brick)).toBe(false)
    expect(brick.hit()).toBe(false)
    expect(brick.alive).toBe(true)
  })

  it('narrows boss bricks and keeps them destructible', () => {
    const brick = createBrick('boss')

    expect(isBossBrick(brick)).toBe(true)
    expect(isSteelBrick(brick)).toBe(false)
    expect(isDestructibleBrick(brick)).toBe(true)
  })

  it('destroys normal bricks after enough hits', () => {
    const brick = createBrick('normal')

    expect(brick.hit()).toBe(true)
    expect(brick.alive).toBe(false)
  })
})
