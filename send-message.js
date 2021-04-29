module.exports = function(RED) {
  function SendMessageNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    //mongodb
    const MongoClient = require('mongodb').MongoClient;
    //for making requests
    const axios = require('axios');

    //if 'MONGO_URL' var doesn't exist in envs
    if (!process.env.MONGO_URL) {
      return node.error("Please add url (for mongodb connecting) variable (as MONGO_URL) to envs!");
    }
    //if 'FB_PAGE_TOKEN' var doesn't exist in envs
    if (!process.env.FB_PAGE_TOKEN) {
      return node.error("Please add Facebook page token (for gettings access) variable (as FB_PAGE_TOKEN) to envs!");
    }
    //if 'VB_TOKEN' var doesn't exist in envs
    if (!process.env.VB_TOKEN) {
      return node.error("Please add Viber token (for gettings access) variable (as VB_TOKEN) to envs!");
    }
    //if 'TG_TOKEN' var doesn't exist in envs
    if (!process.env.TG_TOKEN) {
      return node.error("Please add Telegram token (for gettings access) variable (as TG_TOKEN) to envs!");
    }

    //mongodb client
    const mongoClient = new MongoClient(process.env.MONGO_URL, { useUnifiedTopology: true });

    //node 'input' event handler
    node.on('input', function (msg) {
      mongoClient.connect((err, client) => {
        //if mongodb error
        if (err) return node.error("MongoDBError: " + err);
        //if 'messenger_type' var doesn't exist
        if (!msg.messenger_type) return node.error("Please speсify messenger_type to msg.");
        //if 'template_id' var doesn't exist
        if (!msg.template_id) return node.error("Please speсify template_id to msg.");
        //if 'recipient_id' var doesn't exist
        if (!msg.recipient_id) return node.error("Please speсify recipient_id to msg.");

        //mongodb getting template
        const data = { templateId: msg.template_id };
        const db = client.db("messages_db");

        db.collection(msg.messenger_type + '-messages').findOne(data, (err, messageObj) => {
          let message = messageObj.json;

          //if mongodb error
          if (err) { node.error("MongoDBError: " + err); }
          else {
            //https request to send message

            //crating request data
            if (msg.messenger_type === "fb") {
              var send_message_url = "https://graph.facebook.com/v10.0/me/messages?access_token=" + process.env.FB_PAGE_TOKEN;

              message["messaging_type"] = "RESPONSE";
              message["recipient"] = { "id": msg.recipient_id };
            } else if (msg.messenger_type === "vb") {
              var send_message_url = "https://chatapi.viber.com/pa/send_message";

              message["sender"] = {
                "name": "CurrencyHelper",
                "avatar": "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/99b20742-4dba-46de-864c-4e2fe5fb3f4f/d4hhdbc-10e39559-98ac-42c4-a4b2-7f08c1b799f7.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOiIsImlzcyI6InVybjphcHA6Iiwib2JqIjpbW3sicGF0aCI6IlwvZlwvOTliMjA3NDItNGRiYS00NmRlLTg2NGMtNGUyZmU1ZmIzZjRmXC9kNGhoZGJjLTEwZTM5NTU5LTk4YWMtNDJjNC1hNGIyLTdmMDhjMWI3OTlmNy5wbmcifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6ZmlsZS5kb3dubG9hZCJdfQ.lTo6eNAwsBqWI5k8MSRbnwbdh07MzEElj392ln--qJM"
              };
              message["receiver"] = msg.recipient_id;
            } else if (msg.messenger_type === "tg") {
              var send_message_url = `https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`;

              message["chat_id"] = msg.recipient_id;
            }

            //creating request options
            let headers = {
              'Content-Type': 'application/json'
            };

            //adding token for viber
            if (msg.messenger_type === "vb") {
              headers['X-Viber-Auth-Token'] = process.env.VB_TOKEN;
            }

            //making the request
            axios
              .post(send_message_url, message, { headers })
              .then((res) => {
                //sending response
                msg.payload = res;
                node.send(msg);
              })
              .catch((error) => {
                node.error("Sending message error: " + error);
              });
          }
        });
      });
    });
  }
  RED.nodes.registerType("send-message", SendMessageNode);
}
