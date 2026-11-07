/* ==========================================================================
   VALPOCOMICS ARCADE - GIOCO.JS
   Runner 2D Retro Dark: Maverick Rooftop Escape
   ========================================================================== */

(function() {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. Inizializzazione Canvas & Dimensioni Virtuali
    // --------------------------------------------------------------------------
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const V_WIDTH = 900;
    const V_HEIGHT = 420;
    const GROUND_Y = 350;

    // --------------------------------------------------------------------------
    // 2. Audio Engine Retro Synth (Web Audio API - Nessun file esterno necessario)
    // --------------------------------------------------------------------------
    let audioCtx = null;
    let isMuted = localStorage.getItem('valpo_runner_muted') === 'true';

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playTone(freq, type, duration, slideFreq = null) {
        if (isMuted || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            if (slideFreq) {
                osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
            }
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Audio context silenziato
        }
    }

    const sfx = {
        jump() {
            playTone(280, 'square', 0.12, 580);
        },
        doubleJump() {
            playTone(480, 'square', 0.14, 880);
        },
        collect() {
            playTone(660, 'sine', 0.08, 990);
            setTimeout(() => playTone(990, 'triangle', 0.1, 1320), 60);
        },
        shield() {
            playTone(320, 'sawtooth', 0.25, 750);
        },
        hit() {
            playTone(180, 'sawtooth', 0.28, 45);
        },
        gameOver() {
            playTone(300, 'sawtooth', 0.18, 150);
            setTimeout(() => playTone(180, 'sawtooth', 0.35, 60), 160);
        }
    };

    // --------------------------------------------------------------------------
    // 3. Stato del Gioco & Variabili Globali
    // --------------------------------------------------------------------------
    const STATE_START = 'START';
    const STATE_PLAYING = 'PLAYING';
    const STATE_GAMEOVER = 'GAMEOVER';
    const STATE_PAUSED = 'PAUSED';

    let gameState = STATE_START;
    let score = 0;
    let distance = 0;
    let highScore = parseInt(localStorage.getItem('valpo_runner_highscore') || '0', 10);
    let gameSpeed = 6;
    let baseSpeed = 6;
    let maxSpeed = 12.5;
    let frameCount = 0;

    let particles = [];
    let obstacles = [];
    let collectibles = [];
    let obstacleTimer = 0;
    let collectibleTimer = 0;

    // Background Parallax Stars
    const stars = [];
    for (let i = 0; i < 45; i++) {
        stars.push({
            x: Math.random() * V_WIDTH,
            y: Math.random() * 200,
            size: Math.random() * 2 + 0.8,
            speed: Math.random() * 0.3 + 0.1,
            blink: Math.random() * Math.PI
        });
    }

    // --------------------------------------------------------------------------
    // 4. Giocatore: Maverick
    // --------------------------------------------------------------------------
    const player = {
        x: 90,
        y: GROUND_Y - 60,
        width: 44,
        height: 60,
        vy: 0,
        gravity: 0.68,
        jumpPower: -13.2,
        isGrounded: false,
        jumpsLeft: 2,
        energy: 0,          // 0 to 100%
        hasShield: false,
        shieldTimer: 0,
        animFrame: 0,

        reset() {
            this.x = 90;
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            this.jumpsLeft = 2;
            this.isGrounded = true;
            this.energy = 0;
            this.hasShield = false;
            this.shieldTimer = 0;
            this.animFrame = 0;
        },

        jump() {
            if (this.jumpsLeft > 0) {
                if (this.jumpsLeft === 2) {
                    this.vy = this.jumpPower;
                    sfx.jump();
                    createDust(this.x + this.width / 2, this.y + this.height, 8, '#06b6d4');
                } else {
                    this.vy = this.jumpPower * 0.92;
                    sfx.doubleJump();
                    createDust(this.x + this.width / 2, this.y + this.height, 12, '#f43f5e');
                }
                this.jumpsLeft--;
                this.isGrounded = false;
            }
        },

        activateShield() {
            if (this.energy >= 100 && !this.hasShield) {
                this.hasShield = true;
                this.shieldTimer = 300; // 5 secondi a 60fps
                this.energy = 0;
                sfx.shield();
                createDust(this.x + this.width / 2, this.y + this.height / 2, 20, '#06b6d4');
                updateHudEnergy();
            }
        },

        update() {
            // Gravità
            this.vy += this.gravity;
            this.y += this.vy;

            // Collisione col terreno
            if (this.y >= GROUND_Y - this.height) {
                this.y = GROUND_Y - this.height;
                this.vy = 0;
                this.isGrounded = true;
                this.jumpsLeft = 2;
            } else {
                this.isGrounded = false;
            }

            // Timer Scudo
            if (this.hasShield) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) {
                    this.hasShield = false;
                }
            }

            // Animazione corsa
            if (this.isGrounded) {
                this.animFrame += 0.22;
                if (frameCount % 6 === 0) {
                    createTrail(this.x, this.y + this.height - 4, '#1f293d');
                }
            }
        },

        draw() {
            ctx.save();

            // Scudo Energetico / Disegno Tattico
            if (this.hasShield) {
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 42, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = (frameCount % 6 < 3) ? '#06b6d4' : '#ffffff';
                ctx.stroke();

                // Effetto cerchio rotante
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 46, frameCount * 0.1, frameCount * 0.1 + 1.2);
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Ombra sotto il personaggio
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, GROUND_Y - 2, 20, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Disegno Vettoriale Stilizzato Maverick (Dark Comic Rogue)
            const legOffset = this.isGrounded ? Math.sin(this.animFrame) * 8 : 0;
            const px = this.x;
            const py = this.y;

            // Mantello / Sciarpa tattica che sventola dietro
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(px + 10, py + 24);
            ctx.quadraticCurveTo(px - 18 - Math.sin(frameCount * 0.15) * 6, py + 28, px - 25, py + 38 + Math.sin(frameCount * 0.2) * 5);
            ctx.lineTo(px - 16, py + 46);
            ctx.quadraticCurveTo(px - 8, py + 36, px + 14, py + 32);
            ctx.closePath();
            ctx.fill();

            // Gambe Tattiche
            ctx.fillStyle = '#0f172a';
            // Gamba posteriore
            ctx.fillRect(px + 8 - legOffset * 0.6, py + 38, 10, 22);
            // Gamba anteriore
            ctx.fillRect(px + 24 + legOffset * 0.6, py + 38, 10, 22);
            // Scarponi con accento ciano
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(px + 6 - legOffset * 0.6, py + 56, 14, 4);
            ctx.fillRect(px + 22 + legOffset * 0.6, py + 56, 14, 4);

            // Busto / Giubbotto tattico
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px + 10, py + 18, 24, 24);
            ctx.fillStyle = '#334155';
            ctx.fillRect(px + 14, py + 20, 16, 20);

            // Blocco da Disegno Tattico (Arma di Maverick)
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(px + 26, py + 24, 12, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 28, py + 26, 8, 12);
            // Penna / pennino
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(px + 36, py + 22, 3, 10);

            // Testa & Visore Tattico
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(px + 22, py + 11, 10, 0, Math.PI * 2);
            ctx.fill();

            // Visore al Neon Ciano/Rosso
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(px + 22, py + 8, 11, 5);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(px + 29, py + 9, 3, 3);

            ctx.restore();
        }
    };

    // --------------------------------------------------------------------------
    // 5. Gestione Ostacoli & Collezionabili
    // --------------------------------------------------------------------------
    function spawnObstacle() {
        const rand = Math.random();
        if (rand < 0.6) {
            // Ostacolo di terra: Mina / Barricata Laser
            obstacles.push({
                x: V_WIDTH + 20,
                y: GROUND_Y - 42,
                width: 36,
                height: 42,
                type: 'ground',
                color: '#f43f5e'
            });
        } else {
            // Drone volante dell'Eclipse
            obstacles.push({
                x: V_WIDTH + 20,
                y: GROUND_Y - 95 - Math.random() * 40,
                width: 44,
                height: 28,
                type: 'drone',
                color: '#8b5cf6',
                hoverOffset: Math.random() * Math.PI
            });
        }
    }

    function spawnCollectible() {
        collectibles.push({
            x: V_WIDTH + 20,
            y: GROUND_Y - 60 - Math.random() * 80,
            radius: 12,
            type: 'orb',
            pulse: 0
        });
    }

    // --------------------------------------------------------------------------
    // 6. Sistema di Particelle
    // --------------------------------------------------------------------------
    function createDust(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5 - 2,
                vy: (Math.random() - 0.5) * 4 - 1,
                size: Math.random() * 4 + 2,
                alpha: 1,
                color: color,
                decay: 0.04 + Math.random() * 0.03
            });
        }
    }

    function createTrail(x, y, color) {
        particles.push({
            x: x,
            y: y,
            vx: -gameSpeed * 0.4,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 2,
            alpha: 0.6,
            color: color,
            decay: 0.05
        });
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.restore();
        });
    }

    // --------------------------------------------------------------------------
    // 7. Rendering Sfondi & Parallasse
    // --------------------------------------------------------------------------
    let bgOffsetFar = 0;
    let bgOffsetCity = 0;
    let groundOffset = 0;

    function drawBackground() {
        // Cielo notturno con gradiente
        const grad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
        grad.addColorStop(0, '#05060b');
        grad.addColorStop(0.65, '#0c0f1c');
        grad.addColorStop(1, '#171226');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        // Stelle scintillanti
        stars.forEach(s => {
            s.blink += 0.05;
            const alpha = 0.35 + Math.sin(s.blink) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(s.x, s.y, s.size, s.size);
            if (gameState === STATE_PLAYING) {
                s.x -= s.speed;
                if (s.x < 0) s.x = V_WIDTH;
            }
        });

        // Luna Scarlatta
        ctx.save();
        ctx.beginPath();
        ctx.arc(740, 85, 48, 0, Math.PI * 2);
        const moonGrad = ctx.createRadialGradient(740, 85, 10, 740, 85, 48);
        moonGrad.addColorStop(0, '#f43f5e');
        moonGrad.addColorStop(0.7, '#9f1239');
        moonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGrad;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 25;
        ctx.fill();
        ctx.restore();

        // Parallasse 1: Skyline lontana (silhouette scure)
        if (gameState === STATE_PLAYING) {
            bgOffsetFar = (bgOffsetFar + gameSpeed * 0.15) % 240;
        }
        ctx.fillStyle = '#080a14';
        for (let i = -1; i < Math.ceil(V_WIDTH / 60) + 2; i++) {
            const bx = i * 60 - bgOffsetFar;
            const bHeight = 110 + (Math.sin(i * 3) * 40);
            ctx.fillRect(bx, GROUND_Y - bHeight, 55, bHeight);
        }

        // Parallasse 2: Edifici medi con finestre e insegne neon
        if (gameState === STATE_PLAYING) {
            bgOffsetCity = (bgOffsetCity + gameSpeed * 0.45) % 360;
        }
        ctx.fillStyle = '#111526';
        for (let i = -1; i < Math.ceil(V_WIDTH / 90) + 2; i++) {
            const bx = i * 90 - bgOffsetCity;
            const bHeight = 80 + (Math.cos(i * 2) * 35);
            ctx.fillRect(bx, GROUND_Y - bHeight, 82, bHeight);

            // Finestrelle
            ctx.fillStyle = (i % 2 === 0) ? '#06b6d4' : '#f43f5e';
            ctx.globalAlpha = 0.45;
            ctx.fillRect(bx + 12, GROUND_Y - bHeight + 15, 6, 8);
            ctx.fillRect(bx + 30, GROUND_Y - bHeight + 15, 6, 8);
            ctx.fillRect(bx + 48, GROUND_Y - bHeight + 15, 6, 8);
            ctx.fillRect(bx + 30, GROUND_Y - bHeight + 35, 6, 8);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#111526';
        }

        // Tetto di corsa principale
        ctx.fillStyle = '#0b0d17';
        ctx.fillRect(0, GROUND_Y, V_WIDTH, V_HEIGHT - GROUND_Y);

        // Bordo neon pista di corsa
        if (gameState === STATE_PLAYING) {
            groundOffset = (groundOffset + gameSpeed) % 40;
        }
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(V_WIDTH, GROUND_Y);
        ctx.stroke();

        // Trame tratteggiate neon
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        for (let x = -groundOffset; x < V_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, GROUND_Y);
            ctx.lineTo(x + 20, V_HEIGHT);
            ctx.stroke();
        }
    }

    // --------------------------------------------------------------------------
    // 8. Disegno Ostacoli & Collezionabili
    // --------------------------------------------------------------------------
    function drawObstacles() {
        obstacles.forEach(obs => {
            ctx.save();
            if (obs.type === 'ground') {
                // Spuntone / Barricata Laser
                ctx.fillStyle = '#1e1022';
                ctx.strokeStyle = obs.color;
                ctx.lineWidth = 2.5;

                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + obs.height);
                ctx.lineTo(obs.x + obs.width / 2, obs.y);
                ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Core energetico interno
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.arc(obs.x + obs.width / 2, obs.y + obs.height - 12, 5, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === 'drone') {
                // Drone volante
                const hoverY = obs.y + Math.sin(frameCount * 0.1 + obs.hoverOffset) * 6;
                ctx.fillStyle = '#1a1829';
                ctx.strokeStyle = obs.color;
                ctx.lineWidth = 2;

                // Scafo drone
                ctx.beginPath();
                ctx.ellipse(obs.x + obs.width / 2, hoverY + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Occhio del drone lampeggiante
                ctx.fillStyle = (frameCount % 8 < 4) ? '#f43f5e' : '#ffffff';
                ctx.beginPath();
                ctx.arc(obs.x + obs.width / 2, hoverY + obs.height / 2, 6, 0, Math.PI * 2);
                ctx.fill();

                // Eliche
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.moveTo(obs.x - 4, hoverY + 2);
                ctx.lineTo(obs.x + obs.width + 4, hoverY + 2);
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    function drawCollectibles() {
        collectibles.forEach(col => {
            col.pulse += 0.1;
            const r = col.radius + Math.sin(col.pulse) * 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(col.x, col.y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(col.x, col.y, r * 0.65, 0, Math.PI * 2);
            ctx.fillStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 12;
            ctx.fill();

            // Stella centrale
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(col.x - 2, col.y - 2, 4, 4);
            ctx.restore();
        });
    }

    // --------------------------------------------------------------------------
    // 9. Rilevamento Collisioni (AABB & Circle)
    // --------------------------------------------------------------------------
    function checkCollision(rect1, rect2) {
        // Riduci leggermente la hitbox per un gameplay arcade leale e soddisfacente
        const padding = 7;
        return (
            rect1.x + padding < rect2.x + rect2.width - padding &&
            rect1.x + rect1.width - padding > rect2.x + padding &&
            rect1.y + padding < rect2.y + rect2.height - padding &&
            rect1.y + rect1.height - padding > rect2.y + padding
        );
    }

    // --------------------------------------------------------------------------
    // 10. Schermate di Gioco (Overlay Start, Game Over, Pausa)
    // --------------------------------------------------------------------------
    function drawStartScreen() {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        ctx.textAlign = 'center';

        // Badge
        ctx.font = '700 13px Orbitron, sans-serif';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('VALPOCOMICS RETRO ARCADE', V_WIDTH / 2, 110);

        // Titolo Grande
        ctx.font = '900 52px Bangers, cursive';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 20;
        ctx.fillText('MAVERICK ROOFTOP RUNNER', V_WIDTH / 2, 170);
        ctx.shadowBlur = 0;

        // Istruzioni
        ctx.font = '600 16px Orbitron, sans-serif';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('MISSIONE: DIFENDI I TETTI DI NEO-VERONA DALL\'ECLIPSE', V_WIDTH / 2, 215);

        // Call to action lampeggiante
        ctx.font = '700 20px Bangers, cursive';
        ctx.fillStyle = (frameCount % 40 < 20) ? '#ffffff' : '#06b6d4';
        ctx.fillText('PREMI [SPAZIO] O TOCCA LO SCHERMO PER GIOCARE', V_WIDTH / 2, 280);

        // Comandi quick guide
        ctx.font = '500 13px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('SPAZIO / TOUCH: Salta • DOPPIO SALTO abilitato • [X]: Scudo Disegno', V_WIDTH / 2, 335);

        // Record attuale
        if (highScore > 0) {
            ctx.font = '700 13px Orbitron, sans-serif';
            ctx.fillStyle = '#eab308';
            ctx.fillText(`RECORD ATTUALE: ${highScore} PTS`, V_WIDTH / 2, 375);
        }
    }

    function drawGameOverScreen() {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.88)';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        ctx.textAlign = 'center';

        ctx.font = '900 64px Bangers, cursive';
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 25;
        ctx.fillText('MISSIONE FALLITA!', V_WIDTH / 2, 140);
        ctx.shadowBlur = 0;

        ctx.font = '700 18px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`PUNTEGGIO: ${score} PTS   |   DISTANZA: ${distance} m`, V_WIDTH / 2, 195);

        if (score >= highScore && score > 0) {
            ctx.font = '700 18px Orbitron, sans-serif';
            ctx.fillStyle = '#eab308';
            ctx.fillText('★ NUOVO RECORD ASSOLUTO! ★', V_WIDTH / 2, 235);
        } else {
            ctx.font = '500 14px Orbitron, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`RECORD DA BATTERE: ${highScore} PTS`, V_WIDTH / 2, 235);
        }

        ctx.font = '700 22px Bangers, cursive';
        ctx.fillStyle = (frameCount % 40 < 20) ? '#06b6d4' : '#ffffff';
        ctx.fillText('PREMI [SPAZIO] O TOCCA PER RIGIOCARE', V_WIDTH / 2, 305);
    }

    function drawPauseScreen() {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.75)';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        ctx.textAlign = 'center';
        ctx.font = '900 48px Bangers, cursive';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('GIOCO IN PAUSA', V_WIDTH / 2, 190);

        ctx.font = '600 16px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PREMI [P] O IL PULSANTE PAUSA PER RIPRENDERE', V_WIDTH / 2, 240);
    }

    // --------------------------------------------------------------------------
    // 11. Loop di Aggiornamento e Disegno Principale
    // --------------------------------------------------------------------------
    function resetGame() {
        score = 0;
        distance = 0;
        gameSpeed = baseSpeed;
        obstacleTimer = 0;
        collectibleTimer = 0;
        obstacles = [];
        collectibles = [];
        particles = [];
        player.reset();
        updateHud();
    }

    function update() {
        frameCount++;

        if (gameState === STATE_PLAYING) {
            distance += Math.round(gameSpeed * 0.1);
            score += 1;

            // Incremento progressivo velocità arcade
            if (gameSpeed < maxSpeed && frameCount % 300 === 0) {
                gameSpeed += 0.25;
            }

            player.update();

            // Spawn ostacoli
            obstacleTimer++;
            const spawnInterval = Math.max(55, Math.floor(130 - (gameSpeed * 4)));
            if (obstacleTimer > spawnInterval) {
                spawnObstacle();
                obstacleTimer = 0;
            }

            // Spawn sfere di energia
            collectibleTimer++;
            if (collectibleTimer > 110) {
                spawnCollectible();
                collectibleTimer = 0;
            }

            // Aggiorna ostacoli
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obs = obstacles[i];
                obs.x -= gameSpeed;

                // Collisione con giocatore
                if (checkCollision(player, obs)) {
                    if (player.hasShield) {
                        // Lo scudo distrugge l'ostacolo
                        createDust(obs.x + obs.width / 2, obs.y + obs.height / 2, 16, obs.color);
                        obstacles.splice(i, 1);
                        score += 100;
                        sfx.hit();
                        continue;
                    } else {
                        // Game Over
                        sfx.gameOver();
                        createDust(player.x + player.width / 2, player.y + player.height / 2, 25, '#f43f5e');
                        gameState = STATE_GAMEOVER;
                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem('valpo_runner_highscore', highScore.toString());
                        }
                        updateHud();
                        break;
                    }
                }

                if (obs.x + obs.width < -30) {
                    obstacles.splice(i, 1);
                }
            }

            // Aggiorna collezionabili
            for (let i = collectibles.length - 1; i >= 0; i--) {
                const col = collectibles[i];
                col.x -= gameSpeed;

                // Distanza dal giocatore
                const distX = (player.x + player.width / 2) - col.x;
                const distY = (player.y + player.height / 2) - col.y;
                const dist = Math.sqrt(distX * distX + distY * distY);

                if (dist < col.radius + 26) {
                    // Raccolto!
                    sfx.collect();
                    createDust(col.x, col.y, 14, '#06b6d4');
                    score += 150;
                    player.energy = Math.min(100, player.energy + 25);
                    updateHudEnergy();
                    collectibles.splice(i, 1);
                    continue;
                }

                if (col.x + col.radius < -20) {
                    collectibles.splice(i, 1);
                }
            }

            updateHud();
        }

        updateParticles();
    }

    function render() {
        ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

        drawBackground();
        drawCollectibles();
        drawObstacles();
        player.draw();
        drawParticles();

        // Schermate speciali
        if (gameState === STATE_START) {
            drawStartScreen();
        } else if (gameState === STATE_GAMEOVER) {
            drawGameOverScreen();
        } else if (gameState === STATE_PAUSED) {
            drawPauseScreen();
        }
    }

    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // --------------------------------------------------------------------------
    // 12. Gestione HUD HTML & Punteggi
    // --------------------------------------------------------------------------
    const scoreValElem = document.getElementById('hud-score-val');
    const distValElem = document.getElementById('hud-dist-val');
    const highValElem = document.getElementById('hud-high-val');
    const energyBarElem = document.getElementById('hud-energy-bar');
    const energyPctElem = document.getElementById('hud-energy-pct');
    const specialBtn = document.getElementById('btn-special-shield');

    function updateHud() {
        if (scoreValElem) scoreValElem.innerText = score.toString();
        if (distValElem) distValElem.innerText = `${distance}m`;
        if (highValElem) highValElem.innerText = highScore.toString();
    }

    function updateHudEnergy() {
        if (energyBarElem) {
            energyBarElem.style.width = `${player.energy}%`;
        }
        if (energyPctElem) {
            energyPctElem.innerText = `${player.energy}%`;
        }
        if (specialBtn) {
            if (player.energy >= 100) {
                specialBtn.classList.remove('opacity-40', 'cursor-not-allowed');
                specialBtn.classList.add('animate-pulse', 'border-huntrix-cyan', 'shadow-neon-cyan');
            } else {
                specialBtn.classList.add('opacity-40', 'cursor-not-allowed');
                specialBtn.classList.remove('animate-pulse', 'border-huntrix-cyan', 'shadow-neon-cyan');
            }
        }
    }

    // --------------------------------------------------------------------------
    // 13. Gestione Input Utente (Tastiera + Touch Mobile)
    // --------------------------------------------------------------------------
    function handleActionJump() {
        initAudio();
        if (gameState === STATE_START) {
            resetGame();
            gameState = STATE_PLAYING;
        } else if (gameState === STATE_PLAYING) {
            player.jump();
        } else if (gameState === STATE_GAMEOVER) {
            resetGame();
            gameState = STATE_PLAYING;
        } else if (gameState === STATE_PAUSED) {
            gameState = STATE_PLAYING;
        }
    }

    function handleActionSpecial() {
        initAudio();
        if (gameState === STATE_PLAYING) {
            player.activateShield();
        }
    }

    function togglePause() {
        if (gameState === STATE_PLAYING) {
            gameState = STATE_PAUSED;
        } else if (gameState === STATE_PAUSED) {
            gameState = STATE_PLAYING;
        }
    }

    // Eventi Tastiera
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            handleActionJump();
        } else if (e.code === 'KeyX' || e.code === 'KeyE') {
            e.preventDefault();
            handleActionSpecial();
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
            e.preventDefault();
            togglePause();
        }
    });

    // Eventi Touch & Click su Canvas
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleActionJump();
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
        handleActionJump();
    });

    // Pulsanti Virtuali Mobile
    const mobileJumpBtn = document.getElementById('touch-jump-btn');
    if (mobileJumpBtn) {
        mobileJumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleActionJump();
        }, { passive: false });
        mobileJumpBtn.addEventListener('click', handleActionJump);
    }

    if (specialBtn) {
        specialBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleActionSpecial();
        }, { passive: false });
        specialBtn.addEventListener('click', handleActionSpecial);
    }

    // Bottone Mute
    const muteBtn = document.getElementById('btn-mute');
    function updateMuteBtn() {
        if (!muteBtn) return;
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark text-red-500"></i>';
        } else {
            muteBtn.innerHTML = '<i class="fa-solid fa-volume-high text-huntrix-cyan"></i>';
        }
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            initAudio();
            isMuted = !isMuted;
            localStorage.setItem('valpo_runner_muted', isMuted ? 'true' : 'false');
            updateMuteBtn();
        });
    }

    // Bottone Pausa UI
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            initAudio();
            togglePause();
        });
    }

    // Inizializzazione al caricamento
    window.onload = function() {
        updateHud();
        updateHudEnergy();
        updateMuteBtn();
        requestAnimationFrame(gameLoop);
    };

})();
