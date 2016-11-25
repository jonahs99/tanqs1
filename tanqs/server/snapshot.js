function snap_world(world) {

	var data = {
		frame: world.frame,
		tanks: [],
		bullets: [],
		flags: []
	};

	for (var i = 0; i < world.tanks.length; i++) {
		data.tanks.push(snap_tank(world.tanks[i]));
	}
	for (var i = 0; i < world.bullets.length; i++) {
		data.bullets.push(snap_bullet(world.bullets[i]));
	}
	for (var i = 0; i < world.flags.length; i++) {
		data.flags.push(snap_flag(world.flags[i]));
	}

	return data;

};
module.exports.snap_world = snap_world;

function snap_tank(tank) {

	if (!tank.alive) return {alive: false};

	var data = {
		alive: true,
		x: tank.phys.pos.x,
		y: tank.phys.pos.y,
		dir: tank.phys.dir,
		rad: tank.phys.rad,
		chambers: tank.power.weapon.n_chambers,
		reload_ticks: tank.power.weapon.reload_ticks,
		reloads: tank.weapon.reloads
	};

	return data;

};

// STUB!
function snap_bullet(bullet) {

	if (!bullet.alive) return {alive: false};

	var data = {
		alive: true,
		x: bullet.phys.pos.x,
		y: bullet.phys.pos.y,
		rad: bullet.phys.rad
	};

	return data;

};

// STUB!
function snap_flag(flag) {

	return {alive: false};

};