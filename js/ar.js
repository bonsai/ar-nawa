// js/ar.js
class ARManager {
    constructor() {
        this.session = null;
        this.referenceSpace = null;
        this.viewerSpace = null;
        this.isARSupported = false;
        this.floorDetected = false;
        this.floorPosition = null;
    }
    
    async init() {
        // WebXR 対応チェック
        if (!navigator.xr) {
            this.showError("WebXR 未対応ブラウザです。Chrome 等を使用してください。");
            return false;
        }
        
        // AR セッション対応チェック
        try {
            const supported = await navigator.xr.isSessionSupported("immersive-ar");
            if (!supported) {
                // フォールバック：WebAR として動作（カメラ映像 + 姿勢推定のみ）
                Utils.log("AR未対応。WebAR モードで動作します。");
                this.isARSupported = false;
                return true;
            }
            
            this.isARSupported = true;
            Utils.log("AR 対応デバイスです。");
            return true;
        } catch (e) {
            Utils.error("AR 対応チェックエラー:", e);
            this.isARSupported = false;
            return true; // フォールバック続行
        }
    }
    
    async startSession(glCanvas) {
        if (!this.isARSupported) {
            Utils.log("AR セッションなしで開始（WebAR モード）");
            return null;
        }
        
        try {
            const session = await navigator.xr.requestSession("immersive-ar", {
                requiredFeatures: ["local"],
                optionalFeatures: ["local-floor", "plane-detection", "hit-test"]
            });
            
            this.session = session;
            Utils.log("AR セッション開始");
            
            // WebGL レイヤー作成
            const gl = glCanvas.getContext("webgl2", { xrCompatible: true }) || 
                       glCanvas.getContext("webgl", { xrCompatible: true });
            
            if (!gl) {
                Utils.error("WebGL コンテキスト取得失敗");
                return null;
            }
            
            // レンダリングターゲット設定
            const baseLayer = new XRWebGLLayer(session, gl);
            await session.updateRenderState({ baseLayer });
            
            // 参照空間取得
            this.referenceSpace = await session.requestReferenceSpace("local");
            this.viewerSpace = await session.requestReferenceSpace("viewer");
            
            // 平面検出開始（対応している場合）
            if (session.planeDetection) {
                this.setupPlaneDetection();
            }
            
            // セッション終了イベント
            session.addEventListener('end', () => {
                Utils.log("AR セッション終了");
                this.session = null;
            });
            
            return session;
        } catch (e) {
            Utils.error("AR セッション開始エラー:", e);
            this.showError("AR セッション開始エラー：" + e.message);
            return null;
        }
    }
    
    setupPlaneDetection() {
        if (!this.session || !this.referenceSpace) return;
        
        // 平面検出イベントリスナー
        this.session.addEventListener('planeadded', (event) => {
            const plane = event.plane;
            Utils.log("平面検出:", plane);
            
            // 床として使用可能な平面かチェック
            if (plane.orientation === 'horizontal') {
                this.floorDetected = true;
                this.floorPosition = {
                    x: plane.pose.position.x,
                    y: plane.pose.position.y,
                    z: plane.pose.position.z
                };
                
                // ゲームに通知
                window.dispatchEvent(new CustomEvent('floorDetected', {
                    detail: { plane: this.floorPosition }
                }));
                
                Utils.log("床検出完了:", this.floorPosition);
            }
        });
    }
    
    getViewerPose() {
        if (!this.session || !this.referenceSpace) return null;
        
        const frame = this.session.requestAnimationFrame(() => {});
        // 実際のレンダリングループ内で使用
        return null;
    }
    
    showError(msg) {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = msg;
            messageEl.style.background = 'rgba(255,50,50,0.7)';
        }
        Utils.error(msg);
    }
    
    hideError() {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.style.background = 'rgba(0,0,0,0.7)';
        }
    }
    
    endSession() {
        if (this.session) {
            this.session.end();
            this.session = null;
        }
    }
}

// グローバルインスタンス
const arManager = new ARManager();
window.arManager = arManager;
