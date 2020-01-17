export interface Profile {
    id: string
    firstName: string
    lastName: string
    email: string
    activeMealPlan: string
}

export interface SourceInvite extends ReceivingInvite {
    recipient: string // the recipient's user id
}

export interface ReceivingInvite {
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
    invites: Array<SourceInvite>
}

export interface GroupMember {
    id: string // user id
    status: GroupMemberStatus
}

export enum GroupMemberStatus {
    OWNER = "owner",
    CONTRIBUTOR = "contributor",
    MEMBER = "member"
}

export interface Recipe {
    id: string
    name: string
    authors: Array<Author>
    ingredients: Array<Ingredient>
    instructions: Array<Instruction>
}

export interface Author {
    id: string // user id
    status: AuthorStatus
}

export enum AuthorStatus {
    OWNER = "owner",
    CONTRIBUTOR = "contributor"
}

export interface Ingredient {
    name: string
    amount: string
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