
var shared = require('../public/shared/shared.js');
var Vec2 = shared.Vec2;
var clamp = shared.clamp;

var Flags = new require('./flags.js');

// World class with all the nitty gritty server simulation code

function World() {

	this.server = null;

	this.tanks = [];
	this.bullets = [];
	this.flags = [];
	this.map = {};

	this.teams = [];

	this.n_tanks = 32;
	this.n_bullets = 96;
	this.n_flags = 32;

	this.reset();

	this.flag_types = new Flags(this);

};

World.prototype.reset = function() {

	this.tanks = [];
	this.bullets = [];
	this.flags = [];

	// populate the tank array with dead tanks
	for (var i = 0; i < this.n_tanks; i++) {
		this.tanks.push(new Tank());
		this.tanks[i].id = i;
	}
	for (var i = 0; i < this.n_bullets; i++) {
		this.bullets.push(new Bullet());
	}
	for (var i = 0; i < this.n_flags; i++) {
		this.flags.push(new Flag());
	}

};

World.prototype.parse_map = function(map) {

	this.map = {size: map.size, rectangles: []};

	if (map.credit) { // Text displayed in bottom left of the map
		this.map.credit = map.credit;
	}

	for (var i = 0; i < map.teams.length; i++) {

		var team_data = map.teams[i];

		var flag = this.flags[i];
		flag.alive = true;
		flag.type = "team";
		flag.spawn.set_xy(team_data.flag.x, team_data.flag.y);
		flag.pos.set(flag.spawn);
		flag.team = i;
		flag.rad = 14;

		var pad = {x: team_data.pad.x, y: team_data.pad.y, hwidth: team_data.pad.hwidth, hheight: team_data.pad.hheight, team: i};
		this.map.rectangles.push(pad);

		var spawn_pad = {
			x: team_data.spawn.x,
			y: team_data.spawn.y,
			hwidth: team_data.spawn.hwidth || 200,
			hheight: team_data.spawn.hheight || 200
		}

		this.teams[i] = {
			spawn: spawn_pad,
			tanks: [],
			name: (["red", "blue"])[i],
			score: 0
		};

	}

	for (var i = 0; i < map.flags.length; i++) {

		var flag_data = map.flags[i];
		var flag = this.flags[i + map.teams.length];

		flag.alive = true;
		flag.type = random_flag_type();//flag_data.type;
		flag.spawn.set_xy(flag_data.x, flag_data.y);
		flag.pos.set(flag.spawn);
		flag.team = -1;
		flag.bot_id = -1;

	}

	if (map.bots) {
		for (var i = 0; i < map.bots.length; i++) {

			var bot_data = map.bots[i];
			var flag = this.flags[i + map.flags.length + map.teams.length];

			var bot_id = this.reserve_bot();

			var bot = this.tanks[bot_id];
			bot.flag_id = i + map.flags.length + map.teams.length;

			flag.alive = false;
			flag.type = random_rare_flag_type();
			flag.spawn.set_xy(bot_data.x, bot_data.y);
			flag.pos.set(flag.spawn);
			flag.team = -1;
			flag.bot_id = bot_id;

			this.spawn_bot(bot_id);

		}
	}

	for (var i = 0; i < map.rectangles.length; i++) {
		
		var rect_data = map.rectangles[i];
		
		if (rect_data.hwidth == 0 || rect_data.hheight == 0)
			continue;
		
		var rect = {x: rect_data.x, y: rect_data.y, hwidth: rect_data.hwidth, hheight: rect_data.hheight, team: -1};

		if (rect_data.gate_team != undefined)
			rect.gate_team = rect_data.gate_team;
		else
			rect.gate_team = -1;

		this.map.rectangles.push(rect);

	}

};

