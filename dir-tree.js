const fs = require('fs')
const path = require('path')
class DirTree {
    constructor(root) {
        this.root = root
    }
    getDirTree (nodePath) {
        let nodeItems = fs.readdirSync(path.join(this.root, nodePath))
        let resultItems = {}
        nodeItems.forEach((nodeItem) => {
            const itemPath = path.join(nodePath, nodeItem)
            let stats = fs.statSync(path.join(this.root, itemPath))
            if(stats.isDirectory()) {
                resultItems[nodeItem] = this.getDirTree(`${itemPath}`)
            } else if (stats.isFile()) {
                resultItems[nodeItem] = {
                    type: 'file',
                    path: itemPath.replaceAll('\\', '/'),
                    size: stats.size
                }
            }
        })
        return {
            path: nodePath.replaceAll('\\', '/'),
            type: 'directory',
            items: resultItems
        }
    }
}

module.exports = {
    DirTree
}