const {getDateStr} = require("./utils");
const fs = require('fs')

class Log {

    #fd

    log

    setLogFile(logFile) {
        if (logFile === '') {
            this.log = this.#logToConcole
        } else {
            this.#fd = fs.openSync(logFile, 'a')
            this.log = this.#logToConsoleAndFile
        }
    }

    #logToConcole (content) {
        console.log(`[${getDateStr()}]  ${content}`)
    }

    #logToConsoleAndFile (content) {
        const logText = `[${getDateStr()}]  ${content}`
        console.log(logText)
        fs.writeSync(this.#fd, `${logText}\n`)
    }

}

module.exports.Log = new Log()
