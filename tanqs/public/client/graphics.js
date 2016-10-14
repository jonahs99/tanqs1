
function Camera() {

	this.translate = new Vec2();
	this.scale = 1;
	this.rotate = 0;

}

function Renderer(game, canvas) {

	this.game = game;
	this.world = game.world;
	this.canvas = canvas;
	this.context = canvas.getContext('2d');

	this.fpv = false; // Draw the world rotated to point tank up

}

Renderer.prototype.render_world = function() {

	// Calculate delta value for interpolation

	var elapsed = Date.now() - this.game.last_update_time;
	var delta = clamp(elapsed / this.game.time_step, 0, 1.2); // Allow dead-reckoning for up to 0.2 time steps if necessary

	// Clear the canvas
	this.context.setTransform(1, 0, 0, 1, 0, 0);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context.translate(this.canvas.width / 2, this.canvas.height / 2);

	// Pan with the player
	if (this.game.state == GameState.GAME) {
		this.game.player_tank.lerp_state(delta);
		this.game.camera.translate.set(this.game.player_tank.draw.pos).m_scale(-1);
		if (this.fpv) {
			this.game.camera.rotate = (-this.game.player_tank.draw.dir) - Math.PI / 2;
		} else {
			this.game.camera.rotate = 0;
		}
	}

	this.context.rotate(this.game.camera.rotate);
	this.context.translate(this.game.camera.translate.x, this.game.camera.translate.y);

	//Draw the grid
	this.context.strokeStyle = '#333';
	this.context.lineWidth = 1;

	var grid_spacing = 100;

	this.context.beginPath();
	for (var x = -this.world.map.size.width / 2; x <= this.world.map.size.width / 2; x+= grid_spacing) {
		this.context.moveTo(x, -this.world.map.size.height / 2);
		this.context.lineTo(x, this.world.map.size.height / 2);
	}
	for (var y = -this.world.map.size.height / 2; y <= this.world.map.size.height / 2; y+= grid_spacing) {
		this.context.moveTo(-this.world.map.size.width / 2, y);
		this.context.lineTo(this.world.map.size.width / 2, y);
	}
	this.context.stroke();

	//Draw the map
	this.render_map();

	//Draw the tanks
	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.alive) {
			if (tank != this.world.game.player_tank) {
				tank.lerp_state(delta);
			}
			this.render_tank(tank, delta);
		}
	}

	//Draw the bullets
	for (var i = 0; i < this.world.bullets.length; i++) {
		var bullet = this.world.bullets[i];
		if (bullet.alive) {
			this.render_bullet(bullet);
		}
	}

	this.context.translate(-this.game.camera.translate.x, -this.game.camera.translate.y);
	this.context.rotate(-this.game.camera.rotate);

	//Draw the leader_board
	this.render_leaderboard();

	//Draw UI
	if (this.game.state == GameState.GAME) {
		this.render_ui();
	}

};

Renderer.prototype.render_map = function() {

	this.context.fillStyle = '#19334d';
	this.context.strokeStyle = '#444';
	this.context.lineWidth = 4;

	for (var i = 0; i < this.world.map.squares.length; i++) {
		var square = this.world.map.squares[i];
		this.context.beginPath();
		this.context.rect(square.x - square.rad, square.y - square.rad, square.rad * 2, square.rad * 2);
		this.context.fill();
		this.context.stroke();
	}

};

