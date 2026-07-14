# 霓虹弹球打砖块技术方案

## 1. 技术选型

```text
Vite + Vanilla TypeScript
├── 渲染：Canvas 2D
├── UI：HTML + CSS
├── 物理：自写轻量碰撞
├── 动效：Canvas 粒子 + CSS 过渡
├── 音效：Web Audio API
├── 存档：localStorage
└── 部署：EdgeOne Pages
```

## 2. 免费部署说明

项目是纯静态前端，无后端、无数据库、无云函数、无付费 API、无图片/音频素材。构建产物为 `dist/`，可直接部署到 EdgeOne Pages。

EdgeOne Pages 配置：

| 配置项 | 值 |
|---|---|
| Framework | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node Version | `20` 或 `22` |

## 3. 项目结构

```text
src/
├── main.ts                  # DOM 入口与页面结构
├── game.ts                  # 游戏主循环和规则编排
├── style.css                # 页面/HUD/响应式样式
├── audio/
│   └── synth.ts             # Web Audio 合成音效
├── engine/
│   ├── math.ts              # 向量、碰撞、反射
│   ├── particles.ts         # Canvas 粒子系统
│   ├── renderer.ts          # Canvas 2D 渲染器
│   └── storage.ts           # localStorage 最高分
├── entities/
│   ├── ball.ts              # 球
│   ├── brick.ts             # 砖块
│   ├── paddle.ts            # 挡板
│   └── powerup.ts           # 道具
├── levels/
│   └── level-data.ts        # 关卡配置与砖块生成
└── ui/
    └── hud.ts               # HUD、屏幕状态和关卡选择控制
```

## 4. 主循环

使用 `requestAnimationFrame`：

```text
计算 deltaSeconds
如果游戏中：更新关卡规则、输入、物理、碰撞、道具、粒子、关卡状态
渲染当前帧
请求下一帧
```

为了避免切后台后时间跨度过大，单帧 delta 限制为 `1/30s`。限时关倒计时和首领技能冷却都基于同一个 delta 驱动。

## 5. 坐标与缩放

- 游戏使用 CSS 像素作为逻辑坐标。
- Canvas 宽高乘以 `devicePixelRatio` 保证高清。
- `context.setTransform(dpr, 0, 0, dpr, 0, 0)` 后所有绘制仍使用逻辑坐标。
- Resize 时重新计算画布尺寸、关卡砖块宽度和位置，并保留当前砖块的存活状态、剩余血量和命中闪烁状态，避免窗口变化导致已消除砖块复活。
- PC 端 HUD 固定为右侧竖向信息面板，砖块生成会预留右侧安全区，避免顶部菜单遮挡第一排砖块或右侧面板覆盖砖块。
- 移动端底部 HUD 和道具栏占用安全区，游戏底部判定线与挡板位置上移，避免被浏览器菜单或游戏 UI 遮挡。
- 关卡采用高密度砖块布局：前中期关卡主要使用 12 列，难度 6+ 关卡主要使用 14 列；砖块高度控制在 14-20px，间距控制在 4-6px，以在不压迫移动端操作空间的前提下增加清场目标。

## 6. 关卡系统 2.0

`src/levels/level-data.ts` 使用配置化关卡定义：

```text
LevelDefinition
├── name / description       # 展示名称和说明
├── mode                     # 模式，取值为 classic / timed / boss，对应页面展示为常规 / 限时 / 首领
├── difficulty               # 难度展示
├── pattern                  # 字符矩阵生成砖块
├── ballSpeedMultiplier      # 单关球速倍率
├── powerUpDropRate          # 单关道具掉落率
├── timeLimitSeconds         # 限时关倒计时
├── bossSkillIntervalSeconds # 首领技能间隔
└── bossHealth               # 首领砖块血量
```

关卡矩阵符号：

| 符号 | 砖块 |
|---|---|
| `R` / `Y` / `G` / `B` / `P` | 普通砖块，使用不同颜色 |
| `H` | 加固砖块 |
| `S` | 钢铁砖块 |
| `X` | 爆炸砖块 |
| `O` | 首领砖块 |
| `.` | 空位 |

当前版本提供 16 个关卡，前中期关卡主要为 12 列矩阵，难度 6+ 关卡主要为 14 列矩阵，并通过 `getLevelSummaries()` 给关卡选择 UI 提供展示数据。

### 6.1 关卡数据流

