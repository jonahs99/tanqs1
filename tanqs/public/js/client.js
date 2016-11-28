var socket = io();
var game;

socket.on('connect', on_connect);
socket.on('server_info', on_server_info);

function on_connect() {

	if (game) {
		delete game;
	}

}

function on_server_info(msg) {

	game = new Game(msg);

	socket.on('update', game.on_server_update.bind(game));
	socket.on('join', game.on_join.bind(game));

}

function send_login(name) {
	socket.emit('login', {name: name});
}

function send_respawn() {
	socket.emit('respawn', {});
}

function send_input(input) {
	socket.emit('input', input);
}