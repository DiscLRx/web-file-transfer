const http = require('http')
const https = require('https')
const fs = require('fs');
const url = require('url')
const yaml = require('js-yaml');
const multiparty = require('multiparty');
const jsonBody = require("body/json");
const {trim, getDateStr, getFileContent, mergeObjects} = require("./utils");

const config = {
    server: {
        'force-https': false,
        http: {
            enable: true,
            hostname: '0.0.0.0',
            port: 80
        },
        https: {
            enable: false,
            hostname: '0.0.0.0',
            port: 443,
            'ssl-cert': '',
            'ssl-key': ''
        }
    },
    'files-root': './files',
    'access-key': 'example-key'
}

let userConfig = null
if (fs.existsSync('./config.yaml')) {
    userConfig = yaml.load(fs.readFileSync('./config.yaml'))
} else if (fs.existsSync('./config.yml')) {
    userConfig = yaml.load(fs.readFileSync('./config.yml'))
}

mergeObjects(config, [userConfig], (value) => value !== null && value !== '')

const FORCE_HTTPS = config.server['force-https']

const HTTP_ENABLE = config.server.http.enable
const HTTP_HOSTNAME = config.server.http.hostname
const HTTP_PORT = config.server.http.port

const HTTPS_ENABLE = config.server.https.enable
const HTTPS_HOSTNAME = config.server.https.hostname
const HTTPS_PORT = config.server.https.port
const HTTPS_SSH_CERT = config.server.https['ssl-cert']
const HTTPS_SSH_KEY = config.server.https['ssl-key']

const FILES_ROOT = config['files-root']
const ACCESS_KEY = config['access-key']

const FILE_TMP_DIR = './tmp'

if (!fs.existsSync(FILES_ROOT)) {
    fs.mkdirSync(FILES_ROOT)
}

if (!fs.existsSync(FILE_TMP_DIR)) {
    fs.mkdirSync(FILE_TMP_DIR)
}

const routes = [
    {
        path: /^\/assets\/.*$/,
        method: 'GET',
        auth: false,
        handler: assets
    },
    {
        path: '/login',
        method: 'GET',
        auth: false,
        handler: page
    },
    {
        path: '/api/login',
        method: 'POST',
        auth: false,
        handler: login
    },
    {
        path: '/',
        method: 'GET',
        auth: true,
        handler: page
    },
    {
        path: '/api/files',
        method: 'GET',
        auth: true,
        handler: getFileList
    },
    {
        path: '/api/upload',
        method: 'POST',
        auth: true,
        handler: uploadFile
    },
    {
        path: /^\/api\/download?.*$/,
        method: 'GET',
        auth: true,
        handler: downloadFile
    },
    {
        path: /^\/api\/delete?.*$/,
        method: 'DELETE',
        auth: true,
        handler: deleteFile
    }
]

const auth = (req) => {
    let cookies = req.headers.cookie
    if (cookies === undefined) {
        return false
    }
    cookies = cookies.split(';')
    let reqKey = undefined
    cookies.some(cookie => {
        let pair = cookie.split('=')
        if (pair[0] === 'key') {
            reqKey = pair[1]
            return true
        } else {
            return false
        }
    })

    if (reqKey === undefined) {
        return false
    }

    return reqKey == ACCESS_KEY;
}

const route = (req, res) => {

    let route = routes.filter(route => {
        if (req.method !== route.method) {
            return false
        }
        if (route.path instanceof RegExp) {
            return req.url.match(route.path)
        } else {
            return route.path === req.url;
        }
    })[0]

    if (route === undefined) {
        res.writeHead(404)
        res.end()
        return
    }

    let authPass = route.auth && ACCESS_KEY !== null ? auth(req) : true
    if (authPass) {
        route.handler(req, res)
    } else {
        res.writeHead(302, {
            'Location': '/login'
        })
        res.end()
    }
}