```text
level-data.ts
├── levelDefinitions         # 16 关静态配置
├── getLevelSummaries()      # 开始页关卡选择卡片数据
├── getLevelDefinition()     # 游戏运行时读取完整配置
├── getLevelPowerUpDropRate()# 按关卡读取道具掉落率
├── getLevelChanceCount()    # 难度 1-4 返回 1 次机会，难度 5+ 返回 2 次机会
└── createLevelBricks()      # 根据 pattern 和屏幕宽度生成砖块实体

main.ts
└── 提供 [data-level-list] 容器

hud.ts
└── renderLevelSelect() 动态渲染关卡按钮

game.ts
├── selectedLevelIndex       # 当前选择的起始关卡
├── levelIndex               # 当前正在游玩的关卡
├── phase                    # start / playing / transition / paused / result
├── levelTimeRemainingSeconds# 限时模式剩余时间
└── bossSkillCooldownSeconds # 首领脉冲冷却时间

机会数规则：简单关卡难度 1-4 为 1 次机会；较难关卡难度 5-9 为 2 次机会。`loadLevel()` 会按当前关卡调用 `getLevelChanceCount()` 重置剩余机会，HUD 的“机会”展示当前关剩余机会。
```

### 6.2 当前关卡清单

| 序号 | 名称 | 模式 | 关键配置 |
|---|---|---|---|
| 1 | 热身练习 | 常规 | 12 列四排基础教学 |
| 2 | 初遇护甲 | 常规 | 12 列加固砖块教学 |
| 3 | 钢铁之门 | 常规 | 12 列钢铁砖块路径 |
| 4 | 连锁爆破 | 限时 | 90 秒，掉落率 0.25 |
| 5 | 霓虹阶梯 | 常规 | 12 列阶梯布局，球速倍率 1.04 |
| 6 | 金属花园 | 常规 | 12 列混合障碍 |
| 7 | 交叉火力 | 限时 | 100 秒，球速 1.06，掉落率 0.26 |
| 8 | 狭窄通道 | 常规 | 12 列通道布局，球速倍率 1.08 |
| 9 | 霓虹之心 | 常规 | 12 列图案布局 |
| 10 | 终局网格 | 限时 | 115 秒，14 列网格，球速 1.10，掉落率 0.28 |
| 11 | 棱镜首领 | 首领 | 14 列首领布局，首领血量 4，9 秒脉冲 |
| 12 | 一分钟冲刺 | 限时 | 80 秒，14 列冲刺布局，球速 1.14，掉落率 0.34 |
| 13 | 护盾迷宫 | 常规 | 14 列迷宫布局，球速倍率 1.12 |
| 14 | 爆破花瓣 | 常规 | 14 列花瓣布局，球速 1.16，掉落率 0.27 |
| 15 | 超频挑战 | 限时 | 100 秒，14 列高速布局，球速 1.22，掉落率 0.30 |
| 16 | 日蚀首领 | 首领 | 14 列终局首领布局，首领血量 6，7 秒脉冲 |

## 7. 模式规则

- 常规：常规清砖，无倒计时。
- 限时：`levelTimeRemainingSeconds` 每帧递减，归零触发失败；通关时按剩余秒数给分。
- 首领：存在存活首领砖块时，`bossSkillCooldownSeconds` 递减；归零触发首领脉冲，给所有球提速并产生震屏和音效。首领砖块不会被爆炸砖块连锁消除，每次被球命中会显示血量提示、砖块内血量数字、粒子反馈和轻震屏，避免玩家误以为命中无效。

## 8. 关卡流转

清空当前关卡所有可消除砖块后，`checkLevelComplete()` 会先结算剩余机会奖励和限时奖励。

- 如果当前关是最终关：直接进入结算页。
- 如果还有下一关：进入 `transition` 阶段，展示下一关过渡页。
- 过渡页展示确认进入下一关的提示、下一关名称、模式、描述、奖励分数和下一关机会数。
- 玩家点击“确认进入下一关”或按空格键确认后，`continueToNextLevel()` 调用 `loadLevel()`，再回到 `playing` 阶段。
- 玩家也可以在过渡页选择回到关卡菜单，此时默认选中下一关。

## 9. 物理碰撞

### 9.1 圆形与矩形碰撞

`resolveCircleRectCollision(circle, rect)` 返回：

- `normal`：反弹法线
- `penetration`：穿透深度

### 9.2 速度反射

使用公式：

```text
v' = v - 2 * dot(v, n) * n
```

