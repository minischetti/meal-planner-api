import {GroupUserRole, RecipeUserRole, PlanUserRole} from "./roles";

export interface Profile {
    id: string
    name: string
    email: string
    activeMealPlan: string
    recipes: Array<Recipe>
    favoriteRecipes: Array<string> // Array of recipe ids
}

export interface SenderInvite extends RecipientInvite {
    recipient: string // the recipient's user id
}

export interface RecipientInvite {
    inviteId: string
    sender: string // the sender's user id
    group: string // the group id
    active: boolean
    answer: boolean
}

export interface Group {
    id: string
    name: string
    members: Array<string>
    recipes: Array<string>
    invites: Array<SenderInvite>
}

export interface GroupUser {
    id: string // user id
    role: GroupUserRole
}

export interface Recipe {
    name: string
    prepTime: string
    cookTime: string
    yield: string
    authors: Array<Author>
    ingredients: Array<Ingredient>
    instructions: Array<Instruction>
    favorites: Array<string> // Array of user ids
}


export interface EditedRecipe {
    id: string
    name: string
    prepTime: string
    cookTime: string
    authors?: Array<Author>
    ingredients: Array<Ingredient>
    instructions: Array<Instruction>
}

export interface Author {
    id: string // user id
    role: RecipeUserRole
}

export interface Ingredient {
    description: string
    optional: boolean
}

export interface Instruction {
    body: string
}

export interface Plan {
    id: string
    days: Array<PlanDay>
    active: boolean
}

export interface PlanDay {
    id: number
    recipe: string
}