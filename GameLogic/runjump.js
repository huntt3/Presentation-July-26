"use strict";

// Enable touch gamepad on touch devices

let player;
let groundTiles = [];

function gameInit() {
  gravity = -0.02;
  cameraScale = 8 * 8;
  // Create a simple ground platform using world_tileset.png
  for (let x = 0; x < 8; ++x) {
    let tileObj = new EngineObject(
      vec2(x - 3.5, -2),
      vec2(1, 1),
      tile(x, 32, 0, 1, "world_tileset.png")
    );
    tileObj.mass = 0; // Make it static
    groundTiles.push(tileObj);
  }
  // Create player
  player = new Player(vec2(0, 0));
}

function gameUpdate() {
  // No extra logic needed for this simple platformer
}

function getCameraTarget() {
  return player.pos;
}

function gameUpdatePost() {
  cameraPos = cameraPos.lerp(getCameraTarget(), 0.1);
}

function gameRender() {}

function gameRenderPost() {}

// Player class using EngineObject from littlejsengine
class Player extends EngineObject {
  constructor(pos) {
    super(pos, vec2(1, 1), tile(0, 32, 0, 1, "BlueSlime.png"));
    this.velocity = vec2(0, 0);
    this.onGround = false;
    this.frame = 0;
    this.frameTimer = 0;
    this.mirror = false;
  }

  update() {
    let move = 0;
    if (keyIsDown("ArrowLeft")) move -= 1;
    if (keyIsDown("ArrowRight")) move += 1;
    this.mirror = move < 0;
    this.velocity.x = move * 0.12;
    if (this.onGround && keyWasPressed("Space")) {
      this.velocity.y = 0.45;
    }
    this.velocity.y += gravity;
    this.pos = this.pos.add(this.velocity);
    // Simple ground collision
    if (this.pos.y < -1.5) {
      this.pos.y = -1.5;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    // Animate: walk cycles through BlueSlime.png, idle cycles through BlueSlimeIdle.png
    const FRAMES_PER_ROW = 8;
    const TOTAL_ROWS = 3;
    const TOTAL_FRAMES = FRAMES_PER_ROW * TOTAL_ROWS;
    const IDLE_FRAMES = 8; // Assume 1 row of 8 frames for idle
    this.frameTimer += 1;
    if (Math.abs(move) > 0.1 && this.onGround) {
      if (this.frameTimer > 6) {
        this.frame = (this.frame + 1) % TOTAL_FRAMES;
        this.frameTimer = 0;
      }
      this.isIdle = false;
    } else {
      if (this.frameTimer > 10) {
        this.frame = (this.frame + 1) % IDLE_FRAMES;
        this.frameTimer = 0;
      }
      this.isIdle = true;
    }
  }

  render() {
    // Draw the player using the correct frame from the correct sprite sheet
    const FRAMES_PER_ROW = 8;
    let col, row, spriteSheet, tileSheet;
    if (this.isIdle) {
      // Idle: BlueSlimeIdle.png, 1 row
      col = this.frame % FRAMES_PER_ROW;
      row = 0;
      spriteSheet = "BlueSlimeIdle.png";
      tileSheet = "world_tileset.png";
    } else {
      // Walking: BlueSlime.png, 3 rows
      col = this.frame % FRAMES_PER_ROW;
      row = Math.floor(this.frame / FRAMES_PER_ROW);
      spriteSheet = "BlueSlime.png";
    }
    drawTile(
      this.pos,
      this.size,
      tile(vec2(col, row), 32, 0, 1, tileSheet),
      undefined,
      0,
      this.mirror
    );
  }
}

// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [
  "BlueSlime.png",
  "world_tileset.png",
]);
