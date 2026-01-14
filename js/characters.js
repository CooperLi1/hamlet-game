export default class Character {
    constructor(name, maxHealth, isPlayer = false) {
        this.name = name;
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.isPlayer = isPlayer;
        this.isDead = false;
        this.isPoisoned = false;
    }

    takeDamage(amount) {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        if (this.currentHealth <= 0) {
            this.isDead = true;
        }
    }

    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    poison() {
        this.isPoisoned = true;
    }
}
