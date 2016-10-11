
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

	var elapsed = (new Date()).getTime() - this.game.last_update_time;
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

	this.context.beginPath();
	for (var i = -10; i <= 10; i++) {
		this.context.moveTo(i * 100, -1000);
		this.context.lineTo(i * 100, 1000);
		this.context.moveTo(-1000, i * 100);
		this.context.lineTo(1000, i * 100);
	}
	this.context.stroke();

	//Draw the tanks
	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.alive) {
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

	//Draw the leader_board
	this.render_leaderboard();

	//Draw UI
	if (this.game.state == GameState.GAME) {
		this.render_ui();
	}

};

Renderer.prototype.render_tank = function(tank, delta) {

	tank.lerp_state(delta);

	this.context.translate(tank.draw.pos.x, tank.draw.pos.y);
	this.context.rotate(tank.draw.dir);

	this.context.fillStyle = '#06f';//'#f28';
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

	this.context.fillStyle = '#B076CC';
	this.context.lineWidth = 3;
	this.context.strokeStyle = '#893DCC';

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