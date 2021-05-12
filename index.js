#!/usr/bin/env node

require('dotenv').config();
require('colors');
const open = require('open');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const formidable = require('express-formidable');
const fs = require('fs');
const moment = require('moment');
const parser = require("file-ignore-parser");
const AdmZip = require('adm-zip');

/* start utils */

const path = require('path');
const { resolve } = require('path');
const { readdir } = require('fs').promises;

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function downloadFile(fileUrl, data, outputLocationPath) {
  const writer = fs.createWriteStream(outputLocationPath, 'binary');

  return axios({
    method: 'post',
    url: fileUrl,
    responseType: 'stream',
    data,
  }).then(response => {
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) {
          resolve(true);
        }
      });
    });
  });
}

/* end utils */

const args = process.argv.slice(2);

let config = null;

try {
  config = JSON.parse(fs.readFileSync(`${__dirname}/config.json`, 'utf8'));
  if (!config) {
    config = {};
  }
} catch (e) {
  if (!['login', 'source', 'archive', null, undefined, ''].includes(args[0])) {
    console.log('');
    console.log('login required, run "honey login" first'.red);
    console.log('');
    return;
  }
  config = {};
}

const source = config.source || 'https://epm.honeyside.net';

axios.defaults.headers.post['Authorization'] = `Bearer ${config.access_token}`;
axios.defaults.headers.get['Authorization'] = `Bearer ${config.access_token}`;

if (!['login', 'source', 'archive', null, undefined, ''].includes(args[0])) {
  if (moment(config.date).isBefore(moment().subtract(60, 'seconds'))) {
    console.log('');
    console.log('token expired, run "honey login" to login again'.red);
    console.log('');
    return;
  }
}