function login (req, res) {
    jsonBody(req, res, (err, body) => {
        if (body.key == ACCESS_KEY){
            res.setHeader('Set-Cookie', [`key=${ACCESS_KEY}; Path=/; httpOnly;`])
            res.end(JSON.stringify({
                msg: 'OK'
            }))
        } else {
            res.end(JSON.stringify({
                msg: 'DENY'
            }))
        }
    })
}

function page (req, res) {
    let path = req.url === '/' ? '/file-list' : req.url
    let data = getFileContent(`./views${path}.html`)
    res.end(data)
}

function assets (req, res) {
    const path = `.${req.url}`
    let data = getFileContent(path)
    if (data !== null) {
        res.end(data)
    } else {
        res.writeHead(404)
        res.end()
    }
}

function getFileList (req, res) {
    class File {
        constructor(name, size) {
            this.name = name;
            this.size = size;
        }
    }
    let files = fs.readdirSync(FILES_ROOT).map(filename => {
        let {size} = fs.statSync(`${FILES_ROOT}/${filename}`)
        return new File(filename, size);
    })
    let filesJson = JSON.stringify(files)
    res.end(filesJson)
}

function uploadFile (req, res) {
    try {
        let form = new multiparty.Form({
            uploadDir: FILE_TMP_DIR
        })
        form.parse(req, (err, fields, files) => {
            if (files !== undefined) {
                files.file.forEach(file => {
                    let tmpPath = file.path
                    let filename = file.originalFilename
                    if (trim(filename) === '') {
                        fs.unlinkSync(tmpPath)
                    } else {
                        fs.renameSync(tmpPath, `${FILES_ROOT}/${filename}`)
                    }
                })
            }
            res.writeHead(302, {
                'Location': '/'
            })
            res.end();
        })
    } catch (ex) {
        console.log(ex)
    }
}

function downloadFile (req, res) {
    try {
        let filename = url.parse(req.url, true).query.filename
        let path = `${FILES_ROOT}/${filename}`
        let {size} = fs.statSync(path)
        if (fs.existsSync(path)) {
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURI(filename)};`,
                'Content-Length': `${size}`
            })
            let rs = fs.createReadStream(path)
            rs.pipe(res)
        }
    } catch (ex) {
        console.log(ex)
    }
}

function deleteFile (req, res) {
    try {
        let filename = url.parse(req.url, true).query.filename
        let path = `${FILES_ROOT}/${filename}`
        if (fs.existsSync(path)) {
            fs.unlinkSync(path)
        }
        res.end()
    } catch (ex) {
        console.log(ex)
    }
}

function logRequest(req) {
    console.log(`[${getDateStr()}]  ${req.socket.remoteAddress}:${req.socket.remotePort} => ${req.socket.localAddress}:${req.socket.localPort}  ${req.method} ${req.url}`)
}

if (HTTPS_ENABLE) {
    https
        .createServer({
            cert: fs.readFileSync(HTTPS_SSH_CERT),
            key: fs.readFileSync(HTTPS_SSH_KEY)
        }, (req, res) => {
            logRequest(req)
            route(req, res)
        })
        .listen(HTTPS_PORT, HTTPS_HOSTNAME, () => {
            console.log(`[${getDateStr()}]  Listening ${HTTPS_HOSTNAME}:${HTTPS_PORT}`)
        })
}

if (FORCE_HTTPS && HTTPS_ENABLE) {
    http
        .createServer((req, res) => {
            logRequest(req)
            let hostname = req.headers['host'].split(':')[0]
            res.writeHead(301, {
                'Location': `https://${hostname}:${HTTPS_PORT}${req.url}`
            })
            res.end()
        })
        .listen(HTTP_PORT, HTTP_HOSTNAME, () => {
            console.log(`[${getDateStr()}]  Listening ${HTTP_HOSTNAME}:${HTTP_PORT} \nForce Https`)
        })
} else if (HTTP_ENABLE) {
    http
        .createServer((req, res) => {
            logRequest(req)
            route(req, res)
        })
        .listen(HTTP_PORT, HTTP_HOSTNAME, () => {
            console.log(`[${getDateStr()}]  Listening ${HTTP_HOSTNAME}:${HTTP_PORT}`)
        })
}




