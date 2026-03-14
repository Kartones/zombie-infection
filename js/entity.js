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

  setPosition() {
    for (let attemptOk = 0; attemptOk < 100; attemptOk++) {
      this.x = Math.floor(random() * this.world.width);
      this.y = Math.floor(random() * this.world.height);

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
    if (this.type !== ENTITY_TYPES.ZOMBIE) {
      return;
    }
    for (let human of humans) {
      human.infect();
    }
    soundSystem.playBite();
  }

  cureInfectionAndReposition() {
    this.type = ENTITY_TYPES.HUMAN;
    this.activityLevel = 0;

    this.world.setState(this.x, this.y, ENTITY_TYPES.NONE);
    this.setPosition();
  }

  move() {
    const rand = Math.floor(random() * GAME_CONSTANTS.MOVEMENT_RANDOM_FACTOR);

    if (this._shouldMove(rand)) {
      this._executeMove();
    }

    if (this.type === ENTITY_TYPES.ZOMBIE) {
      this._moveZombie();
    } else if (this.type === ENTITY_TYPES.POLICEMAN) {
      this._movePoliceman();
    } else {
      this._moveHuman();
    }
  }

  _shouldMove(rand) {
    if (this.type === ENTITY_TYPES.ZOMBIE) {
      return rand === GAME_CONSTANTS.ZOMBIE_MOVE_CHANCE;
    }
    return this.activityLevel > 0 || rand > this.world.panicThreshold;
  }

  _executeMove() {
    if (
      this.world.nearLook(this.x, this.y, this.direction) === ENTITY_TYPES.NONE
    ) {
      this.world.setState(this.x, this.y, ENTITY_TYPES.NONE);
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

  _moveZombie() {
    const target = this.world.farLook(this.x, this.y, this.direction);

    if (target === ENTITY_TYPES.HUMAN || target === ENTITY_TYPES.HUMAN_PANIC) {
      this.activityLevel = WORLD_CONSTANTS.ACTIVE_AMOUNT;
    }

    if (this.activityLevel === 0 && target !== ENTITY_TYPES.ZOMBIE) {
      this.direction = this._randomDirection();
    }

    const victim = this.world.nearLook(this.x, this.y, this.direction);
    if (victim === ENTITY_TYPES.HUMAN || victim === ENTITY_TYPES.HUMAN_PANIC) {
      let dx = this.x;
      let dy = this.y;

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

      const humansAtPosition = this.world.humansAt(dx, dy);
      if (humansAtPosition) {
        this.bite(humansAtPosition);
      }
    }
  }

  _movePoliceman() {
    const zombieCount = this.world.zombiesInDirection(
      this.x,
      this.y,
      this.direction,
      ENTITY_CONSTANTS.SHOT_VIEW_DISTANCE
    );

    if (zombieCount === 1) {
      if (random() < Config.POLICEMAN_SHOT_ACCURACY) {
        this._shootZombie(this.type);
      }
      this.activityLevel = WORLD_CONSTANTS.ACTIVE_AMOUNT;
    } else if (zombieCount > 1) {
      this.activityLevel = WORLD_CONSTANTS.ACTIVE_AMOUNT;
      this.direction += 2;
      if (this.direction > 4) {
        this.direction -= 4;
      }
    }

    if (Math.floor(random() * 8) === 1) {
      this.direction = this._randomDirection();
    }
  }

  _moveHuman() {
    const target = this.world.farLook(this.x, this.y, this.direction);

    if (
      target === ENTITY_TYPES.ZOMBIE ||
      target === ENTITY_TYPES.HUMAN_PANIC
    ) {
      this.activityLevel = WORLD_CONSTANTS.ACTIVE_AMOUNT;
    }

    if (target === ENTITY_TYPES.ZOMBIE) {
      this.direction += 2;
      if (this.direction > 4) {
        this.direction -= 4;
      }
    }

    if (Math.floor(random() * 8) === 1) {
      this.direction = this._randomDirection();
    }
  }

  _randomDirection() {
    return Math.floor(random() * 4) + 1;
  }

  _draw() {
    if (this.type === ENTITY_TYPES.ZOMBIE) {
      this.world.setState(this.x, this.y, ENTITY_TYPES.ZOMBIE);
    } else if (this.type === ENTITY_TYPES.POLICEMAN) {
      this.world.setState(this.x, this.y, ENTITY_TYPES.POLICEMAN);
    } else if (this.activityLevel > 0) {
      this.world.setState(this.x, this.y, ENTITY_TYPES.HUMAN_PANIC);
    } else {
      this.world.setState(this.x, this.y, ENTITY_TYPES.HUMAN);
    }
  }

  _shootZombie(entityType) {
    let shootDistance = 0;
    if (entityType === ENTITY_TYPES.POLICEMAN) {
      shootDistance = ENTITY_CONSTANTS.SHOOT_PISTOL_DISTANCE;
    }

    let shootX = this.x;
    let shootY = this.y;

    for (let distance = 0; distance < shootDistance; distance++) {
      switch (this.direction) {
        case DIRECTIONS.NORTH:
          shootY--;
          break;
        case DIRECTIONS.EAST:
          shootX++;
          break;
        case DIRECTIONS.SOUTH:
          shootY++;
          break;
        case DIRECTIONS.WEST:
          shootX--;
          break;
      }

      if (
        shootX > this.world.width - 1 ||
        shootX < 1 ||
        shootY > this.world.height - 1 ||
        shootY < 1
      ) {
        break;
      }

      const entityType = this.world.getEntityType(shootX, shootY);
      if (entityType === ENTITY_TYPES.ZOMBIE) {
        this.world.removeZombieAt(shootX, shootY);
        soundSystem.playShot();
        break;
      }
    }
  }
}

Entity.prototype.TYPE_ZOMBIE = ENTITY_TYPES.ZOMBIE;
Entity.prototype.TYPE_HUMAN = ENTITY_TYPES.HUMAN;
Entity.prototype.TYPE_POLICEMAN = ENTITY_TYPES.POLICEMAN;
