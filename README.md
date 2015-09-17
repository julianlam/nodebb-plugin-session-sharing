# Quickstart Plugin for NodeBB

A starter kit for quickly creating NodeBB plugins. Comes with a pre-setup LESS file, server side JS script with an `action:app.load` hook, and a client-side script. Most plugins need at least one of the above, so this ought to save you some time. For a full list of hooks have a look at our [wiki page](https://github.com/NodeBB/NodeBB/wiki/Hooks), and for more information about creating plugins please visit our [documentation portal](https://docs.nodebb.org/).

Fork this or copy it, and using your favourite text editor find and replace all instances of `nodebb-plugin-quickstart` with `nodebb-plugin-your-plugins-name`. Change the author's name in the LICENSE and package.json files.

Once you're done don't forget to publish it on NPM, and make a thread about it [here](https://docs.nodebb.org/en/latest/plugins/hooks.html).


## Hello World

Really simple, just edit `static/lib/main.js` and paste in `console.log('hello world');`, and that's it!

## Installation

    npm install nodebb-plugin-quickstart

## Screenshots

Don't forget to add screenshots!
