import { describe, it, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createContext } from './context.js';

let ctx;

before(() => {
  ctx = createContext();
});

// Helper: create a minimal mock world for entity tests
function makeMockWorld(overrides = {}) {
  const setCellCalls = [];
  const world = {
    width: 10,
    height: 10,
    panicThreshold: 5,
    worldState: Array.from({ length: 10 }, () => new Array(10).fill(ctx.ENTITY_TYPES.NONE)),
    getEntityType(x, y) { return this.worldState[y][x]; },
    setState(x, y, type) {
      this.worldState[y][x] = type;
      setCellCalls.push({ x, y, type });
    },
    removeZombieAt() {},
    soundSystem: { playBite() {}, playShot() {} },
    get setCellCalls() { return setCellCalls; },
    ...overrides,
  };
  return world;
}

// === Entity.constructor - stamina initialization ===

describe('Entity constructor - stamina initialization', () => {
  it('sets stamina to HUMAN_STAMINA (8) for normal human', () => {
    const world = makeMockWorld();
    const entity = new ctx.Entity(world);

    assert.equal(entity.type, ctx.ENTITY_TYPES.HUMAN);
    assert.equal(entity.stamina, ctx.Config.HUMAN_STAMINA);
    assert.equal(entity.isResting, false);
  });

  it('sets isResting to false for normal human', () => {
    const world = makeMockWorld();
    const entity = new ctx.Entity(world);

    assert.equal(entity.isResting, false);
  });
});

// === Entity.reset() - stamina reset ===

describe('Entity.reset() - stamina reset', () => {
  it('resets stamina to HUMAN_STAMINA (8)', () => {
    const world = makeMockWorld();
    const entity = new ctx.Entity(world);

    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.stamina = 3;
    entity.isResting = false;

    const mockRand = mock.method(Math, 'random', () => 0.1);
    const mockSetState = mock.method(entity.world, 'setState', () => {});
    try {
      entity.reset();
      assert.equal(entity.stamina, ctx.Config.HUMAN_STAMINA);
      assert.equal(entity.isResting, false);
    } finally {
      mockRand.mock.restore();
      mockSetState.mock.restore();
    }
  });
});

// === _executeMove() - stamina drain ===

describe('Entity._executeMove() - stamina drain', () => {
  it('drains stamina for panicked human (panic ends when stamina hits 0)', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = 1;
    entity.activityLevel = 2;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    // stamina drains to 0, which stops the panic
    assert.equal(entity.stamina, 0);
    assert.equal(entity.isResting, true);
  });

  it('activityLevel also set to 0 when stamina reaches 0', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = 1;
    entity.activityLevel = 1;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    // When stamina hits 0: activityLevel becomes 0, isResting = true
    assert.equal(entity.stamina, 0);
    assert.equal(entity.activityLevel, 0);
    assert.equal(entity.isResting, true);
  });

  it('drains stamina for panicked policeman', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.type = ctx.ENTITY_TYPES.POLICEMAN;
    entity.stamina = 1;
    entity.activityLevel = 1;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    assert.equal(entity.stamina, 0);
    assert.equal(entity.isResting, true);
  });

  it('does not drain stamina for calm human (activityLevel 0)', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = 5;
    entity.activityLevel = 0;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    assert.equal(entity.stamina, 5);
    assert.equal(entity.isResting, false);
  });

  it('does not drain stamina for zombie', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.type = ctx.ENTITY_TYPES.ZOMBIE;
    entity.stamina = 5;
    entity.activityLevel = 1;
    entity.direction = ctx.DIRECTIONS.EAST;

    entity._executeMove();

    assert.equal(entity.stamina, 5);
    assert.equal(entity.isResting, false);
  });
});

// === Entity.move() - recharge block ===

describe('Entity.move() - recharge block', () => {
  it('increments stamina by 1 when below max (HUMAN)', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = ctx.Config.HUMAN_STAMINA - 1; // 7
    entity.isResting = true;
    entity.x = 5;
    entity.y = 5;

    entity.move();

    assert.equal(entity.stamina, ctx.Config.HUMAN_STAMINA); // 8
    assert.equal(entity.isResting, false);
  });

  it('does not exceed max stamina during recharge', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = ctx.Config.HUMAN_STAMINA - 2; // 6
    entity.isResting = true;
    entity.x = 5;
    entity.y = 5;

    entity.move(); // 6 -> 7, still < 8, stays resting

    assert.equal(entity.stamina, 7);
    assert.equal(entity.isResting, true);
  });

  it('does not call _moveHuman while still recharging', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
     });
    const entity = new ctx.Entity(world);
    entity.stamina = ctx.Config.HUMAN_STAMINA - 2; // 6
    entity.isResting = true;
    entity.x = 5;
    entity.y = 5;

    let called = false;
    const mockFn = mock.method(entity, '_moveHuman', () => { called = true; });
    try {
      entity.move();
      assert.equal(called, false, '_moveHuman not called while recharging');
    } finally {
      mockFn.mock.restore();
    }
  });

  it('uses POLICEMAN_STAMINA max for policeman during recharge', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      zombiesInDirection() { return 0; },
    });
    const entity = new ctx.Entity(world);
    entity.type = ctx.ENTITY_TYPES.POLICEMAN;
    entity.stamina = ctx.Config.POLICEMAN_STAMINA - 1; // 9
    entity.isResting = true;
    entity.x = 5;
    entity.y = 5;

    entity.move();

    assert.equal(entity.stamina, ctx.Config.POLICEMAN_STAMINA); // 10
    assert.equal(entity.isResting, false);
  });
});

