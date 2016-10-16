
function Flags(world) {

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
			wall_collide: false
		},
		shoot: this.default.shoot
	};

	// TUNNELER

	this.tunneler = {
		name: "tunneler",
		kill_verb: "blew up",
		tank_attr: {
			rad: 16,
			max_vel: 5,
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
			reload_ticks: 200
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
			max_vel: 8,
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
	
}

module.exports = Flags;

// Private methods

function shoot(world, tank, bullet_attr, dir_offset) {

	dir_offset = dir_offset || 0;
	var dir = tank.dir + dir_offset;

	var bullet_id = world.add_bullet(tank.id);

	if (bullet_id > -1) {
		var bullet = world.bullets[bullet_id];

		bullet.pos.set_rt(tank.rad * 2, tank.dir).m_add(tank.pos); // Bullet starts at end of cannon
		bullet.vel.set_rt(bullet_attr.speed, dir).m_add(tank.vel.scale(0.8));

		bullet.life = bullet_attr.life;
		bullet.rad = bullet_attr.rad;

		bullet.ricochet = bullet_attr.ricochet;
		bullet.wall_collide = bullet_attr.wall_collide;

	}

}