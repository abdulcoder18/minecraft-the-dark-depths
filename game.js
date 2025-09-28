// Minecraft: The Dark Depths
// Game Engine and Core Logic

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Particle {
    constructor(x, y, vx, vy, life, color, size = 2) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(vx, vy);
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
    }

    update(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.y += 200 * deltaTime; // gravity
        this.life -= deltaTime;
        return this.life > 0;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x - this.size/2, this.position.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class Player {
    constructor(x, y, characterType = 'steve') {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.size = new Vector2(24, 32);
        this.color = '#4a90e2';
        this.active = true;
        this.health = 100;
        this.maxHealth = 100;
        this.onGround = false;
        this.jumpPower = 400;
        this.speed = 200;
        this.abilities = new Set(['jump', 'dash', 'spirit_sight']);
        this.facingRight = true;
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.fallDamageStrikes = 0;
        this.maxFallStrikes = 3;
        this.lastGroundY = y;
        this.fallStartY = null;
        this.characterType = characterType;
        this.setCharacterStats(characterType);
    }

    setCharacterStats(characterType) {
        switch(characterType) {
            case 'steve':
                this.speed = 200;
                this.jumpPower = 400;
                this.maxHealth = 100;
                break;
            case 'alex':
                this.speed = 220; // Slightly faster
                this.jumpPower = 380;
                this.maxHealth = 90;
                break;
            case 'creeper':
                this.speed = 160; // Slower but tougher
                this.jumpPower = 350;
                this.maxHealth = 120;
                break;
        }
        this.health = this.maxHealth;
    }

    update(deltaTime, platforms) {
        // Handle falling animation for sacrifice
        if (this.falling) {
            this.fallVelocity += 500 * deltaTime; // Accelerate downward
            this.position.y += this.fallVelocity * deltaTime;
            
            // Create falling particles
            if (Math.random() < 0.3) {
                window.game.createParticles(this.position.x + Math.random() * this.size.x, 
                                          this.position.y + Math.random() * this.size.y, 
                                          1, '#ff4444');
            }
            return; // Skip normal physics when falling
        }

        // Animation
        this.animationTimer += deltaTime;
        if (this.animationTimer > 0.2) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTimer = 0;
        }

        // Track fall start
        if (!this.onGround && this.fallStartY === null) {
            this.fallStartY = this.position.y;
        }

        // Apply gravity
        this.velocity.y += 800 * deltaTime;
        
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Check platform collisions
        this.onGround = false;
        for (const platform of platforms) {
            if (platform.active && this.checkCollision(platform)) {
                // Landing on top of platform
                if (this.velocity.y > 0 && this.position.y < platform.position.y) {
                    // Calculate fall damage
                    if (this.fallStartY !== null) {
                        const fallDistance = this.position.y - this.fallStartY;
                        if (fallDistance > 150) { // Significant fall
                            this.handleFallDamage();
                        }
                    }
                    
                    this.position.y = platform.position.y - this.size.y;
                    this.velocity.y = 0;
                    this.onGround = true;
                    this.lastGroundY = this.position.y;
                    this.fallStartY = null;
                    
                    // Crumbling platform effect
                    if (platform.type === 'crumbling') {
                        platform.stability -= deltaTime * 2;
                    }
                }
            }
        }
        
        // Horizontal drag
        this.velocity.x *= 0.85;
        
        // Keep player in bounds - handle falling into void
        if (this.position.y > 600) {
            this.handleFallDamage();
            this.position.y = this.lastGroundY;
            this.velocity.y = 0;
        }
    }

    checkCollision(other) {
        return this.position.x < other.position.x + other.size.x &&
               this.position.x + this.size.x > other.position.x &&
               this.position.y < other.position.y + other.size.y &&
               this.position.y + this.size.y > other.position.y;
    }

    jump() {
        if (this.onGround && this.abilities.has('jump')) {
            this.velocity.y = -this.jumpPower;
            this.onGround = false;
            // Play jump sound if audio manager exists
            if (window.game && window.game.audioManager) {
                window.game.audioManager.playSound('jump');
            }
        }
    }

    move(direction) {
        this.velocity.x = direction * this.speed;
        this.facingRight = direction > 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('damage');
        }
        if (this.health <= 0) {
            this.health = 0;
            return true; // Player died
        }
        return false;
    }

    handleFallDamage() {
        this.fallDamageStrikes++;
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('damage');
        }
        
        if (this.fallDamageStrikes >= this.maxFallStrikes) {
            // Player dies from fall damage
            this.health = 0;
            if (window.game) {
                window.game.showRetryPopup();
            }
        } else {
            // Show warning message
            const strikesLeft = this.maxFallStrikes - this.fallDamageStrikes;
            if (window.game) {
                window.game.showFallDamageWarning(strikesLeft);
            }
        }
    }

    sacrificeAbility(ability) {
        if (this.abilities.has(ability)) {
            this.abilities.delete(ability);
            return true;
        }
        return false;
    }

    render(ctx) {
        ctx.save();
        
        if (this.characterType === 'steve') {
            // Minecraft Steve
            // Body (blue shirt)
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(this.position.x, this.position.y + 8, this.size.x, 16);
            
            // Head (skin color)
            ctx.fillStyle = '#FDBCB4';
            ctx.fillRect(this.position.x + 4, this.position.y, 16, 16);
            
            // Hair (brown)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.position.x + 4, this.position.y, 16, 4);
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.position.x + 7, this.position.y + 6, 2, 2);
            ctx.fillRect(this.position.x + 15, this.position.y + 6, 2, 2);
            
            // Arms
            ctx.fillStyle = '#FDBCB4';
            ctx.fillRect(this.position.x - 2, this.position.y + 8, 4, 12);
            ctx.fillRect(this.position.x + 22, this.position.y + 8, 4, 12);
            
            // Legs (blue pants)
            ctx.fillStyle = '#000080';
            ctx.fillRect(this.position.x + 6, this.position.y + 24, 6, 8);
            ctx.fillRect(this.position.x + 14, this.position.y + 24, 6, 8);
        } else if (this.characterType === 'alex') {
            // Minecraft Alex
            // Body (green shirt)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.position.x, this.position.y + 8, this.size.x, 16);
            
            // Head (skin color)
            ctx.fillStyle = '#FDBCB4';
            ctx.fillRect(this.position.x + 4, this.position.y, 16, 16);
            
            // Hair (orange)
            ctx.fillStyle = '#FF8C00';
            ctx.fillRect(this.position.x + 4, this.position.y, 16, 6);
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.position.x + 7, this.position.y + 6, 2, 2);
            ctx.fillRect(this.position.x + 15, this.position.y + 6, 2, 2);
            
            // Arms (slimmer)
            ctx.fillStyle = '#FDBCB4';
            ctx.fillRect(this.position.x - 1, this.position.y + 8, 3, 12);
            ctx.fillRect(this.position.x + 22, this.position.y + 8, 3, 12);
            
            // Legs (brown pants)
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.position.x + 6, this.position.y + 24, 6, 8);
            ctx.fillRect(this.position.x + 14, this.position.y + 24, 6, 8);
        } else if (this.characterType === 'creeper') {
            // Minecraft Creeper
            // Body (green)
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.position.x, this.position.y + 8, this.size.x, 16);
            
            // Head (green)
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.position.x + 4, this.position.y, 16, 16);
            
            // Face pattern (dark green)
            ctx.fillStyle = '#008000';
            ctx.fillRect(this.position.x + 7, this.position.y + 4, 2, 8);
            ctx.fillRect(this.position.x + 15, this.position.y + 4, 2, 8);
            ctx.fillRect(this.position.x + 9, this.position.y + 8, 6, 4);
            
            // Eyes (black)
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.position.x + 8, this.position.y + 6, 1, 1);
            ctx.fillRect(this.position.x + 15, this.position.y + 6, 1, 1);
            
            // Arms
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.position.x - 2, this.position.y + 8, 4, 12);
            ctx.fillRect(this.position.x + 22, this.position.y + 8, 4, 12);
            
            // Legs
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.position.x + 6, this.position.y + 24, 6, 8);
            ctx.fillRect(this.position.x + 14, this.position.y + 24, 6, 8);
        }
        
        // Health indicator
        if (this.health < this.maxHealth || this.fallDamageStrikes > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.position.x, this.position.y - 8, this.size.x, 4);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.position.x, this.position.y - 8, (this.health / this.maxHealth) * this.size.x, 4);
            
            // Fall damage strikes indicator
            if (this.fallDamageStrikes > 0) {
                ctx.fillStyle = '#FF0000';
                ctx.font = '12px monospace';
                ctx.fillText(`Fall: ${this.fallDamageStrikes}/${this.maxFallStrikes}`, this.position.x, this.position.y - 12);
            }
        }
        
        ctx.restore();
    }
}

