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

const mergeObjects = (target, sources, filter = () => true) => {
    const merge = (target, source) => {
        let props = Object.getOwnPropertyNames(source)
        props.forEach(prop => {
            let value = source[prop]
            if (!filter(value)) {
                return
            }
            if (value instanceof Object
                && !(value instanceof Array)
                && !(value instanceof Function)
                && target[prop] !== null
                && target[prop] !== undefined) {
                merge(target[prop], value)
            } else {
                target[prop] = value
            }
        })
    }
    sources.forEach(source => {
        if (source instanceof Object) {
            merge(target, source)
        }
    })
    return target
}

module.exports = {
    trim,
    getDateStr,
    getFileContent,
    mergeObjects
}