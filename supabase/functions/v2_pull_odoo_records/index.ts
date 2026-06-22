import { handleFacodiMechanism } from '../_shared/facodi-mechanism.ts';

Deno.serve((req) => handleFacodiMechanism(req, {
  functionName: 'v2_pull_odoo_records',
  jobType: 'pull_odoo_records',
  kind: 'odoo',
}));