// ================== HOW TO USE THIS SHIT ===================
// Call:
// "node server.js -p [port] -k [key1] [key2]"
//
// If no argument given, gameID will be 0, port will be 3011
// ===========================================================


// Get the listening port from argurment
var VERSION = 1;
var isCompetitive = false;
var matchID = 0;
var listeningPort = 3011;
var key1 = 0;
var key2 = 0;
for (var i=0; i<process.argv.length; i++) {
	if (process.argv[i] == "-p") {
		listeningPort = process.argv[i + 1];
	}
	else if (process.argv[i] == "-k") {
		key1 = process.argv[i + 1];
		key2 = process.argv[i + 2];
	}
}

if (listeningPort == null || listeningPort == 0) {
	listeningPort = 3011;
}

if (key1 == null) key1 = 0;
if (key2 == null) key2 = 0;

if (key1 != 0 && key2 != 0) {
	isCompetitive = true;
}








// THE GAME ITSELF
var CONNECTING_TIME = 10000;
var THINKING_TIME = 3000;


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

var MAP_SIZE = 11;

var map = new Array();
var playerPos = new Array();
var originalTurnFirst = TURN_PLAYER_1;
var turn = TURN_PLAYER_1;
var gameState = GAMESTATE_WAIT_FOR_PLAYER;
var winner = 0;
var timeOutTimer = null;
var gameReplay = "";

// Position object
function Position(x, y) {
	this.x = x;
	this.y = y;
}

// Generate a random map
function GenerateMap() {
	// Set all block to empty
	for (var i=0; i<MAP_SIZE * MAP_SIZE; i++) {
		map[i] = BLOCK_EMPTY;
	}
	
	// Random 5 obstacles on just one side
	for (var i=0; i<5; i++) {
		// Find a random block, but not around starting point
		var OK = false;
		while (!OK) {
			block = (Math.random() * 59) >> 0;
			if (block ==  0 || block ==  1 || block ==  2
			||  block == 10 || block == 11 || block == 12
			||  block == 20 || block == 21 || block == 22
			||  map[block] == BLOCK_OBSTACLE) {
				// Avoid block too near to the starting point.
				// It might block one player entirely
			}
			else {
				OK = true;
			}
		}
		
		// Assign to that block
		map[block] = BLOCK_OBSTACLE;
		
		// Assign opposite block
		map[MAP_SIZE * MAP_SIZE - 1 - block] = BLOCK_OBSTACLE;
	}
	
	// Player 1 start position
	playerPos[TURN_PLAYER_1] = new Position (0, 0);
	map[0] = BLOCK_PLAYER_1;

	// Player 2 start position
	playerPos[TURN_PLAYER_2] = new Position (MAP_SIZE - 1, MAP_SIZE - 1);
	map[MAP_SIZE * MAP_SIZE - 1] = BLOCK_PLAYER_2;
}


// Init a totally new game
function InitGame() {
	// Generate a random map
	GenerateMap();
	
	// Add map detail to replay
	for (var i=0; i<MAP_SIZE * MAP_SIZE; i++) {
		gameReplay += map[i];
	}
	
	// Who will turn first?
	if (Math.random() < 0.5) {
		turn = TURN_PLAYER_1;
	}
	else {
		turn = TURN_PLAYER_2;
	}
	originalTurnFirst = turn;
	
	// Save this info to replay also
	gameReplay += turn;
	
	// Now if this is a competitive game, we won't accept bot that doesn't connect
	if (isCompetitive == true) {
		timeOutTimer = setTimeout (ConnectionTimeOut, CONNECTING_TIME);
	}
}

// Enough player have connected, let's start the game
function StartGame () {
	if (gameState == GAMESTATE_WAIT_FOR_PLAYER) {
		gameState = GAMESTATE_COMMENCING;
		Broadcast();
		
		if (isCompetitive == true) {
			if (timeOutTimer != null) clearTimeout(timeOutTimer);
			timeOutTimer = setTimeout (TimeOut, THINKING_TIME);
		}
	}
}