World.prototype.generate_map = function() {

	var n_squares = 36;
	var min_rad = 40; var max_rad = 80;

	var sqrt = Math.floor(Math.sqrt(n_squares));
	var x_spacing = this.map.size.width / sqrt;
	var y_spacing = this.map.size.height / sqrt;

	for (var x = -sqrt / 2; x < sqrt / 2; x++) {
		for (var y = -sqrt / 2; y < sqrt / 2; y++) {
			var rad = Math.random() * (max_rad - min_rad) + min_rad;
			var sx = Math.random() * (x_spacing - rad * 2) + x * x_spacing + rad;
			var sy = Math.random() * (y_spacing - rad * 2) + y * y_spacing + rad;
			var square = {x: sx, y: sy, rad: rad};
			this.map.squares.push(square);
		}
	}

};

function random_color() {

	var colors = [	'#ffb366',
					'#ff6766',
					'#ff66b2',
					'#66ffff',
					'#6766ff',
					'#66b2ff',
					'#66ffb3',
					'#9058c6',
					'#58c690'
				];
	return colors[Math.floor(Math.random() * colors.length)];
}

var team_colors = [
	['#ff668c','#ff6680','#ff6673','#ff6666','#ff7366','#ff8066','#ff8c66'],
	['#66e1ff', '#66d5ff', '#66c8ff', '#66bbff', '#66aeff', '#66a2ff', '#6695ff']
];
function random_team_color(team_id) {
	var colors = team_colors[team_id];
	return colors[Math.floor(Math.random() * colors.length)];
};

var flag_types = [
	[
	'shield',
	'ricochet',
	'extra_clip',
	'sniper',
	'steam_roller',
	'tiny',
	'speed',
	'back_fire'
	],
	[
	'triple_shot',
	'tunneler',
	'super_bullet',
	'shock_wave',
	'guided_missile'
	]
];
function random_flag_type() {
	var types = flag_types[Math.random() > 0.2 ? 0 : 1]; // "Rare" flags spawn 5% of the time
	return types[Math.floor(Math.random() * types.length)];
};
function random_rare_flag_type() {
	var types = flag_types[1];
	return types[Math.floor(Math.random() * types.length)];
}

World.prototype.reserve_tank = function(client) { // Returns the id of the reserved tank, or -1 if unsuccessful
	for (var i = 0; i < this.n_tanks; i++) {
		var tank = this.tanks[i];
		if (!tank.reserved) {
			tank.reserved = true;
			tank.alive = false;
			tank.client = client;

			this.reassign_tank_team(i);

			return i;
		}
	}
	return -1;
};

World.prototype.reserve_bot = function() {
	for (var i = 0; i < this.n_tanks; i++) {
		var tank = this.tanks[i];
		if (!tank.reserved) {
			tank.reserved = true;
			tank.alive = false;
			tank.client = null;
			tank.ai = true;

			tank.team = -1;
			tank.color = "#4d6";
			return i;
		}
	}
	return -1;
};

World.prototype.free_tank = function(id) {
	var tank = this.tanks[id];
	tank.reserved = false;
	tank.alive = false;
	tank.spawn_cooldown = 0;
	if (this.teams[tank.team]) {
		var index = this.teams[tank.team].tanks.indexOf(id);
		if (index > -1) {
			this.teams[tank.team].tanks.splice(index, 1);
		}
	}
};

World.prototype.reassign_tank_team = function(id) {
	var tank = this.tanks[id];
	if (this.teams[tank.team]) {
		var index = this.teams[tank.team].tanks.indexOf(id);
		if (index > -1) {
			this.teams[tank.team].tanks.splice(index, 1);
		}
	}
	tank.team = -1;

	var n_rogue = 0;
	var n_red = 0;
	var n_blue = 0;

	for (var i = 0; i < this.n_tanks; i++) {
		var t = this.tanks[i];
		if (t.reserved) {
			if (t.team == -1)
				n_rogue++;
			else if (t.team == 0)
				n_red++;
			else if (t.team == 1)
				n_blue++;
		}
	}

	var n_total = n_rogue + n_red + n_blue;
	console.log("rogue:" + n_rogue);
	console.log("red:" + n_red);
	console.log("blue:" + n_blue);

	if (n_red < n_blue) {
		this.assign_tank_team(id, 0);
	} else if (n_blue < n_red) {
		this.assign_tank_team(id, 1);
	} else {
		if (n_total <= 2 || n_total % 2 == 0 || n_rogue > 1) { // Even number? (Including this tank)
			if (this.teams[0].score < this.teams[1].score) {
				this.assign_tank_team(id, 0);
			} else if (this.teams[1].score < this.teams[0].score) {
				this.assign_tank_team(id, 1);
			} else {
				this.assign_tank_team(id, Math.floor(Math.random() * 2));
			}
		} else { // Odd number, let's make it a rogue player
			this.assign_tank_team(id, -1);
		}
	}

};

World.prototype.assign_tank_team = function(id, team) {
	var tank = this.tanks[id];
	tank.team = team;

	if (team == -1) {
		tank.color = '#4d6';
	} else {
		var tries = 12;
		var repeat_color = true;
		while (repeat_color && tries > 0) {
			repeat_color = false;
			tank.color = random_team_color(team);
			tries--;
			for (var j = 0; j < this.n_tanks; j++) {
				if (j != id && tank.color == this.tanks[j].color) {
					repeat_color = true;
					break;
				}
			}
		}

		this.teams[team].tanks.push(id);
	}
};

World.prototype.spawn_tank = function(id) {
	var tank = this.tanks[id];

	if (tank.spawn_cooldown > 0) return;
	tank.spawn_timer = 0;
	tank.kill_count = 0;
	tank.kill_timer = 0;

	tank.alive = true;
	tank.new = true;

	tank.set_flag(this.flag_types.default);
	tank.flag_id = -1;

	for (var i = 0; i < tank.max_bullets; i++) {
		tank.reload[i] = 0;
	}

	if (tank.team == -1) { // Re-evaluate rogue status
		this.reassign_tank_team(id);
	}

	if (this.teams[tank.team]) {
		var spawn_rect = this.teams[tank.team].spawn;
		tank.pos.set_xy(spawn_rect.x, spawn_rect.y);
		tank.pos.x += (Math.random() * 2 - 1) * spawn_rect.hwidth;
		tank.pos.y += (Math.random() * 2 - 1) * spawn_rect.hheight;
	} else {
		tank.pos.set_xy((Math.random() - 0.5) * this.map.size.width, (Math.random() - 0.5) * this.map.size.height);
	}

	tank.dir = Math.atan2(-tank.pos.y, -tank.pos.x) || 0;

	tank.steer_target.set_xy(0, 0);
};

World.prototype.spawn_bot = function(id) {
	var tank = this.tanks[id];

	tank.alive = true;
	tank.new = true;

	tank.set_flag(this.flag_types.bot);

	tank.pos.set(this.flags[tank.flag_id].spawn);
	tank.steer_target.set_xy(0, 0);
	tank.left_wheel = 0;
	tank.right_wheel = 0;

};

World.prototype.kill_tank = function(tank_id) {
	var tank = this.tanks[tank_id];
	tank.alive = false;
	tank.spawn_cooldown = 150;
	this.drop_flag(tank_id);
};

World.prototype.kill_bullet = function(bullet_id) {
	var bullet = this.bullets[bullet_id];
	bullet.alive = false;
};

World.prototype.shoot = function(tank_id) {
	var tank = this.tanks[tank_id];
	if (tank.alive) {
		tank.flag.shoot(tank);
	}
	return -1;
};

World.prototype.drop_flag = function(tank_id) {
	var tank = this.tanks[tank_id];
	if (tank.flag_id > -1) {
		var flag = this.flags[tank.flag_id];
		flag.pos.set(tank.pos);
		flag.alive = true;
		flag.cooldown = 50;
		if (!tank.ai) {
			this.server.player_flag_drop(tank_id);
			tank.set_flag(this.flag_types.default);
			tank.flag_id = -1;
			tank.flag_team = -1;
		}
	}
};

