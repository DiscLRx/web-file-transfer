const fs = require("fs");
const trim = (str, char = ' ') => {
    let len = str.length
    let lpos, rpos
    for (lpos = 0; lpos < len; lpos++) {
        if (str[lpos] !== char) {
            break
        }
    }
    for (rpos = len - 1; rpos >= lpos; rpos--) {
        if (str[rpos] !== char) {
            break
        }
    }
    return str.substring(lpos, rpos + 1);
}

const getDateStr = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

const getFileContent = (path) => {
    if (fs.existsSync(path)) {
        const fd = fs.openSync(path, 'r')
        let data = fs.readFileSync(fd)
        fs.closeSync(fd)
        return data
    } else {
        return null
    }
}

module.exports = {
    trim,
    getDateStr,
    getFileContent
}