var canvas = document.getElementById("canvas");
var grid_input_form = document.getElementById('grid_input');
var export_form = document.getElementById('export_input');

var width_textbox = document.getElementById('map_width');
var height_textbox = document.getElementById('map_height');
var major_textbox = document.getElementById('major_gridlines_size');
var grid_textbox = document.getElementById('grid_size');

var toolbar = {
	red: document.getElementById('red_radio'),
	blue: document.getElementById('blue_radio'),
	team_flag: document.getElementById('team_flag_radio'),
	team_spawn: document.getElementById('team_spawn_radio'),
	team_pad: document.getElementById('team_pad_radio'),
	flag: document.getElementById('flag_radio'),
	wall: document.getElementById('wall_radio'),
	new_poly: document.getElementById('poly_radio'),
	continue_poly: document.getElementById('continue_poly_radio'),
	erase_flag: document.getElementById('erase_flag_radio'),
	erase_wall: document.getElementById('erase_wall_radio'),
	erase_poly: document.getElementById('erase_poly_radio')
};

var display_options = {
	flag_names: document.getElementById('names_display_check'),
	flags: document.getElementById('flags_display_check')
};

var config = {width: 400, height: 400, major: 100, grid:50};
var camera = {x: 0, y: 0, scale:1};
var keys = {up: false, down: false, left: false, right: false};

var map = {
	rects:[], polys: [], flags:[],
	teams: [{}, {}]
};

var mouse_click = {x:0, y:0};

var mouse = {x:0, y:0};
var mouse_pressed = false;

canvas.style.backgroundColor = '#555';
context = canvas.getContext('2d');


grid_input_form.onsubmit = function() {

	if(confirm("Are you sure you want to reset EVERYTHING?")) {
		map = {
			rects:[], flags:[],
			teams: [{}, {}]
		};
		draw();
	} else {
		console.log("you hit cancel");
	}
	return false; 
}

export_input.onsubmit = function() {

	var map_object = {
		size: {width: config.width, height: config.height, grid: config.major},
		teams: map.teams,
		rectangles: map.rects,
		flags: map.flags,
		polys: map.polys
	};

	var string_out = JSON.stringify(map_object, null, "\t");
	console.log(string_out);

	return false;
};

width_textbox.oninput = height_textbox.oninput = major_textbox.oninput = grid_textbox.oninput = function() {

	config.width = Math.floor(width_textbox.value) || 0;
	config.height = Math.floor(height_textbox.value) || 0;
	config.major = Math.floor(major_textbox.value) || 1;
	config.grid = config.major/(Math.floor(grid_textbox.value) || 1);

	draw();

	console.log(grid_size);

	return false;
};

display_options.flag_names.onclick = display_options.flags.onclick = function() {
	draw();
};

setInterval(update, 50);

function update() {
	if (keys.up) camera.y -= 10;
	if (keys.down) camera.y += 10;
	if (keys.left) camera.x -= 10;
	if (keys.right) camera.x += 10;
	if (keys.up || keys.down || keys.left || keys.right) draw();
}

document.onmousemove = function(e) {
	mouse = world_coord(e.clientX, e.clientY);
	//mouse.x = Math.max(Math.min(mouse.x, config.width/2), -config.width/2);
	//mouse.y = Math.max(Math.min(mouse.y, config.height/2), -config.height/2);
	draw();

}

canvas.onmousedown = function(e) {
	if (toolbar.wall.checked || toolbar.team_pad.checked) {
		var w = world_coord(e.clientX, e.clientY);
		var x = snap(w.x, config.grid);
		var y = snap(w.y, config.grid);

		mouse_click.x = x;
		mouse_click.y = y;
	}

	mouse_pressed = true;
}

