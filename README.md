# Honeyside CLI [![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/honeyside-cli.svg
[npm-url]: https://www.npmjs.com/package/honeyside-cli

The Honeyside CLI offers useful tools for Honeyside collaborators and Envato authors.

Support us on <a href="https://www.patreon.com/honeyside"><strong>Patreon</strong></a> to get priority updates on our development plan and <strong>voting power on new features</strong>.

## Installation

Install Honeyside CLI with yarn or npm:

```
yarn global add honeyside-cli
```

```
npm install -g honeyside-cli
```

## Usage & Examples

By default, the Honeyside CLI will connect to `epm.honeyside.net`. If you want to use an alternative repository, you can change the url by running `honey source [repo_url]`. The repository must be running the EPM server.

* Run `honey login` to authenticate against Envato API.

* Run `honey check-purchase [purchase_code]` or `honey purchase [purchase_code]` to verify one of your purchases, given the purchase code.

* Run `honey check-sale [purchase_code]` or `honey sale [purchase_code]` to verify one of your sales, given the purchase code.

* Run `honey archive` to create a zip archive with the current folder. It will use version and name from `package.json` or from the `.env` file (from the current folder). You can add a `.honeyignore` file to ignore files and folders.

## Contributing

Feel free to open an Issue or send me a direct message.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/Sadkit/koa-power/tags). 

## Author

* **Honeyside** - [Honeyside](https://github.com/Honeyside)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
