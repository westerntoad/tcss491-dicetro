class Item {
    constructor(game, scene, shop, loc, size, rarity) {
        Object.assign(this, { game, shop, scene, rarity });

        if (this.rarity == 'common') {
            this.drop = ITEM_POOL.dropCommon();
        } else if (this.rarity == 'uncommon') {
            this.drop = ITEM_POOL.dropUncommon();
        } else {
            this.drop = ITEM_POOL.dropRare();
        }
        this.name = this.drop.name;
        this.item = this.drop.item;
        this.cost = this.drop.cost;
        this.isDice = this.item.type == 'dice';
        this.taken = false;
        this.width = size.width;
        this.height = size.height;
        this.x = loc.x - size.width / 2;
        this.y = loc.y - size.height / 2;
        this.z = 3;

        if (this.isDice) {
            const diceButtSize = {
                width : 64,
                height: 64
            }
            const diceButtLoc = {
                x: this.x + (this.width - diceButtSize.width) / 2,
                y: this.y + (this.height - diceButtSize.height) / 2
            }
            this.diceButt = new DiceButton(this.game, this.scene, diceButtLoc, diceButtSize, this.item);
            this.diceButt.z = 100_000;
            this.game.addEntity(this.diceButt);
        } else {
            this.itemIcon = new Icon(
                this.game, this.scene, this.item,
                this.x + (this.width - 64) / 2,
                this.y + (this.height - 64) / 2,
                64, 64
            );
            this.game.addEntity(this.itemIcon);
        }

    }

    clicked() {
        if (this.isDice) {
            const diceSlotsHaveRoom = this.scene.diceSlotsUnlocked[this.scene.dice.length];
            if (diceSlotsHaveRoom) {
                this.scene.dice.push(this.item);
                this.scene.gold -= this.cost;
                this.taken = true;
                this.diceButt.removeFromWorld = true;
            } else {
                this.heldDice = new HoverDice(this.game, this.scene, this.diceButt, this.shop);
                this.game.addEntity(this.heldDice);
            }
        } else {
            let flag = false;
            for (let i = 0; i < this.scene.passives.length; i++) {
                const curr = this.scene.passives[i];
                if (this.item.name == curr.name) {
                    curr.count++;
                    flag = true;
                    break;
                }
            }
            if (!flag) {
                this.scene.passives.push(this.item);
                this.shop.addPassive(this.item);
            }

            this.scene.gold -= this.cost;
            this.itemIcon.removeFromWorld = true;
            this.taken = true;
        }
    }

    update() {
        if (this.game.click) {
            const e = this.game.click;
            if (e.x >= this.x && e.x <= this.x + this.width
                    && e.y >= this.y && e.y <= this.y + this.height
                    && this.scene.gold >= this.cost && !this.disableBuy) {

                this.clicked();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        // if item taken
        if (this.taken) {
            ctx.font = 'italic 38pt monospace'
            ctx.fillStyle = '#dddddd';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#888888';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'center';
            ctx.fillStyle = '#888888';
            ctx.fillText('item taken', this.x + this.width / 2, this.y + this.height / 2, this.width - 40);
            return;
        }

        

        // background
        if (this.rarity == 'common') {
            ctx.fillStyle = '#dddddd';
            ctx.strokeStyle = '#888888';
        } else if (this.rarity == 'uncommon') {
            ctx.fillStyle = '#ddddff';
            ctx.strokeStyle = '#0000ff';
        } else if (this.rarity == 'rare') {
            ctx.fillStyle = '#ffccff';
            ctx.strokeStyle = '#ff00ff';
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        
        // name
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'center';
        ctx.font = '14pt monospace';
        ctx.fillText(this.name ? this.name : `${this.rarity} dice`, this.x + this.width * 0.5, this.y + 60, this.width);

        // cost
        ctx.fillStyle = '#ff6666';
        ctx.font = '24pt monospace';
        ctx.fillText(this.cost, this.x + this.width * 0.5, this.y + this.height - 40);

        ctx.restore();
    }
}

class Icon {
    constructor(game, scene, item, x, y, w, h) {
        Object.assign(this, { game, scene, item, x, y, w, h });
        this.z = 100_010;
        this.img = ASSET_MANAGER.get(this.item.icon);
        
    }

    update() {
        const mx = this.game.mouse.x;
        const my = this.game.mouse.y;
        this.highlighted = this.item.type == 'passive'
            && mx >= this.x && mx <= this.x + this.w
            && my >= this.y && my <= this.y + this.h;

    }

    draw(ctx) {
        ctx.drawImage(this.img, this.x, this.y, this.w, this.h);

        // multiple counts
        if (this.item.count > 1) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#000000';
            ctx.textBaseline = 'center';
            ctx.font = '14pt monospace';
            ctx.fillText(this.item.count, this.x + this.w, this.y);
        }

        // dialog
        if (this.highlighted) {
            ctx.font = '11pt monospace';
            const measure = ctx.measureText(this.item.desc);
            const dialogWidth = measure.width + 20;
            const dialogHeight = 40;
            const dialogX = Math.max(0, this.x + this.w / 2 - dialogWidth / 2);
            const dialogY = this.y - dialogHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'center';
            ctx.fillText(this.item.desc, dialogX + dialogWidth / 2, dialogY + dialogHeight / 2 + 5, dialogWidth);
        }
    }
}
