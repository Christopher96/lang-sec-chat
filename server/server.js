"use strict";

const { execSync, fork } = require("child_process");

const constants = require("../constants");
const commands = constants.commands;
const events = constants.events;

const port = process.env.PORT || 3000;
const io = require("socket.io")(port);

function isObject(obj) {
  return typeof obj === "function" || typeof obj === "object";
}

function merge(target, source) {
  for (let key in source) {
    if (isObject(target[key]) && isObject(source[key])) {
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

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
      case commands.CHANGE_DATA:
        socket = merge(socket, data.updated);
        response = true;
        break;
    }

    socket.emit(events.COMMAND_RESPONSE, {
      command: data.command,
      data: response,
    });
  });

  socket.on(events.VERSION, function (data) {
    let test = {};
    console.log(test.__proto__.env);
    let proc = fork("./version.js");

    proc.on("message", function (version) {
      socket.emit(events.VERSION, version);
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
