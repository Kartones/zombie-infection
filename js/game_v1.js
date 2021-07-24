"use strict";

function colorsEqual(array1, array2) {
    return array1[0] === array2[0];
    // As each color has different red component value, shortcut comparison. Else would need to use:
    //return array1.length === array2.length
    //       && array1.every(function(value, index) { return value === array2[index]})
}

class Entity {

    constructor(world) {
        this.world = world;

        this.x = 0;
        this.y = 0;
        this.direction = this._randomDirection();
        this.type = this.TYPE_HUMAN;
        this.activityLevel = 0;
    }

    position() {
        for (let attemptOk = 0; attemptOk < 100; attemptOk++) {
            this.x = Math.floor(Math.random() * this.world.width);
            this.y = Math.floor(Math.random() * this.world.height);

            if (colorsEqual(this.world.getPixel(this.x, this.y), this.world.COLOR.EMPTY)) {
                attemptOk = 100;
            }
        }
        this._draw();
    }

    infect() {
        this.type = this.TYPE_ZOMBIE;
        this._draw();
    }

    bite(humans) {
        for (let human of humans) {
            human.infect();
        }
    }

    cureInfection() {
        this.type = this.TYPE_HUMAN;
        this.activityLevel = 0;

        this.world.setPixel(this.x, this.y, this.world.COLOR.EMPTY);
        this.position();
    }

    move() {
        let rand = Math.floor(Math.random() * 10);

        // Humans stay still unless active, or random chance above panicThreshold.
        // Else both humans and zombies have a small random chance to anyway move
        if ((this.type === this.TYPE_HUMAN && (this.activityLevel > 0 || rand > this.world.panicThreshold))
            || (this.type === this.TYPE_ZOMBIE && rand === 1))
        {
            // If nothing, then just advance
            if (this.world.nearLook(this.x, this.y, this.direction) === this.world.TARGETS.NOTHING) {
                this.world.setPixel(this.x, this.y, this.world.COLOR.EMPTY);
                switch(this.direction) {
                    case this.world.DIRECTIONS.NORTH:
                        this.y--;
                        break;
                    case this.world.DIRECTIONS.EAST:
                        this.x++;
                        break;
                    case this.world.DIRECTIONS.SOUTH:
                        this.y++;
                        break;
                    case this.world.DIRECTIONS.WEST:
                        this.x--;
                        break;
                }
            } else {
                this.direction = this._randomDirection();
            }

            this._draw();

            if (this.activityLevel > 0) {
                this.activityLevel--;
            }
        }

        let target = this.world.farLook(this.x, this.y, this.direction);

        if (this.type === this.TYPE_ZOMBIE) {

            // if sees human -> gets active
            if (target === this.world.TARGETS.HUMAN || target === this.world.TARGETS.HUMAN_PANIC) {
                this.activityLevel = this.world.ACTIVE_AMOUNT;
            }

            // follows other zombies, unless inactive (then wanders in place)
            if (this.activityLevel === 0 && target !== this.world.TARGETS.ZOMBIE) {
                this.direction = this._randomDirection();
            }

            let victim = this.world.nearLook(this.x, this.y, this.direction);
            // human or pacnicked human -> moves towards victim
            if (victim === this.world.TARGETS.HUMAN || victim === this.world.TARGETS.HUMAN_PANIC) {
                let dx = this.x,
                    dy = this.y;

                switch (this.direction) {
                    case this.world.DIRECTIONS.NORTH:
                        dy--;
                        break;
                    case this.world.DIRECTIONS.EAST:
                        dx++;
                        break;
                    case this.world.DIRECTIONS.SOUTH:
                        dy++;
                        break;
                    case this.world.DIRECTIONS.WEST:
                        dx--;
                        break;
                }

                let humansAtPosition = this.world.humansAt(dx, dy);
                if (humansAtPosition) {
                    this.bite(humansAtPosition);
                }
            }
        } else {  // this.TYPE_HUMAN

            // if sees danger/panic -> gets active
            if (target === this.world.TARGETS.ZOMBIE || target === this.world.TARGETS.HUMAN_PANIC) {
                this.activityLevel = this.world.ACTIVE_AMOUNT;
            }

            // if sees a zombie -> flees (by adding 2 will go to opposite of direction)
            if (target === this.world.TARGETS.ZOMBIE) {
                this.direction += 2;
                if (this.direction > 4) {
                    this.direction -= 4;
                }
            }

            // Random chance of changing direction
            if (Math.floor(Math.random() * 8) === 1) {
                this.direction = this._randomDirection();
            }
        }
    }

    _randomDirection() {
        return Math.floor(Math.random() * 4) + 1;
    }

    _draw() {
        if (this.type === this.TYPE_ZOMBIE) {
            this.world.setPixel(this.x, this.y, this.world.COLOR.ZOMBIE);
        } else if (this.activityLevel > 0) {
            this.world.setPixel(this.x, this.y, this.world.COLOR.HUMAN_PANIC);
        } else {
            this.world.setPixel(this.x, this.y, this.world.COLOR.HUMAN);
        }
    }

}

