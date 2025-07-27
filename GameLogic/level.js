// Level Editor and Tile System for PIXI.js Platformer Game

// Tile type definitions - following your specification
const TILE_TYPES = {
  EMPTY: 0, // No tile (background)
  PLATFORM: 1, // Regular platform tile (tile_020.png)
  SIGN: 2, // Sign tile (tile_052.png)
  CRATE: 3, // Crate tile (not implemented yet - placeholder)
};

// Tile size in pixels (should match game.js)
const TILE_SIZE = 64;

// Default level dimensions (grid-based)
const LEVEL_WIDTH = 25; // Number of tiles wide
const LEVEL_HEIGHT = 15; // Number of tiles tall

// Current level data - simple 2D array
let currentLevelData = [];

// Initialize empty level
function initializeEmptyLevel() {
  currentLevelData = [];
  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      row.push(TILE_TYPES.EMPTY);
    }
    currentLevelData.push(row);
  }
  console.log("Initialized empty level:", LEVEL_WIDTH, "x", LEVEL_HEIGHT);
}

// Create a sample level with platforms and signs
function createSampleLevel() {
  // Set up a single row of 36 platform tiles near the bottom (but not at the very bottom)
  const platformCount = 36;
  const platformRow = LEVEL_HEIGHT - 3; // Place platforms 3 rows from the bottom
  initializeEmptyLevel();
  for (let x = 0; x < platformCount; x++) {
    // Place platforms on row 3 from bottom
    currentLevelData[platformRow][x] = TILE_TYPES.PLATFORM;
  }

  // Remove the 7th tile (index 6)
  currentLevelData[platformRow][6] = TILE_TYPES.EMPTY;

  // Place a crate (box) above the 5th tile (index 4)
  currentLevelData[platformRow - 1][4] = TILE_TYPES.CRATE;

  // Place signs directly above the specified tiles (adjusted for removed 7th tile)
  const signTiles = [1, 10, 15, 17, 20]; // 0-based indices for 7th, 15th, 22nd, 26th, 29th
  for (const x of signTiles) {
    currentLevelData[platformRow - 1][x] = TILE_TYPES.SIGN;
  }

  console.log(
    "Created custom sample level with 36 platforms, 5 signs, and 1 crate"
  );
}

// Get tile at specific grid position
function getTileAt(gridX, gridY) {
  if (gridX < 0 || gridX >= LEVEL_WIDTH || gridY < 0 || gridY >= LEVEL_HEIGHT) {
    return TILE_TYPES.EMPTY;
  }
  return currentLevelData[gridY][gridX];
}

// Set tile at specific grid position
function setTileAt(gridX, gridY, tileType) {
  if (gridX < 0 || gridX >= LEVEL_WIDTH || gridY < 0 || gridY >= LEVEL_HEIGHT) {
    return false;
  }
  currentLevelData[gridY][gridX] = tileType;
  return true;
}

// Convert world position to grid position
function worldToGrid(worldX, worldY, tileSize) {
  return {
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize),
  };
}

// Convert grid position to world position
function gridToWorld(gridX, gridY, tileSize) {
  return {
    x: gridX * tileSize,
    y: gridY * tileSize,
  };
}

// Get level data as a string for saving/loading
function getLevelDataString() {
  return JSON.stringify(
    {
      width: LEVEL_WIDTH,
      height: LEVEL_HEIGHT,
      data: currentLevelData,
    },
    null,
    2
  );
}

// Load level data from string
function loadLevelDataFromString(dataString) {
  try {
    const levelData = JSON.parse(dataString);
    if (levelData.width && levelData.height && levelData.data) {
      currentLevelData = levelData.data;
      console.log("Loaded level data:", levelData.width, "x", levelData.height);
      return true;
    }
  } catch (error) {
    console.error("Error loading level data:", error);
  }
  return false;
}

// Get platforms array for collision detection (for compatibility with existing game)
function getPlatformsFromLevel(tileSize) {
  const platforms = [];

  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      const tileType = currentLevelData[y][x];
      if (tileType === TILE_TYPES.PLATFORM) {
        const worldPos = gridToWorld(x, y, tileSize);
        platforms.push({
          x: worldPos.x,
          y: worldPos.y,
          width: tileSize,
          height: tileSize,
        });
      }
    }
  }

  return platforms;
}

// Get signs array for interaction (for compatibility with existing game)
function getSignsFromLevel(tileSize) {
  const signs = [];
  let signIndex = 0;

  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      const tileType = currentLevelData[y][x];
      if (tileType === TILE_TYPES.SIGN) {
        const worldPos = gridToWorld(x, y, tileSize);
        signs.push({
          x: worldPos.x,
          y: worldPos.y,
          width: tileSize,
          height: tileSize,
          todoIndex: signIndex % 5, // Cycle through available TODO items
        });
        signIndex++;
      }
    }
  }

  return signs;
}

// Level Editor Functions
class LevelEditor {
  constructor() {
    this.isEnabled = false;
    this.currentTileType = TILE_TYPES.PLATFORM;
    this.isMouseDown = false;
  }

  enable() {
    this.isEnabled = true;
    console.log("Level editor enabled");
  }

  disable() {
    this.isEnabled = false;
    this.isMouseDown = false;
    console.log("Level editor disabled");
  }

  setCurrentTileType(tileType) {
    this.currentTileType = tileType;
    console.log("Set current tile type to:", tileType);
  }

  handleMouseDown(worldX, worldY, tileSize) {
    if (!this.isEnabled) return false;

    this.isMouseDown = true;
    return this.placeTile(worldX, worldY, tileSize);
  }

  handleMouseUp() {
    this.isMouseDown = false;
  }

  handleMouseMove(worldX, worldY, tileSize) {
    if (!this.isEnabled || !this.isMouseDown) return false;

    return this.placeTile(worldX, worldY, tileSize);
  }

  placeTile(worldX, worldY, tileSize) {
    const gridPos = worldToGrid(worldX, worldY, tileSize);

    // Only place if the tile type is different
    if (getTileAt(gridPos.x, gridPos.y) !== this.currentTileType) {
      setTileAt(gridPos.x, gridPos.y, this.currentTileType);
      console.log(
        `Placed tile ${this.currentTileType} at grid (${gridPos.x}, ${gridPos.y})`
      );
      return true; // Indicates level needs to be redrawn
    }

    return false;
  }
}

// Create global level editor instance
const levelEditor = new LevelEditor();

// Export all functions and variables for use in other files (ES module syntax)
export {
  TILE_SIZE,
  TILE_TYPES,
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  currentLevelData,
  initializeEmptyLevel,
  createSampleLevel,
  getTileAt,
  setTileAt,
  worldToGrid,
  gridToWorld,
  getLevelDataString,
  loadLevelDataFromString,
  getPlatformsFromLevel,
  getSignsFromLevel,
  LevelEditor,
  levelEditor,
};
