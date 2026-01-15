export default class CombatSystem {
    constructor(game) {
        this.game = game;
        this.turn = 'PLAYER'; // PLAYER, ENEMY

        // Bind UI buttons
        const buttons = this.game.ui.actionMenu.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => this.playerAction(e.target.dataset.action));
        });
    }

    startCombat() {
        this.game.state = 'COMBAT';
        this.game.ui.actionMenu.classList.remove('hidden');
        this.game.ui.dialogueBox.classList.add('hidden');
        this.turn = 'PLAYER';
        this.updateButtons();
    }

    async playerAction(action) {
        if (this.turn !== 'PLAYER') return;

        this.disableButtons();
        this.playerDefending = false; // Always clear previous defense when taking new action

        switch (action) {
            case 'attack':
                await this.performAttack(this.game.player, this.game.opponent);
                break;
            case 'defend':
                this.playerDefending = true;
                this.performDefend(this.game.player);
                break;
            case 'speak':
                this.performSpeak();
                return; // Speak interrupts combat flow to show dialogue
            case 'kill-king':
                // Hesitation mechanic
                this.triggerHesitation();
                return;
        }

        // Check for phase transitions or endings
        if (this.checkCombatStatus()) {
            this.nextTurn();
        }
    }

    async performAttack(attacker, defender) {
        // Trigger Animation first
        await this.game.triggerAttackAnimation(attacker, defender);

        // Simple damage calculation
        let damage = Math.floor(Math.random() * 10) + 5;

        // Laertes hits harder (+1 avg)
        if (!attacker.isPlayer) {
            damage += 1;
        }

        // Apply Defend reduction
        if (defender.isPlayer && this.playerDefending) {
            damage = Math.floor(damage / 5);
        }

        defender.takeDamage(damage);

        // Defense state is cleared at the start of playerAction() and nextTurn()
        // No timeout needed here - this was causing a race condition where
        // the old timer would fire and clear a newly set defense

        // Log to dialogue temporarily
        await this.game.dialogueSystem.showSystemMessage(`${attacker.name} strikes! Deals ${damage} damage.`);

        // Update UI
        this.updateHealthUI();
    }

    performDefend(character) {
        this.game.triggerDefendAnimation(character);
        this.game.dialogueSystem.showSystemMessage(`${character.name} raises their guard.`);
    }

    performSpeak() {
        const turn = this.game.turnCount || 0;

        // Priority 0: If Queen is dead or already warned, always taunt
        if (this.warnedQueen || this.game.queen.isDead) {
            this.game.dialogueSystem.queue.push({
                speaker: "Hamlet",
                text: "I am afeard you make a wanton of me.",
                callback: () => this.nextTurn()
            });
            this.game.dialogueSystem.next();
            return;
        }

        // Priority 1: Warn Queen (available early)
        if (turn >= 2 && !this.warnedQueen) {
            this.game.dialogueSystem.showChoice([
                {
                    text: "Warn Mother about the cup",
                    callback: () => {
                        this.warnedQueen = true;
                        this.game.endingSystem.triggerEvent('WARN_QUEEN');
                    }
                },
                {
                    text: "Taunt Laertes",
                    callback: () => {
                        this.game.dialogueSystem.queue.push({
                            speaker: "Hamlet",
                            text: "Come, for the third, Laertes: you but dally.",
                            callback: () => this.nextTurn()
                        });
                        this.game.dialogueSystem.next();
                    }
                }
            ]);
            return;
        }

        // Default
        this.game.dialogueSystem.triggerCombatDialogue();
        this.nextTurn(); // If just talking, pass turn? Or maybe free action? Let's pass turn.
    }

    triggerHesitation() {
        const sequences = [
            [
                "Now might I do it pat, now he is praying...",
                "And now I'll do't. And so he goes to heaven; And so am I revenged."
            ],
            [
                "A villain kills my father; and for that, I, his sole son, do this same villain send to heaven.",
                "O, this is hire and salary, not revenge."
            ],
            [
                "The spirit that I have seen may be the devil...",
                "And the devil hath power to assume a pleasing shape."
            ],
            [
                "Thus conscience does make cowards of us all...",
                "And thus the native hue of resolution Is sicklied o'er with the pale cast of thought."
            ]
        ];

        const seq = sequences[Math.floor(Math.random() * sequences.length)];

        // Queue the sequence
        this.game.dialogueSystem.queue.push({ text: `(Hesitation) "${seq[0]}"` });
        this.game.dialogueSystem.queue.push({ text: `(Hesitation) "${seq[1]}"` });
        this.game.dialogueSystem.next();

        // Do NOT consume turn, let player try again
        this.enableButtons();
    }

    nextTurn() {
        this.game.turnCount = (this.game.turnCount || 0) + 1;
        this.turn = this.turn === 'PLAYER' ? 'ENEMY' : 'PLAYER';

        // Check for Delayed Ending
        if (this.game.turnCount > 25) {
            this.game.endingSystem.triggerEnding('DELAY_STRIKE');
            return;
        }

        // Queen's Fate: Dies on Turn 8 if not warned
        if (this.game.turnCount === 8 && !this.warnedQueen && !this.game.queen.isDead) {
            // Trigger Queen death sequence (without player input)
            this.game.endingSystem.triggerEvent('WARN_QUEEN'); // Reuse event or make new one?
            // WARN_QUEEN event implies conversation. Let's make a specific 'QUEEN_DEATH' or just reuse WARN_QUEEN but maybe change text dynamically?
            // Simplest: Just use WARN_QUEEN logic but without the choice.
            // Actually, triggerEvent('WARN_QUEEN') starts with "Mother do not drink!".
            // If she drinks naturally, it should be different.
            // Let's rely on a new event or handle it here?
            // Let's trigger a variant.
            this.game.endingSystem.triggerEvent('QUEEN_DRINKS_NATURAL');
            return;
        }

        if (this.turn === 'ENEMY') {
            setTimeout(() => this.enemyTurn(), 1000);
        } else {
            this.playerDefending = false; // Reset defense at start of player turn
            this.enableButtons();
        }
    }

    async enemyTurn() {
        // Simple AI: Always attack now
        await this.performAttack(this.game.opponent, this.game.player);

        if (this.checkCombatStatus()) {
            this.nextTurn();
        }
    }

    checkCombatStatus() {
        if (this.game.player.currentHealth <= 0) {
            this.game.endingSystem.triggerEnding('DEATH');
            return false;
        }
        if (this.game.opponent.currentHealth <= 0) {
            this.game.endingSystem.triggerEnding('CANONICAL');
            return false;
        }
        return true;
    }

    updateHealthUI() {
        // Update Hamlet
        const pPct = (this.game.player.currentHealth / this.game.player.maxHealth) * 100;
        this.game.ui.hamletHealth.style.width = `${pPct}%`;

        // Update Opponent
        const oPct = (this.game.opponent.currentHealth / this.game.opponent.maxHealth) * 100;
        this.game.ui.opponentHealth.style.width = `${oPct}%`;
    }

    disableButtons() {
        const buttons = this.game.ui.actionMenu.querySelectorAll('.action-btn');
        buttons.forEach(btn => btn.disabled = true);
    }

    enableButtons() {
        const buttons = this.game.ui.actionMenu.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            // "Kill King" is special, only enabled if conditions met (checked elsewhere)
            if (btn.dataset.action === 'kill-king') {
                btn.disabled = false; // For testing hesitation, always enable for now
            } else if (btn.dataset.action === 'speak') {
                // Speak only available after turn 3
                const turn = this.game.turnCount || 0;
                btn.disabled = turn < 3;
            } else {
                btn.disabled = false;
            }
        });

        // Toggle Spare Button - REMOVED

    }

    updateButtons() {
        this.enableButtons();
    }
}
