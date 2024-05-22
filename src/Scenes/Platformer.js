class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }
    preload(){
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
    }
    init() {
        // variables and settings
        this.ACCELERATION = 1100;
        this.DRAG = 3000;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1000;
        this.JUMP_VELOCITY = -1000;
        this.MAX_SPEED = 600;
        this.score = 0;


        this.spawnX = game.config.width/10;
        this.spawnY = 5*game.config.height/6;
    }

    create() {

        this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '32px', fill: '#FFF' });
        this.scoreText.setScrollFactor(0);
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 120, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        //Create background I guess
        this.background = this.map.createLayer("Background", this.tileset, 0, 0);
        this.background.setScale(2.0);
        this.background = this.map.createLayer("Background2", this.tileset, 0, 0);
        this.background.setScale(2.0);

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.groundLayer.setScale(2.0);
        this.physics.world.setBounds(0, 0, this.map.widthInPixels*2, this.map.heightInPixels*2);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });
        //console.log(this.groundLayer);
        //this.hazards = this.physics.add.group();
        let water_tiles = this.groundLayer.filterTiles((tile)=>{
            //console.log(tile);
            if (tile.index == 34 || tile.index == 44){
                return true;
            }
            return false;

        },);
        //console.log(water_tiles);
        for (let tile of water_tiles){
            tile.setCollisionCallback(this.water, this);
        }



        let spike_tiles = this.groundLayer.filterTiles((tile)=>{
            //console.log(tile);
            if (tile.index == 69 ){
                return true;
            }
            return false;
        },);

        for (let tile of spike_tiles){
            tile.setCollisionCallback(this.water, this);
        }
  

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(this.spawnX, this.spawnY, "platformer_characters", "tile_0000.png").setScale(SCALE)
        my.sprite.player.body.setSize(15, 23); // 调整碰撞体积的高度 adjust the collision hight
        my.sprite.player.body.setOffset(5, 0)
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.body.setMaxSpeed(this.MAX_SPEED);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        
        //Have camera follow player
        this.cameras.main.setZoom(1.5);
        this.cameras.main.centerOn(my.sprite.player.x, my.sprite.player.y);
        this.cameras.main.startFollow(my.sprite.player, false, 0.5, 0.5);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels*2, this.map.heightInPixels*2);
        //this.cameras.main.setScroll(game.config.width/2, game.config.height/2);

        //Set up coins
        this.coins = this.map.createLayer("Coins", this.tileset, 0, 0);
        this.coins.setScale(2.0);
        this.coins.setCollisionByProperty({
            coin: true
        });
        this.physics.add.overlap(my.sprite.player, this.coins, this.coinPickup, null, this);
        this.coinSound = this.sound.add("coin collected sound");
        //debug key listener  (D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        //Set up flags
        this.flags = this.map.createLayer("Flags", this.tileset, 0, 0);
        this.flags.setScale(2);
        this.flags.setCollisionByProperty({
            collides: true
        });
        this.physics.add.overlap(my.sprite.player, this.flags, this.checkPoint, null, this);

        this.timedEvent = this.time.addEvent({ delay: 10000, callback: this.onEvent, callbackScope: this, repeat: 1, startAt: 5000 });
        let line = new Phaser.Geom.Line(0, 0, 20, 0);
        this.bubblesVFX = this.add.particles(0, 0, "kenny-particles", {
            frame: 'circle_01.png',
            emitZone: { 
                type: 'random',
                source: line, 
                quantity: 100, 
                yoyo: true,
            },
            scale: {start: 0.001, end: 0.03},
            // TODO: Try: maxAliveParticles: 8,
            maxAliveParticles: 8,
            lifespan: 500,
            // TODO: Try: gravityY: -400,
            gravityY: -200,
            //quantity: 250,
            tintFill: 0xFFFF00,
        });

        this.bubblesVFX.stop();


    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);

        } else if(cursors.right.isDown) {
            my.sprite.player.body.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);

        } else {
            my.sprite.player.body.setAccelerationX(0);
            my.sprite.player.body.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
        }

        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }
    }
    coinPickup(player, coin){
        coin.visible = false;
        let tile_removed = this.map.removeTile(coin);
        if (tile_removed[0].index != -1){
            this.coinSound.play();
            this.score += 10;
            this.scoreText.setText("Score: " + this.score);
        }
    }
    checkPoint(player, flag){
        if (flag.index == 112){
            this.spawnX = flag.x * 36;
            this.spawnY = flag.y * 36;
        } else if (flag.index == 132){
            this.spawnX = flag.x * 36;
            this.spawnY = (flag.y - 1) * 36;
        }
    }
    resetCoins() {
        this.map.getLayer('Coins').tilemapLayer.forEachTile(tile => {
            if (tile.index !== -1) {
                tile.visible = true;
            }
        });
    }
    water(){
        this.physics.world.gravity.y = 500;
        this.bubblesVFX.start();
        this.bubblesVFX.startFollow(my.sprite.player, -5, -15, false);
        this.respawn();
    }
    respawn(){
        this.physics.world.gravity.y = 1000;
        my.sprite.player.x = this.spawnX;
        my.sprite.player.y = this.spawnY;
        this.resetCoins();
        this.score = 0;
        this.scoreText.setText("Score: " + this.score);
    }
    
}