const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const TILE_SIZE = 64;
const GRAVITY = 0.6;
const MAX_FALL_SPEED = 14;
const JUMP_FORCE = -16;
const MOVE_SPEED = 6;

// Set canvas size (16:9 aspect ratio)
function resize() {
    canvas.width = 1280;
    canvas.height = 720;
}
window.addEventListener('resize', resize);
resize();

// Cinematic State
let introStatus = 'READY'; // READY, PLAYING, FINISHED
let introTimer = 0;
let screenShake = 0;

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Attack: false,
    ArrowDown: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.ArrowDown = true;
    if (e.code === 'Space' || e.key === 'w' || e.key === 'W' || e.code === 'ArrowUp') keys.Space = true;
    if (e.key === 'a' || e.key === 'A') keys.Attack = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.ArrowDown = false;
    if (e.code === 'Space' || e.key === 'w' || e.key === 'W' || e.code === 'ArrowUp') keys.Space = false;
    if (e.key === 'a' || e.key === 'A') keys.Attack = false;
});

// Assets
const assets = {
    bg: new Image(),
    tile: new Image(),
    player: new Image(),
    enemy: new Image(),
    heart: new Image(),
    zombie: new Image(),
    acid: new Image(),
    podium: new Image(),
    crystal: new Image(),
    stone: new Image(),
    bird: new Image(),
    gate: new Image()
};

assets.bg.src = 'assets/bg.png';
assets.tile.src = 'assets/tile.png';
assets.player.src = 'assets/player.png';
assets.enemy.src = 'assets/enemy.png';
assets.heart.src = 'assets/heart.png';
assets.zombie.src = 'assets/zombie.png';
assets.acid.src = 'assets/acid.png';
assets.podium.src = 'assets/podium.png';
assets.crystal.src = 'assets/crystal.png';
assets.stone.src = 'assets/stone.png';
assets.bird.src = 'assets/bird.png';
assets.gate.src = 'assets/gate.png';

let assetsLoaded = 0;
const totalAssets = Object.keys(assets).length;

Object.values(assets).forEach(img => {
    img.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            initLevel();
            loadGame(); // Try to load any existing save
            requestAnimationFrame(gameLoop);
        }
    };
});

// Player object
const player = {
    x: 100,
    y: 100,
    width: 64, 
    height: 80,
    vx: 0,
    vy: 0,
    isGrounded: false,
    facingRight: true,
    lastAttackTime: 0,
    isHit: false,
    hitTimer: 0,
    health: 5,
    invincible: false,
    invincibleTimer: 0,
    checkpointX: 100,
    checkpointY: 100,
    saveText: "",
    saveTextTimer: 0,
    extraHealth: 0,
    hatCollected: false,
    readingLore: false,
    loreText: ""
};

function saveGame() {
    const saveData = {
        x: player.x,
        y: player.y,
        health: player.health,
        checkpointX: player.checkpointX,
        checkpointY: player.checkpointY,
        extraHealth: player.extraHealth,
        hatCollected: player.hatCollected
    };
    localStorage.setItem('magika_divine_save', JSON.stringify(saveData));
    player.saveText = "COMMUNED";
    player.saveTextTimer = 120; // 2 seconds
}

function loadGame() {
    const saved = localStorage.getItem('magika_divine_save');
    if (saved) {
        const data = JSON.parse(saved);
        player.x = data.x;
        player.y = data.y;
        player.health = data.health;
        player.checkpointX = data.checkpointX;
        player.checkpointY = data.checkpointY;
        player.extraHealth = data.extraHealth || 0;
        player.hatCollected = data.hatCollected || false;
    }
}

const enemyProjectiles = [];
const ENEMY_ATTACK_COOLDOWN = 1500; // 1.5 seconds

let enemies = [];
const drops = [];

// Level Map (1 = solid tile, 2 = acid, 3 = ladder/platform)
const mapCols = 180; // Expanded for Mountain Cave
const mapRows = 12; // 12 * 64 = 768 map height

