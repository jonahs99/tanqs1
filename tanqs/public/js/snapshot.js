
function SnapshotRing(n_snaps, frames_update, snap_config) {

	this.newest_update = 0;
	this.n_snaps = n_snaps;
	this.frames_update = frames_update;
	this.snaps = [];

	for (var i = 0; i < n_snaps; i++) {
		this.snaps[i] = new Snapshot(snap_config);
	}

}

SnapshotRing.prototype.add_frame = function(data) {

	var update = data.frame / this.frames_update;
	console.log(update);

	if (update <= this.newest_update - this.n_snaps) return; // Don't set old frames
	if (update > this.newest_update) this.newest_update = update;

	var ring_index = update % this.n_snaps;
	this.snaps[ring_index].set(data);

};

SnapshotRing.prototype.set_lerp = function(snap, update) {

	var fl_update = Math.floor(update);

	var i1 = fl_update % this.snaps.length;
	var i2 = (i1 + 1) % this.snaps.length;

	var delta = clamp(update - fl_update, 0, 1);

	snap.set_lerp(this.snaps[i1], this.snaps[i2], delta);

};

SnapshotRing.prototype.get_frame = function(snap, frame) {

	var snap1 = null;
	var snap2 = null;

	for (var i = 0; i < this.n_snaps; i++) {

		var snapi = this.snaps[i];

		if (snapi.frame < frame) {
			if (snap1 == null || snapi.frame > snap1.frame) {
				snap1 = snapi;
			}
		}
		if (snapi.frame > frame) {
			if (snap2 == null || snapi.frame < snap2.frame) {
				snap2 = snapi;
			}
		}

	}

	if (snap1 != null && snap2 != null) {
		snap.set_lerp(snap1, snap2, (frame - snap1.frame) / (snap2.frame - snap1.frame));
	} else if (snap1 != null) {
		console.log("only pre-frames");
	} else if (snap2 != null) {
		console.log("only post-frames");
	} else {
		console.log("no frames");
	}

};

function Snapshot(config) {

	this.frame = 0;

	this.tanks = [];
	this.bullets = [];
	this.flags = [];

	for (var i = 0; i < config.n_tanks; i++) {
		this.tanks[i] = new Tank();
	}
	for (var i = 0; i < config.n_bullets; i++) {
		this.bullets[i] = new Bullet();
	}
	for (var i = 0; i < config.n_flags; i++) {
		this.flags[i] = new Flag();
	}

}

Snapshot.prototype.set = function(data) {

	this.frame = data.frame;

	for (var i = 0; i < data.tanks.length; i++) {
		var tank_data = data.tanks[i];
		var tank = this.tanks[i];
		tank.alive = tank_data.alive;
		if (tank.alive) {
			tank.color = tank_data.color;
			tank.rad = tank_data.rad;
			tank.dir = tank_data.dir;
			tank.pos.set_xy(tank_data.x, tank_data.y);
			tank.reloads = tank_data.reloads;
			tank.reload_ticks = tank_data.reload_ticks;
			tank.chambers = tank_data.chambers;
		}
	}

	for (var i = 0; i < data.bullets.length; i++) {
		var bullet_data = data.bullets[i];
		var bullet = this.bullets[i];
		bullet.alive = bullet_data.alive;
		if (bullet.alive) {
			bullet.rad = bullet_data.rad;
			//bullet.dir = bullet_data.dir;
			bullet.pos.set_xy(bullet_data.x, bullet_data.y);
		}
	}

	for (var i = 0; i < data.flags.length; i++) {
		var flag_data = data.flags[i];
		var flag = this.flags[i];
		flag.alive = flag_data.alive;
		if (flag.alive) {
			flag.pos.set_xy(flag_data.x, flag_data.y);
			flag.rad = flag_data.rad;
		}
	}

};

Snapshot.prototype.set_lerp = function(s1, s2, delta) {

	for (var i = 0; i < s1.tanks.length; i++) {
		var t1 = s1.tanks[i];
		var t2 = s2.tanks[i];
		var tank = this.tanks[i];
		tank.alive = t1.alive;
		if (tank.alive) {
			if (t2.alive) {
				tank.rad = lerp(t1.rad, t2.rad, delta);
				tank.dir = lerp(t1.dir, t2.dir, delta);
				tank.pos.set_lerp(t1.pos, t2.pos, delta);
			} else {
				tank.rad = t1.rad;
				tank.dir = t1.dir
				tank.pos.set(t1.pos);
			}
		}
		tank.color = t1.color;
		tank.chambers = t1.chambers;
		tank.reloads = t1.reloads;
		tank.reload_ticks = t1.reload_ticks;
	}

	for (var i = 0; i < s1.bullets.length; i++) {
		var b1 = s1.bullets[i];
		var b2 = s2.bullets[i];
		var bullet = this.bullets[i];
		bullet.alive = b1.alive;
		if (bullet.alive) {
			if (b2.alive) {
				bullet.rad = lerp(b1.rad, b2.rad, delta);
				bullet.pos.set_lerp(b1.pos, b2.pos, delta);
			} else {
				bullet.rad = b1.rad;
				bullet.pos.set(b1.pos);
			}
		}
	}

	for (var i = 0; i < s2.flags.length; i++) {
		var f2 = s2.flags[i];
		var flag = this.flags[i];
		flag.alive = f2.alive;
		if (flag.alive) {
			flag.pos.set(f2.pos);
			flag.rad = f2.rad;
		}
	}

};

function Tank() {

	this.alive = false;

	this.color = 0;

	this.rad = 0;
	this.pos = new Vec2();
	this.dir = 0;

	this.chamber = 0;
	this.reloads = [];
	this.reload_ticks = 0;

}

function Bullet() {

	this.alive = false;

	this.rad = 0;
	this.pos = new Vec2();
	this.dir = 0;

}

function Flag() {

	this.alive = false;

	this.pos = new Vec2();
	this.rad = 0;

}