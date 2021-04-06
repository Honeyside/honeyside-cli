# Envato Package Manager [![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/envato-cli.svg
[npm-url]: https://www.npmjs.com/package/envato-cli

The Envato Package Manager offers several features that will enhance your experience as Envato user, both for authors and for buyers.

Support us on <a href="https://www.patreon.com/honeyside"><strong>Patreon</strong></a> to get priority updates on our development plan and <strong>voting power on new features</strong>.

## Installation

Install Envato CLI with yarn or npm:

```
yarn global add envato-cli
```

```
npm install -g envato-cli
```

## Usage & Examples

By default, the Envato Package Manager will connect to `epm.honeyside.net`. If you want to use an alternative repository, you can change the url by running `envato source [repo_url]`. The repository must be running the EPM server.

* Run `envato login` to authenticate against Envato API.

* Run `envato clone [item_id] [purchase_code]` to download an item. The item must have been made available on EPM by its author.

* Run `envato clone [item_id] -` to download an item if you are the author of such item (no purchase code required).

* Run `envato check-purchase [purchase_code]` or `envato purchase [purchase_code]` to verify one of your purchases, given the purchase code.

* Run `envato check-sale [purchase_code]` or `envato sale [purchase_code]` to verify one of your sales, given the purchase code.

* Run `envato archive` to create a zip archive with the current folder. It will use version and name from `package.json` (from the current folder). You can add a `.envatoignore` file to ignore files and folders.

* Run `envato publish [item_id]` to publish an item. The item must already have been approved by Envato. It must be available on at least one marketplace.

* Run `envato unpublish [item_id]` to unpublish an item. You must own the item to remove it from EPM.

## Contributing

Feel free to open an Issue or send me a direct message.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/Sadkit/koa-power/tags). 

## Author

* **Honeyside** - [Honeyside](https://github.com/Honeyside)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
