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

      //get configs of node
      let messenger_type = RED.util.evaluateNodeProperty(
        config.messenger_type,
        config.messenger_type_type,
        this,
        msg
      );
      let templateId = RED.util.evaluateNodeProperty(
        config.templateId,
        config.templateId_type,
        this,
        msg
      );
      let language = RED.util.evaluateNodeProperty(
        config.language,
        config.language_type,
        this,
        msg
      );
      let recipient_id = RED.util.evaluateNodeProperty(
        config.recipient_id,
        config.recipient_id_type,
        this,
        msg
      );

      

      //get message
      axios
        .get(`${process.env.API_URL}/messages?templateId=${templateId}&messenger_type=${messenger_type}`)
        .then((response) => {
          let message = JSON.stringify(response.data.json);

          //set template vars
          if (!response.data.hasOwnProperty(language)) return node.error("Template does not support this language.");
          let message_vars = msg.template_vars ? Object.assign(msg.template_vars, response.data[language]) : response.data[language];

          for (let key in message_vars) {
            message = message.replace(new RegExp("{{" + key + "}}", "g"), message_vars[key]);
          };

          message = JSON.parse(message);



          //https request to send message

          //crating request data
          if (messenger_type == "fb") {
            var send_message_url = "https://graph.facebook.com/v10.0/me/messages?access_token=" + process.env.FB_PAGE_TOKEN;

            message["messaging_type"] = "RESPONSE";
            message["recipient"] = { "id": recipient_id };
          } else if (messenger_type == "vb") {
            var send_message_url = "https://chatapi.viber.com/pa/send_message";

            message["sender"] = {
              "name": process.env.VB_BOT_NAME,
              "avatar": process.env.VB_AVATAR_URL
            };
            message["receiver"] = recipient_id;
          } else if (messenger_type == "tg") {
            var send_message_url = `https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`;

            message["chat_id"] = recipient_id;
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
                .put(`${process.env.API_URL}/users?user_id=${recipient_id}`, {
                    "state": templateId
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
