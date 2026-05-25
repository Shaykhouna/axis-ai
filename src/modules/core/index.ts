// Public API of the Core module.
// Module boundary rule: other modules import ONLY from this file.
// Never reach into ./owner, ./domains, ./db directly from outside.

export { provisionOwner, updateOwnerName } from "./owner";
export { listDomains, createDomain, deleteDomain } from "./domains";
export { getDb } from "./db";
export type { Owner, Domain } from "./types";