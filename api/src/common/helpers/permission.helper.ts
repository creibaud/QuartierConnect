import { ForbiddenException } from "@nestjs/common";

/**
 * Helper centralisé pour les vérifications de permissions
 * Élimine la duplication de logique de permissions across 5+ services
 */
export class PermissionHelper {
    /**
     * Vérifie si un utilisateur peut modifier une resource qu'il possède
     * @param resourceOwner ID du propriétaire de la resource
     * @param userId ID de l'utilisateur actuel
     * @param userRole Rôle de l'utilisateur ('admin', 'moderator', 'resident')
     * @returns true si l'utilisateur a la permission de modifier
     */
    static canModifyOwnedResource(
        resourceOwner: string,
        userId: string,
        userRole: string,
    ): boolean {
        return resourceOwner === userId || userRole === "admin";
    }

    /**
     * Vérifie si un utilisateur peut modérer du contenu
     * @param userRole Rôle de l'utilisateur
     * @returns true si l'utilisateur est admin ou modérateur
     */
    static canModerateContent(userRole: string): boolean {
        return ["admin", "moderator"].includes(userRole);
    }

    /**
     * Vérifie si un utilisateur peut supprimer une resource
     * @param resourceOwner ID du propriétaire
     * @param userId ID de l'utilisateur
     * @param userRole Rôle de l'utilisateur
     * @returns true si peut supprimer
     */
    static canDeleteResource(
        resourceOwner: string,
        userId: string,
        userRole: string,
    ): boolean {
        return resourceOwner === userId || userRole === "admin";
    }

    /**
     * Valide une permission, lance ForbiddenException si non autorisé
     * @throws ForbiddenException si non autorisé
     */
    static validateModifyPermission(
        resourceOwner: string,
        userId: string,
        userRole: string,
    ): void {
        if (!this.canModifyOwnedResource(resourceOwner, userId, userRole)) {
            throw new ForbiddenException(
                "You are not authorized to modify this resource",
            );
        }
    }

    /**
     * Valide une permission de modération
     * @throws ForbiddenException si non autorisé
     */
    static validateModerationPermission(userRole: string): void {
        if (!this.canModerateContent(userRole)) {
            throw new ForbiddenException(
                "You do not have moderation permissions",
            );
        }
    }

    /**
     * Valide une permission de suppression
     * @throws ForbiddenException si non autorisé
     */
    static validateDeletePermission(
        resourceOwner: string,
        userId: string,
        userRole: string,
    ): void {
        if (!this.canDeleteResource(resourceOwner, userId, userRole)) {
            throw new ForbiddenException(
                "You are not authorized to delete this resource",
            );
        }
    }
}
