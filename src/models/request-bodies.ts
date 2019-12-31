import {Author, GroupMember, Ingredient, Instruction} from "./data-types";

export interface NewUserRequest {
    email: string
    password: string
}

export interface NewProfileRequest {
    firstName: string
    lastName: string
}

export interface NewGroupRequest {
    id: string
    name: string
}

export interface NewRecipeRequest {
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
