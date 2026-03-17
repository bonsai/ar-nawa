# AR Tobu! Design Document
## AI Fitness Game - 技術設計資料

**Version:** 1.0  
**Last Updated:** 2026-03-17  
**Project:** AI-guided AR Fitness Game

---

## 目次

1. [概要](#1-概要)
2. [システム構成](#2-システム構成)
3. [コンポーネント設計](#3-コンポーネント設計)
4. [データ構造](#4-データ構造)
5. [ゲームアルゴリズム](#5-ゲームアルゴリズム)
6. [AI フィードバックシステム](#6-ai-フィードバックシステム)
7. [拡張アーキテクチャ](#7-拡張アーキテクチャ)
8. [パフォーマンス最適化](#8-パフォーマンス最適化)
9. [セキュリティ](#9-セキュリティ)
10. [テスト戦略](#10-テスト戦略)

---

## 1. 概要

### 1.1 プロジェクト目的

Web ブラウザ上で動作する AR 縄跳びゲーム。MediaPipe による姿勢推定と Three.js による 3D 描画を組み合わせ、AI がリアルタイムで運動をガイドする。

### 1.2 主要機能

- 姿勢推定によるジャンプ検出
- AR 空間での 3D ゲーム描画
- リアルタイム AI フィードバック
- スコア・コンボシステム
- 難易度動的調整

### 1.3 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|------------|
| 3D エンジン | Three.js | r128 |
| 姿勢推定 | MediaPipe Pose | latest |
| AR | WebXR API | Level 2 |
| 言語 | JavaScript | ES2020+ |
| 実行環境 | Web Browser | Chrome 90+ |

---

## 2. システム構成

### 2.1 アーキテクチャ図

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Environment                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  HTML/CSS    │    │   Assets     │                   │
│  │  (UI Layer)  │    │ (Models/Audio)│                  │
│  └──────────────┘    └──────────────┘                   │
│           ↓                  ↓                           │
│  ┌──────────────────────────────────────────┐           │
│  │         Main Application (main.js)       │           │
│  └──────────────────────────────────────────┘           │
│           ↓                  ↓                           │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  ARManager   │    │ PoseManager  │                   │
│  │  (WebXR)     │    │ (MediaPipe)  │                   │
│  └──────────────┘    └──────────────┘                   │
│           ↓                  ↓                           │
│  ┌──────────────────────────────────────────┐           │
│  │         GameManager (Game Logic)         │           │
│  └──────────────────────────────────────────┘           │
│           ↓                                              │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │ RenderManager│    │  Utils       │                   │
│  │ (Three.js)   │    │ (Helpers)    │                   │
│  └──────────────┘    └──────────────┘                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 モジュール依存関係

```
main.js
  ├── ar.js (ARManager)
  ├── pose.js (PoseManager)
  ├── game.js (GameManager)
  ├── render.js (RenderManager)
  └── utils.js (Utils)

game.js
  └── (events) → render.js

pose.js
  └── (events) → game.js

ar.js
  └── (events) → game.js
```

---

## 3. コンポーネント設計

### 3.1 ARManager (`ar.js`)

**責任:** WebXR セッション管理、平面検出、AR フォールバック

```javascript
class ARManager {
    // プロパティ
    session: XRSession | null
    referenceSpace: XRReferenceSpace | null
    isARSupported: boolean
    floorPosition: Vector3 | null

    // メソッド
    async init(): Promise<boolean>
    async startSession(glCanvas: HTMLCanvasElement): Promise<XRSession | null>
    setupPlaneDetection(): void
    getViewerPose(): XRPose | null
    endSession(): void
}
```

**イベント:**
- `floorDetected` - 床平面検出時

### 3.2 PoseManager (`pose.js`)

**責任:** MediaPipe 姿勢推定、ジャンプ検出、ジェスチャー認識

```javascript
class PoseManager {
    // プロパティ
    pose: Pose
    camera: Camera
    keypoints: Keypoint[]
    isJumping: boolean

    // メソッド
    async init(videoElement: HTMLVideoElement): Promise<void>
    onResults(results: PoseResults): void
    detectJump(keypoints: Keypoint[]): boolean
    detectWaveGesture(keypoints: Keypoint[]): boolean
    calculateJumpHeight(keypoints: Keypoint[]): number
}
```

**イベント:**
- `poseUpdate` - 姿勢データ更新時
- `jumpComplete` - ジャンプ完了時

### 3.3 GameManager (`game.js`)

**責任:** ゲーム状態管理、スコア計算、難易度調整、AI フィードバック

```javascript
class GameManager {
    // プロパティ
    state: 'idle' | 'countdown' | 'playing' | 'gameover'
    score: number
    combo: number
    ropeAngle: number
    ropeSpeed: number
    floorPosition: Vector3 | null
    playerState: 'ground' | 'jumping'

    // メソッド
    startGame(): void
    gameLoop(): void
    onJumpDetected(jumpData: JumpData): void
    onHitByRope(): void
    detectWaveGesture(keypoints: Keypoint[]): void
    gameOver(): void
    updateUI(): void
    reset(): void
}
```

**イベント:**
- `gameReady` - ゲーム準備完了
- `ropeUpdate` - 縄の位置更新
- `successJump` - ジャンプ成功
- `hitByRope` - 縄被弾
- `gameOver` - ゲーム終了

### 3.4 RenderManager (`render.js`)

**責任:** Three.js シーン管理、3D オブジェクト描画、アニメーション

```javascript
class RenderManager {
    // プロパティ
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    rope: THREE.Mesh
    robots: Robot[]

    // メソッド
    init(glCanvas: HTMLCanvasElement): void
    createScene(): void
    createRobots(): void
    createRope(): void
    updateRope(angle: number): void
    render(): void
}
```

**イベント:**
- `gameReady` - ゲーム準備完了（購読）
- `ropeUpdate` - 縄の位置更新（購読）
- `successJump` - ジャンプ成功（購読）

---

## 4. データ構造

### 4.1 基本データ型

```javascript
// 3D ベクトル
interface Vector3 {
    x: number
    y: number
    z: number
}

// 姿勢キーポイント
interface Keypoint {
    name: string          // e.g. "nose", "left_wrist"
    x: number             // 0-1 (正規化)
    y: number             // 0-1 (正規化)
    z: number             // 深度
    score: number         // 信頼度 0-1
}

// ジャンプデータ
interface JumpData {
    timestamp: number
    height: number        // cm
    duration: number      // ms
    fallback: boolean     // 簡易検出フラグ
}

// ゲーム状態
interface GameState {
    state: string
    score: number
    combo: number
    maxCombo: number
    failCount: number
    ropeAngle: number
    ropeSpeed: number
}
```

### 4.2 設定パラメータ

```javascript
// ゲームバランス設定
const GAME_CONFIG = {
    // ジャンプ判定
    JUMP_WINDOW: 0.25,           // ラジアン、縄の許容範囲
    JUMP_THRESHOLD: 0.3,         // 姿勢推定ジャンプ閾値
    JUMP_COOLDOWN: 500,          // ms, 連続ジャンプ防止

    // スコア計算
    BASE_SCORE: 100,             // 基本点
    COMBO_MULTIPLIER_MAX: 10,    // 最大コンボ倍率
    SPEED_BONUS_MAX: 0.04,       // 速度ボーナス上限

    // 難易度
    BASE_ROPE_SPEED: 0.08,       // 基本速度 rad/frame
    SPEED_INCREMENT: 0.001,      // スコア増加による速度上昇
    MAX_FAILS: 3,                // ゲームオーバーまでの失敗回数

    // ジェスチャー
    HANDS_UP_THRESHOLD: 0.7,     // 頭上判定閾値
    GESTURE_COOLDOWN: 500,       // ms, ジェスチャー認識間隔
}
```

### 4.3 ロボット配置

```javascript
// 3 体のロボット位置（ローカル座標系）
const ROBOT_POSITIONS = [
    { x: -1.5, y: 0, z: 0 },   // 左ロボット
    { x: 1.5, y: 0, z: 0 },    // 右ロボット
    { x: 0, y: 0, z: -2 }      // 奥ロボット（リーダー）
]

// 縄の物理パラメータ
const ROPE_PHYSICS = {
    length: 3.5,               // 縄の長さ（メートル）
    sag: 0.3,                  // 縄のたわみ
    rotationAxis: 'x',         // 回転軸
}
```

---

## 5. ゲームアルゴリズム

### 5.1 ジャンプ判定アルゴリズム

```javascript
/**
 * ジャンプ成功判定
 * 
 * @param {number} ropeAngle - 現在の縄の角度（ラジアン）
 * @param {JumpData} jumpData - ジャンプデータ
 * @returns {boolean} 成功判定
 */
function judgeJump(ropeAngle, jumpData) {
    // 縄の垂直位置を計算（-1〜1）
    const ropeY = Math.sin(ropeAngle)
    
    // 縄が下の位置か判定
    const isRopeLow = ropeY < -0.5
    
    // ジャンプタイミングウィンドウ内か判定
    const inWindow = Math.abs(ropeY) < GAME_CONFIG.JUMP_WINDOW
    
    // 成功条件：縄が下かつタイミングウィンドウ内
    return isRopeLow && inWindow
}
```

### 5.2 スコア計算アルゴリズム

```javascript
/**
 * スコア計算
 * 
 * @param {number} baseScore - 基本スコア
 * @param {number} combo - 現在のコンボ数
 * @param {number} jumpHeight - ジャンプ高さ（ボーナス）
 * @returns {number} 最終スコア
 */
function calculateScore(baseScore, combo, jumpHeight) {
    // コンボ倍率（最大 10 倍）
    const comboMultiplier = Math.min(combo, GAME_CONFIG.COMBO_MULTIPLIER_MAX)
    
    // 高さボーナス（理想高さ 30cm に近いほど高得点）
    const idealHeight = 30
    const heightDiff = Math.abs(jumpHeight - idealHeight)
    const heightBonus = Math.max(0, 1 - heightDiff / 20)
    
    // 最終スコア
    const score = baseScore * comboMultiplier * (1 + heightBonus * 0.5)
    
    return Math.floor(score)
}
```

### 5.3 難易度調整アルゴリズム

```javascript
/**
 * 難易度動的調整
 * 
 * @param {number} currentScore - 現在のスコア
 * @param {number} currentCombo - 最大コンボ数
 * @returns {number} 縄の速度
 */
function calculateRopeSpeed(currentScore, currentCombo) {
    const baseSpeed = GAME_CONFIG.BASE_ROPE_SPEED
    
    // スコアによる速度上昇（上限あり）
    const speedBonus = Math.min(
        GAME_CONFIG.SPEED_BONUS_MAX,
        currentScore / 10000
    )
    
    // コンボによるボーナス（高コンボ維持でさらに加速）
    const comboBonus = currentCombo >= 5 ? 0.01 : 0
    
    return baseSpeed + speedBonus + comboBonus
}
```

### 5.4 姿勢推定ジャンプ検出

```javascript
/**
 * ジャンプ検出（MediaPipe 姿勢キーポイント使用）
 * 
 * @param {Keypoint[]} keypoints - 姿勢キーポイント
 * @returns {JumpData | null} ジャンプデータ（検出されない場合 null）
 */
function detectJump(keypoints) {
    const nose = keypoints.find(k => k.name === 'nose')
    const leftAnkle = keypoints.find(k => k.name === 'left_ankle')
    const rightAnkle = keypoints.find(k => k.name === 'right_ankle')
    
    if (!nose || !leftAnkle || !rightAnkle) return null
    
    // 信頼度チェック
    if (nose.score < 0.5 || leftAnkle.score < 0.5 || rightAnkle.score < 0.5) {
        return null
    }
    
    // 頭部と足首の Y 座標差を計算
    const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2
    const verticalDiff = nose.y - avgAnkleY
    
    // 閾値を超えたらジャンプと判定
    if (verticalDiff > GAME_CONFIG.JUMP_THRESHOLD) {
        return {
            timestamp: Date.now(),
            height: calculateJumpHeight(verticalDiff),
            duration: 0,  // 着地で更新
            fallback: false
        }
    }
    
    return null
}
```

---

## 6. AI フィードバックシステム

### 6.1 フィードバック生成エンジン

```javascript
class AIFeedbackEngine {
    constructor() {
        this.feedbackTemplates = {
            success: [
                "ナイスジャンプ！",
                "いいリズム！",
                "コンボ継続中！",
                "完璧なタイミング！",
                "もっと跳んでる！"
            ],
            encouragement: [
                "あと少し！",
                "もっと高く跳んで！",
                "タイミングを合わせて！",
                "諦めないで！",
                "次は成功する！"
            ],
            advice: [
                "膝を曲げて準備しよう",
                "腕を振って跳ぶといいよ",
                "リズムを取ることが大事",
                "着地は静かに",
                "呼吸を忘れずに"
            ],
            celebration: [
                "新記録更新！",
                "神業ジャンプ！",
                "プロ級のリズム！",
                "アンタ最強！",
                "伝説の縄跳び師！"
            ]
        }
    }

    /**
     * 状況に応じたフィードバック生成
     */
    generateFeedback(context) {
        const { score, combo, jumpSuccess, newRecord } = context
        
        if (newRecord) {
            return this.selectRandom(this.feedbackTemplates.celebration)
        }
        
        if (jumpSuccess) {
            if (combo >= 5) {
                return this.selectRandom(this.feedbackTemplates.celebration)
            }
            return this.selectRandom(this.feedbackTemplates.success)
        }
        
        if (combo < 3) {
            return this.selectRandom(this.feedbackTemplates.encouragement)
        }
        
        return this.selectRandom(this.feedbackTemplates.advice)
    }

    selectRandom(array) {
        return array[Math.floor(Math.random() * array.length)]
    }
}
```

### 6.2 音声フィードバック統合

```javascript
class AudioFeedbackManager {
    constructor() {
        this.synth = window.speechSynthesis
        this.enabled = true
        this.lastFeedbackTime = 0
        this.feedbackCooldown = 2000  // 2 秒間隔
    }

    speak(text) {
        if (!this.enabled) return
        
        const now = Date.now()
        if (now - this.lastFeedbackTime < this.feedbackCooldown) {
            return  // クールダウン中はスキップ
        }
        
        this.synth.cancel()  // 前の発話をキャンセル
        
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ja-JP'
        utterance.rate = 1.2  // 少し速め
        utterance.pitch = 1.1 // 少し高め
        
        this.synth.speak(utterance)
        this.lastFeedbackTime = now
    }
}
```

### 6.3 パーソナライズドアドバイス

```javascript
class PersonalizedCoach {
    constructor() {
        this.playerHistory = []
        this.weaknessPatterns = {
            timing_early: 0,      // タイミングが早い
            timing_late: 0,       // タイミングが遅い
            low_jump: 0,          // ジャンプが低い
            inconsistent: 0       // リズムが不安定
        }
    }

    analyzeJump(jumpData, ropeAngle) {
        const timing = this.analyzeTiming(jumpData, ropeAngle)
        const height = jumpData.height
        
        // パターン認識
        if (timing === 'early') this.weaknessPatterns.timing_early++
        if (timing === 'late') this.weaknessPatterns.timing_late++
        if (height < 20) this.weaknessPatterns.low_jump++
        
        // 履歴保存
        this.playerHistory.push({
            timestamp: Date.now(),
            timing,
            height,
            success: jumpData.success
        })
        
        // 最新 50 件のみ保持
        if (this.playerHistory.length > 50) {
            this.playerHistory.shift()
        }
    }

    generateAdvice() {
        // 最も多い弱点を特定
        const maxWeakness = Object.entries(this.weaknessPatterns)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0]
        
        const adviceMap = {
            timing_early: "少し待つ意識で跳ぼう",
            timing_late: "縄をよく見て早めに準備",
            low_jump: "もっと膝を使って跳んで",
            inconsistent: "一定のリズムをキープして"
        }
        
        return adviceMap[maxWeakness] || "いい調子だよ！"
    }
}
```

---

## 7. 拡張アーキテクチャ

### 7.1 新種目追加インターフェース

```javascript
/**
 * 新種目実装のためのインターフェース
 */
class GameMode {
    constructor(name) {
        this.name = name
        this.config = {}
    }
    
    // オーバーライド必須メソッド
    init() { throw new Error('Must implement init()') }
    update(deltaTime) { throw new Error('Must implement update()') }
    judge(playerAction, gameState) { throw new Error('Must implement judge()') }
    calculateScore(judgeResult) { throw new Error('Must implement calculateScore()') }
}

/**
 * 例：二重跳びモード
 */
class DoubleUndersMode extends GameMode {
    constructor() {
        super('double_unders')
        this.config = {
            ropeSpeed: 0.15,
            jumpWindow: 0.15,
            requiredHeight: 40  // 40cm 以上必須
        }
    }
    
    judge(playerAction, gameState) {
        // 二重跳び判定：縄が 2 回転する間に 1 回ジャンプ
        const ropeRotations = gameState.ropeAngle / (Math.PI * 2)
        const jumpHeight = playerAction.jumpHeight
        
        if (jumpHeight >= this.config.requiredHeight) {
            return { success: true, bonus: 2 }  // 2 倍ボーナス
        }
        return { success: false, message: 'もっと高く！' }
    }
}
```

### 7.2 マルチプレイアーキテクチャ

```javascript
/**
 * マルチプレイ管理クラス（将来拡張用）
 */
class MultiplayerManager {
    constructor() {
        this.players = []
        this.roomId = null
        this.ws = null  // WebSocket
    }

    async createRoom() {
        // WebSocket サーバーにルーム作成
        this.ws = new WebSocket('wss://ar-tobi-server.example/multiplayer')
        
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({
                type: 'create_room',
                gameMode: 'rope_jump'
            }))
        }
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            this.handleServerMessage(data)
        }
    }

    joinRoom(roomId) {
        this.roomId = roomId
        this.ws.send(JSON.stringify({
            type: 'join_room',
            roomId: roomId
        }))
    }

    syncGameState(gameState) {
        // 他プレイヤーと状態同期
        this.ws.send(JSON.stringify({
            type: 'game_state',
            state: gameState,
            timestamp: Date.now()
        }))
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'room_created':
                this.roomId = data.roomId
                break
            case 'player_joined':
                this.players.push(data.player)
                break
            case 'game_state_update':
                this.updateOtherPlayers(data.state)
                break
        }
    }
}
```

### 7.3 クラウド連携

```javascript
/**
 * プレイデータクラウド保存
 */
class CloudSaveManager {
    constructor(apiKey) {
        this.apiKey = apiKey
        this.baseUrl = 'https://api.ar-tobi.example/v1'
    }

    async saveGameRecord(gameData) {
        const response = await fetch(`${this.baseUrl}/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                score: gameData.score,
                maxCombo: gameData.maxCombo,
                duration: gameData.duration,
                timestamp: Date.now(),
                deviceInfo: this.getDeviceInfo()
            })
        })
        
        return await response.json()
    }

    async getLeaderboard(limit = 100) {
        const response = await fetch(`${this.baseUrl}/leaderboard?limit=${limit}`)
        return await response.json()
    }

    async getPersonalStats() {
        const response = await fetch(`${this.baseUrl}/stats/me`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            }
        })
        return await response.json()
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            deviceMemory: navigator.deviceMemory || 'unknown'
        }
    }
}
```

---

## 8. パフォーマンス最適化

### 8.1 描画最適化

```javascript
// 最適化テクニック

// 1. ジオメトリのインスタンス化
const robotGeometry = new THREE.SphereGeometry(0.3, 16, 16)
const robotMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 })

