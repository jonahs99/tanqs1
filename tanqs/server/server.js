
var World = require('./world.js');

var GameServer = function(http, config) {

	// Configuration

	this.ms_frame = 20; // Simulation tick rate
	this.frames_update = 3; // Every n ticks, update the clients
	this.frame = 0;

	this.config = config
	this.server_config = {ms_frame: this.ms_frame, frames_update: this.frames_update, game_type: 'ctf'};

	var map_path = config.map;
	if (map_path instanceof Array) {
		map_path = map_path[ Math.floor(Math.random() * map_path.length) ];
	}
	var map = require(map_path);

	// Initialize the server

	this.io = require('socket.io')(http);

	this.world = new World();
	this.world.server = this;
	this.world.parse_map(map);
	
	this.clients = {};
	this.topten = [];
	this.frame_input = {shots:[], drops:[]};
	this.frame_events = {deaths:[]};

	this.io.on('connection', this.setup_socket_events.bind(this));

};

GameServer.prototype.begin = function() {
	setInterval(function() {
		this.update_world();
		if (this.frame % this.frames_update == 0) {
			this.update_clients();
		}
		if (this.frame % 20 == 0) {
			this.send_who();
		}
		this.frame++;
	}.bind(this), this.ms_frame);
};

GameServer.prototype.update_world = function(socket) {
	this.world.update();
};

GameServer.prototype.update_topten = function() {
	for (var j = 0; j < this.topten.length; j++) {
		this.topten[j].index = j;
	}
	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.reserved && !tank.ai) {
			var score = this.score_formula(tank.client);
			var done = false;
			for (var j = 0; j < this.topten.length; j++) {
				var top = this.topten[j];
				if (tank.client.id == top.id) {
					var done = true;
					if (score > top.score)
						top.score = score;
					break;
				}
			}
			if (!done) {
				this.topten.push({name: tank.client.name, color: tank.color , score: score, id: tank.client.id});
			}
		}
	}
	this.topten.sort(function(x, y) {
		return y.score - x.score || x.index - y.index;
	});
	if (this.topten.length > 10) {
		this.topten = this.topten.slice(0, 10);
	}
};

GameServer.prototype.setup_socket_events = function(socket) {

	this.on_connection(socket);
	socket.on('disconnect', this.on_disconnect.bind(this, socket));
	socket.on('login', this.on_login.bind(this, socket));
	socket.on('inactive', this.on_inactive.bind(this, socket));
	socket.on('reactive', this.on_reactive.bind(this, socket));
	socket.on('respawn', this.on_respawn.bind(this, socket));
	socket.on('input', this.on_input.bind(this, socket));
	socket.on('shoot', this.on_shoot.bind(this, socket));
	socket.on('drop_flag', this.on_drop_flag.bind(this, socket));
	socket.on('chat', this.on_chat.bind(this, socket));

};

GameServer.prototype.add_client = function(socket, user_string) {
	var client = {
		id: socket.id,
		socket: socket,
		user: user_string,
		tank_id: -1,
		name: '',
		state: 'pre-login',
		stats: {	kills: 0,
				deaths: 0,
				death_record: 0,
				points: 0
		}
	};

	/*for (var id in this.clients) {
		if (this.clients[id].user == user_string) {
			console.log("Tried to connect again.");
			return false;
		}
	}*/

	this.clients[socket.id] = client;
	return true;
};

GameServer.prototype.remove_client = function(socket_id) {
	if (this.clients[socket_id]) {
		delete this.clients[socket_id];
	}
};

