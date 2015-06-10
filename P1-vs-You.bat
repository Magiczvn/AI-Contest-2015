cd Server
start node Server.js -h 127.0.0.1 -p 3011
cd ..
cd WebClient
start index.html
cd ..
cd Arena
IF EXIST P1.exe (
	start "Bot C++" cmd /c call P1.exe -h 127.0.0.1 -p 3011
)
ELSE IF EXIST P1.js (
	start node P1.js -h 127.0.0.1 -p 3011
)