class Companion {
    constructor(player) {
        this.player = player;
        this.position = new Vector2(player.position.x - 40, player.position.y);
        this.health = 100;
        this.maxHealth = 100;
        this.following = true;
        this.offset = new Vector2(-40, -10);
        this.color = '#87ceeb';
        this.size = new Vector2(20, 16);
        this.glowIntensity = 1.0;
        this.weakening = false;
        this.floatOffset = 0;
        this.tailWag = 0;
    }

    update(deltaTime) {
        // Handle falling animation for sacrifice
        if (this.falling) {
            this.fallVelocity += 500 * deltaTime; // Accelerate downward
            this.position.y += this.fallVelocity * deltaTime;
            
            // Create falling particles
            if (Math.random() < 0.3) {
                window.game.createParticles(this.position.x + Math.random() * this.size.x, 
                                          this.position.y + Math.random() * this.size.y, 
                                          1, '#87ceeb');
            }
            return; // Skip normal behavior when falling
        }

        if (this.following && this.health > 0) {
            // Follow player with smooth movement
            const targetX = this.player.position.x + this.offset.x;
            const targetY = this.player.position.y + this.offset.y;
            
            this.position.x += (targetX - this.position.x) * 3 * deltaTime;
            this.position.y += (targetY - this.position.y) * 3 * deltaTime;
        }

        // Weaken over time based on world corruption
        if (this.weakening) {
            this.health -= 5 * deltaTime;
            this.glowIntensity = Math.max(0.2, this.health / this.maxHealth);
        }

        // Update tail wagging animation
        this.tailWag = Math.sin(Date.now() * 0.01) * 0.5;

        // Update UI
        const companionFill = document.getElementById('companionFill');
        if (companionFill) {
            companionFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
        }
    }

    startWeakening() {
        this.weakening = true;
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playSound('companion_weaken');
        }
    }

    render(ctx) {
        if (this.health <= 0) return;

        ctx.save();
        
        // Minecraft Wolf
        // Body
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(this.position.x, this.position.y + 8, this.size.x, 8);
        
        // Head
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(this.position.x + 2, this.position.y, 12, 8);
        
        // Ears
        ctx.fillStyle = '#AAAAAA';
        ctx.fillRect(this.position.x + 2, this.position.y, 3, 3);
        ctx.fillRect(this.position.x + 11, this.position.y, 3, 3);
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.position.x + 5, this.position.y + 2, 1, 1);
        ctx.fillRect(this.position.x + 10, this.position.y + 2, 1, 1);
        
        // Nose
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.position.x + 7, this.position.y + 4, 2, 1);
        
        // Legs
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(this.position.x + 2, this.position.y + 12, 2, 4);
        ctx.fillRect(this.position.x + 6, this.position.y + 12, 2, 4);
        ctx.fillRect(this.position.x + 10, this.position.y + 12, 2, 4);
        ctx.fillRect(this.position.x + 14, this.position.y + 12, 2, 4);
        
        // Tail (animated)
        const tailX = this.position.x + this.size.x;
        const tailY = this.position.y + 8 + this.tailWag;
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(tailX, tailY, 4, 2);
        
        // Red collar (tamed wolf indicator)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.position.x + 2, this.position.y + 6, 12, 2);
        
        ctx.restore();
    }

    sacrifice() {
        if (this.health > 0) {
            this.health = 0;
            this.following = false;
            return true;
        }
        return false;
    }
}

