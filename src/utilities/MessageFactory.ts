export enum MessageFactoryPrimaryDomain {
    GROUP = "group",
    RECIPE = "recipe",
    PLAN = "plan"
}

export enum MessageFactorySecondaryDomain {
    AUTHORS = "authors",
    INGREDIENTS = "ingredients",
    INSTRUCTIONS = "instructions"
}

export enum MessageFactoryOperation {
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete"
}

export enum MessageFactoryResult {
    SUCCESS = "success",
    ERROR = "error",
    PERMISSION_DENY = "permission_deny",
    EMPTY = "empty",
    BAD_REQUEST = "bad_request"
}

export class MessageFactory {
    primaryDomain: MessageFactoryPrimaryDomain;
    secondaryDomain: MessageFactorySecondaryDomain;
    operation: MessageFactoryOperation;
    result: MessageFactoryResult;
    errorMessage: string;

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

    setErrorMessage(errorMessage: string) {
        this.errorMessage = errorMessage;

        return this;
    }

    build() {
        return this;
    }
}