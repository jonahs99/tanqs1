
function Camera() {

	this.translate = new Vec2();
	this.scale = 1;
	this.rotate = 0;

}

function Renderer(game, canvas) {

	this.game = game;
	this.world = game.world;
	this.particles = game.particles;
	this.textfx = game.textfx;
	this.canvas = canvas;
	this.context = canvas.getContext('2d');

	this.following = -1; // Tank id to follow around before login
	this.follow_vel = new Vec2();
	this.fpv = false; // Draw the world rotated to point tank up

}

Renderer.prototype.render_world = function() {

	// Calculate delta value for interpolation

	var elapsed = Date.now() - this.game.last_update_time;
	var delta = clamp(elapsed / this.game.time_step, 0, 1.2); // Allow dead-reckoning for up to 0.2 time steps if necessary

	// Clear the canvas
	this.context.setTransform(1, 0, 0, 1, 0, 0);
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context.translate(this.canvas.width / 2, this.canvas.height / 2);

	// Discourage zoom cheating
	//this.context.beginPath();
	//this.context.rect(-1920/2, -1080/2, 1920, 1080);
	//this.context.clip();

	// Pan with the player
	var scl;

	if (this.game.state == GameState.GAME) {
		this.game.player_tank.lerp_state(delta);
		this.game.camera.translate.set(this.game.player_tank.draw.pos).m_scale(-1);
		if (this.fpv) {
			this.game.camera.rotate = (-this.game.player_tank.draw.dir) - Math.PI / 2;
		} else {
			this.game.camera.rotate = 0;
		}
		scl = this.game.player_tank.flag == 'sniper' ? 0.7 : 1;
	} else if (this.game.state == GameState.LOGIN) {
		scl = 0.8;
		// Pan around the best player
		if (this.following > -1) {
			var tank = this.game.world.tanks[this.following];
			if (tank.alive) {
				var target = new Vec2().set(tank.draw.pos).m_scale(-1);
				var target_lerp = new Vec2().set_lerp(this.game.camera.translate, target, 0.04);
				var target_vel = new Vec2().set(target).m_sub(target_lerp);
				this.follow_vel.set_lerp(this.follow_vel, target_vel, 0.1);
				//if (FOLLOW_TEST)
					//this.game.camera.translate.m_add(this.follow_vel);
				this.game.camera.translate.set_lerp(this.game.camera.translate, target, 0.03);
			} else {
				this.following = -1;
			}
		}
		if (this.following == -1) {
			if (this.game.leaderboard) {
				for (var i = 0; i < this.game.leaderboard.length; i++) {
					var client = this.game.leaderboard[i];
					var tank = this.game.world.tanks[client.tank_id];
					if (tank) {
						if (tank.alive) {
							this.following = client.tank_id;
							break;
						}
					}
				}
			}
		}
	} else {
		scl = 0.8;
	}

	this.game.camera.scale = lerp(this.game.camera.scale / this.game.scale_value, scl, 0.1) * this.game.scale_value;

	this.context.scale(this.game.camera.scale, this.game.camera.scale);
	this.context.rotate(this.game.camera.rotate);
	this.context.translate(this.game.camera.translate.x, this.game.camera.translate.y);

	//Draw the grid
	this.context.strokeStyle = '#333';
	this.context.lineWidth = 4;

	var grid_spacing = 100;

	this.context.beginPath();
	for (var x = -this.world.map.size.width / 2; x <= this.world.map.size.width / 2; x+= grid_spacing) {
		this.context.moveTo(x, -this.world.map.size.height / 2);
		this.context.lineTo(x, this.world.map.size.height / 2);
	}
	for (var y = -this.world.map.size.height / 2; y <= this.world.map.size.height / 2; y+= grid_spacing) {
		this.context.moveTo(-this.world.map.size.width / 2, y);
		this.context.lineTo(this.world.map.size.width / 2, y);
	}
	this.context.stroke();

	//Draw the tracks
	/*this.context.strokeStyle = '#fff';
	this.context.lineJoin = 'butt';
	this.context.lineCap = 'butt';
	this.context.lineWidth = 8;
	this.context.setLineDash([5]);

	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.alive) {
			this.render_tank_tracks(tank);
		}
	}

	this.context.setLineDash([]);*/

	//Draw the map
	this.render_map();

	//Draw the flags
	for (var i = 0; i < this.world.flags.length; i++) {
		var flag = this.world.flags[i];
		if (flag.alive) {
			this.render_flag(flag);
		}
	}

	//Draw the tanks
	for (var i = 0; i < this.world.tanks.length; i++) {
		var tank = this.world.tanks[i];
		if (tank.alive || tank.corpse) {
			if (tank != this.world.game.player_tank) {
				tank.lerp_state(delta);
				if (tank.ai)
					this.render_bot(tank, delta);
				else
					this.render_tank(tank, delta);
			}
		}
	}

	//Draw the bullets
	for (var i = 0; i < this.world.bullets.length; i++) {
		var bullet = this.world.bullets[i];
		if (bullet.alive) {
			bullet.lerp_state(delta);
			this.render_bullet(bullet);
		}
	}

	//Draw the player tank
	if (this.game.player_tank && (this.game.player_tank.alive || this.game.player_tank.corpse)) {
		this.render_tank(this.game.player_tank, delta);
	}

	//Draw the particles
	this.particles.render(this.context);

	//Draw the text effects
	this.textfx.render_tags(this.context);

	/*this.context.translate(-this.game.camera.translate.x, -this.game.camera.translate.y);
	this.context.rotate(-this.game.camera.rotate);
	this.context.scale(1/this.game.camera.scale, 1/this.game.camera.scale);*/
	this.context.setTransform(1, 0, 0, 1, 0, 0);
	this.context.translate(this.canvas.width / 2, this.canvas.height / 2);

	//Draw the leader_board
	this.render_leaderboard();

	//Draw UI
	if (this.game.state == GameState.GAME) {
		this.render_ui();
	}

};