canvas.onmouseup = function(e) {

	mouse_pressed = false;

	var w = world_coord(e.clientX, e.clientY);
	var x = snap(w.x, config.grid);
	var y = snap(w.y, config.grid);
	var cx = snap_center(w.x, config.grid);
	var cy = snap_center(w.y, config.grid);

	if (Math.abs(x) > config.width / 2 || Math.abs(y) > config.height / 2) return;
 
	if (toolbar.wall.checked) {
		var rect = {x: (mouse_click.x + x) / 2, y: (mouse_click.y + y) / 2, hwidth: Math.abs((mouse_click.x - x) / 2), hheight: Math.abs((mouse_click.y - y) / 2)};

		if (((rect.x + rect.hwidth) <= config.width / 2) && ((rect.x - rect.hwidth) >= -config.width / 2) && ((rect.y + rect.hheight) <= config.height / 2) && ((rect.y - rect.hheight) >= -config.height / 2)) {
			map.rects.push(rect);
		}
	} else if (toolbar.team_pad.checked) {
		var team = -1;
		if (toolbar.red.checked) {
			team = 0;
		} else if (toolbar.blue.checked) {
			team = 1
		}
		if (team > -1) {
			var rect = {x: (mouse_click.x + x) / 2, y: (mouse_click.y + y) / 2, hwidth: Math.abs((mouse_click.x - x) / 2), hheight: Math.abs((mouse_click.y - y) / 2)};
			if (((rect.x + rect.hwidth) <= config.width / 2) && ((rect.x - rect.hwidth) >= -config.width / 2) && ((rect.y + rect.hheight) <= config.height / 2) && ((rect.y - rect.hheight) >= -config.height / 2)) {
				map.teams[team].pad = rect;
			}
		}
	} else if (toolbar.erase_wall.checked) {
		for (var i = map.rects.length - 1; i >= 0; i--) {
			var rect = map.rects[i];

			if (Math.abs(rect.x - cx) < rect.hwidth && Math.abs(rect.y - cy) < rect.hheight) {
				map.rects.splice(i, 1);
				break;
			}
		}
	} else if (toolbar.flag.checked) {
		var flag_type = prompt("Flag type:", "speed");
		var flag = {x: x, y: y, type: flag_type};
		map.flags.push(flag);
	} else if (toolbar.erase_flag.checked) {
		for (var i = map.flags.length - 1; i >= 0; i--) {
			var flag = map.flags[i];
			if (Math.abs(flag.x - x) < 1 && Math.abs(flag.y - y) < 1) {
				map.flags.splice(i, 1);
				break;
			}
		}
	} else if (toolbar.team_flag.checked) {
		var team = -1;
		if (toolbar.red.checked) {
			team = 0;
		} else if (toolbar.blue.checked) {
			team = 1
		}
		if (team > -1) {
			map.teams[team].flag = {x: x, y: y};
		}
	} else if (toolbar.team_spawn.checked) {
		var team = -1;
		if (toolbar.red.checked) {
			team = 0;
		} else if (toolbar.blue.checked) {
			team = 1
		}
		if (team > -1) {
			map.teams[team].spawn = {x: x, y: y};
		}
	} else if (toolbar.new_poly.checked) {
		var poly = {v: [{x: x, y: y}]};
		map.polys.push(poly);
	} else if (toolbar.continue_poly.checked) {
		if (map.polys.length) {
			var poly = map.polys[map.polys.length - 1];
			poly.v.push({x: x, y: y});
		}
	} else if (toolbar.erase_poly.checked) {
		for (var i = map.polys.length - 1; i >= 0; i--) {
			var poly = map.polys[i];
			if (Math.abs(poly.v[0].x - x) < 1 && Math.abs(poly.v[0].y - y) < 1) {
				map.polys.splice(i, 1);
				break;
			}
		}
	}

	draw();
}

document.onmousewheel = function(e) {
	var delta = e.wheelDelta;

	var dx = e.clientX - canvas.width / 2;
	var dy = e.clientY - canvas.height / 2;

	//var ratio = 1 - ((camera.scale + delta / 1000) / camera.scale);
	//var ratio = 1 - Math.exp(delta/1000);

	var old_scale = camera.scale;
	camera.scale *= Math.exp(delta/1000);

	if (camera.scale < 1/20) {
		camera.scale = 1/20;
	} else if (camera.scale > 10) {
		camera.scale = 10;
	}

	var ratio = 1 - camera.scale/old_scale;

	camera.x += ratio * dx / camera.scale;
	camera.y += ratio * dy / camera.scale;


	draw();
}

