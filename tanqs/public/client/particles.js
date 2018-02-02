function Particles() {

	this.particles = [];

}

Particles.prototype.update = function() {

	for (var i = this.particles.length - 1; i >= 0; i--) {
		var particle = this.particles[i];

		particle.scale *= particle.scale_speed;
		//particle.pos.m_add(particle.vel);
		//particle.vel.m_scale(particle.drag);
		particle.pos.m_addxy(particle.speed * Math.cos(particle.dir), particle.speed * Math.sin(particle.dir));
		particle.speed *= particle.drag;
		particle.dir += (Math.random() * 2 - 1) * particle.wander;

		if (particle.rad * particle.scale < particle.min_rad) {
			this.particles.splice(i, 1);
		}
	}

};

Particles.prototype.add_particle = function(pos, vel, rad, min_rad, scale_speed, drag, fill) {
	var particle = {pos: pos, speed: vel.mag(), dir: vel.dir(), wander: 0.2, rad: rad, scale: 1, scale_speed: scale_speed, fill: fill, drag: drag, min_rad: min_rad};
	this.particles.push(particle);
};

Particles.prototype.add_tank_mist = function(tank) {

	var max_vel = 2;
	var max_rad = tank.rad * 0.7;

	for (var i = 0; i < random_float(10, 12); i++) {
		var pos = new Vec2().set(tank.current.pos).m_addxy(random_float(-tank.rad*1.5, tank.rad*1.5), random_float(-tank.rad*1.5, tank.rad*1.5));
		var vel = new Vec2(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
		this.add_particle(pos, vel, random_float(5, max_rad), 3, random_float(0.96, 0.97), random_float(0.94, 0.95), '#ddd');
	}
	for (var i = 0; i < random_float(10, 12); i++) {
		var pos = new Vec2().set(tank.current.pos).m_addxy(random_float(-tank.rad*1.5, tank.rad*1.5), random_float(-tank.rad*1.5, tank.rad*1.5));
		var vel = new Vec2(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
		this.add_particle(pos, vel, random_float(5, max_rad), 3, random_float(0.96, 0.97), random_float(0.94, 0.95), tank.color);
	}

};

Particles.prototype.add_flag_mist = function(flag) {

	var max_vel = 2;
	var max_rad = flag.rad * 0.7;

	for (var i = 0; i < random_float(10, 12); i++) {
		var pos = new Vec2().set(flag.pos).m_addxy(random_float(-flag.rad*1.5, flag.rad*1.5), random_float(-flag.rad*1.5, flag.rad*1.5));
		var vel = new Vec2(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
		this.add_particle(pos, vel, random_float(5, max_rad), 3, random_float(0.96, 0.97), random_float(0.94, 0.95), '#ddd');
	}

};

Particles.prototype.add_tank_explosion = function(tank) {

	var max_vel = 3;
	var max_rad = tank.rad * 0.7;

	for (var i = 0; i < random_float(12, 18); i++) {
		var pos = new Vec2().set(tank.current.pos);//.m_addxy(random_float(-tank.rad, tank.rad), random_float(-tank.rad, tank.rad));
		var vel = new Vec2(max_vel * Math.sin(random_float(-Math.PI, Math.PI)), max_vel * Math.sin(random_float(-Math.PI, Math.PI)));
		this.add_particle(pos, vel, random_float(5, max_rad), 3, random_float(0.96, 0.99), random_float(0.97, 0.992), '#444');
	}

	for (var i = 0; i < random_float(18, 30); i++) {
		var pos = new Vec2().set(tank.current.pos).m_addxy(random_float(-tank.rad, tank.rad), random_float(-tank.rad, tank.rad));
		var vel = new Vec2(max_vel * Math.sin(random_float(-Math.PI, Math.PI)), max_vel * Math.sin(random_float(-Math.PI, Math.PI)));
		this.add_particle(pos, vel, random_float(5, max_rad), 3, random_float(0.96, 0.99), random_float(0.97, 0.992), tank.color);
	}

};

Particles.prototype.add_bullet_explosion = function(bullet) {

	var max_vel = 1.6;
	var max_rad = bullet.rad * 1.1;

	for (var i = 0; i < random_float(3, 5); i++) {
		var pos = new Vec2().set(bullet.draw_pos);//.m_addxy(random_float(-bullet.rad, bullet.rad), random_float(-bullet.rad, bullet.rad));
		var vel = new Vec2(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
		this.add_particle(pos, vel, random_float(2, max_rad), 1.5, random_float(0.96, 0.97), random_float(0.94, 0.95), bullet.color);
	}

};

Particles.prototype.add_bullet_trail = function(bullet) {
	var max_vel = 0.8;
	var max_rad = bullet.rad * 0.8;
	var pos = new Vec2().set(bullet.draw_pos);
	var vel = bullet.vel.m_addxy(random_float(-max_vel, max_vel), random_float(-max_vel, max_vel));
	this.add_particle(pos, vel, max_rad, 1.5, 0.99, 0.92, bullet.color);
};

Particles.prototype.render = function(context) {
	context.globalCompositeOperation = 'lighter';
	for (var i = 0; i < this.particles.length; i++) {
		var particle = this.particles[i];

		context.fillStyle = particle.fill;

		context.beginPath();
		context.arc(particle.pos.x, particle.pos.y, particle.rad * particle.scale, 0, Math.PI * 2);
		var r = particle.rad * particle.scale;
		//context.rect(particle.pos.x-r, particle.pos.y-r, r*2, r*2);
		context.fill();

	}
	context.globalCompositeOperation = 'normal';
};
