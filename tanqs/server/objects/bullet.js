var XMath = require('../../public/js/math.js');
var Vec2 = XMath.Vec2;

// Bullet Class

function Bullet(id) {

	this.id = id;

	this.alive = false;
	this.team = 0;
	this.tank = -1;

	this.life = 0;

	this.flag = '';
	this.phys = { col_pos: new Vec2(), pos: new Vec2(), vel: new Vec2(), rad: 4 };

	this.update = null; // called each frame for special eg. guided missile/ shock wave

}
module.exports = Bullet;

Bullet.prototype.calculate_movement = function() {

	this.phys.col_pos.set(this.phys.pos).m_add(this.phys.vel);

};

Bullet.prototype.apply_movement = function() {

	this.phys.pos.m_add(this.phys.vel);

};