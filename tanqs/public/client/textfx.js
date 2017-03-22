function text_fx() {

	this.tags = [];

}

text_fx.prototype.add_tag = function(text, color, pos) {
	this.tags.push(new tag(text, color, pos));
};

text_fx.prototype.render_tags = function(context) {
	context.font = "bold 20px Open Sans";
	context.textAlign = "center";
	context.textBaseline = "bottom";
	for (var i = 0; i < this.tags.length; i++) {
		var tag = this.tags[i];
		context.fillStyle = tag.color;
		context.save();
		context.translate(tag.pos.x, tag.pos.y);
		//context.scale(tag.life / tag.max_life, tag.life / tag.max_life);
		context.globalAlpha = tag.life / tag.max_life;
		context.fillText(tag.text, 0, 0);
		context.restore();
	}
	context.globalAlpha = 1;
};

text_fx.prototype.update = function() {
	for (var i = 0; i < this.tags.length; i++) {
		this.tags[i].update();
	}
	for (var i = this.tags.length - 1; i >= 0; i--) {
		if (this.tags[i].life <= 0) {
			this.tags.splice(i, 1);
		}
	}
};

function tag(text, color, pos) {
	this.text = text;
	this.color = color;
	this.pos = pos;

	this.max_life = 50;
	this.life = this.max_life;
}

tag.prototype.update = function() {
	this.life--;
	this.pos.y--;
};