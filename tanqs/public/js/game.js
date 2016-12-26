var GameState = { LOGIN: 0, GAME: 1, RESPAWN: 2 };

function Game(server_info) {

	this.server_info = server_info.config;

	this.n_snaps = 2;
	this.delay = this.server_info.rates.ms_frame * this.server_info.rates.frames_update * this.n_snaps / 2;

	this.state = GameState.LOGIN;

	this.snapring = new SnapshotRing(this.n_snaps, this.server_info.rates.frames_update, this.server_info.capacity);
	this.time_0 = 0;
	this.time_buffer = []; this.n_times = 4;

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

	//console.log(this.renderer.tracking_tank);

};

Game.prototype.on_server_update = function(data) {

	if (this.time_buffer.length >= this.n_times) this.time_buffer.splice(0, 1);
	this.time_buffer.push({t: Date.now(), f: data.snapshot.frame});

	this.players = data.players;

	//console.log(data.snapshot.tanks[0]);
	this.snapring.add_frame(data.snapshot);

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

	if (!this.time_buffer.length) return;

	var t_0 = 0;
	for (var i = 0; i < this.time_buffer.length; i++) {
		t_0 += this.time_buffer[i].t - this.time_buffer[i].f * this.server_info.rates.ms_frame;
	}
	t_0 /= this.time_buffer.length;

	if (this.time_0 == 0)
		this.time_0 = t_0;
	else
		this.time_0 = lerp(this.time_0, t_0, 0.4);

	console.log(this.time_0);

	var frame_time = Date.now() - this.delay;
	var frame = (frame_time - this.time_0) / this.server_info.rates.ms_frame;

	this.snapring.get_frame(this.renderer.frame_snapshot, frame);

	this.renderer.render_frame();

};