GameServer.prototype.player_kill = function(killer_id, killed_id, bullet) {
	var killer_tank = this.world.tanks[killer_id];
	var killed_tank = this.world.tanks[killed_id];

	killed_tank.killed_by = killer_id;

	this.frame_events.deaths.push(killed_id);

	if (killer_tank.ai && killed_tank.ai) {
		return;
	} else if (killer_tank.ai) {
		killed_tank.client.stats.deaths++;
	} else if (killed_tank.ai) {
		killer_tank.client.stats.kills++;

		var point_award = 4; // TODO: double kill, multipliers etc.

		killer_tank.client.stats.points += point_award;
		this.send_kill(killer_tank.client.socket, killed_id, "+" + point_award);
	} else {
		killer_tank.client.stats.kills++;
		killed_tank.client.stats.deaths++;
		
		killer_tank.client.stats.death_record *= 0.8;
		killed_tank.client.stats.death_record *= 0.8;
		killed_tank.client.stats.death_record++;

		var verb = killer_tank.flag.kill_verb;//(["blew up", "destroyed", "obliterated", "rekt"])[Math.floor(Math.random() * 4)];
		var chat_msg = "&gt&gt <i> <span style=\"color:" + killer_tank.color + "\">" + killer_tank.client.name + "</span> " + verb + 
		" <span style=\"color:" + killed_tank.color + "\">" + killed_tank.client.name + "</span>. </i>";

		this.send_chat(chat_msg);

		// SCORE UPDATE

		var flag_type = bullet? bullet.flag.name : null;

		var point_award = 10; // Base points for a regular kill
		var special_text = "";
		if (flag_type == "default") {point_award += 5; special_text+=" (flagless kill!)";}
		if (killed_tank.flag_team > -1) {point_award += 10; special_text+=" (carrier kill!)";}
		if (killer_tank.flag_team > -1) {point_award += 15; special_text+=" (flag kill!)";}

		var kill_time = 1000; // ms for a double kill, x2 for triple
		if (killer_tank.kill_timer < (kill_time / this.ms_frame) * killer_tank.kill_count) {
			point_award += 10 * killer_tank.kill_count;
			killer_tank.kill_count++;
			if (killer_tank.kill_count == 2) {
				special_text += " (double kill!)";
			} else if (killer_tank.kill_count == 3) {
				special_text += " (triple kill!)";
			} else if (killer_tank.kill_count == 4) {
				special_text += " (quad kill!)";
			} else if (killer_tank.kill_count == 5) {
				special_text += " (penta kill!)";
			} else {
				special_text += " (multi kill!)";
			}
		} else {
			killer_tank.kill_count = 1;
		}
		killer_tank.kill_timer = 0;

		killer_tank.client.stats.points += point_award;
		this.send_kill(killer_tank.client.socket, killed_id, "+" + point_award + special_text);
	}

};

GameServer.prototype.flag_capture = function(tank_id, team, team_size) {
	var tank = this.world.tanks[tank_id];
	var team_name = (["red", "blue"])[team];
	var team_color = (['#e04945', '#2374cf'])[team];

	var chat_msg = "&gt&gt <i> <span style=\"color:" + tank.color + "\">" + tank.client.name + "</span> CAPTURED the <span style=\"color:" + 
	team_color + "\">" + team_name + " flag</span>!</i>";

	this.send_chat(chat_msg);

	var point_award = 10 + 10 * team_size;
	var special_text = " (CAPTURE!)";
	tank.client.stats.points += point_award;

	this.send_kill(tank.client.socket, tank_id, "+" + point_award + special_text);
};

GameServer.prototype.player_flag_pickup = function(tank_id) {

	/*var tank = this.world.tanks[tank_id];

	var chat_msg = "<i> <span style=\"color:" + tank.color + "\">" + tank.client.name + "</span> picked up " + tank.flag.name + ".</i>";

	this.send_chat(chat_msg);*/
	var tank = this.world.tanks[tank_id];
	if (tank.flag_team > -1 && tank.flag_team != tank.team) {
		var team_name = (["red", "blue"])[tank.flag_id];
		var team_color = (['#e04945', '#2374cf'])[tank.flag_id];

		var chat_msg = "&gt&gt <i> <span style=\"color:" + tank.color + "\">" + tank.client.name + "</span> has the <span style=\"color:" + 
		team_color + "\">" + team_name + " flag</span>!</i>";

		this.send_chat(chat_msg);
	}
};

GameServer.prototype.player_flag_drop = function(tank_id) {

	/*var tank = this.world.tanks[tank_id];

	var chat_msg = "<i> <span style=\"color:" + tank.color + "\">" + tank.client.name + "</span> dropped " + tank.flag.name + ".</i>";

	this.send_chat(chat_msg);*/

};

// Sends

GameServer.prototype.send_server = function(socket) {
	var msg = {config: this.server_config, map: this.world.map};
	socket.emit('server', msg);
};

GameServer.prototype.send_refuse = function(socket) {
	socket.emit('refuse', {});
};

GameServer.prototype.score_formula = function(client) {
	//var crossover = 5;
	//return Math.round(crossover * client.stats.points / (client.stats.death_record + crossover));
	return client.stats.points - (client.stats.deaths * 10);
};

GameServer.prototype.send_who = function() {
	//this.update_topten();

	var d = new Date();
	var msg = {time: {m: 20 - (d.getMinutes() % 20) - (d.getSeconds() == 0 ? 0 : 1), s: 60 - d.getSeconds()} ,
		   clients: [], teams: [], connected: 0};
	for (var id in this.clients) {
		var client = this.clients[id];
		if (client.state == 'logged') {
			var client_msg = {
				name: client.name, tank_id: client.tank_id,
				score: this.score_formula(client),
				stats: {kills: client.stats.kills, deaths: client.stats.deaths}
			};
			msg.clients.push(client_msg);
		}
		msg.connected++;
	}
	for (var i = 0; i < this.world.teams.length; i++) {
		var team = this.world.teams[i];
		msg.teams.push({id: i, name: team.name, score: team.score});
	}
	this.io.emit('who', msg);
};

