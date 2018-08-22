/*
  ({
    outputStream: WritableStream,
    inputStream: ReadableStream,
  }) =>
    exitCode: Integer | Null
*/
module.exports = (argv, options) => {
  const chalk = require("chalk");
  const messages = require("./messages");
  const packageJson = require("../package.json");
  const parseArgs = require("./parse-args");

  const outputStream = options.outputStream;
  const inputStream = options.inputStream;
  const args = parseArgs(argv);

  const SUCCESS = 0;
  const FAILURE = 1;

  // Output version
  if (args.version) {
    outputStream.write(`${chalk.bold("elm-live")} v${packageJson.version}\n`);
    return SUCCESS;
  }

  const path = require("path");
  const fs = require("fs");
  const spawnSync = require("cross-spawn").sync;
  const hasbinSync = require("hasbin").sync;

  // Display help
  if (args.help) {
    if (hasbinSync("man")) {
      const manpagePath = path.resolve(__dirname, "../manpages/elm-live.1");
      const manProcess = spawnSync("man", [manpagePath], {
        stdio: [inputStream, outputStream, outputStream]
      });

      if (manProcess.error) throw manProcess.error;
    } else {
      const fallbackPath = path.resolve(
        __dirname,
        "../manpages/elm-live.1.txt"
      );
      const plainTextHelp = fs.readFileSync(fallbackPath, "utf8");
      outputStream.write(plainTextHelp + messages.help());
    }

    return SUCCESS;
  }

  const budo = require("budo");
  const chokidar = require("chokidar");
  const debounce = require("./debounce");

  const auxiliaryBuild = execPath => {
    if (!execPath) {
      return { fatal: false, exitCode: SUCCESS };
    }

    const process = spawnSync(execPath, [], {
      stdio: [inputStream, outputStream, outputStream]
    });

    if (process.error && process.error.code === "ENOENT") {
      outputStream.write(messages.cmdNotFound(execPath));

      return { fatal: true, exitCode: FAILURE };
    } else if (process.error) {
      outputStream.write(messages.cmdError(execPath, process.error));
    }

    if (args.recover && process.status !== SUCCESS)
      outputStream.write(messages.cmdFailure(execPath));

    return { fatal: false, exitCode: process.status };
  };

  // Build logic
  const build = () => {
    const beforeBuild = auxiliaryBuild(args.beforeBuild);
    if (beforeBuild.exitCode !== SUCCESS) {
      return beforeBuild;
    }

    const elmMake = spawnSync(args.pathToElm, ["make", ...args.elmMakeArgs], {
      stdio: [inputStream, outputStream, outputStream]
    });

    if (elmMake.error && elmMake.error.code === "ENOENT") {
      outputStream.write(messages.noElmSrc(args.pathToElm));
      return { fatal: true, exitCode: FAILURE };
    } else if (elmMake.error) {
      outputStream.write(messages.cmdError("elm make", elmMake.error));
    }

    if (args.recover && elmMake.status !== SUCCESS)
      outputStream.write(messages.makeFailure("elm make"));

    const afterBuild = auxiliaryBuild(args.afterBuild);
    if (afterBuild.exitCode !== SUCCESS) {
      return afterBuild;
    }

    return { fatal: false, exitCode: elmMake.status };
  };

  // Server logic
  let serverStarted;
  const startServer = () => {
    outputStream.write(messages.startingServer(args.open));
    const server = budo({
      live: true,
      watchGlob: path.join(args.dir, "**/*.{html,css,js}"),
      port: args.port,
      host: args.host,
      open: args.open,
      dir: args.dir,
      stream: outputStream,
      pushstate: args.pushstate
    });
    server.on("error", error => {
      throw error;
    });

    serverStarted = true;
  };

  // First build
  const firstBuildResult = build();
  if (
    firstBuildResult.fatal ||
    (!args.recover && firstBuildResult.exitCode !== SUCCESS)
  ) {
    return firstBuildResult.exitCode;
  } else if (firstBuildResult.exitCode === SUCCESS) {
    startServer();
  }

  const eventNameMap = {
    add: "added",
    addDir: "added",
    change: "changed",
    unlink: "removed",
    unlinkDir: "removed"
  };

  // Watch Elm files
  const watcher = chokidar.watch("**/*.elm", {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: "elm-stuff/generated-code/*"
  });

  watcher.on(
    "all",
    debounce((event, filePath) => {
      const eventName = eventNameMap[event] || event;
      const relativePath = path.relative(process.cwd(), filePath);

      outputStream.write(messages.rebuilding(eventName, relativePath));

      const buildResult = build();
      if (!serverStarted && buildResult.exitCode === SUCCESS) {
        startServer();
      }
    }),
    100
  );

  return null;
};
