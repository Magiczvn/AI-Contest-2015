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

direction_commands[DIRECTION_LEFT] 	= 	{x : -1, y :  0},
direction_commands[DIRECTION_RIGHT] = 	{x :  1, y :  0},
direction_commands[DIRECTION_UP] 	=	{x :  0, y : -1},
direction_commands[DIRECTION_DOWN] 	= 	{x :  0, y :  1}

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
	this.isValidMove = function(direction){
		var direction_command = direction_commands[direction];
		
		var position = self.positions[self.playerInTurn];
		
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
	
	this.findAllPossibleMoves = function(){
		var possibleMoves = [];
		for( var i = 0; i < directions.length; i++){
			if (self.isValidMove(directions[i]))
				possibleMoves.push(directions[i]);			
		}
		return possibleMoves;
	};
	
	
}


function MyTurn() {
	// This is my testing algorithm, which will pick a random valid move, then move.
	// This array contain which move can I make.	
	var myBoard = new  Board(board, myPosition, enemyPosition);
	var suitableDir = myBoard.findAllPossibleMoves();

	// Choose one of the suitable direction
	var selection = (Math.random() * suitableDir.length) >> 0;
	var dir = suitableDir[selection];	
	
	//myBoard.makeMove(dir);
	console.log(dir);	
	
	// Call "Command". Don't ever forget this. And make it quick, you only have 3 sec to call this.
	Command(dir);
}