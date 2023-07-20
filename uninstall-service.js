const Service = require('node-windows').Service;

const svc = new Service({
    name: 'Web File Transfer',
    script: require('path').join(process.cwd(), 'server.js')
});

svc.on('uninstall',function(){
    console.log('Uninstall complete.');
    console.log('The service exists: ',svc.exists);
});

svc.uninstall();