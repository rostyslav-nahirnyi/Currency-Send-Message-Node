module.exports = function(RED) {
  function SendMessageNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.on('input', function(msg) {
      msg.payload = "msg";
      node.send(msg);
    });
  }
  RED.nodes.registerType("send-message", SendMessageNode);
}