class GameLevel {
    constructor(name) {
        this.name = name;
        this.platforms = [];
        this.enemies = [];
        this.collectibles = [];
        this.background = '#0d0d0d';
        this.completed = false;
        this.corruption = 0;
    }

    addPlatform(x, y, width, height, type = 'normal') {
        this.platforms.push({
            position: new Vector2(x, y),
            velocity: new Vector2(0, 0),
            size: new Vector2(width, height),
            color: type === 'mystical' ? '#800080' : type === 'crumbling' ? '#8B4513' : '#555555',
            active: true,
            type,
            stability: type === 'crumbling' ? 3 : 100
        });
    }

    addEnemy(x, y, type, patrolStart, patrolEnd) {
        this.enemies.push({
            position: new Vector2(x, y),
            velocity: new Vector2(20, 0), // Slower snail speed
            size: new Vector2(16, 12),
            color: type === 'shadow' ? '#2f2f2f' : type === 'corrupted' ? '#8b0000' : '#654321',
            active: true,
            health: 50,
            damage: 15,
            type: 'snail', // All enemies are now snails
            patrolStart,
            patrolEnd,
            direction: 1,
            crawlAnimation: 0
        });
    }

    update(deltaTime, player) {
        // Update enemies
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;

            // Crawling animation for snails
            enemy.crawlAnimation += deltaTime * 2;

            // Patrol movement (slower for snails)
            enemy.position.x += enemy.velocity.x * enemy.direction * deltaTime;
            
            if (enemy.position.x <= enemy.patrolStart || enemy.position.x >= enemy.patrolEnd) {
                enemy.direction *= -1;
            }

            // Check collision with player
            if (player.checkCollision(enemy)) {
                if (player.takeDamage(enemy.damage * deltaTime)) {
                    // Player died
                }
            }
        }

        // Update platforms
        for (const platform of this.platforms) {
            if (platform.type === 'crumbling' && platform.stability <= 0) {
                platform.active = false;
            }
        }

