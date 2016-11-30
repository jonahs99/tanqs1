
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

	// Discourage zoom cheating
	this.context.beginPath();
	this.context.rect(-1920/2, -1080/2, 1920, 1080);
	this.context.clip();

	// Pan with the player
	var scl;

	if (this.game.state == GameState.GAME) {
		this.game.player_tank.lerp_state(delta);
		this.game.camera.translate.set(this.game.player_tank.draw.pos).m_scale(-1);
		if (this.fpv) {
			this.game.camera.rotate = (-this.game.player_tank.draw.dir) - Math.PI / 2;
		} else {
			this.game.camera.rotate = 0;
		}
		scl = this.game.player_tank.flag == 'sniper' ? 0.7 : 1;
	} else {
		scl = 0.8;
	}

	this.game.camera.scale = lerp(this.game.camera.scale, scl, 0.1);

	this.context.scale(this.game.camera.scale, this.game.camera.scale);
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

	//Draw the tracks
	/*this.context.strokeStyle = '#fff';
	this.context.lineJoin = 'butt';
	this.context.lineCap = 'butt';
	this.context.lineWidth = 8;
	this.context.setLineDash([5]);

	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.alive) {
			this.render_tank_tracks(tank);
		}
	}

	this.context.setLineDash([]);*/

	//Draw the map
	this.render_map();

	//Draw the flags
	for (var i = 0; i < this.world.flags.length; i++) {
		var flag = this.world.flags[i];
		if (flag.alive) {
			this.render_flag(flag);
		}
	}

	//Draw the tanks
	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.alive || tank.corpse) {
			if (tank != this.world.game.player_tank) {
				tank.lerp_state(delta);
				this.render_tank(tank, delta);
			}
		}
	}

	//Draw the bullets
	for (var i = 0; i < this.world.bullets.length; i++) {
		var bullet = this.world.bullets[i];
		if (bullet.alive) {
			bullet.lerp_state(delta);
			this.render_bullet(bullet);
		}
	}

	//Draw the player tank
	if (this.game.player_tank && (this.game.player_tank.alive || this.game.player_tank.corpse)) {
		this.render_tank(this.game.player_tank, delta);
	}

	/*this.context.translate(-this.game.camera.translate.x, -this.game.camera.translate.y);
	this.context.rotate(-this.game.camera.rotate);
	this.context.scale(1/this.game.camera.scale, 1/this.game.camera.scale);*/
	this.context.setTransform(1, 0, 0, 1, 0, 0);
	this.context.translate(this.canvas.width / 2, this.canvas.height / 2);

	//Draw the leader_board
	this.render_leaderboard();

	//Draw UI
	if (this.game.state == GameState.GAME) {
		this.render_ui();
	}

};

