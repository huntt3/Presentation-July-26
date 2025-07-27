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
    // Animate
    this.frameTimer += 1;
    if (Math.abs(move) > 0.1 && this.onGround) {
      if (this.frameTimer > 6) {
        this.frame = (this.frame + 1) % 8;
        this.frameTimer = 0;
      }
    } else {
      this.frame = 0;
      this.frameTimer = 0;
    }
  }

  render() {
    // Draw the player using the correct frame from BlueSlime.png (littlejsengine)
    drawTile(
      this.pos,
      this.size,
      tile(this.frame, 32, 0, 1, "BlueSlime.png"),
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
