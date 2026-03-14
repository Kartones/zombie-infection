"use strict";

const ENTITY_COLORS = {
  [ENTITY_TYPES.NONE]:       0x000000,
  [ENTITY_TYPES.ZOMBIE]:     0x1EAA1E,
  [ENTITY_TYPES.HUMAN]:      0xD5AFD5,
  [ENTITY_TYPES.HUMAN_PANIC]:0xC42BC4,
  [ENTITY_TYPES.WALL]:       0x5A5A5A,
  [ENTITY_TYPES.POLICEMAN]:  0x0064C8,
};

class Renderer {
  constructor(canvasNodeId, mapWidth, mapHeight) {
    this._width = Math.max(2, mapWidth || 0);
    this._height = Math.max(2, mapHeight || 0);

    const scale = WORLD_CONSTANTS.SCALE_FACTOR;
    const canvas = document.getElementById(canvasNodeId);

    this._app = new PIXI.Application({
      view: canvas,
      width: this._width * scale,
      height: this._height * scale,
      backgroundColor: 0x000000,
      antialias: false,
    });
    this._app.ticker.stop();

    this._textures = this._createTextures(scale);
    this._sprites = this._createSpriteGrid(scale);
  }

  renderWorld(worldState) {
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        this._sprites[y][x].texture = this._textures[worldState[y][x]];
      }
    }
    this._app.renderer.render(this._app.stage);
  }

  _createTextures(scale) {
    const textures = {};
    for (const [type, color] of Object.entries(ENTITY_COLORS)) {
      const g = new PIXI.Graphics();
      g.beginFill(color);
      g.drawRect(0, 0, scale, scale);
      g.endFill();
      textures[type] = this._app.renderer.generateTexture(g);
    }
    return textures;
  }

  _createSpriteGrid(scale) {
    const container = new PIXI.Container();
    const sprites = [];
    const noneTexture = this._textures[ENTITY_TYPES.NONE];

    for (let y = 0; y < this._height; y++) {
      sprites[y] = [];
      for (let x = 0; x < this._width; x++) {
        const sprite = new PIXI.Sprite(noneTexture);
        sprite.x = x * scale;
        sprite.y = y * scale;
        container.addChild(sprite);
        sprites[y][x] = sprite;
      }
    }

    this._app.stage.addChild(container);
    return sprites;
  }
}
