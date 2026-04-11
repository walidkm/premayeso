import assert from "node:assert/strict";
import {
  buildAdminPermissions,
  hasContentAuthorAccess,
  hasPlatformAdminAccess,
  hasReviewerAccess,
  isLearnerRole,
  normalizeSubscriptionStatus,
  normalizeUserRole,
} from "./roles.js";

function runRoleTests() {
  assert.equal(normalizeUserRole("student"), "student");
  assert.equal(normalizeUserRole("admin"), "platform_admin");
  assert.equal(normalizeUserRole("family_admin"), "reviewer");
  assert.equal(normalizeUserRole("SUPER_ADMIN"), "super_admin");
  assert.equal(normalizeUserRole("unknown"), null);

  assert.equal(isLearnerRole("student"), true);
  assert.equal(isLearnerRole("platform_admin"), false);

  assert.equal(hasContentAuthorAccess("content_author"), true);
  assert.equal(hasContentAuthorAccess("school_admin"), true);
  assert.equal(hasContentAuthorAccess("reviewer"), false);

  assert.equal(hasReviewerAccess("reviewer"), true);
  assert.equal(hasReviewerAccess("platform_admin"), true);
  assert.equal(hasReviewerAccess("content_author"), false);

  assert.equal(hasPlatformAdminAccess("platform_admin"), true);
  assert.equal(hasPlatformAdminAccess("super_admin"), true);
  assert.equal(hasPlatformAdminAccess("school_admin"), false);

  assert.equal(normalizeSubscriptionStatus("premium"), "premium");
  assert.equal(normalizeSubscriptionStatus("VOUCHER"), "voucher");
  assert.equal(normalizeSubscriptionStatus("legacy"), null);

  assert.deepEqual(buildAdminPermissions("platform_admin"), {
    can_author_content: true,
    can_review_content: true,
    can_manage_platform: true,
  });
  assert.deepEqual(buildAdminPermissions("reviewer"), {
    can_author_content: false,
    can_review_content: true,
    can_manage_platform: false,
  });
  assert.equal(buildAdminPermissions("student"), null);
}

runRoleTests();
console.log("roles tests passed");
