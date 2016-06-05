/**
 * Created by caoxp on 16/6/2.
 * client pool
 */
'use strict'
var net = require('net');
var events = require('events');

class sclient extends events.EventEmitter {
    constructor(host, port, path) {
        super();
        this._client = null;
        this._free = true;
        this._error = false;
        this._host = host || '127.0.0.1'
        this._port = port || 8500;
        this._path = path || '';
        this._radom = Math.random();
        this._freeTimeout = 5*60000 //5分钟
        this._clientID = Symbol();

    }

    createClient() {
        if (this._path.length <= 0)
            this._client = net.createConnection({host: this._host, port: this._port})
        else
            this._client = net.createConnection({path: this._path});
        this._addEvent();


    }

    activedConnection() {
        return this._client.readable && this._client.writable;
    }

    _reConnect() {
        if (this._path.length <= 0)
            this._client.connect({host: this._host, port: this._port});
        else
            this._client.connect({path: this._path});
    }

    _addEvent() {
        this._client.on('connect', ()=> {
            this._client.setTimeout(this._freeTimeout);
            if (this._path.length <= 0)
                console.log('连接服务器成功,远程地址为:%s %s', this._client.remoteAddress, this._client.remotePort);
            else
                console.log('连接UnixSocket服务器成功,远程地址为:%s', this._path);
            this.emit('connectSuccess');

        })
        this._client.on('timeout',()=>{
            //本连接已经5分钟空闲了,将置为free,供其他使用
            this._client.setFree(true);
            this.emit('freeClientChanged',this._client);
        })
        this._client.on('close', ()=> {
            console.log('远程服务器关闭');
        })
        this._client.on('error',(err)=>{
            console.error('Error:%s,code:%s',err.message,err.code);
            this.emit('clientError',err);
            

        })
        this.on('sendmsg',(msg)=>{
            this.setFree(false);
            this._client.write(msg);
        })
        this._client.on('data',(data)=>{
            console.log('received data:%s server %s',this._radom,data);
            this.emit('received',data);
        })


    }
    isFree(){
        return this._free;
    }
    setFree(isFree){
        this._free = isFree;
    }
    getConnetion(){
        return this._client;
    }
}

class clientpool {
    constructor(config){
        this._config = config;
        this._pool = [];
        this._currentConnectCount = 0;
        this.minConnectCount = config.minConnectCount || 4;
        this.maxConnectCount = config.maxConnectCount || 1000;
        this._waitingList = [];
        this._initClient();
    }
    getClient(fn){
        //如果pool中没有连接,创建新连接
        if(this._pool.length==0){
            this._createClient(fn);
        }else{
            //如果有pool则查找空闲连接
           let client = this._pool.find((c)=>{
                return c.isFree();
            });
            if(client){
                fn.call(client,null,client);
            }else{
                //如果没有空闲则创建新连接
                if(this._currentConnectCount>=this.maxConnectCount){
                    //如果当前连接数大于最大连接数,将当前操作放入到等待队列中
                    this._waitingList.push(fn);
                }else {
                    this._createClient(fn);
                }
            }
        }
    }
    getCurrentCount(){
        return this._pool.length;
    }
    _initClient(){
        if(this.minConnectCount>0){
            for(let i =0;i<this.minConnectCount;i++){
                let client = new sclient(this._config.host,this._config.port,this._config.path);
                client.createClient();
                client.on('connectSuccess',()=>{
                    this._pool.push(client);
                    this._currentConnectCount++;
                });
            }
        }
    }

    _createClient(fn){
        let client = new sclient(this._config.host,this._config.port,this._config.path);
        client.createClient();
        client.on('connectSuccess',()=>{
            this._pool.push(client);
            fn.call(client,null,client);
            this._currentConnectCount++;
        });
        client.on('clientError',(err)=>{
            //清除此client
            this._currentConnectCount--;
            let errorInd = this._pool.findIndex((c)=>{
                return c._clientID == client._clientID;
            });
            if(errorInd>=0){
                this._pool.splice(errorInd,1);
            }
            client.getConnetion().end();
            fn.call(client,err);
        })
        client.on('freeClientChanged',()=>{
            if(this._waitingList.length<=0) return;
            let waitingfn = this._waitingList.shift();//取出第一个信息
            fn.call(client,null,client);
        })
    }

}

exports.netpool = function (config) {
    let _config = config || {};
    return new clientpool(_config);
}