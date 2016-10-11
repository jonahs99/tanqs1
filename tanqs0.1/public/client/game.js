
var GameState = { DISCONNECTED: 1, LOGIN: 2, GAME: 3, RESPAWN: 4 };

function Game() {

	// Game state

	this.state = GameState.DISCONNECTED;
	this.world = new World(this);

	this.last_update_time = (new Date()).getTime();

	this.player_id = null;
	this.player_tank = null;

	this.mouse = new Vec2();
	this.leaderboard = [];

	// Graphics

	this.canvas = document.getElementById('canvas');
	this.canvas.style.backgroundColor = '#222';

	this.camera = new Camera();
	this.renderer = new Renderer(this, canvas);

	this.resize_canvas();

	// Client

	this.client = new Client(this);

};

Game.prototype.change_state = function(state) {

	if (state == GameState.DISCONNECTED) {

	} else if (state == GameState.LOGIN) {

		splash_input.style.display = 'block';
		splash.style.visibility = 'visible';

		splash_text.innerHTML = "tanqs.io";
		splash_button.value = "join";

	} else if (state == GameState.GAME) {

		splash.style.visibility = 'hidden';

	} else if (state == GameState.RESPAWN) {

		splash_input.style.display = 'none';
		splash.style.visibility = 'visible';

		splash_text.innerHTML = "you got blown up ;>";
		splash_button.value = "respawn";

	}

	this.state = state;

};

Game.prototype.set_player = function(id) {

	this.player_id = id;
	this.player_tank = this.world.tanks[id];
	this.player_tank.steer_target = new Vec2();

};

Game.prototype.update = function() {

	// Update some things to keep the demo going during login
	this.world.update_bullets();

	// Handle input in the game state
	if (this.state == GameState.GAME) {
		if (this.player_tank.alive) {
			this.player_tank.steer_target.set_xy(this.mouse.x - this.canvas.width / 2, this.mouse.y - this.canvas.height / 2);
			if (this.renderer.fpv) {
				this.player_tank.steer_target.m_rotate(-this.camera.rotate);
			}
			if (this.player_tank.reload) {
				for (var i = 0; i < this.player_tank.max_bullets; i++) {
					if (this.player_tank.reload[i] < this.player_tank.reload_ticks) {
						this.player_tank.reload[i]++;
					}
				}
			}
		}
	}

};

Game.prototype.begin_simulation = function() {
	setInterval(function() {
		this.update();
		this.renderer.render_world();
	}.bind(this), 20);

	setInterval(function() {
		if (game.state == GameState.GAME && this.player_tank.alive) {
			this.client.send_input();
		}
	}.bind(this), this.time_step);
};

// Events

Game.prototype.player_died = function() {
	this.change_state(GameState.RESPAWN);
};

Game.prototype.resize_canvas = function() {
	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerHeight;
};

Game.prototype.on_mousemove = function(evt) {

	var rect = this.canvas.getBoundingClientRect();
    this.mouse.set_xy(evt.clientX - rect.left, evt.clientY - rect.top);

};

Game.prototype.on_click = function(evt) {

	this.client.send_shoot();

};

Game.prototype.on_keydown = function(evt) {
	if (evt.keyCode == 86) {
		this.renderer.fpv = !this.renderer.fpv;
	}
};


// Client stuff

var game = new Game();

// Events

window.onresize = game.resize_canvas.bind(game);
window.onmousemove = game.on_mousemove.bind(game);
window.onclick = game.on_click.bind(game);
window.onkeydown = game.on_keydown.bind(game);

var splash = document.getElementById('splash');
var splash_form = document.getElementById('splash_form');
var splash_text = document.getElementById('splash_text');
var splash_input = document.getElementById('splash_input');
var splash_button = document.getElementById('splash_button');

splash_form.onsubmit = function() {
	if (game.state == GameState.LOGIN) {
		game.client.send_login(splash_input.value);
	} else {
		game.client.send_respawn();
	}
	return false;
};
