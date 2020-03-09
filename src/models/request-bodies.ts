import {Author, GroupUser, Ingredient, Instruction, Recipe, PlanDay} from "./data-types";

export interface NewPersonAccountRequest {
    email: string
    password: string
}

export interface NewPersonProfileRequest {
    id: string
    name: string
}

export interface NewGroupRequest {
    id: string // new group document id
    name: string
}

export interface NewRecipeRequest {
    id: string // new recipe document id
    owner: string
    name: string
    prepTime: string
    cookTime: string
    ingredients: Array<Ingredient>
    instructions: Array<Instruction>
}

export interface EditedRecipeRequest {
    id: string
    name: string
    authors: Array<Author>
    ingredients: Array<Ingredient>
    instructions: Array<Instruction>
}

export interface GroupInviteResponseRequest {
    inviteId: string
    group: string // the group id
    answer: boolean // true, if accepting
}

export interface AddRecipeToGroupRequest {
    recipeOwnerId: string
    recipeId: string
}

export interface NewMealPlanRequest {
    name: string
    id: string
    days: Array<PlanDay>
}

export interface RecipeNameUpdateRequest {
    personId: string,
    name: string
}

export interface RecipeAuthorUpdateRequest {
    personId: string,
    authors: Array<string>
}

export interface RecipeIngredientUpdateRequest {
    personId: string,
    ingredients: Array<Ingredient>
}

export interface RecipeInstructionUpdateRequest {
    personId: string,
    instructions: Array<Instruction>
}