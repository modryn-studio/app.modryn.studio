import { neon } from '@neondatabase/serverless';

// Single connection factory — reused across the module lifecycle in each
// serverless function invocation. DATABASE_URL is validated at cold start
// via src/lib/env.ts before any route runs.
const sql = neon(process.env.DATABASE_URL!);

export default sql;
