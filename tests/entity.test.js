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
    soundSystem: { playBite() {}, playShot() {} },
    get setCellCalls() { return setCellCalls; },
    ...overrides,
  };
  return world;
}

function makeEntity(world, type) {
  const entity = new ctx.Entity(world);
  entity.x = 3;
  entity.y = 3;
  entity.activityLevel = 0;
  if (type !== undefined) entity.type = type;
  return entity;
}

describe('Entity.isPanicking', () => {
  it('returns true when activityLevel > 0', () => {
    const entity = makeEntity(makeMockWorld());
    entity.activityLevel = 3;

    assert.equal(entity.isPanicking, true);
  });

  it('returns false when activityLevel === 0', () => {
    const entity = makeEntity(makeMockWorld());
    entity.activityLevel = 0;

    assert.equal(entity.isPanicking, false);
  });
});

describe('Entity.setPosition()', () => {
  it('updates coordinates and calls setState when first position is empty', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world);

    // random() → 0.5 → Math.floor(0.5 * 10) = 5
    const mockRandom = mock.method(Math, 'random', () => 0.5);
    try {
      entity.setPosition();
      assert.equal(entity.x, 5);
      assert.equal(entity.y, 5);
      assert.ok(
        world.setCellCalls.some(c => c.x === 5 && c.y === 5),
        'setState should be called for the new position'
      );
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('retries until it finds an empty cell', () => {
    // First two random calls land on (3,3) which is occupied; third lands on (5,5) which is free.
    const randomValues = [0.3, 0.3, 0.3, 0.3, 0.5, 0.5];
    let callCount = 0;
    const world = makeMockWorld({
      getEntityType(x, y) {
        return (x === 3 && y === 3) ? ctx.ENTITY_TYPES.HUMAN : ctx.ENTITY_TYPES.NONE;
      },
    });
    const entity = makeEntity(world);

    const mockRandom = mock.method(Math, 'random', () => randomValues[callCount++] ?? 0.5);
    try {
      entity.setPosition();
      assert.equal(entity.x, 5);
      assert.equal(entity.y, 5);
    } finally {
      mockRandom.mock.restore();
    }
  });
});

describe('Entity.infect()', () => {
  it('changes type to ZOMBIE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);

    entity.infect();

    assert.equal(entity.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('calls render() after infecting (setCell invoked)', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);

    entity.infect();

    assert.ok(world.setCellCalls.length > 0, 'setState should be called by render()');
    const last = world.setCellCalls.at(-1);
    assert.equal(last.x, entity.x);
    assert.equal(last.y, entity.y);
    assert.equal(last.type, ctx.ENTITY_TYPES.ZOMBIE);
  });
});

describe('Entity.bite()', () => {
  it('infects each human in the list', () => {
    const world = makeMockWorld();
    const biter = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    const victim1 = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    const victim2 = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);

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

  it('invokes playBite() on soundSystem when victims list is non-empty', () => {
    let playBiteCalled = false;
    const world = makeMockWorld({
      soundSystem: { playBite() { playBiteCalled = true; }, playShot() {} },
    });
    const biter = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    const victim = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);

    biter.bite([victim]);

    assert.equal(playBiteCalled, true, 'playBite() should be called when biting victims');
  });

  it('does NOT invoke playBite() when victims list is empty', () => {
    let playBiteCalled = false;
    const world = makeMockWorld({
      soundSystem: { playBite() { playBiteCalled = true; }, playShot() {} },
    });
    const biter = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);

    biter.bite([]);

    assert.equal(playBiteCalled, false, 'playBite() should NOT be called for an empty list');
  });
});

describe('Entity.reset()', () => {
  it('sets type to HUMAN', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);

    entity.reset();

    assert.equal(entity.type, ctx.ENTITY_TYPES.HUMAN);
  });

  it('resets activityLevel to 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.activityLevel = 5;

    entity.reset();

    assert.equal(entity.activityLevel, 0);
  });

  it('clears the old cell via setCell with NONE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.x = 2;
    entity.y = 4;
    world.worldState[4][2] = ctx.ENTITY_TYPES.ZOMBIE;

    entity.reset();

    const clearCall = world.setCellCalls.find(
      c => c.x === 2 && c.y === 4 && c.type === ctx.ENTITY_TYPES.NONE
    );
    assert.ok(clearCall, 'old cell should be cleared with NONE');
  });

  it('calls setPosition() exactly once', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.x = 2;
    entity.y = 4;

    const mockSetPosition = mock.method(entity, 'setPosition', () => {});
    try {
      entity.reset();
      assert.equal(mockSetPosition.mock.calls.length, 1, 'setPosition() should be called exactly once');
    } finally {
      mockSetPosition.mock.restore();
    }
  });
});

