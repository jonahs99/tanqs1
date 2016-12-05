var Weapons = require('./weapons.js');

function Powers(world) {

	var weapons = new Weapons(world);

	// DEFAULT
	this.default = {
		name: "default",
		phys: {rad: 19},
		mvmt: {max_vel: 5.8, max_acc: 3, agility: 1.3},
		weapon: weapons.default
	};

	this.tiny = morph(this.default, 
	{
		name: "tiny",
		phys: {rad: 12}
	});

	this.steam_roller = morph(this.default,
	{
		name: "steam roller",
		phys: {rad: 25},
		mvmt: {max_vel: 6.2, agility: 1.5}
	});

	this.agility = morph(this.default,
	{
		name: "agility",
		mvmt: {agility: 1.8}
	});

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