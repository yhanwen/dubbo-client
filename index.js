var Client = require('./lib/client');
var poolModule = require('generic-pool');

var Pool = module.exports = function(opt){
    var pool = poolModule.Pool({
        name     : 'dubbo',
        create   : function(callback) {
            var conn = new Client(opt, function(){
                callback(null, conn);
            });
        },
        destroy  : function(client) { client.end(); },
        max      : 10,
        // optional. if you set this, make sure to drain() (see step 3)
        min      : 2,
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis : 30000,
        // if true, logs via console.log - can also be a function
        log : false
    });

    this.pool = pool;
};
/**
 * 执行远程方法
 * exec(command, arg1, arg2..., callback)
 * 执行结果将传入callback中
 */
Pool.prototype.exec = function(){
    var argus = [];
    for (k in arguments){
        argus.push(arguments[k]);
    }
    var command = argus.shift();
    var callback = argus.pop();
    var self = this;


    if(typeof command !== 'string'){
        throw 'Please set currect method name';
    }
    if(typeof callback !== 'function'){
        throw 'Please set currect callback function';
    }


    var arguString = JSON.stringify(argus).replace(/\[(.+)\]/, function($0,$1){
       return '('+$1+')';
    });

    command += arguString;
    console.log('Execute command:',command);

    self.pool.acquire(function(err, client) {
        if (err) {
            throw err;
            // handle error - this is generally the err from your
            // factory.create function
        }
        else {
            command = 'invoke ' + command;
            client.run(command, function(data) {
                var json = data.replace(/^(.+)\r\nelapsed.+/, function($0,$1){
                    return $1;
                });
                callback(JSON.parse(json));
                self.pool.release(client);
            });
        }
    });
}

/**
 * Get service from dubbo package
 */
Pool.prototype.getService = function(service, callback){
    var self = this;

    self.pool.acquire(function(err, client) {
        if (err) {
            callback(err);
            // handle error - this is generally the err from your
            // factory.create function
        }
        else {
            client.run('ls '+service, function(str){
                if(str.indexOf('No such service')>-1){
                    err = 'No such service ' + service;
                    callback(err);
                }else{
                    var methods = str.split('\r\n');
                    var services = {};
                    methods.forEach(function(m){
                        services[m] = function(){
                            var argus = [];
                            for(k in arguments){
                                argus.push(arguments[k]);
                            }
                            var command = service + "." + m;
                            argus.unshift(command);
                            self.exec.apply(self, argus);
                        };
                    });
                    callback(null, services);
                }
            })
        }
    });
};

exports.Client = function(cfg){
    return new Pool(cfg);
}


//var pool = new Pool({
//    host: '10.2.52.162',
//    port: 20890
//});
//
//var count = 1;
//setInterval(function(){
//    count++;
//    if(count > 3)return;
//    var name = 'test'+count;
//    pool.getService('com.xiaozhao.m.weixin.MessageService', function(err, service){
//        service.getMessage("", "", function(data){
//            console.log(name, data);
//        })
//    });
//},100);