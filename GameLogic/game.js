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

    // Set up a function to resize the canvas and app to fill the viewport
    function resizeGameToViewport() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      app.renderer.resize(width, height);
      // Resize all background layers if present
      for (const child of app.stage.children) {
        if (
          child.texture &&
          child.texture.baseTexture &&
          child.zIndex >= 0 &&
          child.zIndex <= 3
        ) {
          child.width = width;
          child.height = height;
        }
      }
    }

    // Initialize the application with full viewport size
    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x87ceeb, // Sky blue background
      canvas: canvas,
    });

    // Listen for window resize events
    window.addEventListener("resize", resizeGameToViewport);
    // Initial resize
    resizeGameToViewport();

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

    // Load background cloud layers (parallax)
    const cloudLayer1 = await PIXI.Assets.load("./background/Clouds 7/1.png");
    const cloudLayer2 = await PIXI.Assets.load("./background/Clouds 7/2.png");
    const cloudLayer3 = await PIXI.Assets.load("./background/Clouds 7/3.png");
    const cloudLayer4 = await PIXI.Assets.load("./background/Clouds 7/4.png");

    // Create and add background layers (furthest to closest)
    addBackgroundLayer(cloudLayer1, 0);
    addBackgroundLayer(cloudLayer2, 1);
    addBackgroundLayer(cloudLayer3, 2);
    addBackgroundLayer(cloudLayer4, 3);

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
    // Add a background layer to the stage, stretched to fill the canvas
    function addBackgroundLayer(texture, zIndex) {
      const bg = new PIXI.Sprite(texture);
      bg.x = 0;
      bg.y = 0;
      bg.width = app.screen.width;
      bg.height = app.screen.height;
      bg.zIndex = zIndex;
      bg.anchor = { x: 0, y: 0 };
      app.stage.addChildAt(bg, zIndex);
    }

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
          // Make crate smaller than tile size so it can fall through gaps
          const crateSize = TILE_SIZE * 0.8; // 80% of tile size
          const offset = (TILE_SIZE - crateSize) / 2; // Center the crate in the tile

          const crate = {
            x: x * TILE_SIZE + offset,
            y: y * TILE_SIZE + offset,
            width: crateSize,
            height: crateSize,
            velocityX: 0,
            velocityY: 0,
            sprite: new PIXI.Sprite(crateTexture),
          };
          crate.sprite.x = crate.x;
          crate.sprite.y = crate.y;
          crate.sprite.width = crateSize;
          crate.sprite.height = crateSize;
          app.stage.addChild(crate.sprite);
          crates.push(crate);
        }
      }
    }

    // Add header content to the game canvas using PIXI.Text
    addHeaderToCanvas();

    // Create player
    createPlayer();

    // Create color detection canvas
    createColorDetectionCanvas();

    // Create message container
    createMessageContainer();

    // Start game loop
    app.ticker.add(gameLoop);
    // Add header content to the game canvas using PIXI.Text
    function addHeaderToCanvas() {
      // Main title
      const titleText = new PIXI.Text("Web Development for Everyone", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontWeight: "bold",
        fontSize: 38,
        fill: 0xffffff,
        align: "center",
        dropShadow: true,
        dropShadowColor: "#000000",
        dropShadowBlur: 4,
        dropShadowDistance: 2,
      });
      titleText.x = (app.screen.width - titleText.width) / 2;
      titleText.y = 12;
      titleText.accessible = true;
      titleText.accessibleTitle = "Main Title";
      app.stage.addChild(titleText);

      // Subtitle
      const subtitleText = new PIXI.Text("Week 4 | LiveLab 8", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontWeight: "bold",
        fontSize: 24,
        fill: 0xcccccc,
        align: "center",
        dropShadow: true,
        dropShadowColor: "#000000",
        dropShadowBlur: 2,
        dropShadowDistance: 1,
      });
      subtitleText.x = (app.screen.width - subtitleText.width) / 2;
      subtitleText.y = titleText.y + titleText.height + 2;
      subtitleText.accessible = true;
      subtitleText.accessibleTitle = "Subtitle";
      app.stage.addChild(subtitleText);
    }
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
  const dateText = new PIXI.Text(`${todo.date}`, {
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

  // Add to container
  messageContainer.removeChildren();
  messageContainer.addChild(background);
  messageContainer.addChild(titleText);
  messageContainer.addChild(dateText);
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
      // Apply reduced gravity for slower acceleration
      crate.velocityY += GRAVITY * 0.6; // 60% of normal gravity

      // Horizontal movement: check if player is pushing (more precise collision)
      const playerPushMargin = 5; // Small margin for push detection
      if (
        playerState.x + playerState.width > crate.x - playerPushMargin &&
        playerState.x < crate.x + crate.width + playerPushMargin &&
        playerState.y + playerState.height > crate.y + 10 && // Only push if player is mostly above crate
        playerState.y < crate.y + crate.height - 10
      ) {
        // Player is touching crate horizontally and moving
        if (Math.abs(playerState.velocityX) > 0.1) {
          // Gradual acceleration instead of instant velocity transfer
          const pushForce = playerState.velocityX * 0.3; // Reduced push force
          crate.velocityX += pushForce * 0.2; // Gradual acceleration
          // Cap the maximum velocity
          const maxVelocity = 3;
          crate.velocityX = Math.max(
            -maxVelocity,
            Math.min(maxVelocity, crate.velocityX)
          );
        }
      } else {
        // If not being pushed, apply stronger friction
        crate.velocityX *= 0.9;
      }

      // Apply friction to crate
      if (Math.abs(crate.velocityX) < 0.1) crate.velocityX = 0;

      // Update crate position
      crate.x += crate.velocityX;
      crate.y += crate.velocityY;

      // Collide with platforms (stand on platforms)
      for (const platform of platforms) {
        if (
          crate.x + crate.width > platform.x &&
          crate.x < platform.x + platform.width &&
          crate.y + crate.height > platform.y &&
          crate.y + crate.height - crate.velocityY <= platform.y + 5 // Small tolerance
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
          crate.x + crate.width > other.x &&
          crate.x < other.x + other.width &&
          crate.y + crate.height > other.y &&
          crate.y + crate.height - crate.velocityY <= other.y + 5
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
      if (crate.x < 0) {
        crate.x = 0;
        crate.velocityX = 0;
      }
      if (crate.x + crate.width > app.screen.width) {
        crate.x = app.screen.width - crate.width;
        crate.velocityX = 0;
      }

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

  // Check collision with platforms
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

  // Check collision with crates
  for (let crate of crates) {
    if (
      playerState.x < crate.x + crate.width &&
      playerState.x + playerState.width > crate.x &&
      playerState.y < crate.y + crate.height &&
      playerState.y + playerState.height > crate.y
    ) {
      // Calculate overlap amounts
      const overlapLeft = playerState.x + playerState.width - crate.x;
      const overlapRight = crate.x + crate.width - playerState.x;
      const overlapTop = playerState.y + playerState.height - crate.y;
      const overlapBottom = crate.y + crate.height - playerState.y;

      // Find the smallest overlap to determine collision direction
      const minOverlap = Math.min(
        overlapLeft,
        overlapRight,
        overlapTop,
        overlapBottom
      );

      if (minOverlap === overlapTop && playerState.velocityY > 0) {
        // Player is landing on top of crate
        playerState.y = crate.y - playerState.height;
        playerState.velocityY = 0;
        isPlayerOnGround = true;
      } else if (minOverlap === overlapBottom && playerState.velocityY < 0) {
        // Player hits crate from below
        playerState.y = crate.y + crate.height;
        playerState.velocityY = 0;
      } else if (minOverlap === overlapLeft && playerState.velocityX > 0) {
        // Player hits crate from the left
        playerState.x = crate.x - playerState.width;
        playerState.velocityX = 0;
      } else if (minOverlap === overlapRight && playerState.velocityX < 0) {
        // Player hits crate from the right
        playerState.x = crate.x + crate.width;
        playerState.velocityX = 0;
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
