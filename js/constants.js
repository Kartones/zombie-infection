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
  STREETS_COUNT: 80,
  STREET_VARIATION_SIZE: 60,
  STREET_FIXED_SIZE: 15,
  OPEN_SPACES_COUNT: 12,
  OPEN_SPACE_VARIATION_SIZE: 10,
  OPEN_SPACE_FIXED_SIZE: 10,
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
  PANIC_LEVEL: 5,
  MIN_ENTITIES: 100,
  MAX_ENTITIES: 4000,
  // When changing population, how many entities to add/remove per batch
  ENTITIES_PER_BATCH: 100,
  MIN_POLICEMEN: 2,
  // Of total population, maximum percentage that can be policemen
  MAX_POLICEMEN_PERCENTAGE: 0.05,
  POLICEMAN_SHOT_ACCURACY: 0.7,
  UPDATE_INTERVAL_MS: 50,
  MOVEMENT_RANDOM_FACTOR: 10,
  // It'll move if random number [0, MOVEMENT_RANDOM_FACTOR) is less than this
  ZOMBIE_MOVE_CHANCE: 2,
};
