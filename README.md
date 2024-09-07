# Securly Plus

![icon](src/icons/icon-128.png)

Dark mode and QoL improvements for [Securly Flex](https://flex.securly.com/)

most low effort extension on the chrome web store

## Features

* Dark Mode
* Show today+4 view by default

## Installation

I haven't published this to the CWS or AMO yet so you'll need to do the manual installation.

### Manual Installation

Built extension packages are on the [`Releases`](https://github.com/grimsteel/securly-plus/releases) page.

**Chrome**: Go to chrome://extensions, click `Load Unpacked`, and select the unzipped dir.

**Firefox**: Go to about:debugging, click `This Firefox`, click `Load Temporary Add-on`, and select downloaded ZIP file.

### Building from Source

There are some minor manifest differences between Chromium-based browsers and Firefox.

The `build.sh` script will generate the two manifests and copy all of the other files into the `build/chrome` and `build/firefox` directories. (requires `bash` and `jq` to run

You don't need to install the NPM dependencies unless you want better IDE type checking.
