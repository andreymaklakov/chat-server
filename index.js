const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const server = require("http").Server(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rooms = new Map();

app.get("/rooms/:id", function (req, res) {
  const roomId = req.params.id;
  const obj = {
    users: [...rooms.get(roomId).get("users").values()],
    messages: [...rooms.get(roomId).get("messages").values()],
  };

  res.json(obj);
});

app.post("/rooms", function (req, res) {
  const { roomId, userName, password } = req.body;
  if (!rooms.has(roomId)) {
    rooms.set(
      roomId,
      new Map([
        ["users", new Map()],
        ["messages", []],
        ["password", password],
      ])
    );
  }

  if (rooms.get(roomId).get("password") !== password) {
    res.status(403).json({ message: "Invalid password" });

    return;
  }

  res.send();
});

io.on("connection", (socket) => {
  socket.on("ROOM:JOIN", ({ roomId, userName }) => {
    socket.join(roomId);

    rooms.get(roomId).get("users").set(socket.id, userName); //save user in db

    const users = [...rooms.get(roomId).get("users").values()]; //get room all users

    socket.to(roomId).emit("ROOM:SET_USERS", users); //inform room users that i joined
  });

  socket.on("ROOM:NEW_MESSAGE", ({ roomId, userName, text }) => {
    const message = { userName, text };
    rooms.get(roomId).get("messages").push(message); // save new massage in array

    socket.to(roomId).emit("ROOM:NEW_MESSAGE", message); //send new message to all users
  });

  socket.on("disconnect", () => {
    rooms.forEach((value, roomId) => {
      if (value.get("users").delete(socket.id)) {
        const users = [...value.get("users").values()]; //get room all users

        socket.to(roomId).emit("ROOM:SET_USERS", users); //inform room users that i left room
      }
    });
  });
});

server.listen(4200, (err) => {
  if (err) {
    throw Error(err);
  }

  console.log("Server has been started");
});
