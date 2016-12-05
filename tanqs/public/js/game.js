var GameState = { LOGIN: 0, GAME: 1, RESPAWN: 2 };

function Game(server_info) {

	this.n_snaps = 5;
	this.delay = 60;
	this.server_info = server_info.config;

	this.state = GameState.LOGIN;

	this.snapring = new SnapshotRing(this.n_snaps, this.server_info.capacity);
	this.last_update = 0;

	this.players = [];
	this.player_name = '';
	this.player_tank_id = -1;

	this.map = server_info.map;

	this.renderer = new Renderer(this, html.canvas, html.context);

	html.join_button.onclick = (function() {
		if (this.state == GameState.LOGIN) {
			send_login(html.nick_input.value);
		} else if (this.state == GameState.RESPAWN) {
			send_respawn();
		}
	}).bind(this);

	setInterval(this.render_frame.bind(this), 20);
	setInterval(this.send_input.bind(this), 60);

}

Game.prototype.on_join = function(data) {

	this.player_name = data.name;
	this.player_tank_id = data.tank_id;
	this.renderer.tracking_tank = data.tank_id;

	html.hide_splash();
	this.state = GameState.GAME;

};

Game.prototype.on_server_update = function(data) {


	var update = data.snapshot.frame / this.server_info.rates.frames_update;

	if (update > this.last_update) {

		// Set the player list
		this.players = data.players;

		// Set the snapshot
		var ring_index = update % this.n_snaps;

		this.snapring.set(ring_index, data.snapshot);

		this.snapring.snaps[ring_index].update = update;
		this.snapring.snaps[ring_index].time = Date.now();

		this.last_update = update;

		var player_tank = this.snapring.snaps[ring_index].tanks[this.player_tank_id];

		if (this.state == GameState.GAME) {

			if (!player_tank.alive) {
				html.set_splash_respawn();
				this.state = GameState.RESPAWN;
			}

		} else if (this.state == GameState.RESPAWN) {

			if (player_tank.alive) {
				html.hide_splash();
				this.state = GameState.GAME;
			}

		}

		for (var i = 0; i < data.events.length; i++) {
			var evt = data.events[i];
			if (evt.type == 'death') {
				console.log('event: death');
				particles.add_explosion({x: evt.x, y: evt.y}, colors.fill[this.renderer.frame_snapshot.tanks[evt.tank].color]);
			}
		}

	}

};

Game.prototype.send_input = function() {

	var input = {
		sx: html.mouse.x,
		sy: html.mouse.y,
		shoot: html.mousepress.left,
		drop: html.mousepress.right
	};

	html.mousepress.left = false;
	html.mousepress.right = false;

	send_input(input);

};

Game.prototype.render_frame = function() {

	// update the particle effects!
	particles.update();

	var avg_update = 0; var avg_time = 0;
	for (var i = 0; i < this.n_snaps; i++) {
		avg_update += this.snapring.snaps[i].update;
		avg_time += this.snapring.snaps[i].time;
	}
	avg_update /= this.n_snaps; avg_time /= this.n_snaps;

	var avg_ms = (this.snapring.snaps[this.last_update % this.n_snaps].time - this.snapring.snaps[(this.last_update + 1) % this.n_snaps].time) /
	(this.snapring.snaps[this.last_update % this.n_snaps].update - this.snapring.snaps[(this.last_update + 1) % this.n_snaps].update);

	if (!avg_update) return;

	var now = Date.now();
	now -= this.delay;

	var update = (now - avg_time) / avg_ms + avg_update;

	if (update > this.last_update) { // Oops we outa server updates!
		update = this.last_update;
	} else if (update < this.last_update - this.n_snaps) {
		update = this.last_update - this.n_snaps;
	}

	this.snapring.set_lerp(this.renderer.frame_snapshot, update);

	this.renderer.render_frame();

};