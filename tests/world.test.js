import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from './context.js';

let ctx;

before(() => {
  ctx = createContext();
});

// Build a World-like object without touching the DOM constructor.
// We use Object.create(World.prototype) then manually set up worldState and entities.
function makeWorld(width = 10, height = 10) {
  const world = Object.create(ctx.World.prototype);
  world.width = width;
  world.height = height;
  world.panicThreshold = 5;
  world.entities = [];
  world.worldState = Array.from({ length: height }, () => new Array(width).fill(ctx.ENTITY_TYPES.NONE));
  return world;
}

// --- World.getEntityType() ---

describe('World.getEntityType()', () => {
  it('returns correct entity type from worldState', () => {
    const world = makeWorld();
    world.worldState[2][5] = ctx.ENTITY_TYPES.ZOMBIE;

    assert.equal(world.getEntityType(5, 2), ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('returns NONE for empty cell', () => {
    const world = makeWorld();

    assert.equal(world.getEntityType(3, 3), ctx.ENTITY_TYPES.NONE);
  });

  it('returns HUMAN for human cell', () => {
    const world = makeWorld();
    world.worldState[4][6] = ctx.ENTITY_TYPES.HUMAN;

    assert.equal(world.getEntityType(6, 4), ctx.ENTITY_TYPES.HUMAN);
  });
});

// --- World.humansAt() ---

describe('World.humansAt()', () => {
  it('returns humans at the given position', () => {
    const world = makeWorld();
    const human = { x: 3, y: 4, type: ctx.ENTITY_TYPES.HUMAN };
    world.entities.push(human);

    const result = world.humansAt(3, 4);

    assert.ok(Array.isArray(result));
    assert.equal(result.length, 1);
    assert.equal(result[0], human);
  });

  it('returns undefined when no humans at position', () => {
    const world = makeWorld();

    assert.equal(world.humansAt(3, 4), undefined);
  });

  it('excludes non-human entities at position', () => {
    const world = makeWorld();
    world.entities.push({ x: 3, y: 4, type: ctx.ENTITY_TYPES.ZOMBIE });

    assert.equal(world.humansAt(3, 4), undefined);
  });

  it('returns policeman at position', () => {
    const world = makeWorld();
    const policeman = { x: 3, y: 4, type: ctx.ENTITY_TYPES.POLICEMAN };
    world.entities.push(policeman);

    const result = world.humansAt(3, 4);

    assert.ok(Array.isArray(result));
    assert.equal(result[0], policeman);
  });

  it('excludes HUMAN_PANIC entities at position', () => {
    const world = makeWorld();
    world.entities.push({ x: 3, y: 4, type: ctx.ENTITY_TYPES.HUMAN_PANIC });

    assert.equal(world.humansAt(3, 4), undefined);
  });
});

// --- World.removeZombieAt() ---

describe('World.removeZombieAt()', () => {
  it('removes zombie entity from entities array', () => {
    const world = makeWorld();
    const zombie = { x: 2, y: 3, type: ctx.ENTITY_TYPES.ZOMBIE };
    world.entities.push(zombie);
    world.worldState[3][2] = ctx.ENTITY_TYPES.ZOMBIE;

    world.removeZombieAt(2, 3);

    assert.equal(world.entities.includes(zombie), false);
  });

  it('clears the worldState cell to NONE', () => {
    const world = makeWorld();
    const zombie = { x: 2, y: 3, type: ctx.ENTITY_TYPES.ZOMBIE };
    world.entities.push(zombie);
    world.worldState[3][2] = ctx.ENTITY_TYPES.ZOMBIE;

    world.removeZombieAt(2, 3);

    assert.equal(world.worldState[3][2], ctx.ENTITY_TYPES.NONE);
  });

  it('is a no-op when no zombie at position', () => {
    const world = makeWorld();
    const human = { x: 2, y: 3, type: ctx.ENTITY_TYPES.HUMAN };
    world.entities.push(human);

    world.removeZombieAt(2, 3);

    assert.equal(world.entities.length, 1);
  });
});

// --- World.zombiesInDirection() ---

describe('World.zombiesInDirection()', () => {
  it('counts zombies in NORTH direction', () => {
    const world = makeWorld();
    world.worldState[4][5] = ctx.ENTITY_TYPES.ZOMBIE;
    world.worldState[3][5] = ctx.ENTITY_TYPES.ZOMBIE;

    const count = world.zombiesInDirection(5, 6, ctx.DIRECTIONS.NORTH, 5);

    assert.equal(count, 2);
  });

  it('counts zombies in EAST direction', () => {
    const world = makeWorld();
    world.worldState[5][6] = ctx.ENTITY_TYPES.ZOMBIE;

    const count = world.zombiesInDirection(5, 5, ctx.DIRECTIONS.EAST, 3);

    assert.equal(count, 1);
  });

  it('stops counting at boundary without error', () => {
    const world = makeWorld(10, 10);

    // Starting near the edge going EAST — will hit boundary
    assert.doesNotThrow(() => {
      world.zombiesInDirection(8, 5, ctx.DIRECTIONS.EAST, 5);
    });
  });

  it('returns 0 when no zombies in direction', () => {
    const world = makeWorld();

    const count = world.zombiesInDirection(5, 5, ctx.DIRECTIONS.SOUTH, 5);

    assert.equal(count, 0);
  });

  it('counts zombies in SOUTH direction', () => {
    const world = makeWorld();
    world.worldState[6][5] = ctx.ENTITY_TYPES.ZOMBIE;

    const count = world.zombiesInDirection(5, 5, ctx.DIRECTIONS.SOUTH, 3);

    assert.equal(count, 1);
  });

  it('counts zombies in WEST direction', () => {
    const world = makeWorld();
    world.worldState[5][4] = ctx.ENTITY_TYPES.ZOMBIE;

    const count = world.zombiesInDirection(5, 5, ctx.DIRECTIONS.WEST, 3);

    assert.equal(count, 1);
  });
});

// --- World._look() ---

describe('World._look()', () => {
  it('returns WALL when it hits a wall cell', () => {
    const world = makeWorld();
    world.worldState[4][5] = ctx.ENTITY_TYPES.WALL;

    const result = world._look(5, 5, ctx.DIRECTIONS.NORTH, 5);

    assert.equal(result, ctx.ENTITY_TYPES.WALL);
  });

  it('returns ZOMBIE when it finds a zombie cell', () => {
    const world = makeWorld();
    world.worldState[4][5] = ctx.ENTITY_TYPES.ZOMBIE;

    const result = world._look(5, 5, ctx.DIRECTIONS.NORTH, 2);

    assert.equal(result, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('returns WALL when position goes out of boundary', () => {
    const world = makeWorld(10, 10);

    // Looking NORTH from y=1 with distance 5 — will go out of bounds
    const result = world._look(5, 1, ctx.DIRECTIONS.NORTH, 5);

    assert.equal(result, ctx.ENTITY_TYPES.WALL);
  });

  it('returns NONE when nothing is in range', () => {
    const world = makeWorld();

    const result = world._look(5, 5, ctx.DIRECTIONS.EAST, 2);

    assert.equal(result, ctx.ENTITY_TYPES.NONE);
  });

  it('returns ZOMBIE looking SOUTH', () => {
    const world = makeWorld();
    world.worldState[7][5] = ctx.ENTITY_TYPES.ZOMBIE;

    const result = world._look(5, 5, ctx.DIRECTIONS.SOUTH, 5);

    assert.equal(result, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('returns ZOMBIE looking WEST', () => {
    const world = makeWorld();
    world.worldState[5][3] = ctx.ENTITY_TYPES.ZOMBIE;

    const result = world._look(5, 5, ctx.DIRECTIONS.WEST, 5);

    assert.equal(result, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('returns HUMAN_PANIC when it finds a HUMAN_PANIC cell', () => {
    const world = makeWorld();
    world.worldState[4][5] = ctx.ENTITY_TYPES.HUMAN_PANIC;

    const result = world._look(5, 5, ctx.DIRECTIONS.NORTH, 5);

    assert.equal(result, ctx.ENTITY_TYPES.HUMAN_PANIC);
  });

  it('returns POLICEMAN when it finds a policeman cell', () => {
    const world = makeWorld();
    world.worldState[7][5] = ctx.ENTITY_TYPES.POLICEMAN;

    const result = world._look(5, 8, ctx.DIRECTIONS.NORTH, 5);

    assert.equal(result, ctx.ENTITY_TYPES.POLICEMAN);
  });
});

// --- World.getStats() ---

describe('World.getStats()', () => {
  it('returns zero counts when no entities', () => {
    const world = makeWorld();

    const stats = world.getStats();

    assert.equal(stats.humans, 0);
    assert.equal(stats.panicked, 0);
    assert.equal(stats.policemen, 0);
    assert.equal(stats.panickedPolicemen, 0);
    assert.equal(stats.zombies, 0);
  });

  it('counts calm HUMAN (activityLevel 0) as humans', () => {
    const world = makeWorld();
    world.entities.push({ type: ctx.ENTITY_TYPES.HUMAN, activityLevel: 0 });
    world.entities.push({ type: ctx.ENTITY_TYPES.HUMAN, activityLevel: 3 });

    const { humans } = world.getStats();

    assert.equal(humans, 1);
  });

  it('counts panicking HUMAN (activityLevel > 0) as panicked', () => {
    const world = makeWorld();
    world.entities.push({ type: ctx.ENTITY_TYPES.HUMAN, activityLevel: 0 });
    world.entities.push({ type: ctx.ENTITY_TYPES.HUMAN, activityLevel: 3 });

    const { panicked } = world.getStats();

    assert.equal(panicked, 1);
  });

  it('counts calm POLICEMAN as policemen', () => {
    const world = makeWorld();
    world.entities.push({ type: ctx.ENTITY_TYPES.POLICEMAN, activityLevel: 0 });
    world.entities.push({ type: ctx.ENTITY_TYPES.POLICEMAN, activityLevel: 0 });

    const { policemen } = world.getStats();

    assert.equal(policemen, 2);
  });

  it('counts panicking POLICEMAN as panickedPolicemen', () => {
    const world = makeWorld();
    world.entities.push({ type: ctx.ENTITY_TYPES.POLICEMAN, activityLevel: 0 });
    world.entities.push({ type: ctx.ENTITY_TYPES.POLICEMAN, activityLevel: 3 });

    const stats = world.getStats();

    assert.equal(stats.policemen, 1);
    assert.equal(stats.panickedPolicemen, 1);
  });

  it('counts ZOMBIE entities', () => {
    const world = makeWorld();
    world.entities.push({ type: ctx.ENTITY_TYPES.ZOMBIE });

    const { zombies } = world.getStats();

    assert.equal(zombies, 1);
  });

  it('returns correct counts for a mixed entity list', () => {
    const world = makeWorld();
    world.entities.push({ type: ctx.ENTITY_TYPES.HUMAN, activityLevel: 0 });
    world.entities.push({ type: ctx.ENTITY_TYPES.HUMAN, activityLevel: 3 });
    world.entities.push({ type: ctx.ENTITY_TYPES.POLICEMAN, activityLevel: 0 });
    world.entities.push({ type: ctx.ENTITY_TYPES.POLICEMAN, activityLevel: 2 });
    world.entities.push({ type: ctx.ENTITY_TYPES.ZOMBIE });
    world.entities.push({ type: ctx.ENTITY_TYPES.ZOMBIE });

    const stats = world.getStats();

    assert.equal(stats.humans, 1);
    assert.equal(stats.panicked, 1);
    assert.equal(stats.policemen, 1);
    assert.equal(stats.panickedPolicemen, 1);
    assert.equal(stats.zombies, 2);
  });
});

// --- World.setState() ---

describe('World.setState()', () => {
  it('writes the entity type to worldState at (x, y)', () => {
    const world = makeWorld();

    world.setState(4, 6, ctx.ENTITY_TYPES.ZOMBIE);

    assert.equal(world.worldState[6][4], ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('overwrites an existing value', () => {
    const world = makeWorld();
    world.worldState[2][3] = ctx.ENTITY_TYPES.HUMAN;

    world.setState(3, 2, ctx.ENTITY_TYPES.NONE);

    assert.equal(world.worldState[2][3], ctx.ENTITY_TYPES.NONE);
  });

  it('does not affect adjacent cells', () => {
    const world = makeWorld();

    world.setState(5, 5, ctx.ENTITY_TYPES.WALL);

    assert.equal(world.worldState[5][4], ctx.ENTITY_TYPES.NONE);
    assert.equal(world.worldState[4][5], ctx.ENTITY_TYPES.NONE);
  });
});

// --- World._carveEmptySpace() ---

describe('World._carveEmptySpace()', () => {
  it('stroke mode carves only the perimeter', () => {
    const world = makeWorld(20, 20);
    // Fill all with WALL first
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        world.worldState[y][x] = ctx.ENTITY_TYPES.WALL;

    world._carveEmptySpace(2, 2, 4, 4, true);

    // Interior cells should still be WALL
    assert.equal(world.worldState[3][3], ctx.ENTITY_TYPES.WALL);
    assert.equal(world.worldState[4][4], ctx.ENTITY_TYPES.WALL);

    // Perimeter cells should be NONE
    assert.equal(world.worldState[2][2], ctx.ENTITY_TYPES.NONE); // top-left
    assert.equal(world.worldState[2][6], ctx.ENTITY_TYPES.NONE); // top-right
    assert.equal(world.worldState[6][2], ctx.ENTITY_TYPES.NONE); // bottom-left
    assert.equal(world.worldState[6][6], ctx.ENTITY_TYPES.NONE); // bottom-right
  });

  it('fill mode carves entire rectangle', () => {
    const world = makeWorld(20, 20);
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        world.worldState[y][x] = ctx.ENTITY_TYPES.WALL;

    world._carveEmptySpace(2, 2, 4, 4, false);

    // All cells inside (inclusive) should be NONE
    for (let y = 2; y <= 6; y++)
      for (let x = 2; x <= 6; x++)
        assert.equal(world.worldState[y][x], ctx.ENTITY_TYPES.NONE,
          `cell [${y}][${x}] should be NONE`);
  });
});