describe('Entity.render()', () => {
  it('draws ZOMBIE when type is ZOMBIE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);

    entity.render();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('draws POLICEMAN when type is POLICEMAN', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);

    entity.render();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.POLICEMAN);
  });

  it('draws PANICKING when type is POLICEMAN and activityLevel > 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
    entity.activityLevel = 3;

    entity.render();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_STATES.PANICKING);
  });

  it('sets PANICKING state when human with activityLevel > 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 3;

    entity.render();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_STATES.PANICKING);
  });

  it('draws HUMAN when human with activityLevel === 0', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 0;

    entity.render();

    const last = world.setCellCalls.at(-1);
    assert.equal(last.type, ctx.ENTITY_TYPES.HUMAN);
  });
});

describe('Entity._moveZombie()', () => {
  it('sets activityLevel when human is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.HUMAN; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
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
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
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
    const victim = makeEntity(makeMockWorld(), ctx.ENTITY_TYPES.HUMAN);

    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.HUMAN; },
      humansAt() { return [victim]; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._moveZombie();

    assert.equal(victim.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('bites policeman when one is in near sight', () => {
    const victim = makeEntity(makeMockWorld(), ctx.ENTITY_TYPES.POLICEMAN);

    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.POLICEMAN; },
      humansAt() { return [victim]; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._moveZombie();

    assert.equal(victim.type, ctx.ENTITY_TYPES.ZOMBIE);
  });

  it('sets activityLevel when POLICEMAN is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.POLICEMAN; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.activityLevel = 0;

    entity._moveZombie();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });
});

describe('Entity._shouldMove()', () => {
  it('returns true for zombie when rand equals ZOMBIE_MOVE_CHANCE', () => {
    const entity = makeEntity(makeMockWorld(), ctx.ENTITY_TYPES.ZOMBIE);

    assert.equal(entity._shouldMove(ctx.GAME_CONSTANTS.ZOMBIE_MOVE_CHANCE), true);
  });

  it('returns false for zombie when rand does not equal ZOMBIE_MOVE_CHANCE', () => {
    const entity = makeEntity(makeMockWorld(), ctx.ENTITY_TYPES.ZOMBIE);

    assert.equal(entity._shouldMove(ctx.GAME_CONSTANTS.ZOMBIE_MOVE_CHANCE + 1), false);
  });

  it('returns true for human when activityLevel > 0', () => {
    const entity = makeEntity(makeMockWorld(), ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 3;

    assert.equal(entity._shouldMove(0), true);
  });

  it('returns true for human when rand > panicThreshold and activityLevel is 0', () => {
    const world = makeMockWorld({ panicThreshold: 5 });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 0;

    assert.equal(entity._shouldMove(6), true);
  });

  it('returns false for human when rand <= panicThreshold and activityLevel is 0', () => {
    const world = makeMockWorld({ panicThreshold: 5 });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 0;

    assert.equal(entity._shouldMove(5), false);
  });
});

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

describe('Entity._movePoliceman()', () => {
  it('shoots when exactly one zombie in sight and accuracy permits', () => {
    let removeZombieCalled = false;
    const world = makeMockWorld({
      zombiesInDirection() { return 1; },
      removeZombieAt() { removeZombieCalled = true; },
      getEntityType() { return ctx.ENTITY_TYPES.ZOMBIE; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
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
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
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

  it('does not change activityLevel or call removeZombieAt when zero zombies in direction', () => {
    let removeZombieCalled = false;
    const world = makeMockWorld({
      zombiesInDirection() { return 0; },
      removeZombieAt() { removeZombieCalled = true; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
    entity.activityLevel = 0;

    // random() = 0.9 → Math.floor(0.9 * 8) = 7 ≠ 1, so no direction randomization
    const mockRandom = mock.method(Math, 'random', () => 0.9);
    try {
      entity._movePoliceman();
      assert.equal(entity.activityLevel, 0, 'activityLevel should remain 0 with no zombies in sight');
      assert.equal(removeZombieCalled, false, 'removeZombieAt should not be called');
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('does not call removeZombieAt when one zombie in direction but shot misses (random >= POLICEMAN_SHOT_ACCURACY)', () => {
    let removeZombieCalled = false;
    const world = makeMockWorld({
      zombiesInDirection() { return 1; },
      removeZombieAt() { removeZombieCalled = true; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);

    // random() = 0.9 >= POLICEMAN_SHOT_ACCURACY (0.7) → condition `random() < 0.7` is false → no shot
    // Math.floor(0.9 * 8) = 7 ≠ 1, so no direction randomization either
    const mockRandom = mock.method(Math, 'random', () => 0.9);
    try {
      entity._movePoliceman();
      assert.equal(removeZombieCalled, false, 'removeZombieAt should NOT be called when shot misses');
      assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT, 'activityLevel should still be raised');
    } finally {
      mockRandom.mock.restore();
    }
  });
});

describe('Entity._moveHuman()', () => {
  it('sets activityLevel when zombie is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.ZOMBIE; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 0;

    entity._moveHuman();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });

  it('flips direction when zombie seen ahead', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_TYPES.ZOMBIE; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.direction = ctx.DIRECTIONS.NORTH; // 1 → SOUTH (3)

    const mockRandom = mock.method(Math, 'random', () => 0.5); // > 1/8
    try {
      entity._moveHuman();
      assert.equal(entity.direction, ctx.DIRECTIONS.SOUTH);
    } finally {
      mockRandom.mock.restore();
    }
  });

  it('sets activityLevel when PANICKING entity is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_STATES.PANICKING; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.activityLevel = 0;

    entity._moveHuman();

    assert.equal(entity.activityLevel, ctx.WORLD_CONSTANTS.ACTIVE_AMOUNT);
  });

  it('does not flip direction when only PANICKING entity is in far sight', () => {
    const world = makeMockWorld({
      farLook() { return ctx.ENTITY_STATES.PANICKING; },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
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

  it('invokes playShot() on soundSystem when zombie is hit', () => {
    let playShotCalled = false;
    const world = makeMockWorld({
      // entity at (5,5) facing NORTH; SHOOT_PISTOL_DISTANCE=2 → first step checks (5,4)
      getEntityType(x, y) {
        return (x === 5 && y === 4) ? ctx.ENTITY_TYPES.ZOMBIE : ctx.ENTITY_TYPES.NONE;
      },
      soundSystem: { playBite() {}, playShot() { playShotCalled = true; } },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
    entity.x = 5;
    entity.y = 5;
    entity.direction = ctx.DIRECTIONS.NORTH;

    entity._shootZombie(ctx.ENTITY_TYPES.POLICEMAN);

    assert.equal(playShotCalled, true, 'playShot() should be called when a zombie is hit');
  });

  it('removes only the first (closest) zombie when multiple zombies are in the path', () => {
    const removeZombieCalls = [];
    const world = makeMockWorld({
      // entity at (5,5) facing NORTH; SHOOT_PISTOL_DISTANCE=2 → checks (5,4) then (5,3)
      getEntityType(x, y) {
        return (x === 5 && (y === 4 || y === 3)) ? ctx.ENTITY_TYPES.ZOMBIE : ctx.ENTITY_TYPES.NONE;
      },
      removeZombieAt(x, y) { removeZombieCalls.push({ x, y }); },
    });
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
    entity.x = 5;
    entity.y = 5;
    entity.direction = ctx.DIRECTIONS.NORTH;

    entity._shootZombie(ctx.ENTITY_TYPES.POLICEMAN);

    assert.equal(removeZombieCalls.length, 1, 'only one zombie should be removed');
    assert.deepEqual(removeZombieCalls[0], { x: 5, y: 4 }, 'the closest zombie should be removed');
  });
});

describe('Entity.move() — dispatch', () => {
  it('invokes _moveZombie() when type is ZOMBIE', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.ZOMBIE);
    entity.isResting = false;

    let called = false;
    const mockShouldMove = mock.method(entity, '_shouldMove', () => false);
    const mockMoveZombie = mock.method(entity, '_moveZombie', () => { called = true; });
    try {
      entity.move();
      assert.ok(called, '_moveZombie should be invoked for ZOMBIE type');
    } finally {
      mockShouldMove.mock.restore();
      mockMoveZombie.mock.restore();
    }
  });

  it('invokes _movePoliceman() when type is POLICEMAN', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.POLICEMAN);
    entity.isResting = false;

    let called = false;
    const mockShouldMove = mock.method(entity, '_shouldMove', () => false);
    const mockMovePoliceman = mock.method(entity, '_movePoliceman', () => { called = true; });
    try {
      entity.move();
      assert.ok(called, '_movePoliceman should be invoked for POLICEMAN type');
    } finally {
      mockShouldMove.mock.restore();
      mockMovePoliceman.mock.restore();
    }
  });

  it('invokes _moveHuman() when type is HUMAN', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.isResting = false;

    let called = false;
    const mockShouldMove = mock.method(entity, '_shouldMove', () => false);
    const mockMoveHuman = mock.method(entity, '_moveHuman', () => { called = true; });
    try {
      entity.move();
      assert.ok(called, '_moveHuman should be invoked for HUMAN type');
    } finally {
      mockShouldMove.mock.restore();
      mockMoveHuman.mock.restore();
    }
  });

  it('does not invoke _executeMove() when _shouldMove returns false', () => {
    const world = makeMockWorld();
    const entity = makeEntity(world, ctx.ENTITY_TYPES.HUMAN);
    entity.isResting = false;

    let executeMoveWasCalled = false;
    const mockShouldMove = mock.method(entity, '_shouldMove', () => false);
    const mockExecuteMove = mock.method(entity, '_executeMove', () => { executeMoveWasCalled = true; });
    const mockMoveHuman = mock.method(entity, '_moveHuman', () => {});
    try {
      entity.move();
      assert.equal(executeMoveWasCalled, false, '_executeMove should not be called when _shouldMove returns false');
    } finally {
      mockShouldMove.mock.restore();
      mockExecuteMove.mock.restore();
      mockMoveHuman.mock.restore();
    }
  });
});
