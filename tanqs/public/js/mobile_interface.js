
var html = {};

html.mouse = new Vec2();
html.mousepress = {left: false, right: false};
html.joystick_pos = new Vec2();

html.canvas = document.getElementById('canvas');
html.context = canvas.getContext('2d');
html.splash_container = document.getElementById('splash_container');
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

function resize_canvas() {
	html.canvas.width = window.innerWidth;
	html.canvas.height = window.innerHeight;
}

console.log('adding touch events...');

html.canvas.addEventListener('touchstart', function(evt) {
	var rect = html.canvas.getBoundingClientRect();
    html.joystick_pos.set_xy(evt.clientX - rect.left, evt.clientY - rect.top);
	html.mouse.set_xy(0, 0);
	console.log("touchstart");
}, false);

html.canvas.addEventListener('touchend', function(evt) {
	html.mouse.set_xy(0, 0);
	console.log("touchend");
}, false);

html.canvas.addEventListener('touchmove', function(evt) {
	var rect = html.canvas.getBoundingClientRect();
    html.mouse.set_xy(evt.clientX - rect.left, evt.clientY - rect.top).m_sub(html.joystick_pos);
    console.log("touchmove");
}, false);

html.join_button.onclick = function() {
	if (nick_input.value) {
		socket.emit('login', {name:nick_input.value});
	}
};

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

html.set_splash_join = function() {
	html.splash_container.style.display = "block";

	html.nick_input.style.display = "block";
	html.pass_input.style.display = "none";
	html.confirm_input.style.display = "none";

	html.join_button.innerHTML = "join the game";

	html.question1.style.display = "block";
	html.question2.style.display = "block";
	html.question3.style.display = "none";
	html.question4.style.display = "none";
	html.question5.style.display = "none";
}
html.set_splash_login = function() {
	html.splash_container.style.display = "block";

	html.nick_input.style.display = "block";
	html.pass_input.style.display = "block";
	html.confirm_input.style.display = "none";

	html.join_button.innerHTML = "log in";

	html.question1.style.display = "none";
	html.question2.style.display = "none";
	html.question3.style.display = "block";
	html.question4.style.display = "none";
	html.question5.style.display = "block";
}
html.set_splash_signup = function() {
	html.splash_container.style.display = "block";

	html.nick_input.style.display = "block";
	html.pass_input.style.display = "block";
	html.confirm_input.style.display = "block";

	html.join_button.innerHTML = "create account";

	html.question1.style.display = "none";
	html.question2.style.display = "none";
	html.question3.style.display = "none";
	html.question4.style.display = "block";
	html.question5.style.display = "block";
}