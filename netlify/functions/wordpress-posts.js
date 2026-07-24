const { connectBlobContext, getArticles } = require("./article-service");

exports.handler = async (event) => {
  connectBlobContext(event);
  return getArticles();
};
