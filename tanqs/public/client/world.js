// The CLIENT's view of the world

function World(game) {

	this.game = game;

	this.tanks = [];
	this.bullets = [];
	this.flags = [];
	this.map = {};

	this.frame = 0;

	this.reset();

}

World.prototype.reset = function() {

	for (var i = 0; i < 24; i++) {
		this.tanks.push(new Tank());
	}
	for (var i = 0; i < 72; i++) {
		this.bullets.push(new Bullet());
	}
	for (var i = 0; i < 12; i++) {
		this.flags.push(new Flag());
	}

};

World.prototype.local_update = function() {
	this.local_update_tanks();
	//this.local_update_bullets();

	/*if (this.frame % 4 == 0) {
		this.track_tanks();
	}*/

	this.frame++;
}

World.prototype.local_update_bullets = function() {
	for (var i = 0; i < this.bullets.length; i++) {
		var bullet = this.bullets[i];
		if (bullet.alive) {
			this.bullets[i].update();
		}
	}
};

World.prototype.track_tanks = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			if (tank.track.left.length < tank.track.max) {
				var l = (new Vec2()).set_rt(tank.rad, tank.draw.dir + Math.PI / 2).m_add(tank.draw.pos);
				var r = (new Vec2()).set_rt(tank.rad, tank.draw.dir - Math.PI / 2).m_add(tank.draw.pos);
				tank.track.left.push(l);
				tank.track.right.push(r);
			} else {
				tank.track.left[tank.track.start].set_rt(tank.rad, tank.draw.dir + Math.PI / 2).m_add(tank.draw.pos);
				tank.track.right[tank.track.start].set_rt(tank.rad, tank.draw.dir - Math.PI / 2).m_add(tank.draw.pos);
				tank.track.start++;
				if (tank.track.start >= tank.track.max) {
					tank.track.start = 0;
				}
			}
		}
	}
};

World.prototype.local_update_tanks = function() {
	for (var i = 0; i < this.tanks.length; i++) {
		var tank = this.tanks[i];
		if (tank.alive) {
			tank.update();
		}
		if (tank.corpse) {
			tank.death_anim--;
			if (tank.death_anim <= 0) {
				tank.corpse = false;
			}
		}
	}
};

World.prototype.server_update_tanks = function(msg) {

	for (var i = 0; i < msg.length; i++) {

		var tank_data = msg[i];
		var tank = this.tanks[tank_data.id];

		if (tank_data.alive) {
			tank.name = tank_data.name;
			tank.rad = tank_data.rad;

			if (tank.alive) {
				tank.old.pos.set(tank.current.pos);//tank.draw.pos);
				tank.old.dir = tank.draw.dir;
			} else {
				tank.old.pos.set(tank_data.pos);
				tank.old.dir = tank_data.dir;
			}

			tank.current.pos.set(tank_data.pos);
			tank.current.dir = tank_data.dir;

			if (tank == this.game.player_tank) {
				tank.reload = tank_data.reload;
				tank.reload_ticks = tank_data.reload_ticks;
			}

			tank.color = tank_data.color;

			tank.flag = tank_data.flag;

			tank.alive = true;
		} else {
			if (tank.alive) { // Tank just died!
				tank.corpse = true;
				tank.death_anim = 3;
			}
			tank.alive = false;
		}

	}

};

World.prototype.server_update_bullets = function(msg) {

	for (var i = 0; i < msg.length; i++) {

		var bullet_data = msg[i];
		var bullet = this.bullets[bullet_data.id];

		if (bullet_data.alive) {

			if (bullet_data.new) { // This bullet was just shot!
				var tank = this.tanks[bullet_data.tank];
				tank.gun_len = 0.9;
				bullet.rad = bullet_data.rad;
				bullet.color = tank.color;
				bullet.alive = true;

				bullet.old_pos.set(tank.draw.pos);
				bullet.draw_pos.set(bullet.old_pos);
			} else {
				bullet.old_pos.set(bullet.draw_pos);
			}

			bullet.current_pos.set_xy(bullet_data.x, bullet_data.y);
			
		} else {
			bullet.alive = false;
		}

	}

};

World.prototype.server_update_flags = function(msg) {

	for (var i = 0; i < msg.length; i++) {

		var flag_data = msg[i];
		var flag = this.flags[flag_data.id];

		if (flag_data.alive) {
			flag.alive = true;
			flag.pos.set_xy(flag_data.x, flag_data.y);
			flag.rad = flag_data.rad;
		} else {
			flag.alive = false;
		}

	}

};

World.prototype.add_bullets = function(msg) {

	for (var i = 0; i < msg.length; i++) {
		var bullet_data = msg[i];
		var bullet = this.bullets[bullet_data.id];
		var tank = this.tanks[bullet_data.tank]; // Tank which shot the bullet
		if (bullet_data.alive) {
			bullet.alive = true;
			bullet.vel.set_xy(bullet_data.vx, bullet_data.vy);
			bullet.pos.set_xy(bullet_data.x, bullet_data.y).m_sub(bullet.vel.scale(this.game.time_step / 20));
			bullet.rad = bullet_data.rad;
			bullet.color = tank.color;
			tank.gun_len = 0.9;
		} else {
			bullet.alive = false;
		}
	}

};

function TankState() {
	this.pos = new Vec2();
	this.dir = 0;
}

function Tank() {
	this.alive = false;

	this.corpse = false;
	this.death_anim = 0;

	this.rad = 20;
	this.gun_len = 1;
	this.current = new TankState();
	this.draw = new TankState();
	this.old = new TankState();
	this.color = '';
	this.track = {max: 30, start: 0, left: [], right: []};

	this.flag = "default";
}

Tank.prototype.update = function() {
	var rebound_speed = 0.01;
	if (this.gun_len < 1 - rebound_speed) {
		this.gun_len += 0.01;
	} else if (this.gun_len < 1) {
		this.gun_len = 1;
	}
};

Tank.prototype.lerp_state = function(delta) {
	this.draw.pos.set_lerp(this.old.pos, this.current.pos, delta);
	this.draw.dir = lerp(this.old.dir, this.current.dir, delta);
};

function Bullet(pos, vel, rad) {

	this.alive = false;

	this.old_pos = new Vec2();
	this.draw_pos = new Vec2();
	this.current_pos = new Vec2();

	this.vel = new Vec2();
	this.rad = rad || 0;

	this.color = '';

	if (pos) {
		this.pos.set(pos);
	}
	if (vel) {
		this.vel.set(vel);
	}

}

Bullet.prototype.lerp_state = function(delta) {
	this.draw_pos.set_lerp(this.old_pos, this.current_pos, delta)
};

Bullet.prototype.update = function() {
	this.pos.m_add(this.vel);
};

function Flag() {

	this.alive = false;

	this.pos = new Vec2();
	this.rad = 0;

}