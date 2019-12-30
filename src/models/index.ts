export interface NewUserRequest {
    email: string,
    password: string
}

export interface Profile {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    pendingInvites: Array<Invite> // an array of pending group invites
    recipes: Array<Recipe>, // an array of recipes
    groups: Array<string> // an array of group ids
}

export interface NewProfileRequest {
    firstName: string,
    lastName: string
}

export interface NewInviteRequest {
    sender: string, // the sender's user id
    recipient: string, // the recipient's user id
    group: string // the group id
}

export interface Invite {
    id: string, // the id of the invite
    sender: string, // the sender's user id
    recipient: string, // the recipient's user id
    group: string // the group id
}

export interface Group {
    id: string,
    name: string,
    members: Array<string>,
    recipes: Array<string>,
    invites: Array<Invite>
}

export interface NewGroupRequest {
    name: string,
    members: Array<GroupMember>
}

export interface GroupMember {
    id: string, // user id
    status: GroupMemberStatus
}

export enum GroupMemberStatus {
    OWNER = "owner",
    CONTRIBUTOR = "contributor",
    MEMBER = "member"
}

export interface Recipe {
    id: string,
    name: string,
    authors: Array<Author>,
    ingredients: Array<Ingredient>,
    instructions: Array<Instruction>
}

export interface NewRecipeRequest {
    name: string,
    authors: Array<Author>,
    ingredients: Array<Ingredient>,
    instructions: Array<Instruction>
}

export interface Author {
    id: string, // user id
    status: AuthorStatus
}

export enum AuthorStatus {
    OWNER = "owner",
    CONTRIBUTOR = "contributor"
}

export interface Ingredient {
    name: string,
    amount: string
}

export interface Instruction {
    body: string
}