const levelData = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,0,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,1,1,1,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,1,1,1,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
    [0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1, 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0, 0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1, 1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1, 1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1, 1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Physics / Collisions
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

const projectiles = [];
const ATTACK_COOLDOWN = 300;

function updateProjectiles() {
    // Attack Input (check time for cooldown)
    if (keys.Attack && Date.now() - player.lastAttackTime > ATTACK_COOLDOWN) {
        player.lastAttackTime = Date.now();
        projectiles.push({
            x: player.facingRight ? player.x + player.width : player.x,
            y: player.y + player.height / 2 - 10,
            vx: player.facingRight ? 12 : -12,
            size: 10,
            active: true
        });
    }
    
    // Update existing
    for (let p of projectiles) {
        if (!p.active) continue;
        p.x += p.vx;
        
        // Simple collision with tiles
        let c = Math.floor(p.x / TILE_SIZE);
        let r = Math.floor(p.y / TILE_SIZE);
        if (r >= 0 && r < mapRows && c >= 0 && c < mapCols && levelData[r][c] === 1) {
            p.active = false;
        }
        
        if (p.x < -1000 || p.x > mapCols * TILE_SIZE + 1000) p.active = false;
    }
    
    // Clean up
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) projectiles.splice(i, 1);
    }

    // --- Monster Mob Logic ---
    enemies.forEach(enemy => {
        if (!enemy.active) return;

        // Enemy hit detection
        for (let p of projectiles) {
            const pRect = { x: p.x - p.size, y: p.y - p.size, width: p.size * 2, height: p.size * 2 };
            if (p.active && checkCollision(pRect, enemy)) {
                if (enemy.type === 'bird_wizard' && enemy.isDying) continue; // Immortal while dying

                enemy.health--;
                enemy.isHit = true;
                enemy.hitTimer = 10;
                p.active = false;
                
                if (enemy.health <= 0) {
                    if (enemy.type === 'bird_wizard') {
                        enemy.isDying = true;
                        enemy.deathTimer = 120; // 2 seconds of shaking
                        enemyProjectiles.length = 0; // Clear all attacks immediately
                    } else {
                        enemy.active = false;
                        if (enemy.type === 'spellcaster') enemyProjectiles.length = 0; // Clear Keeper attacks
                    }
                }
            }
        }

        if (enemy.isHit) {
            enemy.hitTimer--;
            if (enemy.hitTimer <= 0) enemy.isHit = false;
        }

        // --- Player-Enemy Contact Damage ---
        if (!player.invincible && !enemy.isDying && checkCollision(player, enemy)) {
            if (player.extraHealth > 0) {
                player.extraHealth--;
            } else {
                player.health--;
            }
            player.invincible = true;
            player.invincibleTimer = 60;
            if (player.health <= 0) {
                player.x = player.checkpointX; player.y = player.checkpointY; player.vy = 0; player.health = 5;
                player.extraHealth = 0; // Reset shield on death
            }
        }

        // --- AI Patterns ---
        if (enemy.type === 'spellcaster') {
            if (Date.now() - enemy.lastAttackTime > ENEMY_ATTACK_COOLDOWN) {
                enemy.lastAttackTime = Date.now();
                const dx = (player.x + player.width/2) - (enemy.x + enemy.width/2);
                const dy = (player.y + player.height/2) - (enemy.y + enemy.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 800) {
                    enemyProjectiles.push({
                        x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2,
                        vx: (dx / dist) * 3, vy: (dy / dist) * 3,
                        size: 8, active: true
                    });
                }
            }
        } else if (enemy.type === 'bird_wizard') {
            const dx = (player.x + player.width/2) - (enemy.x + enemy.width/2);
            const dy = (player.y + player.height/2) - (enemy.y + enemy.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Bird Boss AI State Machine
            if (!enemy.state) { enemy.state = 'idle'; enemy.stateTimer = 60; }
            enemy.stateTimer--;

            if (enemy.stateTimer <= 0) {
                // Pick a new state
                const rand = Math.random();
                if (rand < 0.4) {
                    enemy.state = 'shoot';
                    enemy.stateTimer = 40;
                } else if (rand < 0.7) {
                    enemy.state = 'rush';
                    enemy.stateTimer = 60;
                    enemy.rushDir = dx > 0 ? 1 : -1;
                } else {
                    enemy.state = 'teleport';
                    enemy.stateTimer = 30;
                }
            }

            if (enemy.state === 'shoot') {
                if (Date.now() - enemy.lastAttackTime > 1200) {
                    enemy.lastAttackTime = Date.now();
                    enemyProjectiles.push({
                        x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2,
                        vx: (dx / dist) * 3.5, vy: (dy / dist) * 3.5,
                        size: 10, active: true, color: '#ff00ff'
                    });
                }
            } else if (enemy.state === 'rush') {
                enemy.vx = enemy.rushDir * 12;
                enemy.x += enemy.vx;
                // Boundary check (Stay in arena: 101-125)
                if (enemy.x < 101 * TILE_SIZE) enemy.x = 101 * TILE_SIZE;
                if (enemy.x > 124 * TILE_SIZE) enemy.x = 124 * TILE_SIZE;
            } else if (enemy.state === 'teleport' && enemy.stateTimer === 15) {
                // Execute blink halfway through the state
                enemy.x = (102 + Math.random() * 18) * TILE_SIZE;
                enemy.y = (3 + Math.random() * 6) * TILE_SIZE;
            }
        }
    });

    // Handle Dying Bosses
    enemies.forEach(enemy => {
        if (enemy.type === 'bird_wizard' && enemy.isDying) {
            enemy.deathTimer--;
            if (enemy.deathTimer <= 0) {
                enemy.active = false;
            }
        }
    });

    // Clean up dead enemies
    enemies = enemies.filter(e => e.active);

    // Update enemy projectiles
    for (let ep of enemyProjectiles) {
        if (!ep.active) continue;
        ep.x += ep.vx;
        ep.y += ep.vy;

        // Hit player detection
        const epRect = { x: ep.x - ep.size, y: ep.y - ep.size, width: ep.size * 2, height: ep.size * 2 };
        if (!player.invincible && checkCollision(player, epRect)) {
            if (player.extraHealth > 0) {
                player.extraHealth--;
            } else {
                player.health--;
            }
            player.invincible = true;
            player.invincibleTimer = 60;
            ep.active = false;
            
            if (player.health <= 0) {
                // Respawn
                player.x = player.checkpointX;
                player.y = player.checkpointY;
                player.vy = 0;
                player.health = 5;
                player.extraHealth = 0;
            }
        }

        // Tile collision
        let c = Math.floor(ep.x / TILE_SIZE);
        let r = Math.floor(ep.y / TILE_SIZE);
        if (r >= 0 && r < mapRows && c >= 0 && c < mapCols && (levelData[r][c] === 1 || levelData[r][c] === 2)) {
            ep.active = false;
        }

        if (ep.x < -100 || ep.x > mapCols * TILE_SIZE + 100 || ep.y < -100 || ep.y > mapRows * TILE_SIZE + 100) {
            ep.active = false;
        }
    }

    // Clean up enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        if (!enemyProjectiles[i].active) enemyProjectiles.splice(i, 1);
    }

    // --- Drops Logic ---
    for (let d of drops) {
        if (!d.active) continue;
        
        // Player collection
        if (checkCollision(d, player)) {
            if (d.type === 'heart' || d.type === 'heart_on_podium') {
                player.health = 5; // Full Restore
            }
            d.active = false;
        }
    }
    
    // Clean up drops
    for (let i = drops.length - 1; i >= 0; i--) {
        if (!drops[i].active) drops.splice(i, 1);
    }
}

