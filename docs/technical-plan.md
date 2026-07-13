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
- Resize 时重新计算画布尺寸和关卡砖块宽度。
- 移动端底部 HUD 和道具栏占用安全区，游戏底部判定线与挡板位置上移，避免被浏览器菜单或游戏 UI 遮挡。

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

当前版本提供 16 个关卡，并通过 `getLevelSummaries()` 给关卡选择 UI 提供展示数据。

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
| 1 | 热身练习 | 常规 | 基础教学 |
| 2 | 初遇护甲 | 常规 | 加固砖块教学 |
| 3 | 钢铁之门 | 常规 | 钢铁砖块路径 |
| 4 | 连锁爆破 | 限时 | 75 秒，掉落率 0.25 |
| 5 | 霓虹阶梯 | 常规 | 球速倍率 1.04 |
| 6 | 金属花园 | 常规 | 混合障碍 |
| 7 | 交叉火力 | 限时 | 85 秒，球速 1.06，掉落率 0.26 |
| 8 | 狭窄通道 | 常规 | 球速倍率 1.08 |
| 9 | 霓虹之心 | 常规 | 图案布局 |
| 10 | 终局网格 | 限时 | 95 秒，球速 1.10，掉落率 0.28 |
| 11 | 棱镜首领 | 首领 | 首领血量 4，9 秒脉冲 |
| 12 | 一分钟冲刺 | 限时 | 60 秒，球速 1.14，掉落率 0.34 |
| 13 | 护盾迷宫 | 常规 | 球速倍率 1.12 |
| 14 | 爆破花瓣 | 常规 | 球速 1.16，掉落率 0.27 |
| 15 | 超频挑战 | 限时 | 80 秒，球速 1.22，掉落率 0.30 |
| 16 | 日蚀首领 | 首领 | 首领血量 6，7 秒脉冲 |

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
hitRatio = (ball.x - paddle.x) / (paddle.width / 2)
angle = -90° + hitRatio * 约 52°
```

这样左侧偏左、右侧偏右、中间接近垂直。

## 10. UI 与 HUD

- `src/main.ts` 定义 HUD、开始页、下一关过渡页、暂停页、结算页和关卡选择容器。
- `src/ui/hud.ts` 负责更新分数、最高分、关卡、模式、计时、机会和道具状态。
- `HudController.renderLevelSelect()` 根据关卡摘要动态生成按钮式关卡卡片。
- `HudController.showLevelTransition()` 渲染下一关名称、模式、描述、奖励分数和机会数。
- 暂停页、下一关过渡页和结算页都提供“选择关卡”入口，便于直接切换挑战。

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

## 14. 性能策略

- 不使用第三方运行时框架。
- 游戏主体用 Canvas 单画布渲染。
- HUD 和关卡选择用 DOM，避免把文字 UI 全部绘制进 Canvas。
- 粒子生命周期短，结束后从数组移除。
- 动效优先使用 `transform`、`opacity`、Canvas 绘制。

## 15. 后续扩展

后续可添加：

- 移动砖块
- 隐藏砖块
- 激光道具
- 无尽模式
- 更复杂的首领技能
- 关卡编辑器
- 成绩分享文本
