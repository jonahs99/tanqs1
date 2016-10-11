
function clamp(a, min, max) {

	return Math.min( Math.max( a, min ), max );

}

function lerp(a, b, delta) {

	return (1 - delta) * a + delta * b;

}

function Vec2(x, y) {

	this.x = x || 0;
	this.y = y || 0;

}

Vec2.prototype.set = function(v) {

	this.x = v.x;
	this.y = v.y;
	return this;

};

Vec2.prototype.set_xy = function(x, y) {

	this.x = x;
	this.y = y;
	return this;

};

Vec2.prototype.set_lerp = function(v1, v2, delta) {

	this.x = lerp(v1.x, v2.x, delta);
	this.y = lerp(v1.y, v2.y, delta);
	return this;

};

Vec2.prototype.set_rt = function(r, t) {

	this.x = Math.cos(t) * r;
	this.y = Math.sin(t) * r;
	return this;

}
Vec2.prototype.in_BB = function(x1, y1, x2, y2) {
	return (this.x >= x1) && (this.x <= x2) && (this.y >= y1) && (this.y <= y2);
};

Vec2.prototype.mag = function() {

	return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));

};

Vec2.prototype.mag2 = function() {

	return Math.pow(this.x, 2) + Math.pow(this.y, 2);

};

Vec2.prototype.dot = function(v) {

	return this.x * v.x + this.y * v.y;

};

Vec2.prototype.m_norm = function() {

	var x = x;
	this.x = -this.y;
	this.y = x;
	return this;

};

Vec2.prototype.m_rotate = function(a) {
	var cs = Math.cos(a);
	var sn = Math.sin(a);
	var px = this.x * cs - this.y * sn;
	var py = this.x * sn + this.y * cs;
	this.set_xy(px, py);
};

Vec2.prototype.m_scale = function(a) {

	this.x *= a;
	this.y *= a;
	return this;

};

Vec2.prototype.m_divide = function (a) {

	this.x /= a;
	this.y /= a;
	return this;

};

Vec2.prototype.m_add = function(v) {

	this.x += v.x;
	this.y += v.y;
	return this;

};

Vec2.prototype.m_sub = function(v) {

	this.x -= v.x;
	this.y -= v.y;
	return this;

};

Vec2.prototype.m_unit = function() {

	return this.m_divide(this.mag());

};

Vec2.prototype.m_clampxy = function(x1, x2, y1, y2) {

	this.x = clamp(this.x, x1, x2);
	this.y = clamp(this.y, y1, y2);
	return this;

};

Vec2.prototype.unit = function() {

	return (new Vec2()).set(this).m_unit();

};

Vec2.prototype.scale = function(a) {

	return (new Vec2()).set(this).m_scale(a);

};

// Export classes so that server can see inside this module

(function(exports){

	exports.Vec2 = Vec2;
	exports.clamp = clamp;
	exports.lerp = lerp;

}(typeof exports === 'undefined' ? this.share = {} : exports));