# Contributing to Botkit

The following is a set of guidelines for contributing to the Slack Pingobard Bot.
These are just guidelines, not rules, use your best judgment and feel free to
propose changes to this document in a pull request.

## Submitting Issues

* You can create an issue [here](https://github.com/colings86/slack-pingboard-bot/issues/new),
but before doing that please read the notes below and include as many details as
possible with your report. If you can, please include:
  * The version of Slack Pingobard Bot you are using
  * The operating system you are using
  * If applicable, what you were doing when the issue arose and what you
  expected to happen
* Other things that will help resolve your issue:
  * Screenshots and animated GIFs of the issue
  * Error output that appears in your terminal, dev tools or as an alert
  * Perform a [cursory search](https://github.com/howdyai/botkit/issues?utf8=✓&q=is%3Aissue+)
  to see if a similar issue has already been submitted

## Submitting Pull Requests

* Include screenshots and animated GIFs ralating to the issue in your pull
request whenever possible.
* Follow the JavaScript coding style with details from `.jscsrc` and `.editorconfig` files and use necessary plugins for your text editor.
* Write documentation in [Markdown](https://daringfireball.net/projects/markdown).
* Please follow, [JSDoc](http://usejsdoc.org/) for proper documentation.
* Use short, present tense commit messages. See [Commit Message Styleguide](#git-commit-messages).

## Styleguides

### General Code

* End files with a newline.
* Place requires in the following order:
  * Built in Node Modules (such as `path`)
  * Local Modules (using relative paths)
* Avoid platform-dependent code:
  * Use `path.join()` to concatenate filenames.
* Using a plain `return` when returning explicitly at the end of a function.
  * Not `return null`, `return undefined`, `null`, or `undefined`

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally
