
var html = {};

html.mouse = new Vec2();
html.mousepress = {left: false, right: false};
html.joystick = false;
html.joystick_id = 0;
html.joystick_pos = new Vec2();

html.canvas = document.getElementById('canvas');
html.context = canvas.getContext('2d');
html.splash_container = document.getElementById('splash_container');
html.splash_header = document.getElementById('splash_header');
html.nick_input = document.getElementById('nick_input');
html.pass_input = document.getElementById('pass_input');
html.confirm_input = document.getElementById('confirm_input');
html.join_button = document.getElementById('join_button');

html.login_link = document.getElementById('login_link');
html.signup_link = document.getElementById('signup_link');
html.login_link2 = document.getElementById('login_link2');
html.signup_link2 = document.getElementById('signup_link2');
html.join_link = document.getElementById('join_link');

html.question1 = document.getElementById('question_1');
html.question2 = document.getElementById('question_2');
html.question3 = document.getElementById('question_3');
html.question4 = document.getElementById('question_4');
html.question5 = document.getElementById('question_5');

html.canvas.style.background = '#222';

window.onresize = window.onload = resize_canvas;
window.onmousemove = on_mousemove;
window.onmousedown = on_mousedown;

function resize_canvas() {
	html.canvas.width = window.innerWidth;
	html.canvas.height = window.innerHeight;
	html.scale = Math.max(html.canvas.width / 1366, html.canvas.height / 768);
}

function on_mousemove(evt) {
	var rect = html.canvas.getBoundingClientRect();
    html.mouse.set_xy(evt.clientX - rect.left - canvas.width / 2, evt.clientY - rect.top - canvas.height / 2);
    html.keymode = false;
};

function on_mousedown(evt) {

	if (evt.which == 3) {
		html.mousepress.right = true;
	} else {
		html.mousepress.left = true;
	}

};

html.canvas.addEventListener('touchstart', function(evt) {
	evt.preventDefault();

	if (html.joystick) {
		html.mousepress.left = true;
	} else {
		var rect = html.canvas.getBoundingClientRect();
	    html.joystick_pos.set_xy(evt.changedTouches[0].clientX - rect.left, evt.changedTouches[0].clientY - rect.top);
		html.mouse.set_xy(0, 0);
		html.joystick = true;
		html.joystick_id = evt.changedTouches[0].identifier;
	}

}, false);

html.canvas.addEventListener('touchend', function(evt) {
	evt.preventDefault();
	for (var i = 0; i < evt.changedTouches.length; i++) {
		if (html.joystick && evt.changedTouches[i].identifier == html.joystick_id) {
			html.mouse.set_xy(0, 0)
			html.joystick = false;
		}
	}
}, false);

html.canvas.addEventListener('touchmove', function(evt) {
	evt.preventDefault();
	for (var i = 0; i < evt.changedTouches.length; i++) {
		if (html.joystick && evt.changedTouches[i].identifier == html.joystick_id) {
			var rect = html.canvas.getBoundingClientRect();
		    html.mouse.set_xy(evt.touches[0].clientX - rect.left, evt.touches[0].clientY - rect.top).m_sub(html.joystick_pos).m_scl(2);
		}
	}
}, false);

html.join_link.onclick = function() {
	html.set_splash_join();
	return false;
};

html.login_link.onclick = html.login_link2.onclick = function() {
	html.set_splash_login();
	return false;
};

html.signup_link.onclick = html.signup_link2.onclick = function() {
	html.set_splash_signup();
	return false;
};

html.hide_splash = function() {
	html.splash_container.style.display = "none";
};

html.set_splash_join = function() {
	html.splash_container.style.display = "block";

	html.splash_header.innerHTML = "welcome to tanqs";

	html.nick_input.style.display = "block";
	html.pass_input.style.display = "none";
	html.confirm_input.style.display = "none";

	html.join_button.innerHTML = "join the game";

	html.question1.style.display = "block";
	html.question2.style.display = "block";
	html.question3.style.display = "none";
	html.question4.style.display = "none";
	html.question5.style.display = "none";
};
html.set_splash_login = function() {
	html.splash_container.style.display = "block";

	html.splash_header.innerHTML = "welcome to tanqs"

	html.nick_input.style.display = "block";
	html.pass_input.style.display = "block";
	html.confirm_input.style.display = "none";

	html.join_button.innerHTML = "log in";

	html.question1.style.display = "none";
	html.question2.style.display = "none";
	html.question3.style.display = "block";
	html.question4.style.display = "none";
	html.question5.style.display = "block";
};
html.set_splash_signup = function() {
	html.splash_container.style.display = "block";

	html.splash_header.innerHTML = "welcome to tanqs"

	html.nick_input.style.display = "block";
	html.pass_input.style.display = "block";
	html.confirm_input.style.display = "block";

	html.join_button.innerHTML = "create account";

	html.question1.style.display = "none";
	html.question2.style.display = "none";
	html.question3.style.display = "none";
	html.question4.style.display = "block";
	html.question5.style.display = "block";
};
html.set_splash_respawn = function() {
	html.splash_container.style.display = "block";

	html.splash_container.style.display = "block";

	html.splash_header.innerHTML = "You got killed!"

	html.nick_input.style.display = "none";
	html.pass_input.style.display = "none";
	html.confirm_input.style.display = "none";

	html.join_button.innerHTML = "respawn";

	html.question1.style.display = "none";
	html.question2.style.display = "none";
	html.question3.style.display = "none";
	html.question4.style.display = "none";
	html.question5.style.display = "none";
};