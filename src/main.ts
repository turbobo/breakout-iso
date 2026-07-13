import './style.css'
import { Game } from './game'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root element is missing')
}

app.innerHTML = `
  <main class="game-shell" aria-label="Neon Breakout 2D">
    <canvas class="game-canvas" data-game-canvas aria-label="弹球打砖块游戏画布"></canvas>

    <section class="top-hud" aria-label="游戏状态">
      <div class="hud-item">
        <span>Score</span>
        <strong data-hud="score">0</strong>
      </div>
      <div class="hud-item">
        <span>Best</span>
        <strong data-hud="best">0</strong>
      </div>
      <div class="hud-item">
        <span>Level</span>
        <strong data-hud="level">1</strong>
      </div>
      <div class="hud-item">
        <span>Mode</span>
        <strong data-hud="mode">Classic</strong>
      </div>
      <div class="hud-item">
        <span>Time</span>
        <strong data-hud="timer">∞</strong>
      </div>
      <div class="hud-item">
        <span>Chance</span>
        <strong data-hud="lives">3</strong>
      </div>
      <button class="icon-button" data-action="pause" type="button">Pause</button>
    </section>

    <section class="powerup-bar" aria-label="当前道具">
      <span data-powerup="multiball">Multi</span>
      <span data-powerup="wide">Wide</span>
      <span data-powerup="fireball">Fire</span>
      <span data-powerup="shield">Shield</span>
    </section>

    <div class="toast" data-hud="toast" role="status" aria-live="polite"></div>

    <div class="touch-guide" aria-hidden="true">
      <span>拖动任意空白区域控制挡板</span>
    </div>

    <section class="screen-overlay is-visible" data-screen="start">
      <div class="screen-card">
        <p class="eyebrow">Free · Static · EdgeOne Ready</p>
        <h1>Neon Breakout 2D</h1>
        <p class="screen-copy">
          纯前端 Canvas 弹球打砖块：16 个关卡、Classic / Timed / Boss 模式、连击、道具、爆炸砖块和护盾。
        </p>
        <button class="primary-button" data-action="start" type="button">开始游戏</button>
        <div class="level-select" aria-label="选择关卡">
          <div class="level-select-header">
            <strong>选择关卡</strong>
            <span>Classic · Timed · Boss</span>
          </div>
          <div class="level-grid" data-level-list></div>
        </div>
        <div class="control-hints">
          <span>手机端拖动任意空白区域</span>
          <span>桌面端鼠标 / ← → 键</span>
          <span>Space 发球 / 继续</span>
          <span>P 暂停</span>
        </div>
      </div>
    </section>

    <section class="screen-overlay" data-screen="transition">
      <div class="screen-card compact level-transition-card">
        <p class="eyebrow" data-transition="eyebrow">Level Clear</p>
        <h2 data-transition="title">下一关已解锁</h2>
        <p class="screen-copy" data-transition="summary">准备进入下一关。</p>
        <div class="transition-stats" data-transition="stats"></div>
        <button class="primary-button" data-action="next-level" type="button">继续下一关</button>
        <button class="secondary-button" data-action="menu" type="button">选择关卡</button>
      </div>
    </section>

    <section class="screen-overlay" data-screen="pause">
      <div class="screen-card compact">
        <p class="eyebrow">Paused</p>
        <h2>游戏暂停</h2>
        <button class="primary-button" data-action="resume" type="button">继续</button>
        <button class="secondary-button" data-action="restart" type="button">重新开始</button>
        <button class="secondary-button" data-action="menu" type="button">选择关卡</button>
      </div>
    </section>

    <section class="screen-overlay" data-screen="result">
      <div class="screen-card compact">
        <p class="eyebrow" data-result="label">Game Over</p>
        <h2 data-result="title">再来一局</h2>
        <p class="screen-copy" data-result="summary">得分 0</p>
        <button class="primary-button" data-action="restart" type="button">重新开始</button>
        <button class="secondary-button" data-action="menu" type="button">选择关卡</button>
      </div>
    </section>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('[data-game-canvas]')

if (!canvas) {
  throw new Error('Game canvas element is missing')
}

const game = new Game(canvas)
game.start()
