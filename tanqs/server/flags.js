
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

	// TEAM

	this.team = morph(this.default, {name: "", tank_attr: {max_vel: 2}});

	// SHIELD

	this.shield = morph(this.default, {name: "shield", tank_attr: {shield_rad: 40}});
	this.shield.shoot = function(tank) {
		if (tank.use_reload(0,this.weapon_attr.max_bullets-1)) {
			shoot(world, tank, this.bullet_attr);
		}
	}

	// RICOCHET

	this.ricochet = morph(this.default, {name:"ricochet", bullet_attr:{ricochet: 3, speed: 7}});

	// SUPER BULLET

	this.super_bullet = morph(this.default, {name:"super bullet", bullet_attr:{ rad: 8, speed: 5.6, wall_collide: false, pass_thru: true }});

	// EXTRA CLIP

	this.extra_clip = morph(this.default,
	{
		name: "extra clip",
		weapon_attr: {max_bullets:4, reload_ticks:110},
		bullet_attr: { life: 80 }
	});

	// SNIPER

	this.sniper = morph(this.default,
	{
		name: "sniper",
		kill_verb: "sniped",
		tank_attr: {max_vel: 5.5},
		weapon_attr: {reload_ticks: 170},
		bullet_attr: {speed: 14, life: 170}
	});

	// TUNNELER

	this.tunneler = morph(this.default,
	{
		name: "tunneler",
		tank_attr: {max_vel: 4.8, wall_collide: false}
	});

	// TRIPLE SHOT

	this.triple_shot = morph(this.default,
	{
		name: "triple shot",
		weapon_attr: {max_bullets: 2, reload_ticks: 150},
		bullet_attr: {life: 100}
	});
	this.triple_shot.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr, -Math.PI / 5);
			shoot(world, tank, this.bullet_attr, 0);
			shoot(world, tank, this.bullet_attr, Math.PI / 5);
		}
	};

	// STEAM ROLLER

	this.steam_roller = morph(this.default,
	{
		name: "steam roller",
		kill_verb: "flattened",
		tank_attr: {rad: 19, max_vel: 6.4, kill_on_collide: true},
	});
	
	// TINY

	this.tiny = morph(this.default,
	{
		name: "tiny",
		tank_attr: {rad: 10, die_on_collide: true},
		bullet_attr: {rad: 4}
	});

	// SPEED

	this.speed = morph(this.default,
	{
		name: "speed",
		tank_attr: {max_vel: 7.3},
	});

	// BACKFIRE

	this.back_fire = morph(this.default, {name: "back fire"});

	this.back_fire.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr);
			shoot(world, tank, this.bullet_attr, Math.PI, 0, true, true);
		}
	};

	// SHOCK WAVE

	this.shock_wave = morph(this.default,
	{
		name: "shock wave",
		kill_verb: "incinerated",
		weapon_attr: {max_bullets: 2, reload_ticks: 125},
		bullet_attr: {rad: 24, speed: 0, life: 12, wall_collide: false, pass_thru: true, expansion: 13}
	});
	this.shock_wave.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr, 0, true, false, true);
		}
	};

	// GUIDED MISSILE

	this.guided_missile = morph(this.default,
	{
		name: "guided missile",
		kill_verb: "missiled",
		weapon_attr: {max_bullets: 3, reload_ticks: 200},
		bullet_attr: {speed: 2, guided: {min_cos: 0.92, max_acc: 0.28, max_vel: 8}}
	});
	/*this.guided_missile.shoot = function(tank) {
		if (tank.use_reload()) {
			shoot(world, tank, this.bullet_attr, 0, true);
		}
	};*/

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

		bullet.guided = bullet_attr.guided || false;

	}

}

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
