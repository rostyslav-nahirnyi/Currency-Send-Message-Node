module.exports = function(RED) {
  function SendMessageNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    //for making requests
    const axios = require('axios');

    //if 'FB_PAGE_TOKEN' var doesn't exist in envs
    if (!process.env.FB_PAGE_TOKEN) {
      return node.error("Please add Facebook page token (for gettings access) variable (as FB_PAGE_TOKEN) to envs!");
    }
    //if 'VB_TOKEN' var doesn't exist in envs
    if (!process.env.VB_TOKEN) {
      return node.error("Please add Viber token (for gettings access) variable (as VB_TOKEN) to envs!");
    }
    //if 'VB_BOT_NAME' var doesn't exist in envs
    if (!process.env.VB_BOT_NAME) {
      return node.error("Please add Viber bot name variable (as VB_BOT_NAME) to envs!");
    }
    //if 'VB_AVATAR_URL' var doesn't exist in envs
    if (!process.env.VB_AVATAR_URL) {
      return node.error("Please add url of avatar of Viber bot variable (as VB_AVATAR_URL) to envs!");
    }
    //if 'TG_TOKEN' var doesn't exist in envs
    if (!process.env.TG_TOKEN) {
      return node.error("Please add Telegram token (for gettings access) variable (as TG_TOKEN) to envs!");
    }
    //if 'API_URL' var doesn't exist in envs
    if (!process.env.API_URL) {
      return node.error("Please add api url variable (as API_URL) to envs!");
    }

    //node 'input' event handler
    node.on('input', function (msg) {
      //if 'messenger_type' var doesn't exist
      if (!config.messenger_type) return node.error("Please speсify messenger_type.");
      //if 'templateId' var doesn't exist
      if (!config.templateId) return node.error("Please speсify templateId.");
      //if 'language' var doesn't exist
      if (!config.language) return node.error("Please speсify language.");
      //if 'recipient_id' var doesn't exist
      if (!config.recipient_id) return node.error("Please speсify recipient_id.");

      if (config.messenger_type_type == "msg") config.messenger_type = msg[config.messenger_type];
      if (config.templateId_type == "msg") config.templateId = msg[config.templateId];
      if (config.language_type == "msg") config.language = msg[config.language];
      if (config.recipient_id_type == "msg") config.recipient_id = msg[config.recipient_id];

      //get message
      axios
        .get(`${process.env.API_URL}/messages?templateId=${config.templateId}&messenger_type=${config.messenger_type}`)
        .then((response) => {
          let message = JSON.stringify(response.data.json);

          //set template vars
          if (!response.data.hasOwnProperty(config.language)) return node.error("Template does not support this language.");
          let message_vars = msg.template_vars ? Object.assign(msg.template_vars, response.data[config.language]) : response.data[config.language];

          for (let key in message_vars) {
            message = message.replace(new RegExp("{{" + key + "}}", "g"), message_vars[key]);
          };

          message = JSON.parse(message);



          //https request to send message

          //crating request data
          if (config.messenger_type == "fb") {
            var send_message_url = "https://graph.facebook.com/v10.0/me/messages?access_token=" + process.env.FB_PAGE_TOKEN;

            message["messaging_type"] = "RESPONSE";
            message["recipient"] = { "id": config.recipient_id };
          } else if (config.messenger_type == "vb") {
            var send_message_url = "https://chatapi.viber.com/pa/send_message";

            message["sender"] = {
              "name": process.env.VB_BOT_NAME,
              "avatar": process.env.VB_AVATAR_URL
            };
            message["receiver"] = config.recipient_id;
          } else if (config.messenger_type == "tg") {
            var send_message_url = `https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`;

            message["chat_id"] = config.recipient_id;
          }

          //creating request options
          let headers = {
            'Content-Type': 'application/json'
          };

          //adding token for viber
          if (config.messenger_type == "vb") {
            headers['X-Viber-Auth-Token'] = process.env.VB_TOKEN;
          }

          //making the request
          axios
            .post(send_message_url, message, { headers })
            .then((res) => {
              //sending response
              msg.payload = res;
              node.send(msg);

              //change user state
              axios
                .post(`${process.env.API_URL}/users?user_id=${config.recipient_id}`, {
                  "state": config.templateId
                }, headers)
                .catch((error) => {
                  node.error("Setting user state error: " + error);
                });
            })
            .catch((error) => {
              node.error("Sending message error: " + error);
            });
        });
    });
  }
  RED.nodes.registerType("send-message", SendMessageNode);
}
