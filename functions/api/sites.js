import { filterPublicConfig, json, readConfig } from "./_shared/catalogV2.js";
export async function onRequestGet({ env }) { try { return json(filterPublicConfig(await readConfig(env))); } catch (error) { return json({ error: error.message }, 503); } }