### 9.3 挡板反弹角度

球撞击挡板的位置决定反弹角：

```text
hitRatio = (impactX - paddle.x) / (paddle.width / 2)
angle = -90° + hitRatio * 约 52°
```

这样左侧偏左、右侧偏右、中间接近垂直。`Ball.update()` 会记录 `previousPosition`，挡板碰撞优先使用当前帧圆形/矩形重叠检测；若高速球在单帧内从挡板上方移动到挡板下方，则通过 `resolveSweptCircleTopRectCollision()` 检测运动线段是否穿过挡板顶部扩展面，命中后把球放回撞击点并按 `impactX` 计算反弹角，避免掉帧或高速状态下偶发穿板。

### 9.4 轨迹稳定与防卡死

所有会改变球速方向的入口都会经过 `stabilizeBallVelocity()`：墙体、挡板、砖块、护盾、多球生成、速度提升和首领脉冲。底层由 `stabilizeVelocityAxes()` 保持总速度不变，同时为水平和垂直轴保留最小速度分量（当前水平不低于 12%，垂直不低于 16%），避免纯横向或纯纵向往返造成长时间死循环。若某个轴速度为 0，则根据碰撞上下文提供确定性兜底方向，不依赖随机数，保证复现稳定。

### 9.5 多球碰撞策略

`handleBrickCollisions()` 在同一帧内按球逐个处理砖块碰撞。每颗球最多命中一个砖块，命中后跳出该球的砖块扫描，但不会中断其他球的碰撞处理，保证多球道具在高密度关卡中有稳定清场反馈。

## 10. UI 与 HUD

- `src/main.ts` 定义 HUD、开始页、下一关过渡页、暂停页、结算页和关卡选择容器；开始页直接展示单行游戏名，不再显示部署宣传眉标。
- `src/ui/hud.ts` 负责更新分数、最高分、关卡、模式、计时、机会、道具状态，以及覆盖层显隐、焦点和可访问性属性。
- `src/game.ts` 通过 `Game.setPhase()` 统一维护游戏阶段，并集中映射 HUD 屏幕，避免开始、暂停、过渡和结算流程分散调用 `showScreen()`。
- `HudController.renderLevelSelect()` 根据关卡摘要动态生成按钮式关卡卡片。
- `HudController.showLevelTransition()` 和 `HudController.showResult()` 只渲染内容，实际切屏由 `Game.setPhase()` 统一触发，确保 phase、覆盖层和焦点状态一致。
- PC 端 HUD 布局：分数、关卡、模式、计时、机会和暂停按钮以底部横向面板形式居中显示（`bottom: 16px`, `left: 50%`, `max-width: 960px`），道具栏独立放在分数菜单上方（`bottom: 82px`），形成底部双层布局，避免两个菜单重叠；两层均参考移动端胶囊风格；砖块布局使用全画布宽度，通过 `desktopBottomDockHeight: 144` 和 `desktopControlDockHeight: 144` 预留底部空间，确保挡板和弹球不会进入 HUD 区域。
- 移动端自适应布局：`Game` 在 `resize()` 中基于 `visualViewport` 计算统一响应式布局，集中给出底部菜单预留区、可玩底线、挡板 Y 坐标、挡板宽度、护盾宽度、砖块顶部偏移和砖块网格宽高约束。砖块布局通过 `createLevelBricks()` 的布局参数同时考虑屏幕宽度、行列数和底部控制区，确保 320px 窄屏和短横屏下砖块不会溢出或压到挡板区域。
- 移动端 HUD 布局：分数菜单通过 CSS 变量贴近安全区底部（`--mobile-safe-bottom`），道具栏通过 `--mobile-hud-height`、`--mobile-powerup-height` 和 `--mobile-hud-gap` 自动固定在分数菜单上方，避免继续依赖固定 `120px` 偏移；≤360px 设备进一步压缩字号、间距和按钮宽度，横屏短屏切换为单行紧凑 HUD 并隐藏触控提示。
- 移动端挡板与护盾适配：挡板基础宽度通过 `getResponsiveSegmentWidth()` 按屏宽缩放到约 30%，并限制在 88～112px；短横屏改用更短比例和 76～104px 限制。护盾在移动端居中缩短为约 62% 屏宽，短横屏进一步缩短为约 48% 屏宽，视觉长度和实际拦截范围一致，避免小屏下挡板和护盾过长。
- 开始、过渡、暂停和结算覆盖层使用 `dialog` 语义、`aria-modal` 和标题关联，隐藏时同步 `aria-hidden` 与 `inert`，避免不可见控件进入 Tab 顺序。
- 屏幕切换后焦点自动落到当前覆盖层主按钮；回到游戏时焦点返回 Canvas，保证键盘用户能继续用空格、方向键和快捷键操作。
- 按钮和关卡卡片提供 `:focus-visible` 高对比焦点样式。
- 暂停页、下一关过渡页和结算页都提供"选择关卡"入口，便于直接切换挑战。

