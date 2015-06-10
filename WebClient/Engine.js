var CANVAS_W = 660;
var CANVAS_H = 760;

var g_mainDiv = document.getElementById ("Main");
function Resize() {
	var scaleX = window.innerWidth / CANVAS_W;
	var scaleY = window.innerHeight / CANVAS_H;
	var scaleToFit = Math.min(scaleX, scaleY);
	
	g_mainDiv.style.transform = "scale("+scaleToFit+")";
	g_mainDiv.style.webkitTransform = "scale("+scaleToFit+")";
	g_mainDiv.style.MozTransform = "scale("+scaleToFit+")";
	g_mainDiv.style.msTransform = "scale("+scaleToFit+")";
	g_mainDiv.style.OTransform = "scale("+scaleToFit+")";
}

window.onresize = Resize;

Resize();

var g_connectButton = document.getElementById ("Connect");
var g_messageDiv = document.getElementById ("Message");


var SOCKET_IDLE = 0;
var SOCKET_CONNECTING = 1;
var SOCKET_CONNECTED = 2;

var COMMAND_SEND_KEY = 1;
var COMMAND_SEND_INDEX = 2;
var COMMAND_SEND_DIRECTION = 3;
var COMMAND_SEND_STAGE = 4;

//var host = "10.205.8.112";
var host = "127.0.0.1";
var port = "3011";
var ws = null;
var netStatus = SOCKET_IDLE;

function Connect() {
	if (netStatus == SOCKET_IDLE) {
		g_connectButton.style.visibility = "hidden";
		ws = new WebSocket("ws://" + host + ":" + port);
		ws.onopen = function() {
			netStatus = SOCKET_CONNECTED;
			var data = "";
			data += String.fromCharCode(COMMAND_SEND_KEY);
			data += String.fromCharCode(0);
			Send(data);
		};
		ws.onmessage = function (evt) { 
			var data = evt.data;
			var command = data[0].charCodeAt(0);
			if (command == COMMAND_SEND_INDEX) {
				SetPlayerIndex (data[1].charCodeAt(0));
			}
			else if (command == COMMAND_SEND_STAGE) {
				OnMessage (data);
			}
			
		};
		ws.onclose = function() { 
			netStatus = SOCKET_IDLE;
			ws = null;
			g_connectButton.style.visibility = "visibile";
			g_messageDiv.innerHTML = "Server offline";
		};
		netStatus = SOCKET_CONNECTING;
	}
}

function Send(msg) {
	if (netStatus == SOCKET_CONNECTED) {
		ws.send(msg);
	}
}