var gameOver = false;
var jumping = false;

var cubeRotation = 0.0;
var lastCubeUpdateTime = 0;

var canvas3d = document.getElementById('webgl');
var canvas2d =  document.getElementById('maze');
canvas2d.width = window.innerWidth;
canvas2d.height = window.innerHeight;
canvas3d.width = window.innerWidth;
canvas3d.height = window.innerHeight;
var ctx = canvas2d.getContext("2d");
var pressing = [];

var mousePosX = 0, mousePosY = 0;
var eye;
var eyeX, eyeY, eyeZ = 0;
var atX, atY, atZ = 0;
var k = 0.03; // Camera's velocity.
var angle = 0; // Angle of view respect of a look at point.

var screamersBefore = ["screamer00", "screamer10", "screamer20", "screamer30", "screamer40"];
var screamersAfter = ["screamer01", "screamer11", "screamer21", "screamer31", "screamer41"];
var screamersSounds = ["sound0", "sound1", "sound2", "sound3", "sound4"];

var VSHADER_SOURCE =
    'attribute vec3 a_VertexPosition;\n' +
    'attribute vec2 a_TextureCoord;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'varying highp vec2 v_TextureCoord;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * vec4(a_VertexPosition, 1.0);\n' +
    '  v_TextureCoord = a_TextureCoord;\n' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
	'#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	'#endif\n' +
	'varying highp vec2 v_TextureCoord;\n' +
	'uniform sampler2D u_Sampler;\n' +
	'void main() {\n' +
	'  gl_FragColor = texture2D(u_Sampler, vec2(v_TextureCoord.s, v_TextureCoord.t));\n' +
	'}\n';


function Shape(gl, Vertex, TextureCoordinates, vertexIndices, src) {
	var that = this;

	this.VertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexBuffer);
	this.Vertex = Vertex;
	gl.bufferData(gl.ARRAY_BUFFER, this.Vertex, gl.STATIC_DRAW);

	this.textureCoordinates = TextureCoordinates;

	this.vertexIndices = vertexIndices;
	this.numElements = this.vertexIndices.length;

	this.VertexTextureCoordBuffer = gl.createBuffer();
	this.VertexIndexBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, this.textureCoordinates, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.VertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndices, gl.STATIC_DRAW);

	this.src = src;
	this.imgChanged = false;

	this.texture = gl.createTexture();
	var shapeImage = new Image();
	shapeImage.onload = function() { that.handleTextureLoaded(gl, shapeImage); }
	shapeImage.src = this.src;

}

