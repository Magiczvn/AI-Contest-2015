// ==================== HOW TO RUN THIS =====================
// Call:
// "node Client.js -h [host] -p [port] -k [key]"
//
// If no argument given, it'll be 127.0.0.1:3011
// key is a secret string that authenticate the bot identity
// it is not required when testing
// ===========================================================

// Get the host and port from argurment
var host = "127.0.0.1";
var port = 3011;
var key = 0;
for (var i=0; i<process.argv.length; i++) {
	if (process.argv[i] == "-h") {
		host = process.argv[i + 1];
	}
	else if (process.argv[i] == "-p") {
		port = process.argv[i + 1];
	}
	else if (process.argv[i] == "-k") {
		key = process.argv[i + 1];
	}
}
if (host == null) host = "127.0.0.1";
if (port == null) port = 3011;
if (key == null) key = 0;






// ================== BEHIND THE SCENE STUFF =================
// Game definition
var GAMESTATE_WAIT_FOR_PLAYER = 0;
var GAMESTATE_COMMENCING = 1;
var GAMESTATE_END = 2;

var COMMAND_SEND_KEY = 1;
var COMMAND_SEND_INDEX = 2;
var COMMAND_SEND_DIRECTION = 3;
var COMMAND_SEND_STAGE = 4;

var TURN_PLAYER_1 = 1;
var TURN_PLAYER_2 = 2;

var BLOCK_EMPTY = 0;
var BLOCK_PLAYER_1 = 1;
var BLOCK_PLAYER_1_TRAIL = 2;
var BLOCK_PLAYER_2 = 3;
var BLOCK_PLAYER_2_TRAIL = 4;
var BLOCK_OBSTACLE = 5;

var DIRECTION_LEFT = 1;
var DIRECTION_UP = 2;
var DIRECTION_RIGHT = 3;
var DIRECTION_DOWN = 4;

var turn = TURN_PLAYER_1;
var gameState = GAMESTATE_WAIT_FOR_PLAYER;

var MAP_SIZE = 11;



var map = new Array();
var winner = null;
var index = 0;

// These are friendly variable for user only
var myPosition = new Position(0, 0);
var enemyPosition = new Position(0, 0);
var board = new Array();
for (var i=0; i<MAP_SIZE; i++) {
	board[i] = new Array();
	for (var j=0; j<MAP_SIZE; j++) {
		board[i][j] = 0;
	}
}


// Position object
function Position(x, y) {
	this.x = x;
	this.y = y;
}

// When receive a packet from server
function OnUpdatePacket(data, offset) {
	// Update all variable
	var i = offset;
	gameState = data[i].charCodeAt(0); i ++;
	turn = data[i].charCodeAt(0); i ++;
	winner = data[i].charCodeAt(0); i ++;
	for (var j=0; j<MAP_SIZE * MAP_SIZE; j++) {
		map[j] = data[i].charCodeAt(0); i ++;
	}

	// If it's player turn, notify them to get their input
	if (gameState == GAMESTATE_COMMENCING && turn == index) {
		ConvertVariable();
		MyTurn();
	}
}

// Player need to give a command here
function Command(dir) {
	if (gameState == GAMESTATE_COMMENCING && turn == index) {
		var data = "";
		data += String.fromCharCode(COMMAND_SEND_DIRECTION);
		data += String.fromCharCode(dir);
		Send (data);
	}
}

// Helper
function ConvertCoord (x, y) {
	return y * MAP_SIZE + x;
}
function ConvertVariable () {
	for (var i=0; i<MAP_SIZE; i++) {
		board[i] = new Array();
		for (var j=0; j<MAP_SIZE; j++) {
			board[i][j] = map[ConvertCoord(i, j)];

			if (board[i][j] == BLOCK_PLAYER_1) {
				if (index == TURN_PLAYER_1) {
					myPosition.x = i;
					myPosition.y = j;
				}
				else {
					enemyPosition.x = i;
					enemyPosition.y = j;
				}
			}
			else if (board[i][j] == BLOCK_PLAYER_2) {
				if (index == TURN_PLAYER_2) {
					myPosition.x = i;
					myPosition.y = j;
				}
				else {
					enemyPosition.x = i;
					enemyPosition.y = j;
				}
			}
		}
	}
}


// Engine
var socketStatus = 0;
var SOCKET_STATUS_ONLINE = 1;
var SOCKET_STATUS_OFFLINE = 0;


