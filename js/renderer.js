"use strict";

// Depends on ENTITY_TYPES (constants.js), WORLD_CONSTANTS (constants.js), and PIXI (pixi.min.js),
// loaded before this file in index.html.

const BACKGROUND_COLORS = {
  [ENTITY_TYPES.NONE]: 0x000000,
  [ENTITY_TYPES.WALL]: 0x5A5A5A,
};

const SPRITE_PATHS = [
  'gfx/human.png',
  'gfx/human_panic.png',
  'gfx/zombie.png',
  'gfx/policeman.png',
  'gfx/police_panic.png',
];

const SPRITE_HEIGHT = 3; // natural sprite height in pixels (sprites are 1×3 px)

class Renderer {
  constructor(canvasNodeId, mapWidth, mapHeight) {
    this._width  = Math.max(2, mapWidth  || 0);
    this._height = Math.max(2, mapHeight || 0);

    const scale  = Config.SCALE_FACTOR;
    const canvas = document.getElementById(canvasNodeId);
    if (!canvas) throw new Error(`Canvas element not found: ${canvasNodeId}`);

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    this._app = new PIXI.Application({
      view: canvas,
      width:  this._width  * scale,
      height: this._height * scale,
      backgroundColor: 0x000000,
      antialias: false,
    });
    this._app.ticker.stop();

    this._bgContainer     = new PIXI.Container();
    this._entityContainer = new PIXI.Container();
    this._app.stage.addChild(this._bgContainer);
    this._app.stage.addChild(this._entityContainer);

    this._bgTextures     = this._createBackgroundTextures(scale);
    this._bgSprites      = this._createBackgroundGrid(scale);
    this._spriteTextures = this._loadSpriteTextures();
    this._entitySprites  = new Map();
  }

  render(worldState, entities) {
    this._renderBackground(worldState);
    this._renderEntities(entities);
    this._app.renderer.render(this._app.stage);
  }

  _renderBackground(worldState) {
    const wallTexture = this._bgTextures[ENTITY_TYPES.WALL];
    const noneTexture = this._bgTextures[ENTITY_TYPES.NONE];

    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        this._bgSprites[y][x].texture =
          worldState[y][x] === ENTITY_TYPES.WALL ? wallTexture : noneTexture;
      }
    }
  }

  _renderEntities(entities) {
    const entitySet = new Set(entities);

    for (const [entity, sprite] of this._entitySprites) {
      if (!entitySet.has(entity)) {
        this._entityContainer.removeChild(sprite);
        sprite.destroy();
        this._entitySprites.delete(entity);
      }
    }

    for (const entity of entities) {
      if (!this._entitySprites.has(entity)) {
        const sprite = new PIXI.Sprite();
        this._entityContainer.addChild(sprite);
        this._entitySprites.set(entity, sprite);
      }
      this._updateEntitySprite(this._entitySprites.get(entity), entity);
    }
  }

  _updateEntitySprite(sprite, entity) {
    const scale = Config.SCALE_FACTOR;

    sprite.texture = this._spriteTextures[this._spritePathFor(entity)];
    sprite.scale.set(scale);
    sprite.x = entity.x * scale;
    sprite.y = entity.y * scale - (SPRITE_HEIGHT - 1) * scale;
  }

  _spritePathFor(entity) {
    const isPanicking = entity.activityLevel > 0;
    switch (entity.type) {
      case ENTITY_TYPES.ZOMBIE:      return 'gfx/zombie.png';
      case ENTITY_TYPES.POLICEMAN:   return isPanicking ? 'gfx/police_panic.png' : 'gfx/policeman.png';
      default:                       return isPanicking ? 'gfx/human_panic.png' : 'gfx/human.png';
    }
  }

  _createBackgroundTextures(scale) {
    const textures = {};
    for (const [type, color] of Object.entries(BACKGROUND_COLORS)) {
      const g = new PIXI.Graphics();
      g.beginFill(color);
      g.drawRect(0, 0, scale, scale);
      g.endFill();
      textures[type] = this._app.renderer.generateTexture(g);
    }
    return textures;
  }

  _createBackgroundGrid(scale) {
    const sprites     = [];
    const noneTexture = this._bgTextures[ENTITY_TYPES.NONE];

    for (let y = 0; y < this._height; y++) {
      sprites[y] = [];
      for (let x = 0; x < this._width; x++) {
        const sprite = new PIXI.Sprite(noneTexture);
        sprite.x = x * scale;
        sprite.y = y * scale;
        this._bgContainer.addChild(sprite);
        sprites[y][x] = sprite;
      }
    }

    return sprites;
  }

  _loadSpriteTextures() {
    const textures = {};
    for (const path of SPRITE_PATHS) {
      textures[path] = PIXI.Texture.from(path);
    }
    return textures;
  }

  destroy() {
    this._app.destroy(false);
  }
}