function updatePhysics() {
    // Intro Cutscene Trigger Logic
    const galleryStartX = 100 * TILE_SIZE;
    if (player.x > galleryStartX && introStatus === 'READY') {
        introStatus = 'PLAYING';
        introTimer = 90; // 1.5 seconds
        player.vx = 0;
        player.vy = 0;
    } else if (player.x < galleryStartX - 100 && introStatus === 'FINISHED') {
        introStatus = 'READY'; // Reset so it plays again when entering
    }

    if (introStatus === 'PLAYING') {
        introTimer--;
        screenShake = 15; // Constant intense shake during scream
        if (introTimer <= 0) {
            introStatus = 'FINISHED';
            screenShake = 0;
        }
        return; // Lock movement
    }

    if (screenShake > 0) screenShake *= 0.9; // Fade out shake if any left

    // Horizontal Movement
    if (keys.ArrowLeft) {
        player.vx = -MOVE_SPEED;
        player.facingRight = false;
    } else if (keys.ArrowRight) {
        player.vx = MOVE_SPEED;
        player.facingRight = true;
    } else {
        player.vx = 0;
    }

    player.x += player.vx;

    // Horizontal Collisions
    let pRect = { x: player.x, y: player.y, width: player.width, height: player.height };
    for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
            if (levelData[r][c] === 1) {
                let tileRect = { x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
                if (checkCollision(pRect, tileRect)) {
                    if (player.vx > 0) { // right
                        player.x = tileRect.x - player.width;
                    } else if (player.vx < 0) { // left
                        player.x = tileRect.x + tileRect.width;
                    }
                    player.vx = 0;
                    pRect.x = player.x; 
                }
            }
        }
    }

    // Vertical Movement (Gravity & Jump)
    if (player.isGrounded && keys.Space) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
    }

    player.vy += GRAVITY;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
    
    player.y += player.vy;
    player.isGrounded = false;

    // Vertical Collisions
    pRect.y = player.y;
    for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
            if (levelData[r][c] === 1) {
                let tileRect = { x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
                if (checkCollision(pRect, tileRect)) {
                    if (player.vy > 0) { // falling
                        player.y = tileRect.y - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                    } else if (player.vy < 0) { // hitting ceiling
                        player.y = tileRect.y + tileRect.height;
                        player.vy = 0;
                    }
                    pRect.y = player.y;
                }
            }
        }
    }

    // Level bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > mapCols * TILE_SIZE) player.x = mapCols * TILE_SIZE - player.width;
    if (player.y > mapRows * TILE_SIZE) {
        player.x = player.checkpointX;
        player.y = player.checkpointY;
        player.vy = 0;
        player.health = 5; // Reset on fall
    }

    // Checkpoint logic
    if (player.x > 3840 && player.checkpointX === 100) {
        player.checkpointX = 3900;
        player.checkpointY = 100;
    }

    // Hazard Collision (Tile 2 = Acid)
    pRect.y = player.y; // Refresh pRect
    pRect.x = player.x;
    for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
            if (levelData[r][c] === 2) {
                let tileRect = { x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
                if (checkCollision(pRect, tileRect)) {
                    if (!player.invincible) {
                        if (player.extraHealth > 0) {
                            player.extraHealth--;
                        } else {
                            player.health--;
                        }
                        player.invincible = true;
                        player.invincibleTimer = 60;
                        if (player.health <= 0) {
                            player.x = player.checkpointX;
                            player.y = player.checkpointY;
                            player.vy = 0;
                            player.health = 5;
                            player.extraHealth = 0;
                        }
                    }
                }
            }
        }
    }

    // Interaction Objects Collision
    for (let obj of interactiveObjects) {
        if (checkCollision(player, obj)) {
            if (obj.type === 'crystal' && player.saveTextTimer <= 0) {
                saveGame();
            } else if (obj.type === 'stone') {
                // Teleport to Boss Arena Entrance (Column 101)
                player.x = 101 * TILE_SIZE;
                player.y = 10 * TILE_SIZE - player.height;
                player.vx = 0; player.vy = 0;
            } else if (obj.type === 'wizard_hat') {
                player.extraHealth = 3;
                player.hatCollected = true;
                obj.active = false;
                player.saveText = "HAT OBTAINED";
                player.saveTextTimer = 180;
                saveGame(); // Persist immediately
            } else if (obj.type === 'lore_rock') {
                if (keys.ArrowDown) {
                    player.readingLore = true;
                    player.loreText = "he shall not escape, he is too dangerous";
                } else {
                    player.readingLore = false;
                }
            }
        }
    }

    // Save Text animation
    if (player.saveTextTimer > 0) {
        player.saveTextTimer--;
    }

    // Player Invincibility timer
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
        }
    }
}

