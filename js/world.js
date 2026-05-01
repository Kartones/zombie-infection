"use strict";

class World {
  constructor(mapWidth, mapHeight, panicThreshold, numEntities, soundSystem) {
    this.soundSystem = soundSystem;
    this.panicThreshold = panicThreshold || 5;

    this.width = Math.max(2, mapWidth || 0);
    this.height = Math.max(2, mapHeight || 0);

    this._initializeWorldState();
    this._addWalls();

    let amountEntities = Math.min(this.width * this.height - 2, numEntities);

    this.entities = new Array(amountEntities)
      .fill()
      .map(() => new Entity(this));
    this.entities.forEach((entity) => entity.setPosition());
    this.upgradeHumansToPolicemen();
    this.entities[0].infect();
  }

  _initializeWorldState() {
    this.worldState = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      this.worldState[y] = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        this.worldState[y][x] = ENTITY_TYPES.NONE;
      }
    }
  }

  upgradeHumansToPolicemen() {
    const maxPolicemen = Math.max(
      Config.MIN_POLICEMEN,
      Math.floor(this.entities.length * Config.MAX_POLICEMEN_PERCENTAGE)
    );

    const policemen = this.entities.filter(
      (entity) => entity.type === ENTITY_TYPES.POLICEMAN
    );

    if (policemen.length < maxPolicemen) {
      const neededPolicemen = maxPolicemen - policemen.length;
      const availableHumans = this.entities.filter(
        (entity) => entity.type === ENTITY_TYPES.HUMAN
      );

      for (
        let count = 0;
        count < neededPolicemen && count < availableHumans.length;
        count++
      ) {
        availableHumans[count].type = ENTITY_TYPES.POLICEMAN;
        availableHumans[count].render();
      }
    }
  }

  getStats() {
    let humans = 0, panicked = 0, policemen = 0, panickedPolicemen = 0, zombies = 0;
    for (const entity of this.entities) {
      if (entity.type === ENTITY_TYPES.ZOMBIE) zombies++;
      else if (entity.type === ENTITY_TYPES.POLICEMAN) {
        if (entity.activityLevel > 0) panickedPolicemen++;
        else policemen++;
      }
      else if (entity.activityLevel > 0) panicked++;
      else humans++;
    }
    return { humans, panicked, policemen, panickedPolicemen, zombies };
  }

  getEntityType(x, y) {
    return this.worldState[y][x];
  }

  setState(x, y, entityType) {
    this.worldState[y][x] = entityType;
  }

  nearLook(x, y, direction) {
    return this._look(x, y, direction, Config.NEAR_LOOK_DISTANCE);
  }

  farLook(x, y, direction) {
    return this._look(x, y, direction, Config.FAR_LOOK_DISTANCE);
  }

  humansAt(x, y) {
    let matches = this.entities
      .filter((entity) => entity.x === x && entity.y === y)
      .filter((entity) => entity.type === ENTITY_TYPES.HUMAN || entity.type === ENTITY_TYPES.POLICEMAN);
    return matches.length > 0 ? matches : undefined;
  }

  zombiesInDirection(x, y, direction, distance) {
    let zombieCount = 0;
    let checkX = x;
    let checkY = y;

    for (let index = 0; index < distance; index++) {
      switch (direction) {
        case DIRECTIONS.NORTH:
          checkY--;
          break;
        case DIRECTIONS.EAST:
          checkX++;
          break;
        case DIRECTIONS.SOUTH:
          checkY++;
          break;
        case DIRECTIONS.WEST:
          checkX--;
          break;
      }

      if (
        checkX > this.width - 1 ||
        checkX < 1 ||
        checkY > this.height - 1 ||
        checkY < 1
      ) {
        break;
      }

      const entityType = this.getEntityType(checkX, checkY);
      if (entityType === ENTITY_TYPES.ZOMBIE) {
        zombieCount++;
      }
    }

    return zombieCount;
  }

  removeZombieAt(x, y) {
    const zombieAtPos = this.entities.find(
      (entity) =>
        entity.x === x && entity.y === y && entity.type === ENTITY_TYPES.ZOMBIE
    );
    if (zombieAtPos) {
      this.setState(zombieAtPos.x, zombieAtPos.y, ENTITY_TYPES.NONE);
      this.entities = this.entities.filter((entity) => entity !== zombieAtPos);
    }
  }

  _addWalls() {
    // Fill entire map with walls
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.worldState[y][x] = ENTITY_TYPES.WALL;
      }
    }

    // Create streets in groups of 4 (stroke rectangles)
    for (let count = 0; count < Config.STREETS_COUNT; count++) {
      let rectX = Math.floor(random() * this.width);
      let rectY = Math.floor(random() * this.height);
      let rectW =
        Math.floor(random() * Config.STREET_VARIATION_SIZE) +
        Config.STREET_FIXED_SIZE;
      let rectH =
        Math.floor(random() * Config.STREET_VARIATION_SIZE) +
        Config.STREET_FIXED_SIZE;

      this._carveEmptySpace(rectX, rectY, rectW, rectH, true);
    }

    // Create open spaces (filled rectangles)
    for (let count = 0; count < Config.OPEN_SPACES_COUNT; count++) {
      let rectX = Math.floor(random() * this.width);
      let rectY = Math.floor(random() * this.height);
      let rectW =
        Math.floor(random() * Config.OPEN_SPACE_VARIATION_SIZE) +
        Config.OPEN_SPACE_FIXED_SIZE;
      let rectH =
        Math.floor(random() * Config.OPEN_SPACE_VARIATION_SIZE) +
        Config.OPEN_SPACE_FIXED_SIZE;

      this._carveEmptySpace(rectX, rectY, rectW, rectH, false);
    }
  }

  _carveEmptySpace(x, y, width, height, isStroke) {
    let startX = Math.max(0, x);
    let startY = Math.max(0, y);
    let endX = Math.min(this.width - 1, x + width);
    let endY = Math.min(this.height - 1, y + height);

    for (let cy = startY; cy <= endY; cy++) {
      for (let cx = startX; cx <= endX; cx++) {
        if (isStroke) {
          // Only carve the outline (top, bottom, left, right edges)
          if (cy === startY || cy === endY || cx === startX || cx === endX) {
            this.worldState[cy][cx] = ENTITY_TYPES.NONE;
          }
        } else {
          // carve the entire filled rectangle
          this.worldState[cy][cx] = ENTITY_TYPES.NONE;
        }
      }
    }
  }

  _look(x, y, direction, distance) {
    for (let index = 0; index < distance; index++) {
      switch (direction) {
        case DIRECTIONS.NORTH:
          y--;
          break;
        case DIRECTIONS.EAST:
          x++;
          break;
        case DIRECTIONS.SOUTH:
          y++;
          break;
        case DIRECTIONS.WEST:
          x--;
          break;
      }

      if (x > this.width - 1 || x < 1 || y > this.height - 1 || y < 1) {
        return ENTITY_TYPES.WALL;
      } else {
        const entityType = this.getEntityType(x, y);
        if (entityType === ENTITY_TYPES.WALL) {
          return ENTITY_TYPES.WALL;
        } else if (entityType === ENTITY_STATES.PANICKING) {
          return ENTITY_STATES.PANICKING;
        } else if (entityType === ENTITY_TYPES.HUMAN) {
          return ENTITY_TYPES.HUMAN;
        } else if (entityType === ENTITY_TYPES.ZOMBIE) {
          return ENTITY_TYPES.ZOMBIE;
        } else if (entityType === ENTITY_TYPES.POLICEMAN) {
          return ENTITY_TYPES.POLICEMAN;
        }
      }
    }

    return ENTITY_TYPES.NONE;
  }
}

World.prototype.SCALE_FACTOR = Config.SCALE_FACTOR;
World.prototype.ACTIVE_AMOUNT = WORLD_CONSTANTS.ACTIVE_AMOUNT;
World.prototype.DIRECTIONS = DIRECTIONS;
