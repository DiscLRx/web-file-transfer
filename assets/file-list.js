const tb = document.querySelector('#flist')

let fileReader = null

let dirTree
let currentNode
let historyNodeStack = []

axios({
    method: 'get',
    url: '/api/files',
    headers: {
        'accept': 'application/json'
    }
}).then(res => {
    dirTree = res.data
    currentNode = dirTree

    let dirBeforeReload = sessionStorage.getItem('dirBeforeReload')
    if (dirBeforeReload !== null) {
        historyNodeStack = JSON.parse(dirBeforeReload)
        loadHistoryNode()
    }

    displayItems()
})

function saveCurrentHistory() {
    sessionStorage.setItem('dirBeforeReload', JSON.stringify(historyNodeStack))
}

function nextDirView(key) {
    historyNodeStack.push(key)
    currentNode = currentNode[key].items
    displayItems()
    saveCurrentHistory()
}

function lastDirView() {
    currentNode = dirTree
    historyNodeStack.pop()
    loadHistoryNode()
    saveCurrentHistory()
}

function loadHistoryNode() {
    historyNodeStack.forEach(nodeKey => {
        currentNode = currentNode[nodeKey].items
    })
    displayItems()
}

function displayItems() {
    tb.innerHTML = ''
    let tableContent = ''
    Object.entries(currentNode).forEach(([key, value]) => {
        let line
        if (value.type === 'file') {
            let size = renderSize(value.size)
            line = `<tr>
                        <td class="name-td" onclick="download('/api/download?file=${value.path}', '${key}')">📄 ${key}</td>
                        <td class="size-td" >${size}</td>
                        <td class="del-td" onclick="deleteItem('${value.path}')">删除</td>
                    </tr>`
        } else if (value.type === 'directory') {
            line = `<tr>
                        <td class="name-td" onclick="nextDirView('${key}')">📁 ${key}</td>
                        <td class="size-td"></td>
                        <td class="del-td" onclick="deleteItem('${value.path}')">删除</td>
                    </tr>`
        }
        tableContent += line;
    })
    tb.innerHTML += tableContent
}

function renderSize(value) {
    if (value === 0) {
        return '0 Bytes'
    }
    let unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    let index
    let srcsize = parseFloat(value)
    index = Math.floor(Math.log(srcsize) / Math.log(1024))
    let size = srcsize / Math.pow(1024, index)
    size = size.toFixed(2)
    size = parseFloat(size)
    return `${size} ${unitArr[index]}`
}

function getBasePath() {
    let basePath = ''
    historyNodeStack.forEach(node => {
        basePath += `/${node}`
    })
    return basePath
}

function upload(event) {
    event.preventDefault()
    document.querySelector('#baseDir').value = getBasePath()
    saveCurrentHistory()
    document.querySelector('#uploadForm').submit()
}

document.querySelector('#uploadBtn').addEventListener('click', upload)

function deleteItem(path) {
    axios({
        method: 'delete',
        url: '/api/delete',
        params: {
            "path": path
        }
    }).then(() => {
        saveCurrentHistory()
        location.reload()
    })
}

function download(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
}

const dialogInput = document.querySelector('#createDirInput')
const dialog = document.querySelector('#createDirDialog')
const createDirFailed = document.querySelector('#createDirFailed')

function showCreateDirDialog() {
    createDirFailed.style.visibility = 'hidden'
    dialog.showModal()
}

function closeCreateDirDialog() {
    dialog.close()
}

function createDir() {
    const dirName = dialogInput.value
    dialogInput.value = ''

    axios({
        method: 'post',
        url: '/api/create-directory',
        data: JSON.stringify({
            path: `${getBasePath()}/${dirName}`
        })
    }).then(() => {
        saveCurrentHistory()
        location.reload()
    })

}