// Start new connection to server
var ws;
try {
	ws = require("./NodeWS");
}
catch (e) {
	ws = require("./../NodeWS");
}

var socket = ws.connect ("ws://" + host + ":" + port, [], function () {
	socketStatus = SOCKET_STATUS_ONLINE;

	// Send your key (even if you don't have one)
	var data = "";
	data += String.fromCharCode(COMMAND_SEND_KEY);
	data += String.fromCharCode(key);
	Send (data);
});
socket.on("text", function (data) {
	var command = data[0].charCodeAt(0);
	if (command == COMMAND_SEND_INDEX) {
		// Server send you your index, update it
		index = data[1].charCodeAt(0);
	}
	else if (command == COMMAND_SEND_STAGE) {
		OnUpdatePacket(data, 1);
	}
});
socket.on("error", function (code, reason) {
	socketStatus = SOCKET_STATUS_OFFLINE;
});

// Send data through socket
function Send(data) {
	if (socketStatus == SOCKET_STATUS_ONLINE) {
		socket.sendText(data);
	}
}
// ===========================================================













//////////////////////////////////////////////////////////////////////////////////////
//                                                                                  //
//                                    GAME RULES                                    //
//                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////
// - Game board is an array of MAP_SIZExMAP_SIZE blocks                             //
// - 2 players starts at 2 corners of the game board                                //
// - Each player will take turn to move                                             //
// - Player can only move left/right/up/down and stay inside the game board         //
// - The game is over when one of 2 players cannot make a valid move                //
// - In a competitive match:                                                        //
//   + A player will lose if they cannot connect to server within 10 seconds        //
//   + A player will lose if they don't make a valid move within 3 seconds          //
//////////////////////////////////////////////////////////////////////////////////////

// ===================== PLAYER'S PART =======================
// Do not modify the code above, you won't be able to 'hack',
// all data sent to server is double checked there.
// Further more, if you cause any damage to the server or
// wrong match result, you'll be disqualified right away.
//
// When it's your turn, function "MyTurn" function will be called.
// To make a move, you must call function "Command" with input is
// the direction you want to move. The list of the argument here:
// - DIRECTION_LEFT
// - DIRECTION_UP
// - DIRECTION_RIGHT
// - DIRECTION_DOWN
//
// To give the decision, you must certainly consider the current
// board state. You can use the following variables:
// * Your position:
// - myPosition.x
// - myPosition.y
// * Your opponent position:
// - enemyPosition.x
// - enemyPosition.y
// * Board:
// - board[x][y]
// "board" is a 2D array, which will define board status.
// Square with value 0 means empty. Anything other than 0 is
// where you cannot move to.
// The full list of variable is:
// - BLOCK_EMPTY = 0;
// - BLOCK_PLAYER_1 = 1;
// - BLOCK_PLAYER_1_TRAIL = 2; Square player 1 went through before
// - BLOCK_PLAYER_2 = 3;
// - BLOCK_PLAYER_2_TRAIL = 4; Square player 2 went through before
// - BLOCK_OBSTACLE = 5;
// Which player you are? You can know it from variable "index"
// Player 1 have value 0, and player 2 have value 1, but you probably
// don't care about that anyway.
//
// That's pretty much about it. Now, let's start coding.
// ===========================================================

var directions = [DIRECTION_LEFT, DIRECTION_RIGHT, DIRECTION_UP, DIRECTION_DOWN];

var direction_commands = {};

direction_commands[DIRECTION_LEFT] 	= 	{x : -1, y :  0};
direction_commands[DIRECTION_RIGHT] = 	{x :  1, y :  0};
direction_commands[DIRECTION_UP] 	=	{x :  0, y : -1};
direction_commands[DIRECTION_DOWN] 	= 	{x :  0, y :  1};

var MYBLOCK_OBSTACLE = 100;
var WINNING_SCORE = 10000000;
var BLOCKOWNED_SCORE = 1000;

var scoreMultiplier = [0, 0.5, 1.5, 1];

/*Use temp board to avoid create new board */
var tempBoard = [];
for(var i = 0; i < MAP_SIZE; i++){
	tempBoard[i] = [];
	for(var j = 0; j < MAP_SIZE; j++){
		tempBoard[i].push(BLOCK_EMPTY);
	}
}

