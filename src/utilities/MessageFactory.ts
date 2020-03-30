export enum MessageFactoryPrimaryDomain {
    GROUP = "group",
    RECIPE = "recipe",
    PLAN = "plan",
    PEOPLE = "people"
}

export const MESSAGE_FACTORY_SECONDARY_DOMAIN = {
    RECIPE: {
        CONTRIBUTORS: "contributors",
        FAVORITES: "favorites"
    }
}

export enum MessageFactorySecondaryDomain {
    AUTHORS = "authors",
    INGREDIENTS = "ingredients",
    INSTRUCTIONS = "instructions",
    INVITES = "invites",
    RECIPES = "recipes",
    GROUPS = "groups",
    PLANS = "plans",
    NAME = "name",
    GROUP_MEMBERS = "group_members"
}

export enum MessageFactoryOperation {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    GET = "get",
    SEARCH = "search"
}

export enum MessageFactoryResult {
    SUCCESS = "success",
    ERROR = "error",
    PERMISSION_DENY = "permission_deny",
    EMPTY = "empty",
    BAD_REQUEST = "bad_request",
    ALREADY_EXISTS = "already_exists"
}

export class MessageFactory {
    primaryDomain: MessageFactoryPrimaryDomain;
    secondaryDomain: MessageFactorySecondaryDomain | string;
    operation: MessageFactoryOperation;
    result: MessageFactoryResult;
    message: string;
    data: object;

    setPrimaryDomain(primaryDomain: MessageFactoryPrimaryDomain) {
        this.primaryDomain = primaryDomain;

        return this;
    }

    setSecondaryDomain(secondaryDomain: MessageFactorySecondaryDomain | string) {
        this.secondaryDomain = secondaryDomain;

        return this;
    }

    setOperation(operation: MessageFactoryOperation) {
        this.operation = operation;

        return this;
    }

    setResult(result: MessageFactoryResult) {
        this.result = result;

        return this;
    }

    setMessage(message: string) {
        this.message = message;

        return this;
    }

    setData(data: object) {
        this.data = data;

        return this;
    }

    build() {
        return this;
    }
}