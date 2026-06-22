import { handleFacodiMechanism } from '../_shared/facodi-mechanism.ts';

Deno.serve((req) => handleFacodiMechanism(req, {
  functionName: 'v2_match_video_to_curriculum',
  jobType: 'match_video_to_curriculum',
}));