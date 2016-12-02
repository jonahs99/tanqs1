var XMath = require('../../public/js/math.js');
var Vec2 = XMath.Vec2;

// Flag Class

function Flag(id) {

	this.id = id;

	this.alive = false;

	this.life = 0;
	this.respawn_ticks = 0;

	this.team = -1;
	this.type = '';
	this.phys = { pos: new Vec2(), rad: 0}

}
module.exports = Flag;