// Command given
function Command (player, dir) {
	// Validation
	if (gameState == GAMESTATE_COMMENCING && turn == player) {
		if (dir == DIRECTION_LEFT) {
			if (playerPos[player].x > 0 && map[ConvertCoord(playerPos[player].x-1, playerPos[player].y)] == 0) {
				var startPos = playerPos[player];
				playerPos[player] = new Position (playerPos[player].x-1, playerPos[player].y);
				gameReplay += dir;
				Turn (startPos, playerPos[player]);
			}
		}
		else if (dir == DIRECTION_UP) {
			if (playerPos[player].y > 0 && map[ConvertCoord(playerPos[player].x, playerPos[player].y-1)] == 0) {
				var startPos = playerPos[player];
				playerPos[player] = new Position (playerPos[player].x, playerPos[player].y-1);
				gameReplay += dir;
				Turn (startPos, playerPos[player]);
			}
		}
		else if (dir == DIRECTION_RIGHT) {
			if (playerPos[player].x < MAP_SIZE - 1 && map[ConvertCoord(playerPos[player].x+1, playerPos[player].y)] == 0) {
				var startPos = playerPos[player];
				playerPos[player] = new Position (playerPos[player].x+1, playerPos[player].y);
				gameReplay += dir;
				Turn (startPos, playerPos[player]);
			}
		}
		else if (dir == DIRECTION_DOWN) {
			if (playerPos[player].y < MAP_SIZE - 1 && map[ConvertCoord(playerPos[player].x, playerPos[player].y+1)] == 0) {
				var startPos = playerPos[player];
				playerPos[player] = new Position (playerPos[player].x, playerPos[player].y+1);
				gameReplay += dir;
				Turn (startPos, playerPos[player]);
			}
		}
	}
}

// Player have made a valid turn
function Turn (startPos, endPos) {
	// Set the map, and the turn
	if (turn == TURN_PLAYER_1) {
		map[ConvertCoord(startPos.x, startPos.y)] = BLOCK_PLAYER_1_TRAIL;
		map[ConvertCoord(endPos.x, endPos.y)] = BLOCK_PLAYER_1;
		turn = TURN_PLAYER_2;
	}
	else if (turn == TURN_PLAYER_2) {
		map[ConvertCoord(startPos.x, startPos.y)] = BLOCK_PLAYER_2_TRAIL;
		map[ConvertCoord(endPos.x, endPos.y)] = BLOCK_PLAYER_2;
		turn = TURN_PLAYER_1;
	}
	
	// Check if the next player have a valid move
	CheckVictory();
	
	// Wow, television, awesome!
	Broadcast();
	
	// bot = 1 means this is a competitive game, created by the server
	// Set a time-out, if the player cannot give a move within this time, he's lost.
	if (isCompetitive == true) {
		if (timeOutTimer != null) clearTimeout(timeOutTimer);
		timeOutTimer = setTimeout (TimeOut, THINKING_TIME);
	}
}

function CheckVictory() {
	// If the current player have a valid move, this function does nothing
	if (playerPos[turn].x > 0 && map[ConvertCoord(playerPos[turn].x-1, playerPos[turn].y)] == 0) {
		return;
	}
	if (playerPos[turn].y > 0 && map[ConvertCoord(playerPos[turn].x, playerPos[turn].y-1)] == 0) {
		return;
	}
	if (playerPos[turn].x < MAP_SIZE - 1 && map[ConvertCoord(playerPos[turn].x+1, playerPos[turn].y)] == 0) {
		return;
	}
	if (playerPos[turn].y < MAP_SIZE - 1 && map[ConvertCoord(playerPos[turn].x, playerPos[turn].y+1)] == 0) {
		return;
	}
	
	// Check the other player also in case of a draw
	if ((playerPos[3 - turn].x > 0 && map[ConvertCoord(playerPos[3 - turn].x-1, playerPos[3 - turn].y)] == 0)
	||  (playerPos[3 - turn].y > 0 && map[ConvertCoord(playerPos[3 - turn].x, playerPos[3 - turn].y-1)] == 0)
	||  (playerPos[3 - turn].x < MAP_SIZE - 1 && map[ConvertCoord(playerPos[3 - turn].x+1, playerPos[3 - turn].y)] == 0)
	||  (playerPos[3 - turn].y < MAP_SIZE - 1 && map[ConvertCoord(playerPos[3 - turn].x, playerPos[3 - turn].y+1)] == 0)) {
		// The other player still have a move, so this guy is a winner
		if (turn == TURN_PLAYER_1) {
			EndGame(TURN_PLAYER_2);
		}
		else if (turn == TURN_PLAYER_2) {
			EndGame(TURN_PLAYER_1);
		}
	}
	else {
		// The other player also doesn't have any move left
		if (turn == originalTurnFirst) {
			// If both guy stuck, but who turn first stuck first, it's a draw
			EndGame(3);
		}
		else {
			// If both guy stuck, but who turn first stuck after, he's the winner
			EndGame(originalTurnFirst);
			
		}
	}
}


function TimeOut() {
	// If a guy turn and he did not response, the other win
	if (turn == TURN_PLAYER_1) {
		EndGame(TURN_PLAYER_2);
	}
	else if (turn == TURN_PLAYER_2) {
		EndGame(TURN_PLAYER_1);
	}
	
	//Television about your defeat
	Broadcast();
}

