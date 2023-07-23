const http = require('http')
const https = require('https')
const fs = require('fs');
const url = require('url')
const yaml = require('js-yaml');
const multiparty = require('multiparty');
const jsonBody = require("body/json");
const {trim, getDateStr, getFileContent} = require("./utils");

let configFileContent = null
if (fs.existsSync('./config.yaml')) {
    configFileContent = fs.readFileSync('./config.yaml')
} else if (fs.existsSync('./config.yml')) {
    configFileContent = fs.readFileSync('./config.yml')
}

let config = configFileContent === null ? null : yaml.load(configFileContent)

const hostname = config?.hostname ?? '0.0.0.0'
const port = config?.port ?? 80
const filesRoot = config?.root ?? './files'
const accessKey = config?.['access-key'] ?? null
const sslCert = config?.['ssl-cert'] ?? null
const sslKey = config?.['ssl-key'] ?? null

const tmpDir = './tmp'

if (!fs.existsSync(filesRoot)) {
    fs.mkdirSync(filesRoot)
}

if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
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

    return reqKey === accessKey;
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

    let authPass = route.auth && accessKey !== null ? auth(req) : true
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
        if (body.key === accessKey){
            res.setHeader('Set-Cookie', [`key=${accessKey}; Path=/; httpOnly;`])
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
    let files = fs.readdirSync(filesRoot).map(filename => {
        let {size} = fs.statSync(`${filesRoot}/${filename}`)
        return new File(filename, size);
    })
    let filesJson = JSON.stringify(files)
    res.end(filesJson)
}

function uploadFile (req, res) {
    try {
        let form = new multiparty.Form({
            uploadDir: tmpDir
        })
        form.parse(req, (err, fields, files) => {
            if (files !== undefined) {
                files.file.forEach(file => {
                    let tmpPath = file.path
                    let filename = file.originalFilename
                    if (trim(filename) === '') {
                        fs.unlinkSync(tmpPath)
                    } else {
                        fs.renameSync(tmpPath, `${filesRoot}/${filename}`)
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
        let path = `${filesRoot}/${filename}`
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
        let path = `${filesRoot}/${filename}`
        if (fs.existsSync(path)) {
            fs.unlinkSync(path)
        }
        res.end()
    } catch (ex) {
        console.log(ex)
    }
}

let server
if (sslCert !== null && sslKey !== null) {
    server = https.createServer({
        cert: fs.readFileSync(sslCert),
        key: fs.readFileSync(sslKey)
    }, (req, res) => {
        run(req, res)
    })
} else {
    server = http.createServer((req, res) => {
        run(req, res)
    })
}

function run(req, res) {
    console.log(`[${getDateStr()}]  ${req.socket.remoteAddress}:${req.socket.remotePort}  ${req.method} ${req.url}`)
    route(req, res)
}

server.listen(port, hostname, () => {
    console.log(`[${getDateStr()}]  Server is running on ${hostname}:${port}, files root directory is '${filesRoot}'`)
})
