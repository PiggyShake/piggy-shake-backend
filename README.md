Piggy Shake Backend
==========================

To start a project:

		git clone https://github.com/PiggyShake/piggy-shake-backend.git
		cd piggy-shake-backend
		(Ubuntu)
		sudo apt-get update
        sudo apt-get install redis-server
        redis-server
        node server.js

To test the app:

        Install Simply Web Socket (Chrome) http://bit.ly/1hp83DK
        Set the url to ws://0.0.0.0:8080
        Click "Open" to open a session with the server
        Enter a request, like the one below
        { "groupID":"testGroup", "devID":"testUser", "shake":"true" , "username":"testUsername" }

        Click "Send" to send the request
        The message log populates with sent requests in red and recieved response in black
