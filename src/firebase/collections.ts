export enum RootCollections {
    PEOPLE = "people",
    GROUPS = "groups",
    RECIPES = "recipes",
    PLANS = "plans"
}

export enum SubCollections {
    INVITES = "invites",
    MEMBERS = "members",
    GROUPS = "groups",
    GROUP_MEMBERS = "group_members",
    RECIPE_MEMBERS = "recipe_members",
    RECIPES = "recipes",
    PLANS = "plans",
    DAYS = "days"
}

export const COLLECTION = {
    ROOT: {
        PEOPLE: "people",
        GROUPS: "groups",
        RECIPES: "recipes",
        PLANS: "plans"
    },
    SUB: {
        PEOPLE: {
            GROUPS: "groups",
            RECIPES: "recipes"
        },
        GROUPS: {
            MEMBERS: "members"
        },
        RECIPES: {
            ASSOCIATIONS: "associations"
        },
        PLANS: {}
    }
};
