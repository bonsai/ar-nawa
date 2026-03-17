// js/utils.js
const Utils = {
    // デバッグモード
    debug: true,
    
    log(...args) {
        if (this.debug) console.log('[AR Tobu]', ...args);
    },
    
    error(...args) {
        console.error('[AR Tobu ERROR]', ...args);
    },
    
    // 数値クランプ
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },
    
    // ラジアン/度変換
    degToRad(deg) {
        return deg * Math.PI / 180;
    },
    
    radToDeg(rad) {
        return rad * 180 / Math.PI;
    },
    
    // デバイスチェック
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // パフォーマンス計測
    frameTime: {
        lastTime: 0,
        fps: 0,
        update() {
            const now = performance.now();
            const delta = now - this.lastTime;
            this.fps = Math.round(1000 / delta);
            this.lastTime = now;
            return this.fps;
        }
    }
};

// グローバル公開
window.Utils = Utils;
