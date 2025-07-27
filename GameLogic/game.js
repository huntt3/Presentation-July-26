// Simple Platformer Game using PIXI.js
const app = new PIXI.Application();

// Game constants
const GRAVITY = 0.3;
const JUMP_FORCE = -6;
const MOVE_SPEED = 2;
const TILE_SIZE = 16;

// Game state
let keys = {};
let player;
let platforms = [];
let idleTextures = [];
let jumpTextures = [];
let isPlayerOnGround = false;

// Player object
const playerState = {
  x: 50,
  y: 50,
  velocityX: 0,
  velocityY: 0,
  width: 16,
  height: 16,
  isJumping: false,
  animationFrame: 0,
  animationSpeed: 0.1,
  animationTimer: 0,
};

// Initialize the game
async function init() {
  try {
    // Initialize the application with settings
    await app.init({
      width: 256,
      height: 96,
      backgroundColor: 0x87ceeb, // Sky blue background
      canvas: document.getElementById("slime-canvas"),
    });
    
    // Load platform texture
    const platformTexture = await PIXI.Assets.load(
      "./tiles/world_tileset/tile_020.png"
    );

    // Load slime idle textures
    for (let i = 0; i <= 6; i++) {
      const texture = await PIXI.Assets.load(
        `./slime/slimeIdle/slime_idle_${i}.png`
      );
      idleTextures.push(texture);
    }

    // Load slime jump textures
    for (let i = 0; i <= 22; i++) {
      const paddedNum = i.toString().padStart(2, "0");
      const texture = await PIXI.Assets.load(
        `./slime/slimeJump/slime_jump_${paddedNum}.png`
      );
      jumpTextures.push(texture);
    }

    // Create platforms
    createPlatforms(platformTexture);

    // Create player
    createPlayer();

    // Start game loop
    app.ticker.add(gameLoop);
  } catch (error) {
    console.error("Error loading assets:", error);
  }
}

function createPlatforms(texture) {
  // Ground level platforms
  for (let x = 0; x < app.screen.width; x += TILE_SIZE) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Upper story platforms (left side)
  for (let x = 0; x < app.screen.width * 0.4; x += TILE_SIZE) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE * 3;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE * 3,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Upper story platforms (right side)
  for (let x = app.screen.width * 0.6; x < app.screen.width; x += TILE_SIZE) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE * 3;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE * 3,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Middle platform
  for (
    let x = app.screen.width * 0.3;
    x < app.screen.width * 0.7;
    x += TILE_SIZE
  ) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE * 2;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE * 2,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }
}

function createPlayer() {
  // Start with idle texture
  player = new PIXI.Sprite(idleTextures[0]);
  player.x = playerState.x;
  player.y = playerState.y;
  player.width = playerState.width;
  player.height = playerState.height;
  app.stage.addChild(player);
}

function gameLoop() {
  handleInput();
  updatePlayer();
  updateAnimation();
  checkCollisions();
  updatePlayerSprite();
}

function handleInput() {
  // Reset horizontal velocity
  playerState.velocityX = 0;

  // Handle left/right movement
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    playerState.velocityX = -MOVE_SPEED;
    playerState.isJumping = true; // Use jump animation for movement
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    playerState.velocityX = MOVE_SPEED;
    playerState.isJumping = true; // Use jump animation for movement
  }

  // Handle jumping
  if (
    (keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) &&
    isPlayerOnGround
  ) {
    playerState.velocityY = JUMP_FORCE;
    isPlayerOnGround = false;
    playerState.isJumping = true;
  }

  // If not moving horizontally and on ground, use idle animation
  if (playerState.velocityX === 0 && isPlayerOnGround) {
    playerState.isJumping = false;
  }
}

function updatePlayer() {
  // Apply gravity
  playerState.velocityY += GRAVITY;

  // Update position
  playerState.x += playerState.velocityX;
  playerState.y += playerState.velocityY;

  // Keep player within screen bounds horizontally
  if (playerState.x < 0) {
    playerState.x = 0;
  }
  if (playerState.x + playerState.width > app.screen.width) {
    playerState.x = app.screen.width - playerState.width;
  }

  // Prevent falling through bottom of screen
  if (playerState.y + playerState.height > app.screen.height) {
    playerState.y = app.screen.height - playerState.height;
    playerState.velocityY = 0;
    isPlayerOnGround = true;
  }
}

function checkCollisions() {
  isPlayerOnGround = false;

  for (let platform of platforms) {
    // Check if player is colliding with platform
    if (
      playerState.x < platform.x + platform.width &&
      playerState.x + playerState.width > platform.x &&
      playerState.y < platform.y + platform.height &&
      playerState.y + playerState.height > platform.y
    ) {
      // Player is falling down and hits top of platform
      if (playerState.velocityY > 0 && playerState.y < platform.y) {
        playerState.y = platform.y - playerState.height;
        playerState.velocityY = 0;
        isPlayerOnGround = true;
      }
    }
  }
}

function updateAnimation() {
  playerState.animationTimer += playerState.animationSpeed;

  if (playerState.animationTimer >= 1) {
    playerState.animationTimer = 0;

    if (playerState.isJumping) {
      playerState.animationFrame =
        (playerState.animationFrame + 1) % jumpTextures.length;
    } else {
      playerState.animationFrame =
        (playerState.animationFrame + 1) % idleTextures.length;
    }
  }
}

function updatePlayerSprite() {
  // Update player sprite position
  player.x = playerState.x;
  player.y = playerState.y;

  // Update animation frame
  if (playerState.isJumping) {
    player.texture = jumpTextures[Math.floor(playerState.animationFrame)];
  } else {
    player.texture = idleTextures[Math.floor(playerState.animationFrame)];
  }
}

// Keyboard event listeners
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
  keys[e.key] = false;
});

// Start the game
init();