Renderer.prototype.render_tank = function(tank, delta) {

	//tank.lerp_state(delta);

	this.context.translate(tank.draw.pos.x, tank.draw.pos.y);
	this.context.rotate(tank.draw.dir);

	this.context.fillStyle = tank.color;//'#06f';//'#f28';
	this.context.lineWidth = 3;
	this.context.strokeStyle = '#444';
	this.context.lineJoin = 'round';

	this.context.beginPath();
	this.context.rect(-tank.rad, -tank.rad, 2 * tank.rad, 2 * tank.rad);
	this.context.fill();
	this.context.stroke();

	this.context.beginPath();
	this.context.rect(-tank.rad * 1.25, -tank.rad * 1.25, tank.rad * 2.5, tank.rad * 0.75);
	this.context.rect(-tank.rad * 1.25, tank.rad * 0.5, tank.rad * 2.5, tank.rad * 0.75);
	this.context.rect(0, -tank.rad * 0.2, tank.rad * 2, tank.rad * 0.4);
	this.context.fill();
	this.context.stroke();

	this.context.rotate(-tank.draw.dir);

	this.context.fillStyle = '#fff';
	this.context.font = "16px Open Sans";
	this.context.textAlign = "center";
	this.context.textBaseline = "middle";
	if (!this.game.player_tank || tank.name != this.game.player_tank.name) {
		this.context.fillText(tank.name, 0, tank.rad * 3);	
	}

	this.context.translate(-tank.draw.pos.x, -tank.draw.pos.y);

	/*this.context.fillStyle = 'red';
	this.context.fillRect(tank.current.pos.x - 4, tank.current.pos.y - 4, 8, 8);
	this.context.fillStyle = 'blue';
	this.context.fillRect(tank.old.pos.x - 4, tank.old.pos.y - 4, 8, 8);*/

};

Renderer.prototype.render_bullet = function(bullet) {

	this.context.fillStyle = bullet.color;//'#B076CC';
	this.context.lineWidth = 3;
	this.context.strokeStyle = '#444';//'#893DCC';

	this.context.beginPath();
	this.context.arc(bullet.pos.x, bullet.pos.y, bullet.rad, 0, 2*Math.PI);
	this.context.fill();
	this.context.stroke();

};

Renderer.prototype.render_leaderboard = function() {

	this.context.textAlign = "right";
	this.context.textBaseline = "middle";

	for (var i = 0; i < this.game.leaderboard.length; i++) {
		var client = this.game.leaderboard[i];
		var text = client.name + " - K:[" + client.stats.kills + "] D:[" + client.stats.deaths + "]";

		this.context.fillStyle = i == 0 ? '#3c3' : '#fff';
		this.context.font = (this.game.player_tank && this.game.player_tank.name == client.name) ? "bold 20px Open Sans" : "20px Open Sans";

		this.context.fillText(text, this.canvas.width/2-20, -this.canvas.height/2 + 20 + 30*i);
	}

};

Renderer.prototype.render_ui = function() {

	this.context.font = "40px Open Sans";
	this.context.fillStyle = '#fff'
	this.context.textAlign = "center";
	this.context.textBaseline = "middle";
	var text = this.game.player_tank.name;
	this.context.fillText(text, 0, this.canvas.height/2-60);

	var text_length = this.context.measureText(text).width;
	this.render_reload_bars(text_length);

};

Renderer.prototype.render_reload_bars = function(text_length) {
	if (!this.game.player_tank.reload) return;

	this.context.lineWidth = 12;
	this.context.lineCap = "round";
	this.context.strokeStyle = '#eee';

	var n_bars = this.game.player_tank.reload.length;
	var length = 70;
	var x = text_length/2 + 30;
	var y = this.canvas.height/2 - 60;
	var spacing = 14;
	var height = y - (n_bars-1)*spacing/2;

	for (var i = 0; i < this.game.player_tank.reload.length; i++) {
		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x + length, height + spacing * i);
		this.context.stroke();
	}


	this.context.lineWidth = 8;

	for (var i = 0; i < this.game.player_tank.reload.length; i++) {
		var x2 = x + this.game.player_tank.reload[i] / this.game.player_tank.reload_ticks * length;

		this.context.strokeStyle = (this.game.player_tank.reload[i] == this.game.player_tank.reload_ticks)? '#3c3' : '#fc0';

		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x2, height + spacing * i);
		this.context.stroke();
	}
};