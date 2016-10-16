
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

	this.n_tanks = 24;
	this.n_bullets = 72;
	this.n_flags = 12;

	//this.generate_map();
	this.reset();

	this.flag_types = new Flags(this);
	//console.log(this.flag_types);

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

	this.map = {size: map.size, rectangles: map.rectangles};

	for (var i = 0; i < map.flags.length; i++) {

		var flag_data = map.flags[i];
		var flag = this.flags[i];

		flag.alive = true;
		flag.type = flag_data.type;
		flag.pos.set_xy(flag_data.x, flag_data.y);

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

World.prototype.randomize_flags = function() {

	var n_flags = 40;

	for (var i = 0; i < n_flags; i++) {
		var flag = new Flag();
		flag.pos.set_xy(Math.random() * this.map.size.width - this.map.size.width / 2, 
			Math.random() * this.map.size.height - this.map.size.height / 2);
		this.flags[i] = flag;
	}

};

function random_color() {

	var colors = [	'#ff6666',
					'#ff8c66',
					'#ffb366',
					'#ffd966',
					'#ffff66',
					'#d9ff66',
					'#b3ff66',
					'#8cff66',
					'#66ff66',
					'#66ff8c',
					'#66ffb3',
					'#66ffd9',
					'#66ffff',
					'#66d9ff',
					'#66b3ff',
					'#668cff',
					'#6666ff',
					'#8c66ff',
					'#b366ff',
					'#d966ff',
					'#ff66ff',
					'#ff66d9',
					'#ff66b3',
					'#ff668c',
					'#ff6666'];
	return colors[Math.floor(Math.random() * colors.length)];

    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

World.prototype.reserve_tank = function(client) { // Returns the id of the reserved tank, or -1 if unsuccessful
	for (var i = 0; i < this.n_tanks; i++) {
		var tank = this.tanks[i];
		if (!tank.reserved) {
			tank.reserved = true;
			tank.alive = false;
			tank.client = client;
			tank.color = random_color();
			return i;
		}
	}
	return -1;
};

World.prototype.free_tank = function(id) {
	var tank = this.tanks[id];
	tank.reserved = false;
	tank.alive = false;
};

World.prototype.spawn_tank = function(id) {
	var tank = this.tanks[id];
	tank.alive = true;

	tank.set_flag(this.flag_types.default);
	tank.flag_id = -1;

	tank.pos.set_xy(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);
	tank.steer_target.set_xy(0, 0);
};

World.prototype.kill_tank = function(tank_id) {
	var tank = this.tanks[tank_id];
	tank.alive = false;
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
		tank.set_flag(this.flag_types.default);
		var flag = this.flags[tank.flag_id];
		flag.pos.set(tank.pos);
		flag.alive = true;
		flag.cooldown = 50;
	}

};

World.prototype.add_bullet = function(tank_id) {
	var tank = this.tanks[tank_id];
	for (var i = 0; i < this.n_bullets; i++) {
		var bullet = this.bullets[i];
		if (!bullet.alive) {
			bullet.alive = true;
			bullet.new = true;
			bullet.tank = tank_id;
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
};

World.prototype.update_tanks = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.steer();
			tank.drive();
			tank.pos.m_clampxy(-this.map.size.width / 2 + tank.rad, this.map.size.width / 2 - tank.rad,
			 -this.map.size.height / 2 + tank.rad, this.map.size.height / 2 - tank.rad);

			for (var j = 0; j < tank.max_bullets; j++) {
				if (tank.reload[j] < tank.reload_ticks) {
					tank.reload[j]++;
				}
			}

		}
	}
};

World.prototype.update_bullets = function() {
	for (var i = 0; i < this.bullets.length; i++) {
		var bullet = this.bullets[i];
		if (bullet.alive) {
			bullet.drive();
			if (bullet.life <= 0 || !bullet.pos.in_BB(-this.map.size.width / 2, -this.map.size.height / 2, this.map.size.width / 2, this.map.size.height / 2)) {
				this.kill_bullet(i);
			} else {
				bullet.life--;
			}
		}
	}
};

World.prototype.update_flags = function() {

	for (var i = 0; i < this.flags.length; i++) {
		var flag = this.flags[i];
		if (flag.alive) {
			flag.update();
		}
	}

};

