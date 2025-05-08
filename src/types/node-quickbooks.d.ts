// src/types/node-quickbooks.d.ts
declare module 'node-quickbooks' {
    class QuickBooks {
        static APP_CENTER_BASE: string;
        static V3_ENDPOINT_BASE_URL: string;
        static QUERY_OPERATORS: string[];
        static TOKEN_URL: string;
        static REVOKE_URL: string;
        static RECONNECT_URL: string;
        static DISCONNECT_URL: string;
        static USER_INFO_URL: string;

        constructor(
            consumerKey: string,
            consumerSecret: string,
            token: string,
            tokenSecret: string | undefined,
            realmId: string,
            useSandbox: boolean,
            debug: boolean,
            minorversion?: number,
            oauthversion?: string,
            refreshToken?: string
        );

        static setOauthVersion(version: string, useSandbox?: boolean): void;

        findPayments(criteria: any, callback: (err: any, data: any) => void): void;
        reportProfitAndLoss(options: any, callback: (err: any, data: any) => void): void;
        refreshAccessToken(callback?: (err: any, data: any) => void): void;
        getUserInfo(callback: (err: any, data: any) => void): void;

        // Add other methods as needed
        findAccounts(criteria: any, callback: (err: any, data: any) => void): void;
        findCustomers(criteria: any, callback: (err: any, data: any) => void): void;
        findInvoices(criteria: any, callback: (err: any, data: any) => void): void;
        // ... other methods
    }

    export = QuickBooks;
}