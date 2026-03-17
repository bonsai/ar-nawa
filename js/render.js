// js/render.js
class RenderManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.robots = [];
        this.playerAvatar = null;
        this.rope = null;
        this.floorMarker = null;
        this.shadowRing = null;
        this.effects = [];
        this.isInitialized = false;
        
        // アバター用データ
        this.avatarData = {
            leftArmAngle: 0,
            rightArmAngle: 0,
            bodyLean: 0,
            isJumping: false
        };
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.createScene();
        this.createRobots();
        this.createPlayerAvatar();
        this.createRope();
        this.createFloorMarker();
        this.setupEventListeners();
        
        this.isInitialized = true;
        Utils.log("レンダリング初期化完了");
    }
    
    createScene() {
        // シーン
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111122);
        this.scene.fog = new THREE.Fog(0x111122, 5, 15);
        
        // カメラ
        this.camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.01, 
            20
        );
        this.camera.position.set(0, 1.5, 3);
        this.camera.lookAt(0, 0.5, 0);
        
        // レンダラー
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // 光源
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(2, 3, 2);
        this.scene.add(directionalLight);
        
        // リサイズ対応
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // レンダリングループ開始
        this.animate();
    }
    
    createRobots() {
        // シンプルなロボット（立方体の組み合わせ）
        const robotColors = [0xff3333, 0x33ff33, 0x3333ff];
        const positions = [
            { x: -1.5, z: 0 },
            { x: 1.5, z: 0 },
            { x: 0, z: -1.5 }
        ];
        
        for (let i = 0; i < 3; i++) {
            const group = new THREE.Group();
            
            // 体
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.8, 0.3),
                new THREE.MeshStandardMaterial({ 
                    color: robotColors[i], 
                    emissive: 0x222222,
                    roughness: 0.7,
                    metalness: 0.3
                })
            );
            body.position.y = 0.4;
            body.name = 'body';
            group.add(body);
            
            // 頭
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.25, 16, 16),
                new THREE.MeshStandardMaterial({ 
                    color: 0xcccccc, 
                    emissive: 0x111111,
                    roughness: 0.5,
                    metalness: 0.5
                })
            );
            head.position.y = 0.9;
            head.name = 'head';
            group.add(head);
            
            // 目（白）
            const eye1 = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            eye1.position.set(-0.1, 0.95, 0.22);
            eye1.name = 'eye';
            group.add(eye1);
            
            const eye2 = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xffffff })
            );
            eye2.position.set(0.1, 0.95, 0.22);
            eye2.name = 'eye';
            group.add(eye2);
            
            // 瞳孔（黒）
            const pupil1 = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x000000 })
            );
            pupil1.position.set(-0.1, 0.95, 0.27);
            pupil1.name = 'pupil';
            group.add(pupil1);
            
            const pupil2 = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x000000 })
            );
            pupil2.position.set(0.1, 0.95, 0.27);
            pupil2.name = 'pupil';
            group.add(pupil2);
            
            // 腕
            const armGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
            const armMat = new THREE.MeshStandardMaterial({ color: robotColors[i] });
            
            const leftArm = new THREE.Mesh(armGeom, armMat);
            leftArm.position.set(-0.3, 0.6, 0);
            leftArm.rotation.z = 0.3;
            group.add(leftArm);
            
            const rightArm = new THREE.Mesh(armGeom, armMat);
            rightArm.position.set(0.3, 0.6, 0);
            rightArm.rotation.z = -0.3;
            group.add(rightArm);
            
            // 足
            const legGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
            
            const leftLeg = new THREE.Mesh(legGeom, legMat);
            leftLeg.position.set(-0.1, -0.2, 0);
            group.add(leftLeg);
            
            const rightLeg = new THREE.Mesh(legGeom, legMat);
            rightLeg.position.set(0.1, -0.2, 0);
            group.add(rightLeg);
            
            this.robots.push({
                mesh: group,
                color: robotColors[i],
                emotion: 'neutral',
                position: positions[i]
            });
            
            this.scene.add(group);
        }
        
        Utils.log("ロボット作成完了：" + this.robots.length + "体");
    }
    
    createPlayerAvatar() {
        // プレイヤー用アバター（シンプルな人型）
        const group = new THREE.Group();
        
        // 体
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.9, 0.35),
            new THREE.MeshStandardMaterial({ 
                color: 0x00aaff,
                emissive: 0x003355,
                roughness: 0.5,
                metalness: 0.7
            })
        );
        body.position.y = 0.45;
        body.name = 'body';
        group.add(body);
        
        // 頭
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0xffccaa,
                roughness: 0.8
            })
        );
        head.position.y = 1.1;
        head.name = 'head';
        group.add(head);
        
        // 目
        const eyeGeom = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(-0.1, 1.15, 0.25);
        leftEye.name = 'eye';
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        rightEye.position.set(0.1, 1.15, 0.25);
        rightEye.name = 'eye';
        group.add(rightEye);
        
        // 腕（可動）
        const armGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x00aaff });
        
        this.leftArm = new THREE.Mesh(armGeom, armMat);
        this.leftArm.position.set(-0.35, 0.7, 0);
        this.leftArm.rotation.z = 0.3;
        this.leftArm.name = 'leftArm';
        group.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(armGeom, armMat);
        this.rightArm.position.set(0.35, 0.7, 0);
        this.rightArm.rotation.z = -0.3;
        this.rightArm.name = 'rightArm';
        group.add(this.rightArm);
        
        // 足
        const legGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const leftLeg = new THREE.Mesh(legGeom, legMat);
        leftLeg.position.set(-0.12, -0.22, 0);
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeom, legMat);
        rightLeg.position.set(0.12, -0.22, 0);
        group.add(rightLeg);
        
        // プレイヤー位置
        group.position.set(0, 0, 0);
        
        this.playerAvatar = {
            mesh: group,
            baseY: 0,
            isJumping: false
        };
        
        this.scene.add(group);
        Utils.log("プレイヤーアバター作成完了");
    }
    
    createRope() {
        // パーティクルで光の縄を表現
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i*3] = 0;
            positions[i*3+1] = 0;
            positions[i*3+2] = 0;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // 光る縄マテリアル
        const material = new THREE.PointsMaterial({
            color: 0xff3366, // 赤い光
            size: 0.12,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            emissive: 0xff0044
        });
        
        this.rope = {
            points: new THREE.Points(geometry, material),
            particles: particleCount,
            baseColor: 0xff3366,
            glowColor: 0xff0044
        };
        
        this.scene.add(this.rope.points);
        Utils.log("縄作成完了");
    }
    
    createFloorMarker() {
        // 足元のマーカー円（外側リング）
        const geometry = new THREE.RingGeometry(0.8, 1.0, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4,
            emissive: 0x224466,
            emissiveIntensity: 0.3
        });
        
        this.floorMarker = new THREE.Mesh(geometry, material);
        this.floorMarker.rotation.x = -Math.PI / 2;
        this.floorMarker.position.y = 0.01;
        this.scene.add(this.floorMarker);
        
        // 影リング（内側・縄の危険ゾーン表示）
        const shadowGeo = new THREE.RingGeometry(0, 0.3, 32);
        const shadowMat = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.0,
            emissive: 0x440000
        });
        
        this.shadowRing = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadowRing.rotation.x = -Math.PI / 2;
        this.shadowRing.position.y = 0.02;
        this.scene.add(this.shadowRing);
        
        // グリッド（床の目印）
        const gridHelper = new THREE.GridHelper(10, 20, 0x444466, 0x222233);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
        
        Utils.log("床マーカー作成完了");
    }
    
    setupEventListeners() {
        window.addEventListener('gameReady', (e) => {
            this.positionRobots(e.detail.floor);
        });
        
        window.addEventListener('ropeUpdate', (e) => {
            this.updateRope(e.detail.angle);
        });
        
        window.addEventListener('poseUpdate', (e) => {
            this.updateAvatarFromPose(e.detail);
        });
        
        window.addEventListener('avatarUpdate', (e) => {
            this.updateAvatarFromData(e.detail);
        });
        
        window.addEventListener('jumpComplete', (e) => {
            this.animateAvatarJump();
        });
        
        window.addEventListener('successJump', (e) => {
            this.showSuccessEffect(e.detail);
            this.setRobotEmotion('happy');
        });
        
        window.addEventListener('failJump', (e) => {
            this.showFailEffect();
            this.setRobotEmotion('sad');
            setTimeout(() => this.setRobotEmotion('neutral'), 1000);
        });
        
        window.addEventListener('hitByRope', (e) => {
            this.showHitEffect(e.detail);
            this.setRobotEmotion('sad');
            setTimeout(() => this.setRobotEmotion('neutral'), 1000);
        });
        
        window.addEventListener('gameOver', (e) => {
            this.showGameOverEffect(e.detail);
        });
    }
    
    positionRobots(floorPos) {
        if (!floorPos) {
            floorPos = { x: 0, y: 0, z: 0 };
        }
        
        this.robots.forEach((robot, i) => {
            robot.mesh.position.set(
                floorPos.x + robot.position.x,
                floorPos.y,
                floorPos.z + robot.position.z
            );
            robot.mesh.lookAt(floorPos.x, floorPos.y, floorPos.z);
        });
        
        // プレイヤーマーカー
        if (this.floorMarker) {
            this.floorMarker.position.set(floorPos.x, floorPos.y + 0.01, floorPos.z);
        }
        if (this.shadowRing) {
            this.shadowRing.position.set(floorPos.x, floorPos.y + 0.02, floorPos.z);
        }
        
        // カメラ位置調整
        if (this.camera) {
            this.camera.position.set(0, 1.5, 3);
            this.camera.lookAt(0, 0.5, 0);
        }
        
        Utils.log("ロボット配置完了");
    }
    
    updateAvatarFromPose(detail) {
        if (!this.playerAvatar || !detail.keypoints) return;
        
        // 簡易フォールバック：ジャンプアニメーションのみ
        if (detail.fallback) {
            this.animateAvatarJump();
            return;
        }
    }
    
    updateAvatarFromData(data) {
        if (!this.playerAvatar) return;
        
        // 腕の角度を更新
        if (this.leftArm && data.leftArmAngle !== undefined) {
            this.leftArm.rotation.z = data.leftArmAngle + 0.5;
        }
        if (this.rightArm && data.rightArmAngle !== undefined) {
            this.rightArm.rotation.z = -data.rightArmAngle - 0.5;
        }
        
        // 体の傾き
        if (data.bodyLean !== undefined) {
            this.playerAvatar.mesh.rotation.z = data.bodyLean * 0.3;
        }
        
        // ジャンプ状態
        this.avatarData.isJumping = data.isJumping;
    }
    
    animateAvatarJump() {
        if (!this.playerAvatar) return;
        
        const startY = this.playerAvatar.baseY;
        const jumpHeight = 0.5;
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 放物線ジャンプ
            const jumpY = Math.sin(progress * Math.PI) * jumpHeight;
            this.playerAvatar.mesh.position.y = startY + jumpY;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.playerAvatar.mesh.position.y = startY;
            }
        };
        
        animate();
    }
    
    updateRope(angle) {
        if (!this.rope || this.robots.length < 2) return;
        
        // ロボット間の縄をパーティクルで表現
        const leftRobot = this.robots[0].mesh.position;
        const rightRobot = this.robots[1].mesh.position;
        
        // 縄の高さを sin カーブで変化
        const ropeY = Math.sin(angle) * 0.8 + 0.6; // 0.6〜1.4 くらい
        
        // 縄の色を位置で変化（下の時は赤く危険表示）
        const isRopeLow = Math.sin(angle) < -0.5;
        if (isRopeLow) {
            // 危険ゾーン：赤く強く光る
            this.rope.points.material.color.setHex(0xff0044);
            this.rope.points.material.size = 0.15;
            this.rope.points.material.opacity = 1.0;
        } else {
            // 通常：ピンクの光
            this.rope.points.material.color.setHex(this.rope.baseColor);
            this.rope.points.material.size = 0.12;
            this.rope.points.material.opacity = 0.9;
        }
        
        // パーティクル位置更新
        const positions = this.rope.points.geometry.attributes.position.array;
        
        for (let i = 0; i < this.rope.particles; i++) {
            const t = i / (this.rope.particles - 1);
            
            // 左から右への直線補間
            const x = leftRobot.x + (rightRobot.x - leftRobot.x) * t;
            const z = leftRobot.z + (rightRobot.z - leftRobot.z) * t;
            
            // 縄のたるみ（放物線）
            const sag = Math.sin(t * Math.PI) * 0.2;
            
            positions[i*3] = x;
            positions[i*3+1] = ropeY - sag;
            positions[i*3+2] = z;
        }
        
        this.rope.points.geometry.attributes.position.needsUpdate = true;
        
        // 影リングの位置を追跡（縄が一番下の時だけ強調）
        if (this.shadowRing) {
            if (isRopeLow) {
                this.shadowRing.material.opacity = 0.8;
                this.shadowRing.material.emissiveIntensity = 0.8;
                this.shadowRing.material.color.setHex(0xff0000);
                this.shadowRing.scale.set(1.3, 1.3, 1.3);
            } else {
                this.shadowRing.material.opacity = 0.0;
                this.shadowRing.material.emissiveIntensity = 0;
                this.shadowRing.scale.set(1.0, 1.0, 1.0);
            }
        }
    }
    
    setRobotEmotion(emotion) {
        this.robots.forEach(robot => {
            robot.emotion = emotion;
            
            // 目を探す
            const eyes = robot.mesh.children.filter(c => c.name === 'eye');
            const pupils = robot.mesh.children.filter(c => c.name === 'pupil');
            const body = robot.mesh.children.find(c => c.name === 'body');
            
            if (emotion === 'happy') {
                // 目を細める
                eyes.forEach(eye => {
                    eye.scale.set(1.3, 0.6, 1);
                });
                // 体を少し光らせる
                if (body) {
                    body.material.emissive.setHex(0x442200);
                }
            } else if (emotion === 'sad') {
                // 目を下げる
                eyes.forEach(eye => {
                    eye.scale.set(0.8, 0.6, 1);
                    eye.position.y -= 0.03;
                });
                if (body) {
                    body.material.emissive.setHex(0x000022);
                }
            } else {
                // 通常
                eyes.forEach(eye => {
                    eye.scale.set(1, 1, 1);
                    eye.position.y = 0.95;
                });
                if (body) {
                    body.material.emissive.setHex(0x222222);
                }
            }
        });
    }
    
    showSuccessEffect(detail) {
        // パーティクルエフェクト
        const particleCount = 20;
        const colors = [0xffaa00, 0xffff00, 0x00ff00, 0x00ffff];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshStandardMaterial({ 
                    color: colors[Math.floor(Math.random() * colors.length)],
                    emissive: 0x222222,
                    transparent: true,
                    opacity: 1
                })
            );
            
            particle.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 2
            );
            
            // アニメーション用データ
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    Math.random() * 0.1 + 0.05,
                    (Math.random() - 0.5) * 0.1
                ),
                life: 1.0
            };
            
            this.scene.add(particle);
            this.effects.push(particle);
        }
        
        // スコア表示エフェクト（テキスト）
        this.showFloatingText(`+${detail.score}`, 0, 2, 0);
    }
    
    showFailEffect() {
        // 縄を一瞬赤く
        if (this.rope) {
            this.rope.points.material.color.setHex(0xff0000);
            setTimeout(() => {
                if (this.rope) {
                    this.rope.points.material.color.setHex(this.rope.baseColor);
                }
            }, 200);
        }
        
        // 失敗テキスト
        this.showFloatingText("MISS!", 0, 1.5, 0, 0xff0000);
    }
    
    showHitEffect(detail) {
        // 被弾エフェクト：画面全体を赤く点滅
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,0,0,0.5);
            z-index: 999;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 200);
        
        // 縄を強く赤く光らせる
        if (this.rope) {
            this.rope.points.material.color.setHex(0xff0000);
            this.rope.points.material.size = 0.2;
            setTimeout(() => {
                if (this.rope) {
                    this.rope.points.material.color.setHex(this.rope.baseColor);
                    this.rope.points.material.size = 0.12;
                }
            }, 300);
        }
        
        // 被弾テキスト
        this.showFloatingText("💥 HIT!", 0, 1.5, 0, 0xff0000);
        
        // ハートアイコン表示（残機）
        const hearts = '❤️'.repeat(Math.max(0, this.maxFails - detail.failCount)) + 
                       '💔'.repeat(detail.failCount);
        this.showFloatingText(hearts, 0, 2.5, 0, 0xffffff);
    }
    
    showGameOverEffect(detail) {
        this.showFloatingText(`Game Over: ${detail.score}`, 0, 2, 0, 0xff4400);
    }
    
    showFloatingText(text, x, y, z, color = 0xffffff) {
        // 簡易テキスト表示（実際は 2D UI で実装するのが望ましい）
        // ここではデバッグ用コンソール出力
        Utils.log(`[FloatingText] ${text}`);
    }
    
    updateEffects() {
        // パーティクルエフェクト更新
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const particle = this.effects[i];
            
            particle.position.add(particle.userData.velocity);
            particle.userData.velocity.y -= 0.005; // 重力
            particle.userData.life -= 0.02;
            
            particle.material.opacity = particle.userData.life;
            
            if (particle.userData.life <= 0) {
                this.scene.remove(particle);
                this.effects.splice(i, 1);
            }
        }
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateEffects();
        
        // プレイヤーアバターのアニメーション
        const time = Date.now() * 0.001;
        if (this.playerAvatar && !this.avatarData.isJumping) {
            // 待機アニメーション：呼吸
            this.playerAvatar.mesh.position.y = Math.sin(time * 2) * 0.02;
            
            // 腕の軽い動き
            if (this.leftArm) {
                this.leftArm.rotation.x = Math.sin(time) * 0.1;
            }
            if (this.rightArm) {
                this.rightArm.rotation.x = Math.sin(time + Math.PI) * 0.1;
            }
        }
        
        // ロボットのアニメーション（待機中も少し動かす）
        this.robots.forEach((robot, i) => {
            if (robot.emotion === 'neutral') {
                // 待機アニメーション：ゆっくり首を振る
                robot.mesh.rotation.y = Math.sin(time + i) * 0.1;
            }
        });
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// レンダラー初期化
const renderManager = new RenderManager();
window.renderManager = renderManager;