// 3 体すべて同じジオメトリを共有
robots.forEach(robot => {
    robot.mesh = new THREE.Mesh(robotGeometry, robotMaterial)
})

// 2. フレームレート制限
const targetFPS = 60
const frameInterval = 1000 / targetFPS

let lastFrameTime = 0
function renderLoop(currentTime) {
    if (currentTime - lastFrameTime >= frameInterval) {
        updateGame()
        renderScene()
        lastFrameTime = currentTime
    }
    requestAnimationFrame(renderLoop)
}

// 3. 不要な再描画回避
let sceneDirty = false
function markSceneDirty() {
    sceneDirty = true
}

function render() {
    if (!sceneDirty) return
    renderer.render(scene, camera)
    sceneDirty = false
}
```

### 8.2 姿勢推定最適化

```javascript
// MediaPipe 設定最適化

const poseConfig = {
    // 精度 vs パフォーマンスバランス
    modelComplexity: 1,      // 0: 軽量，1: 標準，2: 高精度
    smoothLandmarks: true,   // 時間的平滑化
    enableSegmentation: false, // 不要なら無効
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
}

// フレームスキップ（負荷が高い場合）
let frameCount = 0
const skipFrames = 2  // 3 フレームに 1 回処理

async function processFrame() {
    frameCount++
    if (frameCount % skipFrames !== 0) {
        return  // スキップ
    }
    await pose.send({ image: videoElement })
}
```

### 8.3 メモリ管理

```javascript
// オブジェクトプーリング
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn
        this.resetFn = resetFn
        this.pool = []
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn())
        }
    }

    acquire() {
        return this.pool.length > 0 
            ? this.pool.pop() 
            : this.createFn()
    }

    release(obj) {
        this.resetFn(obj)
        this.pool.push(obj)
    }
}