// === Full stamina recharge cycle ===

describe('Entity - stamina recharge cycle', () => {
  it('simulates full panic -> drain -> rest -> recharge -> move', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = 1;
    entity.activityLevel = 5;
    entity.x = 5;
    entity.y = 5;

    // Turn 1: drain (panic), isResting becomes true
    entity.move();
    assert.equal(entity.stamina, 0);
    assert.equal(entity.isResting, true);

    // Turn 2: recharge 0 -> 1, still resting
    entity.move();
    assert.equal(entity.stamina, 1);
    assert.equal(entity.isResting, true);

    // Turn 3: recharge 1 -> 2, still resting
    entity.move();
    assert.equal(entity.stamina, 2);
    assert.equal(entity.isResting, true);
  });

  it('simulates multi-turn recharge with low stamina', () => {
    const world = makeMockWorld({
      nearLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
      farLook() { return ctx.ENTITY_TYPES.NONE; },
    });
    const entity = new ctx.Entity(world);
    entity.stamina = 1;
    entity.isResting = true;
    entity.x = 5;
    entity.y = 5;

    // Multiple recharge turns
    entity.move(); // 1 -> 2
    assert.equal(entity.stamina, 2);
    assert.equal(entity.isResting, true);

    entity.move(); // 2 -> 3
    assert.equal(entity.stamina, 3);
    assert.equal(entity.isResting, true);

    entity.move(); // 3 -> 4
    assert.equal(entity.stamina, 4);
    assert.equal(entity.isResting, true);
  });
});

// === World upgrade - stamina set for policeman ===

describe('World - stamina during upgrade to policeman', () => {
  it('stamina becomes POLICEMAN_STAMINA when human is upgraded', () => {
    const world = new ctx.World(15, 15, 5, 15);

    // World creates 15 entities, all HUMAN by default
    // All have stamina = HUMAN_STAMINA (8) via constructor
    assert.ok(world.entities.length === 15);

    // Find a human entity
    const human = world.entities.find(e => e.type === ctx.ENTITY_TYPES.HUMAN);
    if (!human) {
      // No human found (all converted?), skip test
      return;
    }

    // Before upgrade: stamina = HUMAN_STAMINA = 8
    assert.equal(human.type, ctx.ENTITY_TYPES.HUMAN);
    assert.equal(human.stamina, ctx.Config.HUMAN_STAMINA);

    // Upgrade humans -> policemen
    world.upgradeHumansToPolicemen();

    // After: stamina = POLICEMAN_STAMINA = 10
    assert.equal(human.stamina, ctx.Config.POLICEMAN_STAMINA);
  });
});

// === Stamina rendering during recharge ===

describe('Entity - stamina rendering during recharge', () => {
  it('renders as PANICKING while activityLevel > 0 during recharge', () => {
    const world = makeMockWorld({});
    const entity = new ctx.Entity(world);
    entity.stamina = ctx.Config.HUMAN_STAMINA - 2; // 6
    entity.isResting = true;
    entity.activityLevel = 3; // > 0
    entity.x = 5;
    entity.y = 5;
    entity.x = 5;
    entity.y = 5;

    entity.move();

    assert.equal(
      world.worldState[5][5],
      ctx.ENTITY_STATES.PANICKING,
      'should render as PANICKING (activityLevel > 0)'
    );
  });

  it('renders as NORMAL HUMAN while activityLevel === 0 during recharge', () => {
    const world = makeMockWorld({});
    const entity = new ctx.Entity(world);
    entity.stamina = ctx.Config.HUMAN_STAMINA - 2; // 6
    entity.isResting = true;
    entity.activityLevel = 0;
    entity.x = 5;
    entity.y = 5;
    entity.x = 5;
    entity.y = 5;

    entity.move();

    assert.equal(
      world.worldState[5][5],
      ctx.ENTITY_TYPES.HUMAN,
      'should render as normal HUMAN (activityLevel === 0)'
    );
  });
});
