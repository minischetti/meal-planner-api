import {GroupUserRole, RecipeUserRole, PlanUserRole} from "./roles";

export interface Profile {
    id: string
    firstName: string
    lastName: string
    email: string
    activeMealPlan: string
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
    id?: string
    name: string
    authors: Array<Author>
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