var shared = require('../public/shared/shared.js');
var Vec2 = shared.Vec2;
var clamp = shared.clamp;

module.exports = {

	bb_collide: bb_collide,
	circle_poly_collide: circle_poly_collide

};

function dist2(a, b) {
	return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
}

function bb_collide(a, b) {

	var x_overlap = (a.hwidth || a.rad) + (b.hwidth || b.rad) - Math.abs(a.pos.x - b.pos.x);
	var y_overlap = (a.hheight || a.rad) + (b.hheight || b.rad) - Math.abs(a.pos.y - b.pos.y);
	return (x_overlap > 0 && y_overlap > 0);

}

// Doesn't return resolution information, just true/false
function circle_circle_collide(a, b) {

	if (!bb_collide(a, b)) return false;

	var tot_rad2 = Math.pow(a.rad + b.rad, 2);
	return dist2(a, b) < tot_rad2;

}

// Returns resolution information {n, overlap}
function circle_poly_collide(circle, poly, vel) {

	if (!bb_collide(circle, poly)) return false;

	var d = [];
	for (var i = 0; i < poly.v.length; i++) {
		d[i] = (new Vec2()).set(circle.pos).m_sub(poly.v[i]);
	}

	for (var i = 0; i < poly.v.length; i++) {

		var j = (i + 1) % poly.v.length;
		var l = poly.l[i];
		var n = poly.n[i];

		if (d[i].dot(l) >= 0 && d[j].dot(l) <= 0) { // If point makes <=90 deg angle with each point on line

			var overlap = circle.rad - d[i].dot(n);
			var vn = vel ? vel.dot(n) : 0;
			if (overlap > 0 && overlap < 2 * circle.rad - vn) {
				return {n: n, overlap: overlap};
			}

		}

	}

	var rad2 = Math.pow(circle.rad, 2);
	for (var i = 0; i < d.length; i++) {
		var mag2 = d[i].mag2();
		if (mag2 < rad2) {
			return {n: d[i].m_unit(), overlap: circle.rad - Math.sqrt(mag2)};
		}
	}

	return false;

}