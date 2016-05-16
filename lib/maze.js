"use strict";
var MAZESZ = 15;

var Pos = function(x, y) {
	this.x = x
	this.y = y
}

Pos.prototype.sum = function(p) {
	return new Pos(p.x + this.x, p.y + this.y);
}

var DirEnum = {
	UP: 0,
	DOWN: 1,
	LEFT: 2,
	RIGHT: 3,
	NSIDES: 4,
};

var to = [new Pos(0, -1), new Pos (0, 1), new Pos(-1, 0), new Pos(1, 0),];

var Maze = function(size) {
	var i, j;
	this.sz = size;
	this.start = new Pos(Math.floor(size/2), Math.floor(size/2));
	this.pos = new Pos(this.start.x, this.start.y);
	this.rooms = new Array(size);
	for(i = 0; i < size; i++){
		this.rooms[i] = new Array(size)
		for(j = 0; j < size; j++){
			this.rooms[i][j] = false
		}
	}
}

Maze.prototype.isborder = function(p) {
	return p.x == 0 || p.x == this.sz-1 || p.y == 0 ||  p.y == this.sz-1;
}

Maze.prototype.isinside = function(p) {
	return p.x >= 0 && p.x <= this.sz-1 && p.y >= 0 &&  p.y <= this.sz-1;
}

Maze.prototype.iscross = function(from, dest) {
	var wr;
	for(wr =  0; wr < DirEnum.NSIDES; wr++) {
		var w = dest.sum(to[wr])
		if(w.x == from.x && w.y == from.y){
			continue
		}
		if(this.rooms[w.x][w.y]){
			return true;
		}
	}
	return false;
}


var PROBCUT = 80;	//	1/PROBCUT of cutting itself

//Randomized Prim algorithm
Maze.prototype.randPrim = function(out) {
	var wpend = [];
	wpend.push(this.start);
	this.rooms[this.start.x][this.start.y] = true;
	while(wpend.length != 0) {
		var rn = Math.floor(Math.random()*wpend.length);
		var wpos = wpend.splice(rn, 1)[0];
		var wr;
		for(wr = 0; wr < DirEnum.NSIDES; wr++){
			var w = wpos.sum(to[wr]);
			if(!this.isinside(w) || this.isborder(w) || this.rooms[w.x][w.y]){
				continue
			}
			if (this.iscross(wpos, w)) {
				rn = Math.floor(Math.random()*PROBCUT);
				if(rn != 1){
					continue;
				}
			}
			this.rooms[w.x][w.y] = true;
			wpend.unshift(w);
		}
	}
	var i;
	for(i = out.x; i<this.sz; i++){
		this.rooms[i][out.y] = true;
		var con = out.sum(to[DirEnum.DOWN]);
		con.x = i;
		if (this.rooms[con.x][con.y])  {
			break
		}
	}
	this.out = out;
}

Maze.prototype.string = function() {
	var i, j;
	var s = "";
	for(i = 0; i<this.sz; i++){
		for(j = 0; j<this.sz; j++){
			if(i == this.pos.x && j == this.pos.y){
				s = s + "o";
			}else if(this.rooms[i][j]){
				s = s + "-";
			}else{
				s = s + "x"
			}
		}
		s = s + "\n"
	}
	return s
}

// Maze.prototype.fullRooms = function() {
// 	var i, j;
// 	for(i = 0; i<this.sz; i++){
// 		for(j = 0; j<this.sz; j++){
// 			if(this.rooms[x][y]){
// 				console.log()
// 			}else{
// 			}
// 		}
// 	}
// }


Maze.prototype.isX = function(x, y) {
	try {
	    return (this.rooms[x][y]);
	} catch(e){
	    console.log("(" + x + ", " + y + ")");
	}

}

var WHITE = 'rgba(255, 255, 255, 1)';
var RED = 'rgba(255, 0, 0, 1)';
var BLUE = 'rgba(0, 0, 255, 1)';
var BLACK = 'rgba(0, 0, 0, 1)';
var GREY = 'rgba(160, 160, 160, 1)';
var FONTSZ=30;

//if radius is zero it draws all, else only around pos
Maze.prototype.draw = function(canvas, x, y, sz, radius) {
	var i, j;
	var fontsz = FONTSZ;
	var r;
	var xp = x - (this.sz - this.pos.x - 1 - radius)*sz;
	var yp = y - (this.pos.y - radius)*sz;
	r = radius;
	if(radius == 0){
		r = Math.round(this.sz/2);
		xp = x;
		yp = y;
    }
	canvas.save();
	canvas.translate(xp, yp);
	canvas.font = fontsz+'px "Times New Roman"';
	canvas.fillStyle = GREY;
	canvas.translate(0, fontsz/2);

	for(i = 0; i<this.sz; i++){
		var ii = this.sz - i - 1;
		for(j = 0; j<this.sz; j++){
			var dsq = Math.abs(this.pos.x - ii)*Math.abs(this.pos.x - ii);
			dsq = dsq + Math.abs(this.pos.y - j)*Math.abs(this.pos.y - j);
			if(radius != 0 && dsq > r*r) {
				continue
			}
			var xoff = i*sz;
			var yoff = j*sz;
			if(this.sz - i - 1 == this.pos.x && j == this.pos.y){
				canvas.fillStyle = GREY;
				canvas.fillRect(xoff, yoff, sz, sz);
				canvas.strokeRect(xoff, yoff, sz, sz);
				canvas.fillStyle = BLUE;


				ctx.beginPath();
				ctx.arc(xoff+sz/4 + sz/4, yoff+sz/4 + sz/4, 3 ,0,2*Math.PI);
				ctx.fill();
				ctx.stroke();

				// canvas.fillRect(xoff+sz/4, yoff+sz/4, sz/2, sz/2);
				canvas.fillStyle = GREY;
			} else if(this.rooms[this.sz- i -1][j]){
				canvas.fillRect(xoff, yoff, sz, sz);
				canvas.strokeRect(xoff, yoff, sz, sz);
			}
		}
	}
	canvas.restore();
}




//for debugging
Maze.prototype.determ = function(out) {
	var i, j;
	if(this.sz < 13){
		console.log("The maze is not big enough for determinism");
		return;
	}
	this.rooms[this.start.x][this.start.y] = true;
	for(i = 0; i<this.sz; i++){
		for(j = 0; j<this.sz; j++){
			this.rooms[i][j] = true;
		}
	}
	//recoginzable L shape for debugging
	for(i = 0; i < 5; i++){
		this.rooms[10][8+i] = false;
	}
	this.rooms[9][12] = false;
	this.out = out;
}


//var TheMaze = new Maze(MAZESZ);
//TheMaze.randPrim(new Pos(0, 0));
//TheMaze.determ(new Pos(0, 0));
