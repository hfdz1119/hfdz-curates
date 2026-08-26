import { json, readSites } from "./_shared/catalog.js";
export async function onRequestGet({ env }) { try { return json({ sites: await readSites(env) }); } catch (error) { return json({ error: error.message }, 503); } }
