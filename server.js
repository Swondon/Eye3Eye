const express = require('express');
const app = express();
const port = process.env.PORT || 4004;
const http = require('http');
const server = http.createServer(app); // Create HTTP server
const { Server } = require('socket.io'); // Import Server from socket.io
const io = new Server(server, {
   cors: {
       origin: "*",
       methods: ["GET", "POST"],
       transports: ['polling', 'websocket'], // Allow fallback to polling
   }
});



const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});
let userOrder = [];
let ready = false;

let globalToRemove = 0;

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/peerjs', peerServer);

app.get('/', (req, res) => {
   res.sendFile(__dirname + '/views/open.html');
})

app.get('/room.ejs', (req, res) => {
   res.redirect(`/ians-special-testing-room`);
})

app.get('/clearMeeting', (req, res) => {
   io.emit('redirectHome');
   userOrder = [];
   console.log('Cleared users from meeting');
})

app.get('/userCount', (req, res) => {
   res.json({ data: userOrder.length });
})

app.get('/:room', (req, res) => {
   res.render('room', { roomId: req.params.room });
})

io.on('connection', socket => {

   socket.on('join-room', (roomId, userId) => {
      userOrder.push(userId);
      console.log(userId + " joined room");
      socket.join(roomId);
      //right here, let's update the order, then attach the new order to user-connected
      //userOrder.push(roomId);
      console.log(userOrder);
      //EXLCUSIVE FOR TESTING: Add a step passing the secondaryID to any new client, then increment the secondary.
      // Emit user-connected event with the newly joined user's ID and the current user order
      socket.to(roomId).emit('user-connected', userId, userOrder, ready);

      socket.on('message', (message, selfID) => {
         io.to(roomId).emit('createMessage', message, selfID);
      })


      socket.on('leave-meeting', (toRemove) => {
         console.log(userOrder[toRemove] + " left room");
         userOrder = [];
         globalToRemove = toRemove;
         io.emit('leaveMeetingAllocation', toRemove);
      });

      socket.on('meeting-ready', (toRemove) => {
         if (ready == false && userOrder.length == 3) {
            ready = true;
            socket.broadcast.to(roomId).emit('add-videos-full', userId, userOrder);
         } else if (userOrder.length == 2) {
            socket.broadcast.to(roomId).emit('add-videos-full', userId, userOrder);
         }
      });

      socket.on('printer', (thisIndex) => {
         console.log(thisIndex);
      });


   })
})

server.listen(port, () => {
   console.log(`Eye2Eye listening on port ${port}`)
})