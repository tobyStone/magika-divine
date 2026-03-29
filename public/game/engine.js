const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const TILE_SIZE = 64;
const GRAVITY = 0.6;
const MAX_FALL_SPEED = 14;
const JUMP_FORCE = -12;
const MOVE_SPEED = 6;

// Set canvas size (16:9 aspect ratio)
canvas.width = 1280;
canvas.height = 720;

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.ArrowRight = true;
    if (e.code === 'Space' || e.key === 'w' || e.key === 'W') keys.Space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.ArrowRight = false;
    if (e.code === 'Space' || e.key === 'w' || e.key === 'W') keys.Space = false;
});

// Assets
const assets = {
    bg: new Image(),
    tile: new Image(),
    player: new Image()
};

assets.bg.src = 'assets/bg.png';
assets.tile.src = 'assets/tile.png';
assets.player.src = 'assets/player.png';

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
    facingRight: true
};

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
    
    // Set operation 'screen' so solid black background of sprite becomes transparent if there are lighter elements.
    // Assuming the knight prompt "white glowing eyes, silhouette" gives strong contrast.
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(assets.player, -player.width/2, -player.height/2, player.width, player.height);
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

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

    // Debug Text
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px monospace';
    ctx.fillText(`WASD to Move | Space to Jump`, 20, 30);
}

function gameLoop() {
    updatePhysics();
    updateParticles();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial Loading text
ctx.fillStyle = '#0a0d0a';
ctx.fillRect(0,0, canvas.width, canvas.height);
ctx.fillStyle = '#fff';
ctx.font = '24px monospace';
ctx.fillText('Loading Atmosphere...', canvas.width/2 - 120, canvas.height/2);
