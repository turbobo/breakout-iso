import type { Rect, Vector2 } from '../engine/math'

export type BrickKind = 'normal' | 'reinforced' | 'steel' | 'explosive' | 'boss'

export interface BrickConfig {
  position: Vector2
  width: number
  height: number
  kind: BrickKind
  color: string
  score: number
  health: number
}

export class Brick {
  public readonly position: Vector2
  public readonly width: number
  public readonly height: number
  public readonly kind: BrickKind
  public readonly color: string
  public readonly score: number
  public readonly maxHealth: number
  public health: number
  public alive = true
  public flash = 0

  public constructor(config: BrickConfig) {
    this.position = { ...config.position }
    this.width = config.width
    this.height = config.height
    this.kind = config.kind
    this.color = config.color
    this.score = config.score
    this.health = config.health
    this.maxHealth = config.health
  }

  public update(deltaSeconds: number): void {
    this.flash = Math.max(0, this.flash - deltaSeconds * 5)
  }

  public hit(): boolean {
    this.flash = 1

    if (this.kind === 'steel') {
      return false
    }

    this.health -= 1

    if (this.health <= 0) {
      this.alive = false
      return true
    }

    return false
  }

  public get rect(): Rect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height,
    }
  }

  public get center(): Vector2 {
    return {
      x: this.position.x + this.width / 2,
      y: this.position.y + this.height / 2,
    }
  }
}