window.onkeydown = function(e) {
	var x = e.keyCode;

	if (x == 87) {
		keys.up = true;
	} else if (x == 83) {
		keys.down = true;
	} else if (x == 65) {
		keys.left = true;
	} else if (x == 68) {
		keys.right = true;
	}
}

window.onkeyup = function(e) {
	var x = e.keyCode;
	if (x == 87) {
		keys.up = false;
	} else if (x == 83) {
		keys.down = false;
	} else if (x == 65) {
		keys.left = false;
	} else if (x == 68) {
		keys.right = false;
	}
}

function draw() {
	//some reset and translatin'
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.translate(canvas.width / 2, canvas.height / 2);
	context.scale(camera.scale, camera.scale);
	context.translate(camera.x, camera.y);

	

	context.lineWidth = 1;
	context.strokeStyle = '#888';

	//horizontal lines
	for (var i = -Math.floor(config.height/config.grid) / 2; i <= Math.floor(config.height/config.grid) / 2; i++) {
		context.beginPath();
		context.moveTo(-config.width / 2, config.grid * i);
		context.lineTo(config.width / 2, config.grid * i );
		context.stroke();
	}

	//vertical lines
	for (var i = -Math.floor(config.width/config.grid) / 2; i <= Math.floor(config.width/config.grid) / 2; i++) {
		context.beginPath();
		context.moveTo(config.grid * i, -config.height / 2);
		context.lineTo(config.grid * i, config.height / 2);
		context.stroke();
	}

	context.lineWidth = 3;
	context.strokeStyle = '#ccc';

	//horizontal lines
	for (var i = -Math.floor(config.height/config.major) / 2; i <= Math.floor(config.height/config.major) / 2; i++) {
		context.beginPath();
		context.moveTo(-config.width / 2, config.major * i);
		context.lineTo(config.width / 2, config.major * i );
		context.stroke();
	}

	//vertical lines
	for (var i = -Math.floor(config.width/config.major) / 2; i <= Math.floor(config.width/config.major) / 2; i++) {
		context.beginPath();
		context.moveTo(config.major * i, -config.height / 2);
		context.lineTo(config.major * i, config.height / 2);
		context.stroke();
	}

	//origin lines
	context.lineWidth = 5;
	context.strokeStyle = '#cc6';

	context.beginPath();
	context.moveTo(0, -config.height / 2);
	context.lineTo(0, config.height / 2);
	context.stroke();

	context.beginPath();
	context.moveTo(-config.width / 2, 0);
	context.lineTo(config.width / 2, 0);
	context.stroke();

	//map border
	context.lineWidth = 3;
	context.strokeStyle = '#f66';

	context.beginPath();
	context.moveTo(-config.width / 2, -config.height / 2);
	context.lineTo(config.width / 2,  -config.height / 2);
	context.lineTo(config.width / 2,  config.height / 2);
	context.lineTo(-config.width / 2,  config.height / 2);
	context.lineTo(-config.width / 2, -config.height / 2);
	context.stroke();

	//rectangles
	context.lineWidth = 3;
	context.strokeStyle = '#f52';
	context.fillStyle = 'rgba(255, 128, 64, 0.7)';
	context.lineJoin = 'round';
	for (var i = 0; i < map.rects.length; i++) {
		var rect = map.rects[i];
		context.beginPath();
		context.rect(rect.x - rect.hwidth, rect.y - rect.hheight, rect.hwidth*2, rect.hheight*2);
		context.fill();
		context.stroke();
	}

	//polys
	context.lineWidth = 3;
	context.strokeStyle = '#f52';
	context.fillStyle = 'rgba(255, 128, 64, 0.7)';
	context.lineJoin = 'round';
	context.beginPath();
	for (var i = 0; i < map.polys.length; i++) {
		var poly = map.polys[i];

		context.beginPath();
		context.arc(poly.v[0].x, poly.v[0].y, 8, 0, Math.PI * 2);
		context.fill();
		context.stroke();

		context.beginPath();
		context.moveTo(poly.v[0].x, poly.v[0].y);
		for (var j = 1; j < poly.v.length; j++) {
			context.lineTo(poly.v[j].x, poly.v[j].y);
		}
		context.closePath();

		context.fill();
		context.stroke();
	}

	//flags
	if (display_options.flags.checked) {
		context.lineWidth = 6;
		context.strokeStyle = '#fff';
		context.fillStyle = '#fff';
		context.lineJoin = 'round';
		for (var i = 0; i < map.flags.length; i++) {
			var flag = map.flags[i];
			context.beginPath();
			context.rect(flag.x - 12, flag.y - 12, 24, 24);
			context.fill();
			context.stroke();
			if (display_options.flag_names.checked) {
				context.font = "16px Open Sans";
				context.textAlign = 'center';
				context.fillText(flag.type, flag.x, flag.y - 24);
			}
		}
	}

	for (var i = 0; i < map.teams.length; i++) {
		var team = map.teams[i];
		context.lineWidth = 2;
		context.strokeStyle = '#aaa';
		context.fillStyle = (['#f66','#66f'])[i];
		context.lineJoin = 'round';
		if (team.flag) {
			context.beginPath();
			context.arc(team.flag.x, team.flag.y, 14, 0, 2*Math.PI);
			context.fill();
			context.stroke();
		}
		if (team.spawn) {
			context.beginPath();
			context.arc(team.spawn.x, team.spawn.y, 6, 0, 2*Math.PI);
			context.fill();
			context.stroke();
		}
		if (team.pad) {
			context.beginPath();
			context.rect(team.pad.x - team.pad.hwidth, team.pad.y - team.pad.hheight, team.pad.hwidth*2, team.pad.hheight*2);
			context.fill();
			context.stroke();
		}
	}


	//preview rectangle and cursor

	if (mouse_pressed && (toolbar.wall.checked || toolbar.team_pad.checked)) {
		var x = snap(mouse.x, config.grid);
		var y = snap(mouse.y, config.grid);

		var rect = {x: (mouse_click.x + x) / 2, y: (mouse_click.y + y) / 2, hwidth: Math.abs((mouse_click.x - x) / 2), hheight: Math.abs((mouse_click.y - y) / 2)};

		context.strokeStyle = '#f52';
		context.fillStyle = 'rgba(255, 255, 255, 0.5)';

		context.beginPath();
		context.rect(rect.x - rect.hwidth, rect.y - rect.hheight, rect.hwidth*2, rect.hheight*2);
		context.fill();
		context.stroke();
	} else if (mouse_pressed) { 

	}else if (toolbar.erase_wall.checked) {
		//draw cursor in middle of grid lines
		var x = snap_center(mouse.x, config.grid);
		var y = snap_center(mouse.y, config.grid);
		var cursor_size = config.grid;
		context.lineWidth = 2 / camera.scale;
		context.strokeStyle = 'rgba(255, 127, 127, 0.8)';
		context.fillStyle = 'rgba(255, 127, 127, 0.5)';
		context.beginPath();
		context.rect(x - cursor_size / 2, y - cursor_size / 2, cursor_size, cursor_size);
		context.fill();
		context.stroke();
	} else {
		//draws cursor on grid
		var x = snap(mouse.x, config.grid);
		var y = snap(mouse.y, config.grid);
		var cursor_size = 16 / camera.scale;
		context.lineWidth = 2 / camera.scale;
		context.strokeStyle = 'rgba(102, 187, 255, 0.5)';
		context.fillStyle = 'rgba(102, 187, 255, 0.5)';
		context.beginPath();
		context.rect(x - cursor_size / 2, y - cursor_size / 2, cursor_size, cursor_size);
		context.fill();
		context.stroke();
	}
}

function world_coord(mouse_x, mouse_y) {
	return {x:(mouse_x - canvas.width / 2) / camera.scale - camera.x, y:(mouse_y - canvas.height / 2) / camera.scale - camera.y};
}

function snap(n, interval) {
	return Math.floor((n / interval) + 0.5) * interval;
}

function snap_center(n, interval) {
	return (0.5 + Math.floor(n / interval)) * interval;
}

window.onload = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	draw();
};

window.onresize = window.onload;

function load(map_in) {

	config.width = map_in.size.width;
	config.height = map_in.size.height;
	config.major = map_in.size.grid;

	map = {
		teams: map_in.teams,
		rects: map_in.rectangles,
		flags: map_in.flags,
		polys: map_in.polys
	};

}
