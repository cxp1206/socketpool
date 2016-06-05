# socketpool
nodejs实现的socket连接池.需要Node版本4.x以上

# 使用方法:
### Step 1
初始化连接池.可以设置信息如下:
{
    host:'127.0.0.1'  //远程地址,默认为'127.0.0.1'
    port:8500         //远程端口,默认为8500
    path:            //UnixSocket使用,文件地址
    minConnectCount  //最小连接数,默认为4
    maxConnectCount  //最大连接数,默认为1000

}
var clients = pool.netpool({port:4532,maxConnectCount: 5});

### Setp 2
获取连接池中连接,第一个参数为error信息,成功为null,第二个参数为获取到的连接
订阅事件received获取服务端socket发送的消息
触发时间sendmsg用来客户端发送消息
clients.getClient((er,c)=>{
            if(c){
                c.emit('sendmsg','msg'+i);
                c.on('received',function (data) {
                    console.log(data);
                });
            }
        });