GameServer.prototype.send_join = function(socket, player_id, name) {
	var msg = {id: player_id, name: name};
	socket.emit('join', msg);
};

GameServer.prototype.send_chat = function(text) {
	this.io.emit('chat', {text: text});
};

GameServer.prototype.send_kill = function(socket, killed_id, text) {
	socket.emit('kill', {id: killed_id, text: text});
}

GameServer.prototype.send_kick = function(socket_id) {
	var client = this.clients[socket_id];
	if (client) {
		if (client.socket) {
			client.socket.emit('kick',{});
		}
	}
};

GameServer.prototype.update_clients = function() {
	var msg = {
		tanks: this.tank_update_msg(), 
		bullets: this.bullet_update_msg(),
		flags: this.flag_update_msg()
	};
	this.io.emit('update', msg);
};

GameServer.prototype.tank_update_msg = function() {
	var msg = [];
	for (var i = 0; i < this.world.n_tanks; i++) {
		var tank = this.world.tanks[i];
		var tank_data = {id: i, ai: tank.ai, alive: tank.alive, rad: tank.rad};
		if (tank.alive) {
			tank_data.new = tank.new; tank.new = false;
			tank_data.pos = {x: tank.pos.x, y: tank.pos.y};
			tank_data.dir = tank.dir;
			tank_data.reload = tank.reload;
			tank_data.reload_ticks = tank.reload_ticks;
			tank_data.flag = tank.flag.name;
			tank_data.flag_team = tank.flag_team;
			tank_data.team = tank.team;
			if (tank.spawn_timer < 125) {
				tank_data.inv = true;
			}
		} else {
			tank_data.killed_by = tank.killed_by;
		}
		if (tank.reserved) {
			tank_data.name = tank.ai ? "" : tank.client.name; // Send even if dead so that leaderboards are not messed up
			tank_data.color = tank.color;
		}
		msg.push(tank_data);
	}
	return msg;
};

GameServer.prototype.bullet_update_msg = function() {
	var msg = [];

	for (var i = 0; i < this.frame_input.shots.length; i++) {
		this.world.shoot(this.frame_input.shots[i]);
	}
	this.frame_input.shots = [];

	for (var i = 0; i < this.world.n_bullets; i++) {
		var bullet = this.world.bullets[i];
		if (bullet.alive) {
			var bullet_msg = {id: i, type: bullet.type, alive: true, new: bullet.new,
				x: bullet.pos.x, y: bullet.pos.y, tank: bullet.tank,
				rad: bullet.rad};
			if (bullet.guided) {
				bullet_msg.guided = true;
			}
			msg.push(bullet_msg);
		} else {
			msg.push({id: i, alive: false});
		}
		bullet.new = false;
	}

	return msg;
};

GameServer.prototype.flag_update_msg = function() {

	var msg = [];

	for (var i = 0; i < this.frame_input.drops.length; i++) {
		this.world.drop_flag(this.frame_input.drops[i]);
	}
	this.frame_input.drops = [];

	for (var i = 0; i < this.world.flags.length; i++) {
		var flag = this.world.flags[i];
		var flag_data = {id: i, alive: flag.alive}
		if (flag.alive) {
			flag_data.x = flag.pos.x;
			flag_data.y = flag.pos.y;
			flag_data.rad = flag.rad;
			flag_data.team = flag.team;
		}
		msg.push(flag_data);
	}

	return msg;

}

// Events

GameServer.prototype.on_connection = function(socket) {

	// Identifier to stop multi-boxing
	var user_string = socket.handshake.headers['user-agent'] + socket.handshake.address;
	console.log(user_string);

	if (this.add_client(socket, user_string)) {
		this.send_server(socket);
	} else {
		this.send_refuse(socket);
	}
};