World.prototype.handle_collisions = function() {

	// Tank-bullet

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive) {
			for (var bullet_id = 0; bullet_id < this.bullets.length; bullet_id++) {
				var bullet = this.bullets[bullet_id];
				if (bullet.alive && bullet.tank != tank_id) {
					var dist2 = (new Vec2()).set(tank.pos).m_sub(bullet.pos).mag2();
					var rad2 = Math.pow((tank.rad*1.25) + bullet.rad, 2);
					if (dist2 < rad2) {
						this.server.player_kill(bullet.tank, tank_id)
						this.kill_tank(tank_id);
						this.kill_bullet(bullet_id);
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
				if (x_overlap > 0 && y_overlap > 0) {
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
				var tot_width = bullet.rad + rect.hwidth;
				var tot_height = bullet.rad + rect.hheight;
				var x_overlap = tot_width - Math.abs(rect.x - bullet.pos.x);
				var y_overlap = tot_height - Math.abs(rect.y - bullet.pos.y);
				if (x_overlap > 0 && y_overlap > 0) {
					if (bullet.ricochet > 0) {
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
		if (tank1.alive && tank1.flag.tank_attr.kill_on_collide) {
			for (var j = 0; j < this.tanks.length; j++) {
				if (i != j) {
					var tank2 = this.tanks[j];
					if (tank2.alive) {
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

	// Tank-flag

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive && tank.flag.name == "default") {
			for (var flag_id = 0; flag_id < this.flags.length; flag_id++) {
				var flag = this.flags[flag_id];
				if (flag.alive && flag.cooldown <= 0) {
					var dist2 = (new Vec2()).set(tank.pos).m_sub(flag.pos).mag2();
					var rad2 = Math.pow((tank.rad*1.25) + flag.rad, 2);
					if (dist2 < rad2) {
						flag.alive = false;
						var flag_type = this.flag_types[flag.type];
						if (flag_type) {
							tank.set_flag(flag_type);
							tank.flag_id = flag_id;
							this.server.player_flag_pickup(tank_id);
						}
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

	// State

	this.pos = new Vec2();
	this.dir = 0;
	this.vel = new Vec2(); 	//	Stored so that bullet velocities
	this.rot_vel = 0;		//	can be calculated.

	this.steer_target = new Vec2(); // A vector pointing from the tank to the players mouse

	this.left_wheel = 0; // Velocity of each wheel
	this.right_wheel = 0;

	this.reload = [];

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

}

Tank.prototype.steer = function() { // Adjusts wheel velocities based on steer_target

	if (this.steer_target.mag2() == 0) { // let's not get crazy divide by 0 errors
		return;
	}

	var dir_vec = (new Vec2()).set_rt(1, this.dir);

	var dot = dir_vec.dot(this.steer_target.unit());
	var clockwise = dir_vec.set_rt(1, this.dir + Math.PI / 2).dot(this.steer_target) > 0;
	var backwards = dot < 0;

	if (backwards) {
		dot = -dot;
	}

	var wheel_dif = (1 - dot) * 2;
	//if (dot < 0.95) {
	//	wheel_dif += 0.1;
	//}

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
	desired_left_wheel *= speed_factor;
	desired_right_wheel *= speed_factor;

	// Calculate wheel accelerations to be proportional to difference in desired/actual velocities
	var left_acc = clamp((desired_left_wheel - this.left_wheel) / this.max_velocity, -1, 1) * this.max_wheel_acceleration;
	var right_acc = clamp((desired_right_wheel - this.right_wheel) / this.max_velocity, -1, 1) * this.max_wheel_acceleration;

	this.left_wheel += left_acc;
	this.right_wheel += right_acc;

};

Tank.prototype.drive = function() { // Moves and rotates the tank according to wheel velocities

	this.rot_vel = (this.left_wheel - this.right_wheel) / 2 / this.rad;
	this.vel.set_rt((this.left_wheel + this.right_wheel) / 2, this.dir);

	this.dir += this.rot_vel;
	this.pos.m_add(this.vel);

};

Tank.prototype.use_reload = function() {
	for (var i = 0; i < this.max_bullets; i++) {
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

	this.max_bullets = flag.weapon_attr.max_bullets;
	this.reload_ticks = flag.weapon_attr.reload_ticks;

	this.reload = [];
	for (var i = 0; i < this.max_bullets; i++) {
		this.reload[i] = this.reload_ticks;
	}

	this.flag = flag;

};

function Bullet() {

	this.alive = false;
	this.new = false;

	this.tank = -1;

	this.pos = new Vec2();
	this.vel = new Vec2();

	this.rad = 5;
	this.speed = 8;

	this.life = 0; // frames remaining until dead

	this.wall_collide = true;

}

Bullet.prototype.drive = function() {
	this.pos.m_add(this.vel);
};

function Flag() {

	this.alive = false;
	this.cooldown = 0;

	this.type = '';

	this.pos = new Vec2();

	this.rad = 12;

}

Flag.prototype.update = function() {
	if (this.cooldown > 0) {
		this.cooldown--;
	}
};