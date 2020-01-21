import {Author, GroupUser, Ingredient, Instruction, Recipe, PlanDay} from "./data-types";

export interface NewPersonAccountRequest {
    email: string
    password: string
}

export interface NewPersonProfileRequest {
    id: string
    firstName: string
    lastName: string
}

export interface NewGroupRequest {
    id: string // new group document id
    name: string
}

export interface NewRecipeRequest extends EditedRecipeRequest {
    id: string // new recipe document id
}

export interface EditedRecipeRequest {
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
