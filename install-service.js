const Service = require('node-windows').Service;
const dir = require('path').join(process.cwd(), 'server.js');

const svc = new Service({
    name: 'Web File Transfer',
    script: dir
});

svc.on('install',function(){
    console.log('Finished!')
});

console.log("Installing to", dir)
svc.install();