World.prototype.flag_capture = function(tank_id, team_id) {
	var tank = this.tanks[tank_id];

	tank.flag.capture(tank); // Send forth the shock wave

	tank.set_flag(this.flag_types.default);

	var flag = this.flags[tank.flag_id];
	flag.alive = true;
	flag.pos.set(flag.spawn);
	tank.flag_id = -1;
	tank.flag_team = -1;

	/*var team = this.teams[team_id];
	for (var i = 0; i < team.tanks.length; i++) {
		var enemy_tank = this.tanks[team.tanks[i]];
		if (enemy_tank.alive) {
			this.kill_tank(team.tanks[i]);
		}
	}*/

	var team = this.teams[tank.team];
	if (team) {
		team.score++;
	}

	this.server.flag_capture(tank_id, team_id, team.tanks.length);
};

World.prototype.add_bullet = function(tank_id) {
	var tank = this.tanks[tank_id];
	for (var i = 0; i < this.n_bullets; i++) {
		var bullet = this.bullets[i];
		if (!bullet.alive) {
			bullet.alive = true;
			bullet.new = true;
			bullet.tank = tank_id;
			bullet.team = tank.team;
			return i;
		}
	}
	return -1;
};

World.prototype.update = function() {
	this.update_tanks();
	this.update_bullets();
	this.update_flags();
	this.handle_collisions();
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.vel.set(tank.pos).m_sub(tank.last_pos);
		}
	}
};

World.prototype.update_tanks = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			//update timers
			tank.spawn_timer++;
			tank.kill_timer++;

			if (tank.ai) {
				var distance = 800;
				var dot = 0;
				var pointing = new Vec2();
				var temp = new Vec2();
				for (var j = 0; j < this.tanks.length; j++) {
					var human_tank = this.tanks[j];
					if (human_tank.alive && !human_tank.ai) {
						temp.set(human_tank.pos).m_sub(tank.pos);
						var human_distance = temp.mag();
						if (human_distance < distance) {
							distance = human_distance;
							pointing.set(temp);
							dot = human_tank.vel.dot(pointing);
						}
					}
				}
				if (distance == 800) { // slow down if out of range
					tank.steer_target.set(this.flags[tank.flag_id].spawn).m_sub(tank.pos);
				} else if (distance < 800) { // circle if close
					var run_factor = 0.1 * (distance - 400);
					tank.steer_target.set(pointing).m_scale(run_factor);
					var tot_reload = 0;
					for (var ri = 0; ri < tank.flag.weapon_attr.max_bullets; ri++) {
						tot_reload += tank.reload[ri];
					}
					if (tot_reload > tank.flag.weapon_attr.max_bullets * tank.flag.weapon_attr.reload_ticks * 0.8)
						tank.flag.shoot(tank);
				}
			}

			tank.steer();
			tank.drive();
			tank.pos.m_clampxy(-this.map.size.width / 2 + tank.rad, this.map.size.width / 2 - tank.rad,
			-this.map.size.height / 2 + tank.rad, this.map.size.height / 2 - tank.rad);

			for (var j = 0; j < tank.max_bullets; j++) {
				if (tank.reload[j] < tank.reload_ticks) {
					tank.reload[j]++;
				}
			}
		} else {
			if (tank.reserved && !tank.ai) {
				tank.spawn_cooldown--;
				if (tank.spawn_cooldown < -5000) {
					this.server.send_kick(tank.client.id);
					this.server.on_disconnect({id: tank.client.id});
					tank.spawn_cooldown = 0;
				}
			}
		}
	}
};

