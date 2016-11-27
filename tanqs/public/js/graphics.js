
function Camera() {

	this.translate = new Vec2();

}

function Renderer(game, canvas, context) {

	this.game = game;
	this.canvas = canvas;
	this.context = context;

	this.camera = new Camera();
	this.tracking_tank = -1;

	this.frame_snapshot = new Snapshot(game.server_info.capacity);

}

Renderer.prototype.render_frame = function(frame) {

	this.context.setTransform(1, 0, 0, 1, 0, 0);
	this.context.clearRect(0, 0, canvas.width, canvas.height);

	this.context.translate(this.canvas.width / 2, this.canvas.height / 2);

	if (this.tracking_tank > -1) {
		var tank = this.frame_snapshot.tanks[this.tracking_tank];
		this.camera.translate.set(tank.pos);
	}
	this.context.translate(-this.camera.translate.x, -this.camera.translate.y);

	this.render_background();

	this.render_polys();
	this.render_arcs();
	this.render_bullets();
	this.render_tanks();

	this.render_names();

	this.context.translate(this.camera.translate.x, this.camera.translate.y);

	this.render_ui();

};

Renderer.prototype.render_background = function() {
	this.context.strokeStyle = '#333';
	this.context.lineWidth = 3;

	var grid_spacing = 100;
	var map_width = this.game.map.width;
	var map_height = this.game.map.height;

	this.context.beginPath();
	for (var x = -map_width / 2; x <= map_width / 2; x+= grid_spacing) {
		this.context.moveTo(x, -map_height / 2);
		this.context.lineTo(x, map_height / 2);
	}
	for (var y = -map_height / 2; y <= map_height / 2; y+= grid_spacing) {
		this.context.moveTo(-map_width / 2, y);
		this.context.lineTo(map_width / 2, y);
	}
	this.context.stroke();
};

Renderer.prototype.render_polys = function() {
	this.context.fillStyle = '#333';
	this.context.strokeStyle = '#555';
	this.context.lineWidth = 3;

	for (var i = 0; i < this.game.map.polys.length; i++) {

		var poly = this.game.map.polys[i];

		this.context.beginPath();
		this.context.moveTo(poly.v[0].x, poly.v[0].y);
		for (var j = 1; j < poly.v.length; j++) {
			this.context.lineTo(poly.v[j].x, poly.v[j].y);
		}
		this.context.closePath();
		this.context.fill();
		this.context.stroke();

	}
};

Renderer.prototype.render_arcs = function() {
	this.context.fillStyle = '#333';
	this.context.strokeStyle = '#555';
	this.context.lineWidth = 3;

	for (var i = 0; i < this.game.map.arcs.length; i++) {
		var arc = this.game.map.arcs[i];

		this.context.beginPath();
		this.context.arc(arc.pos.x, arc.pos.y, arc.rad, 0, Math.PI * 2);
		this.context.fill();
		this.context.stroke();
	}
};

Renderer.prototype.render_tanks = function() {
	for (var i = 0; i < this.frame_snapshot.tanks.length; i++) {
		var tank = this.frame_snapshot.tanks[i];
		if (tank.alive) {
			this.render_tank(tank);
		}
	}
};

Renderer.prototype.render_bullets = function() {
	for (var i = 0; i < this.frame_snapshot.bullets.length; i++) {
		var bullet = this.frame_snapshot.bullets[i];
		if (bullet.alive) {
			this.render_bullet(bullet);
		}
	}
};

Renderer.prototype.render_names = function() {

	this.context.fillStyle = '#fff';
	this.context.font = "16px Open Sans";
	this.context.textAlign = "center";
	this.context.textBaseline = "middle";

	for (var i = 0; i < this.game.players.length; i++) {
		var player = this.game.players[i];
		if (player.tank == this.game.player_tank_id) continue;
		var tank = this.frame_snapshot.tanks[player.tank];
		if (tank.alive) {
			this.context.fillText(player.name, tank.pos.x, tank.pos.y + tank.rad * 3);
		}
	}

};

