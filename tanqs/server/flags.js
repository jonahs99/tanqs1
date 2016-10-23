
function Flags(world) {

	// TEMPLATE

	/*

	this._ = {
		name: "_",
		kill_verb: "blew up",
		tank_attr: this.default.tank_attr,
		weapon_attr: this.default.weapon_attr,
		bullet_attr: this.default.bullet_attr,
		shoot: this.default.shoot
	};

	*/

	// DEFAULT FLAG

	this.default = {
		name: "default",
		kill_verb: "blew up",
		tank_attr: {
			rad: 16,
			max_vel: 6,
			max_acc: 3,
			wall_collide: true
		},
		weapon_attr: {
			max_bullets: 3,
			reload_ticks: 125,
		},
		bullet_attr: {
			rad: 5,
			speed: 8,
			life: 125,
			ricochet: 0,
			wall_collide: true
		},
	};
	this.default.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr);
		}
	};

	// SHIELD

	this.shield = {
		name: "shield",
		kill_verb: "blew up",
		tank_attr: {
			rad: 16,
			max_vel: 6,
			max_acc: 3,
			wall_collide: true,
			shield_rad: 40
		},
		weapon_attr: this.default.weapon_attr,
		bullet_attr: this.default.bullet_attr
	}
	this.shield.shoot = function(tank) {
		if (tank.use_reload(0,this.weapon_attr.max_bullets-1)) {
			shoot(world, tank, this.bullet_attr);
		}
	}

	// RICOCHET

	this.ricochet = {
		name: "ricochet",
		kill_verb: "blew up",
		tank_attr: this.default.tank_attr,
		weapon_attr: {
			max_bullets: 3,
			reload_ticks: 125
		},
		bullet_attr: {
			rad: 5,
			speed: 8,
			life: 125,
			ricochet: 3,
			wall_collide: true
		},
		shoot: this.default.shoot
	};

	// SUPER BULLET

	this.super_bullet = {
		name: "super bullet",
		kill_verb: "blew up",
		tank_attr: this.default.tank_attr,
		weapon_attr: this.default.weapon_attr,
		bullet_attr: {
			rad: 8,
			speed: 6,
			life: 125,
			ricochet: 2,
			wall_collide: false,
			pass_thru: true
		},
		shoot: this.default.shoot
	};

	// EXTRA CLIP

	this.extra_clip = {
		name: "extra clip",
		kill_verb: "blew up",
		tank_attr: this.default.tank_attr,
		weapon_attr: {
			max_bullets: 4,
			reload_ticks: 125
		},
		bullet_attr: {
			rad: 5,
			speed: 8,
			life: 90,
			ricochet: 0,
			wall_collide: true
		},
		shoot: this.default.shoot
	};

	// SNIPER

	this.sniper = {
		name: "sniper",
		kill_verb: "sniped",
		tank_attr: {
			rad: 16,
			max_vel: 5,
			max_acc: 3,
			wall_collide: true
		},
		weapon_attr: {
			max_bullets: 3,
			reload_ticks: 180
		},
		bullet_attr: {
			rad: 5,
			speed: 14,
			life: 180,
			ricochet: 0,
			wall_collide: true
		},
		shoot: this.default.shoot
	};

	// TUNNELER

	this.tunneler = {
		name: "tunneler",
		kill_verb: "blew up",
		tank_attr: {
			rad: 16,
			max_vel: 6,
			max_acc: 3,
			wall_collide: false
		}, 
		weapon_attr: this.default.weapon_attr,
		bullet_attr: this.default.bullet_attr,
		shoot: this.default.shoot
	};

	// TRIPLE SHOT

	this.triple_shot = {
		name: "triple shot",
		kill_verb: "blew up",
		tank_attr: this.default.tank_attr,
		weapon_attr: {
			max_bullets: 2,
			reload_ticks: 180
		},
		bullet_attr: {
			rad: 5,
			speed: 6,
			life: 100,
			ricochet: 0,
			wall_collide: true
		},
	};
	this.triple_shot.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr, -Math.PI / 5);
			shoot(world, tank, this.bullet_attr, 0);
			shoot(world, tank, this.bullet_attr, Math.PI / 5);
		}
	};

	// STEAM ROLLER

	this.steam_roller = {
		name: "steam roller",
		kill_verb: "flattened",
		tank_attr: {
			rad: 20,
			max_vel: 7,
			max_acc: 3,
			wall_collide: true,
			kill_on_collide: true,
		},
		weapon_attr: {
			max_bullets: 3,
			reload_ticks: 125,
		},
		bullet_attr: this.default.bullet_attr,
		shoot: this.default.shoot
	};
	
	// TINY

	this.tiny = {
		name: "tiny",
		kill_verb: "blew up",
		tank_attr: {
			rad: 10,
			max_vel: 6,
			max_acc: 3,
			wall_collide: true,
			die_on_collide: true
		},
		weapon_attr: this.default.weapon_attr,
		bullet_attr: this.default.bullet_attr,
		shoot: this.default.shoot
	};

	// SPEED

	this.speed = {
		name: "speed",
		kill_verb: "blew up",
		tank_attr: {
			rad: 16,
			max_vel: 7.5,
			max_acc: 2,
			wall_collide: true,
		},
		weapon_attr: this.default.weapon_attr,
		bullet_attr: this.default.bullet_attr,
		shoot: this.default.shoot
	};

	// BACKFIRE

	this.back_fire = {
		name: "back fire",
		kill_verb: "blew up",
		tank_attr: this.default.tank_attr,
		weapon_attr: this.default.weapon_attr,
		bullet_attr: this.default.bullet_attr,
		back_bullet_attr: {
			rad: 5,
			speed: 6,
			life: 125,
			ricochet: 0,
			wall_collide: true
		}
	};
	this.back_fire.shoot = function(tank) {
		if (tank.use_reload()) {
			//shoot(world, tank, this.bullet_attr);
			shoot(world, tank, this.back_bullet_attr, Math.PI, 0, true, true);
		}
	};

	// SHOCK WAVE

	this.shock_wave = {
		name: "shock wave",
		kill_verb: "incinerated",
		tank_attr: this.default.tank_attr,
		weapon_attr: {
			max_bullets: 2,
			reload_ticks: 125
		},
		bullet_attr: {
			rad: 24,
			speed: 0,
			life: 30,
			ricochet: 0,
			wall_collide: false,
			pass_thru: true,
			expansion: 12
		}
	};
	this.shock_wave.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr, 0, true, false, true);
		}
	};

}

