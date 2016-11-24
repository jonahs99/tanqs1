var Vec2 = require('../public/js/math.js').Vec2;

var Tank = require('./objects/tank.js');
var Bullet = require('./objects/bullet.js');
var Flag = require('./objects/flag.js');

var Physics = require('./physics.js');

function World(config) {

	this.config = config;

	this.tanks = [];
	this.bullets = [];
	this.flags = [];
	this.polys = [];

	this.frame = 0;

	this.parse_map();

}
module.exports = World;

World.prototype.reset = function(config) {

	this.tanks = [];
	this.bullets = [];
	this.flags = [];
	this.polys = [];

	for (var i = 0; i < config.capacity.n_tanks; i++) {
		this.tanks[i] = new Tank();
	}
	for (var i = 0; i < config.capacity.n_bullets; i++) {
		this.bullets[i] = new Bullet();
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
		polys: this.polys
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
	if (tank) {
		tank.phys.pos.set_xy(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);

		tank.phys.rad = 16;

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

World.prototype.update = function() {

	this.apply_tank_input();

	this.calculate_movement();

	this.resolve_collisions();

	this.handle_deaths();

	this.apply_movement();

	this.frame++;

};

World.prototype.apply_tank_input = function() {

	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			if (tank.input.shoot) {
				var bullet_id = this.add_bullet();
				if (bullet_id > -1) {
					var bullet = this.bullets[bullet_id];
					bullet.phys.pos.set(tank.phys.pos);
				}
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

	for (var tank_id = 0; tank_id < this.tanks.length; tank_id++) {
		var tank = this.tanks[tank_id];
		if (tank.alive) {

			for (var j = 0; j < this.polys.length; j++) {
				var poly = this.polys[j];

				var collide = Physics.circle_poly_collide(tank.phys, poly);
				if (collide.length > 1) {
					for (var i = 0; i < collide.length; i++) {
						tank.phys.vel.x += collide[i].n.x * collide[i].overlap;
						tank.phys.vel.y += collide[i].n.y * collide[i].overlap;
					}
				} else if (collide.length == 1) {
					tank.phys.vel.x += collide[0].n.x * collide[0].overlap;
					tank.phys.vel.y += collide[0].n.y * collide[0].overlap;
				}

			}

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

};

World.prototype.handle_deaths = function() {};

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

