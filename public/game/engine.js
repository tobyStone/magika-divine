const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const TILE_SIZE = 64;
const GRAVITY = 0.6;
const MAX_FALL_SPEED = 14;
const JUMP_FORCE = -16;
const MOVE_SPEED = 6;

// Set canvas size (16:9 aspect ratio)
canvas.width = 1280;
canvas.height = 720;

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Attack: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space' || e.key === 'w' || e.key === 'W' || e.code === 'ArrowUp') keys.Space = true;
    if (e.key === 'a' || e.key === 'A') keys.Attack = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space' || e.key === 'w' || e.key === 'W' || e.code === 'ArrowUp') keys.Space = false;
    if (e.key === 'a' || e.key === 'A') keys.Attack = false;
});

// Assets
const assets = {
    bg: new Image(),
    tile: new Image(),
    player: new Image(),
    enemy: new Image()
};

assets.bg.src = 'assets/bg.png';
assets.tile.src = 'assets/tile.png';
assets.player.src = 'assets/player.png';
assets.enemy.src = 'assets/enemy.png';

let assetsLoaded = 0;
const totalAssets = Object.keys(assets).length;

Object.values(assets).forEach(img => {
    img.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            initLevel();
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
    invincibleTimer: 0
};

// Enemy object
const enemy = {
    x: 704,
    y: 240,
    width: 80,
    height: 100,
    health: 4,
    lastAttackTime: 0,
    isHit: false,
    hitTimer: 0,
    active: true
};

const enemyProjectiles = [];
const ENEMY_ATTACK_COOLDOWN = 1500; // 1.5 seconds

// Level Map (1 = solid tile)
const mapCols = 30; // 30 * 64 = 1920 map width
const mapRows = 12; // 12 * 64 = 768 map height

const levelData = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
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

    // --- Enemy Logic ---
    if (enemy.active) {
        // Enemy hit detection
        for (let p of projectiles) {
            // Projectiles use 'size' as a radius/diameter, so we pass a bounding box
            const pRect = { x: p.x - p.size, y: p.y - p.size, width: p.size * 2, height: p.size * 2 };
            if (p.active && checkCollision(pRect, enemy)) {
                enemy.health--;
                enemy.isHit = true;
                enemy.hitTimer = 10; // flash for 10 frames
                p.active = false;
                if (enemy.health <= 0) {
                    enemy.active = false;
                }
            }
        }

        if (enemy.isHit) {
            enemy.hitTimer--;
            if (enemy.hitTimer <= 0) enemy.isHit = false;
        }

        // Enemy Attack (aim at player)
        if (Date.now() - enemy.lastAttackTime > ENEMY_ATTACK_COOLDOWN) {
            enemy.lastAttackTime = Date.now();
            // Calculate direction to player
            const dx = (player.x + player.width/2) - (enemy.x + enemy.width/2);
            const dy = (player.y + player.height/2) - (enemy.y + enemy.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 800) { // Only fire if player is somewhat close
                enemyProjectiles.push({
                    x: enemy.x + enemy.width/2,
                    y: enemy.y + enemy.height/2,
                    vx: (dx / dist) * 5,
                    vy: (dy / dist) * 5,
                    size: 8,
                    active: true
                });
            }
        }
    }

    // Update enemy projectiles
    for (let ep of enemyProjectiles) {
        if (!ep.active) continue;
        ep.x += ep.vx;
        ep.y += ep.vy;

        // Hit player detection
        if (!player.invincible && checkCollision({x: ep.x - ep.size, y: ep.y - ep.size, width: ep.size*2, height: ep.size*2}, player)) {
            player.health--;
            player.invincible = true;
            player.invincibleTimer = 60; // 1 second invincibility
            ep.active = false;
            
            if (player.health <= 0) {
                // Respawn
                player.x = 100;
                player.y = 100;
                player.vy = 0;
                player.health = 5;
            }
        }

        // Tile collision
        let c = Math.floor(ep.x / TILE_SIZE);
        let r = Math.floor(ep.y / TILE_SIZE);
        if (r >= 0 && r < mapRows && c >= 0 && c < mapCols && levelData[r][c] === 1) {
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
}

function updatePhysics() {
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
        player.x = 100;
        player.y = 100;
        player.vy = 0;
        player.health = 5; // Reset on fall
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

// Particles (Spores)
const particles = [];
function initLevel() {
    for (let i = 0; i < 60; i++) {
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
                ctx.drawImage(
                    assets.tile,
                    c * TILE_SIZE, r * TILE_SIZE,
                    TILE_SIZE, TILE_SIZE
                );
            }
        }
    }

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

    // 3b. Draw Enemy
    if (enemy.active) {
        ctx.save();
        ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        
        // Face player
        if (player.x + player.width/2 < enemy.x + enemy.width/2) {
            ctx.scale(-1, 1);
        }

        ctx.globalCompositeOperation = 'screen';
        
        if (enemy.isHit) {
            ctx.filter = 'brightness(5) saturate(0)'; // Flash white
        } else {
            // Dark purple glow for enemy
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff00ff';
        }
        
        ctx.drawImage(assets.enemy, -enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
        ctx.restore();
    }

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

    ctx.restore();

    // Draw magic projectiles (Player - Cyan)
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff'; 
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw magic projectiles (Enemy - Red/Purple)
    enemyProjectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0033'; 
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // --- UI (Stay fixed on screen) ---
    ctx.restore(); // Exit camera translate for UI
    
    // Health UI
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(40 + i * 35, 70, 10, 0, Math.PI * 2);
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

    // Boss Health Bar (if active)
    if (enemy.active) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(canvas.width/2 - 100, 30, 200, 15);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(canvas.width/2 - 100, 30, (enemy.health / 4) * 200, 15);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(canvas.width/2 - 100, 30, 200, 15);
    }

    // Debug Text
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px monospace';
    ctx.fillText(`Arrows Mv | Space/W Jump | A Attack`, 20, 30);
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