module.exports = Flags;

// Private methods

function shoot(world, tank, bullet_attr, dir_offset, abs_vel, dir_sweep, center) {

	dir_offset = dir_offset || 0;
	abs_vel = abs_vel || false;
	dir_sweep = dir_sweep || false;
	center = center || false;

	var dir = tank.dir + dir_offset;

	var bullet_id = world.add_bullet(tank.id);

	if (bullet_id > -1) {
		var bullet = world.bullets[bullet_id];

		if (center) {
			bullet.pos.set(tank.pos);
		} else {
			if (dir_sweep) {
				bullet.pos.set_rt(tank.rad * 2, dir).m_add(tank.pos);
			} else {
				bullet.pos.set_rt(tank.rad * 2, tank.dir).m_add(tank.pos);
			}
		}
		if (abs_vel) {
			bullet.vel.set_rt(bullet_attr.speed, dir);
		} else {
			bullet.vel.set_rt(bullet_attr.speed, dir).m_add(tank.vel);
		}

		bullet.life = bullet_attr.life;
		bullet.rad = bullet_attr.rad;

		bullet.ricochet = bullet_attr.ricochet;
		bullet.wall_collide = bullet_attr.wall_collide;
		bullet.pass_thru = bullet_attr.pass_thru || false;

		bullet.expansion = bullet_attr.expansion || 0;

	}

}