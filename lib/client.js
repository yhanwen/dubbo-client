var net = require('net');
var async = require('async');

var Client;

var totalConn = 0;
var id = 0;

module.exports = Client = function(opt, callback){

    if(!opt || !opt.host || !opt.port){
        throw 'Please set dubbo host and port';
    }


    var client = new net.Socket({
        allowHalfOpen: true,
        readable: true,
        writable: true
    });

    client.instName = 'conn'+ id;
    id += 1;


    client.connect(opt.port, opt.host, function(err){
        if(err)throw err;
        totalConn += 1;
        console.log("now connected",totalConn);
        callback && callback(err, client);


    });

    client.on('close', function(){
        totalConn -= 1;
        console.log(client.instName, "closed, now connected", totalConn);
    });



    client.run = function(command, callback){
        console.log('using', client.instName, 'command:', command);

        command = command.replace(/(|\n)$/,'\n');

        var result = "";
        var cb = function(data){
            result += data.toString();
            if(result.indexOf('dubbo>')==-1)return;
            client.removeListener('data', cb);
            var str = result;
            result = '';
            str = str.replace(/\r\ndubbo>/,'');
            callback && callback(str);
        }
        client.on('data', cb);
        client.write(command);
    };
    return client;
};