World.prototype.update_bullets = function() {
	for (var i = 0; i < this.bullets.length; i++) {
		var bullet = this.bullets[i];
		if (bullet.alive) {

			if (bullet.guided) {

				var d = new Vec2();

				var closest = null;
				var dist = 300;

				for (var j = 0; j < this.tanks.length; j++) {
					var tank = this.tanks[j];
					if (tank.alive && bullet.tank != j && (bullet.team == -1 || tank.team != bullet.team)) {
						d.set(tank.pos).m_sub(bullet.pos);
						var dot = d.dot(bullet.vel);
						var cos = dot / bullet.vel.mag() / d.mag();
						if (cos >= bullet.guided.min_cos) {
							var mag = d.mag();
							if (mag < dist) {
								closest = tank;
								dist = mag;
							}
						}

					}
				}

				if (closest) {
					d.set(closest.pos).m_sub(bullet.pos);
					bullet.vel.m_add(d.proj_on(bullet.vel.norm()).m_clamp(0, bullet.guided.max_acc));
				}

			}

			bullet.drive();
			if (bullet.drag)
				bullet.vel.m_scale(bullet.drag);
			bullet.rad += bullet.expansion;
			if (bullet.expansion > 0) {
				bullet.expansion -= 0.45;
			} else {
				bullet.expansion = 0;
			}
			if (bullet.life <= 0 || !bullet.pos.in_BB(-this.map.size.width / 2, -this.map.size.height / 2, this.map.size.width / 2, this.map.size.height / 2)) {
				if (bullet.explode) {
					console.log("explode!");
					bullet.explode(bullet.tank, bullet);
				}
				this.kill_bullet(i);
			} else {
				bullet.life--;
			}
		}
	}
};

World.prototype.update_flags = function() {

	var respawn_ticks = 1000;
	var bot_respawn_ticks = 160;

	for (var i = 0; i < this.flags.length; i++) {
		var flag = this.flags[i];
		if (flag.alive) {
			flag.cooldown--;
			if (flag.bot_id > -1 && flag.cooldown <= - bot_respawn_ticks) {
				flag.alive = false;
				flag.type = random_rare_flag_type();
				flag.cooldown = 0;
				this.spawn_bot(flag.bot_id);
			} else if (flag.team == -1 && flag.cooldown <= - respawn_ticks) {
				flag.pos.set(flag.spawn);
				flag.type = random_flag_type();
				flag.cooldown = 0;
			} else if (flag.cooldown <= - 2 * respawn_ticks) {
				flag.pos.set(flag.spawn);
				flag.cooldown = 0;
			}
		} else if (flag.team > -1) {
			var carried = false;
			for (var j = 0; j < this.tanks.length; j++) {
				if (this.tanks[j].alive && this.tanks[j].flag_id == i) {
					carried = true;
					break;
				}
			}
			if (!carried) {
				console.log("Fixed the team flag gone bug...");
				flag.pos.set(flag.spawn);
				flag.cooldown = 50;
				flag.alive = true;
			}
		}
	}
};