const go = async () => {
  let response, ignores, files, zip, count;
  let epmPkg = require(__dirname + '/package.json');
  let pkg = {};
  const exists = fs.existsSync(`${process.cwd()}/package.json`);
  if (exists) {
    pkg = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, 'utf8'));
  }
  if (!pkg.name) {
    pkg.name = process.env.APP_NAME;
  }
  if (!pkg.version) {
    pkg.version = process.env.APP_VERSION;
  }
  if (!pkg.build) {
    pkg.build = process.env.APP_BUILD;
  }

  switch (args[0]) {
    case 'source':
      console.log('');
      console.log('updating source...'.yellow);
      fs.writeFileSync(`${__dirname}/config.json`, JSON.stringify({...config, source: args[1] || null}));
      console.log('source updated'.green);
      console.log('');
      break;
    case 'login':
      console.log('');
      const app = express();
      app.use(cors());
      app.use(formidable());
      let server;
      app.use((req, res) => {
        response = req.fields.response || {};
        response.date = moment().add(3600, 'seconds').toISOString();
        fs.writeFileSync(`${__dirname}/config.json`, JSON.stringify({...config, ...response}));
        res.status(200).json({ message: 'written to file' });
        server.close();
        console.log('log in successful'.green);
        console.log('');
        process.exit(0);
      });
      server = app.listen(23456, (err) => {
        if (err) {
          console.log('error: must be able to listen on port 23456'.red);
          console.log('');
          return;
        }
        console.log('awaiting log in from browser'.yellow);
        open(`${source}/api/authenticate`);
      });
      break;
    case 'purchase':
    case 'check-purchase':
      console.log('');
      if (!args[1] || args[1].length === 0) {
        console.log('purchase code required');
        console.log('run "honey check-purchase [purchase-code]"');
        console.log('');
        return;
      }
      try {
        response = await axios.get(`https://api.envato.com/v3/market/buyer/purchase?code=${args[1]}`);
        console.log('purchase code valid'.green);
        console.log(`item id: ${response.data.item.id.toString().cyan}`);
        console.log(`item name: ${response.data.item.name.toString().cyan}`);
        console.log(`author username: ${response.data.item.author_username.toString().cyan}`);
        console.log(`price: ${response.data.amount.toString().cyan}`);
        console.log(`license: ${response.data.license.toString().cyan}`);
        console.log(`date: ${moment(response.data.sold_at).fromNow().toString().cyan}`);
        const support = !!response.data.supported_until;
        console.log(`support: ${support.toString().cyan}`);
        if (support) {
          console.log(`support expires: ${moment(response.data.supported_until).fromNow().toString().cyan}`);
        }
      } catch (e) {
        if (!e.response || ! e.response.data) {
          console.log('network error'.red);
        } else if (e.response.data.response_code === 400) {
          console.log('code required'.red);
        } else {
          console.log('no purchase belonging to the current user found with the specified code'.yellow);
        }
      }
      console.log('');
      break;
    case 'sale':
    case 'check-sale':
      console.log('');
      if (!args[1] || args[1].length === 0) {
        console.log('purchase code required');
        console.log('run "honey check-purchase [purchase-code]"');
        console.log('');
        return;
      }
      try {
        response = await axios.get(`https://api.envato.com/v3/market/author/sale?code=${args[1]}`);
        console.log('sale code valid'.green);
        console.log(`item id: ${response.data.item.id.toString().cyan}`);
        console.log(`item name: ${response.data.item.name.toString().cyan}`);
        console.log(`author username: ${response.data.item.author_username.toString().cyan}`);
        console.log(`price: ${response.data.amount.toString().cyan}`);
        console.log(`license: ${response.data.license.toString().cyan}`);
        console.log(`date: ${moment(response.data.sold_at).fromNow().toString().cyan}`);
        const support = !!response.data.supported_until;
        console.log(`support: ${support.toString().cyan}`);
        if (support) {
          console.log(`support expires: ${moment(response.data.supported_until).fromNow().toString().cyan}`);
        }
      } catch (e) {
        if (!e.response || ! e.response.data) {
          console.log('network error'.red);
        } else if (e.response.data.response_code === 400) {
          console.log('code required'.red);
        } else {
          console.log('no sale belonging to the current user found with the specified code'.yellow);
        }
      }
      console.log('');
      break;
    case 'archive':
      console.log('');
      console.log('creating a zip archive'.cyan);
      ignores = [];
      try {
        const exists = fs.existsSync(`${process.cwd()}/.honeyignore`);
        if (exists) {
          ignores = await parser(`${process.cwd()}/.honeyignore`);
          console.log(`.honeyignore file has ${Array.from(ignores).length} entries`.cyan);
        } else {
          console.log('.honeyignore file not present'.yellow);
        }
      } catch (e) {
        console.log('.honeyignore file not present'.yellow);
      }

      files = (await getFiles(process.cwd())).map(e => e.replace(process.cwd() + '/', ''))

      zip = new AdmZip();
      count = 0;
      for (let file of files) {
        let shouldZip = true;
        for (let ignore of ignores) {
          if (!ignore.startsWith('#')) {
            if (file.startsWith('archive')) {
              shouldZip = false;
            }
            if (('/' + file).startsWith(ignore)) {
              shouldZip = false;
            }
            if (file.startsWith('.')) {
              shouldZip = false;
            }
            if (file.startsWith(ignore)) {
              shouldZip = false;
            }
            if (file.endsWith('.env')) {
              shouldZip = false;
            }
          }
        }
        if (shouldZip) {
          zip.addLocalFile(file, file.substr(0, file.length - 1 - path.basename(file).length));
          count++;
        }
      }
      zip.writeZip(`${process.cwd()}/archive-${pkg.name}${pkg.version ? `-${pkg.version}` : ''}${pkg.build ? `-${pkg.build}` : ''}.zip`);
      console.log(`archived: ${count} files`.green);
      console.log('');
      break;
    default:
      console.log('');
      console.log(`honey cli ${epmPkg.version.toString().cyan}`);
      if (args[1] && args[1].length > 0) {
        console.log('invalid command specified'.yellow);
      } else {
        console.log('no command specified'.yellow);
      }
      console.log('');
  }
};

go().then(() => {});