Renderer.prototype.render_tank = function(tank) {

	var rad = tank.rad * 0.85;

	this.context.translate(tank.pos.x, tank.pos.y);
	this.context.rotate(tank.dir);

	this.context.fillStyle = colors.fill[Math.floor(Date.now() / 2000) % 21];

	this.context.strokeStyle = colors.tank_stroke;

	this.context.lineWidth = 3;
	this.context.lineJoin = 'round';

	// Base tank square
	this.context.beginPath();
	this.context.rect(-rad, -rad, 2 * rad, 2 * rad);
	this.context.fill();
	this.context.stroke();

	this.context.beginPath();
	// Wheels
	this.context.rect(-rad * 1.25, -rad * 1.25, rad * 2.5, rad * 0.75);
	this.context.rect(-rad * 1.25, rad * 0.5, rad * 2.5, rad * 0.75);
	// Gun
	this.context.rect(-2 * rad * (1 - 1), -rad * 0.2, rad * 2, rad * 0.4);

	this.context.fill();
	this.context.stroke();

	this.context.rotate(-tank.dir);

	this.context.translate(-tank.pos.x, -tank.pos.y);

};

Renderer.prototype.render_bullet = function(bullet) {

	this.context.fillStyle = colors.fill[Math.floor(Date.now() / 2000) % 21];
	this.context.strokeStyle = colors.bullet_stroke;
	this.context.lineWidth = 3;

	this.context.beginPath();
	this.context.arc(bullet.pos.x, bullet.pos.y, bullet.rad, 0, Math.PI * 2);
	this.context.fill();
	this.context.stroke();

};

Renderer.prototype.render_ui = function() {

	if (this.game.player_tank_id > -1) {
		var player_tank = this.frame_snapshot.tanks[this.game.player_tank_id];
		if (player_tank.alive) {

			this.context.font = "40px Open Sans";
			this.context.fillStyle = '#fff'
			this.context.textAlign = "center";
			this.context.textBaseline = "middle";
			var text = this.game.player_name;
			this.context.fillText(text, 0, this.canvas.height/2-60);

			var text_length = this.context.measureText(text).width;
			this.render_reload_bars(text_length, player_tank);

		}

		if (html.joystick) {
			this.context.strokeStyle = 'rgba(255,255,255,0.6)';
			this.context.fillStyle = 'rgba(255,255,255,0.6)';
			this.context.lineWidth = 8;
			var joy_screen = new Vec2().set(html.joystick_pos).m_addxy(-this.canvas.width / 2, -this.canvas.height / 2);
			var mouse_screen = new Vec2().set(html.mouse).m_add(joy_screen);
			this.context.beginPath();
			this.context.arc(joy_screen.x, joy_screen.y, 150, 0, Math.PI * 2);
			this.context.stroke();
			this.context.beginPath();
			this.context.arc(joy_screen.x, joy_screen.y, 16, 0, Math.PI * 2);
			this.context.fill();
			this.context.beginPath();
			this.context.arc(mouse_screen.x, mouse_screen.y, 24, 0, Math.PI * 2);
			this.context.fill();
		}

	}

};

Renderer.prototype.render_reload_bars = function(text_length, tank) {
	if (!tank.reloads) return;

	var n_bars = tank.chambers;
	var length = 70;
	var x = text_length / 2 + 30;
	var y = this.canvas.height / 2 - 60;
	var spacing = 14;
	var height = y - (n_bars - 1) * spacing / 2;

	this.context.lineWidth = 12;
	this.context.lineCap = "round";
	this.context.strokeStyle = '#eee';
	for (var i = 0; i < n_bars; i++) {
		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x + length, height + spacing * i);
		this.context.stroke();
	}

	this.context.lineWidth = 8;
	for (var i = 0; i < n_bars; i++) {
		var x2 = x + tank.reloads[i] / tank.reload_ticks * length;

		this.context.strokeStyle = (tank.reloads[i] == tank.reload_ticks)? '#3c3' : '#fc0';

		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x2, height + spacing * i);
		this.context.stroke();
	}
};