// 使用例：エフェクトオブジェクト
const effectPool = new ObjectPool(
    () => new THREE.Sprite(material),
    (sprite) => { sprite.visible = false }
)

function createEffect(position) {
    const effect = effectPool.acquire()
    effect.position.copy(position)
    effect.visible = true
    return effect
}
```

---

## 9. セキュリティ

### 9.1 プライバシー保護

```javascript
// カメラ映像のローカル処理のみ
class PrivacyManager {
    constructor() {
        this.videoStream = null
        this.dataCollection = {
            cameraFeed: false,      // 映像保存なし
            poseData: false,        // 姿勢データ保存なし
            analytics: true         // 匿名統計のみ
        }
    }

    async startCamera() {
        // ユーザー許可必須
        this.videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        })
        
        // ローカル処理のみ、送信なし
        this.processLocally()
    }

    processLocally() {
        // MediaPipe は完全にローカルで実行
        // サーバー送信なし
    }

    stopCamera() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop())
            this.videoStream = null
        }
    }
}
```

### 9.2 XSS 対策

```javascript
// ユーザー入力サニタイズ
class SecurityUtils {
    static sanitizeHTML(str) {
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }

    static safeDisplayMessage(message) {
        // スコア表示などに使用
        const safeMsg = this.sanitizeHTML(message)
        document.getElementById('message').textContent = safeMsg
    }
}

