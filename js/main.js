// js/main.js
(function() {
    'use strict';
    
    // アプリケーション状態
    const App = {
        ar: null,
        renderer: null,
        scene: null,
        camera: null,
        poseDetector: null,
        game: null,
        isRunning: false,
        isLoaded: false
    };
    
    window.App = App; // デバッグ用
    
    /**
     * アプリケーション初期化
     */
    async function init() {
        Utils.log("AR 縄跳び起動中...");
        
        // ローディング表示
        showMessage("起動中...");
        
        try {
            // AR 初期化
            App.ar = arManager;
            const arSupported = await App.ar.init();
            if (!arSupported) {
                Utils.error("AR 初期化失敗");
                // 続行（WebAR モード）
            }
            
            // レンダラー初期化
            initRenderer();
            
            // 姿勢推定初期化
            const poseInitialized = await initPoseDetector();
            if (!poseInitialized) {
                Utils.error("姿勢推定初期化失敗");
                // 続行（フォールバックモード）
            }
            
            // ゲーム初期化
            App.game = gameManager;
            
            // レンダリングマネージャー初期化
            renderManager.init();
            
            // UI イベント設定
            setupUI();
            
            // AR セッション開始
            await startARSession();
            
            // 準備完了
            App.isLoaded = true;
            showMessage("手を振ってスタート");
            
            // オーバーレイ非表示（3 秒後）
            setTimeout(() => {
                const overlay = document.getElementById('start-overlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                }
            }, 2000);
            
            Utils.log("初期化完了");
            
        } catch (e) {
            Utils.error("初期化エラー:", e);
            showMessage("エラー：" + e.message);
        }
    }
    
    /**
     * レンダラー初期化
     */
    function initRenderer() {
        // render.js で自動初期化される
        Utils.log("レンダラー準備完了");
    }
    
    /**
     * 姿勢推定初期化
     */
    async function initPoseDetector() {
        App.poseDetector = poseManager;
        const initialized = await App.poseDetector.init();
        
        if (initialized) {
            Utils.log("姿勢推定準備完了");
        } else {
            Utils.error("姿勢推定初期化エラー");
        }
        
        return initialized;
    }
    
    /**
     * AR セッション開始
     */
    async function startARSession() {
        const session = await App.ar.startSession(renderManager.renderer.domElement);
        
        if (session) {
            Utils.log("AR セッション開始完了");
            // XR フレームのレンダリングは Three.js が自動処理
        } else {
            Utils.log("WebAR モード（カメラ映像のみ）");
            // カメラ映像を背景に表示する処理（必要に応じて）
        }
    }
    
    /**
     * UI 設定
     */
    function setupUI() {
        // 画面タッチでポーズ検出トリガー（モバイル用）
        document.addEventListener('touchstart', (e) => {
            if (App.game && App.game.state === 'idle') {
                // タッチでもスタート可能に（デバッグ用）
                Utils.log("タッチ検出");
            }
        }, { passive: true });
        
        // キーボード操作（デバッグ用）
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (App.game && (App.game.state === 'idle' || App.game.state === 'gameover')) {
                    App.game.startGame();
                }
            }
        });
        
        // ページ表示状態監視
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // バックグラウンド時は処理停止
                Utils.log("バックグラウンドへ");
            } else {
                // フォアグラウンド復帰
                Utils.log("フォアグラウンドへ");
            }
        });
        
        // アンロード時クリーンアップ
        window.addEventListener('beforeunload', () => {
            cleanup();
        });
    }
    
    /**
     * メッセージ表示
     */
    function showMessage(text) {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = text;
        }
    }
    
    /**
     * クリーンアップ
     */
    function cleanup() {
        Utils.log("アプリケーション終了処理");
        
        if (App.poseDetector) {
            App.poseDetector.stop();
        }
        
        if (App.ar) {
            App.ar.endSession();
        }
        
        App.isRunning = false;
    }
    
    /**
     * エラーハンドリング
     */
    window.addEventListener('error', (e) => {
        Utils.error("グローバルエラー:", e.message);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        Utils.error("未処理 Promise エラー:", e.reason);
    });
    
    // 起動
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // グローバル公開
    window.startGame = () => {
        if (App.game) {
            App.game.startGame();
        }
    };
    
    window.resetGame = () => {
        if (App.game) {
            App.game.reset();
        }
    };
    
})();
