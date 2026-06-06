const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'pingmobile',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createObituaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateObituary', inputVars);
}
createObituaryRef.operationName = 'CreateObituary';
exports.createObituaryRef = createObituaryRef;

exports.createObituary = function createObituary(dcOrVars, vars) {
  return executeMutation(createObituaryRef(dcOrVars, vars));
};

const getObituaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetObituary', inputVars);
}
getObituaryRef.operationName = 'GetObituary';
exports.getObituaryRef = getObituaryRef;

exports.getObituary = function getObituary(dcOrVars, vars) {
  return executeQuery(getObituaryRef(dcOrVars, vars));
};

const updateObituaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateObituary', inputVars);
}
updateObituaryRef.operationName = 'UpdateObituary';
exports.updateObituaryRef = updateObituaryRef;

exports.updateObituary = function updateObituary(dcOrVars, vars) {
  return executeMutation(updateObituaryRef(dcOrVars, vars));
};

const listMyObituariesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyObituaries');
}
listMyObituariesRef.operationName = 'ListMyObituaries';
exports.listMyObituariesRef = listMyObituariesRef;

exports.listMyObituaries = function listMyObituaries(dc) {
  return executeQuery(listMyObituariesRef(dc));
};