## 11. 道具实现

道具作为独立实体从砖块位置下落。挡板接住后触发效果：

- `multiball`：复制两个新球。
- `wide`：设置 `paddle.wideTimer = 15`。
- `fireball`：设置所有球 `fireballTimer = 10`。
- `shield`：增加一次底部护盾次数。

道具掉落率由关卡配置控制，默认值为 `0.22`。

## 12. 音效实现

使用 Web Audio API 动态合成：

- `OscillatorNode` 生成波形。
- `GainNode` 控制音量包络。
- `BiquadFilterNode` 做低通滤波。

不加载音频文件，因此没有版权和资源体积问题。

## 13. 本地存档

最高分通过 `localStorage` 保存：

```text
key: neon-breakout-best-score
value: number string
```

## 14. 性能与生命周期策略

- 不使用第三方运行时框架。
- 游戏主体用 Canvas 单画布渲染。
- HUD 和关卡选择用 DOM，避免把文字 UI 全部绘制进 Canvas。
- 粒子系统使用原地压缩清理失效粒子，避免逐个 `splice` 带来的数组搬移和 GC 压力。
- 球体拖尾使用固定容量环形缓冲区，复用坐标对象，避免每帧 `unshift` 和对象深拷贝。
- 背景渐变按画布尺寸缓存，砖块渐变按颜色、类型和高度缓存，减少每帧重复创建 `CanvasGradient`。
- 砖块碰撞按固定尺寸网格桶预索引，每帧只检测球所在网格附近的候选砖块，降低多球和高密度关卡下的遍历成本。
- 关键游戏数值集中在 `Game` 的配置对象中，便于后续调参与减少散落魔法数字。
- 音效系统对 `resume()`、播放和关闭链路统一捕获异常，浏览器禁止自动播放或 AudioContext 关闭失败时只降级跳过音效。
- `Game.dispose()` 会取消动画帧、释放指针捕获、解绑窗口/画布/按钮事件，并关闭音频上下文。
- 入口在 `pagehide` 和 Vite HMR dispose 时调用 `game.dispose()`，避免页面卸载或热更新后残留事件监听器。
- 动效优先使用 `transform`、`opacity`、Canvas 绘制。

## 15. 验证策略

- `npm run build` 执行 TypeScript 类型检查并生成生产构建。
- `npm run test` 使用 Vitest 覆盖核心数学工具、砖块实体规则和关卡砖块布局，作为后续碰撞、边界和类型守卫改动的回归基线。
- 挡板边界统一通过 `clampPaddleCenterX()` 约束，测试覆盖普通边界和棋盘窄于挡板的兜底场景。
- 移动端挡板和护盾宽度统一通过 `getResponsiveSegmentWidth()` 计算，测试覆盖桌面保持原宽、移动端比例缩放、最小/最大值限制和极窄屏兜底。
- 砖块自适应布局通过 `createLevelBricks()` 覆盖桌面、紧凑桌面、320px 窄屏和短屏底部预留场景，确保砖块不会超出横向视口或压入控制区域。
- 挡板扫掠碰撞通过 `resolveSweptCircleTopRectCollision()` 覆盖高速球跨帧穿过挡板顶部的回归场景，并验证横向错过时不会误判。
- 弹球轨迹稳定通过 `stabilizeVelocityAxes()` 覆盖纯横向、纯纵向和正常斜向速度场景，确保防卡死逻辑保速、方向确定且不会影响已有有效反弹角。
- 砖块类型判断统一提供 `isSteelBrick()`、`isBossBrick()` 和 `isDestructibleBrick()` 类型守卫，测试覆盖钢铁、首领和普通砖块行为。

## 16. 后续扩展

后续可添加：

- 移动砖块
- 隐藏砖块
- 激光道具
- 无尽模式
- 更复杂的首领技能
- 关卡编辑器
- 成绩分享文本