Entity.prototype.TYPE_ZOMBIE = 1;
Entity.prototype.TYPE_HUMAN = 2;


class World {

    constructor(canvasNodeId, mapWidth, mapHeight, panicThreshold, numEntities) {
        this.panicThreshold = panicThreshold || 5;

        this.canvas = document.getElementById(canvasNodeId);

        this.canvasContext = this.canvas.getContext('2d');

        this.canvasContext.scale(this.SCALE_FACTOR, this.SCALE_FACTOR);

        this.width = Math.max(2, mapWidth || 0);
        this.height = Math.max(2, mapHeight || 0);

        this.scaledWidth = this.width * this.SCALE_FACTOR;
        this.scaledHeight = this.height * this.SCALE_FACTOR;

        this.canvas.width = this.scaledWidth;
        this.canvas.height = this.scaledHeight;

        // Important to keep pixels as such
        this.canvasContext.imageSmoothingEnabled = false;

        // cache to not recalculate once and again scaled pixels
        this.computedColors = {};
        for (let color of [this.COLOR.EMPTY, this.COLOR.HUMAN, this.COLOR.HUMAN_PANIC, this.COLOR.ZOMBIE]) {
            let colorComponents = new Array();
            for (let pixelNum = 0; pixelNum < this.SCALE_FACTOR * this.SCALE_FACTOR; pixelNum++) {
                // 255 -> no transparency for alpha channel
                colorComponents = colorComponents.concat([...color, 255]);
            }
            let pixels = new ImageData(Uint8ClampedArray.from(colorComponents), this.SCALE_FACTOR);
            this.computedColors[color] = pixels;
        }

        this._addWalls();

        // For tiny maps, don't overflow
        let amountEntities = Math.min(this.width * this.height - 2, numEntities);

        this.entities = new Array(amountEntities).fill().map(() => (new Entity(this)));
        this.entities.forEach(entity => entity.position());
        this.entities[0].infect();
    }

    getPixel(x, y) {
        let pixelData = this.canvasContext.getImageData(x * this.SCALE_FACTOR, y * this.SCALE_FACTOR, 1, 1).data;
        // [R,G,B] (skipping alpha channel)
        return [pixelData[0], pixelData[1], pixelData[2]];
    }

    setPixel(x, y, color) {
        this.canvasContext.putImageData(this.computedColors[color], x * this.SCALE_FACTOR, y * this.SCALE_FACTOR);
    }

    nearLook(x, y, direction) {
        return this._look(x, y, direction, 1);
    }

    farLook(x, y, direction) {
        return this._look(x, y, direction, 10);
    }

    humansAt(x, y) {
        let matches =
            this.entities
                .filter(entity => entity.x === x && entity.y === y)
                .filter(entity => entity.type === entity.TYPE_HUMAN);
        return matches.length > 0 ? matches : undefined;
    }

    _addWalls() {
        let wallRGBA = `rgba(${this.COLOR.WALL[0]},${this.COLOR.WALL[1]},${this.COLOR.WALL[2]},255)`;
        let emptyRGBA = `rgba(${this.COLOR.EMPTY[0]},${this.COLOR.EMPTY[1]},${this.COLOR.EMPTY[2]},255)`;

        this.canvasContext.lineWidth = this.SCALE_FACTOR;

        // Starts all wall
        this.canvasContext.fillStyle = wallRGBA;
        this.canvasContext.fillRect(0, 0, this.scaledWidth, this.scaledHeight);

        // creates streets
        this.canvasContext.strokeStyle = emptyRGBA;
        for (let count = 0; count < 80; count++) {
            this.canvasContext.strokeRect(
                Math.floor(Math.random() * this.scaledWidth - 1) + 1,
                Math.floor(Math.random() * this.scaledHeight - 1) + 1,
                Math.floor(Math.random() * 60 * this.SCALE_FACTOR) + 15 * this.SCALE_FACTOR,
                Math.floor(Math.random() * 60 * this.SCALE_FACTOR) + 15 * this.SCALE_FACTOR
            )
        }

        // and some empty spaces
        this.canvasContext.fillStyle = emptyRGBA;
        for (let count = 0; count < 12; count++) {
            this.canvasContext.fillRect(
                Math.floor(Math.random() * this.scaledWidth - 1) + 1,
                Math.floor(Math.random() * this.scaledHeight - 1) + 1,
                Math.floor(Math.random() * 10 * this.SCALE_FACTOR) + 10 * this.SCALE_FACTOR,
                Math.floor(Math.random() * 10 * this.SCALE_FACTOR) + 10 * this.SCALE_FACTOR
            )
        }
    }

