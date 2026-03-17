// js/game.js
class GameManager {
    constructor() {
        this.state = 'idle'; // idle, countdown, playing, gameover
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.ropeAngle = 0;
        this.ropeSpeed = 0.08;
        this.jumpWindow = 0.25; // ジャンプ許容範囲（ラジアン）
        this.failCount = 0;
        this.maxFails = 3;
        
        // 縄の位置（ロボット座標）
        this.robotPositions = [
            { x: -1.5, y: 0, z: 0 }, // 左
            { x: 1.5, y: 0, z: 0 },  // 右
            { x: 0, y: 0, z: -2 }    // 奥（リーダー）
        ];
        
        this.floorPosition = null;
        this.gameStarted = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 床検出
        window.addEventListener('floorDetected', (e) => {
            this.onFloorDetected(e.detail.plane);
        });
        
        // ジャンプ完了
        window.addEventListener('jumpComplete', (e) => {
            this.onJumpDetected(e.detail);
        });
        
        // 姿勢更新
        window.addEventListener('poseUpdate', (e) => {
            this.onPoseUpdate(e.detail.keypoints);
        });
        
        // ゲーム準備完了
        window.addEventListener('gameReady', () => {
            Utils.log("ゲーム準備完了");
        });
    }
    
    onFloorDetected(plane) {
        // 床の位置を設定
        this.floorPosition = plane || { x: 0, y: 0, z: 0 };
        
        document.getElementById('message').textContent = '手を振ってスタート！';
        this.state = 'idle';
        
        // イベント発火（描画用）
        window.dispatchEvent(new CustomEvent('gameReady', {
            detail: { floor: this.floorPosition }
        }));
    }
    
    startGame() {
        if (this.state !== 'idle' && this.state !== 'gameover') return;
        
        this.state = 'countdown';
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.failCount = 0;
        this.ropeAngle = 0;
        this.ropeSpeed = 0.08;
        
        this.updateUI();
        
        // カウントダウン
        let count = 3;
        const messageEl = document.getElementById('message');
        messageEl.textContent = count;
        
        const countdown = setInterval(() => {
            count--;
            if (count > 0) {
                messageEl.textContent = count;
            } else if (count === 0) {
                messageEl.textContent = 'GO!';
            } else {
                clearInterval(countdown);
                this.state = 'playing';
                messageEl.textContent = '';
                this.gameStarted = true;
                this.gameLoop();
            }
        }, 800);
    }
    
    gameLoop() {
        if (this.state !== 'playing') return;
        
        // 縄の角度更新
        this.ropeAngle += this.ropeSpeed;
        
        // 難易度上昇（スコアに応じて速度アップ）
        const baseSpeed = 0.08;
        const speedBonus = Math.min(0.04, this.score / 10000);
        this.ropeSpeed = baseSpeed + speedBonus;
        
        // イベント発火（描画用）
        window.dispatchEvent(new CustomEvent('ropeUpdate', {
            detail: { angle: this.ropeAngle }
        }));
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    onJumpDetected(jumpData) {
        if (this.state !== 'playing') return;
        
        // 縄の現在位置をチェック
        const ropeY = Math.sin(this.ropeAngle); // -1〜1
        
        // ジャンプタイミング判定
        if (Math.abs(ropeY) < this.jumpWindow) {
            // 成功！
            const jumpScore = 100 * this.combo;
            this.score += jumpScore;
            this.combo++;
            
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }
            
            this.updateUI();
            
            // 成功エフェクト要求
            window.dispatchEvent(new CustomEvent('successJump', {
                detail: { score: jumpScore, combo: this.combo }
            }));
            
            Utils.log(`ジャンプ成功！スコア：${jumpScore}, コンボ：${this.combo}`);
        } else {
            // 失敗
            this.onFail();
        }
    }
    
    onPoseUpdate(keypoints) {
        if (!keypoints) return;
        
        // 手を振るジェスチャー検出（スタート用）
        if (this.state === 'idle' || this.state === 'gameover') {
            this.detectWaveGesture(keypoints);
        }
    }
    
    detectWaveGesture(keypoints) {
        const leftWrist = keypoints.find(k => k.name === 'left_wrist');
        const rightWrist = keypoints.find(k => k.name === 'right_wrist');
        const nose = keypoints.find(k => k.name === 'nose');
        
        if (!leftWrist || !rightWrist || !nose) return;
        
        // 簡易版：両手が頭上より高い（画像座標では Y が小さい）
        const handsUpThreshold = nose.y * 0.7;
        const handsUp = leftWrist.y < handsUpThreshold && 
                        rightWrist.y < handsUpThreshold;
        
        if (handsUp && !this.gameStarted) {
            // 0.5 秒間隔でしかスタートできない
            const now = Date.now();
            if (!this.lastStartAttempt || now - this.lastStartAttempt > 500) {
                this.lastStartAttempt = now;
                Utils.log("スタートジェスチャー検出！");
                this.startGame();
            }
        }
    }
    
    onFail() {
        this.combo = 1;
        this.failCount++;
        
        this.updateUI();
        
        // 失敗エフェクト
        window.dispatchEvent(new CustomEvent('failJump', {
            detail: { failCount: this.failCount }
        }));
        
        Utils.log(`ジャンプ失敗！失敗回数：${this.failCount}/${this.maxFails}`);
        
        // 3 回失敗でゲームオーバー
        if (this.failCount >= this.maxFails) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.state = 'gameover';
        this.gameStarted = false;
        
        const messageEl = document.getElementById('message');
        messageEl.textContent = `ゲームオーバー！スコア：${this.score}`;
        messageEl.style.background = 'rgba(255,100,0,0.8)';
        
        // ゲームオーバーイベント
        window.dispatchEvent(new CustomEvent('gameOver', {
            detail: { score: this.score, maxCombo: this.maxCombo }
        }));
        
        // 3 秒後にリセット
        setTimeout(() => {
            this.state = 'idle';
            messageEl.textContent = '手を振って再スタート';
            messageEl.style.background = 'rgba(0,0,0,0.7)';
            this.failCount = 0;
            this.gameStarted = false;
        }, 3000);
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('combo').textContent = `x${this.combo}`;
    }
    
    reset() {
        this.state = 'idle';
        this.score = 0;
        this.combo = 1;
        this.ropeAngle = 0;
        this.failCount = 0;
        this.updateUI();
        document.getElementById('message').textContent = '手を振ってスタート';
    }
}

// グローバルインスタンス
const gameManager = new GameManager();
window.gameManager = gameManager;
