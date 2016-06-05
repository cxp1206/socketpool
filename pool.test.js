/**
 * Created by caoxp on 16/6/4.
 */
'use strict'

var expect = require('chai').expect;
var pool = require('./pool');

describe('pool', function () {
    describe('连接测试', function () {
        it('连接错误', function (done) {
            let clientpool = pool.netpool();
            this.timeout(5000);
            clientpool.getClient((er,c)=>{
                expect(er).to.be.not.empty;
                done();
            });
        });

        it('连接成功', function (done) {
            let clientpool = pool.netpool({port: 4532});
            clientpool.getClient((er,c)=> {
                expect(c).to.be.not.a('null');
                done();

            })
        })
        it('最大连接数', function (done) {
            let clientpool = pool.netpool({port: 4532, maxConnectCount: 5});
            setTimeout(function () {
                clientpool.getClient((er,c)=> {
                    console.log('当前连接数:%s',clientpool.getCurrentCount());
                    expect(clientpool.getCurrentCount()).to.be.not.empty;
                    done();
                })
            },1000);
            
        })
        it('创建到达最大连接数时等待',function (done) {
            let clientpool = pool.netpool({port: 4532, maxConnectCount: 5});
            setTimeout(function () {
                
                for(let i=0;i<5;i++){
                    clientpool.getClient((er,c)=> {
                        if(c){
                            c.emit('sendmsg','msg'+i); 
                        }
                        
                    })
                }
                done();
            },1000);
        })


    })
})