GameServer.prototype.on_disconnect = function(socket) {
	console.log("A client disconnected.");

	var client = this.clients[socket.id];

	if (!client) return;
	
	console.log(client.tank_id);

	if (client.state == 'pre-login' || client.tank_id < 0) {

	} else {
		this.world.kill_tank(client.tank_id);
		this.world.free_tank(client.tank_id);

		var color = this.world.tanks[client.tank_id].color;
		this.send_chat("&gt&gt <span style=\"color:" + color + "\">" + client.name + "</span> left.");
	}
	this.remove_client(socket.id);

	var reset_score = true;
	for (var id in this.clients) {
		var client = this.clients[id];
		if (client.state == 'logged') {
			reset_score = false;
			break;
		}
	}
	if (reset_score) {
		for (var i = 0; i < this.world.teams.length; i++) {
			this.world.teams[i].score = 0;
		}
	}
};

GameServer.prototype.on_login = function(socket, msg) {

	var client = this.clients[socket.id];
	
	if(!client) return;
	if (client.state != 'pre-login') return;
	
	client.name = msg.name;

	if (client.name == "") {
		client.name = "Anon";
	}
	if (client.name.length > 20) {
		client.name = client.name.substring(0, 20) + "...";
	}

	client.tank_id = this.world.reserve_tank(client);
	if (client.tank_id > -1) {
		console.log("A client logged in.");
		client.state = 'logged';
		this.world.spawn_tank(client.tank_id);
		this.send_join(socket, client.tank_id, client.name);

		var color = this.world.tanks[client.tank_id].color;
		this.send_chat("&gt&gt <span style=\"color:" + color + "\">" + client.name + "</span> joined.");

	} else {
		console.log("A client attempted to login, but the server is full.")
		// TODO: What happens on the client side?
	}

};

GameServer.prototype.on_inactive = function(socket, msg) {
	// Kill the tank but save the stats
	var client = this.clients[socket.id];
	if (!client) return;
	if (client.state != "logged") return;

	client.state = "inactive";

	this.world.kill_tank(client.tank_id);
	this.world.free_tank(client.tank_id);

	var color = this.world.tanks[client.tank_id].color;
	this.send_chat("&gt&gt <span style=\"color:" + color + "\">" + client.name + "</span> is inactive.");

};

GameServer.prototype.on_reactive = function(socket, msg) {
	// Revive the tank with the same stats

	var client = this.clients[socket.id];
	if (!client) return;
	if (client.state != "inactive") return;

	client.tank_id = this.world.reserve_tank(client);
	if (client.tank_id > -1) {
		console.log("A client reactivated.");
		client.state = 'logged';
		this.world.spawn_tank(client.tank_id);
		this.send_join(socket, client.tank_id, client.name);

		var color = this.world.tanks[client.tank_id].color;
		this.send_chat("&gt&gt <span style=\"color:" + color + "\">" + client.name + "</span> is back.");

	} else {
		console.log("A client attempted to reactivate, but the server is full.")
		// TODO: What happens on the client side?
	}

};

GameServer.prototype.on_respawn = function(socket, msg) {
	var client = this.clients[socket.id];
	if (client) {
		if (client.state == 'logged') {
			this.world.spawn_tank(client.tank_id);
		}
	}
};

GameServer.prototype.on_input = function(socket, msg) {

	var tank_id = this.clients[socket.id].tank_id;
	if (tank_id > -1) {
		var client_tank = this.world.tanks[tank_id];
		client_tank.steer_target.set_xy(msg.x, msg.y);
	}

};

GameServer.prototype.on_shoot = function(socket, msg) {

	var tank_id = this.clients[socket.id].tank_id;
	if (tank_id > -1) {
		this.frame_input.shots.push(tank_id);
	}

};

GameServer.prototype.on_drop_flag = function(socket, msg) {

	var tank_id = this.clients[socket.id].tank_id;
	if (tank_id > -1) {
		this.frame_input.drops.push(tank_id);
	}

};

GameServer.prototype.on_chat = function(socket, msg) {

	var client = this.clients[socket.id];
	if (client.tank_id > -1) {
		var name = this.clients[socket.id].name;
		var color = this.world.tanks[client.tank_id].color;

		if (msg.text.startsWith("/")) {
			this.command(this.world.tanks[client.tank_id], msg.text)
			return;
		}

		var text = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		if (text.length > 40) {
			text = text.substring(0, 40);
		}

		this.send_chat("<span style=\"color:" + color + "\"><b>" + name + "</b></span>: " + text);
	}

};

GameServer.prototype.command = function(tank, command) {
	if (command.startsWith('/' + this.config.password)) {
		var args = command.split(' ')
		if (args.length > 1) {
			switch (args[1]) {
				case 'flag':
					if (args.length == 3) {
						if (tank.flag_id > -1) {
							if (args[2] in this.world.flag_types) {
								tank.set_flag(this.world.flag_types[args[2]]);
							}
						}
					}
					break;
				default:
					break;
			}
		}
	}
}

module.exports = GameServer;
