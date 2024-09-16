<h1 style="display: flex; align-items: center;">
  <img src="src/icons/icon-32.png" alt="icon" />
  Securly Plus
</h1>

Dark mode and QoL improvements for [Securly Flex](https://flex.securly.com/)

## Features

* Dark Mode
* Customize the default schedule tab
* Customize the default screen
* **Incredible performance improvements**

## Installation

<p>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/securly-plus/"><img src="https://extensionworkshop.com/assets/img/documentation/publish/get-the-addon-178x60px.dad84b42.png" alt="firefox addon" /></a>
  <a href="https://chromewebstore.google.com/detail/securly-plus/cdnhkencehfaddihoojmappngkalgjfn"><img src="https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png" alt="firefox addon" /></a>
</p>

### Manual Installation

Built extension packages are on the [`Releases`](https://github.com/grimsteel/securly-plus/releases) page.

**Chrome**: Go to chrome://extensions, click `Load Unpacked`, and select the unzipped dir.

**Firefox**: Go to about:debugging, click `This Firefox`, click `Load Temporary Add-on`, and select downloaded ZIP file.

### Building from Source

There are some minor manifest differences between Chromium-based browsers and Firefox.

The `build.sh` script will generate the two manifests and copy all of the other files into the `build/chrome` and `build/firefox` directories. (requires `bash` and `jq` to run)

You don't need to install the NPM dependencies unless you want better IDE type checking.
