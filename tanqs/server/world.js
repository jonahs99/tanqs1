var Vec2 = require('../public/js/math.js').Vec2;

var Powers = require('./flags/powers.js');

var Tank = require('./objects/tank.js');
var Bullet = require('./objects/bullet.js');
var Flag = require('./objects/flag.js');

var Physics = require('./physics.js');

var Team = {ROGUE: 0, RED: 1, BLUE: 2};

function World(config) {

	this.config = config;

	this.powers = new Powers(this);

	this.tanks = [];
	this.bullets = [];
	this.flags = [];
	this.polys = [];
	this.arcs = [];

	this.frame = 0;

	this.parse_map();

}
module.exports = World;

World.prototype.reset = function(config) {

	this.tanks = [];
	this.bullets = [];
	this.flags = [];
	this.polys = [];
	this.arcs = [];

	for (var i = 0; i < config.capacity.n_tanks; i++) {
		this.tanks[i] = new Tank(i);
	}
	for (var i = 0; i < config.capacity.n_bullets; i++) {
		this.bullets[i] = new Bullet(i);
	}

}

World.prototype.parse_map = function() {

	this.reset(this.config);

	var map_data = require('./maps/' + this.config.map + '.json');

	this.size = new Vec2(map_data.size.width, map_data.size.height);

	for (var i = 0; i < map_data.polys.length; i++) {

		var poly_data = map_data.polys[i];
		var poly = {v:[], l:[], n:[]};

		var x1, x2, y1, y2;

		for (var j = 0; j < poly_data.v.length; j++) {
			var v = poly_data.v[j];
			poly.v[j] = new Vec2(v.x, v.y);
			if (v.x < x1 || j == 0) x1 = v.x;
			if (v.x > x2 || j == 0) x2 = v.x;
			if (v.y < y1 || j == 0) y1 = v.y;
			if (v.y > y2 || j == 0) y2 = v.y;
		}

		// Bounding box calculation
		poly.bb = {}
		poly.bb.pos = new Vec2((x1 + x2) / 2, (y1 + y2) / 2)
		poly.bb.hwidth = Math.abs(x2 - x1);
		poly.bb.hheight = Math.abs(y2 - y1);

		for (var j = 0; j < poly_data.v.length; j++) {
			var k = (j + 1) % poly_data.v.length;
			poly.l[j] = new Vec2().set(poly.v[k]).m_sub(poly.v[j]).m_unit();
			poly.n[j] = new Vec2().set(poly.l[j]).m_norm().m_unit();
		}

		this.polys.push(poly);

	}

	this.map = {
		width: this.size.x,
		height: this.size.y,
		polys: this.polys,
		arcs: this.arcs
	};

};

World.prototype.reserve_tank = function() {

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];

		if (!tank.reserved) {
			tank.reserved = true;
			tank.color = Math.floor(Math.random() * 21);

			return tank_id;
		}
	}

	return -1;
};

World.prototype.free_tank = function(tank_id) {

	this.kill_tank(tank_id);

	var tank = this.tanks[tank_id];
	if (tank) {
		tank.reserved = false;
	}
};

World.prototype.spawn_tank = function(tank_id) {
	var tank = this.tanks[tank_id];
	if (tank && !tank.alive) {
		tank.phys.pos.set_xy(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);
		tank.set_power(this.powers.default);
		tank.alive = true;
	}
};

World.prototype.kill_tank = function(tank_id) {
	var tank = this.tanks[tank_id];
	if (tank) {
		tank.alive = false;
	}
};

World.prototype.add_bullet = function() {
	for (var bullet_id = 0; bullet_id < this.bullets.length; bullet_id++) {
		var bullet = this.bullets[bullet_id];

		if (!bullet.alive) {
			bullet.alive = true;
			return bullet_id;
		}
	}

	return -1;
};

World.prototype.kill_bullet = function(bullet_id) {
	this.bullets[bullet_id].alive = false;
};

World.prototype.is_enemy = function(team1, team2) {
	if (team1 == 0 || team2 == 0) return true;
	return team1 != team2;
};

World.prototype.update = function() {

	// State Update
	
	this.update_tank_weapons();

	// Physics Update

	this.apply_tank_input();
	this.calculate_movement();
	var kill_events = this.resolve_collisions();
	this.handle_deaths(kill_events);
	this.apply_movement();

	this.frame++;

};

