"use strict";
const constants = require("../constants");
const { commands, events } = constants.commands;

const fs = require("fs");

require.extensions[".txt"] = function (module, filename) {
  module.exports = fs.readFileSync(filename, "utf8");
};
const ascii = require("../ascii.txt");

const path = require("path");
const readline = require("readline");
const io = require("socket.io-client");

const inquirer = require("inquirer");
inquirer.registerPrompt("fuzzypath", require("inquirer-fuzzy-path"));
inquirer.registerPrompt(
  "autocomplete",
  require("inquirer-autocomplete-prompt")
);
inquirer.registerPrompt("directory", require("inquirer-select-directory"));

let local = true;
const serverUrl = local
  ? "http://localhost:3000"
  : "http://yourstorage.herokuapp.com";
// const serverUrl = "http://188.151.68.212:9999"

const socket = io(serverUrl, {
  transports: ["websocket"],
});

const savedName = "./saved.json";

function getSavedData() {
  let savedData = null;
  try {
    savedData = require(savedName);
  } catch (e) {
    savedData = {};
  }
  return savedData;
}

function saveDataType(type, newObj, callback) {
  let savedData = getSavedData();
  savedData[type] = newObj;

  fs.writeFile(savedName, JSON.stringify(savedData), "utf8", function () {
    if (callback != null) callback();
  });
}

let username = null;

function synchronizeData() {
  let data = getSavedData();
  if (data["username"] != null) {
    username = data["username"];
  }
  socket.emit(events.COMMAND, {
    command: commands.CHANGE_DATA,
    data,
  });
}

function changeUsername() {
  socket.once(events.COMMAND_RESPONSE, (response) => {
    if (response.command === commands.CHANGE_USERNAME) {
      if (response.data != false) {
        username = response.data;
        console.log("\nUsername changed to [%s]\n", username);
      } else {
        console.log("\nUnable to change username\n");
      }
      waitForKey(promptCommands);
    }
  });

  inquirer
    .prompt([
      {
        message: "New username =>",
        type: "input",
        name: "username",
      },
    ])
    .then(function (answers) {
      let username = answers.username;
      saveDataType("username", username);

      socket.emit(events.COMMAND, {
        command: commands.CHANGE_USERNAME,
        username,
      });
    });
}

function logId() {
  console.log(ascii);
  if (username != null)
    console.log("Connected as: [%s] %s\n", username, socket.id);
  else console.log("Connected as: %s\n", socket.id);
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function clearLine() {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}

function clearConsole() {
  process.stdout.write("\x1B[2J\x1B[0f");
}

function waitForKey(callback) {
  console.log("Press any key to continue.");
  process.stdin.resume();
  process.stdin.once("data", function () {
    callback();
  });
}

function printTitle(title) {
  console.log("\n%s", title);
  console.log("---------------");
}

function printEnd() {
  console.log("---------------\n");
}

function printMessages() {
  printTitle("Messages");
  if (messages.length) {
    messages.forEach((data) => {
      console.log("%s: %s", getUserString(data.fromUser), data.message);
    });
  } else {
    console.log("No new messages");
  }
  printEnd();
  waitForKey(promptCommands);
}

function promptCommands() {
  clearConsole();
  logId();

  let choices = [
    { name: "Change username", value: commands.CHANGE_USERNAME },
    { name: "List users", value: commands.LIST_USERS },
    { name: "Message user", value: commands.MESSAGE },
    { name: "View messages", value: commands.VIEW_MESSAGES },
    { name: "Exit", value: commands.EXIT },
  ];

  inquirer
    .prompt([
      {
        message: "What do you want to do?",
        type: "list",
        choices,
        name: "command",
      },
    ])
    .then(function (answers) {
      clearConsole();
      switch (answers.command) {
        case commands.CHANGE_USERNAME:
          changeUsername();
          break;
        case commands.LIST_USERS:
          listUsers();
          break;
        case commands.MESSAGE:
          promptSelectUser((selectedUser) => {
            messageUser(selectedUser);
          });
          break;
        case commands.KICK:
          promptSelectUser((selectedUser) => {
            kickUser(selectedUser);
          });
          break;
        case commands.VIEW_MESSAGES:
          printMessages();
          break;
        case commands.EXIT:
          process.exit(0);
          break;
        default:
          break;
      }
    });
}

function getUserString(user) {
  let string = "";
  if (user.username != null) string = "[" + user.username + "] ";
  string += user.id;
  return string;
}

function getUserStrings(users) {
  let strings = [];
  users.forEach(function (user) {
    strings.push(getUserString(user));
  });
  return strings;
}

function listUsers() {
  socket.once(events.COMMAND_RESPONSE, (response) => {
    if (response.command === commands.LIST_USERS) {
      printTitle("Users connected");
      let strings = getUserStrings(response.data);
      strings.forEach((user) => {
        console.log(user);
      });
      printEnd();
      waitForKey(promptCommands);
    }
  });
  socket.emit(events.COMMAND, {
    command: commands.LIST_USERS,
  });
}

function promptSelectUser(callback) {
  socket.once(events.COMMAND_RESPONSE, (response) => {
    if (response.command === commands.LIST_USERS) {
      let choices = response.data.map((user) => {
        return {
          name: getUserString(user),
          value: user.id,
        };
      });

      inquirer
        .prompt([
          {
            message: "Select a user",
            type: "list",
            choices,
            name: "selectedUser",
          },
        ])
        .then(function (answers) {
          callback(answers.selectedUser);
        });
    }
  });
  socket.emit(events.COMMAND, {
    command: commands.LIST_USERS,
  });
}

function messageUser(userId) {
  inquirer
    .prompt([
      {
        message: "=>",
        type: "input",
        name: "message",
      },
    ])
    .then(function (answers) {
      socket.emit(events.MESSAGE, {
        message: answers.message,
        targetId: userId,
      });
      console.log("Message sent!");
      waitForKey(promptCommands);
    });
}

let messages = [];

socket.on(events.MESSAGE_RECEIVED, (message) => {
  messages.push(message);
});

socket.on("connect", () => {
  synchronizeData();
  promptCommands();
});

// on reconnection, reset the transports option, as the Websocket
// connection may have failed (caused by proxy, firewall, browser, ...)
socket.on("reconnect_attempt", () => {
  socket.io.opts.transports = ["polling", "websocket"];
});
