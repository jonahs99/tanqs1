
var shared = require('../public/shared/shared.js');
var Vec2 = shared.Vec2;
var clamp = shared.clamp;

// World class with all the nitty gritty server simulation code

function World() {

	this.server = null;

	this.tanks = [];
	this.bullets = [];

	this.n_tanks = 24;
	this.n_bullets = 72;

	// populate the tank array with dead tanks
	for (var i = 0; i < this.n_tanks; i++) {
		this.tanks.push(new Tank());
	}
	for (var i = 0; i < this.n_bullets; i++) {
		this.bullets.push(new Bullet());
	}

};

World.prototype.reserve_tank = function(client) { // Returns the id of the reserved tank, or -1 if unsuccessful
	for (var i = 0; i < this.n_tanks; i++) {
		var tank = this.tanks[i];
		if (!tank.reserved) {
			tank.reserved = true;
			tank.alive = false;
			tank.client = client;
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
	tank.max_bullets = 3;
	tank.reload_ticks = 125;

	for (var i = 0; i < tank.max_bullets; i++) {
		tank.reload[i] = tank.reload_ticks;
	}

	tank.pos.set_xy(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);
	tank.steer_target.set_xy(0, 0);
};

World.prototype.kill_tank = function(tank_id) {
	var tank = this.tanks[tank_id];
	tank.alive = false;
};

World.prototype.kill_bullet = function(bullet_id) {
	var bullet = this.bullets[bullet_id];
	bullet.alive = false;
	bullet.just_died = true;
};

World.prototype.shoot = function(tank_id) {

	var tank = this.tanks[tank_id];
	if (tank.alive) {
		for (var i = 0; i < tank.max_bullets; i++) {
			if (tank.reload[i] == tank.reload_ticks) {
				tank.reload[i] = 0;
				return this.add_bullet(tank_id);
			}
		}
	}
	return -1;

};

World.prototype.add_bullet = function(tank_id) {
	var tank = this.tanks[tank_id];
	for (var i = 0; i < this.n_bullets; i++) {
		var bullet = this.bullets[i];
		if (!bullet.alive) {
			bullet.alive = true;
			bullet.life = tank.reload_ticks;
			bullet.tank = tank_id;
			bullet.pos.set_rt(tank.rad * 2, tank.dir).m_add(tank.pos); // Bullet starts at end of cannon
			bullet.vel.set_rt(bullet.speed, tank.dir).m_add(tank.vel);
			bullet.rad = 5;
			return i;
		}
	}
	return -1;
};

World.prototype.update = function() {
	this.update_tanks();
	this.update_bullets();
	this.handle_collisions();
};

World.prototype.update_tanks = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.steer();
			tank.drive();

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
			if (bullet.life <= 0 || !bullet.pos.in_BB(-1000,-1000,1000,1000)) {
				this.kill_bullet(i);
			} else {
				bullet.life--;
			}
		}
	}
};

World.prototype.handle_collisions = function() {
	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive) {
			for (var bullet_id = 0; bullet_id < this.bullets.length; bullet_id++) {
				var bullet = this.bullets[bullet_id];
				if (bullet.alive && bullet.tank != tank_id) {
					var dist2 = (new Vec2()).set(tank.pos).m_sub(bullet.pos).mag2();
					var rad2 = Math.pow(tank.rad + bullet.rad, 2);
					if (dist2 < rad2) {
						this.server.player_kill(bullet.tank, tank_id)
						this.kill_tank(tank_id);
						this.kill_bullet(bullet_id);
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

	this.max_bullets = 0;
	this.reload_ticks = 0;
	this.reload = [];

	// Configuration

	this.rad = 16; // Half the distance between wheels, determines max spin-speed vs max linear-speed
	this.max_velocity = 6; // Max velocity of each wheel
	this.max_wheel_acceleration = 4; // Higher is more responsive

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
	this.pos.m_add(this.vel).m_clampxy(-1000, 1000, -1000, 1000);

};

function Bullet() {

	this.alive = false;
	this.just_died = false;

	this.tank = -1;

	this.pos = new Vec2();
	this.vel = new Vec2();

	this.rad = 5;
	this.speed = 8;

	this.life = 0; // frames remaining until dead

}

Bullet.prototype.drive = function() {
	this.pos.m_add(this.vel);
};