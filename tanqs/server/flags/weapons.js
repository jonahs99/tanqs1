var XMath = require('../../public/js/math.js');
var Vec2 = XMath.Vec2;

var Bullets = {

	default: {
		rad: 5,
		speed: 6,
		life: 125,
		ricochets: 10
	}

};

function Weapons(world) {

	this.default = {
		n_chambers: 3,
		reload_ticks: 125,
		bullet: Bullets.default
	};
	this.default.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet);
		}
	};

}
module.exports = Weapons;

function shoot(world, tank, bullet_type, dir_offset) {

	dir_offset = dir_offset || 0;

	var pos = new Vec2().set_rt(tank.phys.rad * 1.5, tank.phys.dir).m_add(tank.phys.pos);

	if (world.in_wall(pos)) return;

	var vel = new Vec2().set_rt(bullet_type.speed, tank.phys.dir + dir_offset).m_add(tank.phys.vel);

	var bullet_id = world.add_bullet();

	if (bullet_id > -1) {
		var bullet = world.bullets[bullet_id];
		bullet.team = tank.team;
		bullet.tank = tank.id;
		bullet.phys.pos.set(pos);
		bullet.phys.vel.set(vel);
		bullet.phys.rad = bullet_type.rad;
		bullet.life = bullet_type.life;
		bullet.ricochets = bullet_type.ricochets;
		apply_bullet_attributes(bullet, bullet_type);
	}

}

function apply_bullet_attributes(bullet, bullet_type) {

	bullet.rad = bullet_type.rad;
	bullet.life = bullet_type.life;

}