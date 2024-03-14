var express = require('express');
var router = express.Router();

var latestVersion = "1.2.0";
var minAppVersion = "1.29.0";

const checkVersion = (version1, version2) => {
  // 判断 version1 是否比 version2 新
  var v1 = version1.split('.');
  var v2 = version2.split('.');
  var len = Math.max(v1.length, v2.length);
  while (v1.length < len) {
    v1.push('0');
  }
  while (v2.length < len) {
    v2.push('0');
  }
  for (var i = 0; i < len; i++) {
    var num1 = parseInt(v1[i]);
    var num2 = parseInt(v2[i]);
    if (num1 > num2) {
      return 1;
    } else if (num1 < num2) {
      return -1;
    }
  }
  return 0;
}
/* GET home page. */
router.get('/checkUpdate', function (req, res, next) {
  // 接收 url 参数 version & appVersion
  var version = req.query.version;
  var appVersion = req.query.appVersion;
  // appVersion 小于等于 minAppVersion 时，并且 version 小于 latestVersion 时，返回需要更新
  if (checkVersion(version, latestVersion) < 0 && checkVersion(appVersion, minAppVersion) <= 0) {
    res.json({
      status: 'SUCCESS',
      msg: '',
      data: {
        needUpdate: true,
      }
    })
  }
  else {
    res.json({
      status: 'SUCCESS',
      msg: '',
      data: {
        needUpdate: false,
      }
    })
  }
});

module.exports = router;
