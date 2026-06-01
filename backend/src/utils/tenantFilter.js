/**
 * Builds a tenant filter fragment for list queries.
 *
 * When `tenantId` is null (a SYSTEM_ADMIN browsing across all clubs), no
 * tenant restriction is applied so every tenant's rows are returned. For any
 * other role `tenantId` is always present and the data is hard-scoped.
 *
 * @param {string|null} tenantId
 * @param {string} [column='tenant_id'] qualified column, e.g. 'm.tenant_id'
 * @param {number} [startIndex=1] first positional parameter index to use
 * @returns {{ clause: string, params: Array<string> }}
 */
export const tenantFilter = (tenantId, column = 'tenant_id', startIndex = 1) => {
  if (!tenantId) {
    return { clause: '', params: [] };
  }
  return { clause: `${column} = $${startIndex}`, params: [tenantId] };
};
