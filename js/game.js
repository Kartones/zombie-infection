"use strict";

class Game {
  constructor(canvasNodeId, mapWidth, mapHeight, numEntities) {
    this.soundSystem = new SoundSystem();
    this.renderer = new Renderer(canvasNodeId, mapWidth, mapHeight);
    this.world = new World(mapWidth, mapHeight, Config.PANIC_LEVEL, numEntities, this.soundSystem);
    this.renderer.render(this.world.worldState, this.world.entities);

    this.paused = true;
    this.speed = 1;
    this.updateId = undefined;

    document.addEventListener("keydown", this._keydown.bind(this));

    document
      .getElementById("game-canvas")
      .addEventListener("click", this._pauseOrUnpause.bind(this));

    this._updateStats();
    setInterval(this._updateStats.bind(this), 1000);
  }

  _update() {
    if (this.paused) {
      return;
    }

    this.world.entities.forEach((entity) => entity.move());
    this.renderer.render(this.world.worldState, this.world.entities);
    this.updateId = setTimeout(
      this._update.bind(this),
      Config.UPDATE_INTERVAL_MS * this.speed
    );
  }

  _addEntities() {
    for (
      let count = 0, maximumReached = false;
      count < Config.ENTITIES_PER_BATCH && !maximumReached;
      count++
    ) {
      if (this.world.entities.length === GAME_CONSTANTS.MAX_ENTITIES) {
        maximumReached = true;
      } else {
        let newEntity = new Entity(this.world);
        this.world.entities.push(newEntity);
        newEntity.setPosition();
      }
    }

    this.world.upgradeHumansToPolicemen();
  }

  _removeEntities() {
    for (
      let count = 0, minimumReached = false;
      count < Config.ENTITIES_PER_BATCH && !minimumReached;
      count++
    ) {
      if (this.world.entities.length === GAME_CONSTANTS.MIN_ENTITIES) {
        minimumReached = true;
      } else {
        let removedEntity = this.world.entities.pop();
        this.world.setState(removedEntity.x, removedEntity.y, ENTITY_TYPES.NONE);
      }
    }
  }

  _pauseOrUnpause() {
    this.paused = !this.paused;
    if (this.paused) {
      clearTimeout(this.updateId);
    } else {
      this.updateId = setTimeout(
        this._update.bind(this),
        Config.UPDATE_INTERVAL_MS * this.speed
      );
    }
  }

  _restartWorld() {
    this.world.entities.forEach((entity) => entity.reset());
    this.world.upgradeHumansToPolicemen();
    // "patient zero" will be the first entity
    this.world.entities[0].infect();
    this.renderer.render(this.world.worldState, this.world.entities);
    this._updateStats();
  }

  _updateStats() {
    const { humans, panicked, policemen, panickedPolicemen, zombies } = this.world.getStats();
    document.getElementById('stat-humans').textContent = humans;
    document.getElementById('stat-panicked').textContent = panicked;
    document.getElementById('stat-policemen').textContent = policemen;
    document.getElementById('stat-panicked-policemen').textContent = panickedPolicemen;
    document.getElementById('stat-zombies').textContent = zombies;
  }

  _keydown(event) {
    switch (event.code) {
      case "Space":
        this._pauseOrUnpause();
        break;
      case "KeyF":
        this.world.panicThreshold =
          this.world.panicThreshold === Config.PANIC_LEVEL
            ? 0
            : Config.PANIC_LEVEL;
        break;
      case "KeyS":
        this.speed = (this.speed + 1) % 3;
        break;
      case "KeyR":
        this._restartWorld();
        break;
      case "Minus":
        this._removeEntities();
        this._restartWorld();
        break;
      case "Equal":
      case "Plus":
        this._addEntities();
        this._restartWorld();
        break;
      case "KeyM":
        this.soundSystem.toggleMute();
        break;
    }
  }
}

Game.prototype.PANIC_LEVEL = Config.PANIC_LEVEL;
Game.prototype.MIN_ENTITIES = GAME_CONSTANTS.MIN_ENTITIES;
Game.prototype.MAX_ENTITIES = GAME_CONSTANTS.MAX_ENTITIES;
