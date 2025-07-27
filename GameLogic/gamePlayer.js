"use strict";

class Player extends Character {
  update() {
    // movement control
    this.moveInput = isUsingGamepad ? gamepadStick(0) : keyDirection();
    this.holdingJump = keyIsDown("ArrowUp") || gamepadIsDown(0);
    this.holdingShoot =
      (!isUsingGamepad && mouseIsDown(0)) ||
      keyIsDown("KeyZ") ||
      gamepadIsDown(2);
    this.pressingThrow =
      keyIsDown("KeyC") || mouseIsDown(1) || gamepadIsDown(1);
    this.pressedDodge = keyIsDown("KeyX") || mouseIsDown(2) || gamepadIsDown(3);
    super.update();
  }
}
