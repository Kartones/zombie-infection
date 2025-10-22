"use strict";

class Entity {
  constructor(world) {
    this.world = world;

    this.x = 0;
    this.y = 0;
    this.direction = this._randomDirection();
    this.type = ENTITY_TYPES.HUMAN;
    this.activityLevel = 0;
  }

  position() {
    for (let attemptOk = 0; attemptOk < 100; attemptOk++) {
      this.x = Math.floor(Math.random() * this.world.width);
      this.y = Math.floor(Math.random() * this.world.height);

      if (this.world.getEntityType(this.x, this.y) === ENTITY_TYPES.NONE) {
        attemptOk = 100;
      }
    }
    this._draw();
  }

  infect() {
    this.type = ENTITY_TYPES.ZOMBIE;
    this._draw();
  }

  bite(humans) {
    for (let human of humans) {
      human.infect();
    }
  }

  cureInfection() {
    this.type = ENTITY_TYPES.HUMAN;
    this.activityLevel = 0;

    this.world.setCell(this.x, this.y, ENTITY_TYPES.NONE);
    this.position();
  }

  move() {
    let rand = Math.floor(Math.random() * 10);

    if (
      (this.type === ENTITY_TYPES.HUMAN &&
        (this.activityLevel > 0 || rand > this.world.panicThreshold)) ||
      (this.type === ENTITY_TYPES.ZOMBIE && rand === 1)
    ) {
      if (
        this.world.nearLook(this.x, this.y, this.direction) === TARGETS.NOTHING
      ) {
        this.world.setCell(this.x, this.y, ENTITY_TYPES.NONE);
        switch (this.direction) {
          case DIRECTIONS.NORTH:
            this.y--;
            break;
          case DIRECTIONS.EAST:
            this.x++;
            break;
          case DIRECTIONS.SOUTH:
            this.y++;
            break;
          case DIRECTIONS.WEST:
            this.x--;
            break;
        }
      } else {
        this.direction = this._randomDirection();
      }

      this._draw();

      if (this.activityLevel > 0) {
        this.activityLevel--;
      }
    }

    let target = this.world.farLook(this.x, this.y, this.direction);

    if (this.type === ENTITY_TYPES.ZOMBIE) {
      if (target === TARGETS.HUMAN || target === TARGETS.HUMAN_PANIC) {
        this.activityLevel = WORLD_CONSTANTS.ACTIVE_AMOUNT;
      }

      if (this.activityLevel === 0 && target !== TARGETS.ZOMBIE) {
        this.direction = this._randomDirection();
      }

      let victim = this.world.nearLook(this.x, this.y, this.direction);
      if (victim === TARGETS.HUMAN || victim === TARGETS.HUMAN_PANIC) {
        let dx = this.x,
          dy = this.y;

        switch (this.direction) {
          case DIRECTIONS.NORTH:
            dy--;
            break;
          case DIRECTIONS.EAST:
            dx++;
            break;
          case DIRECTIONS.SOUTH:
            dy++;
            break;
          case DIRECTIONS.WEST:
            dx--;
            break;
        }

        let humansAtPosition = this.world.humansAt(dx, dy);
        if (humansAtPosition) {
          this.bite(humansAtPosition);
        }
      }
    } else {
      if (target === TARGETS.ZOMBIE || target === TARGETS.HUMAN_PANIC) {
        this.activityLevel = WORLD_CONSTANTS.ACTIVE_AMOUNT;
      }

      if (target === TARGETS.ZOMBIE) {
        this.direction += 2;
        if (this.direction > 4) {
          this.direction -= 4;
        }
      }

      if (Math.floor(Math.random() * 8) === 1) {
        this.direction = this._randomDirection();
      }
    }
  }

  _randomDirection() {
    return Math.floor(Math.random() * 4) + 1;
  }

  _draw() {
    if (this.type === ENTITY_TYPES.ZOMBIE) {
      this.world.setCell(this.x, this.y, ENTITY_TYPES.ZOMBIE);
    } else if (this.activityLevel > 0) {
      this.world.setCell(this.x, this.y, ENTITY_TYPES.HUMAN_PANIC);
    } else {
      this.world.setCell(this.x, this.y, ENTITY_TYPES.HUMAN);
    }
  }
}

Entity.prototype.TYPE_ZOMBIE = ENTITY_TYPES.ZOMBIE;
Entity.prototype.TYPE_HUMAN = ENTITY_TYPES.HUMAN;
