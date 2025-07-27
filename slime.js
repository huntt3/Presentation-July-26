// Animate Blue Jump - no slime.png sprite sheet on #slime-canvas
const canvas = document.getElementById("slime-canvas");
if (!canvas) {
  throw new Error('Canvas element with id "slime-canvas" not found.');
}
const ctx = canvas.getContext("2d");
const sprite = new Image();
sprite.src = "./SpriteSheet/BlueSlime.png";

// Sprite sheet info
const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 32;
const FRAMES_PER_ROW = 8;
const TOTAL_ROWS = 3;
const TOTAL_FRAMES = FRAMES_PER_ROW * TOTAL_ROWS;
let frame = 0;

sprite.onload = function () {
  requestAnimationFrame(animate);
};

sprite.onerror = function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "16px Arial";
  ctx.fillStyle = "red";
  ctx.fillText("Failed to load BlueSlime.png", 10, 30);
};

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Calculate frame position
  const row = Math.floor(frame / FRAMES_PER_ROW);
  const col = frame % FRAMES_PER_ROW;
  ctx.drawImage(
    sprite,
    col * FRAME_WIDTH,
    row * FRAME_HEIGHT,
    FRAME_WIDTH,
    FRAME_HEIGHT,
    0,
    0,
    FRAME_WIDTH,
    FRAME_HEIGHT
  );
  frame = (frame + 1) % TOTAL_FRAMES;
  setTimeout(() => requestAnimationFrame(animate), 100); // ~10 FPS
}
