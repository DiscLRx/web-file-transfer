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

module.exports = {
    trim
}