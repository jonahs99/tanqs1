function Particles() {

	this.particles = [];

	this.min_rad = 3;

}

Particles.prototype.update = function() {

	for (var i = this.particles.length - 1; i >= 0; i--) {
		var particle = this.particles[i];

		particle.scale *= particle.scale_speed;
		particle.pos.m_add(particle.vel);
		particle.vel.m_scale(particle.drag);

		if (particle.rad * particle.scale < this.min_rad) {
			this.particles.splice(i, 1);
			console.log(this.particles.length);
		}
	}

};

Particles.prototype.add_particle = function(pos, vel, rad, scale_speed, drag, fill) {
	var particle = {pos: pos, vel: vel, rad: rad, scale: 1, scale_speed: scale_speed, fill: fill, drag: drag};
	this.particles.push(particle);
};

Particles.prototype.add_tank_explosion = function(tank) {

	var max_vel = 4;
	var max_rad = tank.rad / 2;

	for (var i = 0; i < random_float(8, 15); i++) {
		var pos = new Vec2().set(tank.current.pos).m_addxy(random_float(-tank.rad, tank.rad), random_float(-tank.rad, tank.rad));
		var vel = new Vec2(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
		this.add_particle(pos, vel, random_float(5, max_rad), random_float(0.96, 0.99), random_float(0.98, 0.992), '#444');
	}
	for (var i = 0; i < random_float(12, 24); i++) {
		var pos = new Vec2().set(tank.current.pos).m_addxy(random_float(-tank.rad, tank.rad), random_float(-tank.rad, tank.rad));
		var vel = new Vec2(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
		this.add_particle(pos, vel, random_float(5, max_rad), random_float(0.96, 0.99), random_float(0.98, 0.992), tank.color);
	}

};

Particles.prototype.render = function(context) {

	for (var i = 0; i < this.particles.length; i++) {
		var particle = this.particles[i];

		context.fillStyle = particle.fill;

		context.beginPath();
		context.arc(particle.pos.x, particle.pos.y, particle.rad * particle.scale, 0, Math.PI * 2);
		context.fill();

	}

};