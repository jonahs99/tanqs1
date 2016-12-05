var particles = new (function() {

	this.n_parts = 400;

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
				return true;
			}
		}
		return false;
	}.bind(this);

	this.add_explosion = function(pos, color) {
		var vel = new Vec2();
		for (var i = 0; i < 10; i++) {
			vel.set_rt(Math.random() * 5, Math.random() * 2 * Math.PI);
			this.add_particle(pos, vel, '#666', 0.99, Math.random() * 8 + 8, 0.96);
		}
		for (var i = 0; i < 16; i++) {
			vel.set_rt(Math.random() * 5, Math.random() * 2 * Math.PI);
			this.add_particle(pos, vel, color, 0.99, Math.random() * 8 + 8, 0.96);
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