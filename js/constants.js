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
