import {ValidationEngine} from "./ValidationEngine";
import {Association, Instruction, Ingredient, RecipeAssociation} from "../models/index";

/**
 * Provides recipe validation.
 */
export class RecipeValidationEngine extends ValidationEngine {
    constructor() {
        super();
    }

    static validateName(name: String) {
        return this.validateString(name);
    }

    static validateInstructions(instructions: Array<Instruction>) {
        return this.validateArray(instructions);
    }

    static validateIngredients(ingredients: Array<Ingredient>) {
        return this.validateArray(ingredients);
    }

    static validateAuthors(authors: Array<Association>) {
        const hasOwner = !!authors.find(author => author.association === RecipeAssociation.OWNER);

        if (!hasOwner) {
            return false;
        } else {
            return this.validateArray(authors);
        }
    }
}