function Board(board, myPosition, enemyPosition){
	this.width = MAP_SIZE;
	this.height = MAP_SIZE;

	if(index == 1){
		this.myOriginalPlayer 	= BLOCK_PLAYER_1;
		this.myOriginalEnemy 	= BLOCK_PLAYER_2;
	}
	else{
		this.myOriginalPlayer 	= BLOCK_PLAYER_2;
		this.myOriginalEnemy 	= BLOCK_PLAYER_1;
	}

	this.myPlayer 	= 1;
	this.myEnemy 	= -1;

	this.positions = {};

	this.positions[this.myPlayer] = {
		x : myPosition.x,
		y : myPosition.y
	};

	this.positions[this.myEnemy] = {
		x : enemyPosition.x,
		y : enemyPosition.y
	};

	this.playerInTurn = this.myPlayer;

	var self = this;

	this.createBoard = function(){
		var newBoard = [];
		for(var i = 0; i < self.height; i++){
			newBoard[i] = [];
			for(var j = 0; j < self.width; j++){
				newBoard[i].push(BLOCK_EMPTY);
			}
		}
		self.board = board;
	};


	this.copyBoard = function(srcBoard){
		if(!self.board)
			self.createBoard();

		var board = self.board;
		var blockValue;

		for(var i = 0; i < self.height; i++){
			for(var j = 0; j < self.width; j++){
				blockValue = srcBoard[i][j];

				if(blockValue == self.myOriginalPlayer)
					blockValue = self.myPlayer;
				else if(blockValue == self.myOriginalEnemy)
					blockValue = self.myEnemy;

				board[i][j] = blockValue;
			}
		}
	};

	this.createBoard();
	this.copyBoard(board);

	this.isValidPosition = function(x, y){
		return (x >= 0) && (x < self.width) && (y >= 0) && (y < self.height) && (self.board[x][y] == BLOCK_EMPTY);
	};

	/*Check valid move, no move will be made*/
	this.isValidMove = function(direction, position){
		var direction_command = direction_commands[direction];

		position = position || self.positions[self.playerInTurn];

		var x = position.x + direction_command.x;
		var y = position.y + direction_command.y;

		return self.isValidPosition(x, y);
	};


	/*Return:
		- false: invalid move, no move has been made
		- true: valid move, move has been made
	*/
	this.makeMove = function(direction){
		var direction_command = direction_commands[direction];

		var position = self.positions[self.playerInTurn];

		var x = position.x + direction_command.x;
		var y = position.y + direction_command.y;

		if(!self.isValidPosition(x, y))
			return false;

		position.x = x;
		position.y = y;

		self.board[x][y] = self.playerInTurn;

		self.playerInTurn = -self.playerInTurn;

		return true;
	};

	this.undoMove = function(direction){
		var direction_command = direction_commands[direction];

		self.playerInTurn = -self.playerInTurn;

		var position = self.positions[self.playerInTurn];

		var x = position.x;
		var y = position.y;

		self.board[x][y] = BLOCK_EMPTY;

		x-=	direction_command.x;
		y-= direction_command.y;

		self.board[x][y] = BLOCK_EMPTY;
		if(!self.isValidPosition(x, y))
		{
			console.log("How could it be! Undo move fail!");
			return false;
		}
		position.x = x;
		position.y = y;

		self.board[x][y] = self.playerInTurn;

		return true;
	};

	//if position is passed as params it will find validMove from this position, otherwise find all valid move from currentplayer position
	this.findAllPossibleMoves = function(position){
		var possibleMoves = [];
		for( var i = 0; i < directions.length; i++){
			if (self.isValidMove(directions[i], position))
				possibleMoves.push(directions[i]);
		}
		return possibleMoves;
	};

	this.evalBoard = function () {
		var board = self.board;

		//Fill temp board with values
		for(var i = 0; i < self.height; i++){
			for(var j = 0; j < self.width; j++){
				tempBoard[i][j] = (board[i][j] == BLOCK_EMPTY?BLOCK_EMPTY:MYBLOCK_OBSTACLE);
			}
		}

		var currentPlayer = self.playerInTurn;
		var enemyPlayer = -currentPlayer;

		var currentPlayerPosition = self.positions[currentPlayer];
		var enemyPlayerPosition = self.positions[enemyPlayer];

		var currentPlayerPossibleMoves = self.findAllPossibleMoves(currentPlayerPosition);
		var enemyPlayerPossibleMoves =  self.findAllPossibleMoves(enemyPlayerPosition);

		if (currentPlayerPossibleMoves.length == 0)
			return -WINNING_SCORE;
		else if(enemyPlayerPossibleMoves.length == 0)
			return WINNING_SCORE;

		var cells_count = {};
		cells_count[currentPlayer] = -1;
		cells_count[enemyPlayer] = -1;

		tempBoard[currentPlayerPosition.x][currentPlayerPosition.y] = currentPlayer;
		tempBoard[enemyPlayerPosition.x][enemyPlayerPosition.y] = enemyPlayer;

		var queue = [];
		queue.push({
			x: currentPlayerPosition.x,
			y: currentPlayerPosition.y,
			player: currentPlayer,
			stepvalue: currentPlayer
		});

		queue.push({
			x: enemyPlayerPosition.x,
			y: enemyPlayerPosition.y,
			player: enemyPlayer,
			stepvalue: enemyPlayer
		});

		var position;
		var x, y, x_new, y_new;
		var blockValue, newStepValue;
		var direction_command;
		var possibleMoves_Scores = {};

		possibleMoves_Scores[currentPlayer] = 0;
		possibleMoves_Scores[enemyPlayer] = 0;

		while(queue.length > 0){
			position = queue.shift();

			x = position.x;
			y = position.y;

			if(tempBoard[x][y] == MYBLOCK_OBSTACLE)
				continue;

			cells_count[position.player]++;

			newStepValue = position.stepvalue + position.player;


			for( var i = 0; i < directions.length; i++){
				direction_command = direction_commands[directions[i]];

				x_new = x + direction_command.x;
				y_new = y + direction_command.y;



				if((x_new >= 0) && (x_new < self.width) && (y_new >= 0) && (y_new < self.height) && (tempBoard[x_new][y_new] != MYBLOCK_OBSTACLE)){
					/*There are two case we must check:
					 1. blockValue = BLOCK_EMPTY => add to the queue
					 2. blockValue = -(position.stepvalue + position.player) => assign tempBoard[x_new][y_new] = MYBLOCK_OBSTACLE
					*/
					blockValue = tempBoard[x_new][y_new];
					if(blockValue == BLOCK_EMPTY){
						queue.push({
							x: x_new,
							y: y_new,
							player: position.player,
							stepvalue: newStepValue
						});
						tempBoard[x_new][y_new] = newStepValue;
					}
					else if(blockValue == -newStepValue){
						tempBoard[x_new][y_new] = MYBLOCK_OBSTACLE;
					}
					possibleMoves_Scores[position.player]++;
				}
			}

		}//End while

		//Now we have number of cells each player can own
		var score = 0;

		score += cells_count[currentPlayer];
		score -= cells_count[enemyPlayer];

		score *= BLOCKOWNED_SCORE;
		score += possibleMoves_Scores[currentPlayer] - possibleMoves_Scores[enemyPlayer];

		return score;

	};

	var negaMax = function name(depth, alpha, beta) {
		var bestScore = -WINNING_SCORE;
		var score;

		if(depth == 0){
			return self.evalBoard();
		}

		var possibleMoves = self.findAllPossibleMoves();

		for(var i = 0; i < possibleMoves.length; i++){
			self.makeMove(possibleMoves[i]);

			if (self.evalBoard() <= -WINNING_SCORE){
				self.undoMove(possibleMoves[i]);
				return WINNING_SCORE + depth;
			}

			score = -negaMax(depth - 1, -beta, -alpha);
			self.undoMove(possibleMoves[i]);

			if(score >= beta)
				return score;
			if(score > alpha){
				alpha = score;
				bestScore = score;
			}

		}
		return bestScore;
	};

	this.findBestMove = function () {
		var depth = 10;
		var alpha =-WINNING_SCORE;
		var beta = WINNING_SCORE;

		var possibleMoves = self.findAllPossibleMoves();
		var bestScore = -WINNING_SCORE;
		var bestMove;
		var move, score;

		for (var i = 0; i < possibleMoves.length; i++) {
			move = possibleMoves[i];

			self.makeMove(move);

			score = -negaMax(depth - 1, -beta, -alpha);
			if(score > bestScore){
				bestScore = score;
				bestMove = move;
			}

			self.undoMove(move);
		}

		if (bestMove == null){
			bestMove = possibleMoves[(Math.random() * possibleMoves.length) >> 0];
		}
		return bestMove;
	}

}


function MyTurn() {
	// This is my testing algorithm, which will pick a random valid move, then move.
	// This array contain which move can I make.
	var myBoard = new  Board(board, myPosition, enemyPosition);
	var bestMove = myBoard.findBestMove();

	// Call "Command". Don't ever forget this. And make it quick, you only have 3 sec to call this.
	Command(bestMove);
}
