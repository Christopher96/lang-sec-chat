module.exports = {
  commands: {
    CHANGE_USERNAME: "change_username",
    CHANGE_DATA: "change_data",
    LIST_USERS: "list_users",
    VIEW_MESSAGES: "view_messages",
    MESSAGE: "message",
    KICK: "kick",
    EXIT: "exit",
  },
  events: {
    KICK: "kick",
    MESSAGE: "message",
    MESSAGE_RECEIVED: "message_received",
    COMMAND: "command",
    COMMAND_RESPONSE: "command_response",
  },
};