World.prototype.handle_collisions = function() {

	// For shield ricochets
	var normal_buffer = new Vec2();
	
	// Tank-bullet

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive && tank.spawn_timer >= 125) {
			for (var bullet_id = 0; bullet_id < this.bullets.length; bullet_id++) {
				var bullet = this.bullets[bullet_id];
				if (bullet.alive && bullet.tank != tank_id && (bullet.team == -1 || bullet.team != tank.team || bullet.team == tank.flag_team)) {
					var dist2 = (new Vec2()).set(tank.pos).m_sub(bullet.pos).mag2();
					var rad2 = Math.pow((tank.rad*1.25) + bullet.rad, 2);
					if (dist2 < rad2) {
						this.server.player_kill(bullet.tank, tank_id)
						this.kill_tank(tank_id);
						if (!bullet.pass_thru) {
							this.kill_bullet(bullet_id);
						}
						break;
					}
					// Shield Collisions:
					if (tank.flag.tank_attr.shield_rad && !bullet.expansion) {
						if (tank.reload[tank.flag.weapon_attr.max_bullets - 1] >= tank.flag.weapon_attr.reload_ticks) {
							var srad2 = Math.pow(tank.flag.tank_attr.shield_rad + bullet.rad, 2);
							if (dist2 < srad2) {
								if (tank.flag.tank_attr.shield_rad + bullet.rad - Math.sqrt(dist2) < bullet.vel.mag()) {
									// Ricochet the bullet!
									normal_buffer.set(tank.pos).m_sub(bullet.pos).m_unit();
									normal_buffer.m_scale(2 * bullet.vel.dot(normal_buffer));
									bullet.vel.m_sub(normal_buffer);
									// *Don't* Change the bullet team!
									//bullet.tank = tank_id;
									//bullet.team = tank.team;
								}
								//this.kill_bullet(bullet_id);
								tank.reload[tank.flag.weapon_attr.max_bullets - 1] = 0;
							}
						}
					}
				}
			}
		}
	}

	// Tank-wall

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive && tank.flag.tank_attr.wall_collide) {
			for (var rect_id = 0; rect_id < this.map.rectangles.length; rect_id++) {
				var rect = this.map.rectangles[rect_id];
				var tot_width = tank.rad + rect.hwidth;
				var tot_height = tank.rad + rect.hheight;
				var x_overlap = tot_width - Math.abs(rect.x - tank.pos.x);
				var y_overlap = tot_height - Math.abs(rect.y - tank.pos.y);
				if (x_overlap > 0 && y_overlap > 0) { // Collision
					if (rect.team == -1 && (rect.gate_team == -1 || rect.gate_team != tank.team)) {
						if (x_overlap < y_overlap) { // fix x
							if (tank.pos.x > rect.x) {
								tank.pos.x += x_overlap;
							} else {
								tank.pos.x -= x_overlap;
							}
						} else { // fix y
							if (tank.pos.y > rect.y) {
								tank.pos.y += y_overlap;
							} else {
								tank.pos.y -= y_overlap;
							}
						}
					} else {
						// Tank-pad collision
						if (tank.flag_team > -1 && tank.flag_team != tank.team && tank.team == rect.team) {
							this.flag_capture(tank_id, tank.flag_team);
						}
					}
				}
			}
		}
	}

	// Bullet-wall

	for (var bullet_id = 0; bullet_id < this.bullets.length; bullet_id++) {
		var bullet = this.bullets[bullet_id];
		if (bullet.alive && bullet.wall_collide) {
			for (var rect_id = 0; rect_id < this.map.rectangles.length; rect_id++) {
				var rect = this.map.rectangles[rect_id];
				if (rect.team != -1 || (rect.gate_team != -1 && rect.gate_team != bullet.team)) continue;
				var tot_width = bullet.rad + rect.hwidth;
				var tot_height = bullet.rad + rect.hheight;
				var x_overlap = tot_width - Math.abs(rect.x - bullet.pos.x);
				var y_overlap = tot_height - Math.abs(rect.y - bullet.pos.y);
				if (x_overlap > 0 && y_overlap > 0) {
					if (bullet.ricochet > 0) {
						//bullet.pos.m_sub(bullet.vel.m_scale(0.2)); // So that bullet doesn't get stuck
						//bullet.vel.m_scale(0.85 * 5); // Undo mult and slow down to 85%
						if (x_overlap < y_overlap) { // bounce x
							if (Math.abs(bullet.vel.x) >= x_overlap) {
								bullet.vel.x = - bullet.vel.x;
							} else {
								this.kill_bullet(bullet_id);
							}
						} else { // bounce y
							if (Math.abs(bullet.vel.y) >= y_overlap) {
								bullet.vel.y = - bullet.vel.y;
							} else {
								this.kill_bullet(bullet_id);
							}
						}
						bullet.ricochet--;
					} else {
						this.kill_bullet(bullet_id);
					}
					break;
				}
			}
		}
	}

	// Tank-tank

	for (var i = 0; i < this.tanks.length; i++) {
		var tank1 = this.tanks[i];
		if (tank1.alive && !(tank1.flag.tank_attr.die_on_collide)) {
			for (var j = 0; j < this.tanks.length; j++) {
				if (i != j) {
					var tank2 = this.tanks[j];
					if (tank2.spawn_timer < 125)
						continue;
					if ((tank1.team != tank2.team || tank1.team < 0) && tank2.alive && (tank1.flag.tank_attr.kill_on_collide || tank2.flag.tank_attr.die_on_collide)) {
						var dist2 = (new Vec2()).set(tank1.pos).m_sub(tank2.pos).mag2();
						var rad2 = Math.pow((tank1.rad*1.25) + (tank2.rad*1.25), 2);
						if (dist2 < rad2) {
							if (tank2.flag.tank_attr.kill_on_collide) { // Both steam roller lol!
								this.server.player_kill(i, j);
								this.server.player_kill(j, i);
								this.kill_tank(i);
								this.kill_tank(j);
							} else { // Get steam rolled son
								this.server.player_kill(i, j);
								this.kill_tank(j);
							}
						}
					}
				}
			}
		}
	}

	// Tank-flag

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive && tank.flag_id < 0) {
			for (var flag_id = 0; flag_id < this.flags.length; flag_id++) {
				var flag = this.flags[flag_id];
				if (flag.alive && flag.cooldown <= 0) {
					var dist2 = (new Vec2()).set(tank.pos).m_sub(flag.pos).mag2();
					var rad2 = Math.pow((tank.rad*1.25) + flag.rad, 2);
					if (dist2 < rad2) {
						flag.alive = false;
						tank.flag_id = flag_id;
						var flag_type = this.flag_types[flag.type];
						if (flag_type) {
							tank.set_flag(flag_type);
						}
						tank.flag_team = flag.team;
						this.server.player_flag_pickup(tank_id);
						break;
					}
				}
			}
		}
	}

};

