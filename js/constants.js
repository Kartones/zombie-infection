"use strict";

// This file contains fixed constants, whose values are not expected to change.

// Entity types
const ENTITY_TYPES = {
  NONE: 0,
  ZOMBIE: 1,
  HUMAN: 2,
  WALL: 4,
  POLICEMAN: 5,
};

// Entity states (orthogonal to type)
const ENTITY_STATES = {
  PANICKING: 3,
};

// World constants
const WORLD_CONSTANTS = {
  ACTIVE_AMOUNT: 10,
};

// Directions
const DIRECTIONS = {
  NORTH: 1,
  EAST: 2,
  SOUTH: 3,
  WEST: 4,
};

// natural sprite height in pixels (sprites are currently 1×3 px)
const SPRITE_HEIGHT = 3;
// Draw extra rows at the top to ensure that sprites are always fully rendered when on the top edge of the map.
const TOP_PADDING_ROWS = SPRITE_HEIGHT - 1;