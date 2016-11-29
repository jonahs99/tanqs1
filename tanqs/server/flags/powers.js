var Weapons = require('./weapons.js');

function Powers(world) {

	var weapons = new Weapons(world);

	// DEFAULT
	this.default = {
		name: "default",
		phys: {rad: 19},
		mvmt: {max_vel: 6, max_acc: 3},
		weapon: weapons.default
	}

}
module.exports = Powers;

function morph(base, changes) {

	if (!(typeof changes === 'object')) {
		return changes;
	}

	var morphed = {};

	var n_props = 0;
	for (var prop in base) {

		if (!base.hasOwnProperty(prop)) continue;

		if (changes.hasOwnProperty(prop)) {
			morphed[prop] = morph(base[prop], changes[prop]);
		} else {
			morphed[prop] = base[prop];
		}

		n_props++;
	}

	for (var prop in changes) {

		if (!changes.hasOwnProperty(prop)) continue;
		if (base.hasOwnProperty(prop)) continue;

		morphed[prop] = changes[prop];

		n_props++;
	}

	if (!n_props) {
		return changes;
	} else {
		return morphed;
	}

}