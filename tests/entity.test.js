import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from './context.js';

let ctx;

before(() => {
  ctx = createContext();
});

function makeMockWorld(overrides = {}) {
  const setCellCalls = [];
  const world = {
    width: 10,
    height: 10,
    panicThreshold: 5,
    worldState: Array.from({ length: 10 }, () => new Array(10).fill(ctx.ENTITY_TYPES.NONE)),
    entities: [],
    getEntityType(x, y) { return this.worldState[y][x]; },
    setState(x, y, type) { this.worldState[y][x] = type; setCellCalls.push({ x, y, type }); },
    humansAt(x, y) {
      const matches = this.entities.filter(
        e => e.x === x && e.y === y && e.type === ctx.ENTITY_TYPES.HUMAN
      );
      return matches.length > 0 ? matches : undefined;
    },
    nearLook() { return ctx.ENTITY_TYPES.NONE; },
    farLook() { return ctx.ENTITY_TYPES.NONE; },
    removeZombieAt() {},
    zombiesInDirection() { return 0; },
    get setCellCalls() { return setCellCalls; },
    ...overrides,
  };
  return world;
}

function makeEntity(world) {
  const entity = new ctx.Entity(world);
  entity.x = 3;
  entity.y = 3;
  entity.activityLevel = 0;
  return entity;
}

// --- Entity.infect() ---

describe('Entity.infect()', () => {
  it('changes type to ZOMBIE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;

    entity.infect();

    assert.equal(entity.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('calls renderEntity() after infecting (setCell invoked)', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;

    entity.infect();

    assert.ok(world.setCellCalls.length > 0, 'setState should be called by renderEntity()');
    const last = world.setCellCalls.at(-1);
    assert.equal(last.x, entity.x);
    assert.equal(last.y, entity.y);
    assert.equal(last.type, ctx.ENTITY_TYPES.ZOMBIE);
  });
});

// --- Entity.bite() ---

describe('Entity.bite()', () => {
  it('infects each human in the list', () => {
    const world = makeMockWorld();
    const biter = makeEntity(world);
    biter.type = ctx.ENTITY_TYPES.ZOMBIE;

    const victim1 = makeEntity(world);
    victim1.type = ctx.ENTITY_TYPES.HUMAN;
    const victim2 = makeEntity(world);
    victim2.type = ctx.ENTITY_TYPES.HUMAN;

    biter.bite([victim1, victim2]);

    assert.equal(victim1.type, ctx.ENTITY_TYPES.ZOMBIE);
    assert.equal(victim2.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('is a no-op with an empty list', () => {
    const world = makeMockWorld();
    const biter = makeEntity(world);
    const callsBefore = world.setCellCalls.length;

    biter.bite([]);

    assert.equal(world.setCellCalls.length, callsBefore);
  });
});

// --- Entity.cureInfectionAndReposition() ---

describe('Entity.cureInfectionAndReposition()', () => {
  it('sets type to HUMAN', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;

    entity.cureInfectionAndReposition();

    assert.equal(entity.type, ctx.ENTITY_TYPES.HUMAN);
  });

  it('resets activityLevel to 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.activityLevel = 5;

    entity.cureInfectionAndReposition();

    assert.equal(entity.activityLevel, 0);
  });

  it('clears the old cell via setCell with NONE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.x = 2;
    entity.y = 4;
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    world.worldState[4][2] = ctx.ENTITY_TYPES.ZOMBIE;

    entity.cureInfectionAndReposition();

    const clearCall = world.setCellCalls.find(
      c => c.x === 2 && c.y === 4 && c.type === ctx.ENTITY_TYPES.NONE
    );
    assert.ok(clearCall, 'old cell should be cleared with NONE');
  });

  it('repositions the entity by calling setPosition', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.x = 2;
    entity.y = 4;
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;

    const mockRandom = mock.method(Math, 'random', () => 0.1);
    try {
      entity.cureInfectionAndReposition();
      assert.ok(
        entity.x !== 2 || entity.y !== 4,
        'entity position should change after cureInfectionAndReposition'
      );
    } finally {
      mockRandom.mock.restore();
    }
  });
});

// --- Entity.renderEntity() ---

describe('Entity.renderEntity()', () => {
  it('draws ZOMBIE when type is ZOMBIE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;

    entity.renderEntity();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('draws POLICEMAN when type is POLICEMAN', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.POLICEMAN;
    entity.activityLevel = 0;

    entity.renderEntity();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.POLICEMAN);
  });

  it('draws HUMAN_PANIC when human with activityLevel > 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 3;

    entity.renderEntity();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.HUMAN_PANIC);
  });

  it('draws HUMAN when human with activityLevel === 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 0;

    entity.renderEntity();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.HUMAN);
  });
});

