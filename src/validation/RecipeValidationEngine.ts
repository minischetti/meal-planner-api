import {ValidationEngine} from "./ValidationEngine";
import {Author, Instruction, Ingredient, RecipeUserRole} from "../models/index";

/**
 * Provides recipe validation.
 */
export class RecipeValidationEngine extends ValidationEngine {
    constructor() {
        super();
    }

    static validateInstructions(instructions: Array<Instruction>) {
        return this.validateArray(instructions);
    }

    static validateIngredients(ingredients: Array<Ingredient>) {
        return this.validateArray(ingredients);
    }

    static validateAuthors(authors: Array<Author>) {
        const hasOwner = !!authors.find(author => author.role === RecipeUserRole.OWNER);

        if (!hasOwner) {
            return false;
        } else {
            return this.validateArray(authors);
        }
    }
}