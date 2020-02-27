export enum MessageFactoryPrimaryDomain {
    GROUP = "group",
    RECIPE = "recipe",
    PLAN = "plan",
    PEOPLE = "people"
}

export enum MessageFactorySecondaryDomain {
    AUTHORS = "authors",
    INGREDIENTS = "ingredients",
    INSTRUCTIONS = "instructions",
    INVITES = "invites",
    RECIPES = "recipes",
    PLANS = "plans",
    NAME = "name"
}

export enum MessageFactoryOperation {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    GET = "get"
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
    secondaryDomain: MessageFactorySecondaryDomain;
    operation: MessageFactoryOperation;
    result: MessageFactoryResult;
    message: string;

    setPrimaryDomain(primaryDomain: MessageFactoryPrimaryDomain) {
        this.primaryDomain = primaryDomain;

        return this;
    }

    setSecondaryDomain(secondaryDomain: MessageFactorySecondaryDomain) {
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

    build() {
        return this;
    }
}