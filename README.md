# AR Tobu! 🤖 ロボットと縄跳び

Web ブラウザで動作する AR 縄跳びゲームです。Three.js と MediaPipe を使用して、ロボットと一緒に縄跳びを楽しめます。

## 特徴

- ✅ **純粋な JavaScript 実装** - Next.js/React なし、軽量で高速
- ✅ **AR 対応** - WebXR 対応デバイスでは AR として動作
- ✅ **姿勢推定** - MediaPipe でジャンプを検出
- ✅ **3 体のロボット** - 縄を回すロボットたち
- ✅ **スコア＆コンボ** - タイミングよく跳んで高スコアを目指そう

## 遊び方

1. **両手を頭上に挙げる** - ゲームがスタートします
2. **縄のタイミングに合わせてジャンプ** - 縄が足元に来たら跳ぼう
3. **コンボを繋げよう** - 成功するごとにスコアアップ！

### コントロール

| アクション | 操作方法 |
|------------|----------|
| ゲームスタート | 両手を頭上に挙げる |
| ジャンプ | 実際に跳ぶ（姿勢推定で検出） |
| リトライ | ゲームオーバー後、再度手を挙げる |

## 技術スタック

- **Three.js r128** - 3D レンダリング
- **MediaPipe Pose Detection** - 姿勢推定
- **WebXR** - AR 機能（対応デバイスのみ）

## プロジェクト構造

```
ar-tobi/
├── index.html          # メインエントリー
├── style.css           # スタイル
├── js/
│   ├── main.js         # アプリ初期化
│   ├── ar.js           # WebXR/AR 機能
│   ├── pose.js         # MediaPipe 姿勢推定
│   ├── game.js         # ゲームロジック
│   ├── render.js       # Three.js 描画
│   └── utils.js        # ユーティリティ
└── assets/             # 3D モデル、音声など
```

## ローカル実行

### 方法 1: Python

```bash
cd ar-tobi
python -m http.server 8080
```

### 方法 2: Node.js (http-server)

```bash
cd ar-tobi
npx http-server -p 8080
```

### 方法 3: VS Code Live Server

VS Code の Live Server 拡張機能を使用

その後、ブラウザで `http://localhost:8080` にアクセス

## 対応ブラウザ

- ✅ Chrome (推奨)
- ✅ Edge
- ⚠️ Safari (一部機能制限あり)
- ❌ Firefox (WebXR 非対応)

## 必要な権限

- **カメラ** - 姿勢推定に使用

## デバッグ

ブラウザの開発者コンソールでログを確認できます：

```javascript
// コンソールでゲーム操作
startGame()  // ゲーム強制スタート
resetGame()  // ゲームリセット
```

## トラブルシューティング

### カメラが起動しない

- ブラウザのカメラ権限を確認
- HTTPS または localhost でアクセス

### 動きがカクつく

- 照明を明るくする
- カメラ解像度を下げる（pose.js を編集）
- ブラウザを再起動

### AR が機能しない

- WebXR 対応ブラウザを使用
- AR 対応デバイスか確認
- フォールバック：WebAR モード（カメラ映像のみ）で動作

## 開発者向け

### コード構造

- **ARManager** (`ar.js`) - WebXR セッション管理
- **PoseManager** (`pose.js`) - 姿勢推定とジャンプ検出
- **GameManager** (`game.js`) - ゲーム状態とスコア管理
- **RenderManager** (`render.js`) - Three.js 描画

### イベントシステム

```javascript
// カスタムイベント
'floorDetected'  - 床検出
'poseUpdate'     - 姿勢更新
'jumpComplete'   - ジャンプ完了
'ropeUpdate'     - 縄の位置更新
'successJump'    - 成功ジャンプ
'failJump'       - 失敗ジャンプ
'gameReady'      - ゲーム準備完了
'gameOver'       - ゲームオーバー
```

## ライセンス

MIT License

## 貢献

Issue や Pull Request を歓迎します！

---

**AR Tobu! で楽しい縄跳びライフを！ 🤖✨**
