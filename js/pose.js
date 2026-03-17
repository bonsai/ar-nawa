// js/pose.js
class PoseManager {
    constructor() {
        this.pose = null;
        this.video = null;
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
        
        // アバター用データ
        this.avatarData = {
            leftArmAngle: 0,
            rightArmAngle: 0,
            bodyLean: 0,
            isJumping: false
        };
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
        
        // MediaPipe Pose 初期化
        try {
            if (typeof Pose === 'undefined') {
                Utils.error("MediaPipe Pose が読み込まれていません");
                this.setupFallbackDetection();
                return true;
            }
            
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });
            
            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.pose.onResults((results) => {
                this.onPoseResults(results);
            });
            
            this.isDetecting = true;
            this.detectLoop();
            
            Utils.log("MediaPipe Pose 初期化完了");
            return true;
            
        } catch (e) {
            Utils.error("姿勢推定初期化エラー:", e);
            this.setupFallbackDetection();
            return true;
        }
    }
    
    onPoseResults(results) {
        if (!results || !results.poseLandmarks) return;
        
        this.keypoints = results.poseLandmarks;
        this.analyzePose();
        
        // イベント発火
        window.dispatchEvent(new CustomEvent('poseUpdate', {
            detail: { keypoints: this.keypoints }
        }));
    }
    
    async detectLoop() {
        if (!this.isDetecting || !this.video || !this.pose) return;
        
        if (this.video.readyState >= 2) {
            try {
                await this.pose.send({ image: this.video });
            } catch (e) {
                Utils.error("Pose 推定エラー:", e);
            }
        }
        
        requestAnimationFrame(() => this.detectLoop());
    }
    
    setupFallbackDetection() {
        Utils.log("フォールバック：簡易モーション検出モード");
        
        // 定期的にジャンプイベントを発生（デモ用）
        setInterval(() => {
            if (this.isDetecting) {
                window.dispatchEvent(new CustomEvent('poseUpdate', {
                    detail: { keypoints: null, fallback: true }
                }));
                
                window.dispatchEvent(new CustomEvent('jumpComplete', {
                    detail: { duration: 500, fallback: true }
                }));
            }
        }, 2000);
        
        requestAnimationFrame(() => this.fallbackDetectLoop());
    }
    
    fallbackDetectLoop() {
        if (!this.isDetecting) return;
        requestAnimationFrame(() => this.fallbackDetectLoop());
    }
    
    analyzePose() {
        if (!this.keypoints) return;
        
        // キーポイントの抽出 (index でアクセス)
        const getKeypoint = (index) => {
            if (index < this.keypoints.length) {
                const kp = this.keypoints[index];
                return kp.visibility > 0.3 ? kp : null;
            }
            return null;
        };
        
        // MediaPipe Pose ランドマーク索引
        const leftWrist = getKeypoint(15); // left_wrist
        const rightWrist = getKeypoint(16); // right_wrist
        const nose = getKeypoint(0); // nose
        const leftAnkle = getKeypoint(27); // left_ankle
        const rightAnkle = getKeypoint(28); // right_ankle
        const leftShoulder = getKeypoint(11); // left_shoulder
        const rightShoulder = getKeypoint(12); // right_shoulder
        const leftHip = getKeypoint(23); // left_hip
        const rightHip = getKeypoint(24); // right_hip
        
        // 手の位置を保存（ジェスチャー用）
        if (leftWrist) this.leftWristY = leftWrist.y;
        if (rightWrist) this.rightWristY = rightWrist.y;
        if (nose) this.noseY = nose.y;
        
        // アバター用データ更新
        this.updateAvatarData({
            leftWrist, rightWrist, leftShoulder, rightShoulder,
            leftHip, rightHip, nose
        });
        
        // ジャンプ分析
        if (leftAnkle && rightAnkle) {
            const avgY = (leftAnkle.y + rightAnkle.y) / 2;
            
            // 基準位置の初期化
            if (this.baseY === null) {
                this.baseY = avgY;
            }
            
            // 基準位置を徐々に更新
            this.baseY = this.baseY * 0.98 + avgY * 0.02;
            
            this.analyzeJump(avgY);
        }
        
        // デバッグ表示
        if (Utils.debug && nose) {
            document.getElementById('debug').textContent = 
                `State: ${this.jumpState}\nY: ${this.baseY ? (this.baseY - avgY).toFixed(3) : '0'}`;
        }
    }
    
    updateAvatarData(points) {
        const { leftWrist, rightWrist, leftShoulder, rightShoulder, leftHip, rightHip, nose } = points;
        
        // 腕の角度計算
        if (leftWrist && leftShoulder) {
            this.avatarData.leftArmAngle = Math.atan2(
                leftWrist.y - leftShoulder.y,
                leftWrist.x - leftShoulder.x
            );
        }
        
        if (rightWrist && rightShoulder) {
            this.avatarData.rightArmAngle = Math.atan2(
                rightWrist.y - rightShoulder.y,
                rightWrist.x - rightShoulder.x
            );
        }
        
        // 体の傾き
        if (leftShoulder && rightShoulder) {
            this.avatarData.bodyLean = (leftShoulder.y - rightShoulder.y) * 0.5;
        }
        
        // ジャンプ状態
        this.avatarData.isJumping = this.jumpState !== 'ground';
        
        // アバター更新イベント
        window.dispatchEvent(new CustomEvent('avatarUpdate', {
            detail: this.avatarData
        }));
    }
    
    analyzeJump(currentY) {
        if (!this.baseY) return;
        
        const now = Date.now();
        const displacement = this.baseY - currentY;
        
        const jumpThreshold = 0.05;
        const landThreshold = 0.02;
        
        // 状態遷移
        if (displacement > jumpThreshold && this.jumpState === 'ground') {
            this.jumpState = 'rising';
            this.lastJumpTime = now;
            Utils.log("ジャンプ開始！");
        } else if (displacement < -landThreshold && this.jumpState === 'rising') {
            this.jumpState = 'falling';
        } else if (Math.abs(displacement) < landThreshold && this.jumpState === 'falling') {
            this.jumpState = 'ground';
            
            const jumpDuration = now - this.lastJumpTime;
            if (jumpDuration > 200 && jumpDuration < 1500) {
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
    
    getAvatarData() {
        return this.avatarData;
    }
    
    checkWaveGesture() {
        if (this.leftWristY === null || this.rightWristY === null || this.noseY === null) {
            return false;
        }
        
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
