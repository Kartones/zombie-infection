"use strict";

class World {
  constructor(canvasNodeId, mapWidth, mapHeight, panicThreshold, numEntities) {
    this.panicThreshold = panicThreshold || 5;

    this.canvas = document.getElementById(canvasNodeId);

    this.canvasContext = this.canvas.getContext("2d");

    this.canvasContext.scale(
      WORLD_CONSTANTS.SCALE_FACTOR,
      WORLD_CONSTANTS.SCALE_FACTOR
    );

    this.width = Math.max(2, mapWidth || 0);
    this.height = Math.max(2, mapHeight || 0);

    this.scaledWidth = this.width * WORLD_CONSTANTS.SCALE_FACTOR;
    this.scaledHeight = this.height * WORLD_CONSTANTS.SCALE_FACTOR;

    this.canvas.width = this.scaledWidth;
    this.canvas.height = this.scaledHeight;

    this.canvasContext.imageSmoothingEnabled = false;

    this.computedColors = {};
    for (let color of [
      COLORS.EMPTY,
      COLORS.HUMAN,
      COLORS.HUMAN_PANIC,
      COLORS.ZOMBIE,
      COLORS.POLICEMAN,
    ]) {
      let colorComponents = new Array();
      for (
        let pixelNum = 0;
        pixelNum < WORLD_CONSTANTS.SCALE_FACTOR * WORLD_CONSTANTS.SCALE_FACTOR;
        pixelNum++
      ) {
        colorComponents = colorComponents.concat([...color, 255]);
      }
      let pixels = new ImageData(
        Uint8ClampedArray.from(colorComponents),
        WORLD_CONSTANTS.SCALE_FACTOR
      );
      this.computedColors[color] = pixels;
    }

    this.computedColors[COLORS.WALL] =
      this.computedColors[COLORS.WALL] ||
      (() => {
        let colorComponents = new Array();
        for (
          let pixelNum = 0;
          pixelNum <
          WORLD_CONSTANTS.SCALE_FACTOR * WORLD_CONSTANTS.SCALE_FACTOR;
          pixelNum++
        ) {
          colorComponents = colorComponents.concat([...COLORS.WALL, 255]);
        }
        return new ImageData(
          Uint8ClampedArray.from(colorComponents),
          WORLD_CONSTANTS.SCALE_FACTOR
        );
      })();

    this._initializeWorldState();
    this._addWalls();

    let amountEntities = Math.min(this.width * this.height - 2, numEntities);

    this.entities = new Array(amountEntities)
      .fill()
      .map(() => new Entity(this));
    this.entities.forEach((entity) => entity.position());
    this._convertToPolicemen();
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

  _convertToPolicemen() {
    const maxPolicemen = Math.max(
      GAME_CONSTANTS.MIN_POLICEMEN,
      Math.floor(this.entities.length * GAME_CONSTANTS.MAX_POLICEMEN_PERCENTAGE)
    );

    const policemen = this.entities.filter(
      (entity) => entity.type === ENTITY_TYPES.POLICEMAN
    );

    // If we have fewer policemen than max, convert some humans to policemen
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
        availableHumans[count]._draw();
      }
    }
  }

  getCell(x, y) {
    return this.worldState[y][x];
  }

  getEntityType(x, y) {
    return this.worldState[y][x];
  }

  setCell(x, y, entityType) {
    this.worldState[y][x] = entityType;
    const color = ENTITY_TYPE_TO_COLOR[entityType];
    this._renderCell(x, y, color);
  }

  _renderCell(x, y, color) {
    this.canvasContext.putImageData(
      this.computedColors[color],
      x * WORLD_CONSTANTS.SCALE_FACTOR,
      y * WORLD_CONSTANTS.SCALE_FACTOR
    );
  }

  nearLook(x, y, direction) {
    return this._look(x, y, direction, 1);
  }

  farLook(x, y, direction) {
    return this._look(x, y, direction, 10);
  }

  humansAt(x, y) {
    let matches = this.entities
      .filter((entity) => entity.x === x && entity.y === y)
      .filter((entity) => entity.type === ENTITY_TYPES.HUMAN);
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
      this.setCell(zombieAtPos.x, zombieAtPos.y, ENTITY_TYPES.NONE);
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
    for (let count = 0; count < WORLD_CONSTANTS.STREETS_COUNT; count++) {
      let rectX = Math.floor(Math.random() * this.width);
      let rectY = Math.floor(Math.random() * this.height);
      let rectW =
        Math.floor(Math.random() * WORLD_CONSTANTS.STREET_VARIATION_SIZE) +
        WORLD_CONSTANTS.STREET_FIXED_SIZE;
      let rectH =
        Math.floor(Math.random() * WORLD_CONSTANTS.STREET_VARIATION_SIZE) +
        WORLD_CONSTANTS.STREET_FIXED_SIZE;

      this._carveEmptySpace(rectX, rectY, rectW, rectH, true);
    }

    // Create open spaces (filled rectangles)
    for (let count = 0; count < WORLD_CONSTANTS.OPEN_SPACES_COUNT; count++) {
      let rectX = Math.floor(Math.random() * this.width);
      let rectY = Math.floor(Math.random() * this.height);
      let rectW =
        Math.floor(Math.random() * WORLD_CONSTANTS.OPEN_SPACE_VARIATION_SIZE) +
        WORLD_CONSTANTS.OPEN_SPACE_FIXED_SIZE;
      let rectH =
        Math.floor(Math.random() * WORLD_CONSTANTS.OPEN_SPACE_VARIATION_SIZE) +
        WORLD_CONSTANTS.OPEN_SPACE_FIXED_SIZE;

      this._carveEmptySpace(rectX, rectY, rectW, rectH, false);
    }

    // Render the final world state to canvas
    this._renderWorldState();
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

  _renderWorldState() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this._renderCell(x, y, ENTITY_TYPE_TO_COLOR[this.worldState[y][x]]);
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
        } else if (entityType === ENTITY_TYPES.HUMAN_PANIC) {
          return ENTITY_TYPES.HUMAN_PANIC;
        } else if (entityType === ENTITY_TYPES.HUMAN) {
          return ENTITY_TYPES.HUMAN;
        } else if (entityType === ENTITY_TYPES.ZOMBIE) {
          return ENTITY_TYPES.ZOMBIE;
        }
      }
    }

    return ENTITY_TYPES.NONE;
  }
}

World.prototype.SCALE_FACTOR = WORLD_CONSTANTS.SCALE_FACTOR;
World.prototype.ACTIVE_AMOUNT = WORLD_CONSTANTS.ACTIVE_AMOUNT;

World.prototype.COLOR = COLORS;
World.prototype.DIRECTIONS = DIRECTIONS;
