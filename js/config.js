"use strict";

// This file contains configuration parameters that can be tweaked to change the behavior of the game.

class Config {
  static STREETS_COUNT = 80;
  static STREET_VARIATION_SIZE = 60;
  static STREET_FIXED_SIZE = 15;
  static OPEN_SPACES_COUNT = 12;
  static OPEN_SPACE_VARIATION_SIZE = 10;
  static OPEN_SPACE_FIXED_SIZE = 10;

  static HUMAN_STAMINA = 8;
  static POLICEMAN_STAMINA = 10;

  static POLICEMAN_SHOT_ACCURACY = 0.7;
  static MIN_POLICEMEN = 2;
  static MAX_POLICEMEN_PERCENTAGE = 0.05;

  static PANIC_LEVEL = 5;
  static UPDATE_INTERVAL_MS = 50;
  static ENTITIES_PER_BATCH = 100;

  static SCALE_FACTOR = 6;
  static SHOT_VIEW_DISTANCE = 5;
  static NEAR_LOOK_DISTANCE = 1;
  static FAR_LOOK_DISTANCE = 10;
  static SHOOT_PISTOL_DISTANCE = 2;
  static INITIAL_ENTITIES = 300;
}

const GAME_CONSTANTS = {
  MIN_ENTITIES: 100,
  MAX_ENTITIES: 4000,
  MOVEMENT_RANDOM_FACTOR: 10,
  // It'll move if random number [0, MOVEMENT_RANDOM_FACTOR) is less than this
  ZOMBIE_MOVE_CHANCE: 2,
};
