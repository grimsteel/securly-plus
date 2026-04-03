<h1 style="display: flex; align-items: center;">
  <img src="src/icons/icon-32.png" alt="icon" />
  Securly Plus
</h1>

Dark mode and QoL improvements for [Securly Flex](https://flex.securly.com/)

## Features

* Dark Mode
* Customize the default schedule tab
* Customize the default screen
* Flex into certain sessions which display as full
* Quickly flex into multiple sessions at once
* **Incredible performance improvements**

More info + screenshots: https://securly-plus.kameswar.com

## Installation

<p>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/securly-plus/"><img src="site/firefox-get-addon.png" alt="firefox addon" /></a>
  <a href="https://chromewebstore.google.com/detail/securly-plus/cdnhkencehfaddihoojmappngkalgjfn"><img src="site/chrome-web-store.png" alt="chrome extension" /></a>
</p>

### Manual Installation

Built extension packages are on the [`Releases`](https://github.com/grimsteel/securly-plus/releases) page.

**Chrome**: Go to chrome://extensions, click `Load Unpacked`, and select the unzipped dir.

**Firefox**: Go to about:debugging, click `This Firefox`, click `Load Temporary Add-on`, and select downloaded ZIP file.

### Building from Source

There are some minor manifest differences between Chromium-based browsers and Firefox.

The `build.sh` script will generate the two manifests and copy all of the other files into the `build/chrome` and `build/firefox` directories. (requires `bash` and `jq` to run).

`npm install` must be run before the build script to install `esbuild`, `idb`, and `@jridgewell/trace-mapping`.
