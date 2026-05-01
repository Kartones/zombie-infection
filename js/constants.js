"use strict";

// This file contains fixed constants, whose values are not expected to change.

// Entity types
const ENTITY_TYPES = {
  NONE: 0,
  ZOMBIE: 1,
  HUMAN: 2,
  HUMAN_PANIC: 3,
  WALL: 4,
  POLICEMAN: 5,
};

// World constants
const WORLD_CONSTANTS = {
  SCALE_FACTOR: 6,
  ACTIVE_AMOUNT: 10,
};

// Entity behavior constants
const ENTITY_CONSTANTS = {
  // This one takes into account all visible entities, not just the first one
  SHOT_VIEW_DISTANCE: 5,
  NEAR_LOOK_DISTANCE: 1,
  FAR_LOOK_DISTANCE: 10,
  SHOOT_PISTOL_DISTANCE: 2,
};

// Directions
const DIRECTIONS = {
  NORTH: 1,
  EAST: 2,
  SOUTH: 3,
  WEST: 4,
};