// Content Security Policy
// <meta http-equiv="Content-Security-Policy" 
//       content="default-src 'self'; script-src 'self' cdn.jsdelivr.net; ...">
```

---

## 10. テスト戦略

### 10.1 ユニットテスト

```javascript
// game.test.js
describe('GameManager', () => {
    let gameManager

    beforeEach(() => {
        gameManager = new GameManager()
        gameManager.reset()
    })

    test('初期状態は idle', () => {
        expect(gameManager.state).toBe('idle')
        expect(gameManager.score).toBe(0)
        expect(gameManager.combo).toBe(1)
    })

    test('ゲームスタートで countdown に移行', () => {
        gameManager.startGame()
        expect(gameManager.state).toBe('countdown')
    })

    test('ジャンプ成功でスコア加算', () => {
        gameManager.state = 'playing'
        gameManager.ropeAngle = Math.PI * 1.5  // 縄が下の位置
        
        gameManager.onJumpDetected({ 
            timestamp: Date.now(),
            height: 30,
            fallback: false
        })
        
        expect(gameManager.score).toBeGreaterThan(0)
        expect(gameManager.combo).toBe(2)
    })

    test('3 回失敗でゲームオーバー', () => {
        gameManager.state = 'playing'
        
        for (let i = 0; i < 3; i++) {
            gameManager.onHitByRope()
        }
        
        expect(gameManager.state).toBe('gameover')
    })
})
```

### 10.2 統合テスト

```javascript
// integration.test.js
describe('ゲームフロー統合テスト', () => {
    test('スタートからゲームオーバーまで', async () => {
        // 1. 姿勢推定初期化
        await poseManager.init(videoElement)
        
        // 2. ゲーム準備
        arManager.floorPosition = { x: 0, y: 0, z: 0 }
        window.dispatchEvent(new CustomEvent('floorDetected', {
            detail: { plane: arManager.floorPosition }
        }))
        
        // 3. ジェスチャーでスタート
        const mockKeypoints = createHandsUpKeypoints()
        window.dispatchEvent(new CustomEvent('poseUpdate', {
            detail: { keypoints: mockKeypoints }
        }))
        
        // 4. ゲームプレイ
        expect(gameManager.state).toBe('countdown')
        
        // 5. カウントダウン完了を待機
        await sleep(3000)
        expect(gameManager.state).toBe('playing')
    })
})
```

### 10.3 パフォーマンステスト

```javascript
// performance.test.js
describe('パフォーマンステスト', () => {
    test('60FPS でレンダリング', async () => {
        const fpsMeasurements = []
        
        let frameCount = 0
        let startTime = performance.now()
        
        function measureFrame() {
            frameCount++
            const elapsed = performance.now() - startTime
            
            if (elapsed >= 1000) {  // 1 秒ごとに記録
                fpsMeasurements.push(frameCount)
                frameCount = 0
                startTime = performance.now()
            }
            
            if (fpsMeasurements.length < 5) {
                requestAnimationFrame(measureFrame)
            }
        }
        
        measureFrame()
        
        // 5 秒間の平均 FPS
        await sleep(5000)
        const avgFPS = fpsMeasurements.reduce((a, b) => a + b, 0) / fpsMeasurements.length
        
        expect(avgFPS).toBeGreaterThanOrEqual(55)  // 許容誤差 5FPS
    })

    test('ジャンプ検出レイテンシ < 100ms', async () => {
        const jumpStartTime = performance.now()
        let detected = false
        
        window.addEventListener('jumpComplete', () => {
            const latency = performance.now() - jumpStartTime
            expect(latency).toBeLessThan(100)
            detected = true
        })
        
        // 模擬ジャンプ
        simulateJump()
        
        await sleep(200)
        expect(detected).toBe(true)
    })
})
```

---

## 付録 A: 開発環境セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/ar-tobi/ar-tobi.git
cd ar-tobi

# 2. ローカルサーバー起動（いずれか）

# Python
python -m http.server 8080

# Node.js
npx http-server -p 8080

# 3. ブラウザでアクセス
open http://localhost:8080
```

## 付録 B: デバッグコマンド

```javascript
// ブラウザコンソールで使用可能

// ゲーム強制スタート
startGame()

// ゲームリセット
resetGame()

// 現在の状態表示
console.log(gameManager.state)
console.log('Score:', gameManager.score)
console.log('Combo:', gameManager.combo)

// フレームレート表示
showFPS()

// 姿勢推定デバッグ表示
togglePoseDebug()
```

## 付録 C: 参照ドキュメント

- [Three.js Documentation](https://threejs.org/docs/)
- [MediaPipe Pose Detection](https://google.github.io/mediapipe/solutions/pose)
- [WebXR Device API](https://www.w3.org/TR/webxr/)
- [Game Design Document Template](https://github.com/ar-tobi/docs/gdd-template.md)

---

**End of Design Document**
