"use strict";

const constants = require("../constants");
const commands = constants.commands;
const events = constants.events;

const port = process.env.PORT || 3000;
const io = require("socket.io")(port);

io.on("connection", (socket) => {
  console.log("Client detected [%s]", socket.id);

  socket.on(events.COMMAND, function (data) {
    console.log("[%s] Command: %s", socket.id, data.command);

    let response = false;

    switch (data.command) {
      case commands.LIST_USERS:
        response = fetchUsers(socket.id);
        break;
      case commands.CHANGE_USERNAME:
        socket.username = data.username;
        response = socket.username;
        break;
    }

    socket.emit(events.COMMAND_RESPONSE, {
      command: data.command,
      data: response,
    });
  });

  socket.on(events.MESSAGE, function (data) {
    console.log(
      "[%s] -> [%s] Message: %s",
      socket.id,
      data.targetId,
      data.message
    );
    socket.to(data.targetId).emit(events.MESSAGE_RECEIVED, {
      fromUser: getUser(socket),
      message: data.message,
    });
  });

  socket.on("disconnected", () => {
    console.log("user disconnected");
  });
});

function getUser(socket) {
  let user = {
    id: socket.id,
  };
  if (socket.username != null) user.username = socket.username;

  return user;
}

function fetchUsers(filterId) {
  let users = [];
  Object.values(io.sockets.connected).map(function (socket) {
    if (socket.id != filterId) users.push(getUser(socket));
  });
  return users;
}
