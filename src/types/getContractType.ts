const getContractType = (action: string): string => {
  if (!action) {
    return 'CALL';
  }
  
  const actionUpper = action.toUpperCase();
  
  const actionMap: Record<string, string> = {
    'BUY_CALL': 'CALL',
    'BUY_PUT': 'PUT',
    'CALL': 'CALL',
    'PUT': 'PUT',
    'RISE': 'RISE',
    'FALL': 'FALL',
    'BUY_RISE': 'RISE',
    'BUY_FALL': 'FALL'
  };
  
  const contractType = actionMap[actionUpper];
  if (!contractType) {
    console.warn(`⚠️ [getProposal] Unknown action: ${action}, defaulting to CALL`);
    return 'CALL';
  }
  
  return contractType;
};

module.exports = getContractType;