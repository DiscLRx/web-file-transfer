const http = require('http')
const fs = require('fs');
const url = require('url')
const yaml = require('js-yaml');
const multiparty = require('multiparty');
const {trim} = require("./utils");

let configFileContent = null
if (fs.existsSync('./config.yaml')) {
    configFileContent = fs.readFileSync('./config.yaml')
} else if (fs.existsSync('./config.yml')) {
    configFileContent = fs.readFileSync('./config.yml')
}

let config = null
if (configFileContent !== null) {
    config = yaml.load(configFileContent)
}

const hostname = config?.hostname ?? '0.0.0.0'
const port = config?.port ?? 80
const filesRoot = config?.root ?? './files'
const tmpDir = './tmp'

if (!fs.existsSync(filesRoot)) {
    fs.mkdirSync(filesRoot)
}

if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
}

class File {
    constructor(name, size) {
        this.name = name;
        this.size = size;
    }
}

function getFileContent(path) {
    if (fs.existsSync(path)) {
        const fd = fs.openSync(path, 'r')
        let data = fs.readFileSync(fd)
        fs.closeSync(fd)
        return data
    } else {
        return null
    }
}

function getDateStr() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

const server = http.createServer((req, res) => {

    console.log(`[${getDateStr()}]  ${req.socket.remoteAddress}:${req.socket.remotePort}  ${req.method} ${req.url}`)

    if (req.url === '/') {
        let data = getFileContent('file-list.html')
        res.end(data)

    }

    if (req.url === '/api/files') {
        let files = fs.readdirSync(filesRoot).map(filename => {
            let {size} = fs.statSync(`${filesRoot}/${filename}`)
            return new File(filename, size);
        })
        let filesJson = JSON.stringify(files)
        res.end(filesJson)
    }

    if (req.url === '/favicon.ico') {
        let data = getFileContent('./assets/favicon.ico')
        res.end(data)
    }

    const regAssets = /^\/assets\/.*$/
    if (req.url.match(regAssets)) {
        const path = `.${req.url}`
        if (fs.existsSync(path)) {
            let data = getFileContent(path)
            res.end(data)
        }
    }

    if (req.url === '/api/upload') {
        try {
            let form = new multiparty.Form({
                uploadDir: tmpDir
            })
            form.parse(req, (err, fields, files) => {
                if (files !== undefined && files.file[0] !== undefined) {
                    let tmpPath = files.file[0].path
                    let filename = files.file[0].originalFilename
                    if (trim(filename) === '') {
                        fs.unlinkSync(tmpPath)
                    } else {
                        fs.renameSync(tmpPath, `${filesRoot}/${filename}`)
                    }
                }
                res.writeHead(302, {
                    'Location': '/'
                })
                res.end();
            })
            return;
        } catch (ex) {
            console.log(ex)
        }
    }

    const regDownload = /^\/api\/download?.*$/
    if (req.url.match(regDownload)) {
        try {
            let filename = url.parse(req.url, true).query.filename
            let path = `${filesRoot}/${filename}`
            let {size} = fs.statSync(path)
            if (fs.existsSync(path)) {
                req.setTimeout(1000000000)
                res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURI(filename)};`,
                    'Content-Length': `${size}`
                })
                let rs = fs.createReadStream(path)

                rs.pipe(res)
                return
            }
        } catch (ex) {
            console.log(ex)
        }
    }

    const regDelete = /^\/api\/delete?.*$/
    if (req.url.match(regDelete)) {
        try {
            let filename = url.parse(req.url, true).query.filename
            let path = `${filesRoot}/${filename}`
            if (fs.existsSync(path)) {
                fs.unlinkSync(path)
            }
        } catch (ex) {
            console.log(ex)
        }
    }

    res.end()
})

server.listen(port, hostname, () => {
    console.log(`[${getDateStr()}]  Server is running on ${hostname}:${port}, files root directory is '${filesRoot}'`)
})
