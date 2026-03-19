"use strict";

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
  SCALE_FACTOR: 4,
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

// Game settings
const GAME_CONSTANTS = {
  MIN_ENTITIES: 100,
  MAX_ENTITIES: 4000,
  MOVEMENT_RANDOM_FACTOR: 10,
  // It'll move if random number [0, MOVEMENT_RANDOM_FACTOR) is less than this
  ZOMBIE_MOVE_CHANCE: 2,
};
