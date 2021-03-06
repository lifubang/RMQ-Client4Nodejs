/*
 * Created by Gang Lu on 6/12/16.
 * E-mail: gang.lu.ict@gmail.com
 *
 * Copyright (c) 2016 bafst.com, All rights reserved.
 */

"use strict";

var iconv = require('iconv-lite');

var settings = require("./settings_MQ");   //配置信息
var logger = settings.logger;
var moment = require('moment'); //时间

var java = require("java");
var Thread = java.import("java.lang.Thread");

var MQM = require("./MQMessage");
var ConsumeConcurrentlyStatus = MQM.ConsumeConcurrentlyStatus;
var ConsumeOrderlyStatus = MQM.ConsumeOrderlyStatus;

var MessageListenerConcurrently = function () {};
MessageListenerConcurrently.prototype.consumeMessage = function (_msgs, context) {
    var msgs = _msgs.toArraySync();
    logger.debug("Into consumeMessage of MessageListenerConcurrently");
    //console.info("Into consumeMessage of MessageListenerConcurrently");
    //msg = msgs.get(JInt(0))
    msgs.forEach(function (msg) {
        var topic = msg.getTopicSync();
        var tags = msg.getTagsSync();
        //var bodybytes = new Buffer(msg.getBody());
        //var body = bodybytes.toString(settings.MsgBodyEncoding);  //byte to string
        //var body = msg.getBodySync().toString(settings.MsgBodyEncoding);
        var body = iconv.decode(new Buffer(msg.getBodySync()), settings.MsgBodyEncoding);

        logger.debug(msg.toStringSync());
        // In Python 2.x, bytes is just an alias for str. 所以bytes解码时要注意了, msg.body.decode会出错(bytes没有decode方法)！
        //logger.debug("Message body: " + str(msg.getBody()))
        //logger.debug("Message body: " + str(msg.getBody()).decode(settings.MsgBodyEncoding))
        logger.debug("Message body: " + body);

        if (topic == "RMQTopicTest") {
            // 执行TopicTest的消费逻辑
            if (tags == "TagA"){
                // 执行TagA的消费
                logger.debug("Got message with topic " + topic + " and tags " + tags);
            } else if (tags == "TagB") {
                // 执行TagB的消费
                logger.debug("Got message with topic " + topic + " and tags " + tags);
            } else if (tags == "TagC") {
                // 执行TagC的消费
                logger.debug("Got message with topic " + topic + " and tags " + tags);
            }  else {
                // 错误的Tag
                logger.error("Got message with topic " + topic + " and UNKNOWN tags " + tags);
            }
        } else if (topic == "TopicTest1") {
            // 执行TopicTest1的消费逻辑
            logger.debug("Got message with topic " + topic + " and tags " + tags);
        } else {
            logger.debug("Got message with UNKNOWN topic " + topic);
        }
    });

    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
};

//proxy test
//var msgListenerConcurrentlyProxy = java.newProxy("com.alibaba.rocketmq.client.consumer.listener.MessageListenerConcurrently", {
//    consumeMessage: function(_msgs, context) {
//    console.info("Into consumeMessage of MessageListenerConcurrently");
//        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
//    }
//});

//实现 与 类代理
var msgListenerConcurrently = new MessageListenerConcurrently();
var msgListenerConcurrentlyProxy = java.newProxy("com.alibaba.rocketmq.client.consumer.listener.MessageListenerConcurrently", msgListenerConcurrently);
exports.msgListenerConcurrentlyProxy = msgListenerConcurrentlyProxy;

var MessageListenerOrderly = function () {
    this.consumeTimes = java.newInstanceSync("java.util.concurrent.atomic.AtomicLong", 0);
};
MessageListenerOrderly.prototype.consumeMessage = function (_msgs, context) {
    var msgs = _msgs.toArraySync();
    context.setAutoCommitSync(false);
    logger.debug(Thread.currentThreadSync().getNameSync() + " Receive New Messages: " + msgs.toString())
    //TODO: msgs.toString()可能需要改成for msg in msgs: msg.toString()

    this.consumeTimes.incrementAndGetSync();
    var consumeTimes = this.consumeTimes.getSync();
    //print consumeTimes
    //print type(consumeTimes)

    if ((consumeTimes % 2) == 0) {
        logger.debug("consumeTimes % 2 = 0, return SUCCESS");
        return ConsumeOrderlyStatus['SUCCESS'];
    } else if ((consumeTimes % 3) == 0) {
        logger.debug("consumeTimes % 3 = 0, return ROLLBACK");
        return ConsumeOrderlyStatus['ROLLBACK'];
    } else if ((consumeTimes % 4) == 0) {
        logger.debug("consumeTimes % 4 = 0, return COMMIT");
        return ConsumeOrderlyStatus['COMMIT'];
    } else if ((consumeTimes % 5) == 0) {
        logger.debug("consumeTimes % 5 = 0, return SUSPEND_CURRENT_QUEUE_A_MOMENT");
        context.setSuspendCurrentQueueTimeMillis(3000);
        return ConsumeOrderlyStatus['SUSPEND_CURRENT_QUEUE_A_MOMENT'];
    } else {
        logger.debug("consumeTimes is not times of 2, 3, 4, 5, return SUCCESS");
        return ConsumeOrderlyStatus['SUCCESS'];
    }
};

//实现 与 类代理
var msgListenerOrderly = new MessageListenerOrderly();
var msgListenerOrderlyProxy = java.newProxy("com.alibaba.rocketmq.client.consumer.listener.MessageListenerOrderly", msgListenerOrderly);
exports.msgListenerOrderlyProxy = msgListenerOrderlyProxy;
