const tb = document.querySelector('#flist')

let uploadEnableFlag = false
let fileReader = null

axios({
    method: 'get',
    url: '/api/files'
}).then(res => {
    let tableContent = ''
    const files = res.data
    files.forEach((file) => {
        let size = renderSize(file.size)
        let line = `<tr><td>${file.name}</td><td>${size}</td><td><a href='/api/download?filename=${file.name}' download="${file.name}">下载</a></td><td><button type="button" onclick="deleteFile('${file.name}')">删除</button></td></tr>`
        tableContent += line;
    })
    tb.innerHTML += tableContent
})

function renderSize(value) {
    if (value === 0) {
        return '0 Bytes'
    }
    let unitArr = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    let index
    let srcsize = parseFloat(value)
    index = Math.floor(Math.log(srcsize) / Math.log(1024))
    let size = srcsize / Math.pow(1024, index)
    size = size.toFixed(2)
    size = parseFloat(size)
    return `${size} ${unitArr[index]}`
}

function upload() {
    if (!uploadEnableFlag) {
        return
    }

    let file = document.querySelector('#fileInput')
    axios({
        method: 'post',
        url: '/api/upload',
        params: {
            "filename": file.files[0].name
        },
        data: fileReader.result
    }).then(() => {
        location.reload()
    })
}

function deleteFile(filename) {
    axios({
        method: 'delete',
        url: '/api/delete',
        params: {
            "filename": filename
        }
    }).then(() => {
        location.reload()
    })
}
