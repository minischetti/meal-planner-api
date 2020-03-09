import {PermissionEngine} from "./PermissionEngine";
import {RecipeAssociation} from "../models/index";

export class RecipePermissionEngine extends PermissionEngine {
    constructor() {
        super();
    }

    /**
     * Determines if a user can edit a recipe based on their role.
     *
     * @param {RecipeAssociation} memberRole the member's role
     * @returns {boolean} whether or not the member can edit a recipe
     */
    static canEditRecipe(memberRole: RecipeAssociation) {
        return memberRole === RecipeAssociation.OWNER || memberRole === RecipeAssociation.CONTRIBUTOR;
    }
}