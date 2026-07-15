import './style.css'
import { Game } from './game'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root element is missing')
}

app.innerHTML = `
  <main class="game-shell" aria-label="霓虹弹球打砖块">
    <canvas class="game-canvas" data-game-canvas tabindex="0" aria-label="弹球打砖块游戏画布"></canvas>

    <section class="top-hud" aria-label="游戏状态">
      <div class="hud-item">
        <span>分数</span>
        <strong data-hud="score">0</strong>
      </div>
      <div class="hud-item">
        <span>最高分</span>
        <strong data-hud="best">0</strong>
      </div>
      <div class="hud-item">
        <span>关卡</span>
        <strong data-hud="level">1</strong>
      </div>
      <div class="hud-item">
        <span>模式</span>
        <strong data-hud="mode">常规</strong>
      </div>
      <div class="hud-item">
        <span>时间</span>
        <strong data-hud="timer">∞</strong>
      </div>
      <div class="hud-item">
        <span>机会</span>
        <strong data-hud="lives">3</strong>
      </div>
      <button class="icon-button" data-action="pause" type="button">暂停</button>
    </section>

    <section class="powerup-bar" aria-label="当前道具">
      <span data-powerup="multiball">多球<small>分裂</small></span>
      <span data-powerup="wide">加宽<small>15秒</small></span>
      <span data-powerup="fireball">火球<small>穿透</small></span>
      <span data-powerup="shield">护盾<small>抵挡</small></span>
    </section>

    <div class="toast" data-hud="toast" role="status" aria-live="polite"></div>

    <div class="touch-guide" aria-hidden="true">
      <span>拖动任意空白区域控制挡板</span>
    </div>

    <section class="screen-overlay is-visible" data-screen="start" role="dialog" aria-modal="true" aria-labelledby="start-title" aria-hidden="false">
      <div class="screen-card">
        <h1 id="start-title">霓虹弹球打砖块</h1>
        <p class="screen-copy">
          纯前端画布弹球打砖块：16 个关卡、常规 / 限时 / 首领模式、连击、道具、爆炸砖块和护盾。
        </p>
        <button class="primary-button" data-action="start" type="button">开始游戏</button>
        <div class="level-select" aria-label="选择关卡">
          <div class="level-select-header">
            <strong>选择关卡</strong>
            <span>常规 · 限时 · 首领</span>
          </div>
          <div class="level-grid" data-level-list></div>
        </div>
        <div class="powerup-guide" aria-label="道具说明">
          <span class="powerup-icon">🎯 多球</span>
          <span class="powerup-icon">↔️ 加宽</span>
          <span class="powerup-icon">🔥 火球</span>
          <span class="powerup-icon">🛡️ 护盾</span>
        </div>
        <div class="control-hints">
          <span>手机端拖动任意空白区域</span>
          <span>桌面端鼠标 / ← → 键</span>
          <span>空格键发球 / 继续</span>
          <span>P 暂停</span>
        </div>
      </div>
    </section>

    <section class="screen-overlay" data-screen="transition" role="dialog" aria-modal="true" aria-labelledby="transition-title" aria-hidden="true">
      <div class="screen-card compact level-transition-card">
        <p class="eyebrow" data-transition="eyebrow">关卡完成</p>
        <h2 id="transition-title" data-transition="title">确认进入下一关？</h2>
        <p class="screen-copy" data-transition="summary">确认后将开始下一关挑战。</p>
        <div class="transition-stats" data-transition="stats"></div>
        <button class="primary-button" data-action="next-level" type="button">确认进入下一关</button>
        <button class="secondary-button" data-action="menu" type="button">选择关卡</button>
      </div>
    </section>

    <section class="screen-overlay" data-screen="pause" role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-hidden="true">
      <div class="screen-card compact">
        <p class="eyebrow">已暂停</p>
        <h2 id="pause-title">游戏暂停</h2>
        <button class="primary-button" data-action="resume" type="button">继续</button>
        <button class="secondary-button" data-action="restart" type="button">重新开始</button>
        <button class="secondary-button" data-action="menu" type="button">选择关卡</button>
        <div class="pause-powerup-guide">
          <h3>道具说明</h3>
          <ul>
            <li><strong>🎯 多球</strong>：分裂为多个弹球，最多5个</li>
            <li><strong>↔️ 加宽</strong>：挡板加长，持续15秒</li>
            <li><strong>🔥 火球</strong>：穿透砖块，持续10秒</li>
            <li><strong>🛡️ 护盾</strong>：底部护盾抵挡一次掉球</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="screen-overlay" data-screen="result" role="dialog" aria-modal="true" aria-labelledby="result-title" aria-hidden="true">
      <div class="screen-card compact">
        <p class="eyebrow" data-result="label">游戏结束</p>
        <h2 id="result-title" data-result="title">再来一局</h2>
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
const disposeGame = (): void => game.dispose()

window.addEventListener('pagehide', disposeGame, { once: true })
game.start()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('pagehide', disposeGame)
    game.dispose()
  })
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose())
}
