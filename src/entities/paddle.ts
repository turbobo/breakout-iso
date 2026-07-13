import { clampPaddleCenterX, type Rect, type Vector2 } from '../engine/math'

export class Paddle {
  public position: Vector2
  public baseWidth: number
  public width: number
  public height = 18
  public speed = 620
  public wideTimer = 0

  public constructor(position: Vector2, baseWidth = 132) {
    this.position = { ...position }
    this.baseWidth = baseWidth
    this.width = baseWidth
  }

  public setBaseWidth(baseWidth: number, boardWidth: number): void {
    this.baseWidth = baseWidth
    this.width = Math.min(this.width, this.getTargetWidth())
    this.position.x = clampPaddleCenterX(this.position.x, this.width, boardWidth)
  }

  public update(deltaSeconds: number, targetX: number, boardWidth: number): void {
    this.wideTimer = Math.max(0, this.wideTimer - deltaSeconds)
    const targetWidth = this.getTargetWidth()
    this.width += (targetWidth - this.width) * Math.min(1, deltaSeconds * 10)
    this.position.x += (targetX - this.position.x) * Math.min(1, deltaSeconds * 16)
    this.position.x = clampPaddleCenterX(this.position.x, this.width, boardWidth)
  }

  public moveBy(amount: number, boardWidth: number): void {
    this.position.x = clampPaddleCenterX(this.position.x + amount, this.width, boardWidth)
  }

  public get rect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    }
  }

  private getTargetWidth(): number {
    return this.wideTimer > 0 ? this.baseWidth * 1.5 : this.baseWidth
  }
}