Shape.prototype.handleTextureLoaded = function(gl, image)  {
	// console.log("handleTextureLoaded, image = " + image.src+ "["+this.texture+"]");
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

Shape.prototype.preDraw = function(gl) {

	var vertexPositionAttribute = gl.getAttribLocation(gl.program, "a_VertexPosition");
	var textureCoordAttribute = gl.getAttribLocation(gl.program, "a_TextureCoord");


	gl.enableVertexAttribArray(vertexPositionAttribute);
	gl.enableVertexAttribArray(textureCoordAttribute);


	gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler"), 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.VertexIndexBuffer);

}

function Enemy(pos){
	this.pos = pos;
	this.posTest = pos;
	this.moveInX = Math.random() >= 0.5;
	this.moveInY = !this.moveInX;
	this.fwd = false;
}

function Shoot(pos, angle){
	this.pos = pos;
	this.angle = angle;
}

function main() {

	var gl = getWebGLContext(canvas3d);
	initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

	if(gl) {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
		gl.clearDepth(1.0);                 // Clear everything
		gl.enable(gl.DEPTH_TEST);           // Enable depth testing
		gl.depthFunc(gl.LEQUAL);            // Near things obscure far things


		//Shape's vertex and texture coordinates are in lib/shapes.js
		floor = new Shape(gl, planeVertex, planeTextureCoordinates, planeVertexIndices, "resources/suelo.jpg");
		ceiling = new Shape(gl,planeVertex, planeTextureCoordinates, planeVertexIndices, "resources/techo.jpg");
		cube = new Shape(gl,cubeVertex, cubeTextureCoordinates, cubeVertexIndices, "resources/caja.gif");
		winCube = new Shape(gl,cubeVertex, cubeTextureCoordinates, cubeVertexIndices, "resources/win.jpg");
		shoot = new Shape(gl,shootVertex, cubeTextureCoordinates, cubeVertexIndices, "resources/tnt.jpg");

		canvas2d.addEventListener('mousemove', function(evt) {
			var mousePos = getMousePos(canvas2d, evt);
			moveView(mousePos);
        }, false);
		document.addEventListener('keydown', keydown, false);
		document.addEventListener('keyup', keyup, false);


		newGame(gl);

	}
}

function newGame(gl){
	var ambientSound = document.getElementById('ambientSound');
	var screamerSound = document.getElementById('screamerSound');
	ambientSound.loop = true;
	ambientSound.play();

	var cubes = [];
	var freePositions = [];
	var screamers = [];
	var screamersPosition = [];
	var enemies = [];
	var enemiesShapes = [];
	var shoots = []

	var TheMaze = new Maze(MAZESZ);
	pos = new Pos(TheMaze.pos.x, TheMaze.pos.y) ;
	// TheMaze.determ(new Pos(0, 0));
	TheMaze.randPrim(new Pos(0, 0));
	time = 60;


	getMazePositions(TheMaze, cubes, freePositions);
	eye = getFreePosition(freePositions);

	for (var i = 0; i < 5; i++) {
		var img = screamersBefore[Math.floor(screamersBefore.length * Math.random())];
		screamers[i] = new Shape(gl, wallVertex, wallTextureCoordinates, cubeVertexIndices, "resources/" + img +".jpg");
		screamersPosition[i] = getFreePosition(freePositions)};
	;

	for (var i = 0; i < 5; i++) {

		enemiesShapes[i] = new Shape(gl, enemyVertex, cubeTextureCoordinates, cubeVertexIndices, "resources/cara.png");
		enemies[i] = new Enemy(getFreePosition(freePositions))};
	;

	// eye = new Pos(2, 0);
	eyeX = eye.x;
	eyeY = eye.y;
	angle = 180;
	setInterval(function() {draw(gl, TheMaze, cubes, screamers, screamersPosition, enemies, enemiesShapes, shoots, time)}, 25);
	setInterval(function() {keyHandler(gl, cubes, screamers, screamersPosition, shoots)}, 15);
	setInterval(function() {time -= 1}, 1000);

}


function keyup(evt) {
    pressing[evt.keyCode]=false;
}

function keydown(evt) {
    pressing[evt.keyCode]=true;
}


function getMazePositions(TheMaze, cubes, freePositions){
	var i, j;
	for(i = 0; i<TheMaze.sz; i++){
		for(j = 0; j<TheMaze.sz; j++){
			if (!TheMaze.isX(i, j)) {
	            cubes.push(new Pos(i + 0.5, j + 0.5));
	        }else{
	        	freePositions.push(new Pos(i + 0.5, j + 0.5));
	        }
		}
	}
}

function getFreePosition(freePositions){
	var i;
	var pos;
	i = Math.floor(freePositions.length * Math.random());
	pos = freePositions[i];
	freePositions.splice(i,1);
	return pos;
}


function cos(deg) {
 	return Math.cos(deg * Math.PI / 180);
}

function sin(deg) {
 	return Math.sin(deg * Math.PI / 180);
}

function distance(point1, point2){
    return Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
}

function getMousePos(canvas3d, evt) {
	var rect = canvas3d.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

function moveView(mousePos){
    if (mousePosX > mousePos.x + 1) {
        mousePosX = mousePos.x;
        angle += 1;}

	else if (mousePosX < mousePos.x - 1) {
        mousePosX = mousePos.x;
        angle -= 1;}
}

function checkViewCollision(cubes, screamers, screamersPosition){
    var cube2Check = cubes[0];
    var dis = 0;
    var corner = false;

    // Find the nearest cube from the camera's view
    for (var i = 0; i < cubes.length; i++) {
        if (distance(cubes[i], eye) <= distance(cube2Check, eye)) {
            cube2Check = cubes[i];}

        if ((distance(cubes[i], eye) < 0.81)) {
            dis += 1;}

        if (dis >= 2) { // If there are more than 1 cube near from the view we are in a corner
            corner = true;
            break;}
    }

    var screamer2Check = screamersPosition[0];

	// Find the nearest cube from the camera's view
    for (var i = 0; i < screamers.length; i++) {
        if (distance(screamersPosition[i], eye) <= distance(screamer2Check, eye)) {
            screamer2Check = screamersPosition[i];}
    }

    var eyePrev = eye;

    if (corner) {
        eye.x = eyeX;
        eye.y = eyeY;}

    else if(eye.x < cube2Check.x- 0.8 || cube2Check.x + 0.8 < eye.x
            || eye.y < cube2Check.y - 0.8 || cube2Check.y + 0.8 < eye.y){

		if (distance(screamer2Check, eye) < 0.65){
			eye.x = eyeX;
		    eye.y = eyeY;
		} else {
			eyeX = eye.x;
		    eyeY = eye.y;
		}

    }else if(eye.x - cube2Check.x <= eye.y - cube2Check.y) {
         if (eye.y - cube2Check.y <= -(eye.x - cube2Check.x)) {
             eyeX -= 0.001;
             eye.x = eyeX;
             eyeY = eye.y;}
        else {
             eyeX = eye.x;
             eyeY += 0.001;
             eye.y = eyeY;}

    }else if(eye.x - cube2Check.x > eye.y - cube2Check.y) {
         if (eye.y - cube2Check.y > -(eye.x - cube2Check.x) ) {
             eyeX += 0.001;
             eye.x = eyeX;
             eyeY = eye.y;}
        else {
             eyeX = eye.x;
             eyeY -= 0.001;
             eye.y = eyeY;}

    }else {
        eye.x = eyeX;
        eye.y = eyeY;}

}

var nextShoot = 0;


function keyHandler(gl, cubes, screamers, screamersPosition, shoots) {
	// // Move scene: rotanting camera and horizontal desplacement
	if (pressing[39]) { // Right arrow
		angle -= 2.5;}

	if (pressing[37]) { // Left arrow
		angle += 2.5;}


	if (jumping){
		return;}

	if (pressing[32]) { // Espace
		jumping = true;
		up = true;
	}

	if (pressing[68]) { // D
	   eye.x -= -sin(angle) * k;
	   eye.y -= cos(angle) * k;}

	if (pressing[65]) { // A
	   eye.x += -sin(angle) * k;
	   eye.y += cos(angle) * k;}

	if ((pressing[83]) || (pressing[40])) { // S or Down arrow
	   eye.x -= cos(angle) * k;
	   eye.y -= sin(angle) * k;}

	if ((pressing[87]) || (pressing[38])) { // W or Up arrow
	   eye.x += cos(angle) * k;
	   eye.y += sin(angle) * k;}



	if (pressing[13] && gameOver) { // ENTER
		gameOver = false;
		document.location.href = document.location.href;}

	if (pressing[88]) { // X
		if (nextShoot <= 0){
			shoots.push(new Shoot(new Pos(eyeX, eyeY), angle));
			nextShoot = 20;
		}

	}

	checkViewCollision(cubes, screamers, screamersPosition);

}

var up = false;

function drawJump(){
	if (!jumping) {
		return;
	}

	if (eyeZ > 1.7){
		up = false;}
	else if(eyeZ < 0){
		jumping = false;}

	if (up){

		if (eyeZ > 0.9){
			eyeZ += 0.06;
			atZ += 0.06;}
		else if (eyeZ > 0.8){
			eyeZ += 0.07;
			atZ += 0.07;}
		else if (eyeZ > 0.7){
			eyeZ += 0.08;
			atZ += 0.08;}

		else if (eyeZ > 0.6){
			eyeZ += 0.09;
			atZ += 0.09;}
		else{
			eyeZ += 0.1;
			atZ += 0.1;}

	}else{

		if (eyeZ < 0.9){
			eyeZ -= 0.06;
			atZ -= 0.06;}
		else if (eyeZ < 0.8){
			eyeZ -= 0.07;
			atZ -= 0.07;}
		else if (eyeZ < 0.7){
			eyeZ -= 0.08;
			atZ -= 0.08;}

		else if (eyeZ < 0.6){
			eyeZ -= 0.09;
			atZ -= 0.09;}
		else{
			eyeZ -= 0.1;
			atZ -= 0.1;}

	}


}


function moveEnemies(cubes, enemies){
	for (var i = 0; i < enemies.length; i++) {
		if (enemies[i].moveInX){
			if (enemies[i].fwd) {
				enemies[i].pos.x += 0.05;
			}else {
				enemies[i].pos.x -= 0.05;
			}

			for (var j = 0; j < cubes.length; j++) {
				if (distance(enemies[i].pos, cubes[j]) < 0.75){
					enemies[i].fwd = !enemies[i].fwd;
				}
			};

		}else if (enemies[i].moveInY){
			if (enemies[i].fwd) {
				enemies[i].pos.y += 0.05;
			}else {
				enemies[i].pos.y -= 0.05;
			}
			for (var j = 0; j < cubes.length; j++) {
				if (distance(enemies[i].pos, cubes[j]) < 0.75){
					enemies[i].fwd = !enemies[i].fwd;
				}
			};
		}

	};
}


function checkEnemyCollision(enemies){
	if (jumping) {
		return;
	};
	for (var i = 0; i < enemies.length; i++) {
		if ((enemies[i].pos.x - 0.5 < eyeX && eyeX < enemies[i].pos.x + 0.5)
	 		&& (enemies[i].pos.y - 0.5 < eyeY && eyeY < enemies[i].pos.y + 0.5 )){

			time = 0;
	}
	};

}

function checkScreamerActivation (gl, screamers, screamersPosition) {
	for (var i = 0; i < screamers.length; i++) {

		if ((screamersPosition[i].x - 1 < eyeX && eyeX < screamersPosition[i].x + 1)
		 		&& (screamersPosition[i].y - 1 < eyeY && eyeY < screamersPosition[i].y + 1 )){
			if (!screamers[i].imgChanged) {
				console.log("aquii");
				screamers[i].imgChanged = true;
				var index = screamersBefore.indexOf(screamers[i].src.split("/")[1].split(".")[0]);
				console.log(screamers[i].src.split("/")[1]);
				console.log(index);
				screamers[i].src = "resources/" + screamersAfter[index] + '.jpg';
				console.log(screamers[i].src);
				var shapeImage = new Image();
				j = i;
				shapeImage.onload = function() { screamers[j].handleTextureLoaded(gl, shapeImage); }
				shapeImage.src = screamers[i].src;

				screamerSound.src = "resources/" + screamersSounds[index] + '.ogg';
				ambientSound.pause();
				screamerSound.play();


				screamerSound.onended = function() {
					ambientSound.play();

				}
				time -= 10;
			}
		}

	};
}

function moveShoots (shoots) {
	nextShoot -= 1;
	for (var i = 0; i < shoots.length; i++) {
			shoots[i].pos.x += cos(shoots[i].angle) * 0.1;
			shoots[i].pos.y += sin(shoots[i].angle) * 0.1;
		};
}

function checkShootCollision(cubes, enemies, enemiesShapes, screamersPosition, screamers, shoots){
	for (var i = 0; i < shoots.length; i++) {

		for (var j = 0; j < cubes.length; j++) {
			if(cubes[j].x - 0.6 < shoots[i].pos.x  && shoots[i].pos.x < cubes[j].x + 0.6
		        && cubes[j].y - 0.6< shoots[i].pos.y  && shoots[i].pos.y < cubes[j].y + 0.6){

				shoots.splice(i, 1);
				return;
			}
		};
		for (var k = 0; k < enemies.length; k++) {
			if(enemies[k].pos.x - 0.6 < shoots[i].pos.x  && shoots[i].pos.x < enemies[k].pos.x + 0.6
		        && enemies[k].pos.y - 0.6< shoots[i].pos.y  && shoots[i].pos.y < enemies[k].pos.y + 0.6){

				shoots.splice(i, 1);
				enemies.splice(k, 1);
				enemiesShapes.splice(k, 1);
				return;
			}
		};

		for (var l = 0; l < screamersPosition.length; l++) {

			if(screamersPosition[l].x - 0.6 < shoots[i].pos.x  && shoots[i].pos.x < screamersPosition[l].x + 0.6
		        && screamersPosition[l].y - 0.6< shoots[i].pos.y  && shoots[i].pos.y < screamersPosition[l].y + 0.6){

				shoots.splice(i, 1);
				screamersPosition.splice(l, 1);
				screamers.splice(l, 1);
				return;
			}
		};
	};
}

var j;
const help = 'key arrows to move/ Espace to jump/ X to shoot';

function draw(gl, TheMaze, cubes, screamers, screamersPosition, enemies, enemiesShapes, shoots, time) {

	var u_MvpMatrix;
	var mMatrix   = new Matrix4();
	var vMatrix   = new Matrix4();
	var pMatrix   = new Matrix4();
	var mvpMatrix = new Matrix4();

	TheMaze.pos.x = Math.floor(eyeX);
	TheMaze.pos.y = Math.floor(eyeY);
	ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
    TheMaze.draw(ctx, 5, 5, 10, 0);


	ctx.fillStyle = 'red';
	ctx.font = '70px vSHandprintedMedium';
	ctx.fillText(time, canvas2d.width * 0.9, canvas2d.height* 0.1);
	ctx.font = '20px vSHandprintedMedium';
	ctx.fillText(help, canvas2d.width * 0.15, canvas2d.height* 0.98);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');

	drawJump();

	atX = eyeX + cos(angle);
	atY = eyeY + sin(angle);
    vMatrix.setLookAt(eyeX, eyeY, eyeZ, atX, atY, atZ, 0, 0, 1);
    pMatrix.setPerspective(110, canvas3d.width/canvas3d.height, 0.1, 50);


	checkScreamerActivation (gl, screamers, screamersPosition);

	ceiling.preDraw(gl);
	mMatrix.setTranslate(TheMaze.sz/2, TheMaze.sz/2, 2.5);
	mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
	gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
	gl.drawElements(gl.TRIANGLES, ceiling.numElements, gl.UNSIGNED_SHORT, 0);

	floor.preDraw(gl);
	mMatrix.setTranslate(TheMaze.sz/2, TheMaze.sz/2, 0);
	mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
	gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
	gl.drawElements(gl.TRIANGLES, floor.numElements, gl.UNSIGNED_SHORT, 0);


	for (var i = 0; i < screamers.length; i++) {

		screamers[i].preDraw(gl);
		mMatrix.setTranslate(screamersPosition[i].x, screamersPosition[i].y, 0).rotate(cubeRotation, 0, 0, 1);;
		mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
		gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
		gl.drawElements(gl.TRIANGLES, screamers[i].numElements, gl.UNSIGNED_SHORT, 0);

	};

	checkEnemyCollision(enemies);
	moveEnemies(cubes, enemies);
	for (var i = 0; i < enemiesShapes.length; i++) {

		enemiesShapes[i].preDraw(gl);
		mMatrix.setTranslate(enemies[i].pos.x, enemies[i].pos.y, -0.25);
		mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
		gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
		gl.drawElements(gl.TRIANGLES, enemiesShapes[i].numElements, gl.UNSIGNED_SHORT, 0);

	};



	moveShoots(shoots);
	checkShootCollision(cubes, enemies, enemiesShapes, screamersPosition, screamers, shoots);
	shoot.preDraw(gl);

	for (var i = 0; i < shoots.length; i++) {

		mMatrix.setTranslate(shoots[i].pos.x, shoots[i].pos.y, -0.2);
		mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
		gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
		gl.drawElements(gl.TRIANGLES, shoot.numElements, gl.UNSIGNED_SHORT, 0);
	};



	cube.preDraw(gl);

    for (var i = 0; i < cubes.length; i++) {
        mMatrix.setTranslate(cubes[i].x, cubes[i].y, 0);
        mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
        gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
        gl.drawElements(gl.TRIANGLES, cube.numElements, gl.UNSIGNED_SHORT, 0);}


    winCube.preDraw(gl);
	mMatrix.setTranslate(0, 0, 0).rotate(cubeRotation, 0, 0, 1);;
	mvpMatrix.set(pMatrix).multiply(vMatrix).multiply(mMatrix);
	gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
	gl.drawElements(gl.TRIANGLES, winCube.numElements, gl.UNSIGNED_SHORT, 0);

	var currentTime = (new Date).getTime();
	if (lastCubeUpdateTime) {
	  var delta = currentTime - lastCubeUpdateTime;

	  cubeRotation += (50 * delta) / 1000.0;
	}

	lastCubeUpdateTime = currentTime;

	var msg;
	if (time <= 0){
		msg = 'YOU LOSE'
		gameOver = true;

	}
	if (Math.floor(eyeX) == 0 && Math.floor(eyeX) == 0){
		msg = 'YOU WIN'
		gameOver = true;

	}
	if (gameOver) {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
		gameOver = true;
		ctx.fillStyle = 'red';
		ctx.font = '60px vSHandprintedMedium';
		ctx.fillText(msg, canvas2d.width * 0.3, canvas2d.height* 0.5);

		ctx.font = '20px vSHandprintedMedium';
		ctx.fillText('Press ENTER to start again', canvas2d.width * 0.3, canvas2d.height* 0.8);
	};

}
