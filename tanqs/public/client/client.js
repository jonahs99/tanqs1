function Client(game) {

	this.game = game;

	this.socket = io();

	this.setup_socket_events();

}

// Sends

var login_time = 0;

Client.prototype.send_login = function(name) {

	var msg = {name: name};

	login_time = Date.now();
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

Client.prototype.send_drop_flag = function() {
	this.socket.emit('drop_flag', {});
};

Client.prototype.send_chat = function(text) {
	console.log("Sending chat: " + text);
	this.socket.emit('chat', {text: text});
};

// Events

Client.prototype.setup_socket_events = function() {

	this.socket.on('connect', this.on_connect.bind(this));
	this.socket.on('server', this.on_server.bind(this));
	this.socket.on('disconnect', this.on_disconnect.bind(this));
	this.socket.on('join', this.on_join.bind(this));
	this.socket.on('refuse', this.on_refuse.bind(this));
	this.socket.on('update', this.on_update.bind(this));
	this.socket.on('who', this.on_who.bind(this));
	this.socket.on('chat', this.on_chat.bind(this));
	this.socket.on('kick', this.on_kick.bind(this));

};

Client.prototype.on_connect = function() {
	console.log("Connected to server.");
	this.game.change_state(GameState.LOGIN);
	
	ga('send', {
	  hitType: 'event',
	  eventCategory: 'Game',
	  eventAction: 'connect',
	});
	
};

Client.prototype.on_server = function(msg) {
	console.log("Received server info.");
	this.game.time_step = msg.config.ms_frame * msg.config.frames_update;
	this.game.world.map = msg.map;
	this.game.begin_simulation();
};

Client.prototype.on_refuse = function(msg) {
	console.log("Server refused socket connection.");
	this.game.change_state(GameState.REFUSED);
};

Client.prototype.on_disconnect = function() {

	console.log("Disconnected from server.");
	this.game.change_state(GameState.DISCONNECTED);
	
	ga('send', {
	  hitType: 'event',
	  eventCategory: 'Game',
	  eventAction: 'disconnect',
	});
	
};

Client.prototype.on_join = function(msg) {

	console.log("Joined server as " + msg.name + ".");
	console.log("Ping " + (Date.now() - login_time) + " ms");
	this.game.set_player(msg.id);
	this.game.change_state(GameState.GAME);
	
	ga('send', {
	  hitType: 'event',
	  eventCategory: 'Game',
	  eventAction: 'join',
	});
	
};

Client.prototype.on_update = function(msg) {

	//console.log(Date.now() - this.game.last_update_time);
	this.game.last_update_time = Date.now(); // Used for interpolation
	this.game.world.server_update_tanks(msg.tanks);
	this.game.world.server_update_bullets(msg.bullets);
	this.game.world.server_update_flags(msg.flags);
	//this.game.world.add_bullets(msg.bullets);

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
	this.game.leaderboard = msg.clients;
	this.game.leaderboard.sort(function(a, b) {
		return (a.stats.deaths + b.stats.kills - a.stats.kills - b.stats.deaths);
	});

	this.game.team_leaderboard = msg.teams;
	this.game.team_leaderboard.sort(function(a, b) {
		return (b.score - a.score);
	});
};

Client.prototype.on_chat = function(msg) {
	this.game.add_chat_message("<br>" + msg.text);
};

Client.prototype.on_kick = function(msg) {
	location.reload(true);
};
