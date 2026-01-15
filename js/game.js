import Character from './characters.js?v=101';
import DialogueSystem from './dialogue.js?v=101';
import CombatSystem from './combat.js?v=101';
import EndingSystem from './endings.js?v=101';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Handle High DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.state = 'START'; // START, DIALOGUE, COMBAT, END

        // Modules
        // Elements
        this.ui = {
            startScreen: document.getElementById('start-screen'),
            startBtn: document.getElementById('start-btn'),
            dialogueBox: document.getElementById('dialogue-box'),
            actionMenu: document.getElementById('action-menu'),
            actionMenu: document.getElementById('action-menu'),
            hamletHealth: document.querySelector('#hamlet-status .health-fill'),
            hamletHealth: document.querySelector('#hamlet-status .health-fill'),
            opponentStatus: document.getElementById('opponent-status'),
            opponentName: document.querySelector('#opponent-status .name'),
            opponentHealth: document.querySelector('#opponent-status .health-fill'),
            speedSlider: document.getElementById('speed-slider')
        };

        // Modules
        this.dialogueSystem = new DialogueSystem(this);
        this.combatSystem = new CombatSystem(this);
        this.endingSystem = new EndingSystem(this);



        // Event Listeners
        this.ui.startBtn.addEventListener('click', () => this.startGame());

        // Game Loop
        this.lastTime = 0;
        this.activeAnimations = []; // Initialize activeAnimations array

        this.images = {};
        this.preloadImages().then(() => {
            requestAnimationFrame(this.gameLoop.bind(this));
        });
    }

    async preloadImages() {
        const charNames = ['Hamlet', 'Laertes', 'Claudius', 'Gertrude'];
        // Generate dead variants
        const deadNames = charNames.map(name => `dead_${name.toLowerCase()}`);
        const extras = ['boom', 'shield', 'tombstone', 'cup'];

        const allImages = [...charNames, ...deadNames, ...extras];

        const promises = allImages.map(name => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = `images/${name.toLowerCase()}.png`;
                img.onload = () => {
                    this.images[name] = img;
                    resolve();
                };
                img.onerror = () => {
                    this.images[name] = null; // Mark as missing
                    resolve();
                };
            });
        });
        await Promise.all(promises);
    }

    startGame() {
        this.state = 'DIALOGUE';
        this.ui.startScreen.classList.add('hidden');
        this.ui.opponentStatus.style.display = 'block';

        // Initialize Characters
        this.player = new Character('Hamlet', 100, true);
        this.opponent = new Character('Laertes', 80, false);
        this.king = new Character('Claudius', 60, false);
        this.queen = new Character('Gertrude', 50, false);

        // Start the scene
        this.dialogueSystem.startIntro();
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Update animations, shakes, particles
        this.activeAnimations = this.activeAnimations.filter(anim => {
            anim.elapsed += deltaTime;
            return anim.elapsed < anim.duration;
        });
    }

    draw() {
        // Clear background
        this.ctx.fillStyle = '#1a0510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Environment (Simple Throne Room)
        this.drawEnvironment();

        // Draw Characters
        if (this.state !== 'START') {
            // Determine offsets from animations
            let playerOffset = { x: 0, y: 0 };
            let opponentOffset = { x: 0, y: 0 };

            // Render Animations layers
            // Render Animations layers
            this.activeAnimations.forEach(anim => {
                if (anim.type === 'attack') {
                    // Attack Animation: Jump + Hold/Boom + Return
                    // Duration is dynamic based on anim.duration

                    const phaseDuration = anim.duration / 3;
                    const combinedDuration = phaseDuration * 2;

                    if (anim.elapsed < phaseDuration) {
                        // Phase 1: Forward Jump
                        const t = anim.elapsed / phaseDuration; // 0 to 1

                        const currentX = anim.startX + (anim.targetX - anim.startX) * t;
                        const jumpHeight = 100 * Math.sin(t * Math.PI);

                        this.applyOffset(anim.actor, currentX, jumpHeight, playerOffset, opponentOffset);

                    } else if (anim.elapsed < combinedDuration) {
                        // Phase 2: Impact/Hold
                        this.applyOffset(anim.actor, anim.targetX, 0, playerOffset, opponentOffset);
                        anim.boomShown = true;

                    } else {
                        // Phase 3: Return Jump
                        const t = (anim.elapsed - combinedDuration) / phaseDuration; // 0 to 1

                        // Move from targetX BACK to startX
                        const currentX = anim.targetX + (anim.startX - anim.targetX) * t;
                        const jumpHeight = 100 * Math.sin(t * Math.PI);

                        this.applyOffset(anim.actor, currentX, jumpHeight, playerOffset, opponentOffset);
                    }
                }
            });



            // Draw Background Characters first (behind everything)
            this.drawBackgroundCharacter(this.king, 400, 300, '#8a1c1c');
            this.drawBackgroundCharacter(this.queen, 500, 300, '#c5a059');
            this.drawDrink();

            // Determine if there is an active attack to handle layering
            const attackAnim = this.activeAnimations.find(a => a.type === 'attack');

            if (attackAnim) {
                const attacker = attackAnim.actor;

                if (attacker.isPlayer) {
                    // Hamlet matches Laertes
                    // Draw Opponent (Defender)
                    this.drawCharacter(this.opponent, 600 + opponentOffset.x, 440 + opponentOffset.y);

                    // Draw Opponent Shield? (Not implemented nicely yet, but if they had one)
                    // ...

                    // Draw Player (Attacker)
                    this.drawCharacter(this.player, 200 + playerOffset.x, 440 + playerOffset.y);

                } else {
                    // Laertes attacks Hamlet
                    // Draw Player (Defender)
                    this.drawCharacter(this.player, 200 + playerOffset.x, 440 + playerOffset.y);

                    // Draw Shield (Hamlet's) - LAYERED HERE
                    this.drawShield();

                    // Draw Opponent (Attacker)
                    this.drawCharacter(this.opponent, 600 + opponentOffset.x, 440 + opponentOffset.y);
                }

                // Draw Boom (Always Top)
                this.drawBoom();

            } else {
                // No active attack, standard layering
                this.drawCharacter(this.player, 200 + playerOffset.x, 440 + playerOffset.y);
                this.drawShield(); // Shield on top of player
                this.drawCharacter(this.opponent, 600 + opponentOffset.x, 440 + opponentOffset.y);
                this.drawBoom(); // Should be none, but safe to call
            }
        }
    }

    drawEnvironment() {
        // Floor
        this.ctx.fillStyle = '#220815';
        this.ctx.fillRect(0, 450, 800, 150);

        // Pillars
        this.ctx.fillStyle = '#0f0205';
        this.ctx.fillRect(100, 0, 50, 450);
        this.ctx.fillRect(650, 0, 50, 450);
    }

    drawCharacter(char, x, y) {
        this.ctx.save();
        this.ctx.translate(x, y);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 10, 30, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();

        let imgKey = char.name;
        if (char.isDead) imgKey = `dead_${char.name.toLowerCase()}`;

        // Lookup dead sprite, fallback to tombstone
        if (char.isDead) {
            const key = `dead_${char.name.toLowerCase()}`;
            // If we have specific dead sprite, use it. Otherwise use tombstone.
            if (this.images[key]) {
                imgKey = key;
            } else if (this.images['tombstone']) {
                imgKey = 'tombstone';
            }
        }

        if (this.images[imgKey]) {
            // Draw Sprite
            const img = this.images[imgKey];
            // Accessing original dimensions might be needed, but assuming a standard size for now
            // or scaling. Let's start with a fixed height and keep aspect ratio if possible, 
            // or just simple centering.
            // Increasing character size from 150 to 280
            const h = 280;
            const w = (img.width / img.height) * h;
            this.ctx.drawImage(img, -w / 2, -h + 10, w, h);
        } else {
            // Fallback: Simple Silhouette Style

            // Body (Triangle/Rect composite)
            this.ctx.fillStyle = char.isPlayer ? '#dcdcdc' : '#a05050'; // White for Hamlet, Red for Laertes

            // Torso
            this.ctx.fillRect(-15, -60, 30, 60);

            // Head
            this.ctx.beginPath();
            this.ctx.arc(0, -75, 15, 0, Math.PI * 2);
            this.ctx.fill();

            // Weapon (Rapier)
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(10, -30);
            this.ctx.lineTo(60, -20); // Pointing forward
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawBackgroundCharacter(char, x, y, color) {
        this.ctx.save();
        this.ctx.translate(x, y);

        let imgKey = char.name;
        if (char.isDead) {
            const key = `dead_${char.name.toLowerCase()}`;
            if (this.images[key]) {
                imgKey = key;
            } else if (this.images['tombstone']) {
                imgKey = 'tombstone';
            }
        }

        if (this.images[imgKey]) {
            const img = this.images[imgKey];
            const h = 180; // Increased from 100 for background
            const w = (img.width / img.height) * h;
            this.ctx.drawImage(img, -w / 2, -h + 10, w, h);
        } else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(-12, -50, 24, 50); // Smaller as they are in background
            this.ctx.beginPath();
            this.ctx.arc(0, -60, 12, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }
    drawBoom() {
        this.activeAnimations.forEach(anim => {
            if (anim.type === 'attack' && anim.boomShown && this.images['boom']) {
                const x = anim.targetX;
                const y = 350;
                const size = 180; // Increased from 100
                this.ctx.drawImage(this.images['boom'], x - size / 2, y - size / 2, size, size);
            }
        });
    }

    drawShield() {
        // Persist Shield if player is defending
        if (this.combatSystem.playerDefending && this.images['shield']) {
            const x = 250; // Player defend impact zone
            const size = 100; // Half as small
            this.ctx.drawImage(this.images['shield'], x - size / 2, 250, size, size); // Higher (y=250)
        }

        // Also check for temporary defend animations (e.g. opponent)
        this.activeAnimations.forEach(anim => {
            if (anim.type === 'defend' && this.images['shield']) {
                let x = 250;
                if (!anim.actor.isPlayer) x = 550;
                // Only draw if NOT player (since player is handled by persist check above, prevents double draw)
                if (!anim.actor.isPlayer) {
                    const size = 100; // Half as small
                    this.ctx.drawImage(this.images['shield'], x - size / 2, 250, size, size); // Higher (y=250)
                }
            }
        });
    }

    drawDrink() {
        this.activeAnimations.forEach(anim => {
            if (anim.type === 'drink' && this.images['cup']) {
                // Determine position based on actor.
                // Queen is at 500, 200 (Background). King 400, 200.
                let x = 500;
                let y = 150; // Near head level

                if (anim.actor.name === 'Claudius') x = 400;
                // Add gentle float or pop-up
                const offset = Math.sin(Date.now() / 200) * 5;

                const size = 35; // Reduced by 50% from 70
                this.ctx.drawImage(this.images['cup'], x - size / 2, y - size / 2 + offset, size, size);
            }
        });
    }

    // Deprecated drawFX, split into drawBoom and drawShield
    drawFX() {
        this.drawBoom();
        this.drawDrink();
        this.drawShield();
    }

    triggerAttackAnimation(attacker, defender) {
        return new Promise(resolve => {
            const startX = attacker.isPlayer ? 200 : 600;
            const targetX = attacker.isPlayer ? 550 : 250; // Stop a bit short

            const multiplier = parseFloat(this.ui.speedSlider.value) || 1;
            const totalDuration = 1500 / multiplier;

            this.activeAnimations.push({
                type: 'attack',
                actor: attacker,
                startX: startX,
                targetX: targetX,
                duration: totalDuration,
                elapsed: 0,
                boomShown: false
            });

            // Resolve after animation finishes
            setTimeout(resolve, totalDuration);
        });
    }

    // Helper to keep code clean
    applyOffset(actor, x, height, pOff, oOff) {
        if (actor.isPlayer) {
            pOff.x = x - 200;
            pOff.y = -height;
        } else {
            oOff.x = x - 600;
            oOff.y = -height;
        }
    }

    triggerDefendAnimation(actor) {
        this.activeAnimations.push({
            type: 'defend',
            actor: actor,
            duration: 1000,
            elapsed: 0
        });
    }

    clearDefendAnimations(actor) {
        this.activeAnimations = this.activeAnimations.filter(anim =>
            !(anim.type === 'defend' && anim.actor === actor)
        );
    }

    triggerDrinkAnimation(actor) {
        this.activeAnimations.push({
            type: 'drink',
            actor: actor,
            duration: 99999, // Indefinite until cleared
            elapsed: 0
        });
    }

    clearDrinkAnimation(actor) {
        this.activeAnimations = this.activeAnimations.filter(anim =>
            !(anim.type === 'drink' && anim.actor === actor)
        );
    }
}

// Start Game
window.onload = () => {
    window.game = new Game();
};
