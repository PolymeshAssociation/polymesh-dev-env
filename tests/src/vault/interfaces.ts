/* eslint-disable camelcase */

export interface GetVaultKeyResponse {
  request_id: string;
  data: {
    exportable: boolean;
    imported_key: boolean;
    keys: Record<
      string,
      {
        public_key: string;
      }
    >;
    latest_version: 1;
    name: string;
    type: string;
  };
}

export interface VaultKey {
  address: string;
  signer: string;
}
