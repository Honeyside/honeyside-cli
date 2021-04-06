#!/usr/bin/env node

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
const FormData = require('form-data');

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
    console.log('login required, run "envato login" first'.red);
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
    console.log('token expired, run "envato login" to login again'.red);
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
        console.log('run "envato check-purchase [purchase-code]"');
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
        console.log('run "envato check-purchase [purchase-code]"');
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
    case 'publish':
      console.log('');
      if (!args[1] || args[1].length === 0) {
        console.log('item id required');
        console.log('run "envato publish [item_id]"');
        console.log('');
        return;
      }
      console.log('trying to publish package'.cyan);
      console.log('creating a zip archive'.cyan);
      ignores = [];
      try {
        const exists = fs.existsSync(`${process.cwd()}/.envatoignore`);
        if (exists) {
          ignores = await parser(`${process.cwd()}/.envatoignore`);
          console.log(`.envatoignore file has ${Array.from(ignores).length} entries`.cyan);
        } else {
          console.log('.envatoignore file not present'.yellow);
        }
      } catch (e) {
        console.log('.envatoignore file not present'.yellow);
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
          }
        }
        if (shouldZip) {
          zip.addLocalFile(file, file.substr(0, file.length - 1 - path.basename(file).length));
          count++;
        }
      }
      const zipPath = `${process.cwd()}/archive-${pkg.name}-${pkg.version}.zip`;
      zip.writeZip(zipPath, async () => {
        console.log(`archived: ${count} files`.green);

        let newFile;

        try {
          newFile = fs.readFileSync(zipPath);
        } catch (e) {
          console.log(e);
        }

        let formData = new FormData();
        formData.append('token', config.access_token);
        formData.append('id', args[1]);
        formData.append('slug', args[1]);
        formData.append('version', pkg.version || 'undefined');
        formData.append("file", newFile, `archive-${pkg.name}-${pkg.version}.zip`);
        const request_config = {
          method: "post",
          url: `${source}/api/publish`,
          headers: formData.getHeaders(),
          data: formData
        };

        let res;

        try {
          res = await axios(request_config);
        } catch (e) {
          console.log(`${e.response.data.message}`.red);
          console.log('');
          return;
        }

        console.log(`item ${args[1]} published with version ${pkg.version || 'undefined'}, timestamp ${res.data.shield.timestamp}`.green);

        console.log('');

      });
      break;
    case 'unpublish':
      console.log('');
      if (!args[1] || args[1].length === 0) {
        console.log('item id required');
        console.log('run "envato unpublish [item_id]"');
        console.log('');
        return;
      }
      console.log('trying to unpublish package'.cyan);
      let res;

      try {
        res = await axios.post(`${source}/api/unpublish`, {
          token: config.access_token,
          id: args[1],
        });
      } catch (e) {
        console.log(`${e.response.data.message}`.red);
        console.log('');
        return;
      }

      console.log(`item ${args[1]} unpublished, timestamp ${moment().toISOString()}`.green);

      console.log('');
      break;
    case 'clone':
      console.log('');
      if (!args[1] || args[1].length === 0) {
        console.log('item id required'.red);
        console.log('run "envato clone [item_id] [purchase_code]"');
        console.log('if you are the author of this item, run "envato clone [item_id] -"');
        console.log('');
        return;
      }
      if (!args[2] || args[2].length === 0) {
        console.log('purchase code required'.red);
        console.log('run "envato clone [item_id] [purchase_code]"');
        console.log('if you are the author of this item, run "envato clone [item_id] -"');
        console.log('');
        return;
      }
      console.log('trying to clone package'.cyan);
      let res2;

      try {
        await downloadFile(`${source}/api/get`,{
          token: config.access_token,
          id: args[1],
          code: args[2],
        }, `${__dirname}/archive-tmp.zip`);
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(`${__dirname}/archive-tmp.zip`);
        zip.extractAllTo(`${process.cwd()}/${args[3] || args[1]}`, true);
        fs.unlinkSync(`${__dirname}/archive-tmp.zip`);
      } catch (e) {
        if (e && e.response && e.response.data) {
          console.log(`${e.response.data.message}`.red);
        } else {
          console.log(e);
        }
        console.log('');
        return;
      }

      console.log(`item ${args[1]} cloned, timestamp ${moment().toISOString()}`.green);

      console.log('');
      break;
    case 'archive':
      console.log('');
      console.log('creating a zip archive'.cyan);
      ignores = [];
      try {
        const exists = fs.existsSync(`${process.cwd()}/.envatoignore`);
        if (exists) {
          ignores = await parser(`${process.cwd()}/.envatoignore`);
          console.log(`.envatoignore file has ${Array.from(ignores).length} entries`.cyan);
        } else {
          console.log('.envatoignore file not present'.yellow);
        }
      } catch (e) {
        console.log('.envatoignore file not present'.yellow);
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
          }
        }
        if (shouldZip) {
          zip.addLocalFile(file, file.substr(0, file.length - 1 - path.basename(file).length));
          count++;
        }
      }
      zip.writeZip(`${process.cwd()}/archive-${pkg.name}-${pkg.version}.zip`);
      console.log(`archived: ${count} files`.green);
      console.log('');
      break;
    default:
      console.log('');
      console.log(`envato cli ${epmPkg.version.toString().cyan}`);
      if (args[1] && args[1].length > 0) {
        console.log('invalid command specified'.yellow);
      } else {
        console.log('no command specified'.yellow);
      }
      console.log('');
  }
};

go().then(() => {});
