/**
 * Provides common validation functionality to be shared across many functional domains.
 */
export class ValidationEngine {
    protected static validateArray(array: Array<any>) {
        return array && array.length;
    }
}