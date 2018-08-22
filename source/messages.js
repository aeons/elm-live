const chalk = require("chalk");
const indent = require("indent-string");

function help() {
  return `
Only ${chalk.green("<path-to-main>")} is required.

If you have any problems, do not hesitate to file an issue:
${chalk.cyan("https://github.com/wking-io/softserve-cli")}

  `;
}

function noElmSrc(pathToElm) {
  return `
${chalk.dim("elm-live:")}
  I can’t find the command ${chalk.bold(pathToElm)}!
  Looks like ${chalk.bold(
    "elm-platform"
  )} isn’t installed. Make sure you’ve followed
  the steps at https://git.io/elm-platform and that you can call
  ${chalk.bold(pathToElm)} from your command line.

  If that fails, have a look at open issues:
  https://github.com/tomekwi/elm-live/issues .

  `;
}

function cmdNotFound(cmd) {
  return `
${chalk.dim("elm-live:")}
  I can’t find the command ${chalk.bold(cmd)}!
  Please make sure you can call ${chalk.bold(cmd)}
  from your command line.

  `;
}

function cmdError(cmd, error) {
  return `
${chalk.dim("elm-live:")}
  Error while calling ${chalk.bold(cmd)}! This output may be helpful:

${indent(String(error), 2)}

  `;
}

function cmdFailure(cmd) {
  return `
${chalk.dim("elm-live:")}
  ${chalk.bold(cmd)} failed! You can find more info above. Keep calm
  and take your time to check why the command is failing. We’ll try
  to run it again as soon as you change a file.

  `;
}

function makeFailure(cmd) {
  return `
${chalk.dim("elm-live:")}
  ${chalk.bold(cmd)} failed! You can find more info above. Keep calm
  and take your time to fix your code. We’ll try to compile it again
  as soon as you change a file.

  `;
}

function startingServer(open) {
  const openMessage = open
    ? ` We’ll open your app
in the default browser as soon as it’s up and running.`
    : "";

  return `
${chalk.dim("elm-live:")}
  The build has succeeded. Starting the server!${openMessage}

  `;
}

function rebuilding(eventName, relativePath) {
  return `
${chalk.dim("elm-live:")}
  You’ve ${eventName} \`${relativePath}\`. Rebuilding!
  
  `;
}

module.exports = {
  help,
  noElmSrc,
  cmdNotFound,
  cmdError,
  cmdFailure,
  makeFailure,
  startingServer,
  rebuilding
};
