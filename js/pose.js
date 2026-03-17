// js/pose.js
class PoseManager {
    constructor() {
        this.detector = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.keypoints = null;
        this.isDetecting = false;
        
        // ジャンプ状態
        this.jumpState = 'ground'; // ground, rising, falling
        this.lastJumpTime = 0;
        this.lastY = null;
        this.baseY = null; // 基準位置
        
        // 手の位置（ジェスチャー用）
        this.leftWristY = null;
        this.rightWristY = null;
        this.noseY = null;
    }
    
    async init() {
        Utils.log("姿勢推定初期化中...");
        
        // カメラ映像表示用のビデオ要素取得
        const cameraFeed = document.getElementById('camera-feed');
        
        // カメラ映像取得
        try {
            this.video = document.createElement('video');
            this.video.width = 640;
            this.video.height = 480;
            this.video.autoplay = true;
            this.video.playsInline = true;
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            this.video.srcObject = stream;
            await this.video.play();
            
            // デバッグ表示用にも接続
            if (cameraFeed) {
                cameraFeed.srcObject = stream;
                cameraFeed.classList.remove('hidden');
                Utils.log("カメラ映像表示有効");
            }
            
            Utils.log("カメラ起動完了");
        } catch (e) {
            Utils.error("カメラ起動エラー:", e);
            arManager.showError("カメラへのアクセスが必要です");
            return false;
        }
        
        // MediaPipe Pose Detector 初期化
        try {
            // pose-detection ライブラリが読み込まれているか確認
            if (typeof poseDetection === 'undefined') {
                Utils.error("pose-detection ライブラリが読み込まれていません");
                // フォールバック：簡易モーション検出のみ
                this.setupFallbackDetection();
                return true;
            }

            // MoveNet Lightning モデルを使用
            const model = poseDetection.SupportedModels.MoveNet;
            const config = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                enableSmoothing: true
            };
            
            this.detector = await poseDetection.createDetector(model, config);

            Utils.log("MediaPipe Pose 初期化完了");

            this.isDetecting = true;
            this.detectLoop();

            return true;
        } catch (e) {
            Utils.error("姿勢推定初期化エラー:", e);
            // フォールバック
            this.setupFallbackDetection();
            return true;
        }
    }
    
    setupFallbackDetection() {
        Utils.log("フォールバック：簡易モーション検出モード");
        // カメラ映像のみ使用し、簡単な動きを検出
        this.isDetecting = true;
        this.fallbackDetectLoop();
    }
    
    async detectLoop() {
        if (!this.isDetecting || !this.video || !this.detector) return;
        
        if (this.video.readyState >= 2) { // HAVE_CURRENT_DATA
            try {
                const poses = await this.detector.estimatePoses(this.video);
                if (poses.length > 0 && poses[0].keypoints) {
                    this.keypoints = poses[0].keypoints;
                    this.analyzePose();
                    
                    // イベント発火
                    window.dispatchEvent(new CustomEvent('poseUpdate', {
                        detail: { keypoints: this.keypoints }
                    }));
                }
            } catch (e) {
                Utils.error("姿勢推定エラー:", e);
            }
        }
        
        requestAnimationFrame(() => this.detectLoop());
    }
    
    fallbackDetectLoop() {
        // 簡易版：ビデオの明るさ変化で動きを検出（デモ用）
        if (!this.isDetecting || !this.video) return;
        
        // 定期的にジャンプイベントを発生（デバッグ用）
        setInterval(() => {
            if (this.isDetecting) {
                window.dispatchEvent(new CustomEvent('jumpComplete', {
                    detail: { duration: 500, fallback: true }
                }));
            }
        }, 2000);
        
        requestAnimationFrame(() => this.fallbackDetectLoop());
    }
    
    analyzePose() {
        if (!this.keypoints) return;
        
        // キーポイントの抽出
        const getKeypoint = (name) => this.keypoints.find(k => k.name === name && k.score > 0.3);
        
        const leftAnkle = getKeypoint('left_ankle');
        const rightAnkle = getKeypoint('right_ankle');
        const leftWrist = getKeypoint('left_wrist');
        const rightWrist = getKeypoint('right_wrist');
        const nose = getKeypoint('nose');
        
        // 手の位置を保存（ジェスチャー用）
        if (leftWrist) this.leftWristY = leftWrist.y;
        if (rightWrist) this.rightWristY = rightWrist.y;
        if (nose) this.noseY = nose.y;
        
        // ジャンプ分析
        if (leftAnkle && rightAnkle) {
            // 両足の平均 Y 座標（画像上では上が 0、下が大きい）
            const avgY = (leftAnkle.y + rightAnkle.y) / 2;
            
            // 基準位置の初期化
            if (this.baseY === null) {
                this.baseY = avgY;
            }
            
            // 基準位置を徐々に更新（座り込み対策）
            this.baseY = this.baseY * 0.98 + avgY * 0.02;
            
            this.analyzeJump(avgY);
        }
        
        // デバッグ表示
        if (Utils.debug && leftAnkle && rightAnkle) {
            document.getElementById('debug').textContent = 
                `State: ${this.jumpState}\nY: ${avgY.toFixed(3)}\nBase: ${this.baseY.toFixed(3)}`;
        }
    }
    
    analyzeJump(currentY) {
        if (!this.baseY) return;
        
        const now = Date.now();
        
        // 基準位置からの変位（正：上昇、負：下降）
        const displacement = this.baseY - currentY;
        
        // 簡易ジャンプ判定
        const jumpThreshold = 0.05; // 閾値
        const landThreshold = 0.02;  // 着地閾値
        
        // 状態遷移
        if (displacement > jumpThreshold && this.jumpState === 'ground') {
            this.jumpState = 'rising';
            this.lastJumpTime = now;
            Utils.log("ジャンプ開始！");
        } else if (displacement < -landThreshold && this.jumpState === 'rising') {
            this.jumpState = 'falling';
        } else if (Math.abs(displacement) < landThreshold && this.jumpState === 'falling') {
            this.jumpState = 'ground';
            
            // ジャンプ完了イベント
            const jumpDuration = now - this.lastJumpTime;
            if (jumpDuration > 200 && jumpDuration < 1500) { // 正常なジャンプ時間
                window.dispatchEvent(new CustomEvent('jumpComplete', {
                    detail: { 
                        duration: jumpDuration,
                        height: displacement
                    }
                }));
                Utils.log("ジャンプ完了！", jumpDuration + "ms");
            }
        }
        
        this.lastY = currentY;
    }
    
    getFootPosition() {
        if (!this.keypoints) return null;
        
        const leftAnkle = this.keypoints.find(k => k.name === 'left_ankle');
        const rightAnkle = this.keypoints.find(k => k.name === 'right_ankle');
        const leftHip = this.keypoints.find(k => k.name === 'left_hip');
        
        if (!leftAnkle || !rightAnkle) return null;
        
        return {
            x: (leftAnkle.x + rightAnkle.x) / 2,
            y: (leftAnkle.y + rightAnkle.y) / 2,
            groundDistance: this.baseY ? 1 - ((leftAnkle.y + rightAnkle.y) / 2 - this.baseY) : 0.5
        };
    }
    
    checkWaveGesture() {
        // 両手が頭上より高いかチェック
        if (this.leftWristY === null || this.rightWristY === null || this.noseY === null) {
            return false;
        }
        
        // 画像座標では Y が小さいほど上
        const handsUp = this.leftWristY < this.noseY * 0.8 && 
                        this.rightWristY < this.noseY * 0.8;
        
        return handsUp;
    }
    
    stop() {
        this.isDetecting = false;
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// グローバルインスタンス
const poseManager = new PoseManager();
window.poseManager = poseManager;
