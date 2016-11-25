var World = require('./world.js');
var TanqServer = require('./server.js');
var Snapshot = require('./snapshot.js');

function Game(config, http) {

	this.ms_frame = config.rates.ms_frame;
	this.frames_update = config.rates.frames_update;

	this.config = config;

	this.world = new World(config);

	this.server = new TanqServer(http, this);
	this.players = [];

}
module.exports = Game;

Game.prototype.begin_loop = function() {

	setInterval( this.update.bind(this) , this.ms_frame );

};

Game.prototype.update = function() {

	this.world.update();

	if (this.world.frame % this.frames_update == 0) {
		var players = [];
		for (var id in this.players) {
			var player = this.players[id];
			players.push({name: player.name, tank: player.tank_id});
		}

		var snapshot = Snapshot.snap_world(this.world);

		this.server.send_update(players, snapshot);
	}

};

Game.prototype.add_player = function(name, socket) {

	if (this.players[socket.id]) return false;

	var tank_id = this.world.reserve_tank();

	if (tank_id > -1) {

		var player = {
			socket_id: socket.id,
			socket: socket,
			name: name,
			tank_id: tank_id
		};

		this.players[socket.id] = player;
		this.world.spawn_tank(tank_id);

		this.server.send_join(player);

		return true;
	}
	return false;

};

Game.prototype.remove_player = function(socket_id) {

	var player = this.players[socket_id];

	if (player) {

		this.world.free_tank(player.tank_id);

		delete this.players[socket_id];

	}

};

Game.prototype.set_player_input = function(socket_id, input) {

	var player = this.players[socket_id];

	if (player) {
		var tank_input = this.world.tanks[player.tank_id].input;
		tank_input.steer_target.set(input.steer_target);
		tank_input.shoot = input.shoot;
		tank_input.drop = input.drop;
	}

};