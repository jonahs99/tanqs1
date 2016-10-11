function Client(game) {

	this.game = game;

	this.socket = io();

	this.setup_socket_events();

}

// Sends

var login_time = 0;

Client.prototype.send_login = function(name) {

	var msg = {name: name};

	login_time = (new Date()).getTime();
	this.socket.emit('login', msg);

};

Client.prototype.send_respawn = function() {
	this.socket.emit('respawn', {});
}

Client.prototype.send_input = function() {
	if (this.game.player_tank.steer_target) {
		var msg = {x: this.game.player_tank.steer_target.x, y: this.game.player_tank.steer_target.y};
		this.socket.emit('input', msg);
	}
};

Client.prototype.send_shoot = function() {
	this.socket.emit('shoot', {});
};

// Events

Client.prototype.setup_socket_events = function() {

	this.socket.on('connect', this.on_connect.bind(this));
	this.socket.on('server', this.on_server.bind(this));
	this.socket.on('disconnect', this.on_disconnect.bind(this));
	this.socket.on('join', this.on_join.bind(this));
	this.socket.on('update', this.on_update.bind(this));
	this.socket.on('who', this.on_who.bind(this));

};

Client.prototype.on_connect = function() {
	console.log("Connected to server.");
	this.game.change_state(GameState.LOGIN);
};

Client.prototype.on_server = function(msg) {
	console.log("recieved server config");
	this.game.time_step = msg.ms_frame * msg.frames_update;
	this.game.begin_simulation();
};

Client.prototype.on_disconnect = function() {

	console.log("Disconnected from server.");
	this.game.change_state(GameState.DISCONNECTED);
	
};

Client.prototype.on_join = function(msg) {

	console.log("Joined server as " + msg.name + ".");
	console.log("Ping " + ((new Date()).getTime() - login_time) + " ms");
	this.game.set_player(msg.id);
	this.game.change_state(GameState.GAME);
	
};

Client.prototype.on_update = function(msg) {

	this.game.last_update_time = (new Date()).getTime(); // Used for interpolation
	this.game.world.update_tanks(msg.tanks);
	this.game.world.add_bullets(msg.bullets);

	if (this.game.state == GameState.GAME) {
		if (!this.game.player_tank.alive) {
			this.game.player_died();
		}
	} else if (this.game.state == GameState.RESPAWN) {
		if (this.game.player_tank.alive) {
			this.game.change_state(GameState.GAME);
		}
	}

};

Client.prototype.on_who = function(msg) {
	this.game.leaderboard = msg;
	this.game.leaderboard.sort(function(a, b) {
		return (a.stats.deaths + b.stats.kills - a.stats.kills - b.stats.deaths);
	});
};