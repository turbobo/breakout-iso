import type { Rect, Vector2 } from '../engine/math'
import { clamp } from '../engine/math'

export class Paddle {
  public position: Vector2
  public baseWidth = 132
  public width = 132
  public height = 18
  public speed = 620
  public wideTimer = 0

  public constructor(position: Vector2) {
    this.position = { ...position }
  }

  public update(deltaSeconds: number, targetX: number, boardWidth: number): void {
    this.wideTimer = Math.max(0, this.wideTimer - deltaSeconds)
    const targetWidth = this.wideTimer > 0 ? this.baseWidth * 1.5 : this.baseWidth
    this.width += (targetWidth - this.width) * Math.min(1, deltaSeconds * 10)
    this.position.x += (targetX - this.position.x) * Math.min(1, deltaSeconds * 16)
    this.position.x = clamp(this.position.x, this.width / 2, boardWidth - this.width / 2)
  }

  public moveBy(amount: number, boardWidth: number): void {
    this.position.x = clamp(this.position.x + amount, this.width / 2, boardWidth - this.width / 2)
  }

  public get rect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    }
  }
}
