import { handleFacodiMechanism } from '../_shared/facodi-mechanism.ts';

Deno.serve((req) => handleFacodiMechanism(req, {
  functionName: 'v2_generate_course_structure',
  jobType: 'generate_course_structure',
}));