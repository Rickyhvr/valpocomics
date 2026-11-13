/* ==========================================================================
   VALPOCOMICS ARENA - ARENA.JS
   Picchiaduro 2D Stile Manga Shonen — Arbizzano City (Maverick vs Ale)
   ========================================================================== */

(function () {
    'use strict';

    // ----------------------------------------------------------------------
    // 1. Costanti & Specifiche Fedeli al Fumetto
    // ----------------------------------------------------------------------
    const W = 1040;
    const H = 585;
    const GROUND_Y = 515;
    const STAGE_LEFT = 55;
    const STAGE_RIGHT = W - 55;
    const GRAVITY = 2050;
    const ROUND_TIME = 99;

    const FIGHTER_SPECS = {
        maverick: {
            id: 'maverick',
            name: 'MAVERICK',
            color: '#e50914',
            colorLight: '#ff4d57',
            skin: '#f4c7a5',
            hair: '#5c3317',
            jacket: '#e50914',
            sleeves: '#334155',
            shirt: '#fef3c7',
            pants: '#475569',
            shoes: '#e50914',
            eyes: '#0284c7',
            speed: 310,
            jumpVel: -780,
            punchDamage: 11,
            kickDamage: 16,
            punchRange: 108,
            kickRange: 124,
            punchDur: 0.24,
            kickDur: 0.34,
            superName: 'CREATION ART: CARROARMATO!',
            spritePath: 'assets/fighters/maverick.png'
        },
        ale: {
            id: 'ale',
            name: 'ALE',
            color: '#0284c7',
            colorLight: '#38bdf8',
            skin: '#f4c7a5',
            hair: '#6b3e26',
            jacket: '#166534',
            sleeves: '#14532d',
            shirt: '#f97316',
            pants: '#475569',
            shoes: '#15803d',
            eyes: '#451a03',
            speed: 365,
            jumpVel: -820,
            punchDamage: 9,
            kickDamage: 14,
            punchRange: 104,
            kickRange: 120,
            punchDur: 0.20,
            kickDur: 0.29,
            superName: 'KAMEHAMEHA! ONDA ENERGETICA!',
            spritePath: 'assets/fighters/ale.png'
        }
    };

    const DIFFICULTY_CFG = {
        facile:    { reactDelay: 0.42, aggro: 0.40, blockChance: 0.14, superChance: 0.40 },
        normale:   { reactDelay: 0.24, aggro: 0.64, blockChance: 0.32, superChance: 0.70 },
        difficile: { reactDelay: 0.13, aggro: 0.88, blockChance: 0.62, superChance: 0.92 }
    };

    // ----------------------------------------------------------------------
    // 2. Sprite Multi-Posa Realistici da Fumetto (assets/fighters/*.png)
    // ----------------------------------------------------------------------
    const SPRITE_SCALE = 0.38;
    const SPRITE_MANIFEST = {
        maverick: {
            idle:  { src: 'assets/fighters/maverick_idle.png',  w: 250, h: 494, ax: 125.0, ay: 494.0 },
            punch: { src: 'assets/fighters/maverick_punch.png', w: 336, h: 494, ax: 125.0, ay: 494.0 },
            kick:  { src: 'assets/fighters/maverick_kick.png',  w: 425, h: 458, ax: 198.5, ay: 472.0 },
            block: { src: 'assets/fighters/maverick_block.png', w: 250, h: 494, ax: 125.0, ay: 494.0 }
        },
        ale: {
            idle:      { src: 'assets/fighters/ale_idle.png',  w: 265, h: 464, ax: 132.5, ay: 463.5 },
            punch:     { src: 'assets/fighters/ale_punch.png', w: 330, h: 464, ax: 132.5, ay: 463.5 },
            kick:      { src: 'assets/fighters/ale_kick.png',  w: 380, h: 468, ax: 129.5, ay: 468.0 },
            block:     { src: 'assets/fighters/ale_block.png', w: 265, h: 464, ax: 132.5, ay: 463.5 },
            superCast: { src: 'assets/fighters/ale_super.png', w: 311, h: 464, ax: 132.5, ay: 463.5 }
        }
    };

    const fighterSprites = { maverick: {}, ale: {} };
    Object.keys(SPRITE_MANIFEST).forEach((fid) => {
        const poses = SPRITE_MANIFEST[fid];
        Object.keys(poses).forEach((poseName) => {
            const cfg = poses[poseName];
            const img = new Image();
            const entry = { img, ready: false, cfg };
            img.onload = () => {
                if (img.naturalWidth > 0) {
                    entry.ready = true;
                    if (poseName === 'idle' && typeof drawPortraits === 'function') {
                        drawPortraits();
                    }
                }
            };
            img.onerror = () => {
                entry.ready = false;
            };
            img.src = cfg.src;
            fighterSprites[fid][poseName] = entry;
        });
    });

    function getFighterPoseEntry(fid, state) {
        const map = fighterSprites[fid];
        if (!map) return null;
        if (state === 'superCast' && map.superCast && map.superCast.ready) return map.superCast;
        if (state === 'superCast' && fid === 'maverick' && map.punch && map.punch.ready) return map.punch;
        if (map[state] && map[state].ready) return map[state];
        if (map.idle && map.idle.ready) return map.idle;
        return null;
    }

    // ----------------------------------------------------------------------
    // 3. Audio Synth Retro Manga
    // ----------------------------------------------------------------------
    let audioCtx = null;
    let isMuted = localStorage.getItem('valpo_arena_muted') === 'true';

    function initAudio() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    }

    function playTone(freq, type, dur, slideFreq = null, vol = 0.13) {
        if (isMuted || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideFreq), now + dur);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + dur);
        } catch (_) {}
    }

    function playNoise(dur, vol = 0.14) {
        if (isMuted || !audioCtx) return;
        try {
            const len = Math.floor(audioCtx.sampleRate * dur);
            const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            src.connect(gain);
            gain.connect(audioCtx.destination);
            src.start();
        } catch (_) {}
    }

    const sfx = {
        select() { playTone(560, 'triangle', 0.07, 820, 0.1); },
        jump()   { playTone(240, 'square', 0.11, 520, 0.08); },
        swing()  { playTone(340, 'triangle', 0.07, 130, 0.08); },
        punch()  { playTone(170, 'sawtooth', 0.1, 55, 0.15); playNoise(0.07, 0.12); },
        kick()   { playTone(135, 'sawtooth', 0.14, 42, 0.18); playNoise(0.1, 0.14); },
        block()  { playTone(700, 'square', 0.07, 440, 0.1); },
        sketch() {
            playTone(480, 'sine', 0.13, 920, 0.11);
            setTimeout(() => playTone(720, 'triangle', 0.17, 1280, 0.11), 85);
        },
        tankFire() { playTone(145, 'sawtooth', 0.22, 38, 0.2); playNoise(0.18, 0.2); },
        kamehameha() {
            playTone(280, 'sawtooth', 0.28, 760, 0.12);
            setTimeout(() => playTone(540, 'square', 0.34, 200, 0.15), 130);
        },
        boom()   { playTone(95, 'sawtooth', 0.32, 28, 0.22); playNoise(0.28, 0.24); },
        fight()  {
            playTone(440, 'square', 0.09, 660, 0.11);
            setTimeout(() => playTone(660, 'square', 0.17, 880, 0.13), 95);
        },
        ko()     {
            playTone(250, 'sawtooth', 0.24, 90, 0.18);
            setTimeout(() => playTone(140, 'sawtooth', 0.42, 42, 0.2), 180);
        }
    };

    // ----------------------------------------------------------------------
    // 4. DOM Elements
    // ----------------------------------------------------------------------
    const selectScreen = document.getElementById('select-screen');
    const arenaStage = document.getElementById('arena-stage');
    const gameWrap = document.getElementById('game-wrap');
    const canvas = document.getElementById('arena-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    const pauseScreen = document.getElementById('pause-screen');
    const resultScreen = document.getElementById('result-screen');
    const resultKicker = document.getElementById('result-kicker');
    const resultTitle = document.getElementById('result-title');
    const resultSub = document.getElementById('result-sub');
    const resultScore = document.getElementById('result-score');
    const touchControls = document.getElementById('touch-controls');

    const btnStart = document.getElementById('btn-start');
    const btnStartQuick = document.getElementById('btn-start-quick');
    const btnPause = document.getElementById('btn-pause');
    const btnMute = document.getElementById('btn-mute');
    const btnTouch = document.getElementById('btn-touch');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    const fighterCards = document.querySelectorAll('.fighter-card');
    const diffBtns = document.querySelectorAll('.diff-btn');
    const touchSuperBtn = document.querySelector('.act-btn.super');
    const deckSuperBtn = document.getElementById('deck-super-btn');

    let selectedP1 = 'maverick';
    let selectedDiff = 'facile';
    let touchEnabled = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    function syncMuteBtn() {
        btnMute.innerHTML = isMuted
            ? '<i class="fa-solid fa-volume-xmark"></i>'
            : '<i class="fa-solid fa-volume-high"></i>';
        btnMute.classList.toggle('active', !isMuted);
    }

    function syncTouchVisibility() {
        const inArena = !arenaStage.classList.contains('hidden');
        touchControls.classList.toggle('hidden', !(inArena && touchEnabled));
        btnTouch.classList.toggle('active', touchEnabled);
    }

    syncMuteBtn();
    syncTouchVisibility();

    // ----------------------------------------------------------------------
    // 5. Ambientazione Manga Diurna: Arbizzano City (Tavole 1, 8 e 12)
    // ----------------------------------------------------------------------
    const arenaBg = new Image();
    let arenaBgReady = false;
    arenaBg.onload = () => {
        arenaBgReady = true;
        if (typeof drawPortraits === 'function') drawPortraits();
    };
    arenaBg.src = 'assets/arena-bg.jpg';

    function drawCelCloud(x, y, s) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 24, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(24, -12, 26, Math.PI * 1.0, Math.PI * 1.85);
        ctx.arc(52, -4, 22, Math.PI * 1.3, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Ombra inferiore cel-shaded
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(-10, 8, 68, 8);
        ctx.restore();
    }

    function drawMangaTree(x, y, s) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        const ink = '#111827';
        // Tronco
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        ctx.fillRect(-8, -46, 16, 46);
        ctx.strokeRect(-8, -46, 16, 46);
        // Chioma cel-shaded
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, -68, 34, 0, Math.PI * 2);
        ctx.arc(-24, -52, 24, 0, Math.PI * 2);
        ctx.arc(24, -52, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Luce sulla parte superiore
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(-6, -78, 22, 0, Math.PI * 2);
        ctx.arc(14, -64, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawArbizzanoMangaBg(time) {
        if (arenaBgReady) {
            ctx.drawImage(arenaBg, 0, 0, W, H);
            return;
        }

        const ink = '#111827';

        // 1. Cielo Azzurro Diurno stile Manga
        const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y - 90);
        sky.addColorStop(0, '#2563eb');
        sky.addColorStop(0.45, '#38bdf8');
        sky.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, GROUND_Y);

        // Nuvole morbide in lento movimento
        const drift = (time * 8) % (W + 240);
        drawCelCloud((drift + 110) % (W + 200) - 100, 92, 1.05);
        drawCelCloud((drift + 490) % (W + 200) - 100, 72, 0.85);
        drawCelCloud((drift + 830) % (W + 200) - 100, 114, 1.15);

        // 2. Colline della Valpolicella
        ctx.fillStyle = '#86efac';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 380);
        ctx.quadraticCurveTo(210, 290, 460, 355);
        ctx.quadraticCurveTo(750, 265, W, 345);
        ctx.lineTo(W, GROUND_Y);
        ctx.lineTo(0, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Torre Bianca Osservatorio + Casa Cupola stile Capsule Corp (da Tavola 1)
        ctx.save();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        // Torre bianca sullo sfondo sinistro
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(142, 185, 22, 130);
        ctx.strokeRect(142, 185, 22, 130);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(153, 182, 34, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(136, 178, 34, 7);

        // Casa a Cupola Beige (Tavola 1)
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(82, 368, 66, Math.PI, 0);
        ctx.lineTo(148, 385);
        ctx.lineTo(16, 385);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(46, 332, 26, 18);
        ctx.strokeRect(46, 332, 26, 18);
        ctx.fillRect(88, 332, 26, 18);
        ctx.strokeRect(88, 332, 26, 18);
        ctx.restore();

        // 4. Collina del Bunker con Cupola (da Tavola 8 & Tavola 12) sul lato destro
        ctx.save();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        // Cupola metallica sopra il bunker
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(865, 255, 36, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Collina rocciosa/erbosa
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(740, 390);
        ctx.quadraticCurveTo(865, 225, 995, 390);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Ingresso in cemento del Bunker
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(825, 315, 80, 75);
        ctx.strokeRect(825, 315, 80, 75);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(844, 336, 42, 54);
        ctx.restore();

        // 5. Scuola / Edifici di Arbizzano al centro
        ctx.save();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(410, 290, 210, 100);
        ctx.strokeRect(410, 290, 210, 100);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(400, 290);
        ctx.lineTo(515, 258);
        ctx.lineTo(630, 290);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Finestre scuola
        for (let wx = 428; wx <= 588; wx += 40) {
            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(wx, 310, 24, 26);
            ctx.strokeRect(wx, 310, 24, 26);
        }
        // Cancello scuola
        ctx.fillStyle = '#334155';
        ctx.fillRect(492, 348, 46, 42);
        ctx.strokeRect(492, 348, 46, 42);
        ctx.restore();

        // Alberi rigogliosi
        drawMangaTree(210, 390, 1.05);
        drawMangaTree(360, 392, 0.85);
        drawMangaTree(675, 392, 0.92);
        drawMangaTree(1005, 395, 1.15);

        // Staccionata in legno a sinistra (Tavola 1)
        ctx.save();
        ctx.fillStyle = '#d97706';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        for (let fx = 6; fx < 260; fx += 22) {
            ctx.fillRect(fx, 355, 16, 40);
            ctx.strokeRect(fx, 355, 16, 40);
        }
        ctx.restore();

        // Auto parcheggiate sullo sfondo (blu e gialla come Tavola 1)
        drawComicCar(285, 394, '#60a5fa', 1);
        drawComicCar(610, 394, '#facc15', -1);

        // 6. Muretto di Pietra (Tavola 12)
        ctx.save();
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        ctx.fillRect(0, 388, W, 34);
        ctx.strokeRect(0, 388, W, 34);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 384, W, 8);
        ctx.strokeRect(0, 384, W, 8);
        for (let bx = 0; bx < W; bx += 52) {
            ctx.beginPath();
            ctx.moveTo(bx, 392);
            ctx.lineTo(bx, 422);
            ctx.stroke();
        }
        ctx.restore();

        // 7. Marciapiede e Strada Soleggiata di Arbizzano
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 422, W, 24);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 446);
        ctx.lineTo(W, 446);
        ctx.stroke();

        // Asfalto stradale pulito
        const road = ctx.createLinearGradient(0, 446, 0, H);
        road.addColorStop(0, '#64748b');
        road.addColorStop(1, '#475569');
        ctx.fillStyle = road;
        ctx.fillRect(0, 446, W, H - 446);

        // Striscia bianca centrale
        ctx.fillStyle = '#f8fafc';
        for (let rx = 24; rx < W; rx += 92) {
            ctx.fillRect(rx, 526, 52, 7);
        }
    }

    function drawComicCar(x, y, color, dir) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir, 1);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-42, -24, 84, 20, 6);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-26, -24);
        ctx.lineTo(-14, -40);
        ctx.lineTo(18, -40);
        ctx.lineTo(30, -24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(-10, -36, 24, 11);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-24, -4, 8, 0, Math.PI * 2);
        ctx.arc(24, -4, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Linee cinetiche manga lungo i bordi su colpi forti / super
    let speedLinesTimer = 0;
    function drawMangaSpeedLines(intensity) {
        if (intensity <= 0) return;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.globalAlpha = Math.min(0.65, intensity);
        ctx.strokeStyle = '#111827';
        for (let i = 0; i < 42; i++) {
            const ang = (i / 42) * Math.PI * 2 + (Math.floor(performance.now() / 60) % 3) * 0.04;
            const rIn = 350 + (i % 4) * 35;
            const rOut = 660;
            ctx.lineWidth = (i % 3 === 0) ? 3.5 : 1.8;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * rIn, Math.sin(ang) * rIn);
            ctx.lineTo(Math.cos(ang) * rOut, Math.sin(ang) * rOut);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ----------------------------------------------------------------------
    // 6. Modello & Disegno Personaggi Fedeli al Fumetto
    // ----------------------------------------------------------------------
    function createFighter(specId, x, facing) {
        const spec = FIGHTER_SPECS[specId];
        return {
            spec,
            x,
            y: GROUND_Y,
            vx: 0,
            vy: 0,
            facing,
            hp: 100,
            trailHp: 100,
            superCharge: 20,
            state: 'idle',
            stateTimer: 0,
            hitRegistered: false,
            superReleased: false,
            animTime: Math.random() * 4,
            blockFlash: 0,
            flashTimer: 0
        };
    }

    function drawComicFighter(targetCtx, f, scale = 1, poseOverride = null) {
        const spec = f.spec;
        const state = poseOverride || f.state;
        const poseEntry = !poseOverride ? getFighterPoseEntry(spec.id, state) : null;

        targetCtx.save();
        targetCtx.translate(f.x, f.y);
        targetCtx.scale(f.facing * scale, scale);

        const t = f.animTime;

        // Sprite multi-posa realistico da fumetto (assets/fighters/*.png)
        if (poseEntry) {
            const cfg = poseEntry.cfg;
            const dw = cfg.w * SPRITE_SCALE;
            const dh = cfg.h * SPRITE_SCALE;
            const dx = -cfg.ax * SPRITE_SCALE;
            const dy = -cfg.ay * SPRITE_SCALE;

            // Aura Manga quando Super carica / SuperCast / Victory
            if (spec.id === 'ale' && (state === 'superCast' || f.superCharge >= 100 || state === 'victory')) {
                const pulse = 1 + Math.sin(t * 16) * 0.08;
                targetCtx.save();
                targetCtx.scale(pulse, pulse);
                const aura = targetCtx.createRadialGradient(0, -92, 16, 0, -92, 102);
                aura.addColorStop(0, 'rgba(125, 211, 252, 0.72)');
                aura.addColorStop(0.6, 'rgba(2, 132, 199, 0.30)');
                aura.addColorStop(1, 'rgba(2, 132, 199, 0)');
                targetCtx.fillStyle = aura;
                targetCtx.beginPath();
                targetCtx.arc(0, -92, 102, 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.restore();
            } else if (spec.id === 'maverick' && (state === 'superCast' || f.superCharge >= 100 || state === 'victory')) {
                const pulse = 1 + Math.sin(t * 14) * 0.07;
                targetCtx.save();
                targetCtx.scale(pulse, pulse);
                const aura = targetCtx.createRadialGradient(0, -96, 16, 0, -96, 98);
                aura.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
                aura.addColorStop(0.6, 'rgba(249, 115, 22, 0.22)');
                aura.addColorStop(1, 'rgba(249, 115, 22, 0)');
                targetCtx.fillStyle = aura;
                targetCtx.beginPath();
                targetCtx.arc(0, -96, 98, 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.restore();
            }

            // Micro-animazioni arcade per dare fluidità agli sprite
            let offsetX = 0;
            let offsetY = 0;
            let rot = 0;
            let sx = 1;
            let sy = 1;

            if (state === 'idle') {
                sy = 1 + Math.sin(t * 5.2) * 0.015;
                sx = 1 / sy;
            } else if (state === 'walk') {
                offsetY = -Math.abs(Math.sin(t * 13)) * 6;
                const movingForward = (f.vx * f.facing) >= 0;
                rot = (movingForward ? 0.05 : -0.04) + Math.sin(t * 13) * 0.024;
            } else if (state === 'jump') {
                sx = 0.96;
                sy = 1.04;
                rot = 0.06;
            } else if (state === 'punch') {
                const p = Math.min(1, f.stateTimer / (spec.punchDur * 0.35));
                const ext = f.stateTimer < spec.punchDur * 0.55 ? p : Math.max(0, 1 - (f.stateTimer - spec.punchDur * 0.55) / (spec.punchDur * 0.45));
                offsetX = 14 * ext;
            } else if (state === 'kick') {
                const p = Math.min(1, f.stateTimer / (spec.kickDur * 0.35));
                const ext = f.stateTimer < spec.kickDur * 0.6 ? p : Math.max(0, 1 - (f.stateTimer - spec.kickDur * 0.6) / (spec.kickDur * 0.4));
                offsetX = 10 * ext;
                offsetY = -6 * ext;
            } else if (state === 'block') {
                offsetX = -5;
                sx = 1.02;
                sy = 0.96;
            } else if (state === 'hit') {
                rot = -0.22;
                offsetX = -8;
            } else if (state === 'ko') {
                offsetY = -16;
                rot = -Math.PI / 2;
            } else if (state === 'victory') {
                offsetY = -Math.abs(Math.sin(t * 6.5)) * 7;
            }

            targetCtx.save();
            targetCtx.translate(offsetX, offsetY);
            if (rot !== 0) targetCtx.rotate(rot);
            targetCtx.scale(sx, sy);

            if (f.flashTimer > 0 && Math.floor(f.flashTimer * 28) % 2 === 0) {
                targetCtx.filter = 'brightness(1.9) contrast(1.15)';
            }

            targetCtx.drawImage(poseEntry.img, dx, dy, dw, dh);

            // Scia dinamica pugno/calcio in stile manga
            if (state === 'punch' && f.stateTimer < spec.punchDur * 0.65) {
                targetCtx.strokeStyle = spec.id === 'maverick' ? '#facc15' : '#38bdf8';
                targetCtx.lineWidth = 3.5;
                targetCtx.beginPath();
                targetCtx.moveTo(42, -130);
                targetCtx.lineTo(94, -130);
                targetCtx.moveTo(52, -118);
                targetCtx.lineTo(88, -118);
                targetCtx.stroke();
            } else if (state === 'kick' && f.stateTimer < spec.kickDur * 0.72) {
                targetCtx.strokeStyle = spec.id === 'maverick' ? '#fde047' : '#7dd3fc';
                targetCtx.lineWidth = 4;
                targetCtx.beginPath();
                targetCtx.arc(28, -92, 68, -0.7, 0.35);
                targetCtx.stroke();
            }

            // Scudo visivo quando Para
            if (state === 'block') {
                targetCtx.strokeStyle = f.blockFlash > 0 ? '#ffffff' : (spec.id === 'ale' ? '#38bdf8' : '#fbbf24');
                targetCtx.lineWidth = f.blockFlash > 0 ? 5.5 : 3.5;
                targetCtx.beginPath();
                targetCtx.arc(38, -104, 48, -Math.PI * 0.38, Math.PI * 0.38);
                targetCtx.stroke();
            }

            // Matita Dorata Manga di Maverick durante SuperCast
            if (state === 'superCast' && spec.id === 'maverick') {
                targetCtx.save();
                targetCtx.translate(72, -124);
                targetCtx.rotate(-0.18 + Math.sin(t * 24) * 0.08);
                targetCtx.fillStyle = '#facc15';
                targetCtx.strokeStyle = '#111827';
                targetCtx.lineWidth = 2.8;
                targetCtx.beginPath();
                targetCtx.roundRect(-8, -6, 44, 12, 3);
                targetCtx.fill();
                targetCtx.stroke();
                targetCtx.fillStyle = '#fef08a';
                targetCtx.beginPath();
                targetCtx.moveTo(36, -6);
                targetCtx.lineTo(52, 0);
                targetCtx.lineTo(36, 6);
                targetCtx.closePath();
                targetCtx.fill();
                targetCtx.stroke();
                // Aura punta matita
                targetCtx.fillStyle = 'rgba(253, 224, 71, 0.85)';
                targetCtx.beginPath();
                targetCtx.arc(54, 0, 12 + Math.sin(t * 30) * 3, 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.restore();
            }

            targetCtx.restore();
            targetCtx.restore();
            return;
        }

        const bob = state === 'idle' ? Math.sin(t * 5.2) * 2.8 : (state === 'walk' ? Math.abs(Math.sin(t * 11)) * -4.5 : 0);
        const walkSwing = state === 'walk' ? Math.sin(t * 11) * 16 : 0;

        // Aura Blu Ki di Ale (come in Tavola 8 e Tavola 12)
        if (spec.id === 'ale' && (state === 'superCast' || f.superCharge >= 100 || state === 'kick' || state === 'victory')) {
            const pulse = 1 + Math.sin(t * 16) * 0.08;
            targetCtx.save();
            targetCtx.scale(pulse, pulse);
            const aura = targetCtx.createRadialGradient(0, -70, 12, 0, -70, 74);
            aura.addColorStop(0, 'rgba(125, 211, 252, 0.65)');
            aura.addColorStop(0.65, 'rgba(2, 132, 199, 0.28)');
            aura.addColorStop(1, 'rgba(2, 132, 199, 0)');
            targetCtx.fillStyle = aura;
            targetCtx.beginPath();
            targetCtx.arc(0, -70, 74, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.restore();
        } else if (spec.id === 'maverick' && (state === 'superCast' || f.superCharge >= 100)) {
            targetCtx.save();
            targetCtx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
            targetCtx.lineWidth = 2.5;
            targetCtx.setLineDash([6, 5]);
            targetCtx.beginPath();
            targetCtx.arc(0, -70, 58 + Math.sin(t * 12) * 4, 0, Math.PI * 2);
            targetCtx.stroke();
            targetCtx.restore();
        }

        if (state === 'ko') {
            targetCtx.translate(0, -14);
            targetCtx.rotate(-Math.PI / 2);
        } else if (state === 'hit') {
            targetCtx.rotate(-0.18);
        }

        targetCtx.lineJoin = 'round';
        targetCtx.lineCap = 'round';
        const ink = '#111827';
        const isFlash = f.flashTimer > 0 && Math.floor(f.flashTimer * 28) % 2 === 0;

        // ---- GAMBA POSTERIORE (Jeans + Sneaker con punta bianca) ----
        targetCtx.save();
        targetCtx.fillStyle = spec.pants;
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 3;
        const backLegX = -14 - walkSwing * 0.55;
        targetCtx.beginPath();
        targetCtx.moveTo(-6, -48 + bob);
        targetCtx.lineTo(backLegX - 7, -6);
        targetCtx.lineTo(backLegX + 10, -6);
        targetCtx.lineTo(6, -48 + bob);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.stroke();
        // Risvolto jeans + scarpa
        targetCtx.fillStyle = '#94a3b8';
        targetCtx.fillRect(backLegX - 7, -14, 17, 5);
        targetCtx.strokeRect(backLegX - 7, -14, 17, 5);
        targetCtx.fillStyle = spec.shoes;
        targetCtx.fillRect(backLegX - 8, -9, 23, 9);
        targetCtx.strokeRect(backLegX - 8, -9, 23, 9);
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(backLegX + 7, -6, 8, 6);
        targetCtx.restore();

        // ---- GAMBA ANTERIORE ----
        targetCtx.save();
        targetCtx.fillStyle = spec.pants;
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 3;
        if (state === 'kick') {
            const p = Math.min(1, f.stateTimer / (spec.kickDur * 0.42));
            const ext = f.stateTimer < spec.kickDur * 0.55 ? p : Math.max(0, 1 - (f.stateTimer - spec.kickDur * 0.55) / (spec.kickDur * 0.45));
            const kx = 26 + ext * 68;
            const ky = -58 - ext * 22;
            if (ext > 0.35) {
                targetCtx.strokeStyle = '#ffffff';
                targetCtx.lineWidth = 6;
                targetCtx.beginPath();
                targetCtx.arc(10, -56, 76, -0.55, 0.25);
                targetCtx.stroke();
                targetCtx.strokeStyle = ink;
                targetCtx.lineWidth = 3;
            }
            targetCtx.beginPath();
            targetCtx.moveTo(2, -52 + bob);
            targetCtx.lineTo(kx, ky);
            targetCtx.lineTo(kx - 4, ky + 16);
            targetCtx.lineTo(0, -38 + bob);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();

            targetCtx.fillStyle = spec.shoes;
            targetCtx.fillRect(kx - 4, ky - 2, 22, 16);
            targetCtx.strokeRect(kx - 4, ky - 2, 22, 16);
        } else {
            const frontLegX = 15 + walkSwing * 0.55;
            targetCtx.beginPath();
            targetCtx.moveTo(0, -48 + bob);
            targetCtx.lineTo(frontLegX - 7, -6);
            targetCtx.lineTo(frontLegX + 10, -6);
            targetCtx.lineTo(12, -48 + bob);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();

            targetCtx.fillStyle = '#94a3b8';
            targetCtx.fillRect(frontLegX - 7, -14, 17, 5);
            targetCtx.strokeRect(frontLegX - 7, -14, 17, 5);
            targetCtx.fillStyle = spec.shoes;
            targetCtx.fillRect(frontLegX - 7, -9, 24, 9);
            targetCtx.strokeRect(frontLegX - 7, -9, 24, 9);
            targetCtx.fillStyle = '#ffffff';
            targetCtx.fillRect(frontLegX + 9, -6, 8, 6);
        }
        targetCtx.restore();

        // ---- TORSO (Giacca aperta + Maglietta fedele al fumetto) ----
        targetCtx.save();
        targetCtx.fillStyle = isFlash ? '#ffffff' : spec.jacket;
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.moveTo(-18, -94 + bob);
        targetCtx.lineTo(18, -94 + bob);
        targetCtx.lineTo(15, -46 + bob);
        targetCtx.lineTo(-15, -46 + bob);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.stroke();

        // Maglietta interna (Crema per Maverick, Arancione per Ale)
        targetCtx.fillStyle = isFlash ? '#ffffff' : spec.shirt;
        targetCtx.beginPath();
        targetCtx.moveTo(-8, -94 + bob);
        targetCtx.lineTo(9, -94 + bob);
        targetCtx.lineTo(7, -48 + bob);
        targetCtx.lineTo(-7, -48 + bob);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.stroke();

        // Cappuccio scuro per Maverick (Tavola 1)
        if (spec.id === 'maverick') {
            targetCtx.fillStyle = spec.sleeves;
            targetCtx.beginPath();
            targetCtx.arc(-14, -90 + bob, 9, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.stroke();
        }
        targetCtx.restore();

        // ---- TESTA & CAPELLI FEDELI AL FUMETTO ----
        targetCtx.save();
        targetCtx.translate(2, -112 + bob);
        targetCtx.fillStyle = spec.skin;
        targetCtx.fillRect(-5, 9, 10, 10);

        targetCtx.fillStyle = isFlash ? '#ffffff' : spec.skin;
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, 17, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.stroke();

        // Occhio manga espressivo
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(3, -5, 8, 7);
        targetCtx.fillStyle = spec.eyes;
        targetCtx.fillRect(6, -4, 5, 5);
        targetCtx.fillStyle = ink;
        targetCtx.fillRect(8, -3, 2.5, 3);
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 2.6;
        targetCtx.beginPath();
        targetCtx.moveTo(2, -8);
        targetCtx.lineTo(13, -5);
        targetCtx.stroke();

        // Capelli
        targetCtx.fillStyle = spec.hair;
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 2.5;
        targetCtx.beginPath();
        if (spec.id === 'maverick') {
            // Grandi punte alla Dragon Ball di Maverick + ciuffo biondo!
            targetCtx.moveTo(-16, -2);
            targetCtx.lineTo(-29, -15);
            targetCtx.lineTo(-16, -15);
            targetCtx.lineTo(-22, -31);
            targetCtx.lineTo(-6, -22);
            targetCtx.lineTo(1, -36);
            targetCtx.lineTo(10, -21);
            targetCtx.lineTo(25, -26);
            targetCtx.lineTo(16, -11);
            targetCtx.lineTo(24, -7);
            targetCtx.lineTo(14, -2);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();

            // Ciuffo biondo caratteristico di Maverick!
            targetCtx.fillStyle = '#fde047';
            targetCtx.beginPath();
            targetCtx.moveTo(2, -13);
            targetCtx.lineTo(20, -24);
            targetCtx.lineTo(13, -10);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();
        } else {
            // Capelli castani sbarazzini a punte di Ale (Tavola 1 & 12)
            targetCtx.moveTo(-17, -3);
            targetCtx.lineTo(-22, -15);
            targetCtx.lineTo(-11, -14);
            targetCtx.lineTo(-11, -24);
            targetCtx.lineTo(-1, -18);
            targetCtx.lineTo(6, -26);
            targetCtx.lineTo(11, -16);
            targetCtx.lineTo(20, -18);
            targetCtx.lineTo(15, -5);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();
        }
        targetCtx.restore();

        // ---- BRACCIO & PUGNO / MATITA / ONDA ----
        targetCtx.save();
        targetCtx.strokeStyle = ink;
        targetCtx.lineWidth = 3;
        if (state === 'punch') {
            const p = Math.min(1, f.stateTimer / (spec.punchDur * 0.38));
            const ext = f.stateTimer < spec.punchDur * 0.55 ? p : Math.max(0, 1 - (f.stateTimer - spec.punchDur * 0.55) / (spec.punchDur * 0.45));
            const fx = 22 + ext * 58;
            const fy = -80 + bob;

            if (ext > 0.35) {
                targetCtx.strokeStyle = '#ffffff';
                targetCtx.lineWidth = 5;
                targetCtx.beginPath();
                targetCtx.moveTo(12, fy - 6);
                targetCtx.lineTo(fx + 10, fy - 6);
                targetCtx.moveTo(14, fy + 6);
                targetCtx.lineTo(fx + 6, fy + 6);
                targetCtx.stroke();
                targetCtx.strokeStyle = ink;
                targetCtx.lineWidth = 3;
            }
            targetCtx.fillStyle = spec.sleeves;
            targetCtx.fillRect(6, fy - 7, fx - 14, 14);
            targetCtx.strokeRect(6, fy - 7, fx - 14, 14);

            targetCtx.fillStyle = spec.skin;
            targetCtx.beginPath();
            targetCtx.arc(fx, fy, 11, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.stroke();
        } else if (state === 'block') {
            // Braccia incrociate + Barriera Ki blu per Ale (come Tavola 12!) o scudo per Maverick
            targetCtx.fillStyle = spec.sleeves;
            targetCtx.fillRect(10, -90 + bob, 12, 32);
            targetCtx.strokeRect(10, -90 + bob, 12, 32);

            const shieldCol = spec.id === 'ale' ? '#38bdf8' : '#fde047';
            targetCtx.strokeStyle = f.blockFlash > 0 ? '#ffffff' : shieldCol;
            targetCtx.fillStyle = f.blockFlash > 0 ? 'rgba(255,255,255,0.45)' : (spec.id === 'ale' ? 'rgba(56,189,248,0.28)' : 'rgba(250,204,21,0.24)');
            targetCtx.lineWidth = 4;
            targetCtx.beginPath();
            targetCtx.arc(10, -70 + bob, 50, -Math.PI * 0.46, Math.PI * 0.46);
            targetCtx.stroke();
            targetCtx.fill();
        } else if (state === 'superCast') {
            if (spec.id === 'maverick') {
                // Matita luminosa alzata (Creation Art!)
                targetCtx.fillStyle = spec.sleeves;
                targetCtx.fillRect(10, -88 + bob, 18, 12);
                targetCtx.strokeRect(10, -88 + bob, 18, 12);
                targetCtx.fillStyle = '#fde047';
                targetCtx.fillRect(26, -108 + bob, 5, 24);
                targetCtx.strokeRect(26, -108 + bob, 5, 24);
            } else {
                const thrust = f.superReleased ? 24 : -10;
                targetCtx.fillStyle = '#7dd3fc';
                targetCtx.beginPath();
                targetCtx.arc(14 + thrust, -74 + bob, 14, 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.stroke();
            }
        } else if (state === 'victory') {
            targetCtx.fillStyle = spec.sleeves;
            targetCtx.fillRect(6, -128 + bob, 11, 38);
            targetCtx.strokeRect(6, -128 + bob, 11, 38);
            targetCtx.fillStyle = spec.skin;
            targetCtx.beginPath();
            targetCtx.arc(11, -132 + bob, 10, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.stroke();
        } else {
            const guardY = -78 + bob + Math.sin(t * 5.2) * 2;
            targetCtx.fillStyle = spec.sleeves;
            targetCtx.beginPath();
            targetCtx.moveTo(6, -88 + bob);
            targetCtx.lineTo(22, guardY + 5);
            targetCtx.lineTo(26, guardY - 6);
            targetCtx.lineTo(12, -88 + bob);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();

            targetCtx.fillStyle = spec.skin;
            targetCtx.beginPath();
            targetCtx.arc(24, guardY - 1, 9.5, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.stroke();
        }
        targetCtx.restore();

        targetCtx.restore();
    }

    function drawPortraits() {
        document.querySelectorAll('canvas[data-portrait]').forEach((pc) => {
            const id = pc.dataset.portrait;
            const spec = FIGHTER_SPECS[id];
            if (!spec) return;
            pc.width = 420;
            pc.height = 195;
            const pctx = pc.getContext('2d');
            pctx.clearRect(0, 0, pc.width, pc.height);

            // Sfondo illustrato di Arbizzano City nel ritratto (se caricato)
            if (arenaBgReady) {
                const sw = arenaBg.naturalWidth * 0.56;
                const sh = arenaBg.naturalHeight * 0.88;
                const sx = id === 'maverick' ? 0 : arenaBg.naturalWidth - sw;
                const sy = arenaBg.naturalHeight * 0.06;
                pctx.drawImage(arenaBg, sx, sy, sw, sh, 0, 0, pc.width, pc.height);
                pctx.fillStyle = id === 'maverick' ? 'rgba(229, 9, 20, 0.14)' : 'rgba(0, 210, 255, 0.14)';
                pctx.fillRect(0, 0, pc.width, pc.height);
            }

            // Raggi manga sullo sfondo del ritratto
            pctx.save();
            pctx.translate(pc.width / 2, pc.height / 2);
            for (let i = 0; i < 18; i++) {
                pctx.rotate((Math.PI * 2) / 18);
                pctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'transparent';
                pctx.beginPath();
                pctx.moveTo(0, 0);
                pctx.lineTo(260, -18);
                pctx.lineTo(260, 18);
                pctx.closePath();
                pctx.fill();
            }
            pctx.restore();

            const ext = fighterSprites[id] && fighterSprites[id].idle;
            if (ext && ext.ready) {
                const ratio = Math.min(200 / ext.img.naturalWidth, 182 / ext.img.naturalHeight);
                const dw = ext.img.naturalWidth * ratio;
                const dh = ext.img.naturalHeight * ratio;
                pctx.save();
                pctx.translate(pc.width / 2, pc.height - 5);
                if (id === 'ale') pctx.scale(-1, 1); // Si guardano faccia a faccia nel VERSUS!
                pctx.drawImage(ext.img, -dw / 2, -dh, dw, dh);
                pctx.restore();
                return;
            }

            const dummy = createFighter(id, pc.width / 2, 1);
            dummy.y = pc.height - 14;
            dummy.superCharge = 100;
            drawComicFighter(pctx, dummy, 1.28, 'idle');
        });
    }

    // ----------------------------------------------------------------------
    // 7. Super Poteri, Particelle & Onomatopee Manga
    // ----------------------------------------------------------------------
    let p1, p2;
    let projectiles = [];
    let particles = [];
    let popups = [];
    let timer = ROUND_TIME;
    let round = 1;
    let p1Wins = 0;
    let p2Wins = 0;
    let matchState = 'IDLE';
    let introTimer = 0;
    let roundEndTimer = 0;
    let bannerText = '';
    let bannerSub = '';
    let shakeTimer = 0;
    let shakeAmp = 0;
    let superBannerTimer = 0;
    let superBannerName = '';
    let superBannerColor = '#fde047';
    let lastTime = 0;
    let animId = null;

    let aiThinkTimer = 0;
    let aiDecision = { left: false, right: false, up: false, block: false, punch: false, kick: false, super: false };

    function triggerShake(amp, dur) {
        shakeAmp = Math.max(shakeAmp, amp);
        shakeTimer = Math.max(shakeTimer, dur);
    }

    function spawnParticles(x, y, color, count, speed = 260) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = speed * (0.35 + Math.random() * 0.85);
            particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 50,
                size: 3 + Math.random() * 4.5,
                color,
                life: 0.24 + Math.random() * 0.3,
                maxLife: 0.55
            });
        }
    }

    function spawnComicPopup(text, x, y, color = '#fde047', scale = 1) {
        popups.push({
            text, x, y, color, scale,
            life: 0.72,
            maxLife: 0.72,
            rot: (Math.random() - 0.5) * 0.28
        });
    }

    function drawComicPopups() {
        popups.forEach((p) => {
            const prog = 1 - p.life / p.maxLife;
            const s = prog < 0.2 ? (0.5 + (prog / 0.2) * 0.8) : (1.3 - (prog - 0.2) * 0.2);
            const alpha = p.life < 0.22 ? p.life / 0.22 : 1;

            ctx.save();
            ctx.translate(p.x, p.y - prog * 28);
            ctx.rotate(p.rot);
            ctx.scale(s * p.scale, s * p.scale);
            ctx.globalAlpha = Math.max(0, alpha);

            const spikes = 12;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const r = i % 2 === 0 ? 48 : 30;
                const a = (i * Math.PI) / spikes;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#111827';
            ctx.stroke();

            ctx.font = 'bold 30px Bangers, cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#111827';
            ctx.strokeText(p.text, 0, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(p.text, 0, 1);
            ctx.restore();
        });
    }

    function spawnMaverickTank(owner, opponent) {
        sfx.sketch();
        speedLinesTimer = 0.75;
        projectiles.push({
            kind: 'tank',
            owner,
            target: opponent,
            x: owner.x + owner.facing * 88,
            y: GROUND_Y,
            facing: owner.facing,
            phase: 'sketch',
            timer: 0
        });
    }

    function spawnAleWave(owner, opponent) {
        sfx.kamehameha();
        speedLinesTimer = 0.75;
        projectiles.push({
            kind: 'wave',
            owner,
            target: opponent,
            x: owner.x + owner.facing * 58,
            originX: owner.x + owner.facing * 58,
            y: owner.y - 110,
            facing: owner.facing,
            speed: 1020,
            life: 0.95,
            hitDone: false
        });
    }

    function updateProjectiles(dt) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const pr = projectiles[i];
            if (pr.kind === 'tank') {
                pr.timer += dt;
                if (pr.phase === 'sketch') {
                    if (Math.random() < 0.65) spawnParticles(pr.x + (Math.random() - 0.5) * 60, pr.y - 25, '#fde047', 1, 90);
                    if (pr.timer >= 0.48) {
                        pr.phase = 'drive';
                        pr.timer = 0;
                        spawnComicPopup('CREATION!', pr.x, pr.y - 78, '#fde047', 0.85);
                        spawnParticles(pr.x, pr.y - 20, '#ffffff', 12, 220);
                    }
                } else if (pr.phase === 'drive') {
                    pr.x += pr.facing * 220 * dt;
                    if (pr.timer >= 0.65) {
                        pr.phase = 'fired';
                        pr.timer = 0;
                        sfx.tankFire();
                        triggerShake(6, 0.18);
                        spawnComicPopup('BOOM!', pr.x + pr.facing * 45, pr.y - 54, '#f97316', 0.85);
                        projectiles.push({
                            kind: 'shell',
                            owner: pr.owner,
                            target: pr.target,
                            x: pr.x + pr.facing * 44,
                            y: pr.y - 34,
                            vx: pr.facing * 900,
                            life: 1.5
                        });
                    }
                } else if (pr.phase === 'fired' && pr.timer >= 0.4) {
                    projectiles.splice(i, 1);
                }
            } else if (pr.kind === 'shell') {
                pr.x += pr.vx * dt;
                pr.life -= dt;
                if (Math.random() < 0.7) spawnParticles(pr.x, pr.y, '#fb923c', 1, 80);
                const t = pr.target;
                if (Math.abs(pr.x - t.x) < 42 && t.y > GROUND_Y - 125 && t.state !== 'ko') {
                    applyHit(pr.owner, t, 34, true, 'BZZZZ-BOOM!', '#f97316');
                    sfx.boom();
                    triggerShake(13, 0.35);
                    speedLinesTimer = 0.55;
                    spawnParticles(pr.x, pr.y, '#fde047', 26, 420);
                    spawnParticles(pr.x, pr.y, '#e50914', 18, 340);
                    projectiles.splice(i, 1);
                    continue;
                }
                if (pr.life <= 0 || pr.x < -40 || pr.x > W + 40) projectiles.splice(i, 1);
            } else if (pr.kind === 'wave') {
                pr.x += pr.facing * pr.speed * dt;
                pr.life -= dt;
                if (Math.random() < 0.85) spawnParticles(pr.x, pr.y + (Math.random() - 0.5) * 32, '#7dd3fc', 2, 180);
                const t = pr.target;
                if (!pr.hitDone && t.state !== 'ko') {
                    const minX = Math.min(pr.originX, pr.x);
                    const maxX = Math.max(pr.originX, pr.x);
                    if (t.x >= minX - 28 && t.x <= maxX + 28 && Math.abs((t.y - 95) - pr.y) < 76) {
                        pr.hitDone = true;
                        applyHit(pr.owner, t, 32, true, 'CRAAACK!', '#38bdf8');
                        sfx.boom();
                        triggerShake(12, 0.34);
                        speedLinesTimer = 0.55;
                        spawnParticles(t.x, pr.y, '#38bdf8', 28, 420);
                        spawnParticles(t.x, pr.y, '#ffffff', 14, 300);
                    }
                }
                if (pr.life <= 0) projectiles.splice(i, 1);
            }
        }
    }

    function drawProjectiles() {
        projectiles.forEach((pr) => {
            if (pr.kind === 'tank') {
                ctx.save();
                ctx.translate(pr.x, pr.y);
                ctx.scale(pr.facing, 1);
                if (pr.phase === 'sketch') {
                    const prog = Math.min(1, pr.timer / 0.48);
                    ctx.strokeStyle = '#fde047';
                    ctx.shadowColor = '#f97316';
                    ctx.shadowBlur = 12;
                    ctx.lineWidth = 3;
                    ctx.setLineDash([7, 5]);
                    ctx.strokeRect(-34, -22, 68 * prog, 18);
                    if (prog > 0.35) ctx.strokeRect(-22, -40, 40 * Math.min(1, (prog - 0.35) / 0.65), 18);
                } else {
                    ctx.globalAlpha = pr.phase === 'fired' ? Math.max(0, 1 - pr.timer / 0.4) : 1;
                    ctx.fillStyle = '#1e293b';
                    ctx.strokeStyle = '#111827';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.roundRect(-36, -20, 72, 18, 9);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#e50914';
                    ctx.beginPath();
                    ctx.roundRect(-28, -36, 56, 18, 4);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#b91c1c';
                    ctx.beginPath();
                    ctx.roundRect(-18, -50, 34, 16, 5);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fillRect(15, -45, 30, 7);
                    ctx.strokeRect(15, -45, 30, 7);
                }
                ctx.restore();
            } else if (pr.kind === 'shell') {
                ctx.save();
                ctx.translate(pr.x, pr.y);
                ctx.fillStyle = '#fde047';
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(0, 0, 17, 9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (pr.kind === 'wave') {
                const len = Math.abs(pr.x - pr.originX);
                const fade = Math.min(1, pr.life / 0.3);
                ctx.save();
                ctx.globalAlpha = fade;
                const minX = Math.min(pr.originX, pr.x);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
                ctx.fillRect(minX, pr.y - 24, len, 48);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(minX, pr.y - 11, len, 22);
                ctx.fillStyle = '#38bdf8';
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(pr.x, pr.y, 35, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(pr.x, pr.y, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 8. Combattimento Semplificato, Combo Fluide & IA Bilanciata
    // ----------------------------------------------------------------------
    function applyHit(attacker, defender, baseDmg, isSuper, popupText, popupColor) {
        const isBlocked = defender.state === 'block';
        const actualDmg = isBlocked ? Math.max(2, Math.round(baseDmg * 0.25)) : baseDmg;
        defender.hp = Math.max(0, defender.hp - actualDmg);

        if (!isSuper) attacker.superCharge = Math.min(100, attacker.superCharge + baseDmg * 1.9);
        defender.superCharge = Math.min(100, defender.superCharge + actualDmg * 1.5);

        const dir = defender.x >= attacker.x ? 1 : -1;
        if (isBlocked) {
            sfx.block();
            defender.blockFlash = 0.16;
            defender.vx = dir * 115;
            spawnParticles(defender.x - dir * 18, defender.y - 72, '#7dd3fc', 8, 190);
            spawnComicPopup('PARATA!', defender.x, defender.y - 138, '#38bdf8', 0.8);
        } else {
            defender.flashTimer = 0.16;
            defender.vx = dir * (isSuper ? 350 : 185);
            if (isSuper) defender.vy = -250;

            if (defender.hp <= 0) {
                defender.state = 'ko';
                defender.stateTimer = 0;
                sfx.ko();
                triggerShake(13, 0.42);
                speedLinesTimer = 0.6;
                spawnComicPopup('K.O.!', defender.x, defender.y - 125, '#e50914', 1.3);
            } else {
                defender.state = 'hit';
                defender.stateTimer = isSuper ? 0.40 : 0.20;
                spawnComicPopup(popupText, (attacker.x + defender.x) / 2, defender.y - 110, popupColor, isSuper ? 1.15 : 0.95);
            }
            spawnParticles(defender.x, defender.y - 72, attacker.spec.colorLight, isSuper ? 22 : 12, 290);
        }
    }

    const keys = {};
    const uiInput = { left: false, right: false, up: false, down: false, punch: false, kick: false, super: false };
    let prevP1Attack = { punch: false, kick: false, super: false };

    function getP1Input() {
        const left = !!(keys.ArrowLeft || keys.KeyA || uiInput.left);
        const right = !!(keys.ArrowRight || keys.KeyD || uiInput.right);
        const up = !!(keys.ArrowUp || keys.KeyW || keys.Space || uiInput.up);
        const down = !!(keys.ArrowDown || keys.KeyS || uiInput.down);

        const punchNow = !!(keys.KeyJ || keys.KeyZ || uiInput.punch);
        const kickNow = !!(keys.KeyK || keys.KeyX || uiInput.kick);
        const superNow = !!(keys.KeyL || keys.KeyC || keys.Enter || uiInput.super);

        const punch = punchNow && !prevP1Attack.punch;
        const kick = kickNow && !prevP1Attack.kick;
        const superMove = superNow && !prevP1Attack.super;

        prevP1Attack.punch = punchNow;
        prevP1Attack.kick = kickNow;
        prevP1Attack.super = superNow;

        // Parata semplice con GIU (S / ↓) oppure tenendo indietro mentre l'avversario sta colpendo
        const oppThreat = ['punch', 'kick', 'superCast'].includes(p2.state) || projectiles.some(pr => pr.owner === p2);
        const holdingBack = (p1.facing === 1 && left) || (p1.facing === -1 && right);
        const block = (down || (holdingBack && oppThreat)) && p1.y >= GROUND_Y - 1;

        return { left, right, up, block, punch, kick, super: superMove };
    }

    function updateCpuAI(dt) {
        const cfg = DIFFICULTY_CFG[selectedDiff] || DIFFICULTY_CFG.facile;
        aiThinkTimer -= dt;
        const dist = Math.abs(p2.x - p1.x);
        const oppAttacking = ['punch', 'kick', 'superCast'].includes(p1.state) || projectiles.some(pr => pr.owner === p1);

        if (aiThinkTimer <= 0) {
            aiThinkTimer = cfg.reactDelay * (0.8 + Math.random() * 0.4);
            aiDecision = { left: false, right: false, up: false, block: false, punch: false, kick: false, super: false };

            if (oppAttacking && dist < 175 && Math.random() < cfg.blockChance) {
                aiDecision.block = true;
            } else if (p2.superCharge >= 100 && dist < 560 && Math.random() < cfg.superChance) {
                aiDecision.super = true;
            } else if (dist > 110) {
                if (Math.random() < cfg.aggro + 0.18) {
                    if (p1.x < p2.x) aiDecision.left = true;
                    else aiDecision.right = true;
                }
                if (Math.random() < 0.09 && p2.y >= GROUND_Y - 1) aiDecision.up = true;
            } else {
                const r = Math.random();
                if (r < 0.44 * cfg.aggro + 0.12) aiDecision.punch = true;
                else if (r < 0.78 * cfg.aggro + 0.18) aiDecision.kick = true;
                else if (r < 0.88) aiDecision.block = true;
                else {
                    if (p1.x < p2.x) aiDecision.right = true;
                    else aiDecision.left = true;
                }
            }
        }

        const out = { ...aiDecision };
        aiDecision.punch = false;
        aiDecision.kick = false;
        aiDecision.super = false;
        return out;
    }

    function updateFighter(f, opp, input, dt) {
        f.animTime += dt;
        if (f.flashTimer > 0) f.flashTimer = Math.max(0, f.flashTimer - dt);
        if (f.blockFlash > 0) f.blockFlash = Math.max(0, f.blockFlash - dt);
        if (f.trailHp > f.hp) f.trailHp = Math.max(f.hp, f.trailHp - 42 * dt);

        // Ricarica passiva leggera della Super così tutti riescono a provarla facilmente
        if (matchState === 'FIGHT' && f.superCharge < 100) {
            f.superCharge = Math.min(100, f.superCharge + 4.5 * dt);
        }

        if (['idle', 'walk', 'block', 'jump'].includes(f.state) && Math.abs(opp.x - f.x) > 8) {
            f.facing = opp.x >= f.x ? 1 : -1;
        }

        if (f.state === 'ko' || f.state === 'victory') {
            f.vx *= Math.pow(0.05, dt);
            f.vy += GRAVITY * dt;
            f.x += f.vx * dt;
            f.y = Math.min(GROUND_Y, f.y + f.vy * dt);
            if (f.y >= GROUND_Y) f.vy = 0;
            f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x));
            return;
        }

        if (f.state === 'hit') {
            f.stateTimer -= dt;
            f.vx *= Math.pow(0.04, dt);
            f.vy += GRAVITY * dt;
            f.x += f.vx * dt;
            f.y = Math.min(GROUND_Y, f.y + f.vy * dt);
            if (f.y >= GROUND_Y) f.vy = 0;
            f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x));
            if (f.stateTimer <= 0 && f.y >= GROUND_Y - 1) f.state = 'idle';
            return;
        }

        if (f.state === 'punch' || f.state === 'kick') {
            f.stateTimer += dt;
            const dur = f.state === 'punch' ? f.spec.punchDur : f.spec.kickDur;
            const range = f.state === 'punch' ? f.spec.punchRange : f.spec.kickRange;
            const dmg = f.state === 'punch' ? f.spec.punchDamage : f.spec.kickDamage;

            if (!f.hitRegistered && f.stateTimer >= dur * 0.3) {
                f.hitRegistered = true;
                const dx = (opp.x - f.x) * f.facing;
                const dy = Math.abs(opp.y - f.y);
                if (dx > -20 && dx <= range && dy < 105 && opp.state !== 'ko') {
                    if (f.state === 'punch') {
                        sfx.punch();
                        triggerShake(4, 0.12);
                        applyHit(f, opp, dmg, false, 'BAM!', '#fde047');
                    } else {
                        sfx.kick();
                        triggerShake(6, 0.16);
                        speedLinesTimer = 0.25;
                        applyHit(f, opp, dmg, false, 'SWOOSH!', f.spec.colorLight);
                    }
                }
            }

            f.vx *= Math.pow(0.02, dt);
            f.vy += GRAVITY * dt;
            f.x += f.vx * dt;
            f.y = Math.min(GROUND_Y, f.y + f.vy * dt);
            if (f.y >= GROUND_Y) f.vy = 0;

            if (f.stateTimer >= dur) {
                f.state = f.y < GROUND_Y - 1 ? 'jump' : 'idle';
                f.stateTimer = 0;
            }
            f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x));
            return;
        }

        if (f.state === 'superCast') {
            f.stateTimer += dt;
            f.vx = 0;
            if (!f.superReleased && f.stateTimer >= 0.3) {
                f.superReleased = true;
                if (f.spec.id === 'maverick') spawnMaverickTank(f, opp);
                else spawnAleWave(f, opp);
            }
            if (f.stateTimer >= 0.6) {
                f.state = 'idle';
                f.stateTimer = 0;
            }
            return;
        }

        if (matchState === 'FIGHT') {
            if (input.super && f.superCharge >= 100 && f.y >= GROUND_Y - 1) {
                f.superCharge = 0;
                f.state = 'superCast';
                f.stateTimer = 0;
                f.superReleased = false;
                superBannerTimer = 0.85;
                superBannerName = f.spec.superName;
                superBannerColor = f.spec.color;
                triggerShake(5, 0.2);
                return;
            }

            if (input.punch) {
                f.state = 'punch';
                f.stateTimer = 0;
                f.hitRegistered = false;
                f.vx = f.facing * 95; // Piccolo passo in avanti per colpire più facilmente
                sfx.swing();
                return;
            }

            if (input.kick) {
                f.state = 'kick';
                f.stateTimer = 0;
                f.hitRegistered = false;
                f.vx = f.facing * 125;
                sfx.swing();
                return;
            }

            if (input.up && f.y >= GROUND_Y - 1) {
                f.vy = f.spec.jumpVel;
                f.y -= 2;
                f.state = 'jump';
                sfx.jump();
                spawnParticles(f.x, GROUND_Y, '#cbd5e1', 6, 120);
            }

            if (input.block) {
                f.state = 'block';
                f.vx = 0;
            } else {
                const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
                f.vx = moveDir * f.spec.speed;
                f.state = f.y >= GROUND_Y - 1 ? (moveDir !== 0 ? 'walk' : 'idle') : 'jump';
            }
        } else {
            f.vx = 0;
            if (f.y >= GROUND_Y - 1) f.state = 'idle';
        }

        f.vy += GRAVITY * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y >= GROUND_Y) {
            if (f.vy > 300) spawnParticles(f.x, GROUND_Y, '#cbd5e1', 5, 110);
            f.y = GROUND_Y;
            f.vy = 0;
            if (f.state === 'jump') f.state = 'idle';
        }
        f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x));
    }

    function resolveBodyPush() {
        const minSep = 54;
        const dx = p2.x - p1.x;
        if (Math.abs(dx) < minSep && Math.abs(p1.y - p2.y) < 85 && p1.state !== 'ko' && p2.state !== 'ko') {
            const push = (minSep - Math.abs(dx)) / 2;
            const sign = dx >= 0 ? 1 : -1;
            p1.x = Math.max(STAGE_LEFT, p1.x - sign * push);
            p2.x = Math.min(STAGE_RIGHT, p2.x + sign * push);
        }
    }

    // ----------------------------------------------------------------------
    // 9. HUD Stile Vignetta Manga (Didascalia gialla + Barre con contorno nero)
    // ----------------------------------------------------------------------
    function drawHUD() {
        const barW = 365;
        const barH = 26;
        const topY = 26;

        drawHealthAndSuper(p1, 36, topY, barW, barH, false, 'TU', p1Wins);
        drawHealthAndSuper(p2, W - 36 - barW, topY, barW, barH, true, 'CPU', p2Wins);

        // Box Timer Centrale stile Fumetto
        ctx.save();
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(W / 2 - 46, 16, 92, 58, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = '900 10px Orbitron, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.fillText(`ROUND ${round}`, W / 2, 30);

        ctx.font = '900 30px Orbitron, monospace';
        ctx.fillStyle = timer <= 15 ? '#e50914' : '#111827';
        ctx.fillText(String(Math.ceil(timer)).padStart(2, '0'), W / 2, 59);
        ctx.restore();

        // Didascalia gialla stile Tavola 1 durante l'intro del round
        if (matchState === 'INTRO') {
            ctx.save();
            ctx.fillStyle = '#fef08a';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 3;
            ctx.fillRect(24, 96, 260, 44);
            ctx.strokeRect(24, 96, 260, 44);
            ctx.font = 'bold 14px Comic Neue, Inter, sans-serif';
            ctx.fillStyle = '#111827';
            ctx.fillText('Arbizzano City. Sfida davanti al Bunker!', 36, 123);
            ctx.restore();
        }

        // Cut-in Banner Attivazione Super
        if (superBannerTimer > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(17, 24, 39, 0.86)';
            ctx.fillRect(0, H / 2 - 42, W, 84);
            ctx.fillStyle = superBannerColor;
            ctx.fillRect(0, H / 2 - 42, W, 5);
            ctx.fillRect(0, H / 2 + 37, W, 5);
            ctx.font = 'bold 44px Bangers, cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(superBannerName, W / 2, H / 2 + 2);
            ctx.fillStyle = '#fde047';
            ctx.fillText(superBannerName, W / 2, H / 2 + 2);
            ctx.restore();
        }

        if (bannerText) {
            ctx.save();
            ctx.font = 'bold 78px Bangers, cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 9;
            ctx.strokeStyle = '#111827';
            ctx.strokeText(bannerText, W / 2, H / 2 - 22);
            ctx.fillStyle = '#fde047';
            ctx.fillText(bannerText, W / 2, H / 2 - 22);

            if (bannerSub) {
                ctx.font = 'bold 20px Orbitron, sans-serif';
                ctx.lineWidth = 5;
                ctx.strokeText(bannerSub, W / 2, H / 2 + 34);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(bannerSub, W / 2, H / 2 + 34);
            }
            ctx.restore();
        }
    }

    function drawHealthAndSuper(f, x, y, w, h, mirrored, tag, wins) {
        const spec = f.spec;
        const hpRatio = Math.max(0, f.hp / 100);
        const trailRatio = Math.max(hpRatio, f.trailHp / 100);

        ctx.save();
        // Nome con contorno nero per leggere sempre bene sul cielo chiaro
        ctx.font = '900 15px Orbitron, sans-serif';
        ctx.textAlign = mirrored ? 'right' : 'left';
        const labelX = mirrored ? x + w : x;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#111827';
        ctx.strokeText(`${spec.name} (${tag})`, labelX, y - 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${spec.name} (${tag})`, labelX, y - 7);

        for (let i = 0; i < 2; i++) {
            const px = mirrored ? x + 12 + i * 18 : x + w - 12 - i * 18;
            ctx.beginPath();
            ctx.arc(px, y - 12, 6.5, 0, Math.PI * 2);
            ctx.fillStyle = i < wins ? '#fde047' : '#e2e8f0';
            ctx.fill();
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // Cornice HP fumetto
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.5;
        ctx.fillRect(x, y, w, h);

        const trailW = w * trailRatio;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(mirrored ? x + w - trailW : x, y + 2, trailW, h - 4);

        const fillW = w * hpRatio;
        ctx.fillStyle = f.hp <= 25 && Math.floor(performance.now() / 160) % 2 === 0 ? '#ffffff' : spec.color;
        ctx.fillRect(mirrored ? x + w - fillW : x, y + 2, fillW, h - 4);
        ctx.strokeRect(x, y, w, h);

        ctx.font = '900 12px Orbitron, monospace';
        ctx.textAlign = mirrored ? 'left' : 'right';
        ctx.lineWidth = 3;
        ctx.strokeText(`${Math.ceil(f.hp)}%`, mirrored ? x + 8 : x + w - 8, y + 17);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${Math.ceil(f.hp)}%`, mirrored ? x + 8 : x + w - 8, y + 17);

        // Barra SUPER
        const superY = y + h + 6;
        const superW = w * 0.72;
        const superX = mirrored ? x + w - superW : x;
        const superRatio = Math.min(1, f.superCharge / 100);
        const ready = f.superCharge >= 100;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(superX, superY, superW, 13);
        const sFillW = superW * superRatio;
        ctx.fillStyle = ready
            ? (Math.floor(performance.now() / 130) % 2 === 0 ? '#fde047' : '#f97316')
            : '#38bdf8';
        ctx.fillRect(mirrored ? superX + superW - sFillW : superX, superY + 1, sFillW, 11);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(superX, superY, superW, 13);

        ctx.font = '900 10px Orbitron, sans-serif';
        ctx.textAlign = mirrored ? 'right' : 'left';
        const superLabel = ready ? 'SUPER PRONTA! [L / C]' : `SUPER ${Math.floor(f.superCharge)}%`;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#111827';
        ctx.strokeText(superLabel, mirrored ? superX + superW : superX, superY + 25);
        ctx.fillStyle = ready ? '#fde047' : '#ffffff';
        ctx.fillText(superLabel, mirrored ? superX + superW : superX, superY + 25);

        ctx.restore();
    }

    // ----------------------------------------------------------------------
    // 10. Ciclo di Gioco, Round & Fine Match
    // ----------------------------------------------------------------------
    function setupRound() {
        const cpuId = selectedP1 === 'maverick' ? 'ale' : 'maverick';
        const keepSuper1 = p1 ? p1.superCharge : 25;
        const keepSuper2 = p2 ? p2.superCharge : 25;

        p1 = createFighter(selectedP1, 260, 1);
        p2 = createFighter(cpuId, W - 260, -1);
        p1.superCharge = keepSuper1;
        p2.superCharge = keepSuper2;

        projectiles = [];
        particles = [];
        popups = [];
        timer = ROUND_TIME;
        matchState = 'INTRO';
        introTimer = 1.45;
        bannerText = `ROUND ${round}`;
        bannerSub = 'PREPARATI!';
    }

    function startMatch() {
        initAudio();
        round = 1;
        p1Wins = 0;
        p2Wins = 0;
        p1 = null;
        p2 = null;
        selectScreen.classList.add('hidden');
        arenaStage.classList.remove('hidden');
        pauseScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        syncTouchVisibility();
        setupRound();

        if (animId) cancelAnimationFrame(animId);
        lastTime = performance.now();
        animId = requestAnimationFrame(loop);
    }

    function endRound(reason) {
        matchState = 'ROUND_END';
        roundEndTimer = 1.9;
        if (p1.hp > p2.hp) {
            p1Wins++;
            p1.state = 'victory';
            bannerText = reason === 'TIME' ? 'TEMPO SCADUTO!' : 'K.O.!';
            bannerSub = `${p1.spec.name} VINCE IL ROUND ${round}`;
        } else if (p2.hp > p1.hp) {
            p2Wins++;
            p2.state = 'victory';
            bannerText = reason === 'TIME' ? 'TEMPO SCADUTO!' : 'K.O.!';
            bannerSub = `${p2.spec.name} VINCE IL ROUND ${round}`;
        } else {
            bannerText = 'PARITÀ!';
            bannerSub = 'DOPPIO K.O.';
        }
    }

    function showMatchResult() {
        matchState = 'MATCH_OVER';
        bannerText = '';
        bannerSub = '';
        const playerWon = p1Wins >= 2 || p1Wins > p2Wins;
        resultKicker.textContent = playerWon ? 'K.O. — VITTORIA!' : 'SCONFITTA!';
        resultTitle.textContent = playerWon ? `${p1.spec.name} TRIONFA!` : `${p2.spec.name} VINCE!`;
        resultSub.textContent = playerWon
            ? 'Grande prova di forza davanti al Bunker di Arbizzano!'
            : 'La CPU ti ha battuto questa volta. Riprova subito!';
        resultScore.textContent = `Punteggio Round: ${p1.spec.name} ${p1Wins} - ${p2Wins} ${p2.spec.name}`;
        resultScreen.classList.remove('hidden');
    }

    function syncControlHighlights() {
        if (!p1) return;
        const ready = p1.superCharge >= 100;
        if (touchSuperBtn) touchSuperBtn.classList.toggle('ready', ready);
        if (deckSuperBtn) deckSuperBtn.classList.toggle('ready', ready);
    }

    function loop(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        if (matchState !== 'PAUSED' && matchState !== 'MATCH_OVER') {
            if (superBannerTimer > 0) superBannerTimer = Math.max(0, superBannerTimer - dt);
            if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt);
            if (speedLinesTimer > 0) speedLinesTimer = Math.max(0, speedLinesTimer - dt);

            if (matchState === 'INTRO') {
                introTimer -= dt;
                if (introTimer <= 0.5 && bannerText !== 'FIGHT!') {
                    bannerText = 'FIGHT!';
                    bannerSub = '';
                    sfx.fight();
                }
                if (introTimer <= 0) {
                    bannerText = '';
                    bannerSub = '';
                    matchState = 'FIGHT';
                }
            } else if (matchState === 'FIGHT') {
                timer = Math.max(0, timer - dt);
                const p1In = getP1Input();
                const p2In = updateCpuAI(dt);
                updateFighter(p1, p2, p1In, dt);
                updateFighter(p2, p1, p2In, dt);
                resolveBodyPush();
                updateProjectiles(dt);

                if (p1.hp <= 0 || p2.hp <= 0) endRound('KO');
                else if (timer <= 0) endRound('TIME');
            } else if (matchState === 'ROUND_END') {
                roundEndTimer -= dt;
                updateFighter(p1, p2, {}, dt);
                updateFighter(p2, p1, {}, dt);
                updateProjectiles(dt);
                if (roundEndTimer <= 0) {
                    if (p1Wins >= 2 || p2Wins >= 2) showMatchResult();
                    else {
                        round++;
                        setupRound();
                    }
                }
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const pt = particles[i];
                pt.x += pt.vx * dt;
                pt.y += pt.vy * dt;
                pt.vy += 460 * dt;
                pt.life -= dt;
                if (pt.life <= 0) particles.splice(i, 1);
            }
            for (let i = popups.length - 1; i >= 0; i--) {
                popups[i].life -= dt;
                if (popups[i].life <= 0) popups.splice(i, 1);
            }
            syncControlHighlights();
        }

        ctx.save();
        if (shakeTimer > 0) {
            ctx.translate((Math.random() - 0.5) * shakeAmp * 2, (Math.random() - 0.5) * shakeAmp * 2);
        }

        drawArbizzanoMangaBg(now / 1000);

        [p1, p2].forEach((f) => {
            if (!f) return;
            const distFromGround = Math.max(0, GROUND_Y - f.y);
            const r = Math.max(18, 44 - distFromGround * 0.14);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
            ctx.beginPath();
            ctx.ellipse(f.x, GROUND_Y + 4, r, 9, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        if (p1) drawComicFighter(ctx, p1);
        if (p2) drawComicFighter(ctx, p2);
        drawProjectiles();

        particles.forEach((pt) => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        drawMangaSpeedLines(speedLinesTimer);
        drawComicPopups();
        if (p1 && p2) drawHUD();
        ctx.restore();

        animId = requestAnimationFrame(loop);
    }

    // ----------------------------------------------------------------------
    // 11. Event Listeners (Selezione, Controlli Diretti Mouse/Touch/Tastiera)
    // ----------------------------------------------------------------------
    fighterCards.forEach((card) => {
        card.addEventListener('click', () => {
            initAudio();
            sfx.select();
            selectedP1 = card.dataset.fighter;
            fighterCards.forEach((c) => {
                const isSel = c.dataset.fighter === selectedP1;
                c.classList.toggle('selected', isSel);
                c.querySelector('.card-tag').textContent = isSel ? 'TU — P1' : 'CPU';
            });
        });
    });

    diffBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            initAudio();
            sfx.select();
            selectedDiff = btn.dataset.level;
            diffBtns.forEach((b) => b.classList.toggle('active', b === btn));
        });
    });

    btnStart.addEventListener('click', startMatch);
    btnStartQuick.addEventListener('click', startMatch);

    function togglePause() {
        if (matchState === 'PAUSED') {
            matchState = 'FIGHT';
            pauseScreen.classList.add('hidden');
        } else if (matchState === 'FIGHT' || matchState === 'INTRO') {
            matchState = 'PAUSED';
            pauseScreen.classList.remove('hidden');
        }
    }

    btnPause.addEventListener('click', togglePause);

    document.querySelectorAll('.overlay [data-action]').forEach((el) => {
        el.addEventListener('click', () => {
            const act = el.dataset.action;
            if (act === 'resume') togglePause();
            else if (act === 'restart') startMatch();
            else if (act === 'select') {
                if (animId) cancelAnimationFrame(animId);
                matchState = 'IDLE';
                arenaStage.classList.add('hidden');
                selectScreen.classList.remove('hidden');
                pauseScreen.classList.add('hidden');
                resultScreen.classList.add('hidden');
                syncTouchVisibility();
            }
        });
    });

    btnMute.addEventListener('click', () => {
        initAudio();
        isMuted = !isMuted;
        localStorage.setItem('valpo_arena_muted', String(isMuted));
        syncMuteBtn();
    });

    btnTouch.addEventListener('click', () => {
        touchEnabled = !touchEnabled;
        syncTouchVisibility();
    });

    btnFullscreen.addEventListener('click', () => {
        const target = arenaStage.classList.contains('hidden') ? document.documentElement : gameWrap;
        if (!document.fullscreenElement) target.requestFullscreen?.().catch(() => {});
        else document.exitFullscreen?.().catch(() => {});
    });

    // Tastiera
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !arenaStage.classList.contains('hidden')) {
            e.preventDefault();
        }
        initAudio();
        keys[e.code] = true;
        if ((e.code === 'KeyP' || e.code === 'Escape') && !arenaStage.classList.contains('hidden')) {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Collega sia i tasti touch overlay (.touch-controls) sia la barra sotto l'arena (.arcade-deck)
    function bindVirtualHoldButton(btn, keyName) {
        const down = (e) => {
            e.preventDefault();
            initAudio();
            uiInput[keyName] = true;
            btn.classList.add('active');
        };
        const up = (e) => {
            e.preventDefault();
            uiInput[keyName] = false;
            btn.classList.remove('active');
        };
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointercancel', up);
        btn.addEventListener('pointerleave', up);
    }

    document.querySelectorAll('[data-input]').forEach((btn) => bindVirtualHoldButton(btn, btn.dataset.input));
    document.querySelectorAll('.action-pad [data-action], .arcade-deck [data-action]').forEach((btn) => bindVirtualHoldButton(btn, btn.dataset.action));

    drawPortraits();
    window.addEventListener('load', drawPortraits);
})();
