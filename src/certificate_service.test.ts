import assert from "node:assert/strict";
import { canIssueCertificate } from "./certificate_service.ts";

const event = { id: "e1", title: "Creator Cup", ended: true };
const base = { id: "p1", displayName: "Ari", completed: true, assets: ["asset-1"], moderation: "approved" as const };
assert.equal(canIssueCertificate(base, event), true);
assert.equal(canIssueCertificate({ ...base, moderation: "pending" }, event), false);
assert.equal(canIssueCertificate({ ...base, assets: [] }, event), false);
console.log("certificate eligibility decisions pass");