// Camera tracking
let camera = { x: 0, y: 0 };

// Interaction Objects
const interactiveObjects = [];

// Particles (Spores)
const particles = [];
function initLevel() {
    // Spawn Boss
    enemies.push({
        x: 704, y: 240, width: 80, height: 100, health: 4, maxHealth: 4,
        lastAttackTime: 0, isHit: false, hitTimer: 0, active: true, type: 'spellcaster'
    });

    // Spawn Zombies in Room 2 (Flat Room)
    for (let i = 0; i < 5; i++) {
        enemies.push({
            x: 2300 + i * 300, y: 640 - 80, width: 64, height: 80, health: 1,
            vx: 0, isHit: false, hitTimer: 0, active: true, type: 'zombie'
        });
    }

    // Spawn Podium Reward in Room 4
    drops.push({
        x: 84 * TILE_SIZE, y: 5 * TILE_SIZE - 40, width: 64, height: 80,
        type: 'heart_on_podium', active: true
    });

    // Spawn Save Crystal & Stone
    interactiveObjects.push({
        x: 87 * TILE_SIZE, y: 10 * TILE_SIZE - 96, width: 80, height: 96,
        type: 'crystal', active: true
    });
    interactiveObjects.push({
        x: 89 * TILE_SIZE, y: 10 * TILE_SIZE - 64, width: 64, height: 64,
        type: 'stone', active: true
    });

    if (!player.hatCollected) {
        interactiveObjects.push({
            x: 90.5 * TILE_SIZE, y: 10 * TILE_SIZE - 40, width: 40, height: 40,
            type: 'wizard_hat', active: true
        });
    }

    // Spawn Lore Rock at Col 160
    interactiveObjects.push({
        x: 160 * TILE_SIZE, y: 7 * TILE_SIZE - 64, width: 64, height: 64,
        type: 'lore_rock', active: true
    });

    // Spawn Bird Wizard Boss
    enemies.push({
        x: 115 * TILE_SIZE, y: 5 * TILE_SIZE, width: 100, height: 120, health: 15, maxHealth: 15,
        lastAttackTime: 0, lastTeleportTime: 0, isHit: false, hitTimer: 0, active: true, type: 'bird_wizard'
    });

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * (mapCols * TILE_SIZE),
            y: Math.random() * (mapRows * TILE_SIZE),
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5 - 0.2,
            size: Math.random() * 2 + 1,
            alpha: Math.random() * 0.5 + 0.1
        });
    }
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Windy mountain effect for particles at the end of the map
        if (p.x > 125 * TILE_SIZE) {
            p.vx = -12; // Strong mountain wind
            p.size = Math.random() * 3 + 1; // Bigger snow/wind particles
        } else {
            p.vx = (Math.random() - 0.5) * 1.5; // Normal spores
        }

        if (p.x < 0) p.x = mapCols * TILE_SIZE;
        if (p.x > mapCols * TILE_SIZE) p.x = 0;
        if (p.y < 0) p.y = mapRows * TILE_SIZE;
        if (p.y > mapRows * TILE_SIZE) p.y = 0;
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Smooth camera follow player
    let targetCamX = player.x + player.width/2 - canvas.width/2;
    let targetCamY = player.y + player.height/2 - canvas.height/2;

    targetCamX = Math.max(0, Math.min(targetCamX, mapCols * TILE_SIZE - canvas.width));
    targetCamY = Math.max(0, Math.min(targetCamY, mapRows * TILE_SIZE - canvas.height));

    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;

    ctx.save();
    
    // Apply Screen Shake
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }
    
    // 1. Draw Parallax Background
    const bgParallaxFactor = 0.5;
    let bgOffsetX = - (camera.x * bgParallaxFactor);
    let bgOffsetY = - (camera.y * (bgParallaxFactor * 0.2));

    const bgScaleX = Math.max(1, (mapCols * TILE_SIZE * bgParallaxFactor + canvas.width) / assets.bg.width);
    const bgScaleY = canvas.height / assets.bg.height * 1.5; 
    const scale = Math.max(bgScaleX, bgScaleY);

    ctx.drawImage(assets.bg, bgOffsetX, bgOffsetY - 100, assets.bg.width * scale, assets.bg.height * scale);

    // Apply Camera Translation
    ctx.translate(-camera.x, -camera.y);

    // 2. Draw Level Tiles
    for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
            if (levelData[r][c] === 1) {
                ctx.drawImage(assets.tile, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (levelData[r][c] === 2) {
                // Animate Acid
                const acidOffset = (Date.now() / 20) % TILE_SIZE;
                ctx.drawImage(assets.acid, c * TILE_SIZE - acidOffset, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.drawImage(assets.acid, c * TILE_SIZE - acidOffset + TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ff33';
                ctx.fillStyle = 'rgba(0, 255, 50, 0.1)';
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.restore();
            }
        }
    }

    // 2b. Draw Decorative Paintings & Interactive Objects
    // Bird Paintings in Boss Arena (Room 4)
    for (let i = 0; i < 5; i++) {
        ctx.drawImage(assets.bird, (105 + i * 4) * TILE_SIZE, 3 * TILE_SIZE, 128, 160);
    }
    // Locked Gate at the end (Unlocks if Boss is defeated)
    const bossActive = enemies.some(e => e.type === 'bird_wizard');
    if (bossActive) {
        ctx.drawImage(assets.gate, 121 * TILE_SIZE, 11 * TILE_SIZE - 256, 192, 256);
    } else {
        // Draw open/unlocked gate state
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.drawImage(assets.gate, 121 * TILE_SIZE, 11 * TILE_SIZE - 256, 192, 256);
        ctx.restore();
        // Clear collision at gate
        const gateCol = 121;
        for(let r=8; r<=10; r++) {
            if(levelData[r] && levelData[r][gateCol]) levelData[r][gateCol] = 0;
        }
    }

    interactiveObjects.forEach(obj => {
        if (obj.type === 'crystal') {
            ctx.save();
            const pulse = 1 + Math.sin(Date.now() / 300) * 0.1;
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ffff';
            ctx.drawImage(assets.crystal, obj.x - (obj.width * (pulse-1))/2, obj.y - (obj.height * (pulse-1))/2, obj.width * pulse, obj.height * pulse);
            ctx.restore();
        } else if (obj.type === 'stone') {
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff00ff';
            ctx.drawImage(assets.stone, obj.x, obj.y, obj.width, obj.height);
            ctx.restore();
        } else if (obj.type === 'wizard_hat') {
            ctx.save();
            const hover = Math.sin(Date.now() / 400) * 10;
            ctx.translate(obj.x + obj.width/2, obj.y + obj.height/2 + hover);
            
            // Draw procedural magic hat
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = '#4B0082'; // Indigo
            ctx.beginPath();
            ctx.moveTo(-20, 10);
            ctx.lineTo(20, 10);
            ctx.lineTo(0, -30);
            ctx.fill();
            ctx.fillRect(-30, 10, 60, 5); // Brim
            
            ctx.restore();
        } else if (obj.type === 'lore_rock') {
            ctx.save();
            const glow = 15 + Math.sin(Date.now() / 200) * 10;
            ctx.shadowBlur = glow;
            ctx.shadowColor = '#4db8ff'; // Bright cyan
            ctx.fillStyle = '#1a1a2e'; // Dark rock
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.height);
            ctx.lineTo(obj.x + obj.width/2, obj.y);
            ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
            ctx.fill();
            // Highlight
            ctx.strokeStyle = '#4db8ff';
            ctx.stroke();
            ctx.restore();
            
            if (Math.abs(player.x - obj.x) < 100) {
                 ctx.fillStyle = '#fff';
                 ctx.font = '14px monospace';
                 ctx.fillText("[Down Arrow] to read", obj.x, obj.y - 20);
            }
        }
    });

    // 3. Draw Player 
    ctx.save();
    let px = player.x + player.width / 2;
    let py = player.y + player.height / 2;
    
    ctx.translate(px, py);
    if (!player.facingRight) {
         ctx.scale(-1, 1);
    }
    
    // Ghostly effect when invincible
    if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.3;
    }

    // Set operation 'screen' so solid black background of sprite becomes transparent.
    ctx.globalCompositeOperation = 'screen';
    
    // Add glow to player for extra visibility
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.drawImage(assets.player, -player.width/2, -player.height/2, player.width, player.height);
    ctx.shadowBlur = 0;
    
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // 3b. Draw Enemies
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x + e.width/2, e.y + e.height/2);
        
        let targetImg = assets.enemy;
        if (e.type === 'zombie') {
            targetImg = assets.zombie;
            // Face player logic
            if (player.x + player.width/2 < e.x + e.width/2) ctx.scale(-1, 1);
        } else if (e.type === 'bird_wizard') {
            targetImg = assets.bird; // Use bird painting sprite as placeholder
            if (player.x + player.width/2 < e.x + e.width/2) ctx.scale(-1, 1);
            ctx.filter = 'hue-rotate(270deg) brightness(1.2)'; // Purple tint
        } else {
            if (player.x + player.width/2 < e.x + e.width/2) ctx.scale(-1, 1);
        }

        // Standard composite mode for vibrant sprites
        ctx.globalCompositeOperation = 'source-over';
        
        if (e.isDying) {
            // Vibate side to side when dying
            ctx.translate((Math.random() - 0.5) * 20, 0);
            ctx.filter = 'brightness(2) contrast(2) grayscale(0.5)';
        } else if (e.isHit) {
            ctx.filter = 'brightness(5) saturate(0)';
        } else {
            ctx.shadowBlur = 20;
            ctx.shadowColor = (e.type === 'spellcaster' || e.type === 'bird_wizard') ? '#ff00ff' : '#00ff66';
        }
        
        ctx.drawImage(targetImg, -e.width/2, -e.height/2, e.width, e.height);

        // Draw Wizard Hat procedurally for bird
        if (e.type === 'bird_wizard') {
            ctx.fillStyle = '#4B0082'; // Indigo
            ctx.beginPath();
            ctx.moveTo(-30, -e.height/2);
            ctx.lineTo(30, -e.height/2);
            ctx.lineTo(0, -e.height/2 - 60);
            ctx.fill();
            // Brim
            ctx.fillRect(-45, -e.height/2, 90, 10);
        }

        ctx.restore();
    });

    // 3c. Draw Drops (with pulse)
    drops.forEach(d => {
        if (d.type === 'heart' || d.type === 'heart_on_podium') {
            ctx.save();
            const pulse = 1 + Math.sin(Date.now() / 200) * 0.15;
            const drawW = d.width * pulse;
            const drawH = d.height * pulse;
            
            if (d.type === 'heart_on_podium') {
                // Draw podium under the heart
                ctx.drawImage(assets.podium, d.x, d.y + 40, d.width, d.height);
                ctx.translate(d.x + d.width/2, d.y + 20);
            } else {
                ctx.translate(d.x + d.width/2, d.y + d.height/2);
            }
            
            ctx.globalCompositeOperation = 'screen';
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff3366';
            ctx.drawImage(assets.heart, -drawW/2, -drawH/2, drawW, drawH);
            ctx.restore();
        }
    });

    // 4. Draw Particles (Spores)
    ctx.fillStyle = 'rgba(200, 255, 200, 0.5)';
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'lightgreen';
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw magic projectiles (Player - Cyan)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff'; 
        ctx.fill();
    });

    // Draw magic projectiles (Enemy - Red/Purple)
    enemyProjectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 25;
        ctx.shadowColor = p.color || '#ff0033'; 
        ctx.fill();
    });
    ctx.restore(); // Matching the Projectile save() at 759
    ctx.restore(); // Matching the Camera save() at 571
    
    // Health UI
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(43 + i * 35, 75, 10, 0, Math.PI * 2);
        if (i < player.health) {
            ctx.fillStyle = '#ff3366'; // Filled heart
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3366';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Empty heart
            ctx.shadowBlur = 0;
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Extra Health UI (Wizard Hat Shield)
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(43 + i * 35, 45, 8, 0, Math.PI * 2);
        if (i < player.extraHealth) {
            ctx.fillStyle = '#00ffff'; // Cyan shield heart
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';
            ctx.fill();
        } 
        ctx.restore();
    }
    ctx.shadowBlur = 0;

    // Boss Health Bar (if active)
    const boss = enemies.find(e => (e.type === 'spellcaster' || e.type === 'bird_wizard') && Math.abs(e.x - player.x) < 1000);
    if (boss) {
        const isBossWizard = boss.type === 'bird_wizard';
        const barWidth = isBossWizard ? 400 : 300;
        const healthMax = boss.maxHealth || (isBossWizard ? 15 : 4);
        const color = isBossWizard ? '#00ffff' : '#ff3300';
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width/2 - barWidth/2, 30, barWidth, 20);
        ctx.fillStyle = color;
        ctx.fillRect(canvas.width/2 - barWidth/2, 30, (boss.health / healthMax) * barWidth, 20);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width/2 - barWidth/2, 30, barWidth, 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px serif';
        const name = isBossWizard ? "THE BIRD WIZARD" : "ANCIENT KEEPER";
        ctx.fillText(name, canvas.width/2 - ctx.measureText(name).width/2, 22);
        ctx.shadowBlur = 0;
    }

    // Debug Text
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px monospace';
    ctx.fillText(`Arrows Mv | Space/W Jump | A Attack`, 20, 30);

    // Intro Scream Text
    if (introStatus === 'PLAYING') {
        ctx.save();
        ctx.fillStyle = '#ff0033';
        ctx.font = 'bold 80px serif';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        const txt = "SCREEEEEE!";
        const x = canvas.width/2 - ctx.measureText(txt).width/2;
        const y = canvas.height/2;
        ctx.fillText(txt, x, y);
        ctx.strokeText(txt, x, y);
        ctx.restore();
    }

    // Save Message
    if (player.saveTextTimer > 0) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 32px serif';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillText(player.saveText, canvas.width/2 - 80, 200);
        ctx.shadowBlur = 0;
    }

    // Lore Text Bubble
    if (player.readingLore) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(canvas.width/2 - 250, canvas.height - 150, 500, 80);
        ctx.strokeStyle = '#4db8ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width/2 - 250, canvas.height - 150, 500, 80);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'italic 20px serif';
        ctx.textAlign = 'center';
        ctx.fillText(`"${player.loreText}"`, canvas.width/2, canvas.height - 100);
        ctx.textAlign = 'left';
    }
}

function gameLoop() {
    updatePhysics();
    updateParticles();
    updateProjectiles();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial Loading text
ctx.fillStyle = '#0a0d0a';
ctx.fillRect(0,0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '24px monospace';
ctx.fillText('Loading Atmosphere...', canvas.width/2 - 120, canvas.height/2);