module.exports = World;

// Tank class

function Tank() {

	this.reserved = false; // We reuse tanks once the player disconnect
	this.alive = false;
	this.client = null;
	this.ai = false; // If true it will be controlled by ai!

	// Timers
	this.spawn_cooldown = 0;
	this.kill_timer = 0; // Ticks since last kill
	this.spawn_timer = 0; // Ticks since last spawn (for invincibility)
	this.kill_count = 0;

	// State

	this.last_pos = new Vec2();
	this.pos = new Vec2();
	this.dir = 0;
	this.vel = new Vec2(); 	//	Stored so that bullet velocities
	this.rot_vel = 0;		//	can be calculated.

	this.steer_target = new Vec2(); // A vector pointing from the tank to the players mouse

	this.left_wheel = 0; // Velocity of each wheel
	this.right_wheel = 0;
	this.backwards = false;

	this.reload = [];

	this.killed_by = -1;

	// Configuration

	this.id = -1;
	this.color = '';

	this.max_bullets = 0;
	this.reload_ticks = 0;

	this.rad = 0; // Half the distance between wheels, determines max spin-speed vs max linear-speed
	this.max_velocity = 0; // Max velocity of each wheel
	this.max_wheel_acceleration = 0; // Higher is more responsive

	this.flag = null;
	this.flag_id = -1;
	this.flag_team = -1;

	this.team = -1;

}

