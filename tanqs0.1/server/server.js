
var World = require('./world.js');

var GameServer = function(http) {

	// Configuration

	this.ms_frame = 20; // Simulation tick rate
	this.frames_update = 3; // Every n ticks, update the clients
	this.frame = 0;

	this.server_config = {ms_frame: this.ms_frame, frames_update: this.frames_update};

	// Initialize the server

	this.io = require('socket.io')(http);

	this.world = new World();
	this.world.server = this;
	this.clients = {};

	this.frame_input = {shots:[]};
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

};

GameServer.prototype.add_client = function(socket_id) {
	var client = {id: socket_id, tank_id: -1, name: '', state: 'pre-login',
	 stats: {kills: 0, deaths: 0}};
	this.clients[socket_id] = client;
};

GameServer.prototype.remove_client = function(socket_id) {
	if (this.clients[socket_id]) {
		delete this.clients[socket_id];
	}
};

GameServer.prototype.player_kill = function(killer_id, killed_id) {
	var killer_tank = this.world.tanks[killer_id];
	var killed_tank = this.world.tanks[killed_id];
	killer_tank.client.stats.kills++;
	killed_tank.client.stats.deaths++;
	this.frame_events.deaths.push(killed_id);
};

// Sends

GameServer.prototype.send_server = function(socket) {
	socket.emit('server', this.server_config);
};

GameServer.prototype.send_who = function() {
	var msg = [];
	for (var id in this.clients) {
		var client = this.clients[id];
		if (client.state == 'logged') {
			var client_msg = {name: client.name, stats: client.stats};
			msg.push(client_msg);
		}
	}
	this.io.emit('who', msg);
};

GameServer.prototype.send_join = function(socket, player_id, name) {
	var msg = {id: player_id, name: name};
	socket.emit('join', msg);
};

GameServer.prototype.update_clients = function() {
	var msg = {tanks: this.tank_update_msg(), bullets: this.bullet_update_msg()};
	this.io.emit('update', msg);
};

GameServer.prototype.tank_update_msg = function() {
	var msg = [];
	for (var i = 0; i < this.world.n_tanks; i++) {
		var tank = this.world.tanks[i];
		var tank_data = {id: i, alive: tank.alive, rad: tank.rad};
		if (tank.alive) {
			tank_data.name = tank.client.name;
			tank_data.pos = {x: tank.pos.x, y: tank.pos.y};
			tank_data.dir = tank.dir;
			tank_data.reload = tank.reload;
			tank_data.reload_ticks = tank.reload_ticks;
		}
		msg.push(tank_data);
	}
	return msg;
};

GameServer.prototype.bullet_update_msg = function() {
	var msg = [];

	for (var i = 0; i < this.frame_input.shots.length; i++) {
		var bullet_id = this.world.shoot(this.frame_input.shots[i]);
		if (bullet_id > -1) {
			var bullet = this.world.bullets[bullet_id];
			msg.push({id: bullet_id, alive: true, tank: this.frame_input.shots[i], x: bullet.pos.x, y: bullet.pos.y, vx: bullet.vel.x, vy: bullet.vel.y, rad: bullet.rad});
		} 
	}
	this.frame_input.shots = [];

	for (var i = 0; i < 72; i++) {
		var bullet = this.world.bullets[i];
		if (bullet.just_died) {
			bullet.just_died = false;
			msg.push({id: i, alive: false});
		}
	}

	return msg;
};

// Events

GameServer.prototype.on_connection = function(socket) {
	this.add_client(socket.id);
	this.send_server(socket);
};

GameServer.prototype.on_disconnect = function(socket) {
	console.log("A client disconnected.");

	var client = this.clients[socket.id];
	if (client.state == 'pre-login') {

	} else {
		this.world.free_tank(client.tank_id);
	}
	this.remove_client(socket.id);
};

GameServer.prototype.on_login = function(socket, msg) {
	var client = this.clients[socket.id];
	client.name = msg.name; // TODO: Filter name for length/empty/symbols/words
	client.state = 'logged';
	client.tank_id = this.world.reserve_tank(client);
	if (client.tank_id > -1) {
		console.log("A client logged in.");
		this.world.spawn_tank(client.tank_id);
		this.send_join(socket, client.tank_id, client.name);
	} else {
		console.log("A client attempted to login, but the server is full.")
		// TODO: What happens on the client side?
	}
};

GameServer.prototype.on_respawn = function(socket, msg) {
	var client = this.clients[socket.id];
	if (client.state == 'logged') {
		this.world.spawn_tank(client.tank_id);
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

module.exports = GameServer;