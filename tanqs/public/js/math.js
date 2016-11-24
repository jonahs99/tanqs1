
// CLAMP clamps a value between a min and a max

function clamp(a, min, max) {

	return Math.min( Math.max( a, min ), max );

}

// LERP linear interpolates between 2 values given a delta from 0 to 1

function lerp(a, b, delta) {

	return (1 - delta) * a + delta * b;

}

// VEC2 represents a 2d vector or point
// functions prefixed with m modify the vector

function Vec2(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

Vec2.prototype.set = function(v) { this.x = v.x; this.y = v.y; return this; };
Vec2.prototype.set_xy = function(x, y) { this.x = x; this.y = y; return this; };
Vec2.prototype.set_rt = function(r, t) { this.x = r * Math.cos(t); this.y = r * Math.sin(t); return this; };
Vec2.prototype.set_lerp = function(v1, v2, delta) { this.x = lerp(v1.x, v2.x, delta);this.y = lerp(v1.y, v2.y, delta); return this; };
Vec2.prototype.set_norm = function(v) { this.x = -v.y; this.y = v.x; return this; };

Vec2.prototype.copy = function() { return new Vec2(this.x, this.y); };

Vec2.prototype.m_unit = function() { var mag = this.mag(); return this.m_div(mag); };
Vec2.prototype.m_norm = function() { var x = this.x; this.x = -this.y; this.y = x; return this; };
Vec2.prototype.m_setmag = function(a) {var mag = this.mag(); if (mag) return this.m_scl(a / mag); else return this; };
Vec2.prototype.m_clamp_xy = function(xmin, xmax, ymin, ymax) { this.x = clamp(this.x, xmin, xmax); this.y = clamp(this.y, ymin, ymax); return this; };

Vec2.prototype.m_scl = function(a) { this.x *= a; this.y *= a; return this; };
Vec2.prototype.m_div = function(a) { this.x /= a; this.y /= a; return this; };
Vec2.prototype.m_add = function(v) { this.x += v.x; this.y += v.y; return this; };
Vec2.prototype.m_sub = function(v) { this.x -= v.x; this.y -= v.y; return this; };

Vec2.prototype.mag2 = function() { return Math.pow(this.x, 2) + Math.pow(this.y, 2); };
Vec2.prototype.mag = function() { return Math.sqrt( Math.pow(this.x, 2) + Math.pow(this.y, 2) ); };

Vec2.prototype.dot = function(v) { return this.x * v.x + this.y * v.y; };

// Export function for node use

(function(exports){

	exports.Vec2 = Vec2;
	exports.clamp = clamp;
	exports.lerp = lerp;

}(typeof exports === 'undefined' ? this.share = {} : exports));