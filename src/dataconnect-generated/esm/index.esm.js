import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'pingmobile',
  location: 'us-east4'
};

export const createObituaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateObituary', inputVars);
}
createObituaryRef.operationName = 'CreateObituary';

export function createObituary(dcOrVars, vars) {
  return executeMutation(createObituaryRef(dcOrVars, vars));
}

export const getObituaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetObituary', inputVars);
}
getObituaryRef.operationName = 'GetObituary';

export function getObituary(dcOrVars, vars) {
  return executeQuery(getObituaryRef(dcOrVars, vars));
}

export const updateObituaryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateObituary', inputVars);
}
updateObituaryRef.operationName = 'UpdateObituary';

export function updateObituary(dcOrVars, vars) {
  return executeMutation(updateObituaryRef(dcOrVars, vars));
}

export const listMyObituariesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyObituaries');
}
listMyObituariesRef.operationName = 'ListMyObituaries';

export function listMyObituaries(dc) {
  return executeQuery(listMyObituariesRef(dc));
}

