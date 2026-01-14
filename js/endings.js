export default class EndingSystem {
    constructor(game) {
        this.game = game;
    }

    triggerEnding(type) {
        this.game.state = 'END';
        this.game.ui.actionMenu.classList.add('hidden');
        this.game.ui.dialogueBox.classList.remove('hidden');

        let endingSequence = [];

        switch (type) {
            case 'POISON_WAIT':
            case 'CANONICAL':
                endingSequence = this.getCanonicalEnding();
                break;
            case 'SPARE_LAERTES':
                endingSequence = this.getRedemptionEnding();
                break;
            case 'DELAY_STRIKE': // Waited too long
                endingSequence = this.getDelayedEnding();
                break;
            case 'DEATH':
            default:
                endingSequence = [
                    { text: "The rest is silence." },
                    { text: "GAME OVER" }
                ];
                break;
        }

        this.game.dialogueSystem.queue = endingSequence;
        this.game.dialogueSystem.next();
    }

    triggerEvent(type) {
        // Event does NOT end the game state, just shows dialogue
        this.game.ui.actionMenu.classList.add('hidden');
        this.game.ui.dialogueBox.classList.remove('hidden');

        let sequence = [];
        if (type === 'WARN_QUEEN') {
            sequence = [
                { speaker: "Hamlet", text: "Mother, do not drink!" },
                { text: "Gertrude lowers the cup. She waits, watching the duel with concern." },
                {
                    text: "Laertes prepares to strike while you are distracted...",
                    callback: () => {
                        this.game.combatSystem.nextTurn();
                    }
                }
            ];
        }

        if (type === 'QUEEN_DRINKS_NATURAL') {
            sequence = [
                { speaker: "Queen Gertrude", text: "The Queen carouses to thy fortune, Hamlet." },
                {
                    text: "She lifts the cup to her lips...",
                    callback: () => {
                        this.game.triggerDrinkAnimation(this.game.queen);
                    }
                },
                { speaker: "King Claudius", text: "Gertrude, do not drink!" },
                { speaker: "Queen Gertrude", text: "I will, my lord; I pray you, pardon me." },
                { speaker: "Queen Gertrude", text: "The drink, the drink! I am poison'd." },
                {
                    text: "She drinks. The poison works instantly.",
                    callback: () => {
                        this.game.queen.isDead = true;
                        this.game.clearDrinkAnimation(this.game.queen);
                    }
                },
                { text: "Queen Gertrude has died." },
                {
                    text: "Laertes prepares to strike while you are distracted...",
                    callback: () => {
                        this.game.combatSystem.nextTurn();
                    }
                }
            ];
        }

        this.game.dialogueSystem.queue = sequence;
        this.game.dialogueSystem.next();
    }

    getCanonicalEnding() {
        return [
            {
                text: "Laertes falls, wounded by your hand.", callback: () => {
                    this.game.opponent.isDead = true;
                }
            },
            { speaker: "Laertes", text: "I am justly killed with mine own treachery..." },
            { speaker: "Hamlet", text: "The point!--envenom'd too! Then, venom, to thy work." },
            {
                text: "Hamlet wounds the King.", callback: () => {
                    this.game.king.isDead = true;
                }
            },
            { speaker: "Hamlet", text: "Here, thou incestuous, murderous, damned Dane, Drink off this potion. Is thy union here? Follow my mother." },
            { speaker: "Laertes", text: "Exchange forgiveness with me, noble Hamlet..." },
            {
                speaker: "Hamlet", text: "Heaven make thee free of it! I follow thee.", callback: () => {
                    this.game.player.isDead = true;
                }
            },
            { text: "The rest is silence." }
        ];
    }

    getQueenEnding() {
        return [
            { speaker: "Hamlet", text: "Mother, do not drink!" },
            { speaker: "Queen Gertrude", text: "I will, my lord; I pray you, pardon me." },
            { text: "She drinks. It is too late to save her, but she knows." },
            { speaker: "Queen Gertrude", text: "Come, let me wipe thy face." },
            { text: "ENDING 2: A MOTHER'S SACRIFICE" }
        ];
    }

    getRedemptionEnding() {
        return [
            { text: "You lower your sword, refusing to strike the killing blow." },
            { speaker: "Laertes", text: "Why do you not strike? I... I cannot do it against my conscience." },
            { speaker: "Laertes", text: "My lord, I will hit you now... And yet 'tis almost 'against my conscience." },
            { text: "Laertes drops his sword. The plot is revealed early." },
            { text: "ENDING 3: FORGIVENESS" }
        ];
    }

    getDelayedEnding() {
        return [
            { text: "You wait too long. Your hesitation consumes you." },
            {
                speaker: "Hamlet", text: "O, I die, Horatio; The potent poison quite o'er-crows my spirit.", callback: () => {
                    this.game.player.isDead = true;
                }
            },
            {
                text: "In your last breath, you finally strike at the King.", callback: () => {
                    this.game.king.isDead = true;
                }
            },
            { speaker: "Hamlet", text: "Here, thou incestuous, murderous, damned Dane, Drink off this potion. Is thy union here? Follow my mother." },
            { text: "The rest is silence." }
        ];
    }
}
