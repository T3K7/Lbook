module.exports = async function (configuration) {
  // No-op code signing to avoid running Wine signtool in containerized Linux builds
  return true;
};
