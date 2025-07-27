// Simple Platformer Game using PIXI.js and modular tile/grid system
import {
  TILE_SIZE,
  TILE_TYPES,
  createSampleLevel,
  getPlatformsFromLevel,
  getSignsFromLevel,
  currentLevelData,
  initializeEmptyLevel,
} from "./level.js";

const app = new PIXI.Application();

// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 8;

// Game state
let keys = {};
let player;
let platforms = [];
let signs = [];
let crates = [];
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

    // Calculate game dimensions to fit the full level grid
    const gameWidth = TILE_SIZE * 25; // LEVEL_WIDTH
    const gameHeight = TILE_SIZE * 15; // LEVEL_HEIGHT

    // Set canvas size directly for pixel-perfect fit
    canvas.width = gameWidth;
    canvas.height = gameHeight;
    // Remove forced stretching; let CSS handle scaling for responsiveness
    canvas.style.width = "";
    canvas.style.height = "";

    // Initialize the application with settings
    await app.init({
      width: gameWidth,
      height: gameHeight,
      backgroundColor: 0x87ceeb, // Sky blue background
      canvas: canvas,
    });

    // Load TODO data
    await loadTodoData();

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

    // Load platform, sign, and crate textures
    const platformTexture = await PIXI.Assets.load(
      "./tiles/world_tileset/tile_020.png"
    );
    const signTexture = await PIXI.Assets.load(
      "./tiles/world_tileset/tile_052.png"
    );
    const crateTexture = await PIXI.Assets.load(
      "./tiles/world_tileset/tile_051.png"
    );

    // Create level data (36 platform tiles, signs above specific tiles)
    createSampleLevel();
    // Defensive: ensure currentLevelData is initialized
    if (
      !currentLevelData ||
      !Array.isArray(currentLevelData) ||
      !currentLevelData[0]
    ) {
      if (typeof initializeEmptyLevel === "function") {
        initializeEmptyLevel();
      }
    }

    // Get platform and sign positions from level data
    const platformPositions = getPlatformsFromLevel(TILE_SIZE);
    const signPositions = getSignsFromLevel(TILE_SIZE);

    // Clear arrays
    platforms = [];
    signs = [];
    crates = [];

    // Add platform sprites to stage and store positions for collision
    for (const pos of platformPositions) {
      const sprite = new PIXI.Sprite(platformTexture);
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.width = pos.width;
      sprite.height = pos.height;
      app.stage.addChild(sprite);
      platforms.push({
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      });
    }

    // Add sign sprites to stage and store positions for interaction
    for (const [i, pos] of signPositions.entries()) {
      const sprite = new PIXI.Sprite(signTexture);
      sprite.x = pos.x;
      sprite.y = pos.y;
      sprite.width = pos.width;
      sprite.height = pos.height;
      app.stage.addChild(sprite);
      signs.push({
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        todoIndex: pos.todoIndex,
      });
    }

    // Add crate sprites to stage and store crate objects
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 36; x++) {
        if (
          typeof currentLevelData[y] !== "undefined" &&
          currentLevelData[y][x] === TILE_TYPES.CRATE
        ) {
          const crate = {
            x: x * TILE_SIZE,
            y: y * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
            velocityX: 0,
            velocityY: 0,
            sprite: new PIXI.Sprite(crateTexture),
          };
          crate.sprite.x = crate.x;
          crate.sprite.y = crate.y;
          crate.sprite.width = TILE_SIZE;
          crate.sprite.height = TILE_SIZE;
          app.stage.addChild(crate.sprite);
          crates.push(crate);
        }
      }
    }

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

// Platforms are now created from level data using getPlatformsFromLevel()