Renderer.prototype.render_map = function() {

	this.context.lineWidth = 4;

	for (var i = 0; i < this.world.map.rectangles.length; i++) {
		var rect = this.world.map.rectangles[i];

		if (rect.team == -1) {
			this.context.fillStyle = '#555';//'rgba(255, 255, 255, 0.2)';
			this.context.strokeStyle = '#ddd';//'rgba(255, 255, 255, 0.6)';
		} else if (rect.team == 0) {
			this.context.fillStyle = '#e04945';
			this.context.strokeStyle = '#e77471';
		} else if (rect.team == 1) {
			this.context.fillStyle = '#195496';
			this.context.strokeStyle = '#206cc2';
		}

		this.context.beginPath();
		this.context.rect(rect.x - rect.hwidth, rect.y - rect.hheight, rect.hwidth * 2, rect.hheight * 2);
		this.context.fill();
		this.context.stroke();
	}

};

Renderer.prototype.render_tank_tracks = function(tank) {

	if (tank.track.left.length) {

		this.context.beginPath();

		this.context.moveTo(tank.track.left[tank.track.start].x, tank.track.left[tank.track.start].y);
		for (var i = 1; i < tank.track.left.length; i++) {
			var l = tank.track.left[(tank.track.start + i) % tank.track.max];
			this.context.lineTo(l.x, l.y);
		}

		this.context.moveTo(tank.track.right[tank.track.start].x, tank.track.right[tank.track.start].y);
		for (var i = 1; i < tank.track.right.length; i++) {
			var r = tank.track.right[(tank.track.start + i) % tank.track.max];
			this.context.lineTo(r.x, r.y);
		}

		this.context.stroke();

	}

};

