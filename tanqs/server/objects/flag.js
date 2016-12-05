var XMath = require('../../public/js/math.js');
var Vec2 = XMath.Vec2;

// Flag Class

function Flag(id) {

	this.id = id;

	this.alive = false;

	this.life = 0;
	this.respawn_ticks = 1000;
	this.respawn_pos = new Vec2();

	this.team = -1;
	this.type = '';
	this.phys = { pos: new Vec2(), rad: 0}

}
module.exports = Flag;

Flag.prototype.update = function() {

	this.life++;

	if (this.life >= this.respawn_ticks) {
		this.phys.pos.set(this.respawn_pos)
	}

}