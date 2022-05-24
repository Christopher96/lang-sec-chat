const pkg = require("./package.json");

process.send(pkg.version);
