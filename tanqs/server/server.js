
function TanqServer(http, game) {

	this.game = game;

	this.setup_socket(http);

}
module.exports = TanqServer;

TanqServer.prototype.setup_socket = function(http) {

	this.io = require('socket.io')(http);

	this.io.on('connection', this.on_connection.bind(this));

};

TanqServer.prototype.on_connection = function(socket) {

	console.log("Someone connected!");

	this.send_server_info(socket);

	// bind other socket events

	socket.on('disconnect', this.on_disconnect.bind(this, socket));

	socket.on('login', this.on_login.bind(this, socket));
	socket.on('input', this.on_input.bind(this, socket));

};

TanqServer.prototype.on_disconnect = function(socket) {

	console.log("Someone disconnected!");

	this.game.remove_player(socket.id);

};

TanqServer.prototype.on_login = function(socket, msg) {

	var name = msg.name;

	if (name) {

		if (this.game.add_player(name, socket)) {
			console.log(name + " logged in!");
		} else {
			console.log(name + " tried to log in, but the server is full.");
		}

	}

};

TanqServer.prototype.on_input = function(socket, msg) {
	var input = {
		steer_target: {x: msg.sx || 0, y: msg.sy || 0},
		shoot: msg.shoot || false,
		drop: msg.drop || false
	};
	this.game.set_player_input(socket.id, input);
};

TanqServer.prototype.send_server_info = function(socket) {

	var msg = {
		config: this.game.config,
		map: this.game.world.map
	};

	socket.emit('server_info', msg);

};

TanqServer.prototype.send_update = function(players, snapshot) {

	var msg = {
		players: players,
		snapshot: snapshot
	};

	this.io.emit('update', msg);
};

TanqServer.prototype.send_join = function(player) {

	var msg = {
		name: player.name,
		tank_id: player.tank_id
	};

	player.socket.emit('join', msg);

};