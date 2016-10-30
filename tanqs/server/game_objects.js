var shared = require('../public/shared/shared.js');
var Vec2 = shared.Vec2;
var clamp = shared.clamp;

module.exports.Tank = function() {

	// memory info
	this.reserved = false;
	this.id = -1;

	// client info
	this.client_id = -1;

	// configuration

	this.flag = null;
	this.phys = null;
	this.weapon = null;

	// state
	this.alive = false;
	this.spawn_cooldown = 0;

	this.pos = new Vec2();
	this.dir = 0;
	this.vel = new Vec2();
	this.steer_target = new Vec2();

}