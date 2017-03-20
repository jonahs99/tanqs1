
var GameState = { DISCONNECTED: 1, LOGIN: 2, GAME: 3, RESPAWN: 4, REFUSED: 5 };

var game_loop_interval, send_input_interval;

function Game() {

	// Game state

	this.state = GameState.DISCONNECTED;
	this.world = new World(this);
	this.particles = new Particles();
	this.textfx = new text_fx();

	this.last_update_time = (new Date()).getTime();

	this.player_id = null;
	this.player_tank = null;

	this.mouse = new Vec2();
	this.mouse_down = false;
	this.leaderboard = [];
	this.n_spectator = 0;

	// Graphics

	this.canvas = document.getElementById('canvas');
	this.canvas.style.backgroundColor = '#222';

	this.camera = new Camera();
	this.scale_value = 1;
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
		ad_container.style.opacity = 0;

		splash_text.innerHTML = "tanqs.io";
		splash_button.value = "join";

		chat_input.style.visibility = 'hidden';

	} else if (state == GameState.REFUSED) {

		splash_input.style.display = 'none';
		splash.style.visibility = 'visible';

		splash_text.innerHTML = "Sorry, you're already connected.";

		splash_button.style.visibility = "hidden";
		chat_input.style.visibility = 'hidden';

	} else if (state == GameState.GAME) {

		splash.style.visibility = 'hidden';
		ad_container.style.opacity = 0;

		chat_input.style.visibility = 'visible';

	} else if (state == GameState.RESPAWN) {

		splash_input.style.display = 'none';

		if (game.player_tank.killed_by > -1) {
			var killer = game.world.tanks[game.player_tank.killed_by];
			splash_text.innerHTML = "<span style=\"color:" + killer.color + "\">" + killer.name + "</span> rekt you ;&gt";
		} else {
			splash_text.innerHTML = "you got blown up ;>";
		}

		splash_button.value = "respawn in 3";
		splash.style.visibility = 'visible';
		splash.style.opacity = 0;
		setTimeout(function() {
			var splash_fade_interval = setInterval(function() {
				splash.style.opacity = parseFloat(splash.style.opacity) + 0.01;
				if (splash.style.opacity >= 0.6) {
					splash.style.opacity = 0.6;
					clearInterval(splash_fade_interval);
				}
			}, 50);
		}, 800);

		chat_input.style.visibility = 'visible';

		var spawn_count_interval = setInterval(function() {
			switch (splash_button.value) {
				case "respawn in 3":
					splash_button.value = "respawn in 2";
					break;
				case "respawn in 2":
					splash_button.value = "respawn in 1";
					break;
				case "respawn in 1":
					splash_button.value = "respawn";
					clearInterval(spawn_count_interval);
					break;
			}
		}, 1000);

		ad_container.style.opacity = 1;

	}

	this.state = state;

};

Game.prototype.set_player = function(id) {

	this.player_id = id;
	this.player_tank = this.world.tanks[id];
	this.player_tank.steer_target = new Vec2();

};

Game.prototype.update = function() {

	// Update some things locally
	this.world.local_update();
	this.particles.update();
	this.textfx.update();

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
	game_loop_interval = setInterval(function() {
		this.update();
		this.renderer.render_world();
	}.bind(this), 20);

	send_input_interval = setInterval(function() {
		if (game.state == GameState.GAME && this.player_tank.alive) {
			this.client.send_input();
		}
	}.bind(this), this.time_step);
};

Game.prototype.add_chat_message = function(chat) {
	var span = document.createElement('span');
	span.innerHTML = chat;
	chat_output.appendChild(span);
	chat_output.scrollTop = chat_output.scrollHeight;

	if (chat_output.childElementCount > 16) {
		chat_output.removeChild(chat_output.children[0]);
	} else {

	}

};

// Events

Game.prototype.player_died = function() {
	this.change_state(GameState.RESPAWN);
};

Game.prototype.resize_canvas = function() {
	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerHeight;
	this.scale_value = Math.max(this.canvas.width / 1280, this.canvas.height / 1024) * 0.9;
};

Game.prototype.on_mousemove = function(evt) {
	var rect = this.canvas.getBoundingClientRect();
    this.mouse.set_xy(evt.clientX - rect.left, evt.clientY - rect.top);
};

Game.prototype.on_mousedown = function(evt) {
	this.mouse_down = true;
	if (this.state == GameState.GAME) {
		if (evt.which == 3) { // Right click
			this.client.send_drop_flag();
		} else { // Left click
			this.client.send_shoot();
		}
		/*if (!shoot_repeat) {
			shoot_repeat = setInterval(function() {
				game.on_mousedown(evt);
			}, 300);
		}*/
	}
};
Game.prototype.on_mouseup = function(evt) {
	this.mouse_down = false;
	//clearInterval(shoot_repeat);
	//shoot_repeat = null;
};

Game.prototype.on_keydown = function(evt) {
	if (evt.keyCode == 86) {
		//this.renderer.fpv = !this.renderer.fpv;
	} else if (evt.keyCode == 27) {
		if (document.title != "tanqs.io") window.open("https://en.wikipedia.org/wiki/Information#As_a_property_in_physics");
		
	    var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
	    link.type = 'image/x-icon';
	    link.rel = 'shortcut icon';
	    link.href = (['http://www.wikipedia.org/favicon.ico',
			'http://google.com/favicon.ico',
			'https://www.microsoft.com/favicon.ico',
		])[Math.floor(Math.random() * 3)];
		
	    document.getElementsByTagName('head')[0].appendChild(link);
		
	    document.title = (["Relevant School Work",
	    	"Important Information",
	    	"Genuine Research"
	    ])[Math.floor(Math.random() * 3)];
	}
};

Game.prototype.on_blur = function() {
	this.client.send_inactive();
};

Game.prototype.on_focus = function() {
	this.client.send_reactive();
};

// Client stuff

var game = new Game();
var shoot_repeat = null;

// Events

window.onresize = game.resize_canvas.bind(game);
window.onmousemove = game.on_mousemove.bind(game);
window.onmousedown = game.on_mousedown.bind(game);
window.onmouseup = game.on_mouseup.bind(game);
window.onkeydown = game.on_keydown.bind(game);
window.onfocus = game.on_focus.bind(game);
window.onblur = game.on_blur.bind(game);

game.canvas.ontouchmove = function(e) {
	e.preventDefault();
};

window.oncontextmenu = function() {return false;};

var splash = document.getElementById('splash');
var splash_form = document.getElementById('splash_form');
var splash_text = document.getElementById('splash_text');
var splash_input = document.getElementById('splash_input');
var splash_button = document.getElementById('splash_button');
var ad_container = document.getElementById('ad_container');

splash_form.onsubmit = function() {
	if (game.state == GameState.LOGIN) {
		game.client.send_login(splash_input.value);
	} else {
		game.client.send_respawn();
	}
	return false;
};

var chat_form = document.getElementById('chat_form');
var chat_input = document.getElementById('chat_input');
var chat_output = document.getElementById('chat_output');

chat_form.onsubmit = function() {
	if (chat_input.value) {
		game.client.send_chat(chat_input.value);
		chat_input.value = "";
	}
	return false;
};
