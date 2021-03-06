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

	for (var i = 0; i < 32; i++) {
		this.tanks.push(new Tank());
	}
	for (var i = 0; i < 96; i++) {
		this.bullets.push(new Bullet());
	}
	for (var i = 0; i < 32; i++) {
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
};

World.prototype.local_update_bullets = function() {
	for (var i = 0; i < this.bullets.length; i++) {
		var bullet = this.bullets[i];
		if (bullet.alive) {
			if (Math.random() > 0.8) {
				this.game.particles.add_bullet_trail(bullet);
			}
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

		tank.name = tank_data.name || tank.name;
		tank.color = tank_data.color || tank.color;

		if (tank_data.alive) {
			
			tank.rad = tank_data.rad;

			if (tank.alive) {
				tank.old.pos.set(tank.draw.pos);
				tank.old.dir = tank.draw.dir;
			} else {
				tank.old.pos.set(tank_data.pos);
				tank.old.dir = tank_data.dir;
			}

			tank.current.pos.set(tank_data.pos);
			tank.current.dir = tank_data.dir;

			tank.reload = tank_data.reload;
			tank.reload_ticks = tank_data.reload_ticks;

			tank.flag = tank_data.flag;
			tank.flag_team = tank_data.flag_team;
			tank.team = tank_data.team;

			tank.invincible = tank_data.inv || false;
			tank.ai = tank_data.ai || false;

			if (tank_data.new) this.game.particles.add_tank_mist(tank);

			tank.alive = true;
		} else {
			if (tank.alive) { // Tank just died!
				tank.corpse = true;
				tank.death_anim = 3;
				tank.killed_by = tank_data.killed_by;
				this.game.particles.add_tank_explosion(tank);
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

			var tank = this.tanks[bullet_data.tank];

			if (bullet_data.new) { // This bullet was just shot!
				
				tank.gun_len = 0.85;
				bullet.alive = true;
				bullet.type = bullet_data.type;

				bullet.old_pos.set(tank.draw.pos);
				if (bullet.type == "explosion") {
					bullet.old_pos.set_xy(bullet_data.x, bullet_data.y);
				}
				bullet.draw_pos.set(bullet.old_pos);
				bullet.current_pos.set(bullet.old_pos);
				bullet.old_rad = bullet_data.rad;
				bullet.draw_rad = bullet_data.rad;

				bullet.guided = bullet_data.guided || false;
			} else {
				bullet.old_pos.set(bullet.draw_pos);
				bullet.old_rad = bullet.draw_rad;
			}

			bullet.color = tank.color; // We update this regardless of if its new in case it changes colors
			bullet.rad = bullet_data.rad;

			bullet.current_pos.set_xy(bullet_data.x, bullet_data.y);
			//bullet.vel.set(bullet.current_pos).m_sub(bullet.old_pos).m_scale(20 / this.game.time_step * 0.9);
			
		} else {
			if (bullet.alive) { // Bullet just died!
				if (bullet.rad < 50) {
					this.game.particles.add_bullet_explosion(bullet);
				}
			}
			bullet.alive = false;
		}

	}

};

World.prototype.server_update_flags = function(msg) {

	for (var i = 0; i < msg.length; i++) {

		var flag_data = msg[i];
		var flag = this.flags[flag_data.id];

		if (flag_data.alive) {

			if (flag.alive && (flag.pos.x != flag_data.x || flag.pos.y != flag_data.y)) { // Flag reset
				this.game.particles.add_flag_mist(flag);
				flag.pos.set_xy(flag_data.x, flag_data.y);
				this.game.particles.add_flag_mist(flag);
			} else {
				flag.pos.set_xy(flag_data.x, flag_data.y);
			}

			flag.rad = flag_data.rad;
			flag.team = flag_data.team;

			flag.alive = true;
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
	this.name = '';
	this.alive = false;
	this.team = -1;

	this.corpse = false;
	this.death_anim = 0;
	this.invincible = false;

	this.rad = 20;
	this.draw_rad = 20;
	this.gun_len = 1;
	this.current = new TankState();
	this.draw = new TankState();
	this.old = new TankState();
	this.color = '';
	this.track = {max: 30, start: 0, left: [], right: []};

	this.flag = "default";
	this.flag_team = -1; // if carrying team flag, what team
	this.killed_by = -1;
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

function Bullet() {

	this.alive = false;

	this.old_pos = new Vec2();
	this.draw_pos = new Vec2();
	this.current_pos = new Vec2();

	this.vel = new Vec2();
	this.old_rad = 0;
	this.draw_rad = 0;
	this.rad = 0;
	this.expansion = 0;

	this.color = '';

}

Bullet.prototype.lerp_state = function(delta) {
	this.draw_pos.set_lerp(this.old_pos, this.current_pos, delta);
	this.draw_rad = lerp(this.old_rad, this.rad, delta);
};

Bullet.prototype.update = function() {
	this.pos.m_add(this.vel);
};

function Flag() {

	this.alive = false;

	this.pos = new Vec2();
	this.rad = 0;

	this.team = -1;

}
