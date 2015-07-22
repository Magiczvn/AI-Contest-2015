pushd Server
start node Server.js -h 127.0.0.1 -p 3011
popd
pushd WebClient
start index.html
popd
pushd Arena
IF EXIST P1.exe (
	start "Bot C++" cmd /c call P1.exe -h 127.0.0.1 -p 3011
) ELSE IF EXIST P2.js (
	node P2.js -h 127.0.0.1 -p 3011
) ELSE IF EXIST P1.jar (
	start "Bot Java" cmd /c call java -jar P1.jar -h 127.0.0.1 -p 3011
)
popd
pause