    _look(x, y, direction, distance) {
        for (let index = 0; index < distance; index++) {
            switch (direction) {
                case this.DIRECTIONS.NORTH:
                    y--;
                    break;
                case this.DIRECTIONS.EAST:
                    x++;
                    break;
                case this.DIRECTIONS.SOUTH:
                    y++;
                    break;
                case this.DIRECTIONS.WEST:
                    x--;
                    break;
            }

            if ((x > (this.width - 1)) || x < 1 || (y > (this.height - 1)) || y < 1) {
                return this.TARGETS.WALL;
            } else {
                const entityColor = this.getPixel(x, y);
                if (colorsEqual(entityColor, this.COLOR.WALL)) {
                    return this.TARGETS.WALL;
                } else if (colorsEqual(entityColor, this.COLOR.HUMAN_PANIC)) {
                    return this.TARGETS.HUMAN_PANIC;
                } else if (colorsEqual(entityColor, this.COLOR.HUMAN)) {
                    return this.TARGETS.HUMAN;
                } else if (colorsEqual(entityColor, this.COLOR.ZOMBIE)) {
                    return this.TARGETS.ZOMBIE;
                }
            }
        }

        return this.TARGETS.NOTHING;
    }
}


World.prototype.SCALE_FACTOR = 4;

// When an entity gets active, how many "action points" does it get
World.prototype.ACTIVE_AMOUNT = 10;

World.prototype.COLOR = {};
World.prototype.COLOR.EMPTY = [0, 0, 0];
World.prototype.COLOR.HUMAN = [213, 175, 213];
World.prototype.COLOR.HUMAN_PANIC = [196, 43, 196];
World.prototype.COLOR.ZOMBIE = [30, 170, 30];
World.prototype.COLOR.WALL = [90, 90, 90];

World.prototype.TARGETS = {};
World.prototype.TARGETS.NOTHING = 0;
World.prototype.TARGETS.ZOMBIE = 1;
World.prototype.TARGETS.HUMAN = 2;
World.prototype.TARGETS.WALL = 3;
World.prototype.TARGETS.HUMAN_PANIC = 4;


World.prototype.DIRECTIONS = {};
World.prototype.DIRECTIONS.NORTH = 1;
World.prototype.DIRECTIONS.EAST = 2;
World.prototype.DIRECTIONS.SOUTH = 3;
World.prototype.DIRECTIONS.WEST = 4;

class Game {

    constructor(canvasNodeId, mapWidth, mapHeight, numEntities) {
        this.world = new World(canvasNodeId, mapWidth, mapHeight, this.PANIC_LEVEL, numEntities);

        this.paused = true;
        this.speed = 1;
        this.updateId = undefined;

        document.addEventListener('keydown', this._keydown.bind(this));

        document.getElementById('game-canvas').addEventListener('click', this._pauseOrUnpause.bind(this));
    }

    _update() {
        if (this.paused) {
            return;
        }

        this.world.entities.forEach(entity => entity.move());
        // re-schedule another iteration only after finishing processing logic, or else they queue up!
        this.updateId = setTimeout(this._update.bind(this), 50*this.speed);
    }

    _addEntities() {
        for (let count = 0, maximumReached = false; count < 100 && !maximumReached; count++) {
            if (this.world.entities.length === this.MAX_ENTITIES) {
                maximumReached = true;
            } else {
                let newEntity = new Entity(this.world);
                this.world.entities.push(newEntity);
                newEntity.position();
            }
        }
    }

    _removeEntities() {
        for (let count = 0, minimumReached = false; count < 100 && !minimumReached; count++) {
            // As the first infected is entity 0, it is never removed, so we always have at least one zombie
            if (this.world.entities.length === this.MIN_ENTITIES) {
                minimumReached = true;
            } else {
                let removedEntity = this.world.entities.pop();
                this.world.setPixel(removedEntity.x, removedEntity.y, this.world.COLOR.EMPTY);
            }
        }
    }

    _pauseOrUnpause() {
        this.paused = !this.paused;
        if (this.paused) {
            clearTimeout(this.updateId);
        } else {
            this.updateId = setTimeout(this._update.bind(this), 50*this.speed);
        }
    }

    _keydown(event) {
        switch(event.code) {
            case 'Space':
                this._pauseOrUnpause().bind(this);
                break;
            case 'KeyF':
                // full panic mode (by lowering the threshold)
                this.world.panicThreshold = this.world.panicThreshold === this.PANIC_LEVEL ? 0 : this.PANIC_LEVEL;
                break;
            case 'KeyS':
                this.speed = (this.speed + 1) % 3;
                break;
            case 'KeyR':
                // Restart
                this.world.entities.forEach(entity => entity.cureInfection());
                this.world.entities[0].infect();
                break;
            case 'Minus':
                this._removeEntities();
                break;
            case 'Equal':
            case 'Plus':
                this._addEntities();
                break;
        }
    }
}

Game.prototype.PANIC_LEVEL = 5;

// Minimum when substracting
Game.prototype.MIN_ENTITIES = 100;
Game.prototype.MAX_ENTITIES = 4000;