Renderer.prototype.render_map = function() {

	this.context.lineWidth = 4;

	for (var i = 0; i < this.world.map.rectangles.length; i++) {
		var rect = this.world.map.rectangles[i];

		if (rect.team == -1) {
			this.context.fillStyle = '#333';
			this.context.strokeStyle = '#555';
		} else if (rect.team == 0) {
			this.context.fillStyle = '#e04945';
			this.context.strokeStyle = '#e77471';
		} else if (rect.team == 1) {
			this.context.fillStyle = '#195496';
			this.context.strokeStyle = '#206cc2';
		}

		this.context.beginPath();
		this.context.rect(rect.x - rect.hwidth, rect.y - rect.hheight, rect.hwidth * 2, rect.hheight * 2);
		this.context.fill();
		this.context.stroke();
	}

	this.context.fillStyle = '#333';
	this.context.strokeStyle = '#555';

	for (var i = 0; i < this.world.map.polys.length; i++) {

		var poly = this.world.map.polys[i];

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

Renderer.prototype.render_tank_tracks = function(tank) {

	if (tank.track.left.length) {

		this.context.beginPath();

		this.context.moveTo(tank.track.left[tank.track.start].x, tank.track.left[tank.track.start].y);
		for (var i = 1; i < tank.track.left.length; i++) {
			var l = tank.track.left[(tank.track.start + i) % tank.track.max];
			this.context.lineTo(l.x, l.y);
		}

		this.context.moveTo(tank.track.right[tank.track.start].x, tank.track.right[tank.track.start].y);
		for (var i = 1; i < tank.track.right.length; i++) {
			var r = tank.track.right[(tank.track.start + i) % tank.track.max];
			this.context.lineTo(r.x, r.y);
		}

		this.context.stroke();

	}

};

Renderer.prototype.render_tank = function(tank, delta) {

	tank.draw_rad = lerp(tank.draw_rad, tank.rad, 0.2);
	var rad = tank.draw_rad;

	this.context.translate(tank.draw.pos.x, tank.draw.pos.y);
	this.context.rotate(tank.draw.dir);

	this.context.fillStyle = tank.color;//'#06f';//'#f28';

	this.context.strokeStyle = tank.flag == "default" ? '#444' : '#777';
	if (tank.flag_team > -1) {
		this.context.strokeStyle = (['#c00', '#06c'])[tank.flag_team];
	}

	if (tank.corpse) {
		var scl = (tank.death_anim) / 3;
		this.context.scale((1 + scl) / 2, scl);
	}

	this.context.lineWidth = tank.flag == "tiny" ? 2 : 3;
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
	this.context.rect(-2 * rad * (1 - tank.gun_len), -rad * 0.2, rad * 2, rad * 0.4);

	this.context.fill();
	this.context.stroke();

	if (tank.flag == "shield" && tank.reload[tank.reload.length - 1] >= tank.reload_ticks) {
		this.context.strokeStyle = 'rgba(255,255,255,0.5)';
		this.context.lineWidth = 4;
		this.context.beginPath();
		this.context.arc(0, 0, 40, 0, Math.PI * 2);
		this.context.stroke();
	}

	if (tank.corpse) {
		this.context.scale(2/(1 + scl), 1/scl);
	}

	this.context.rotate(-tank.draw.dir);

	this.context.fillStyle = '#fff';
	this.context.font = "16px Open Sans";
	this.context.textAlign = "center";
	this.context.textBaseline = "middle";
	if (tank != this.game.player_tank) {
		this.context.fillText(tank.name, 0, rad * 3);	
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

	if (!bullet.guided) {

		this.context.beginPath();
		this.context.arc(bullet.draw_pos.x, bullet.draw_pos.y, bullet.draw_rad, 0, 2*Math.PI);

		if (bullet.old_rad != bullet.rad) {
			this.context.lineWidth = 6;
			this.context.strokeStyle = bullet.color;
			this.context.fillStyle = 'rgba(255, 255, 255, 0.06)';
		}
		this.context.fill();
		this.context.stroke();

	} else {

		var dif = new Vec2().set(bullet.current_pos).m_sub(bullet.old_pos);
		var dir = Math.atan2(dif.y, dif.x);

		this.context.translate(bullet.draw_pos.x, bullet.draw_pos.y);
		this.context.rotate(dir);

		this.context.beginPath();
		this.context.moveTo(bullet.rad, 0);
		this.context.lineTo(-bullet.rad * 2, -bullet.rad * 1.2);
		this.context.lineTo(-bullet.rad * 2, bullet.rad * 1.2);
		this.context.closePath();
		this.context.fill();
		this.context.stroke();

		this.context.rotate(-dir);
		this.context.translate(-bullet.draw_pos.x, -bullet.draw_pos.y);

	}

};

Renderer.prototype.render_flag = function(flag) {

	var colors = {bg: '', flag: ''};
	switch (flag.team) {
		case -1:
			colors.bg = '#aaa';
			colors.flag = '#fff';
			break;
		case 0:
			colors.bg = '#e04945';
			colors.flag = '#e77471';
			break;
		case 1:
			colors.bg = '#2374cf';
			colors.flag = '#458ee0';
			break;
	}

	this.context.translate(flag.pos.x, flag.pos.y);

	this.context.fillStyle = colors.bg;
	this.context.lineWidth = 4;
	this.context.strokeStyle = colors.bg;

	var flag_rad = flag.rad * 0.8;

	this.context.beginPath();
	//this.context.arc(0, 0, flag.rad, 0, 2*Math.PI);
	this.context.rect(-flag.rad, -flag.rad, flag.rad * 2, flag.rad * 2);
	this.context.fill();
	this.context.stroke();

	this.context.strokeStyle = colors.flag;
	this.context.fillStyle = colors.flag;

	this.context.beginPath();
	this.context.moveTo(-0.5 * flag_rad, flag_rad);
	this.context.lineTo(-0.5 * flag_rad, -flag_rad);
	this.context.lineTo(flag_rad * 0.5, -flag_rad);
	this.context.lineTo(flag_rad * 0.5, 0);
	this.context.lineTo(-0.5 * flag_rad, 0);
	this.context.closePath();
	
	this.context.fill();
	this.context.stroke();

	this.context.translate(-flag.pos.x, -flag.pos.y);

};

Renderer.prototype.render_leaderboard = function() {

	this.context.textAlign = "right";
	this.context.textBaseline = "middle";

	for (var i = 0; i < this.game.team_leaderboard.length; i++) {
		var team = this.game.team_leaderboard[i];
		var text = team.name + " - " + team.score;

		this.context.fillStyle = (['#f66', '#6bf'])[team.id];
		this.context.font = "22px Open Sans";

		this.context.fillText(text, this.canvas.width/2-20, -this.canvas.height/2 + 20 + 30*i);
	}

	this.context.lineCap = "square";
	this.context.strokeStyle = "rgba(255,255,255,0.5)";
	this.context.beginPath();
	this.context.moveTo(this.canvas.width/2-20, -this.canvas.height/2 + 20 + 30*this.game.team_leaderboard.length);
	this.context.lineTo(this.canvas.width/2-220, -this.canvas.height/2 + 20 + 30*this.game.team_leaderboard.length);
	this.context.stroke();

	var y_offset = this.game.team_leaderboard.length + 1;

	for (var i = 0; i < this.game.leaderboard.length; i++) {
		var client = this.game.leaderboard[i];
		var text = client.name + " - K:[" + client.stats.kills + "] D:[" + client.stats.deaths + "]";

		this.context.fillStyle = this.game.world.tanks[client.tank_id].color;
		this.context.font = (this.game.player_tank && this.game.player_id == client.tank_id) ? "bold 20px Open Sans" : "20px Open Sans";

		this.context.fillText(text, this.canvas.width/2-40, -this.canvas.height/2 + 20 + 30*(i + y_offset));

		this.context.fillStyle = this.game.world.tanks[client.tank_id].alive ? '#6f6' : '#f06';
		this.context.beginPath();
		this.context.arc(this.canvas.width/2-30, -this.canvas.height/2 + 20 + 30*(i + y_offset), 5, 0, Math.PI * 2);
		this.context.fill();
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

	var	flag_name = this.game.player_tank.flag;
	if (flag_name && (flag_name != "default")) {
		this.context.fillText(flag_name, 0, -this.canvas.height/2+60);
		this.context.font = "18px Open Sans";
		this.context.fillText("(right click to drop flag)", 0, -this.canvas.height/2+100);
	} else if (this.game.player_tank.flag_team > -1) {
		var flag_txt = "";
		var sub_txt = "";
		if (this.game.player_tank.flag_team == this.game.player_tank.team) {
			flag_txt = "You have your team flag";
			sub_text = "(right click to drop it somewhere safe)";
		} else {
			flag_txt = "You have the " + (this.game.player_tank.flag_team == 0 ? "red" : "blue") + " flag!";
			sub_text = "(bring it to your base to capture)";
		}

		this.context.fillText(flag_txt, 0, -this.canvas.height/2+60);
		this.context.font = "18px Open Sans";
		this.context.fillText(sub_text, 0, -this.canvas.height/2+100);
	}

};

Renderer.prototype.render_reload_bars = function(text_length) {
	if (!this.game.player_tank.reload) return;

	this.context.lineWidth = 12;
	this.context.lineCap = "round";

	var n_bars = this.game.player_tank.reload.length;
	var length = 70;
	var x = text_length/2 + 30;
	var y = this.canvas.height/2 - 60;
	var spacing = 14;
	var height = y - (n_bars-1)*spacing/2;

	for (var i = 0; i < this.game.player_tank.reload.length; i++) {
		if (this.game.player_tank.flag == "shield" && i==this.game.player_tank.reload.length-1) {
			this.context.strokeStyle = '#888';
			i++;
		} else {
			this.context.strokeStyle = '#eee';
		}
		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x + length, height + spacing * i);
		this.context.stroke();
	}


	this.context.lineWidth = 8;

	for (var i = 0; i < this.game.player_tank.reload.length; i++) {
		var x2 = x + this.game.player_tank.reload[i] / this.game.player_tank.reload_ticks * length;

		this.context.strokeStyle = (this.game.player_tank.reload[i] == this.game.player_tank.reload_ticks)? '#3c3' : '#fc0';

		if (this.game.player_tank.flag == "shield" && i==this.game.player_tank.reload.length-1) {
			i++;
		}

		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x2, height + spacing * i);
		this.context.stroke();
	}
};