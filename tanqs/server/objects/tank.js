var XMath = require('../../public/js/math.js');
var Vec2 = XMath.Vec2;
var clamp = XMath.clamp;

// Tank class

function Tank() {

	this.reserved = false;
	this.id = -1;

	this.alive = false;

	this.input = {steer_target: new Vec2(), shoot: false, drop: false};

	this.phys = {rad: 0, pos: new Vec2(), dir: 0, vel: new Vec2(), rot_vel: 0, col_pos: new Vec2()};
	this.mvmt = {leftv: 0, rightv: 0, max_vel: 6, max_acc: 3};

	this.power = null;
	this.weapon = {n_chambers: 0, reloads: new Array(4).fill(0)};

}
module.exports = Tank;

Tank.prototype.calculate_movement = function() {

	// Steering

	var mag_steer = this.input.steer_target.mag();

	if (mag_steer > 0) {

		this.phys.vel.set_rt(1, this.phys.dir); // Use vel as a unit pointing vector
		var cos = this.input.steer_target.dot(this.phys.vel) / mag_steer; // Cosine of angle between pointing and steer
		var backwards = cos < 0;
		var clockwise = this.input.steer_target.dot(this.phys.vel.m_norm()) > 0; // Direction we need to steer

		var wheel_ratio = Math.pow(backwards? -cos : cos, 5);

		var des_leftv, des_rightv;

		if (clockwise) {
			des_leftv = this.mvmt.max_vel;
			des_rightv = this.mvmt.max_vel * wheel_ratio;
		} else {
			des_leftv = this.mvmt.max_vel * wheel_ratio;
			des_rightv = this.mvmt.max_vel;
		}

		if (backwards) {
			des_leftv *= -1;
			des_rightv *= -1;
		}

		var max_speed_radius = 150;
		if (mag_steer < max_speed_radius) {
			des_leftv *= mag_steer / max_speed_radius;
			des_rightv *= mag_steer / max_speed_radius;
		}

		var delta_leftv = clamp(des_leftv - this.mvmt.leftv, - this.mvmt.max_acc, this.mvmt.max_acc);
		var delta_rightv = clamp(des_rightv - this.mvmt.rightv, - this.mvmt.max_acc, this.mvmt.max_acc);

		this.mvmt.leftv += delta_leftv;
		this.mvmt.rightv += delta_rightv;

	} else {

	}

	// Convert wheel velocities to linear and rotational velocities

	this.phys.vel.set_rt((this.mvmt.leftv + this.mvmt.rightv) / 2, this.phys.dir);
	this.phys.rot_vel = (this.mvmt.leftv - this.mvmt.rightv) / 2 / this.phys.rad;

	// Set the col_pos so the collision handler knows where the tank wants to be
	this.phys.col_pos.set(this.phys.pos);
	this.phys.col_pos.m_add(this.phys.vel);

};

Tank.prototype.apply_movement = function() {

	this.phys.pos.m_add(this.phys.vel);
	this.phys.dir += this.phys.rot_vel;

};