function shadeBlendConvert(p, from, to) {
    if(typeof(p)!="number"||p<-1||p>1||typeof(from)!="string"||(from[0]!='r'&&from[0]!='#')||(typeof(to)!="string"&&typeof(to)!="undefined"))return null; //ErrorCheck
    if(!this.sbcRip)this.sbcRip=function(d){
        var l=d.length,RGB=new Object();
        if(l>9){
            d=d.split(",");
            if(d.length<3||d.length>4)return null;//ErrorCheck
            RGB[0]=i(d[0].slice(4)),RGB[1]=i(d[1]),RGB[2]=i(d[2]),RGB[3]=d[3]?parseFloat(d[3]):-1;
        }else{
            if(l==8||l==6||l<4)return null; //ErrorCheck
            if(l<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(l>4?d[4]+""+d[4]:""); //3 digit
            d=i(d.slice(1),16),RGB[0]=d>>16&255,RGB[1]=d>>8&255,RGB[2]=d&255,RGB[3]=l==9||l==5?r(((d>>24&255)/255)*10000)/10000:-1;
        }
        return RGB;}
    var i=parseInt,r=Math.round,h=from.length>9,h=typeof(to)=="string"?to.length>9?true:to=="c"?!h:false:h,b=p<0,p=b?p*-1:p,to=to&&to!="c"?to:b?"#000000":"#FFFFFF",f=sbcRip(from),t=sbcRip(to);
    if(!f||!t)return null; //ErrorCheck
    if(h)return "rgb("+r((t[0]-f[0])*p+f[0])+","+r((t[1]-f[1])*p+f[1])+","+r((t[2]-f[2])*p+f[2])+(f[3]<0&&t[3]<0?")":","+(f[3]>-1&&t[3]>-1?r(((t[3]-f[3])*p+f[3])*10000)/10000:t[3]<0?f[3]:t[3])+")");
    else return "#"+(0x100000000+(f[3]>-1&&t[3]>-1?r(((t[3]-f[3])*p+f[3])*255):t[3]>-1?r(t[3]*255):f[3]>-1?r(f[3]*255):255)*0x1000000+r((t[0]-f[0])*p+f[0])*0x10000+r((t[1]-f[1])*p+f[1])*0x100+r((t[2]-f[2])*p+f[2])).toString(16).slice(f[3]>-1||t[3]>-1?1:3);
}

Renderer.prototype.render_bot = function(tank, delta) {

	// Draw the tank

	tank.draw_rad = lerp(tank.draw_rad, tank.rad, 0.2);
	var rad = tank.draw_rad * 1.1;

	this.context.translate(tank.draw.pos.x, tank.draw.pos.y);
	this.context.rotate(tank.draw.dir);
	
	this.context.fillStyle = tank.color;

	this.context.strokeStyle = '#444';

	if (tank.corpse) {
		var scl = (tank.death_anim) / 3;
		this.context.scale((1 + scl) / 2, scl);
	}

	this.context.lineWidth = 3;
	this.context.lineJoin = 'round';

	// Flash white if invicible
	if (tank.invincible) {
		var period = 800;
		this.context.fillStyle = shadeBlendConvert(Math.sin((Date.now() % period) / period * 2 * Math.PI) * 0.7, tank.color, "#fff");
		this.context.strokeStyle = shadeBlendConvert(Math.sin((Date.now() % period) / period * 2 * Math.PI) * 0.3, "#444", "#fff");
	}
	
	//guns
	this.context.beginPath();
	this.context.rect(-rad * (0.8 + tank.gun_len), -rad * 0.5, 2 * rad * (0.8 + tank.gun_len), rad);
	this.context.rect(-rad * 0.5,-rad * (0.8 + tank.gun_len), rad, 2 * rad * (0.8 + tank.gun_len));
	this.context.fill();
	this.context.stroke();

	this.context.beginPath();
	this.context.rect(-rad, -rad, 2 * rad, 2 * rad);
	this.context.fill();
	this.context.stroke();

	if (tank.corpse) {
		this.context.scale(2/(1 + scl), 1/scl);
	}
	this.context.rotate(-tank.draw.dir);
	this.context.translate(-tank.draw.pos.x, -tank.draw.pos.y);

};

Renderer.prototype.render_tank = function(tank, delta) {

	// Draw the tank

	tank.draw_rad = lerp(tank.draw_rad, tank.rad, 0.2);
	var rad = tank.draw_rad;

	this.context.translate(tank.draw.pos.x, tank.draw.pos.y);
	this.context.rotate(tank.draw.dir);

	if (tank.flag == "tunneler") {
		this.context.globalAlpha = 0.8;
	}
	
	this.context.fillStyle = tank.color;//'#06f';//'#f28';

	this.context.strokeStyle = tank.flag == "default" ? '#444' : '#777';
	if (tank.flag_team > -1) {
		this.context.strokeStyle = (['#c00', '#06c'])[tank.flag_team];
	}

	if (tank.corpse) {
		var scl = (tank.death_anim) / 3;
		this.context.scale((1 + scl) / 2, scl);
	}

	this.context.lineWidth = tank.flag == "tiny" ? 2 : 3;
	this.context.lineJoin = 'round';

	// Flash white if invicible
	if (tank.invincible) {
		var period = 800;
		this.context.fillStyle = shadeBlendConvert(Math.sin((Date.now() % period) / period * 2 * Math.PI) * 0.7, tank.color, "#fff");
		this.context.strokeStyle = shadeBlendConvert(Math.sin((Date.now() % period) / period * 2 * Math.PI) * 0.3, "#444", "#fff");
	}


	this.context.beginPath();
	if (tank.flag == "back fire") this.context.rect(2 * rad * (1 - tank.gun_len), -rad * 0.2, -rad * 2, rad * 0.4);
	this.context.fill();
	this.context.stroke();
	
	// Base tank square
	this.context.beginPath();
	this.context.rect(-rad, -rad, 2 * rad, 2 * rad);
	this.context.fill();
	this.context.stroke();

	this.context.beginPath();
	// Wheels
	this.context.rect(-rad * 1.25, -rad * 1.25, rad * 2.5, rad * 0.75);
	this.context.rect(-rad * 1.25, rad * 0.5, rad * 2.5, rad * 0.75);
	// Gun
	if (tank.flag != "shock wave") {
		if (tank.flag == "sniper") {
			this.context.rect(-2 * rad * (1 - tank.gun_len) - 0.2 * rad, -rad * 0.2, rad * 2.4, rad * 0.4);
		} else {
			this.context.rect(-2 * rad * (1 - tank.gun_len), -rad * 0.2, rad * 2, rad * 0.4);
		}
	}

	this.context.fill();
	this.context.stroke();
	
	if (tank.flag == "shock wave") {
		this.context.beginPath();
		this.context.arc(0, 0, rad * 0.6 * tank.gun_len, 0, Math.PI * 2);
		this.context.fill();
		this.context.stroke();
	}

	if (tank.flag == "shield" && tank.reload[tank.reload.length - 1] >= tank.reload_ticks) {
		var opac = (Math.sin(Date.now() * 6 / 500) + 1) * 0.12 + 0.2;
		this.context.strokeStyle = 'rgba(255,255,255,' + opac.toString() + ')';
		this.context.lineWidth = 4;
		this.context.beginPath();
		this.context.arc(0, 0, 40, 0, Math.PI * 2);
		this.context.stroke();
	}

	if (tank.corpse) {
		this.context.scale(2/(1 + scl), 1/scl);
	}

	this.context.rotate(-tank.draw.dir);

	this.context.globalAlpha = 1;
	
	this.context.fillStyle = '#fff';
	this.context.font = "16px Open Sans";
	this.context.textAlign = "center";
	this.context.textBaseline = "middle";
	if (tank != this.game.player_tank) {
		this.context.fillText(tank.name, 0, rad * 3);	
	}

	this.context.translate(-tank.draw.pos.x, -tank.draw.pos.y);
};

Renderer.prototype.render_bullet = function(bullet) {

	this.context.fillStyle = bullet.color;//'#B076CC';
	this.context.lineWidth = 3;
	this.context.strokeStyle = '#444';//'#893DCC';

	if (!bullet.guided) {

		if (bullet.old_rad != bullet.rad) {
			this.context.lineWidth = 6;
			this.context.strokeStyle = bullet.color;
			this.context.fillStyle = 'rgba(255, 255, 255, 0.06)';
		}
		
		this.context.beginPath();
		this.context.arc(bullet.draw_pos.x, bullet.draw_pos.y, bullet.draw_rad, 0, 2*Math.PI);

		this.context.fill();
		this.context.stroke();
		this.context.globalAlpha = 1;

	} else {

		var dif = new Vec2().set(bullet.current_pos).m_sub(bullet.old_pos);
		var dir = Math.atan2(dif.y, dif.x);
		var rad_mult = Math.sin(Date.now() * 6 / 400) * 0.1 + 1.05;

		this.context.translate(bullet.draw_pos.x, bullet.draw_pos.y);
		this.context.rotate(dir);

		this.context.beginPath();
		this.context.moveTo(bullet.rad * rad_mult, 0);
		this.context.lineTo(-bullet.rad * rad_mult * 2, -bullet.rad * rad_mult * 1.2);
		this.context.lineTo(-bullet.rad * rad_mult * 2, bullet.rad * rad_mult * 1.2);
		this.context.closePath();
		this.context.fill();
		this.context.stroke();

		this.context.rotate(-dir);
		this.context.translate(-bullet.draw_pos.x, -bullet.draw_pos.y);

	}

};

Renderer.prototype.render_flag = function(flag) {

	var colors = {bg: '', flag: ''};
	switch (flag.team) {
		case -1:
			colors.bg = '#aaa';
			colors.flag = '#fff';
			break;
		case 0:
			colors.bg = '#e04945';
			colors.flag = '#e77471';
			break;
		case 1:
			colors.bg = '#2374cf';
			colors.flag = '#458ee0';
			break;
	}

	this.context.translate(flag.pos.x, flag.pos.y);

	this.context.fillStyle = colors.bg;
	this.context.lineWidth = 4;
	this.context.strokeStyle = colors.bg;

	var flag_rad = flag.rad * 0.8;

	this.context.beginPath();
	//this.context.arc(0, 0, flag.rad, 0, 2*Math.PI);
	this.context.rect(-flag.rad, -flag.rad, flag.rad * 2, flag.rad * 2);
	this.context.fill();
	this.context.stroke();

	this.context.strokeStyle = colors.flag;
	this.context.fillStyle = colors.flag;

	this.context.beginPath();
	this.context.moveTo(-0.5 * flag_rad, flag_rad);
	this.context.lineTo(-0.5 * flag_rad, -flag_rad);
	this.context.lineTo(flag_rad * 0.5, -flag_rad);
	this.context.lineTo(flag_rad * 0.5, 0);
	this.context.lineTo(-0.5 * flag_rad, 0);
	this.context.closePath();
	
	this.context.fill();
	this.context.stroke();

	this.context.translate(-flag.pos.x, -flag.pos.y);

};

Renderer.prototype.render_leaderboard = function() {

	var line = 0;
	function line_y(l) {
		return -this.canvas.height/2 + 30 + 26*l;
	}

	var right_x = this.canvas.width/2-30;
	var left_x = this.canvas.width/2-350;
	var center_x = (right_x + left_x) / 2;

	this.context.fillStyle = "rgba(0,0,0,0.2)";
	//this.context.fillRect(left_x - 15, -this.canvas.height/2 + 5, right_x - left_x + 30, this.canvas.height - 10);

	this.context.textAlign = "right";
	this.context.textBaseline = "middle";

	if (this.game.team_leaderboard) {
		for (var i = 0; i < this.game.team_leaderboard.length; i++) {
			var team = this.game.team_leaderboard[i];
			var text = team.name + " team: " + team.score;

			this.context.fillStyle = (['#f66', '#6bf'])[team.id];
			this.context.font = "20px Open Sans";

			this.context.fillText(text, right_x - 20, line_y(line));
			line++;
		}

		this.context.lineCap = "round";
		this.context.lineWidth = 4;
		this.context.strokeStyle = "rgba(240, 240, 240, 0.2)";
		this.context.beginPath();
		this.context.moveTo(right_x, line_y(line));
		this.context.lineTo(left_x, line_y(line));
		this.context.stroke();

		line++;
	}

	this.context.textAlign = "center";
	this.context.font = "bold 24px Open Sans";
	this.context.fillStyle = "#000";
	this.context.fillText("Leaderboard", center_x, line_y(line) + 2);
	this.context.font = "24px Open Sans";
	this.context.fillStyle = "#eee";
	this.context.fillText("Leaderboard", center_x, line_y(line));
	line += 1.5;

	if (this.game.leaderboard) {
		var in_topten = false;
		var player_client = null;
		var player_rank = 0;
		for (var i = 0; i < Math.min(10, this.game.leaderboard.length); i++) {
			var client = this.game.leaderboard[i];
			
			var text = (i + 1) + ". " + client.name;
			//var score_text = "K:[" + client.stats.kills + "] D:[" + client.stats.deaths + "]";
			var score_text = "" + client.score;

			this.context.fillStyle = this.game.world.tanks[client.tank_id].color;
			
			this.context.font = "18px Open Sans";
			if (this.game.player_tank && this.game.player_id == client.tank_id) {
				this.context.font = "bold italic 18px Open Sans";
				in_topten = true;
				player_client = client;
				player_rank = i;
			}
			
			this.context.textAlign = "left";
			this.context.fillText(text, left_x, line_y(line));
			this.context.textAlign = "right";
			this.context.fillText(score_text, right_x - 20, line_y(line));

			this.context.fillStyle = this.game.world.tanks[client.tank_id].alive ? '#6f6' : '#f06';
			this.context.beginPath();
			this.context.arc(right_x, line_y(line), 5, 0, Math.PI * 2);
			this.context.fill();

			line++;
		}
		if (!in_topten) {

			for (var i = 0; i < this.game.leaderboard.length; i++) {
				var client = this.game.leaderboard[i];
				if (this.game.player_tank && this.game.player_id == client.tank_id) {
					player_client = client;
					player_rank = i;
				}
			}
			if (player_client) {
				// Draw the ellipsis
				this.context.fillStyle = "#eee";
				this.context.beginPath();
				this.context.arc(center_x - 20, line_y(line), 3, 0, Math.PI * 2);
				this.context.fill();
				this.context.beginPath();
				this.context.arc(center_x, line_y(line), 3, 0, Math.PI * 2);
				this.context.fill();
				this.context.beginPath();
				this.context.arc(center_x + 20, line_y(line), 3, 0, Math.PI * 2);
				this.context.fill();
				line++;
				
				var text = (player_rank + 1) + ". " + player_client.name;
				var score_text = "" + player_client.score;

				this.context.fillStyle = this.game.player_tank.color;

				this.context.font = "bold italic 18px Open Sans";

				this.context.textAlign = "left";
				this.context.fillText(text, left_x, line_y(line));
				this.context.textAlign = "right";
				this.context.fillText(score_text, right_x - 20, line_y(line));

				this.context.fillStyle = this.game.player_tank.alive ? '#6f6' : '#f06';
				this.context.beginPath();
				this.context.arc(right_x, line_y(line), 5, 0, Math.PI * 2);
				this.context.fill();
				line++;
			}
		}
		
		line = 0;
		left_x = -this.canvas.width/2+30;
		right_x = -this.canvas.width/2+370;
		center_x = (right_x + left_x) / 2;

		this.context.font = "18px Open Sans";
		this.context.fillStyle = '#eee'
		this.context.textAlign = "left";
		this.context.textBaseline = "middle";
		var text = this.game.leaderboard.length + "/24 playing (" + this.game.n_spectator + " spectating)";
		this.context.fillText(text, left_x, line_y(line));
		line++;

		if (this.game.topten) {
			if (this.game.topten.length) {

				line = 2;

				this.context.lineCap = "round";
				this.context.lineWidth = 4;
				this.context.strokeStyle = "rgba(240, 240, 240, 0.2)";
				this.context.beginPath();
				this.context.moveTo(right_x, line_y(line));
				this.context.lineTo(left_x, line_y(line));
				this.context.stroke();
				line++;

				this.context.textAlign = "center";
				this.context.font = "bold 24px Open Sans";
				this.context.fillStyle = "#000";
				this.context.fillText("Today's Top Ten", center_x, line_y(line) + 2);
				this.context.font = "24px Open Sans";
				this.context.fillStyle = "#eee";
				this.context.fillText("Today's Top Ten", center_x, line_y(line));
				line += 1.5;

				this.context.font = "18px Open Sans";
				for (var i = 0; i < this.game.topten.length; i++) {
					var top = this.game.topten[i];
					var text = "" + (i + 1) + ". " + top.name;
					var score_text = top.score;
					this.context.fillStyle = "#000";
					this.context.textAlign = "left";
					this.context.fillText(text, left_x, line_y(line) + 2);
					this.context.textAlign = "right";
					this.context.fillText(score_text, right_x - 20, line_y(line) + 2);
					this.context.fillStyle = "#eee";
					this.context.textAlign = "left";
					this.context.fillText(text, left_x, line_y(line));
					this.context.textAlign = "right";
					this.context.fillText(score_text, right_x - 20, line_y(line));
					line++;
				}

			}
		}


	}

	// Draw the arrow if the enemy has the team flag

	if (this.game.player_tank && this.game.player_tank.alive && this.game.player_tank.team != -1) {
		for (var i = 0; i < this.world.tanks.length; i++) {
			var tank = this.world.tanks[i];
			if (tank.alive && tank.team != this.game.player_tank.team) {
				if (tank.flag_team == this.game.player_tank.team) {
					var d = new Vec2().set(tank.draw.pos).m_sub(this.game.player_tank.draw.pos);
					var mag2 = d.mag2();
					if (mag2 > Math.pow(this.canvas.height / 2, 2) || mag2 > Math.pow(this.canvas.width / 2, 2)) {
						var rad = 200;
						var ang = Math.atan2(d.y, d.x);
						var pulse = Math.sin(Date.now() / 120);
						d.m_scale(rad / d.mag());
						this.context.fillStyle = (['#c00', '#06c'])[tank.flag_team];
						this.context.strokeStyle = this.context.fillStyle;
						this.lineWidth = 4;
						this.context.beginPath();
						this.context.moveTo(d.x, d.y);
						d.set_rt(rad - 20, ang - 0.1);
						this.context.lineTo(d.x, d.y);
						d.set_rt(rad - 20, ang + 0.1);
						this.context.lineTo(d.x, d.y);
						this.context.closePath();
						this.context.fill();
						this.context.stroke();
					}
					break;
				}
			}
		}
	}

};

Renderer.prototype.render_ui = function() {

	this.context.font = "40px Open Sans";
	this.context.fillStyle = '#fff'
	this.context.textAlign = "center";
	this.context.textBaseline = "middle";
	var text = this.game.player_tank.name;
	this.context.fillText(text, 0, this.canvas.height/2-60);

	var text_length = this.context.measureText(text).width;
	this.render_reload_bars(text_length);

	var	flag_name = this.game.player_tank.flag;
	if (flag_name && (flag_name != "default")) {
		this.context.fillText(flag_name, 0, -this.canvas.height/2+60);
		this.context.font = "18px Open Sans";
		this.context.fillText("(right click to drop flag)", 0, -this.canvas.height/2+100);
	} else if (this.game.player_tank.flag_team > -1) {
		var flag_txt = "";
		var sub_txt = "";
		if (this.game.player_tank.flag_team == this.game.player_tank.team) {
			flag_txt = "You have your team flag";
			sub_text = "(right click to drop it somewhere safe)";
		} else {
			flag_txt = "You have the " + (this.game.player_tank.flag_team == 0 ? "red" : "blue") + " flag!";
			sub_text = "(bring it to your base to capture)";
		}

		this.context.fillText(flag_txt, 0, -this.canvas.height/2+60);
		this.context.font = "18px Open Sans";
		this.context.fillText(sub_text, 0, -this.canvas.height/2+100);
	} else if (this.game.player_tank.team == -1) {
		// Explain the rogue player thing
		this.context.fillText("You are a rogue tank", 0, -this.canvas.height/2+60);
		this.context.font = "18px Open Sans";
		this.context.fillText("(until someone else joins)", 0, -this.canvas.height/2+100);
	}

};

Renderer.prototype.render_reload_bars = function(text_length) {
	if (!this.game.player_tank.reload) return;

	this.context.lineWidth = 12;
	this.context.lineCap = "round";

	var n_bars = this.game.player_tank.reload.length;
	var length = 70;
	var x = text_length/2 + 30;
	var y = this.canvas.height/2 - 60;
	var spacing = 14;
	var height = y - (n_bars-1)*spacing/2;

	for (var i = 0; i < this.game.player_tank.reload.length; i++) {
		if (this.game.player_tank.flag == "shield" && i==this.game.player_tank.reload.length-1) {
			this.context.strokeStyle = '#888';
			i++;
		} else {
			this.context.strokeStyle = '#eee';
		}
		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x + length, height + spacing * i);
		this.context.stroke();
	}


	this.context.lineWidth = 8;

	for (var i = 0; i < this.game.player_tank.reload.length; i++) {
		var x2 = x + this.game.player_tank.reload[i] / this.game.player_tank.reload_ticks * length;

		this.context.strokeStyle = (this.game.player_tank.reload[i] == this.game.player_tank.reload_ticks)? '#3c3' : '#fc0';

		if (this.game.player_tank.flag == "shield" && i==this.game.player_tank.reload.length-1) {
			i++;
		}

		this.context.beginPath();
		this.context.moveTo(x, height + spacing * i);
		this.context.lineTo(x2, height + spacing * i);
		this.context.stroke();
	}
};