        // Increase corruption over time
        this.corruption += deltaTime * 0.1;
    }

    render(ctx) {
        // Enhanced Minecraft-themed background
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.3, '#16213e');
        gradient.addColorStop(0.7, '#0f3460');
        gradient.addColorStop(1, '#0a2647');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Add pixelated cave texture overlay
        ctx.save();
        ctx.globalAlpha = 0.1;
        for (let x = 0; x < ctx.canvas.width; x += 32) {
            for (let y = 0; y < ctx.canvas.height; y += 32) {
                if (Math.random() < 0.3) {
                    ctx.fillStyle = '#2d2d2d';
                    ctx.fillRect(x, y, 8, 8);
                }
                if (Math.random() < 0.2) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(x + 16, y + 16, 4, 4);
                }
            }
        }
        ctx.restore();

        // Add atmospheric lighting effects
        ctx.save();
        ctx.globalAlpha = 0.05;
        const lightGradient = ctx.createRadialGradient(
            ctx.canvas.width * 0.8, ctx.canvas.height * 0.2, 0,
            ctx.canvas.width * 0.8, ctx.canvas.height * 0.2, 300
        );
        lightGradient.addColorStop(0, '#87ceeb');
        lightGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        // Render platforms
        for (const platform of this.platforms) {
            if (!platform.active) continue;
            
            ctx.fillStyle = platform.color;
            if (platform.type === 'crumbling') {
                ctx.globalAlpha = Math.max(0.3, platform.stability / 3);
            } else if (platform.type === 'mystical') {
                // Pulsing mystical platforms
                const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
                ctx.globalAlpha = pulse;
            }
            
            ctx.fillRect(platform.position.x, platform.position.y, platform.size.x, platform.size.y);
            
            // Add mystical glow
            if (platform.type === 'mystical') {
                ctx.shadowColor = platform.color;
                ctx.shadowBlur = 10;
                ctx.fillRect(platform.position.x, platform.position.y, platform.size.x, platform.size.y);
            }
            
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // Render enemies (snails)
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            
            // Snail shell
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(enemy.position.x + 2, enemy.position.y, 12, 8);
            
            // Snail body
            ctx.fillStyle = '#CDAA7D';
            const bodyOffset = Math.sin(enemy.crawlAnimation) * 1; // Crawling animation
            ctx.fillRect(enemy.position.x + bodyOffset, enemy.position.y + 6, 10, 6);
            
            // Eyes on stalks
            ctx.fillStyle = '#000000';
            ctx.fillRect(enemy.position.x + 1, enemy.position.y + 4, 1, 1);
            ctx.fillRect(enemy.position.x + 3, enemy.position.y + 4, 1, 1);
            
            // Shell spiral pattern
            ctx.fillStyle = '#654321';
            ctx.fillRect(enemy.position.x + 6, enemy.position.y + 2, 4, 4);
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = null; // Will be created after character selection
        this.companion = null; // Will be created after character selection
        this.currentLevel = 0;
        this.levels = [];
        this.particles = [];
        this.gameState = 'menu';
        this.dialogueQueue = [];
        this.currentDialogue = null;
        this.keys = new Set();
        this.lastTime = 0;
        this.camera = new Vector2(0, 0);
        this.sacrificesMade = [];
        this.gameProgress = 0;
        this.particleTimer = 0;
        this.audioManager = new AudioManager();
        this.gameStarted = false;
        this.selectedCharacter = 'steve';

        // Check if running in iframe (itch.io)
        this.isInIframe = window !== window.parent;
        
        this.setupEventListeners();
        this.setupCanvas();
        this.createLevels();
        this.setupStartScreen();
        this.createPopups();
        this.createCharacterSelection();
        this.gameLoop();
    }

    setupCanvas() {
        // Ensure canvas is properly sized for iframe
        const updateCanvasSize = () => {
            const container = document.getElementById('gameContainer');
            const containerRect = container.getBoundingClientRect();
            const maxWidth = Math.min(1024, window.innerWidth - 40);
            const maxHeight = Math.min(576, window.innerHeight - 100);
            
            if (maxWidth < 1024 || maxHeight < 576) {
                const scale = Math.min(maxWidth / 1024, maxHeight / 576);
                this.canvas.style.transform = `scale(${scale})`;
                this.canvas.style.transformOrigin = 'center center';
            }
        };
        
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
            
            if (this.gameState === 'dialogue' && (e.code === 'Space' || e.code === 'Enter')) {
                this.advanceDialogue();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // Hide loading text
        setTimeout(() => {
            const loading = document.getElementById('loadingText');
            if (loading) loading.style.display = 'none';
        }, 2000);
    }

    setupStartScreen() {
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => {
            this.showCharacterSelection();
        });
    }

    createPopups() {
        // Create fall damage warning popup
        const fallWarningPopup = document.createElement('div');
        fallWarningPopup.id = 'fallWarningPopup';
        fallWarningPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #FF0000;
            padding: 20px;
            z-index: 1000;
            display: none;
            font-family: 'Press Start 2P', monospace;
            color: #FF0000;
            text-align: center;
        `;
        document.body.appendChild(fallWarningPopup);

        // Create game over popup
        const gameOverPopup = document.createElement('div');
        gameOverPopup.id = 'gameOverPopup';
        gameOverPopup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Press Start 2P', monospace;
            color: #FFFFFF;
        `;
        gameOverPopup.innerHTML = `
            <div style="background: #333333; border: 4px solid #666666; padding: 40px; text-align: center;">
                <h2 style="color: #FF5555; margin-bottom: 20px;">GAME OVER</h2>
                <p style="margin-bottom: 30px; font-family: 'VT323', monospace; font-size: 18px;">You have fallen too many times!</p>
                <button id="retryLevelBtn" style="
                    padding: 10px 20px;
                    margin: 10px;
                    background: #666666;
                    border: 2px solid #AAAAAA;
                    color: white;
                    cursor: pointer;
                    font-family: 'VT323', monospace;
                    font-size: 16px;
                ">Retry Level</button>
                <button id="restartGameBtn" style="
                    padding: 10px 20px;
                    margin: 10px;
                    background: #666666;
                    border: 2px solid #AAAAAA;
                    color: white;
                    cursor: pointer;
                    font-family: 'VT323', monospace;
                    font-size: 16px;
                ">Restart Game</button>
            </div>
        `;
        document.body.appendChild(gameOverPopup);

        // Create health zero popup
        const healthZeroPopup = document.createElement('div');
        healthZeroPopup.id = 'healthZeroPopup';
        healthZeroPopup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Press Start 2P', monospace;
            color: #FFFFFF;
        `;
        healthZeroPopup.innerHTML = `
            <div style="background: #333333; border: 4px solid #666666; padding: 40px; text-align: center;">
                <h2 style="color: #FF5555; margin-bottom: 20px;">YOU DIED</h2>
                <p style="margin-bottom: 30px; font-family: 'VT323', monospace; font-size: 18px;">Your health reached zero!</p>
                <button id="retryLevelBtn2" style="
                    padding: 10px 20px;
                    margin: 10px;
                    background: #666666;
                    border: 2px solid #AAAAAA;
                    color: white;
                    cursor: pointer;
                    font-family: 'VT323', monospace;
                    font-size: 16px;
                ">Retry Level</button>
                <button id="restartGameBtn2" style="
                    padding: 10px 20px;
                    margin: 10px;
                    background: #666666;
                    border: 2px solid #AAAAAA;
                    color: white;
                    cursor: pointer;
                    font-family: 'VT323', monospace;
                    font-size: 16px;
                ">Restart Game</button>
            </div>
        `;
        document.body.appendChild(healthZeroPopup);

        // Add event listeners
        document.getElementById('retryLevelBtn').addEventListener('click', () => this.retryLevel());
        document.getElementById('restartGameBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('retryLevelBtn2').addEventListener('click', () => this.retryLevel());
        document.getElementById('restartGameBtn2').addEventListener('click', () => this.restartGame());
    }

    showFallDamageWarning(strikesLeft) {
        const popup = document.getElementById('fallWarningPopup');
        popup.innerHTML = `
            <h3>FALL DAMAGE!</h3>
            <p style="margin: 10px 0; font-family: 'VT323', monospace; font-size: 16px;">
                You have ${strikesLeft} ${strikesLeft === 1 ? 'chance' : 'chances'} left!
            </p>
            <p style="font-family: 'VT323', monospace; font-size: 14px;">
                Be careful when jumping!
            </p>
        `;
        popup.style.display = 'block';
        
        setTimeout(() => {
            popup.style.display = 'none';
        }, 3000);
    }

    showRetryPopup() {
        document.getElementById('gameOverPopup').style.display = 'flex';
        this.gameState = 'paused';
    }

    showHealthZeroPopup() {
        document.getElementById('healthZeroPopup').style.display = 'flex';
        this.gameState = 'paused';
    }

    retryLevel() {
        // Hide popups
        document.getElementById('gameOverPopup').style.display = 'none';
        document.getElementById('healthZeroPopup').style.display = 'none';
        
        // Reset player
        this.player.health = this.player.maxHealth;
        this.player.fallDamageStrikes = 0;
        this.player.position.x = 100;
        this.player.position.y = 400;
        this.player.velocity.x = 0;
        this.player.velocity.y = 0;
        this.player.lastGroundY = 400;
        
        // Reset companion
        this.companion.health = 100;
        this.companion.position.x = this.player.position.x - 40;
        this.companion.position.y = this.player.position.y - 10;
        
        this.gameState = 'playing';
    }

    restartGame() {
        // Hide popups
        document.getElementById('gameOverPopup').style.display = 'none';
        document.getElementById('healthZeroPopup').style.display = 'none';
        
        // Reset everything
        this.currentLevel = 0;
        this.player.health = this.player.maxHealth;
        this.player.fallDamageStrikes = 0;
        this.player.position.x = 100;
        this.player.position.y = 400;
        this.player.velocity.x = 0;
        this.player.velocity.y = 0;
        this.player.lastGroundY = 400;
        
        this.companion.health = 100;
        this.companion.position.x = this.player.position.x - 40;
        this.companion.position.y = this.player.position.y - 10;
        
        this.gameState = 'playing';
    }

    createCharacterSelection() {
        // Create character selection screen
        const charSelectionScreen = document.createElement('div');
        charSelectionScreen.id = 'characterSelection';
        charSelectionScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(26, 26, 26, 0.95));
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Press Start 2P', monospace;
            color: #FFFFFF;
        `;
        
        charSelectionScreen.innerHTML = `
            <div style="text-align: center;">
                <h2 style="color: #55FF55; margin-bottom: 30px; font-size: 24px;">SELECT YOUR CHARACTER</h2>
                <div style="display: flex; gap: 40px; margin-bottom: 40px;">
                    <div class="character-option" data-character="steve" style="
                        border: 3px solid #666666;
                        padding: 20px;
                        cursor: pointer;
                        background: rgba(255,255,255,0.1);
                        transition: all 0.3s ease;
                    ">
                        <div style="width: 64px; height: 64px; background: #4169E1; margin: 0 auto 10px; position: relative;">
                            <div style="width: 32px; height: 32px; background: #FDBCB4; position: absolute; top: 0; left: 16px;"></div>
                            <div style="width: 32px; height: 8px; background: #8B4513; position: absolute; top: 0; left: 16px;"></div>
                        </div>
                        <h3 style="color: #FFFF55; font-size: 14px; margin-bottom: 10px;">STEVE</h3>
                        <p style="font-size: 10px; font-family: 'VT323', monospace;">Balanced stats<br>Speed: Normal<br>Health: 100</p>
                    </div>
                    <div class="character-option" data-character="alex" style="
                        border: 3px solid #666666;
                        padding: 20px;
                        cursor: pointer;
                        background: rgba(255,255,255,0.1);
                        transition: all 0.3s ease;
                    ">
                        <div style="width: 64px; height: 64px; background: #228B22; margin: 0 auto 10px; position: relative;">
                            <div style="width: 32px; height: 32px; background: #FDBCB4; position: absolute; top: 0; left: 16px;"></div>
                            <div style="width: 32px; height: 12px; background: #FF8C00; position: absolute; top: 0; left: 16px;"></div>
                        </div>
                        <h3 style="color: #FFFF55; font-size: 14px; margin-bottom: 10px;">ALEX</h3>
                        <p style="font-size: 10px; font-family: 'VT323', monospace;">Fast & Agile<br>Speed: High<br>Health: 90</p>
                    </div>
                    <div class="character-option" data-character="creeper" style="
                        border: 3px solid #666666;
                        padding: 20px;
                        cursor: pointer;
                        background: rgba(255,255,255,0.1);
                        transition: all 0.3s ease;
                    ">
                        <div style="width: 64px; height: 64px; background: #00FF00; margin: 0 auto 10px; position: relative;">
                            <div style="width: 32px; height: 32px; background: #00FF00; position: absolute; top: 0; left: 16px;"></div>
                            <div style="width: 4px; height: 16px; background: #008000; position: absolute; top: 8; left: 22px;"></div>
                            <div style="width: 4px; height: 16px; background: #008000; position: absolute; top: 8; left: 38px;"></div>
                        </div>
                        <h3 style="color: #FFFF55; font-size: 14px; margin-bottom: 10px;">CREEPER</h3>
                        <p style="font-size: 10px; font-family: 'VT323', monospace;">Tank Build<br>Speed: Slow<br>Health: 120</p>
                    </div>
                </div>
                <button id="confirmCharacterBtn" style="
                    padding: 15px 30px;
                    background: #666666;
                    border: 2px solid #AAAAAA;
                    color: white;
                    cursor: pointer;
                    font-family: 'Press Start 2P', monospace;
                    font-size: 12px;
                ">START ADVENTURE</button>
            </div>
        `;
        
        document.body.appendChild(charSelectionScreen);
        
        // Add character selection event listeners
        const characterOptions = charSelectionScreen.querySelectorAll('.character-option');
        characterOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selection from all options
                characterOptions.forEach(opt => opt.style.borderColor = '#666666');
                // Highlight selected option
                option.style.borderColor = '#55FF55';
                this.selectedCharacter = option.dataset.character;
            });
            
            option.addEventListener('mouseenter', () => {
                if (option.style.borderColor !== 'rgb(85, 255, 85)') {
                    option.style.borderColor = '#AAAAAA';
                }
            });
            
            option.addEventListener('mouseleave', () => {
                if (option.style.borderColor !== 'rgb(85, 255, 85)') {
                    option.style.borderColor = '#666666';
                }
            });
        });
        
        // Default selection
        characterOptions[0].style.borderColor = '#55FF55';
        
        document.getElementById('confirmCharacterBtn').addEventListener('click', () => {
            this.startGame();
        });
    }

    showCharacterSelection() {
        const startScreen = document.getElementById('startScreen');
        const charSelection = document.getElementById('characterSelection');
        
        startScreen.style.display = 'none';
        charSelection.style.display = 'flex';
    }

    startGame() {
        // Hide character selection
        const charSelection = document.getElementById('characterSelection');
        charSelection.style.display = 'none';
        
        // Create player with selected character
        this.player = new Player(100, 400, this.selectedCharacter);
        this.companion = new Companion(this.player);
        
        this.gameStarted = true;
        this.gameState = 'intro';
        this.audioManager.startMusic();
        this.startIntroSequence();
    }

    createLevels() {
        // Level 1: Cave Entrance
        const level1 = new GameLevel("The Dark Cave Entrance");
        level1.addPlatform(0, 500, 200, 76);
        level1.addPlatform(300, 450, 150, 20);
        level1.addPlatform(500, 400, 100, 20, 'crumbling');
        level1.addPlatform(700, 350, 200, 20);
        level1.addPlatform(950, 300, 74, 276);
        level1.addEnemy(350, 430, 'snail', 300, 450);
        level1.addEnemy(750, 330, 'snail', 700, 900);
        this.levels.push(level1);

        // Level 2: Deep Caverns
        const level2 = new GameLevel("The Deep Caverns");
        level2.addPlatform(0, 500, 150, 76);
        level2.addPlatform(200, 400, 100, 20, 'crumbling');
        level2.addPlatform(350, 350, 100, 20);
        level2.addPlatform(500, 300, 150, 20, 'mystical');
        level2.addPlatform(700, 250, 100, 20, 'crumbling');
        level2.addPlatform(850, 200, 174, 376);
        level2.addEnemy(250, 380, 'snail', 200, 300);
        level2.addEnemy(550, 280, 'snail', 500, 650);
        this.levels.push(level2);

        // Level 3: The Bedrock Chamber
        const level3 = new GameLevel("The Bedrock Chamber");
        level3.addPlatform(0, 550, 100, 26);
        level3.addPlatform(150, 500, 80, 20, 'mystical');
        level3.addPlatform(280, 450, 80, 20);
        level3.addPlatform(410, 400, 80, 20, 'crumbling');
        level3.addPlatform(540, 350, 80, 20, 'mystical');
        level3.addPlatform(670, 300, 80, 20);
        level3.addPlatform(800, 250, 80, 20, 'mystical');
        level3.addPlatform(930, 200, 94, 376);
        level3.addEnemy(200, 480, 'snail', 150, 230);
        level3.addEnemy(450, 380, 'snail', 410, 490);
        level3.addEnemy(720, 280, 'snail', 670, 750);
        this.levels.push(level3);
    }

    startIntroSequence() {
        this.dialogueQueue = [
            {
                speaker: "Villager",
                text: "The caves have grown darker lately... strange creatures are emerging from the depths.",
                autoAdvance: true,
                duration: 3000
            },
            {
                speaker: "Villager", 
                text: "Legend speaks of a Diamond of Light hidden in the deepest chamber.",
                autoAdvance: true,
                duration: 3000
            },
            {
                speaker: "Villager",
                text: "Only its power can drive away the darkness that threatens our world.",
                autoAdvance: true,
                duration: 3000
            },
            {
                speaker: "Your Wolf",
                text: "*Growls and looks toward the cave entrance, sensing danger ahead*",
                autoAdvance: false
            }
        ];
        this.advanceDialogue();
    }

    showDialogue(scene) {
        this.gameState = 'dialogue';
        this.currentDialogue = scene;
        
        const dialogue = document.getElementById('dialogue');
        const dialogueText = document.getElementById('dialogueText');
        const dialogueChoices = document.getElementById('dialogueChoices');
        
        dialogue.style.display = 'block';
        dialogueText.innerHTML = `<strong>${scene.speaker}:</strong><br>${scene.text}`;
        
        dialogueChoices.innerHTML = '';
        
        if (scene.options) {
            scene.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.textContent = option.text;
                button.onclick = () => this.makeChoice(index);
                dialogueChoices.appendChild(button);
            });
        } else if (!scene.autoAdvance) {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.textContent = 'Continue (SPACE)';
            button.onclick = () => this.advanceDialogue();
            dialogueChoices.appendChild(button);
        }

        if (scene.autoAdvance && scene.duration) {
            setTimeout(() => {
                this.advanceDialogue();
            }, scene.duration);
        }
    }

    advanceDialogue() {
        const dialogue = document.getElementById('dialogue');
        dialogue.style.display = 'none';
        
        if (this.dialogueQueue.length > 0) {
            const nextScene = this.dialogueQueue.shift();
            setTimeout(() => this.showDialogue(nextScene), 500);
        } else {
            this.gameState = 'playing';
            this.currentDialogue = null;
        }
    }

    makeChoice(choiceIndex) {
        if (!this.currentDialogue || !this.currentDialogue.options) return;
        
        const choice = this.currentDialogue.options[choiceIndex];
        
        // Handle choice consequences
        if (choice.consequence === 'lose_jump') {
            this.player.sacrificeAbility('jump');
            this.sacrificesMade.push('jump');
            this.createParticles(this.player.position.x, this.player.position.y, 10, '#ff4444');
            this.audioManager.playSound('sacrifice');
        } else if (choice.consequence === 'weaken_companion') {
            this.companion.health -= 30;
            this.sacrificesMade.push('companion_health');
            this.createParticles(this.companion.position.x, this.companion.position.y, 10, '#87ceeb');
            this.audioManager.playSound('sacrifice');
        } else if (choice.consequence === 'companion_sacrifice') {
            this.audioManager.playSound('sacrifice');
            this.endGame('companion_sacrificed');
            return;
        } else if (choice.consequence === 'self_sacrifice') {
            this.audioManager.playSound('sacrifice');
            this.endGame('self_sacrificed');
            return;
        }
        
        this.advanceDialogue();
    }

    endGame(ending) {
        this.gameState = 'ending';
        this.endingType = ending;
        
        // Start falling animation based on sacrifice choice
        this.startFallingAnimation(ending);
        
        // After falling animation, show blur effect and ending sequence
        setTimeout(() => {
            this.showEndingSequence(ending);
        }, 3000); // 3 seconds for falling animation
    }

    startFallingAnimation(ending) {
        if (ending === 'companion_sacrificed') {
            // Companion falls
            this.companion.falling = true;
            this.companion.fallVelocity = 0;
            this.createParticles(this.companion.position.x, this.companion.position.y, 20, '#87ceeb');
        } else if (ending === 'self_sacrificed') {
            // Player falls
            this.player.falling = true;
            this.player.fallVelocity = 0;
            this.createParticles(this.player.position.x, this.player.position.y, 20, '#ff4444');
        }
    }

    showEndingSequence(ending) {
        // Apply screen blur effect
        this.screenBlur = 0;
        this.blurIncreasing = true;
        
        // Show "THE END" after blur reaches maximum
        setTimeout(() => {
            this.showTheEndMessage();
        }, 2000);
        
        // Show closing notes after "THE END"
        setTimeout(() => {
            this.showClosingNotes();
        }, 5000);
    }

    showTheEndMessage() {
        const theEndOverlay = document.createElement('div');
        theEndOverlay.id = 'theEndOverlay';
        theEndOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Press Start 2P', monospace;
            color: #FFFFFF;
            opacity: 0;
            transition: opacity 2s ease-in;
        `;
        
        theEndOverlay.innerHTML = `
            <h1 style="font-size: 4rem; color: #FFFFFF; text-shadow: 4px 4px 0px #000000;">
                THE END
            </h1>
        `;
        
        document.body.appendChild(theEndOverlay);
        
        // Fade in the message
        setTimeout(() => {
            theEndOverlay.style.opacity = '1';
        }, 100);
    }

    showClosingNotes() {
        const closingNotesOverlay = document.createElement('div');
        closingNotesOverlay.id = 'closingNotesOverlay';
        closingNotesOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(26, 26, 26, 0.95));
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            font-family: 'VT323', monospace;
            color: #FFFFFF;
            opacity: 0;
            transition: opacity 3s ease-in;
            padding: 40px;
            text-align: center;
        `;
        
        let endingMessage = '';
        if (this.endingType === 'companion_sacrificed') {
            endingMessage = `
                <h2 style="font-family: 'Press Start 2P', monospace; font-size: 2rem; color: #FF5555; margin-bottom: 30px; text-shadow: 2px 2px 0px #000000;">
                    A SACRIFICE REMEMBERED
                </h2>
                <p style="font-size: 1.5rem; line-height: 2; margin-bottom: 30px; max-width: 800px;">
                    Your loyal companion's light fades into the darkness, their sacrifice sealing away the evil that threatened to consume everything. 
                    Though your heart aches with the weight of loss, you know their bravery saved countless lives. 
                    You walk forward alone, but never truly alone—their spirit lives on in every ray of light that pierces the darkness.
                </p>
            `;
        } else {
            endingMessage = `
                <h2 style="font-family: 'Press Start 2P', monospace; font-size: 2rem; color: #5555FF; margin-bottom: 30px; text-shadow: 2px 2px 0px #000000;">
                    THE ULTIMATE SACRIFICE
                </h2>
                <p style="font-size: 1.5rem; line-height: 2; margin-bottom: 30px; max-width: 800px;">
                    You gave everything—your very life force—to seal the ancient evil forever. 
                    As your consciousness fades, you see your faithful companion's eyes filled with understanding and gratitude. 
                    They will carry your legacy forward, ensuring that your sacrifice was not in vain. 
                    The world is safe, and that knowledge brings peace to your final moments.
                </p>
            `;
        }
        
        closingNotesOverlay.innerHTML = `
            ${endingMessage}
            <div style="border-top: 2px solid #666; padding-top: 30px; margin-top: 30px;">
                <p style="font-size: 1.8rem; color: #FFD700; margin-bottom: 20px; font-style: italic;">
                    "With great power comes great responsibility."
                </p>
                <p style="font-size: 1.2rem; color: #CCCCCC; margin-bottom: 30px;">
                    - Spider-Man
                </p>
                <p style="font-size: 1.3rem; line-height: 1.8; max-width: 700px; color: #E8E8E8;">
                    In this journey through the dark depths, you learned that true heroism isn't about the power you wield, 
                    but about the choices you make when everything is on the line. Sometimes the greatest victories come 
                    at the greatest cost, and sometimes love means letting go.
                </p>
                <p style="font-size: 1.3rem; line-height: 1.8; max-width: 700px; color: #E8E8E8; margin-top: 20px;">
                    Thank you for playing. Your choices mattered. Your sacrifice will be remembered.
                </p>
            </div>
            <p style="font-size: 1rem; color: #888; margin-top: 40px; font-family: 'Press Start 2P', monospace;">
                Press F5 to restart your journey
            </p>
        `;
        
        document.body.appendChild(closingNotesOverlay);
        
        // Fade in the closing notes
        setTimeout(() => {
            closingNotesOverlay.style.opacity = '1';
        }, 100);
    }

    handleInput() {
        if (this.gameState !== 'playing') return;

        let moveX = 0;
        if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX = -1;
        if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX = 1;
        
        if (moveX !== 0) {
            this.player.move(moveX);
        }
        
        if (this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.keys.has('Space')) {
            this.player.jump();
        }
    }

    updateCamera() {
        // Follow player with smooth camera movement
        const targetX = this.player.position.x - this.canvas.width / 2;
        const targetY = this.player.position.y - this.canvas.height / 2;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // Keep camera within bounds
        this.camera.x = Math.max(0, Math.min(this.camera.x, 1024 - this.canvas.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, 576 - this.canvas.height));
    }

    createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 200;
            const vy = (Math.random() - 0.5) * 200;
            this.particles.push(new Particle(x, y, vx, vy, 2, color));
        }
    }

    checkLevelProgress() {
        // Check if player reached end of level
        if (this.player.position.x > 900) {
            this.currentLevel++;
            
            if (this.currentLevel >= this.levels.length) {
                this.startSacrificeSequence();
                return;
            }
            
            // Reset player position for next level
            this.player.position.x = 50;
            this.player.position.y = 400;
            this.player.velocity.x = 0;
            this.player.velocity.y = 0;
            
            // Start companion weakening in level 2
            if (this.currentLevel === 1) {
                this.companion.startWeakening();
                this.dialogueQueue.push({
                    speaker: "Your Companion",
                    text: "I... I feel the corruption taking hold. I'm growing weaker...",
                    autoAdvance: false
                });
                this.advanceDialogue();
            }
            
            // Sacrifice choice in level 3
            if (this.currentLevel === 2) {
                this.dialogueQueue.push({
                    speaker: "Mysterious Voice",
                    text: "To proceed further, you must sacrifice something precious. What will you give up?",
                    options: [
                        { text: "Sacrifice your jumping ability", consequence: "lose_jump" },
                        { text: "Sacrifice your companion's strength", consequence: "weaken_companion" }
                    ]
                });
                this.advanceDialogue();
            }
        }
    }

    startSacrificeSequence() {
        this.gameState = 'sacrifice';
        this.dialogueQueue = [
            {
                speaker: "Ancient Altar",
                text: "You have reached the heart of the temple. The final sacrifice awaits.",
                autoAdvance: false
            },
            {
                speaker: "Your Companion",
                text: "I can feel my life force fading. Perhaps... perhaps my sacrifice can save everyone.",
                autoAdvance: false
            },
            {
                speaker: "You",
                text: "The choice is yours to make. What sacrifice will seal the darkness forever?",
                options: [
                    { text: "Sacrifice your companion to save the world", consequence: "companion_sacrifice" },
                    { text: "Sacrifice yourself to preserve your companion", consequence: "self_sacrifice" }
                ]
            }
        ];
        this.advanceDialogue();
    }

    update(deltaTime) {
        // Handle ending state updates
        if (this.gameState === 'ending') {
            // Update falling animations
            if (this.player) {
                this.player.update(deltaTime, []);
            }
            if (this.companion) {
                this.companion.update(deltaTime);
            }
            
            // Update screen blur effect
            if (this.blurIncreasing && this.screenBlur !== undefined) {
                this.screenBlur += deltaTime * 2; // Increase blur over time
                if (this.screenBlur > 10) {
                    this.screenBlur = 10;
                    this.blurIncreasing = false;
                }
            }
            
            // Update particles
            this.particles = this.particles.filter(particle => particle.update(deltaTime));
            return;
        }

        if (this.gameState !== 'playing' || !this.player || !this.companion) return;

        this.handleInput();
        
        // Update player
        this.player.update(deltaTime, this.levels[this.currentLevel].platforms);
        
        // Update companion
        this.companion.update(deltaTime);
        
        // Update current level
        this.levels[this.currentLevel].update(deltaTime, this.player);
        
        // Update particles
        this.particles = this.particles.filter(particle => particle.update(deltaTime));
        
        // Create ambient particles
        this.particleTimer += deltaTime;
        if (this.particleTimer > 0.5) {
            if (Math.random() < 0.3) {
                this.createParticles(
                    Math.random() * 1024,
                    Math.random() * 100,
                    1,
                    '#87ceeb'
                );
            }
            this.particleTimer = 0;
        }
        
        // Update camera
        this.updateCamera();
        
        // Update UI
        const healthFill = document.getElementById('healthFill');
        if (healthFill) {
            healthFill.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        }
        
        // Check if player died from health reaching zero
        if (this.player.health <= 0 && this.gameState === 'playing') {
            this.showHealthZeroPopup();
        }
        
        // Check level progress
        this.checkLevelProgress();
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply screen blur effect if in ending state
        if (this.gameState === 'ending' && this.screenBlur !== undefined && this.screenBlur > 0) {
            this.ctx.filter = `blur(${this.screenBlur}px)`;
        }
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render current level
        if (this.currentLevel < this.levels.length) {
            this.levels[this.currentLevel].render(this.ctx);
        }
        
        // Render particles
        for (const particle of this.particles) {
            particle.render(this.ctx);
        }
        
        // Render companion (only if not fallen off screen)
        if (this.companion && this.companion.position.y < 800) {
            this.companion.render(this.ctx);
        }
        
        // Render player (only if not fallen off screen)
        if (this.player && this.player.position.y < 800) {
            this.player.render(this.ctx);
        }
        
        this.ctx.restore();
        
        // Reset filter for UI elements
        this.ctx.filter = 'none';
        
        // Render atmospheric effects
        this.renderAtmosphere();
        
        // Render level name (only during gameplay)
        if (this.gameState === 'playing') {
            this.renderLevelName();
        }
    }

    renderAtmosphere() {
        // Add subtle darkness overlay that increases with corruption
        const corruption = this.currentLevel < this.levels.length ? this.levels[this.currentLevel].corruption : 0;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.3, corruption * 0.05)})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderLevelName() {
        if (this.currentLevel < this.levels.length) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
            this.ctx.font = '24px Cinzel, serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.levels[this.currentLevel].name, this.canvas.width / 2, 50);
            this.ctx.restore();
        }
    }

    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.016); // Cap at 60fps
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    window.game = new Game();
});