import type { Rect, Vector2 } from '../engine/math'

export type PowerUpKind = 'multiball' | 'wide' | 'fireball' | 'shield'

export class PowerUp {
  public readonly kind: PowerUpKind
  public readonly position: Vector2
  public readonly velocity: Vector2 = { x: 0, y: 150 }
  public readonly size = 24
  public active = true

  public constructor(kind: PowerUpKind, position: Vector2) {
    this.kind = kind
    this.position = { ...position }
  }

  public update(deltaSeconds: number): void {
    this.position.x += this.velocity.x * deltaSeconds
    this.position.y += this.velocity.y * deltaSeconds
  }

  public get rect(): Rect {
    return {
      x: this.position.x - this.size / 2,
      y: this.position.y - this.size / 2,
      width: this.size,
      height: this.size,
    }
  }
}

export function pickPowerUp(): PowerUpKind {
  const kinds: PowerUpKind[] = ['multiball', 'wide', 'fireball', 'shield']
  return kinds[Math.floor(Math.random() * kinds.length)]
}