World.prototype.update_tank_weapons = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.update_weapon();
		}
	}
};

World.prototype.apply_tank_input = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			if (tank.input.shoot) {
				tank.power.weapon.shoot(tank);
				tank.input.shoot = false;
			}
		}
	}
};

World.prototype.calculate_movement = function() {

	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.calculate_movement();
		}
	}

	for (var i = 0; i < this.bullets.length; i++) {
		var bullet = this.bullets[i];
		if (bullet.alive) {
			bullet.calculate_movement();
		}
	}

};

World.prototype.resolve_collisions = function() {

	var kill_events = [];

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive) {

			for (var j = 0; j < this.polys.length; j++) { // Tank wall collisions
				var poly = this.polys[j];
				var collide = Physics.circle_poly_collide(tank.phys, poly);
				for (var i = 0; i < collide.length; i++) {
					tank.phys.vel.x += collide[i].n.x * collide[i].overlap;
					tank.phys.vel.y += collide[i].n.y * collide[i].overlap;
				}
			}

			for (var j = 0; j < this.bullets.length; j++) { // Bullet tank kills
				var bullet = this.bullets[j];
				if (bullet.alive) {
					if (bullet.tank != tank_id && this.is_enemy(bullet.team, tank.team)) {
						if (Physics.circle_circle_collide(bullet.phys, tank.phys)) {
							kill_events.push({killer: bullet, killed: tank});
						}
					}
				}
			}

			for (var i = tank_id + 1; i < this.tanks.length; i++) { // Tank tank kills
				var enemy_tank = this.tanks[i];
				if (enemy_tank.alive) {
					if (i != tank_id && this.is_enemy(enemy_tank.team, tank.team)) {
						if (Physics.circle_circle_collide(enemy_tank.phys, tank.phys)) {
							//kill_events.push({killer: enemy_tank, killed: tank});
							//kill_events.push({killer: tank, killed: enemy_tank});
						}
					}
				}
			}

		}
	}

	for (var bullet_id = 0; bullet_id < this.bullets.length; bullet_id++) {
		var bullet = this.bullets[bullet_id];
		if (bullet.alive) {

			for (var j = 0; j < this.polys.length; j++) {
				var poly = this.polys[j];
				var collide = Physics.circle_poly_collide(bullet.phys, poly);
				if (collide.length) {
					kill_events.push({killed: bullet});
				}
			}

			if (bullet.phys.col_pos.x < -this.size.x / 2 || bullet.phys.col_pos.x > this.size.x / 2 || 
				bullet.phys.col_pos.y < -this.size.y / 2 || bullet.phys.col_pos.y > this.size.y / 2)
				kill_events.push({killed: bullet});

		}
	}

	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			if (tank.phys.col_pos.x < -this.size.x / 2)
				tank.phys.vel.x += -this.size.x / 2 - tank.phys.col_pos.x;
			if (tank.phys.col_pos.x > this.size.x / 2)
				tank.phys.vel.x -= tank.phys.col_pos.x - this.size.x / 2;
			if (tank.phys.col_pos.y < -this.size.y / 2)
				tank.phys.vel.y += -this.size.y / 2 - tank.phys.col_pos.y;
			if (tank.phys.col_pos.y > this.size.y / 2)
				tank.phys.vel.y -= tank.phys.col_pos.y - this.size.y / 2;
		}
	}

	return kill_events;

};

World.prototype.handle_deaths = function(kill_events) {

	for (var i = 0; i < kill_events.length; i++) {
		var evt = kill_events[i];
		if (evt.killed.alive) {
			if (evt.killed instanceof Bullet) {
				this.kill_bullet(evt.killed.id);
			} else {
				this.kill_tank(evt.killed.id);
				if (evt.killer instanceof Bullet) {
					this.kill_bullet(evt.killed.id);
				}
			}
		}
	}

};

World.prototype.apply_movement = function() {

	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.apply_movement();
		}
	}

	for (var i = 0; i < this.bullets.length; i++) {
		var bullet = this.bullets[i];
		if (bullet.alive) {
			bullet.apply_movement();
		}
	}

};

World.prototype.in_wall = function(point) {
	for (var i = 0; i < this.polys.length; i++) {
		if (Physics.point_in_poly(point, this.polys[i])) {
			return true;
		}
	}
	false;
}