function ConnectionTimeOut() {
	// If after a while, 2 bots don't show up, (or one of them)
	for (var i=0; i<2; i++) {
		if (socketList[i] != null) {
			if (socketList[i].index == 1) {	
				EndGame (TURN_PLAYER_1);
				return;
			}
			else if (socketList[i].index == 2) {	
				EndGame (TURN_PLAYER_2);
				return;
			}
		}
	}
	
	// If 2 bots doesn't show up, it's a draw.
	EndGame (3);
}



function EndGame (w) {
	// Game end, there is a winner
	gameState = GAMESTATE_END;
	winner = w;
		
	// Print the result for the parent
	console.log (winner + gameReplay);
	
	// Shutdown after 0.2 sec
	setTimeout (function () {
		CloseServer();
	}, 200);
}

function ConvertCoord (x, y) {
	return y * MAP_SIZE + x;
}






var SOCKET_STATUS_ONLINE = 1;
var SOCKET_STATUS_OFFLINE = 0;

var socketList = new Array();
var socketStatus = new Array();

var ws = require("./NodeWS");
var server = ws.createServer(function (socket) {
	// Detect to see if this socket have already connected before
	for (var i=0; i<socketList.length; i++) {
		if (socketList[i] == socket) {	
			socketStatus[i] = SOCKET_STATUS_ONLINE;
		}
	}
	
	// This socket is new
	var index = socketList.length;
	socketList[index] = socket;
	socketStatus[index] = SOCKET_STATUS_ONLINE;
	
	
	// Receive a text
    socket.on("text", function (data) {
		var command = data[0].charCodeAt(0);
		var argument = data[1].charCodeAt(0);
		
		// First, if we receive an indexing command
		if (command == COMMAND_SEND_KEY) {
			if (socket.index == null) {
				// Get the key
				var key = argument;
				var version = 0;
				if (data[2] != null) {
					version = data[2].charCodeAt(0);
				}
				
				if (isCompetitive == false) {
					// If this is not a competitive match
					// We just provide index according to
					// connection order
					for (var i=0; i<socketList.length; i++) {
						if (socketList[i] == socket) {
							socket.index = i + 1;
						}
					}
				}
				else {
					// Else, we compare the key
					if (key == key1 && version == VERSION) {
						socket.index = 1;
					}
					else if (key == key2 && version == VERSION) {
						socket.index = 2;
					}
					else {
						// This is observer case
						socket.index = 3;
					}
				}
				
				// Send index to client
				var data = "";
				data += String.fromCharCode(COMMAND_SEND_INDEX);
				data += String.fromCharCode(socket.index);
				socket.sendText(data);
			}
			
			// If two players are ready, we start the game.
			var player1Ready = false;
			var player2Ready = false;
			for (var i=0; i<socketList.length; i++) {
				if (socketList[i].index == 1) {
					player1Ready = true;
				}
				else if (socketList[i].index == 2) {
					player2Ready = true;
				}
				
				if (player1Ready && player2Ready) {
					StartGame();
				}
			}
		}
		else if (command == COMMAND_SEND_DIRECTION) {
			// If we receive a command, move
			Command (socket.index, argument);
		}
    });
	
	// This socket disconnected
    socket.on("close", function (code, reason) {
        for (var i=0; i<socketList.length; i++) {
			if (socketList[i] == socket) {
				socketStatus[i] = SOCKET_STATUS_OFFLINE;
			}
		}
    });
	
	// Error is treated same as disconnected
	socket.on("error", function (code, reason) {
        for (var i=0; i<socketList.length; i++) {
			if (socketList[i] == socket) {
				socketStatus[i] = SOCKET_STATUS_OFFLINE;
			}
		}
    });
}).listen(listeningPort);

function Broadcast () {
	var data = "";
	data += String.fromCharCode(COMMAND_SEND_STAGE);
	data += String.fromCharCode(gameState);
	data += String.fromCharCode(turn);
	data += String.fromCharCode(winner);
	for (var i=0; i<MAP_SIZE * MAP_SIZE; i++) {
		data += String.fromCharCode(map[i]);
	}
	
	// Send the data to all socket
	for (var i=0; i<socketList.length; i++) {
		if (socketStatus[i] == SOCKET_STATUS_ONLINE) {
			socketList[i].sendText(data);
		}
	}
}


function CloseServer() {
	for (var i=0; i<socketList.length; i++) {
		if (socketStatus[i] == SOCKET_STATUS_ONLINE) {
			socketList[i].close (1000, "Game end!");
		}
	}
	process.exit(0);
}

InitGame();