Tank.prototype.steer = function() { // Adjusts wheel velocities based on steer_target

	if (this.steer_target.mag2() == 0) { // let's not get crazy divide by 0 errors
		return;
	}

	var dir_vec = (new Vec2()).set_rt(1, this.dir);

	var dot = dir_vec.dot(this.steer_target.unit());
	var clockwise = dir_vec.set_rt(1, this.dir + Math.PI / 2).dot(this.steer_target) > 0;

	if (this.backwards) {
		if (dot > 0.7) this.backwards = false;
	} else {
		if (dot < -0.7) this.backwards = true;
	}
	backwards = this.backwards;

	if (backwards) {
		dot = -dot;
	}

	var wheel_dif = (1 - dot) * 1.5;
	if (dot < 0.999) {
		wheel_dif += 0.2;
	}

	var desired_left_wheel = this.max_velocity;
	var desired_right_wheel = this.max_velocity;

	if (clockwise) {
		desired_right_wheel *= 1 - wheel_dif;
	} else {
		desired_left_wheel *= 1 - wheel_dif;
	}

	if (backwards) {
		desired_left_wheel = -desired_left_wheel;
		desired_right_wheel = -desired_right_wheel;
	}

	var speed_factor = clamp(this.steer_target.mag() / 200, 0, 1);
	if (this.flag.name == 'tunneler' && backwards) { // Tunneler goes slow backwards
		speed_factor *= 0.3;
	}
	desired_left_wheel *= speed_factor;
	desired_right_wheel *= speed_factor;

	// Calculate wheel accelerations to be proportional to difference in desired/actual velocities
	var left_acc = clamp((desired_left_wheel - this.left_wheel) / this.max_velocity, -1, 1) * this.max_wheel_acceleration;
	var right_acc = clamp((desired_right_wheel - this.right_wheel) / this.max_velocity, -1, 1) * this.max_wheel_acceleration;

	this.left_wheel += left_acc;
	this.right_wheel += right_acc;

};

Tank.prototype.drive = function() { // Moves and rotates the tank according to wheel velocities

	this.last_pos.set(this.pos);

	this.rot_vel = (this.left_wheel - this.right_wheel) / 2 / this.rad;
	this.vel.set_rt((this.left_wheel + this.right_wheel) / 2, this.dir);

	this.dir += this.rot_vel;
	this.pos.m_add(this.vel);

};

Tank.prototype.use_reload = function(start, end) {
	start = start || 0;
	end = end || this.max_bullets;
	for (var i = start; i < end; i++) {
		if (this.reload[i] >= this.reload_ticks) {
			this.reload[i] = 0;
			return true;
		}
	}
	return false;
};

Tank.prototype.set_flag = function(flag) {

	this.rad = flag.tank_attr.rad;
	this.max_velocity = flag.tank_attr.max_vel;
	this.max_wheel_acceleration = flag.tank_attr.max_acc;

	var tot_reload = 0;
	for (var i = 0; i < this.max_bullets; i++) {
		tot_reload += this.reload[i];
	}
	tot_reload /= this.max_bullets;

	this.max_bullets = flag.weapon_attr.max_bullets;
	this.reload_ticks = flag.weapon_attr.reload_ticks;

	tot_reload *= this.max_bullets;
	this.reload = [];
	for (var i = 0; i < this.max_bullets; i++) {
		if (tot_reload >= this.reload_ticks) {
			this.reload[i] = this.reload_ticks;
			tot_reload -= this.reload_ticks;
		} else if (tot_reload >= 0){
			this.reload[i] = Math.floor(tot_reload);
			tot_reload = 0;
		} else {
			this.reload[i] = 0;
		}
	}

	this.flag = flag;

};

function Bullet() {

	this.alive = false;
	this.new = false;

	this.tank = -1;
	this.team = -1;

	this.pos = new Vec2();
	this.vel = new Vec2();

	this.rad = 5;
	this.speed = 8;
	this.drag = 1;

	this.life = 0; // frames remaining until dead

	this.wall_collide = true;

}

Bullet.prototype.drive = function() {
	this.pos.m_add(this.vel);
};

function Flag() {

	this.alive = false;
	this.cooldown = 0;

	this.team = -1;
	this.type = '';

	this.spawn = new Vec2();
	this.pos = new Vec2();

	this.rad = 12;

	this.bot_id = -1;

}