// Signs are now created from level data using getSignsFromLevel()

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

  // Create background that fills most of the sky area, but leaves room for signs
  const skyHeight = app.screen.height - TILE_SIZE * 3; // Leave more space for signs
  const background = new PIXI.Graphics();
  background.beginFill(0x000000, 0.85);
  background.drawRoundedRect(0, 0, app.screen.width, skyHeight, 28);
  background.endFill();
  background.x = 0;
  background.y = 0;

  // Slightly smaller, bold title text
  const titleText = new PIXI.Text(todo.title, {
    fontFamily: "Arial Black, Arial, sans-serif",
    fontWeight: "bold",
    fontSize: Math.max(32, app.screen.width * 0.035),
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: app.screen.width * 0.85,
    align: "center",
  });
  titleText.x = (app.screen.width - titleText.width) / 2;
  titleText.y = skyHeight * 0.18;

  // Slightly smaller date text
  const dateText = new PIXI.Text(`Due: ${todo.date}`, {
    fontFamily: "Arial Black, Arial, sans-serif",
    fontWeight: "bold",
    fontSize: Math.max(24, app.screen.width * 0.025),
    fill: 0xffff00,
    wordWrap: true,
    wordWrapWidth: app.screen.width * 0.7,
    align: "center",
  });
  dateText.x = (app.screen.width - dateText.width) / 2;
  dateText.y = titleText.y + titleText.height + 24;

  // Slightly smaller instruction text
  const instructionText = new PIXI.Text("Press E to close", {
    fontFamily: "Arial Black, Arial, sans-serif",
    fontWeight: "bold",
    fontSize: Math.max(20, app.screen.width * 0.02),
    fill: 0xcccccc,
    align: "center",
  });
  instructionText.x = (app.screen.width - instructionText.width) / 2;
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
  updateCrates();
  updateAnimation();
  checkCollisions();
  checkSignInteraction();
  updatePlayerSprite();
  // Update crate physics and handle player pushing
  function updateCrates() {
    for (const crate of crates) {
      // Apply gravity
      crate.velocityY += GRAVITY;

      // Horizontal movement: check if player is pushing
      if (
        playerState.x + playerState.width > crate.x &&
        playerState.x < crate.x + crate.width &&
        playerState.y + playerState.height > crate.y &&
        playerState.y < crate.y + crate.height
      ) {
        // Player is touching crate horizontally
        if (playerState.velocityX !== 0) {
          crate.velocityX = playerState.velocityX;
        }
      }

      // Apply friction to crate
      crate.velocityX *= 0.8;
      if (Math.abs(crate.velocityX) < 0.1) crate.velocityX = 0;

      // Update crate position
      crate.x += crate.velocityX;
      crate.y += crate.velocityY;

      // Collide with platforms (stand on platforms)
      for (const platform of platforms) {
        if (
          crate.x < platform.x + platform.width &&
          crate.x + crate.width > platform.x &&
          crate.y + crate.height > platform.y &&
          crate.y + crate.height - crate.velocityY <= platform.y
        ) {
          // Land on top of platform
          crate.y = platform.y - crate.height;
          crate.velocityY = 0;
        }
      }

      // Collide with other crates (stacking)
      for (const other of crates) {
        if (other === crate) continue;
        if (
          crate.x < other.x + other.width &&
          crate.x + crate.width > other.x &&
          crate.y + crate.height > other.y &&
          crate.y + crate.height - crate.velocityY <= other.y
        ) {
          crate.y = other.y - crate.height;
          crate.velocityY = 0;
        }
      }

      // Prevent crate from falling below the screen
      if (crate.y + crate.height > app.screen.height) {
        crate.y = app.screen.height - crate.height;
        crate.velocityY = 0;
      }

      // Prevent crate from going out of bounds horizontally
      if (crate.x < 0) crate.x = 0;
      if (crate.x + crate.width > app.screen.width)
        crate.x = app.screen.width - crate.width;

      // Update sprite position
      crate.sprite.x = crate.x;
      crate.sprite.y = crate.y;
    }
  }
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
  // Update player sprite position (show 1 pixel lower for visual alignment)
  player.x = playerState.x;
  player.y = playerState.y + 5;

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
