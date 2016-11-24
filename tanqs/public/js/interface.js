
var html = {};

html.mouse = new Vec2();
html.mousepress = {left: false, right: false};
html.keymode = false;
html.keydown = {W: false, A: false, S: false, D: false};

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
window.onmousemove = on_mousemove;
window.onmousedown = on_mousedown;
document.onkeydown = on_keydown;
document.onkeyup = on_keyup;

function resize_canvas() {
	html.canvas.width = window.innerWidth;
	html.canvas.height = window.innerHeight;
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

function on_keydown(evt) {

	if (evt.keyCode == 87) // W
		html.keydown.W = true;
	if (evt.keyCode == 65) // A
		html.keydown.A = true;
	if (evt.keyCode == 83) // S
		html.keydown.S = true;
	if (evt.keyCode == 68) // D
		html.keydown.D = true;

	//html.keymode = true;

}

function on_keyup(evt) {

	if (evt.keyCode == 87) // W
		html.keydown.W = false;
	if (evt.keyCode == 65) // A
		html.keydown.A = false;
	if (evt.keyCode == 83) // S
		html.keydown.S = false;
	if (evt.keyCode == 68) // D
		html.keydown.D = false;

}

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