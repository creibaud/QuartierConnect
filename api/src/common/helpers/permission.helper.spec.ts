import { ForbiddenException } from "@nestjs/common";
import { PermissionHelper } from "./permission.helper";

describe("PermissionHelper", () => {
    describe("canModifyOwnedResource", () => {
        it("should allow owner to modify their own resource", () => {
            const result = PermissionHelper.canModifyOwnedResource(
                "user-1",
                "user-1",
                "resident",
            );
            expect(result).toBe(true);
        });

        it("should allow admin to modify any resource", () => {
            const result = PermissionHelper.canModifyOwnedResource(
                "user-1",
                "admin-user",
                "admin",
            );
            expect(result).toBe(true);
        });

        it("should deny non-owner from modifying resource", () => {
            const result = PermissionHelper.canModifyOwnedResource(
                "user-1",
                "user-2",
                "resident",
            );
            expect(result).toBe(false);
        });

        it("should deny moderators from modifying others' resources", () => {
            const result = PermissionHelper.canModifyOwnedResource(
                "user-1",
                "moderator-user",
                "moderator",
            );
            expect(result).toBe(false);
        });

        it("should handle empty IDs correctly", () => {
            const result = PermissionHelper.canModifyOwnedResource(
                "",
                "",
                "resident",
            );
            expect(result).toBe(true); // Same empty string = owner match
        });
    });

    describe("canModerateContent", () => {
        it("should allow admin to moderate", () => {
            const result = PermissionHelper.canModerateContent("admin");
            expect(result).toBe(true);
        });

        it("should allow moderator to moderate", () => {
            const result = PermissionHelper.canModerateContent("moderator");
            expect(result).toBe(true);
        });

        it("should deny residents from moderating", () => {
            const result = PermissionHelper.canModerateContent("resident");
            expect(result).toBe(false);
        });

        it("should deny unknown roles from moderating", () => {
            const result = PermissionHelper.canModerateContent("guest");
            expect(result).toBe(false);
        });

        it("should be case-sensitive", () => {
            const result = PermissionHelper.canModerateContent("ADMIN");
            expect(result).toBe(false); // Case mismatch
        });
    });

    describe("canDeleteResource", () => {
        it("should allow owner to delete their resource", () => {
            const result = PermissionHelper.canDeleteResource(
                "user-1",
                "user-1",
                "resident",
            );
            expect(result).toBe(true);
        });

        it("should allow admin to delete any resource", () => {
            const result = PermissionHelper.canDeleteResource(
                "user-1",
                "admin-user",
                "admin",
            );
            expect(result).toBe(true);
        });

        it("should deny non-owner from deleting resource", () => {
            const result = PermissionHelper.canDeleteResource(
                "user-1",
                "user-2",
                "resident",
            );
            expect(result).toBe(false);
        });

        it("should deny moderators from deleting others' resources", () => {
            const result = PermissionHelper.canDeleteResource(
                "user-1",
                "moderator-user",
                "moderator",
            );
            expect(result).toBe(false);
        });
    });

    describe("validateModifyPermission", () => {
        it("should not throw when owner modifies resource", () => {
            expect(() => {
                PermissionHelper.validateModifyPermission(
                    "user-1",
                    "user-1",
                    "resident",
                );
            }).not.toThrow();
        });

        it("should not throw when admin modifies resource", () => {
            expect(() => {
                PermissionHelper.validateModifyPermission(
                    "user-1",
                    "admin-user",
                    "admin",
                );
            }).not.toThrow();
        });

        it("should throw ForbiddenException when non-owner tries to modify", () => {
            expect(() => {
                PermissionHelper.validateModifyPermission(
                    "user-1",
                    "user-2",
                    "resident",
                );
            }).toThrow(ForbiddenException);
        });

        it("should throw with correct error message", () => {
            expect(() => {
                PermissionHelper.validateModifyPermission(
                    "user-1",
                    "user-2",
                    "resident",
                );
            }).toThrow("You are not authorized to modify this resource");
        });

        it("should throw when moderator tries to modify others' resource", () => {
            expect(() => {
                PermissionHelper.validateModifyPermission(
                    "user-1",
                    "moderator-user",
                    "moderator",
                );
            }).toThrow(ForbiddenException);
        });
    });

    describe("validateModerationPermission", () => {
        it("should not throw for admin", () => {
            expect(() => {
                PermissionHelper.validateModerationPermission("admin");
            }).not.toThrow();
        });

        it("should not throw for moderator", () => {
            expect(() => {
                PermissionHelper.validateModerationPermission("moderator");
            }).not.toThrow();
        });

        it("should throw ForbiddenException for resident", () => {
            expect(() => {
                PermissionHelper.validateModerationPermission("resident");
            }).toThrow(ForbiddenException);
        });

        it("should throw with correct error message", () => {
            expect(() => {
                PermissionHelper.validateModerationPermission("resident");
            }).toThrow("You do not have moderation permissions");
        });

        it("should throw for unknown roles", () => {
            expect(() => {
                PermissionHelper.validateModerationPermission("guest");
            }).toThrow(ForbiddenException);
        });
    });

    describe("validateDeletePermission", () => {
        it("should not throw when owner deletes resource", () => {
            expect(() => {
                PermissionHelper.validateDeletePermission(
                    "user-1",
                    "user-1",
                    "resident",
                );
            }).not.toThrow();
        });

        it("should not throw when admin deletes resource", () => {
            expect(() => {
                PermissionHelper.validateDeletePermission(
                    "user-1",
                    "admin-user",
                    "admin",
                );
            }).not.toThrow();
        });

        it("should throw ForbiddenException when non-owner tries to delete", () => {
            expect(() => {
                PermissionHelper.validateDeletePermission(
                    "user-1",
                    "user-2",
                    "resident",
                );
            }).toThrow(ForbiddenException);
        });

        it("should throw with correct error message", () => {
            expect(() => {
                PermissionHelper.validateDeletePermission(
                    "user-1",
                    "user-2",
                    "resident",
                );
            }).toThrow("You are not authorized to delete this resource");
        });

        it("should throw when moderator tries to delete others' resource", () => {
            expect(() => {
                PermissionHelper.validateDeletePermission(
                    "user-1",
                    "moderator-user",
                    "moderator",
                );
            }).toThrow(ForbiddenException);
        });
    });
});
