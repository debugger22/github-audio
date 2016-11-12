/* eslint-disable no-console */

const chalk = require('chalk');
const ip = require('ip');

const divider = chalk.gray('\n-----------------------------------');

const logger = {

  // Called whenever there's an error on the server we want to print
  error: (err) => {
    console.error(chalk.red(err));
  },

  // Called whenever there's a debug log we want to print
  d: (log) => {
    console.log(chalk.blue(log));
  },

  // Called whenever there's a verbose log we want to print
  v: (log) => {
    console.log(chalk.white(log));
  },

  // Called when express.js app starts on given port w/o errors
  appStarted: (port, tunnelStarted) => {
    console.log(`Server started ${chalk.green('✓')}`);

    // If the tunnel started, log that and the URL it's available at
    if (tunnelStarted) {
      console.log(`Tunnel initialised ${chalk.green('✓')}`);
    }

    console.log(`
${chalk.bold('Access URLs:')}${divider}
Localhost: ${chalk.magenta(`http://localhost:${port}`)}
      LAN: ${chalk.magenta(`http://${ip.address()}:${port}`) +
(tunnelStarted ? `\n    Proxy: ${chalk.magenta(tunnelStarted)}` : '')}${divider}
${chalk.blue(`Press ${chalk.italic('CTRL-C')} to stop`)}
    `);
  }
};

module.exports = logger;
