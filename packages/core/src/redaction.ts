/**
 * Helper to redact sensitive information from reports and logs.
 */
export class Redactor {
    private static readonly SENSITIVE_PATTERNS = [
        /password/i,
        /token/i,
        /secret/i,
        /api_?key/i,
        /auth/i,
        /cookie/i,
        /credit_?card/i,
        /ssn/i,
    ]

    /**
     * Checks if a column name is considered sensitive.
     */
    static isSensitive(columnName: string): boolean {
        return this.SENSITIVE_PATTERNS.some((pattern) => pattern.test(columnName))
    }

    /**
     * Redacts sensitive values in a row object.
     * @param row The row data to redact
     * @returns A new object with sensitive values replaced by a placeholder
     */
    static redactRow(row: Record<string, any>): Record<string, any> {
        const redacted: Record<string, any> = {}
        for (const [key, value] of Object.entries(row)) {
            if (this.isSensitive(key)) {
                redacted[key] = '[REDACTED]'
            } else {
                redacted[key] = value
            }
        }
        return redacted
    }

    /**
     * Redacts sensitive values in a list of rows.
     */
    static redactRows(rows: Record<string, any>[]): Record<string, any>[] {
        return rows.map((row) => this.redactRow(row))
    }
}
