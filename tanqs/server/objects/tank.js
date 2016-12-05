var XMath = require('../../public/js/math.js');
var Vec2 = XMath.Vec2;
var clamp = XMath.clamp;

// Tank class

function Tank(id) {

	this.reserved = false;
	this.id = id;

	this.alive = false;
	this.team = 0;
	this.color = 0;

	this.input = {steer_target: new Vec2(), shoot: false, drop: false};

	this.phys = {rad: 0, pos: new Vec2(), dir: 0, vel: new Vec2(), rot_vel: 0, col_pos: new Vec2()};
	this.mvmt = {leftv: 0, rightv: 0, backwards: false, max_vel: 0, max_acc: 0, agility: 0};

	this.carrying_flag = -1;
	this.power = null;
	this.weapon = {reloads: new Array(4).fill(0)};

}
module.exports = Tank;

Tank.prototype.set_power = function(power) {
	this.power = power;

	this.mvmt.max_vel = power.mvmt.max_vel;
	this.mvmt.max_acc = power.mvmt.max_acc;
	this.mvmt.agility = power.mvmt.agility;

	this.phys.rad = power.phys.rad;
};

Tank.prototype.update_weapon = function() {
	for (var i = 0; i < this.power.weapon.n_chambers; i++) {
		this.weapon.reloads[i] ++;
		if (this.weapon.reloads[i] > this.power.weapon.reload_ticks) this.weapon.reloads[i] = this.power.weapon.reload_ticks;
	}
};

Tank.prototype.use_reload = function() {
	for (var i = 0; i < this.power.weapon.n_chambers; i++) {
		if (this.weapon.reloads[i] >= this.power.weapon.reload_ticks) {
			this.weapon.reloads[i] = 0;
			return true;
		}
	}

	return false;
};

Tank.prototype.calculate_movement = function() {

	// Steering

	var mag_steer = this.input.steer_target.mag();

	var des_leftv, des_rightv;

	if (mag_steer > 10) {

		this.phys.vel.set_rt(1, this.phys.dir); // Use vel as a unit pointing vector
		var cos = this.input.steer_target.dot(this.phys.vel) / mag_steer; // Cosine of angle between pointing and steer
		
		if (this.backwards) {
			if (cos > 0.7) this.backwards = false;
		} else {
			if (cos < -0.7) this.backwards = true;
		}

		var clockwise = this.input.steer_target.dot(this.phys.vel.m_norm()) > 0; // Direction we need to steer

		var wheel_ratio = Math.pow(this.backwards? -cos : cos, 5);

		if (clockwise) {
			des_leftv = this.mvmt.max_vel;
			des_rightv = this.mvmt.max_vel * wheel_ratio;
		} else {
			des_leftv = this.mvmt.max_vel * wheel_ratio;
			des_rightv = this.mvmt.max_vel;
		}

		if (this.backwards) {
			des_leftv *= -1;
			des_rightv *= -1;
		}

		var max_speed_radius = 150;
		if (mag_steer < max_speed_radius) {
			des_leftv *= mag_steer / max_speed_radius;
			des_rightv *= mag_steer / max_speed_radius;
		}

	} else {
		des_leftv = 0;
		des_rightv = 0;
	}

	var delta_leftv = clamp(des_leftv - this.mvmt.leftv, - this.mvmt.max_acc, this.mvmt.max_acc);
	var delta_rightv = clamp(des_rightv - this.mvmt.rightv, - this.mvmt.max_acc, this.mvmt.max_acc);

	this.mvmt.leftv += delta_leftv;
	this.mvmt.rightv += delta_rightv;

	// Convert wheel velocities to linear and rotational velocities

	this.phys.vel.set_rt((this.mvmt.leftv + this.mvmt.rightv) / 2, this.phys.dir);
	this.phys.rot_vel = (this.mvmt.leftv - this.mvmt.rightv) / 2 / this.phys.rad * this.mvmt.agility;

	// Set the col_pos so the collision handler knows where the tank wants to be
	this.phys.col_pos.set(this.phys.pos);
	this.phys.col_pos.m_add(this.phys.vel);

};

Tank.prototype.apply_movement = function() {

	this.phys.pos.m_add(this.phys.vel);
	this.phys.dir += this.phys.rot_vel;

};