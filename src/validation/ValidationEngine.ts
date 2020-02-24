/**
 * Provides common validation functionality to be shared across many functional domains.
 */
export class ValidationEngine {
    protected static validateString(string: String) {
        return string && string.length;
    }

    protected static validateArray(array: Array<any>) {
        return array && array.length;
    }
}