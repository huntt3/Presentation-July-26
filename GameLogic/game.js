// Simple Platformer Game using PIXI.js
const app = new PIXI.Application();

// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;
const TILE_SIZE = 64;

// Game state
let keys = {};
let player;
let platforms = [];
let signs = [];
let todoData = [];
let idleTextures = [];
let jumpTextures = [];
let isPlayerOnGround = false;
let showingMessage = false;
let messageContainer = null;
let slimeColorCanvas = null;
let slimeColorContext = null;

// Player object
const playerState = {
  x: 100,
  y: 100,
  velocityX: 0,
  velocityY: 0,
  width: 84,
  height: 84,
  isJumping: false,
  animationFrame: 0,
  idleAnimationSpeed: 0.2,
  jumpAnimationSpeed: 0.7,
  animationTimer: 0,
};

// Initialize the game
async function init() {
  try {
    // Get canvas element and make it responsive
    const canvas = document.getElementById("slime-canvas");
    const gameContainer = canvas.parentElement;

    // Calculate game dimensions based on available space
    const gameWidth = gameContainer.offsetWidth;
    const gameHeight = Math.min(
      gameContainer.offsetHeight,
      window.innerHeight - 150
    ); // Account for header

    // Initialize the application with settings
    await app.init({
      width: gameWidth,
      height: gameHeight,
      backgroundColor: 0x87ceeb, // Sky blue background
      canvas: canvas,
    });

    // Load TODO data
    await loadTodoData();

    // Load platform texture
    const platformTexture = await PIXI.Assets.load(
      "./tiles/world_tileset/tile_020.png"
    );

    // Load sign texture
    const signTexture = await PIXI.Assets.load(
      "./tiles/world_tileset/tile_052.png"
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

    // Create signs
    createSigns(signTexture);

    // Create player
    createPlayer();

    // Create color detection canvas
    createColorDetectionCanvas();

    // Create message container
    createMessageContainer();

    // Start game loop
    app.ticker.add(gameLoop);
  } catch (error) {
    console.error("Error loading assets:", error);
  }
}

// Load TODO data from JSON file
async function loadTodoData() {
  try {
    const response = await fetch("./JsonFiles/text.json");
    const data = await response.json();
    todoData = data.TODO;
  } catch (error) {
    console.error("Error loading TODO data:", error);
    // Fallback data if file can't be loaded
    todoData = [
      {
        title: "🍿 Finish watching Week 4 video lessons",
        date: "BEFORE Tuesday",
      },
      { title: "🎯 Project 4: Game Concept", date: "SUNDAY" },
      { title: "🧪 Next LiveLab#9", date: "July 10th" },
      { title: "🔮 Discover Your Career Path", date: "TODAY 7/29" },
      { title: "📁 LinkedIn Hacks", date: "TUE 8/3" },
    ];
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
  for (let x = 0; x < app.screen.width * 0.3; x += TILE_SIZE) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE * 4;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE * 4,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Upper story platforms (right side)
  for (let x = app.screen.width * 0.7; x < app.screen.width; x += TILE_SIZE) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE * 4;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE * 4,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Middle platforms
  for (
    let x = app.screen.width * 0.2;
    x < app.screen.width * 0.8;
    x += TILE_SIZE * 2
  ) {
    const platform = new PIXI.Sprite(texture);
    platform.x = x;
    platform.y = app.screen.height - TILE_SIZE * 2.5;
    platform.width = TILE_SIZE;
    platform.height = TILE_SIZE;
    app.stage.addChild(platform);

    platforms.push({
      x: x,
      y: app.screen.height - TILE_SIZE * 2.5,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }
}

// Create signs with TODO information
function createSigns(texture) {
  const signPositions = [
    { x: app.screen.width * 0.15, y: app.screen.height - TILE_SIZE * 2 }, // Ground level left
    { x: app.screen.width * 0.85, y: app.screen.height - TILE_SIZE * 2 }, // Ground level right
    { x: app.screen.width * 0.15, y: app.screen.height - TILE_SIZE * 5 }, // Upper left
    { x: app.screen.width * 0.85, y: app.screen.height - TILE_SIZE * 5 }, // Upper right
    { x: app.screen.width * 0.5, y: app.screen.height - TILE_SIZE * 3.5 }, // Middle platform
  ];

  for (let i = 0; i < Math.min(signPositions.length, todoData.length); i++) {
    const sign = new PIXI.Sprite(texture);
    sign.x = signPositions[i].x;
    sign.y = signPositions[i].y;
    sign.width = TILE_SIZE;
    sign.height = TILE_SIZE;
    app.stage.addChild(sign);

    signs.push({
      x: signPositions[i].x,
      y: signPositions[i].y,
      width: TILE_SIZE,
      height: TILE_SIZE,
      todoIndex: i,
    });
  }
}

// Create message container for displaying TODO information
function createMessageContainer() {
  messageContainer = new PIXI.Container();
  messageContainer.visible = false;
  app.stage.addChild(messageContainer);
}

// Show TODO message
function showTodoMessage(todoIndex) {
  if (showingMessage || todoIndex >= todoData.length) return;

  showingMessage = true;
  const todo = todoData[todoIndex];

  // Create background
  const background = new PIXI.Graphics();
  background.beginFill(0x000000, 0.8);
  background.drawRoundedRect(
    0,
    0,
    app.screen.width * 0.8,
    app.screen.height * 0.3,
    10
  );
  background.endFill();
  background.x = app.screen.width * 0.1;
  background.y = app.screen.height * 0.1;

  // Create text
  const titleText = new PIXI.Text(todo.title, {
    fontFamily: "Arial",
    fontSize: Math.max(16, app.screen.width * 0.025),
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: app.screen.width * 0.7,
  });
  titleText.x = background.x + 20;
  titleText.y = background.y + 20;

  const dateText = new PIXI.Text(`Due: ${todo.date}`, {
    fontFamily: "Arial",
    fontSize: Math.max(14, app.screen.width * 0.02),
    fill: 0xffff00,
    wordWrap: true,
    wordWrapWidth: app.screen.width * 0.7,
  });
  dateText.x = background.x + 20;
  dateText.y = titleText.y + titleText.height + 10;

  const instructionText = new PIXI.Text("Press E to close", {
    fontFamily: "Arial",
    fontSize: Math.max(12, app.screen.width * 0.018),
    fill: 0xcccccc,
  });
  instructionText.x = background.x + 20;
  instructionText.y = dateText.y + dateText.height + 20;

  // Add to container
  messageContainer.removeChildren();
  messageContainer.addChild(background);
  messageContainer.addChild(titleText);
  messageContainer.addChild(dateText);
  messageContainer.addChild(instructionText);
  messageContainer.visible = true;
}

// Hide TODO message
function hideTodoMessage() {
  showingMessage = false;
  messageContainer.visible = false;
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

// Create a canvas for color detection (simplified version)
function createColorDetectionCanvas() {
  // Canvas setup for potential future pixel-perfect collision detection
  slimeColorCanvas = document.createElement("canvas");
  slimeColorCanvas.width = playerState.width;
  slimeColorCanvas.height = playerState.height;
  slimeColorContext = slimeColorCanvas.getContext("2d");
}

// Check if a pixel is blue (slime body color)
function isBluePixel(r, g, b, a) {
  // Check if pixel is not transparent and has blue components
  // Adjust these values based on your slime's actual blue color
  return a > 128 && b > r && b > g && b > 100;
}

// Simplified collision detection using estimated blue pixel areas
function checkBluePixelCollision(platform) {
  // Define blue pixel areas based on slime shape (approximate center area)
  const bluePixelAreas = [
    // Center area of slime (where blue pixels typically are)
    {
      x: playerState.x + playerState.width * 0.25,
      y: playerState.y + playerState.height * 0.3,
      width: playerState.width * 0.5,
      height: playerState.height * 0.6,
    },
    // Bottom area for ground collision
    {
      x: playerState.x + playerState.width * 0.3,
      y: playerState.y + playerState.height * 0.7,
      width: playerState.width * 0.4,
      height: playerState.height * 0.3,
    },
  ];

  // Check if any blue pixel area overlaps with platform
  for (let area of bluePixelAreas) {
    if (
      area.x < platform.x + platform.width &&
      area.x + area.width > platform.x &&
      area.y < platform.y + platform.height &&
      area.y + area.height > platform.y
    ) {
      return true;
    }
  }

  return false;
}

function gameLoop() {
  handleInput();
  updatePlayer();
  updateAnimation();
  checkCollisions();
  checkSignInteraction();
  updatePlayerSprite();
}

function handleInput() {
  // Reset horizontal velocity
  playerState.velocityX = 0;

  // Handle left/right movement
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    playerState.velocityX = -MOVE_SPEED;
    // Start jump animation from beginning if transitioning from idle
    if (!playerState.isJumping) {
      playerState.animationFrame = 0;
      playerState.animationTimer = 0;
    }
    playerState.isJumping = true; // Use jump animation for movement
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    playerState.velocityX = MOVE_SPEED;
    // Start jump animation from beginning if transitioning from idle
    if (!playerState.isJumping) {
      playerState.animationFrame = 0;
      playerState.animationTimer = 0;
    }
    playerState.isJumping = true; // Use jump animation for movement
  }

  // Handle jumping
  if (
    (keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]) &&
    isPlayerOnGround
  ) {
    playerState.velocityY = JUMP_FORCE;
    isPlayerOnGround = false;
    // Start jump animation from beginning
    if (!playerState.isJumping) {
      playerState.animationFrame = 0;
      playerState.animationTimer = 0;
    }
    playerState.isJumping = true;
  }

  // If not moving horizontally and on ground, use idle animation
  if (playerState.velocityX === 0 && isPlayerOnGround) {
    // Start idle animation from beginning if transitioning from jump
    if (playerState.isJumping) {
      playerState.animationFrame = 0;
      playerState.animationTimer = 0;
    }
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
    // First do a rough bounding box check for performance
    if (
      playerState.x < platform.x + platform.width &&
      playerState.x + playerState.width > platform.x &&
      playerState.y < platform.y + platform.height &&
      playerState.y + playerState.height > platform.y
    ) {
      // Then do precise blue pixel collision detection
      try {
        if (checkBluePixelCollision(platform)) {
          // Player is falling down and hits top of platform
          if (playerState.velocityY > 0 && playerState.y < platform.y) {
            playerState.y = platform.y - playerState.height;
            playerState.velocityY = 0;
            isPlayerOnGround = true;
          }
        }
      } catch (error) {
        // Fallback to bounding box collision if pixel detection fails
        console.warn(
          "Pixel collision detection failed, using bounding box:",
          error
        );
        if (playerState.velocityY > 0 && playerState.y < platform.y) {
          playerState.y = platform.y - playerState.height;
          playerState.velocityY = 0;
          isPlayerOnGround = true;
        }
      }
    }
  }
}

// Check if player is near a sign and show interaction prompt
function checkSignInteraction() {
  for (let sign of signs) {
    // Check if player is near the sign
    if (
      playerState.x < sign.x + sign.width + 20 &&
      playerState.x + playerState.width > sign.x - 20 &&
      playerState.y < sign.y + sign.height + 20 &&
      playerState.y + playerState.height > sign.y - 20
    ) {
      // Show interaction hint (you could add a visual indicator here)
      return sign.todoIndex;
    }
  }
  return -1;
}

// Check sign collision when E is pressed
function checkSignCollision() {
  for (let sign of signs) {
    // Check if player is touching the sign
    if (
      playerState.x < sign.x + sign.width &&
      playerState.x + playerState.width > sign.x &&
      playerState.y < sign.y + sign.height &&
      playerState.y + playerState.height > sign.y
    ) {
      showTodoMessage(sign.todoIndex);
      return;
    }
  }
}

function updateAnimation() {
  // Use different animation speeds for idle vs jump
  const currentAnimationSpeed = playerState.isJumping
    ? playerState.jumpAnimationSpeed
    : playerState.idleAnimationSpeed;

  playerState.animationTimer += currentAnimationSpeed;

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

  // Update animation frame and maintain consistent size
  if (playerState.isJumping) {
    player.texture = jumpTextures[Math.floor(playerState.animationFrame)];
  } else {
    player.texture = idleTextures[Math.floor(playerState.animationFrame)];
  }

  // Ensure consistent size regardless of animation
  player.width = playerState.width;
  player.height = playerState.height;
}

// Game state for key handling
let eKeyPressed = false;

// Keyboard event listeners
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  keys[e.key] = true;

  // Handle E key press for sign interaction (prevent repeat)
  if ((e.key === "e" || e.key === "E") && !eKeyPressed) {
    eKeyPressed = true;
    if (showingMessage) {
      hideTodoMessage();
    } else {
      checkSignCollision();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
  keys[e.key] = false;

  // Reset E key state
  if (e.key === "e" || e.key === "E") {
    eKeyPressed = false;
  }
});

// Start the game
init();
