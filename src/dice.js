class Dice {
    constructor(game, scene, initial, dice, deterministicTrajectory, scale) {
        Object.assign(this, { game, scene, dice });
        this.sides = dice.sides;
        this.mult = dice.mult;
        this.body = dice.body ? dice.body : "normal";
        this.mod = dice.mod ? dice.mod : "none";
        this.isControlled = true;
        this.disabled = false;
        this.wasCalculated = false;
        this.scale = scale ? scale : 3;
        this.size = 32;
        this.width = this.size * this.scale;
        this.height = this.size * this.scale;

        // completely needless random polar coord generation
        if (!deterministicTrajectory) {
            const angle = Math.random() * 2 * Math.PI;
            const r = 100;
            this.x = initial.x + r * Math.cos(angle) - this.width / 2;
            this.y = initial.y + r * Math.sin(angle) - this.height / 2;
            this.velocity = {
                x: Math.random() * 25,
                y: Math.random() * 25
            };
            this.z = 1 + 1 / this.y;
        } else {
            this.x = initial.x;
            this.y = initial.y;
        }

        this.rotation = 0;
        this.rotationElapsedTime = 0;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.size;
        this.offscreenCanvas.height = this.size;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        if (dice.body == "bouncy") {
            this.bodyImg = ASSET_MANAGER.get('assets/bouncy-dice.png');
        } else {
            this.bodyImg = ASSET_MANAGER.get('assets/empty-dice.png');
        }
        this.fracturedImg = ASSET_MANAGER.get('assets/fractured-mod.png');
        this.verticals = ASSET_MANAGER.get('assets/top-sides.png');
        this.horizontals = ASSET_MANAGER.get('assets/left-right-sides.png');
        this.multVerticals = ASSET_MANAGER.get('assets/top-sides-mult.png');
        this.multHorizontals = ASSET_MANAGER.get('assets/left-right-sides-mult.png');
        this.diceSounds = [
            'assets/diceland1.wav',
            'assets/diceland2.wav',
            'assets/diceland3.wav'
        ];


        this.currFaces = {}
        this.roll();
    }

    showGoldParticle() {
        const orig = { x: this.x, y: this.y }
        const dest = { x: orig.x, y: orig.y - 100 }
        if (this.mult && this.mult[this.nortIdx] != 0) {
            const amt = this.mult[this.nortIdx];
            this.scene.roundMult += amt;
            new Particle(this.game, orig, dest, 1, `×${amt}`, 'red');
        } else {
            const amt = this.sides[this.nortIdx];
            this.scene.roundGold += amt;
            new Particle(this.game, orig, dest, 1, `$${amt}`, 'yellow');
        }
    }

    roll() {
        const roll1 = getRandomInt(6);
        let roll2 = getRandomInt(6);
        let roll3 = getRandomInt(6);

        while (roll1 == roll2)
            roll2 = getRandomInt(6);
        
        while (roll1 == roll3 || roll2 == roll3)
            roll3 = getRandomInt(6);

        this.nortIdx = roll1;
        this.eastIdx = roll2;
        this.westIdx = roll3;
        this.currFaces.north = this.sides[roll1];
        this.currFaces.east  = this.sides[roll2];
        this.currFaces.west  = this.sides[roll3];
    }

    onFloor() {
        const floorHeight = 100;
        return this.y >= PARAMS.canvasHeight - this.height + 8 * this.scale - floorHeight
            && (!this.game.mouse.isDown || this.scene.diceControlDisabled || !this.isControlled);
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (this.game.mouse.isDown && this.game.mouse.x && this.isControlled && !this.scene.diceControlDisabled) {
            const dx = this.game.mouse.x - (this.x + (this.width / 2));
            const dy = this.game.mouse.y - (this.y + (this.height / 2));
            this.velocity.x += dx * PARAMS.speed / 1000;
            this.velocity.y += dy * PARAMS.speed / 1000;

            this.x += dx * PARAMS.cling / 1000;
            this.y += dy * PARAMS.cling / 1000;
        } else {
            this.velocity.y += PARAMS.gravity / 1000;
            this.isControlled = false;
        }

        if (this.onFloor()) {
            // bounce off the ground
            if (this.body == "bouncy" && !this.wasCalculated && this.velocity.y > 20) {
                this.showGoldParticle();
                this.y -= 40;
                this.velocity.y *= -0.5;
                return;
            }
            this.rotation = 0;
            this.velocity.x = this.velocity.x /  PARAMS.drag;
            this.velocity.y = this.velocity.y / (PARAMS.drag * 1.5);

            if (!this.wasCalculated) {
                if (this.mult && this.mult[this.nortIdx]) {
                    this.scene.overlay.push({ val: this.sides[this.nortIdx], mult: this.mult[this.nortIdx] });
                } else {
                    this.scene.overlay.push({ val: this.sides[this.nortIdx] });
                }
                this.wasCalculated = true;
                this.showGoldParticle();
                const landingSound = this.diceSounds[getRandomInt(3)]
                ASSET_MANAGER.playAsset(landingSound);
                ASSET_MANAGER.get(landingSound).volume = 1;
            }
            if (Math.abs(this.velocity.x) < 2)
                this.velocity.x = 0;
            if (Math.abs(this.velocity.y) < 2)
                this.velocity.y = 0;
        } else {
            this.rotationElapsedTime += this.game.clockTick;
            if (this.rotationElapsedTime >= 1 / PARAMS.rotationSpeed) {
                this.rotationElapsedTime = this.rotationElapsedTime % (1 / PARAMS.rotationSpeed);
                this.rotation += Math.PI / 2;
                this.roll();
            }
        }
        
        // prevent dice from leaving play
        if (this.y <= 0 || this.y >= PARAMS.canvasHeight - this.height) {
            if (!this.onFloor())
                this.velocity.y = -this.velocity.y * PARAMS.bounce;

            this.y = clamp(0, this.y, PARAMS.canvasHeight - this.height);
        }
        if (this.x <= 0 || this.x >= PARAMS.canvasWidth - this.width) {
            if (this.mod == "fractured") {
                this.removeFromWorld = true;
                for (let i = 0; i < 2; i++) {
                    const initial = {
                        x: clamp(0, this.x + (Math.random() - 0.5) * 20, PARAMS.canvasWidth - this.width),
                        y: this.y
                    }
                    //constructor(game, scene, initial, dice, deterministicTrajectory)
                    const newDie = new Dice(this.game, this.scene, initial, { ...this.dice, mod: undefined }, true, 2);
                    newDie.velocity = {
                        x: -this.velocity.x * PARAMS.bounce + (Math.random() - 0.5) * 20,
                        y: this.velocity.y + (Math.random() - 0.5) * 20
                    };
                    this.game.addEntity(newDie);
                }

                return;
            }

            this.velocity.x = -this.velocity.x * PARAMS.bounce;

            this.x = clamp(0, this.x, PARAMS.canvasWidth - this.width);
        }

        this.z = this.y;
    }

    draw(ctx) {

        // rotate dice
        this.offscreenCtx.save();
        this.offscreenCtx.clearRect(0, 0, this.size, this.size);
        this.offscreenCtx.translate(this.size / 2, this.size / 2);
        this.offscreenCtx.rotate(this.rotation);
        this.offscreenCtx.translate(-this.size / 2, -this.size / 2);

        // draw empty dice
        this.offscreenCtx.drawImage(this.bodyImg, 0, 0, this.size, this.size);
        if (this.mod == "fractured") {
            this.offscreenCtx.drawImage(this.fracturedImg, 0, 0, this.size, this.size);
        }
        // draw top face
        if (this.mult && this.mult[this.nortIdx]) {
            const multIdx = Math.floor(Math.log2(this.mult[this.nortIdx])) - 1;
            this.offscreenCtx.drawImage(this.multVerticals, 0, multIdx * 14, 26, 14, 3, 1, 26, 14);
        } else {
            this.offscreenCtx.drawImage(this.verticals, 0, (this.currFaces.north - 1) * 14, 26, 14, 3, 1, 26, 14);
        }
        // draw left face
        if (this.mult && this.mult[this.westIdx]) {
            const multIdx = Math.floor(Math.log2(this.mult[this.westIdx])) - 1;
            this.offscreenCtx.drawImage(this.multHorizontals, multIdx * 14, 0, 14, 21, 1, 9, 14, 21);
        } else {
            this.offscreenCtx.drawImage(this.horizontals, (this.currFaces.west - 1) * 14, 0, 14, 21, 1, 9, 14, 21);
        }
        // draw right face
        if (this.mult && this.mult[this.eastIdx]) {
            const multIdx = Math.floor(Math.log2(this.mult[this.westIdx])) - 1;
            this.offscreenCtx.drawImage(this.multHorizontals, multIdx * 14, 21, 14, 21, 17, 9, 14, 21);
        } else {
            this.offscreenCtx.drawImage(this.horizontals, (this.currFaces.east - 1) * 14, 21, 14, 21, 17, 9, 14, 21);
        }

        this.offscreenCtx.restore();

        ctx.drawImage(this.offscreenCanvas, this.x, this.y, this.width, this.height);
    }
}
