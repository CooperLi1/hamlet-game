export default class DialogueSystem {
    constructor(game) {
        this.game = game;
        this.queue = [];
        this.isShowing = false;

        // UI Elements
        this.box = this.game.ui.dialogueBox;
        this.textElement = document.getElementById('dialogue-text');
        this.nextBtn = document.getElementById('dialogue-next');

        this.nextBtn.addEventListener('click', () => this.next());
    }

    startIntro() {
        this.box.classList.remove('hidden');
        this.game.ui.actionMenu.classList.add('hidden');

        this.queue = [
            { speaker: "Osric", text: "The King and Queen and all are coming down." },
            { speaker: "King Claudius", text: "Come, Hamlet, come, and take this hand from me." },
            { speaker: "Laertes", text: "I am satisfied in nature, whose motive, in this case, should stir me most to my revenge." },
            { speaker: "Hamlet", text: "I embrace it freely; and will this brother's wager frankly play." },
            { speaker: "King Claudius", text: "Give them the foils, young Osric." }
        ];

        this.next();
    }

    triggerCombatDialogue() {
        const lines = [
            { speaker: "Hamlet", text: "Come on, sir." },
            { speaker: "Laertes", text: "Come, my lord." },
            { speaker: "Hamlet", text: "One." },
            { speaker: "Laertes", text: "No." },
            { speaker: "Hamlet", text: "Judgment." },
            { speaker: "Osric", text: "A hit, a very palpable hit." },
            { speaker: "Hamlet", text: "Another hit; what say you?" },
            { speaker: "Laertes", text: "A touch, a touch, I do confess." }
        ];

        // Pick a random line or sequence for now
        const line = lines[Math.floor(Math.random() * lines.length)];
        this.showDialogue(line.speaker, line.text);
    }

    showDialogue(speaker, text) {
        this.queue.push({ speaker, text });
        if (!this.isShowing) {
            this.next();
        }
    }

    showSystemMessage(text) {
        return new Promise(resolve => {
            this.box.classList.remove('hidden');
            this.textElement.innerHTML = `<em>${text}</em>`;
            this.nextBtn.classList.remove('hidden');
            this.isShowing = true;

            // One-time listener for resume
            const resume = () => {
                this.nextBtn.removeEventListener('click', resume);
                resolve();
            };
            this.nextBtn.addEventListener('click', resume);
        });
    }

    showChoice(options) {
        this.box.classList.remove('hidden');
        this.textElement.innerHTML = '';
        this.nextBtn.classList.add('hidden'); // Hide "Continue" button

        const choiceContainer = document.createElement('div');
        choiceContainer.className = 'choice-container';
        choiceContainer.style.display = 'flex';
        choiceContainer.style.gap = '10px';
        choiceContainer.style.justifyContent = 'center';
        choiceContainer.style.marginTop = '15px';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt.text;
            btn.className = 'action-btn'; // Reuse style
            btn.style.fontSize = '0.9em';
            btn.style.padding = '10px';
            btn.onclick = () => {
                choiceContainer.remove();
                opt.callback();
            };
            choiceContainer.appendChild(btn);
        });

        this.textElement.appendChild(choiceContainer);
        this.isShowing = true;
    }

    next() {
        if (this.queue.length === 0) {
            this.endDialogue();
            return;
        }

        const line = this.queue.shift();
        this.isShowing = true;
        this.box.classList.remove('hidden');
        this.nextBtn.classList.remove('hidden');

        if (line.callback) {
            line.callback();
        }

        if (line.speaker) {
            this.textElement.innerHTML = `<strong>${line.speaker}:</strong><br>"${line.text}"`;
        } else {
            this.textElement.innerHTML = `<em>${line.text}</em>`;
        }
    }

    endDialogue() {
        this.isShowing = false;
        this.box.classList.add('hidden');
        this.nextBtn.classList.add('hidden');

        // Return to combat ONLY if we are finishing the Dialogue phase (intro)
        if (this.game.state === 'DIALOGUE') {
            this.game.combatSystem.startCombat();
        } else if (this.game.state === 'COMBAT') {
            // Resume combat UI
            this.game.ui.actionMenu.classList.remove('hidden');
        } else if (this.game.state === 'END') {
            this.showChoice([
                {
                    text: "Play Again",
                    callback: () => location.reload()
                }
            ]);
        }
    }
}
