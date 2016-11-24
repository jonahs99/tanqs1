var XMath = require('../public/js/math.js');
var Vec2 = XMath.Vec2;
var clamp = XMath.clamp;

module.exports = {

	bb_collide: bb_collide,
	circle_poly_collide: circle_poly_collide,
	circle_arc_collide: circle_arc_collide

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

// Does return resolution information {n, overlap}
function circle_arc_collide(circle, arc, vel) {

	if (!bb_collide(circle, arc)) return false;

	var d = new Vec2().set(circle.col_pos).m_sub(arc.pos);

	var tot_rad = circle.rad + arc.rad;
	var tot_rad2 = Math.pow(tot_rad, 2);
	var mag2 = d.mag2();

	if (mag2 < tot_rad2) {
		var mag = Math.sqrt(mag2);
		d.m_div(mag);
		return {n: d, overlap: tot_rad - mag};
	}

}

/*

A poly object has arrays {
	
	bb: { x, y, hwidth, hheight }

	v: [] each point in the polygon
	l: [] a unit vector pointing from each point to the next point
	n: [] a normal vector the each l

}

*/

// Returns resolution information {n, overlap}
function circle_poly_collide(circle, poly, vel) {

	// Do a bounding box check to avoid pointless calculations

	if (!bb_collide(circle, poly.bb)) return false;

	// Pre-calculate the vector pointing from each point in the polygon to the center of the circle

	var d = [];
	for (var i = 0; i < poly.v.length; i++) {
		d[i] = new Vec2().set(circle.col_pos).m_sub(poly.v[i]);
	}

	// First check intersection of circle with edges of each line

	var collisions = [];

	for (var i = 0; i < poly.v.length; i++) {

		var j = (i + 1) % poly.v.length; // The index of the next point in the polygon

		var l = poly.l[i];
		var n = poly.n[i];

		if (d[i].dot(l) >= 0 && d[j].dot(l) <= 0) { // If point makes <=90 deg angle with each point on line (in edge-colliding region)

			var overlap = circle.rad - d[i].dot(n);
			var vn = vel ? vel.dot(n) : 0; // An adjustment factor to account for the bullet thru paper problem
			if (overlap > 0 && overlap < 2 * circle.rad - vn) { // If the circle is no more than v.n past the far side of the line, it must have collided
				collisions.push({n: n, overlap: overlap}); // The resolution function can add n * overlap to the col_pos for nice sliding motion
			}

		}

	}

	if (collisions.length) return collisions;

	// If no edge collisions found, check for corner collisions

	var rad2 = Math.pow(circle.rad, 2);
	for (var i = 0; i < d.length; i++) {
		var mag2 = d[i].mag2();
		if (mag2 < rad2) {
			return [{n: d[i].m_unit(), overlap: circle.rad - Math.sqrt(mag2)}];
		}
	}

	// Nothing found!

	return false;

}