// --- Entity._moveZombie() ---

describe('Entity._moveZombie()', () => {
  it('sets activityLevel when human is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.HUMAN; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.activityLevel = 0;

    entity._moveZombie();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });

  it('randomizes direction when idle and target is not a zombie', () => {
    const randomValues = [0.1]; // will produce direction 1 (NORTH)
    let callCount = 0;
    const mockRandom = mock.method(Math, 'random', () => randomValues[callCount++] ?? 0.1);

    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.activityLevel = 0;
    entity.direction = ctx.DIRECTIONS.EAST;

    try {
      entity._moveZombie();
      assert.equal(entity.direction, ctx.DIRECTIONS.NORTH);
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('bites humans when one is in near sight', () => {
    const victim = makeEntity(makeMockWorld());
    victim.type = ctx.ENTITY_TYPES.HUMAN;

    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.HUMAN; },
      humansAt() { return [victim]; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._moveZombie();

    assert.equal(victim.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('sets activityLevel when HUMAN_PANIC is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.HUMAN_PANIC; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.activityLevel = 0;

    entity._moveZombie();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });
});

// --- Entity._shouldMove() ---

describe('Entity._shouldMove()', () => {
  it('returns true for zombie when rand equals ZOMBIE_MOVE_CHANCE', () => {
    const entity = makeEntity(makeMockWorld());
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;

    assert.equal(entity._shouldMove(ctx.GAME_CONSTANTS.ZOMBIE_MOVE_CHANCE), true);
  });

  it('returns false for zombie when rand does not equal ZOMBIE_MOVE_CHANCE', () => {
    const entity = makeEntity(makeMockWorld());
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;

    assert.equal(entity._shouldMove(ctx.GAME_CONSTANTS.ZOMBIE_MOVE_CHANCE + 1), false);
  });

  it('returns true for human when activityLevel > 0', () => {
    const entity = makeEntity(makeMockWorld());
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 3;

    assert.equal(entity._shouldMove(0), true);
  });

  it('returns true for human when rand > panicThreshold and activityLevel is 0', () => {
    const world = makeMockWorld({ panicThreshold: 5 });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 0;

    assert.equal(entity._shouldMove(6), true);
  });

  it('returns false for human when rand <= panicThreshold and activityLevel is 0', () => {
    const world = makeMockWorld({ panicThreshold: 5 });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 0;

    assert.equal(entity._shouldMove(5), false);
  });
});

// --- Entity._executeMove() ---

describe('Entity._executeMove()', () => {
  it('decrements y when moving NORTH into empty cell', () => {
    const world = makeMockWorld({ nearLook() { return ctx.ENTITY_TYPES.NONE; } });
    const entity = makeEntity(world);
    entity.y = 5;
    entity.direction = ctx.DIRECTIONS.NORTH;

    entity._executeMove();

    assert.equal(entity.y, 4);
  });

  it('increments x when moving EAST into empty cell', () => {
    const world = makeMockWorld({ nearLook() { return ctx.ENTITY_TYPES.NONE; } });
    const entity = makeEntity(world);
    entity.x = 3;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    assert.equal(entity.x, 4);
  });

  it('increments y when moving SOUTH into empty cell', () => {
    const world = makeMockWorld({ nearLook() { return ctx.ENTITY_TYPES.NONE; } });
    const entity = makeEntity(world);
    entity.y = 3;
    entity.direction = ctx.DIRECTIONS.SOUTH;

    entity._executeMove();

    assert.equal(entity.y, 4);
  });

  it('decrements x when moving WEST into empty cell', () => {
    const world = makeMockWorld({ nearLook() { return ctx.ENTITY_TYPES.NONE; } });
    const entity = makeEntity(world);
    entity.x = 5;
    entity.direction = ctx.DIRECTIONS.WEST;

    entity._executeMove();

    assert.equal(entity.x, 4);
  });

  it('randomizes direction when cell ahead is blocked', () => {
    const world = makeMockWorld({ nearLook() { return ctx.ENTITY_TYPES.WALL; } });
    const entity = makeEntity(world);
    entity.direction = ctx.DIRECTIONS.NORTH;
    const initialX = entity.x;
    const initialY = entity.y;

    const mockRandom = mock.method(Math, 'random', () => 0.5);
    try {
      entity._executeMove();
      assert.equal(entity.x, initialX);
      assert.equal(entity.y, initialY);
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('decrements activityLevel when > 0', () => {
    const world = makeMockWorld({ nearLook() { return ctx.ENTITY_TYPES.NONE; } });
    const entity = makeEntity(world);
    entity.activityLevel = 5;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    assert.equal(entity.activityLevel, 4);
  });
});

// --- Entity._movePoliceman() ---

describe('Entity._movePoliceman()', () => {
  it('shoots when exactly one zombie in sight and accuracy permits', () => {
    let removeZombieCalled = false;
    const world = makeMockWorld({
      zombiesInDirection() { return 1; },
      removeZombieAt() { removeZombieCalled = true; },
      getEntityType() { return ctx.ENTITY_TYPES.ZOMBIE; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.POLICEMAN;
    entity.direction = ctx.DIRECTIONS.EAST;

    const mockRandom = mock.method(Math, 'random', () => 0.0); // always hits
    try {
      entity._movePoliceman();
      assert.ok(removeZombieCalled, 'removeZombieAt should be called on a hit');
      assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('flips direction when multiple zombies in sight', () => {
    const world = makeMockWorld({
      zombiesInDirection() { return 3; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.POLICEMAN;
    entity.direction = ctx.DIRECTIONS.NORTH; // 1 → should become SOUTH (3)

    const mockRandom = mock.method(Math, 'random', () => 0.5); // > 1/8, no random direction
    try {
      entity._movePoliceman();
      assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
      assert.equal(entity.direction, ctx.DIRECTIONS.SOUTH);
    } finally {
      mockRandom.mock.restore();
    }
  });
});

// --- Entity._moveHuman() ---

describe('Entity._moveHuman()', () => {
  it('sets activityLevel when zombie is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.ZOMBIE; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 0;

    entity._moveHuman();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });

  it('flips direction when zombie seen ahead', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.ZOMBIE; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.direction = ctx.DIRECTIONS.NORTH; // 1 → SOUTH (3)

    const mockRandom = mock.method(Math, 'random', () => 0.5); // > 1/8
    try {
      entity._moveHuman();
      assert.equal(entity.direction, ctx.DIRECTIONS.SOUTH);
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('sets activityLevel when HUMAN_PANIC is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.HUMAN_PANIC; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.activityLevel = 0;

    entity._moveHuman();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });

  it('does not flip direction when only HUMAN_PANIC is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.HUMAN_PANIC; },
    });
    const entity = makeEntity(world);
    entity.type = ctx.ENTITY_TYPES.HUMAN;
    entity.direction = ctx.DIRECTIONS.NORTH;

    const mockRandom = mock.method(Math, 'random', () => 0.5);
    try {
      entity._moveHuman();
      assert.equal(entity.direction, ctx.DIRECTIONS.NORTH);
    } finally {
      mockRandom.mock.restore();
    }
  });
});

// --- Entity._shootZombie() ---

describe('Entity._shootZombie()', () => {
  it('removes zombie within pistol range', () => {
    let removedAt = null;
    const world = makeMockWorld({
      getEntityType(x, y) {
        return (x === 5 && y === 3) ? ctx.ENTITY_TYPES.ZOMBIE : ctx.ENTITY_TYPES.NONE;
      },
      removeZombieAt(x, y) { removedAt = { x, y }; },
    });
    const entity = makeEntity(world);
    entity.x = 5;
    entity.y = 5;
    entity.direction = ctx.DIRECTIONS.NORTH;

    entity._shootZombie(ctx.ENTITY_TYPES.POLICEMAN);

    assert.deepEqual(removedAt, { x: 5, y: 3 });
  });

  it('stops at boundary without throwing', () => {
    const world = makeMockWorld({
      getEntityType() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = makeEntity(world);
    entity.x = 1;
    entity.y = 1;
    entity.direction = ctx.DIRECTIONS.NORTH;

    assert.doesNotThrow(() => entity._shootZombie(ctx.ENTITY_TYPES.POLICEMAN));
  });

  it('is a no-op when no zombie in path', () => {
    let removeZombieCalled = false;
    const world = makeMockWorld({
      getEntityType() { return ctx.ENTITY_TYPES.NONE; },
      removeZombieAt() { removeZombieCalled = true; },
    });
    const entity = makeEntity(world);
    entity.x = 5;
    entity.y = 5;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._shootZombie(ctx.ENTITY_TYPES.POLICEMAN);

    assert.equal(removeZombieCalled, false);
  });

  it('is a no-op when entity type is not POLICEMAN', () => {
    let removeZombieCalled = false;
    const world = makeMockWorld({
      getEntityType() { return ctx.ENTITY_TYPES.ZOMBIE; },
      removeZombieAt() { removeZombieCalled = true; },
    });
    const entity = makeEntity(world);
    entity.x = 5;
    entity.y = 5;
    entity.direction = ctx.DIRECTIONS.NORTH;

    entity._shootZombie(ctx.ENTITY_TYPES.HUMAN);

    assert.equal(removeZombieCalled, false);
  });
});
