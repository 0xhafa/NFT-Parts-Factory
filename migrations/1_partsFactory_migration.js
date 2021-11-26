const PartsFactory = artifacts.require("PartsFactory");

module.exports = function (deployer) {
  deployer.deploy(PartsFactory, "PartsFactory", "PF");
};
