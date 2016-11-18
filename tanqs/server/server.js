
var World = require('./world.js');

var GameServer = function(http, map_path) {

	// Configuration

	this.ms_frame = 20; // Simulation tick rate
	this.frames_update = 3; // Every n ticks, update the clients
	this.frame = 0;

	this.server_config = {ms_frame: this.ms_frame, frames_update: this.frames_update};

	var map = require(map_path);

	// Initialize the server

	this.io = require('socket.io')(http);

	this.world = new World();
	this.world.server = this;
	this.world.parse_map(map);
	
	this.clients = {};

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

GameServer.prototype.setup_socket_events = function(socket) {

	this.on_connection(socket);
	socket.on('disconnect', this.on_disconnect.bind(this, socket));
	socket.on('login', this.on_login.bind(this, socket));
	socket.on('respawn', this.on_respawn.bind(this, socket));
	socket.on('input', this.on_input.bind(this, socket));
	socket.on('shoot', this.on_shoot.bind(this, socket));
	socket.on('drop_flag', this.on_drop_flag.bind(this, socket));
	socket.on('chat', this.on_chat.bind(this, socket));

};

GameServer.prototype.add_client = function(socket) {
	var client = {id: socket.id, socket: socket, tank_id: -1, name: '', state: 'pre-login',
	 stats: {kills: 0, deaths: 0}};
	this.clients[socket.id] = client;
};

GameServer.prototype.remove_client = function(socket_id) {
	if (this.clients[socket_id]) {
		delete this.clients[socket_id];
	}
};

GameServer.prototype.player_kill = function(killer_id, killed_id) {
	var killer_tank = this.world.tanks[killer_id];
	var killed_tank = this.world.tanks[killed_id];

	killed_tank.killed_by = killer_id;

	killer_tank.client.stats.kills++;
	killed_tank.client.stats.deaths++;
	this.frame_events.deaths.push(killed_id);

	var verb = killer_tank.flag.kill_verb;//(["blew up", "destroyed", "obliterated", "rekt"])[Math.floor(Math.random() * 4)];
	var chat_msg = "&gt&gt <i> <span style=\"color:" + killer_tank.color + "\">" + killer_tank.client.name + "</span> " + verb + 
	" <span style=\"color:" + killed_tank.color + "\">" + killed_tank.client.name + "</span>. </i>";

	this.send_chat(chat_msg);

};

GameServer.prototype.flag_capture = function(tank_id, team) {
	var tank = this.world.tanks[tank_id];
	var team_name = (["red", "blue"])[team];
	var team_color = (['#e04945', '#2374cf'])[team];

	var chat_msg = "&gt&gt <i> <span style=\"color:" + tank.color + "\">" + tank.client.name + "</span> CAPTURED the <span style=\"color:" + 
	team_color + "\">" + team_name + " flag</span>!</i>";

	this.send_chat(chat_msg);
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

GameServer.prototype.send_who = function() {
	var msg = {clients: [], teams: []};
	for (var id in this.clients) {
		var client = this.clients[id];
		if (client.state == 'logged') {
			var client_msg = {name: client.name, tank_id: client.tank_id, stats: client.stats};
			msg.clients.push(client_msg);
		}
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
		var tank_data = {id: i, alive: tank.alive, rad: tank.rad};
		if (tank.alive) {
			tank_data.pos = {x: tank.pos.x, y: tank.pos.y};
			tank_data.dir = tank.dir;
			tank_data.reload = tank.reload;
			tank_data.reload_ticks = tank.reload_ticks;
			tank_data.flag = tank.flag.name;
			tank_data.flag_team = tank.flag_team;
			tank_data.team = tank.team;
		} else {
			tank_data.killed_by = tank.killed_by;
		}
		if (tank.reserved) {
			tank_data.name = tank.client.name; // Send even if dead so that leaderboards are not messed up
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
			var bullet_msg = {id: i, alive: true, new: bullet.new,
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
		/*if (bullet.just_died) {
			bullet.just_died = false;
			msg.push({id: i, alive: false});
			continue;
		}
		if (bullet.need_update) {
			bullet.need_update = false;
			msg.push({id: i, alive: true, tank: bullet.tank, x: bullet.pos.x, y: bullet.pos.y, vx: bullet.vel.x, vy: bullet.vel.y, rad: bullet.rad});
		}*/
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

	var user_string = socket.handshake.headers['user-agent'] + socket.handshake.address;
	console.log(user_string);

	this.add_client(socket);
	this.send_server(socket);
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
	client.name = msg.name;

	if (client.name == "") {
		client.name = "Anon";
	}
	if (client.name.length > 20) {
		client.name = client.name.substring(0, 23) + "...";
	}

	client.state = 'logged';
	client.tank_id = this.world.reserve_tank(client);
	if (client.tank_id > -1) {
		console.log("A client logged in.");
		this.world.spawn_tank(client.tank_id);
		this.send_join(socket, client.tank_id, client.name);

		var color = this.world.tanks[client.tank_id].color;
		this.send_chat("&gt&gt <span style=\"color:" + color + "\">" + client.name + "</span> joined.");

	} else {
		console.log("A client attempted to login, but the server is full.")
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

		var text = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

		this.send_chat("<span style=\"color:" + color + "\"><b>" + name + "</b></span>: " + text);
	}

};

module.exports = GameServer;
