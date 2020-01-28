import {PermissionEngine} from "./PermissionEngine";
import {RecipeUserRole} from "../models/index";

export class RecipePermissionEngine extends PermissionEngine {
    constructor() {
        super();
    }

    /**
     * Determines if a user can edit a recipe based on their role.
     *
     * @param {RecipeUserRole} memberRole the member's role
     * @returns {boolean} whether or not the member can edit a recipe
     */
    static canEditRecipe(memberRole: RecipeUserRole) {
        return memberRole === RecipeUserRole.OWNER || memberRole === RecipeUserRole.CONTRIBUTOR;
    }
}