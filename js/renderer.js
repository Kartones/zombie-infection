"use strict";

class Renderer {
  constructor(canvasNodeId, mapWidth, mapHeight) {
    this._width = Math.max(2, mapWidth || 0);
    this._height = Math.max(2, mapHeight || 0);

    const scale = WORLD_CONSTANTS.SCALE_FACTOR;
    this._scaledWidth = this._width * scale;
    this._scaledHeight = this._height * scale;

    const canvas = document.getElementById(canvasNodeId);
    canvas.width = this._scaledWidth;
    canvas.height = this._scaledHeight;

    this._ctx = canvas.getContext("2d");
    this._ctx.imageSmoothingEnabled = false;

    // Pre-allocate a single full-canvas buffer. Reused every renderWorld() call
    // so the GC never sees it. putImageData is called once per tick instead of
    // once per cell (14400x reduction for a 120x120 grid).
    this._buffer = new Uint8ClampedArray(this._scaledWidth * this._scaledHeight * 4);
    this._imageData = new ImageData(this._buffer, this._scaledWidth);

    this._computedColors = this._precomputeColors();
  }

  renderWorld(worldState) {
    const scale = WORLD_CONSTANTS.SCALE_FACTOR;
    const scaledWidth = this._scaledWidth;
    // Uint32Array view: write all 4 bytes (RGBA) of one pixel in a single assignment
    const buf32 = new Uint32Array(this._buffer.buffer);

    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        const rgba = this._computedColors[worldState[y][x]];
        for (let py = 0; py < scale; py++) {
          const rowStart = (y * scale + py) * scaledWidth + x * scale;
          for (let px = 0; px < scale; px++) {
            buf32[rowStart + px] = rgba;
          }
        }
      }
    }

    this._ctx.putImageData(this._imageData, 0, 0);
  }

  _precomputeColors() {
    const computed = {};
    for (const [type, color] of Object.entries(ENTITY_TYPE_TO_COLOR)) {
      // Pack [R, G, B, 255] into a single Uint32 value.
      // Little-endian byte order: memory layout is [R, G, B, A],
      // so the Uint32 is: A<<24 | B<<16 | G<<8 | R
      computed[type] = (255 << 24) | (color[2] << 16) | (color[1] << 8) | color[0];
    }
    return computed;
  }
}
