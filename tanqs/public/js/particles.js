var particles = new (function() {

	this.n_parts = 100;

	this.min_rad = 2;

	this.parts = [];

	for (var i = 0; i < this.n_parts; i++) {
		this.parts.push({ alive: false, pos: new Vec2(), vel: new Vec2(), vel_scale: 0, rad: 0, rad_scale: 0, color: ''});
	}

	this.add_particle = function(pos, vel, color, vel_scale, rad, rad_scale) {
		for (var i = 0; i < this.n_parts; i++) {
			var part = this.parts[i];
			if (!part.alive) {
				part.alive = true;
				part.pos.set(pos);
				part.vel.set(vel);
				part.color = color;
				part.vel_scale = vel_scale || 1;
				part.rad = rad;
				part.rad_scale = rad_scale;
				console.log("add a particle");
				return true;
			}
		}
		return false;
	}.bind(this);

	this.add_explosion = function(pos, color) {
		console.log("add an explo");
		var vel = new Vec2();
		for (var i = 0; i < 12; i++) {
			vel.set_xy(Math.random() * 8 - 4, Math.random() * 8 - 4);
			this.add_particle(pos, vel, '#666', 0.97, Math.random() * 8 + 8, 0.96);
		}
		for (var i = 0; i < 12; i++) {
			vel.set_xy(Math.random() * 8 - 4, Math.random() * 8 - 4);
			this.add_particle(pos, vel, color, 0.97, Math.random() * 8 + 8, 0.96);
		}
	}.bind(this);

	this.update = function() {
		for (var i = 0; i < this.n_parts; i++) {
			var part = this.parts[i];
			if (part.alive) {
				part.pos.m_add(part.vel);
				part.vel.m_scl(part.vel_scale);
				part.rad *= part.rad_scale;
				if (part.rad < this.min_rad) {
					part.alive = false;
				}
			}
		}
	}.bind(this);

	this.render = function(context) {
		for (var i = 0; i < this.n_parts; i++) {
			var part = this.parts[i];
			if (part.alive) {
				context.fillStyle = part.color;
				context.beginPath();
				context.arc(part.pos.x, part.pos.y, part.rad, 0, Math.PI * 2);
				context.fill();
			}
		}
	}.bind(this);

})();